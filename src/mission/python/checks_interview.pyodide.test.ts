/**
 * Runs Unit 4's hidden checks in Pyodide under Node, against the generated interview dataset.
 * SQL tasks run the way the workspace runs them: through `sql()`, via `codeToRun`.
 *
 *   npm run test:python
 */
import { readFileSync } from 'node:fs';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import { theFinalRound } from '../../content/mission4';
import type { CodeTask } from '../../content/types';
import { INTERVIEW_FILES, interviewReference } from '../../test/interviewReference';
import { codeToRun } from '../sqlTasks';
import checksSource from './checks_interview.py?raw';
import runnerSource from './runner.py?raw';

interface CheckResult {
  passed: boolean;
  message: string;
}

let pyodide: PyodideInterface;

beforeAll(async () => {
  pyodide = await loadPyodide();
  await pyodide.loadPackage(['pandas'], { messageCallback: () => {} });
  pyodide.FS.mkdirTree('/home/pyodide');
  for (const [name, path] of [
    ['orders.csv', INTERVIEW_FILES.orders],
    ['customers.csv', INTERVIEW_FILES.customers],
    ['order_items.csv', INTERVIEW_FILES.items],
  ]) {
    pyodide.FS.writeFile(`/home/pyodide/${name}`, readFileSync(path, 'utf8'));
  }
  pyodide.runPython('import os; os.chdir("/home/pyodide")');
  pyodide.runPython(runnerSource);
  pyodide.runPython(
    'load_tables({"orders": "orders.csv", "customers": "customers.csv", "order_items": "order_items.csv"})',
  );
  pyodide.runPython(checksSource);
  pyodide.runPython('compute_reference("orders.csv")');
}, 300_000);

const codeTasks = new Map(
  theFinalRound.tasks.flatMap((task) => (task.kind === 'code' ? [[task.id, task]] : [])),
);

function workspace() {
  const namespace = pyodide.runPython('new_namespace()');
  const runCode = pyodide.globals.get('run_code');
  const checkTask = pyodide.globals.get('check_task');
  return {
    /** Runs a task's code the way the workspace does, SQL included. */
    run(taskId: string, code: string) {
      const task = codeTasks.get(taskId) as CodeTask;
      const result = JSON.parse(runCode(codeToRun(task, code), namespace));
      if (result.error) throw new Error(`${result.error.type}: ${result.error.message}`);
      return result;
    },
    check(taskId: string): CheckResult {
      return JSON.parse(checkTask(taskId, namespace));
    },
  };
}

const SOLUTIONS: Record<string, string> = {
  grain: `SELECT COUNT(*) AS item_rows,
       COUNT(DISTINCT order_id) AS orders
FROM order_items;`,
  revenue: `SELECT c.city, SUM(o.order_value) AS revenue
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY c.city
ORDER BY revenue DESC;`,
  'second-way': `import pandas as pd
orders = pd.read_csv("orders.csv")
customers = pd.read_csv("customers.csv")
items = pd.read_csv("order_items.csv")
delivered = orders[orders["status"] == "delivered"]
with_city = delivered.merge(customers, on="customer_id")
lines = items.merge(with_city, on="order_id")
lines["line_total"] = lines["quantity"] * lines["price"]
item_revenue = lines.groupby("city")["line_total"].sum()`,
  'best-sellers': `WITH item_sales AS (
  SELECT c.city, i.item, SUM(i.quantity * i.price) AS revenue
  FROM order_items AS i
  JOIN orders AS o ON o.order_id = i.order_id
  JOIN customers AS c ON c.customer_id = o.customer_id
  WHERE o.status = 'delivered'
  GROUP BY c.city, i.item
), ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY city ORDER BY revenue DESC) AS rn
  FROM item_sales
)
SELECT city, item, revenue FROM ranked WHERE rn = 1;`,
};

describe('interview reference answers', () => {
  it('match the values computed independently from the CSV files', () => {
    const python = JSON.parse(
      pyodide.runPython('import json; json.dumps(compute_reference("orders.csv"))'),
    );
    const expected = interviewReference();
    expect(python.item_rows).toBe(expected.itemRows);
    expect(python.orders).toBe(expected.orders);
    expect(python.revenue_order).toEqual(expected.revenue.map(([city]) => city));
    for (const [city, amount] of expected.revenue) expect(python.revenue[city]).toBe(amount);
    for (const [city, amount] of expected.dashboard) expect(python.dashboard[city]).toBe(amount);
    expect(python.item_revenue).toEqual(Object.fromEntries(expected.revenue));
    expect(python.best_sellers).toEqual(
      Object.fromEntries(
        Object.entries(expected.bestSellers).map(([city, best]) => [city, best.item]),
      ),
    );
  });

  it('report exactly the facts the mission content quotes', () => {
    const summary = JSON.parse(pyodide.runPython('reference_summary()'));
    expect(Object.keys(summary).sort()).toEqual([...theFinalRound.facts].sort());
    expect(summary).toMatchObject({
      topCity: 'Mumbai',
      topRevenue: '₹1,69,730',
      dashboardCity: 'Pune',
      dashboardRowsPerOrder: '3.7',
      orders: '3,460',
      itemRows: '7,228',
    });
  });
});

