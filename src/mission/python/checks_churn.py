"""Hidden checks for Unit 2's mission, "The False Alarm".

Loaded into Pyodide after runner.py, in place of checks.py. `compute_reference` works out every
answer from churn.csv when Python starts, `reference_summary` reports facts for the summary screen,
and `check_task` inspects the learner's variables after each run without giving the answer away.
"""

import json
import math
import re

import pandas as pd

TOLERANCE = 0.00005
REFERENCE = {}


def _rate(frame):
    return float(frame["cancelled"].sum() / frame["subscribers_start"].sum())


def compute_reference(path):
    df = pd.read_csv(path)
    months = sorted(str(month) for month in df["month"].unique())
    last = months[-1]
    latest = df[df["month"] == last]
    earlier = df[df["month"] != last]
    monthly = df.groupby("month")[["cancelled", "subscribers_start"]].sum()
    monthly_rates = monthly["cancelled"] / monthly["subscribers_start"]
    earlier_rates = monthly_rates[monthly_rates.index != last]
    students = df[df["segment"] == "student"]
    aprils = students[students["month"].str.endswith("-04")]

    reference = {
        "columns": [str(column) for column in df.columns],
        "n_rows": int(len(df)),
        "months": months,
        "last_month": last,
        "lost_last_month": int(latest["cancelled"].sum()),
        "last_rate": _rate(latest),
        "last_rate_mean_of_segments": float(
            (latest["cancelled"] / latest["subscribers_start"]).mean()
        ),
        "base_rate": _rate(earlier),
        "base_rate_mean_of_months": float(earlier_rates.mean()),
        "base_rate_all_months": _rate(df),
        "segment_rates_last": {
            str(segment): _rate(group) for segment, group in latest.groupby("segment")
        },
        "segment_rates_all": {
            str(segment): _rate(group) for segment, group in df.groupby("segment")
        },
        "segment_cancelled_last": {
            str(segment): float(group["cancelled"].sum()) for segment, group in latest.groupby("segment")
        },
        "student_aprils": {
            str(month)[:4]: _rate(group) for month, group in aprils.groupby("month")
        },
        "all_aprils": {
            str(month)[:4]: _rate(group)
            for month, group in df[df["month"].str.endswith("-04")].groupby("month")
        },
        "student_other_rate": _rate(students[~students["month"].str.endswith("-04")]),
    }
    REFERENCE.clear()
    REFERENCE.update(reference)
    return reference


def _month_name(label):
    year, month = label.split("-")
    names = ["January", "February", "March", "April", "May", "June", "July", "August",
             "September", "October", "November", "December"]
    return f"{names[int(month) - 1]} {year}"


def reference_summary():
    """Facts about the dataset for the mission complete screen, as JSON."""
    ref = REFERENCE
    return json.dumps(
        {
            "lostLastMonth": ref["lost_last_month"],
            "lastMonth": _month_name(ref["last_month"]),
            "lastRate": f"{ref['last_rate'] * 100:.1f}%",
            "baseRate": f"{ref['base_rate'] * 100:.1f}%",
            "studentAprilRate": f"{ref['student_aprils'][ref['last_month'][:4]] * 100:.1f}%",
            "studentUsualRate": f"{ref['student_other_rate'] * 100:.1f}%",
            "months": len(ref["months"]),
        }
    )


# ------------------------------------------------------------------------------------------------
# Helpers

_MISSING = object()


def _passed(message):
    return {"passed": True, "message": message}


def _not_yet(message):
    return {"passed": False, "message": message}


def _number(value):
    """A float from Python or NumPy numbers; None for anything else, including booleans."""
    try:
        import numpy as np

        if isinstance(value, (bool, np.bool_)):
            return None
        if isinstance(value, (int, float, np.integer, np.floating)):
            number = float(value)
            return None if math.isnan(number) else number
    except Exception:  # noqa: BLE001
        return None
    return None


