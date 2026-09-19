/**
 * Runs every Python snippet in the question content in real Pyodide, as the SQL test does with
 * SQLite, so no pandas answer is ever just typed in. Slow and networked the first time:
 *
 *   npm run test:python
 */
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import { fillBlank } from '../content/code';
import type { MultipleChoiceQuestion } from '../content/types';
import { contentQuestions } from './contentQuestions';

let pyodide: PyodideInterface;

beforeAll(async () => {
  pyodide = await loadPyodide();
  await pyodide.loadPackage(['pandas'], { messageCallback: () => {} });
  pyodide.runPython(`
import contextlib, io, warnings

def printed(code):
    """What the code prints, in a fresh namespace, or None if it fails."""
    buffer = io.StringIO()
    try:
        with contextlib.redirect_stdout(buffer), warnings.catch_warnings():
            warnings.simplefilter("ignore")
            exec(code, {"__name__": "__main__"})
    except Exception:
        return None
    return buffer.getvalue().strip()
`);
}, 300_000);

function printed(code: string): string | null {
  const run = pyodide.globals.get('printed');
  try {
    return run(code) ?? null;
  } finally {
    run.destroy();
  }
}

const pythonChoices = contentQuestions().flatMap(({ path, question }) =>
  question.type === 'multiple_choice' && question.check?.kind.startsWith('python_')
    ? [[`${path}/${question.id}`, question] as const]
    : [],
);

describe('printed', () => {
  it('captures what code prints, and says when it fails', () => {
    expect(printed('import pandas as pd\nprint(pd.Series([1, None, 3]).mean())')).toBe('2.0');
    expect(printed('raise ValueError("no")')).toBeNull();
  });
});

describe('Python in the content', () => {
  it('has questions to check', () => {
    expect(pythonChoices.length).toBeGreaterThan(0);
  });

  it.each(pythonChoices)('%s: the right option is right, and only that one', (_label, found) => {
    const question = found as MultipleChoiceQuestion;
    const { check, code } = question;
    if (!check || !code) throw new Error('No check or code');
    const problems: string[] = [];
    if (check.kind === 'python_output') {
      const output = printed(code.text);
      if (output === null) problems.push('the code fails');
      question.options.forEach((option, index) => {
        const same = option.trim() === output;
        if (index === question.correctIndex && !same) {
          problems.push(`the code prints ${JSON.stringify(output)}, not the right option`);
        }
        if (index !== question.correctIndex && same) {
          problems.push(`the wrong option "${option}" is what the code prints`);
        }
      });
    }
    if (check.kind === 'python_blank') {
      const expected = printed(check.reference);
      if (expected === null) problems.push('the reference code fails');
      question.options.forEach((option, index) => {
        const output = printed(fillBlank(code.text, option));
        const same = output !== null && output === expected;
        if (index === question.correctIndex && !same) {
          problems.push(`the right option "${option}" prints ${JSON.stringify(output)}`);
        }
        if (index !== question.correctIndex && same) {
          problems.push(`the wrong option "${option}" prints what the reference prints`);
        }
      });
    }
    expect(problems).toEqual([]);
  });
});
