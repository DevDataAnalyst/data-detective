import type { PythonError } from './python/protocol';

/** What the open mission uses, so hints can name the right files, tables and variables. */
export interface ErrorHintContext {
  /** Data files, e.g. `deliveries.csv`. */
  files: readonly string[];
  /** SQL tables, for missions with SQL tasks. */
  tables: readonly string[];
  /** Variables the mission's tasks ask learners to create. */
  variables: readonly string[];
}

const NO_CONTEXT: ErrorHintContext = { files: [], tables: [], variables: [] };

const code = (name: string) => `\`${name}\``;

function list(names: readonly string[]): string {
  const shown = names.map(code);
  return shown.length <= 1
    ? (shown[0] ?? '')
    : `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`;
}

/** A plain-English next step for SQL errors, from SQLite's message. */
function hintForSql(message: string, context: ErrorHintContext): string {
  const column = /no such column: (\S+)/.exec(message)?.[1];
  if (column) {
    const [prefix, name] = column.includes('.') ? column.split('.') : [null, column];
    return prefix
      ? `There is no column ${code(column)}. Check which table ${code(name)} is in, and that ${code(prefix)} is that table's short name.`
      : `There is no column called ${code(column)}. Check the spelling, and after a join put the table's short name in front, like ${code(`o.${column}`)}.`;
  }
  const table = /no such table: (\S+)/.exec(message)?.[1];
  if (table) {
    return context.tables.length > 0
      ? `There is no table called ${code(table)}. The tables are ${list(context.tables)}.`
      : `There is no table called ${code(table)}. Check the spelling.`;
  }
  const ambiguous = /ambiguous column name: (\S+)/.exec(message)?.[1];
  if (ambiguous) {
    return `${code(ambiguous)} is in more than one table. Say which one you mean, like ${code(`o.${ambiguous}`)}.`;
  }
  if (/misuse of (aggregate|window function)/.test(message)) {
    return 'SUM, COUNT and the like cannot go in WHERE, which runs before rows are grouped. Filter groups with HAVING instead.';
  }
  if (/one statement at a time/.test(message)) {
    return 'Run one query at a time: delete anything after the first semicolon.';
  }
  if (/readonly|read-only/.test(message)) {
    return 'The tables here are read-only. Write a query that reads them: SELECT ... FROM ...';
  }
  if (/syntax error|incomplete input/.test(message)) {
    return 'SQL could not read the query here. Look for a missing comma between columns or a missing bracket, and check the clauses come in order: SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.';
  }
  return 'SQLite names the part of the query it could not use: start there.';
}

/** A short, plain-English next step for common Python and SQL errors. */
export function hintForError(
  error: PythonError,
  context: ErrorHintContext = NO_CONTEXT,
): string | null {
  const { type, message } = error;
  switch (type) {
    case 'SQL error':
      return hintForSql(message, context);
    case 'NameError': {
      const name = /name '([^']+)' is not defined/.exec(message)?.[1];
      if (name && /^_+$/.test(name)) {
        return 'Replace each ____ blank with your own code before running.';
      }
      if (name === 'pd') return 'pandas is not imported yet. Add `import pandas as pd` at the top.';
      if (name === 'plt') {
        return 'matplotlib is not imported yet. Add `import matplotlib.pyplot as plt` at the top.';
      }
      if (name && context.variables.includes(name)) {
        return `\`${name}\` does not exist yet. Run the earlier task that creates it, or check the spelling.`;
      }
      return `Python does not know \`${name ?? 'that name'}\`. Check the spelling (capital letters matter) and make sure the line that creates it has run.`;
    }
    case 'KeyError':
      return 'That column or key does not exist. Column names are case-sensitive: list them with `df.columns`.';
    case 'AttributeError':
      if (/'ellipsis' object/.test(message)) {
        return 'A `...` is still in your code. Replace it with real code.';
      }
      return 'That method or attribute does not exist on this value. Check the spelling, and whether you have a DataFrame, a Series or a single number.';
    case 'SyntaxError':
    case 'IndentationError':
    case 'TabError':
      return 'Python could not read this line. Look for a missing bracket, quote, comma or colon, or uneven indentation.';
    case 'TypeError':
      return 'A value of the wrong kind was used, such as text where a number was expected, or a function was called with the wrong inputs.';
    case 'ValueError':
      return 'The value had the right type but did not make sense here. Check the inputs you passed in.';
    case 'FileNotFoundError':
      return context.files.length === 0
        ? 'Python cannot find that file. Check the file name, including the .csv at the end.'
        : `Python cannot find that file. The data ${context.files.length === 1 ? 'file is' : 'files are'} ${list(context.files)}.`;
    case 'ModuleNotFoundError':
    case 'ImportError':
      return 'That package is not available here. This workspace has pandas, NumPy and matplotlib.';
    case 'ZeroDivisionError':
      return 'Something was divided by zero. Check that the value you divide by is not empty or zero.';
    case 'IndexError':
      return 'That position does not exist. Remember that Python counts from 0.';
    default:
      return null;
  }
}