def _as_series(value, preferred=("rate", "churn_rate", "churn")):
    """A Series from a Series, or from a DataFrame with one obvious numeric column."""
    if isinstance(value, pd.DataFrame):
        frame = value
        if isinstance(frame.columns, pd.MultiIndex):
            frame = frame.copy()
            frame.columns = [str(column[-1]) for column in frame.columns]
        for key in ("segment", "month", "year"):
            if key in frame.columns:
                frame = frame.set_index(key)
                break
        columns = [str(column).lower() for column in frame.columns]
        chosen = next((frame.columns[columns.index(name)] for name in preferred if name in columns), None)
        if chosen is None:
            numeric = frame.select_dtypes("number").columns
            if len(numeric) != 1:
                return None
            chosen = numeric[0]
        value = frame[chosen]
    return value if isinstance(value, pd.Series) else None


def _labelled(value, label_of):
    series = _as_series(value)
    if series is None:
        return None
    numbers = {}
    for label, item in series.items():
        number = _number(item)
        if number is None:
            return None
        numbers[label_of(label)] = number
    return numbers


def _segment_label(label):
    return str(label).strip().lower()


def _year_label(label):
    text = str(label).strip()
    match = re.match(r"^(\d{4})(-04)?(\.0)?$", text)
    return match.group(1) if match else text


def _matches(actual, expected, tolerance=TOLERANCE):
    if actual is None or set(actual) != set(expected):
        return False
    return all(abs(actual[key] - expected[key]) <= tolerance for key in expected)


def _variable(namespace, name):
    return namespace.get(name, _MISSING)


def _percent_hint(number, expected):
    return abs(number - expected * 100) <= TOLERANCE * 100


# ------------------------------------------------------------------------------------------------
# One check per task


def _check_churn_rate(ns, ref):
    df = _variable(ns, "df")
    if df is _MISSING:
        return _not_yet("Create a DataFrame called `df` by reading churn.csv.")
    # Columns added along the way, such as a weekend flag, are fine.
    if not isinstance(df, pd.DataFrame) or not set(ref["columns"]).issubset(str(c) for c in df.columns):
        return _not_yet("`df` should be the whole file, read with pd.read_csv(\"churn.csv\").")
    if len(df) != ref["n_rows"]:
        return _not_yet(f"`df` has {len(df)} rows, but the file has more. Read the whole file.")

    april_rate = _variable(ns, "april_rate")
    if april_rate is _MISSING:
        return _not_yet("`df` looks right. Now store last month's churn rate in `april_rate`.")
    number = _number(april_rate)
    if number is None:
        return _not_yet("`april_rate` should be a single number: cancellations ÷ subscribers.")
    if abs(number - ref["last_rate"]) > TOLERANCE:
        if _percent_hint(number, ref["last_rate"]):
            return _not_yet("That looks like a percentage. Keep `april_rate` as a fraction, such as 0.05.")
        if abs(number - ref["last_rate_mean_of_segments"]) <= TOLERANCE:
            return _not_yet(
                "That is the average of the three segments' rates, but the segments are different "
                "sizes. Add up the cancellations and the subscribers first, then divide."
            )
        if number == ref["lost_last_month"]:
            return _not_yet("That is the number of cancellations. Divide it by the subscribers at the start.")
        return _not_yet(
            f"`april_rate` does not match. Keep only the rows for {_month_name(ref['last_month'])}, "
            "then divide total cancellations by total subscribers at the start."
        )

    base_rate = _variable(ns, "base_rate")
    if base_rate is _MISSING:
        return _not_yet("`april_rate` is right. Now store the usual churn rate before it in `base_rate`.")
    number = _number(base_rate)
    if number is None:
        return _not_yet("`base_rate` should be a single number.")
    accepted = (ref["base_rate"], ref["base_rate_mean_of_months"])
    if any(abs(number - value) <= TOLERANCE for value in accepted):
        return _passed(
            f"{_month_name(ref['last_month'])}: {ref['last_rate'] * 100:.1f}% churn, against a usual "
            f"{ref['base_rate'] * 100:.1f}%. That does look alarming. Is it the same for everyone?"
        )
    if _percent_hint(number, ref["base_rate"]):
        return _not_yet("That looks like a percentage. Keep `base_rate` as a fraction, such as 0.03.")
    if abs(number - ref["base_rate_all_months"]) <= TOLERANCE:
        return _not_yet(
            f"That includes {_month_name(ref['last_month'])} itself. The base rate should come from the months "
            "before, so you can compare the two fairly."
        )
    return _not_yet(
        f"`base_rate` does not match. Use every month before {_month_name(ref['last_month'])}: all "
        "cancellations ÷ all subscribers at the start."
    )


