import type { PythonError } from './python/protocol';

/** Names learners are asked to create in the mission, so a NameError can point to the right task. */
const MISSION_VARIABLES = new Set([
  'df',
  'n_orders',
  'missing',
  'clean',
  'city_stats',
  'times',
  'q1',
  'q3',
  'iqr',
  'lower',
  'upper',
  'n_outliers',
  'no_outliers',
  'city_stats_no_outliers',
  'slow_city',
  'slow_city_by_hour',
]);

/** A short, plain-English next step for common Python errors. */
export function hintForError(error: PythonError): string | null {
  const { type, message } = error;
  switch (type) {
    case 'NameError': {
      const name = /name '([^']+)' is not defined/.exec(message)?.[1];
      if (name && /^_+$/.test(name)) {
        return 'Replace each ____ blank with your own code before running.';
      }
      if (name === 'pd') return 'pandas is not imported yet. Add `import pandas as pd` at the top.';
      if (name === 'plt') {
        return 'matplotlib is not imported yet. Add `import matplotlib.pyplot as plt` at the top.';
      }
      if (name && MISSION_VARIABLES.has(name)) {
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
      return 'Python cannot find that file. The data file is called `deliveries.csv`.';
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
