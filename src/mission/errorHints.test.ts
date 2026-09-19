import { describe, expect, it } from 'vitest';
import { hintForError, type ErrorHintContext } from './errorHints';
import type { PythonError } from './python/protocol';

const error = (type: string, message: string): PythonError => ({
  type,
  message,
  line: 1,
  trace: [],
});

const deliveries: ErrorHintContext = {
  files: ['deliveries.csv'],
  tables: [],
  variables: ['df', 'clean', 'city_stats'],
};

const interview: ErrorHintContext = {
  files: ['orders.csv', 'customers.csv', 'order_items.csv'],
  tables: ['orders', 'customers', 'order_items'],
  variables: ['grain', 'city_revenue'],
};

describe('hintForError', () => {
  it('spots unfilled blanks and missing imports', () => {
    expect(hintForError(error('NameError', "name '____' is not defined"))).toMatch(/blank/);
    expect(hintForError(error('NameError', "name 'pd' is not defined"))).toMatch(
      /import pandas as pd/,
    );
  });

  it('points to the earlier task when one of the open mission’s variables is missing', () => {
    expect(hintForError(error('NameError', "name 'clean' is not defined"), deliveries)).toMatch(
      /Run the earlier task/,
    );
    expect(hintForError(error('NameError', "name 'citystats' is not defined"), deliveries)).toMatch(
      /Check the spelling/,
    );
    // Another mission's variable is just an unknown name here.
    expect(hintForError(error('NameError', "name 'clean' is not defined"), interview)).toMatch(
      /Check the spelling/,
    );
  });

  it('explains KeyError in terms of column names', () => {
    expect(hintForError(error('KeyError', "'City'"))).toMatch(/df\.columns/);
  });

  it('names the open mission’s own data files', () => {
    expect(hintForError(error('SyntaxError', "expected ':'"))).toMatch(/colon/);
    expect(hintForError(error('FileNotFoundError', 'No such file'), deliveries)).toMatch(
      /The data file is `deliveries\.csv`/,
    );
    expect(hintForError(error('FileNotFoundError', 'No such file'), interview)).toBe(
      'Python cannot find that file. The data files are `orders.csv`, `customers.csv` and `order_items.csv`.',
    );
    expect(hintForError(error('FileNotFoundError', 'No such file'))).toMatch(/Check the file name/);
  });

  it('explains SQL errors in plain words', () => {
    const sql = (message: string) => hintForError(error('SQL error', message), interview);
    expect(sql('no such table: order')).toBe(
      'There is no table called `order`. The tables are `orders`, `customers` and `order_items`.',
    );
    expect(sql('no such column: revenue')).toMatch(/short name in front, like `o\.revenue`/);
    expect(sql('no such column: o.city')).toMatch(/Check which table `city` is in/);
    expect(sql('ambiguous column name: order_id')).toMatch(/like `o\.order_id`/);
    expect(sql('misuse of aggregate: COUNT()')).toMatch(/HAVING/);
    expect(sql('near "FORM": syntax error')).toMatch(/SELECT, FROM, JOIN, WHERE/);
    expect(sql('You can only execute one statement at a time.')).toMatch(/one query at a time/);
    expect(sql('attempt to write a readonly database')).toMatch(/read-only/);
  });

  it('returns nothing for unusual Python errors', () => {
    expect(hintForError(error('RecursionError', 'maximum recursion depth exceeded'))).toBeNull();
  });
});