describe('interview mission checks', () => {
  it('pass every task solved correctly, in order', () => {
    const ws = workspace();
    for (const task of theFinalRound.tasks) {
      if (task.kind !== 'code') continue;
      ws.run(task.id, SOLUTIONS[task.id]);
      expect(ws.check(task.id), task.id).toMatchObject({ passed: true });
    }
  });

  it('accept other reasonable answers', () => {
    const ws = workspace();
    // Explicit INNER JOIN, a subquery, and pandas with the Series turned into a DataFrame.
    ws.run(
      'revenue',
      `SELECT city, revenue FROM (
  SELECT c.city AS city, SUM(o.order_value) AS revenue
  FROM customers c INNER JOIN orders o ON o.customer_id = c.customer_id
  WHERE o.status = 'delivered' GROUP BY c.city
) ORDER BY revenue DESC`,
    );
    expect(ws.check('revenue').passed).toBe(true);
    ws.run('second-way', `${SOLUTIONS['second-way']}\nitem_revenue = item_revenue.reset_index()`);
    expect(ws.check('second-way').passed).toBe(true);
    // Totals worked out from the items are the same money, so they pass the revenue task too.
    ws.run(
      'revenue',
      `SELECT c.city, SUM(i.quantity * i.price) AS revenue
FROM order_items i JOIN orders o ON o.order_id = i.order_id
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'delivered' GROUP BY c.city ORDER BY 2 DESC`,
    );
    expect(ws.check('revenue').passed).toBe(true);
  });

  it('name the interview mistakes without giving the answer away', () => {
    const joinItems = `JOIN order_items AS i ON i.order_id = o.order_id`;
    const cases: Array<[task: string, code: string, message: RegExp]> = [
      [
        'grain',
        'SELECT COUNT(*) AS item_rows, COUNT(order_id) AS orders FROM order_items',
        /COUNT\(DISTINCT order_id\)/,
      ],
      [
        'grain',
        'SELECT COUNT(*), COUNT(DISTINCT order_id) FROM order_items',
        /Name the two counts/,
      ],
      [
        'grain',
        'SELECT order_id, COUNT(*) AS item_rows, 1 AS orders FROM order_items GROUP BY order_id',
        /no GROUP BY/,
      ],
      [
        'revenue',
        `SELECT c.city, SUM(o.order_value) AS revenue FROM orders o JOIN customers c ON c.customer_id = o.customer_id ${joinItems.replace('AS i', 'i')} WHERE o.status = 'delivered' GROUP BY c.city ORDER BY revenue DESC`,
        /repeats each order once for every item/,
      ],
      [
        'revenue',
        `SELECT c.city, SUM(o.order_value) AS revenue FROM orders o JOIN customers c ON c.customer_id = o.customer_id GROUP BY c.city ORDER BY revenue DESC`,
        /Cancelled orders bring in no money/,
      ],
      [
        'revenue',
        `SELECT c.city, SUM(o.order_value) AS revenue FROM orders o JOIN customers c ON c.customer_id = o.customer_id ${joinItems.replace('AS i', 'i')} GROUP BY c.city`,
        /Two things inflate/,
      ],
      [
        'revenue',
        `SELECT c.city, SUM(o.order_value) AS revenue FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.city ORDER BY c.city`,
        /biggest first/,
      ],
      ['revenue', 'SELECT SUM(order_value) AS revenue FROM orders', /GROUP BY city/],
      [
        'second-way',
        `${SOLUTIONS['second-way']}\nitem_revenue = lines.groupby("city")["price"].sum()`,
        /Multiply price by quantity/,
      ],
      [
        'second-way',
        `${SOLUTIONS['second-way'].replace('lines = items.merge(with_city', 'lines = items.merge(orders.merge(customers, on="customer_id")')}`,
        /cancelled orders/,
      ],
      ['best-sellers', SOLUTIONS['best-sellers'].replace('WHERE rn = 1', ''), /one row per city/],
    ];
    for (const [task, code, message] of cases) {
      const ws = workspace();
      ws.run(task, code);
      const result = ws.check(task);
      expect(result.passed, `${task}: ${code}`).toBe(false);
      expect(result.message, `${task}: ${code}`).toMatch(message);
      expect(result.message).not.toMatch(/1,69,730|1,46,930|169730/);
    }
  });

  it('never crash, even with nothing defined', () => {
    const ws = workspace();
    for (const task of theFinalRound.tasks) {
      if (task.kind !== 'code') continue;
      const result = ws.check(task.id);
      expect(result.passed).toBe(false);
      expect(result.message.length).toBeGreaterThan(10);
    }
  });
});
