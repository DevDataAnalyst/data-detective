import type { CodeTask } from '../content/types';

/**
 * The Python the worker runs for a task. A SQL task's query becomes a call to the runner's `sql()`,
 * saved as the task's variable and shown as a table, so SQL runs, gets checked and is replayed
 * exactly like Python. The query goes in as a JSON string, which is also a valid Python string.
 */
export function codeToRun(task: CodeTask, code: string): string {
  if (task.language !== 'sql') return code;
  const [name] = task.creates;
  return `${name} = sql(${JSON.stringify(code)})\n${name}`;
}

/** Plain words for the task's language, e.g. for the editor's label. */
export function codeNoun(task: CodeTask): 'SQL query' | 'Python code' {
  return task.language === 'sql' ? 'SQL query' : 'Python code';
}
