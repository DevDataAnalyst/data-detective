import { describe, expect, it } from 'vitest';
import { hintForError } from './errorHints';
import type { PythonError } from './python/protocol';

const error = (type: string, message: string): PythonError => ({
  type,
  message,
  line: 1,
  trace: [],
});

describe('hintForError', () => {
  it('spots unfilled blanks and missing imports', () => {
    expect(hintForError(error('NameError', "name '____' is not defined"))).toMatch(/blank/);
    expect(hintForError(error('NameError', "name 'pd' is not defined"))).toMatch(
      /import pandas as pd/,
    );
  });

  it('points to the earlier task when a mission variable is missing', () => {
    expect(hintForError(error('NameError', "name 'clean' is not defined"))).toMatch(
      /Run the earlier task/,
    );
    expect(hintForError(error('NameError', "name 'citystats' is not defined"))).toMatch(
      /Check the spelling/,
    );
  });

  it('explains KeyError in terms of column names', () => {
    expect(hintForError(error('KeyError', "'City'"))).toMatch(/df\.columns/);
  });

  it('covers syntax and file errors', () => {
    expect(hintForError(error('SyntaxError', "expected ':'"))).toMatch(/colon/);
    expect(hintForError(error('FileNotFoundError', 'No such file'))).toMatch(/deliveries\.csv/);
  });

  it('returns nothing for unusual errors', () => {
    expect(hintForError(error('RecursionError', 'maximum recursion depth exceeded'))).toBeNull();
  });
});
