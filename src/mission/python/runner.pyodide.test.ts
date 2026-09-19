/**
 * The runner's SQL support in real Pyodide: tables load from CSV files, `sql()` returns
 * DataFrames, errors come back without Python line numbers, and the tables cannot be changed.
 *
 *   npm run test:python
 */
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CodeTask } from '../../content/types';
import { codeToRun } from '../sqlTasks';
import type { RunResult } from './protocol';
import runnerSource from './runner.py?raw';

let pyodide: PyodideInterface;

beforeAll(async () => {
  pyodide = await loadPyodide();
  await pyodide.loadPackage(['pandas'], { messageCallback: () => {} });
  pyodide.FS.mkdirTree('/home/pyodide');
  pyodide.FS.writeFile(
    '/home/pyodide/orders.csv',
    'order_id,customer_id,status,order_value\n1,10,delivered,100\n2,10,cancelled,50\n3,11,delivered,250\n',
  );
  pyodide.FS.writeFile('/home/pyodide/customers.csv', 'customer_id,city\n10,Pune\n11,Delhi\n');
  pyodide.runPython('import os; os.chdir("/home/pyodide")');
  pyodide.runPython(runnerSource);
  pyodide.runPython('load_tables({"orders": "orders.csv", "customers": "customers.csv"})');
}, 300_000);

const sqlTask: CodeTask = {
  kind: 'code',
  id: 'revenue',
  title: 'Revenue by city',
  instructions: '',
  language: 'sql',
  starterCode: '',
  creates: ['city_revenue'],
  hints: { nudge: '', method: '', example: '____' },
};

function workspace() {
  const namespace = pyodide.runPython('new_namespace()');
  const runCode = pyodide.globals.get('run_code');
  return {
    run: (code: string) => JSON.parse(runCode(code, namespace)) as RunResult,
    get: (expression: string) => {
      pyodide.globals.set('_ns', namespace);
      return pyodide.runPython(`eval(${JSON.stringify(expression)}, _ns)`);
    },
  };
}

describe('SQL tasks', () => {
  it('run on the tables, show the result and save it for later Python', () => {
    const ws = workspace();
    const query = `SELECT c.city, SUM(o.order_value) AS revenue
FROM orders o JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY c.city ORDER BY revenue DESC;`;
    const result = ws.run(codeToRun(sqlTask, query));
    expect(result.error).toBeNull();
    expect(result.rich).toEqual([
      expect.objectContaining({
        kind: 'table',
        columns: ['city', 'revenue'],
        rows: [
          ['Delhi', '250'],
          ['Pune', '100'],
        ],
      }),
    ]);
    expect(ws.get('int(city_revenue["revenue"].sum())')).toBe(350);
  });

  it('report SQL errors without Python line numbers', () => {
    const ws = workspace();
    const cases: Array<[string, RegExp]> = [
      ['SELECT revenue FROM orders', /no such column: revenue/],
      ['SELECT * FROM order', /syntax error|no such table/],
      ['SELECT * FORM orders', /syntax error/],
      ['SELECT 1; SELECT 2', /one statement at a time/],
      ['   ', /empty/],
    ];
    for (const [query, message] of cases) {
      const { error } = ws.run(codeToRun(sqlTask, query));
      expect(error, query).toMatchObject({ type: 'SQL error', line: null, trace: [] });
      expect(error?.message, query).toMatch(message);
    }
  });

  it('cannot change the tables', () => {
    const ws = workspace();
    for (const query of ['DELETE FROM orders', 'DROP TABLE orders', 'CREATE TABLE x (a)']) {
      const { error } = ws.run(codeToRun(sqlTask, query));
      expect(error?.message, query).toMatch(/readonly|read-only|does not return a table/);
    }
    expect(ws.run(codeToRun(sqlTask, 'SELECT COUNT(*) AS n FROM orders')).rich[0]).toMatchObject({
      rows: [['3']],
    });
  });

  it('can be called from Python too', () => {
    const ws = workspace();
    const result = ws.run('n = sql("SELECT COUNT(*) AS n FROM customers")["n"][0]\nprint(n)');
    expect(result.stdout.trim()).toBe('2');
  });
});
