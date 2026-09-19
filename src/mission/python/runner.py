"""Runs learner code in the browser, notebook style, and reports the results as JSON.

Loaded once into Pyodide by the mission worker. Learner code runs in its own namespace dict, so
variables persist between runs until the environment is reset.

Missions with SQL tasks also get a read-only SQLite database of their tables. The page turns a
SQL task into a call to `sql()`, so SQL runs, is checked and is replayed exactly like Python.
"""

import ast
import base64
import contextlib
import io
import json
import os
import sqlite3
import sys
import traceback
import warnings

# Pyodide's default matplotlib backend needs a page; the worker has none, so draw to images.
os.environ["MPLBACKEND"] = "AGG"

SOURCE_NAME = "<your code>"
MAX_TABLE_ROWS = 20
MAX_TEXT = 20_000

_rich_outputs = []

# Facts about the most recent run that the task checks can look at.
LAST_RUN = {"figure_titles": []}

# The mission's tables, for SQL tasks. None when the mission has no SQL.
DATABASE = None


class SQLError(Exception):
    """A problem with a SQL query. Reported without Python's line numbers, which mean nothing here."""


def load_tables(tables):
    """Loads CSV files into an in-memory SQLite database that queries can only read.

    `tables` maps each table name to its file, e.g. {"orders": "orders.csv"}.
    """
    global DATABASE
    import pandas as pd

    connection = sqlite3.connect(":memory:")
    for name, file_name in tables.items():
        pd.read_csv(file_name).to_sql(name, connection, index=False)
    connection.execute("PRAGMA query_only = ON")
    DATABASE = connection


def sql(query):
    """Runs a SQL query on the mission's tables and returns the result as a DataFrame."""
    import pandas as pd

    if DATABASE is None:
        raise SQLError("This mission has no SQL tables.")
    if not query.strip().rstrip(";").strip():
        raise SQLError("The query is empty. Write a query that starts with SELECT.")
    try:
        cursor = DATABASE.execute(query)
    except sqlite3.Error as error:
        raise SQLError(str(error)) from None
    if cursor.description is None:
        raise SQLError("This query does not return a table. Write one that starts with SELECT.")
    columns = [column[0] for column in cursor.description]
    return pd.DataFrame(cursor.fetchall(), columns=columns)


def new_namespace():
    """A fresh place for learner variables."""
    return {"__name__": "__main__", "display": display, "sql": sql}


def _cell(value):
    try:
        import pandas as pd

        if not isinstance(value, (list, dict, tuple)) and pd.isna(value):
            return "NaN"
    except Exception:
        pass
    if isinstance(value, float):
        if value.is_integer():
            return f"{value:.1f}"
        if abs(value) < 0.01:
            return f"{value:.4g}"
        return f"{value:.2f}".rstrip("0")
    return str(value)


def _label(value):
    if isinstance(value, tuple):
        return " / ".join(str(part) for part in value)
    return str(value)


def _table(frame):
    shown = frame.head(MAX_TABLE_ROWS)
    index_names = [name for name in shown.index.names if name is not None]
    return {
        "kind": "table",
        "columns": [_label(column) for column in shown.columns],
        "indexName": " / ".join(str(name) for name in index_names) or None,
        "index": [_label(label) for label in shown.index],
        "rows": [[_cell(value) for value in row] for row in shown.itertuples(index=False, name=None)],
        "totalRows": int(frame.shape[0]),
        "totalColumns": int(frame.shape[1]),
    }


def _rich(value):
    pandas = sys.modules.get("pandas")
    if pandas is not None:
        if isinstance(value, pandas.DataFrame):
            return _table(value)
        if isinstance(value, pandas.Series):
            name = value.name if value.name is not None else "value"
            return _table(value.to_frame(name=name))
    text = repr(value)
    if len(text) > MAX_TEXT:
        text = text[:MAX_TEXT] + " …"
    return {"kind": "text", "text": text}


def display(*values):
    """Show a DataFrame or any value as rich output, like in a notebook."""
    for value in values:
        _rich_outputs.append(_rich(value))


def _collect_figures():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return
    for number in plt.get_fignums():
        figure = plt.figure(number)
        LAST_RUN["figure_titles"].append(
            " ".join(axes.get_title() for axes in figure.axes) + (figure._suptitle.get_text() if figure._suptitle else "")
        )
        buffer = io.BytesIO()
        figure.savefig(buffer, format="png", dpi=110, bbox_inches="tight")
        _rich_outputs.append(
            {
                "kind": "image",
                "mime": "image/png",
                "data": base64.b64encode(buffer.getvalue()).decode("ascii"),
            }
        )
    plt.close("all")


def _describe_error(error, code):
    if isinstance(error, SQLError):
        return {"type": "SQL error", "message": str(error), "line": None, "trace": []}
    lines = code.splitlines()

    def source(line_number):
        if line_number and 0 < line_number <= len(lines):
            return lines[line_number - 1].strip()
        return ""

    frames = [
        frame
        for frame in traceback.extract_tb(error.__traceback__)
        if frame.filename == SOURCE_NAME
    ]
    trace = [{"line": frame.lineno, "code": source(frame.lineno)} for frame in frames[-3:]]
    line = frames[-1].lineno if frames else None

    if isinstance(error, SyntaxError):
        message = error.msg or "invalid syntax"
        if error.filename == SOURCE_NAME and error.lineno:
            line = error.lineno
            trace = [{"line": error.lineno, "code": source(error.lineno)}]
    else:
        message = str(error)

    return {"type": type(error).__name__, "message": message, "line": line, "trace": trace}


def run_code(code, namespace):
    """Runs code in namespace. If the last statement is an expression, its value is displayed."""
    _rich_outputs.clear()
    LAST_RUN["figure_titles"] = []
    output = io.StringIO()
    error = None
    try:
        tree = ast.parse(code, filename=SOURCE_NAME, mode="exec")
        last_expression = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last_expression = ast.Expression(tree.body.pop().value)
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                exec(compile(tree, SOURCE_NAME, "exec"), namespace)
                if last_expression is not None:
                    value = eval(compile(last_expression, SOURCE_NAME, "eval"), namespace)
                    if value is not None:
                        _rich_outputs.append(_rich(value))
    except BaseException as caught:  # noqa: BLE001 - learners can raise anything, even SystemExit
        error = _describe_error(caught, code)

    try:
        # Library deprecation notices while saving a chart are not the learner's concern.
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _collect_figures()
    except Exception:  # noqa: BLE001 - a broken chart should not hide the rest of the output
        pass

    text = output.getvalue()
    if len(text) > MAX_TEXT:
        text = text[:MAX_TEXT] + "\n… output cut short"
    return json.dumps({"stdout": text, "rich": list(_rich_outputs), "error": error})
