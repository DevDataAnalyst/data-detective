/**
 * Runs Unit 3's hidden checks in Pyodide under Node, against the generated checkout dataset.
 *
 *   npm run test:python
 */
import { readFileSync } from 'node:fs';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import { theCheckoutRedesign } from '../../content/mission3';
import { CHECKOUT_CSV, checkoutReference } from '../../test/checkoutReference';
import checksSource from './checks_checkout.py?raw';
import runnerSource from './runner.py?raw';

interface CheckResult {
  passed: boolean;
  message: string;
}

let pyodide: PyodideInterface;

beforeAll(async () => {
  pyodide = await loadPyodide();
  await pyodide.loadPackage(['pandas', 'matplotlib'], { messageCallback: () => {} });
  pyodide.FS.mkdirTree('/home/pyodide');
  pyodide.FS.writeFile('/home/pyodide/checkout.csv', readFileSync(CHECKOUT_CSV, 'utf8'));
  pyodide.runPython('import os; os.chdir("/home/pyodide")');
  pyodide.runPython(runnerSource);
  pyodide.runPython(checksSource);
  pyodide.runPython('compute_reference("checkout.csv")');
}, 300_000);

function workspace() {
  const namespace = pyodide.runPython('new_namespace()');
  const runCode = pyodide.globals.get('run_code');
  const checkTask = pyodide.globals.get('check_task');
  return {
    run(code: string) {
      const result = JSON.parse(runCode(code, namespace));
      if (result.error) throw new Error(`${result.error.type}: ${result.error.message}`);
      return result;
    },
    check(taskId: string): CheckResult {
      return JSON.parse(checkTask(taskId, namespace));
    },
  };
}

const SOLUTIONS: Record<string, string> = {
  conversion: `import pandas as pd
df = pd.read_csv("checkout.csv")
by_variant = df.groupby("variant")[["visitors", "orders"]].sum()
conversion = by_variant["orders"] / by_variant["visitors"]`,
  significance: `from math import erfc, sqrt
old = by_variant.loc["old"]
new = by_variant.loc["new"]
pooled = (old["orders"] + new["orders"]) / (old["visitors"] + new["visitors"])
se = sqrt(pooled * (1 - pooled) * (1 / old["visitors"] + 1 / new["visitors"]))
z = (conversion["new"] - conversion["old"]) / se
p_value = erfc(abs(z) / sqrt(2))`,
  'by-day-type': `df["weekend"] = df["day"].isin(["Sat", "Sun"])
by_day = df.groupby(["weekend", "variant"])[["visitors", "orders"]].sum()
by_day_type = by_day["orders"] / by_day["visitors"]`,
  'daily-chart': `import matplotlib.pyplot as plt
df["rate"] = df["orders"] / df["visitors"]
daily = df.pivot(index="date", columns="variant", values="rate")
fig, ax = plt.subplots()
daily.plot(ax=ax, marker="o")
ax.set_title("Daily conversion by checkout")
plt.show()`,
};

function solvedUpTo(taskId: string) {
  const ws = workspace();
  for (const [id, code] of Object.entries(SOLUTIONS)) {
    if (id === taskId) break;
    ws.run(code);
  }
  return ws;
}

describe('checkout reference answers', () => {
  it('match the values computed independently from the CSV', () => {
    const python = JSON.parse(
      pyodide.runPython(
        'import json; json.dumps({k: v for k, v in compute_reference("checkout.csv").items() if k != "day_rates"})',
      ),
    );
    const expected = checkoutReference();
    expect(python.n_rows).toBe(expected.rows);
    expect(python.days).toBe(expected.days);
    expect(python.visitors).toBe(expected.visitors);
    expect(python.rates.old).toBeCloseTo(expected.oldRate, 12);
    expect(python.rates.new).toBeCloseTo(expected.newRate, 12);
    expect(python.z[0]).toBeCloseTo(expected.overall.z, 9);
    expect(python.weekend_share.new).toBeCloseTo(expected.weekendShare.new, 12);
  });

  it('report exactly the facts the mission content quotes', () => {
    const summary = JSON.parse(pyodide.runPython('reference_summary()'));
    expect(Object.keys(summary).sort()).toEqual([...theCheckoutRedesign.facts].sort());
    expect(summary).toMatchObject({ days: 14, oldRate: '3.8%', newRate: '4.7%' });
  });
});

describe('checkout mission checks', () => {
  it('pass every task solved correctly, in order', () => {
    const ws = workspace();
    for (const task of theCheckoutRedesign.tasks) {
      if (task.kind !== 'code') continue;
      ws.run(SOLUTIONS[task.id]);
      expect(ws.check(task.id), task.id).toMatchObject({ passed: true });
    }
  });

  it('accept other reasonable answers', () => {
    const ws = solvedUpTo('by-day-type');
    ws.run(`${SOLUTIONS.significance}\nz = -z`);
    expect(ws.check('significance').passed).toBe(true);
    ws.run(`${SOLUTIONS['by-day-type']}\nby_day_type = by_day_type.unstack()`);
    expect(ws.check('by-day-type').passed).toBe(true);
    ws.run('conversion = by_variant.assign(rate=by_variant["orders"] / by_variant["visitors"])');
    expect(ws.check('conversion').passed).toBe(true);
  });

  it('explain what is wrong without giving the answer away', () => {
    const cases: Array<[task: string, code: string, message: RegExp]> = [
      [
        'conversion',
        `${SOLUTIONS.conversion}\nconversion = (df["orders"] / df["visitors"]).groupby(df["variant"]).mean()`,
        /averages the daily rates/,
      ],
      ['conversion', `${SOLUTIONS.conversion}\nconversion = by_variant["orders"]`, /order counts/],
      ['significance', 'z = 3.0', /`z` does not match/],
      ['significance', `${SOLUTIONS.significance}\np_value = p_value / 2`, /one-sided p-value/],
      [
        'by-day-type',
        'df["weekend"] = df["day"].isin(["Sat", "Sun"])\nby_day_type = df.groupby("weekend")[["visitors", "orders"]].sum().pipe(lambda d: d["orders"] / d["visitors"])',
        /split by day type only/,
      ],
      [
        'daily-chart',
        'import matplotlib.pyplot as plt\nfig, ax = plt.subplots()\nax.plot([1, 2])\nplt.show()',
        /needs a title/,
      ],
    ];
    for (const [task, code, message] of cases) {
      const ws = solvedUpTo(task);
      ws.run(code);
      const result = ws.check(task);
      expect(result.passed, `${task}: ${code}`).toBe(false);
      expect(result.message, `${task}: ${code}`).toMatch(message);
      expect(result.message).not.toMatch(/4\.68|3\.85|5\.54|3\.43/);
    }
  });

  it('never crash, even with nothing defined', () => {
    const ws = workspace();
    for (const task of theCheckoutRedesign.tasks) {
      if (task.kind !== 'code') continue;
      const result = ws.check(task.id);
      expect(result.passed).toBe(false);
      expect(result.message.length).toBeGreaterThan(10);
    }
  });
});