def _check_by_segment(ns, ref):
    value = _variable(ns, "segment_rates")
    if value is _MISSING:
        return _not_yet("Store last month's churn rate for each segment in `segment_rates`.")
    rates = _labelled(value, _segment_label)
    expected = ref["segment_rates_last"]
    if rates is None or set(rates) != set(expected):
        return _not_yet("`segment_rates` should hold one churn rate per segment, labelled by segment.")
    if _matches(rates, expected):
        return _passed(
            f"Students churned at {expected['student'] * 100:.1f}%, while professionals and "
            "families look ordinary. The spike is one segment. Is that new?"
        )
    if _matches(rates, ref["segment_cancelled_last"], tolerance=0.5):
        return _not_yet("These are cancellation counts. Divide by each segment's subscribers at the start.")
    if _matches(rates, ref["segment_rates_all"]):
        return _not_yet(f"These rates use every month. Keep only {_month_name(ref['last_month'])}.")
    if all(_percent_hint(rates[key], expected[key]) for key in expected):
        return _not_yet("These look like percentages. Keep the rates as fractions, such as 0.05.")
    return _not_yet(
        f"The rates do not match. Keep the rows for {_month_name(ref['last_month'])}, group by segment, and "
        "divide total cancellations by total subscribers in each group."
    )


def _check_every_april(ns, ref):
    value = _variable(ns, "student_aprils")
    if value is _MISSING:
        return _not_yet("Store the students' churn rate for each April in `student_aprils`.")
    rates = _labelled(value, _year_label)
    expected = ref["student_aprils"]
    if rates is None:
        return _not_yet("`student_aprils` should hold one churn rate per April, labelled by month or year.")
    if _matches(rates, expected):
        low = min(expected.values()) * 100
        high = max(expected.values()) * 100
        return _passed(
            f"Students churn {low:.1f}–{high:.1f}% every April, against about "
            f"{ref['student_other_rate'] * 100:.1f}% in other months. The spike is seasonal."
        )
    if _matches(rates, ref["all_aprils"]):
        return _not_yet("These mix every segment. Keep only the student rows before grouping.")
    if set(rates) != set(expected):
        return _not_yet(
            f"`student_aprils` should have one rate for each April ({len(expected)} in the data). "
            "Keep rows whose month ends in -04."
        )
    if all(_percent_hint(rates[key], expected[key]) for key in expected):
        return _not_yet("These look like percentages. Keep the rates as fractions, such as 0.05.")
    return _not_yet("The rates do not match. Keep student rows in April months, then group by month.")


def _check_student_chart(ns, ref):
    titles = LAST_RUN.get("figure_titles", [])  # noqa: F821 - defined by runner.py
    if not titles:
        return _not_yet("No chart appeared yet. Draw it with matplotlib and end with plt.show().")
    if not any(title.strip() and "____" not in title for title in titles):
        return _not_yet("Your chart needs a title. Add one with ax.set_title(...).")
    return _passed("Every April stands out the same way. A founder can see that in seconds.")


CHECKS = {
    "churn-rate": _check_churn_rate,
    "by-segment": _check_by_segment,
    "every-april": _check_every_april,
    "student-chart": _check_student_chart,
}


def check_task(task_id, namespace):
    """Checks one task against the reference answers. Returns JSON, never raises."""
    check = CHECKS.get(task_id)
    if check is None:
        return json.dumps(None)
    try:
        result = check(namespace, REFERENCE)
    except Exception as error:  # noqa: BLE001 - a check must never crash the workspace
        result = _not_yet(f"We could not check this yet ({type(error).__name__}). Run your code again.")
    return json.dumps(result)
