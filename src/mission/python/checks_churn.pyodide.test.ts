/**
 * Runs Unit 2's hidden checks in Pyodide under Node, against the generated churn dataset.
 *
 *   npm run test:python
 */
import { readFileSync } from 'node:fs';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import { theFalseAlarm } from '../../content/mission2';
import { CHURN_CSV, churnReference } from '../../test/churnReference';
import checksSource from './checks_churn.py?raw';
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
  pyodide.FS.writeFile('/home/pyodide/churn.csv', readFileSync(CHURN_CSV, 'utf8'));
  pyodide.runPython('import os; os.chdir("/home/pyodide")');
  pyodide.runPython(runnerSource);
  pyodide.runPython(checksSource);
  pyodide.runPython('compute_reference("churn.csv")');
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
  'churn-rate': `import pandas as pd
df = pd.read_csv("churn.csv")
april = df[df["month"] == "2026-04"]
april_rate = april["cancelled"].sum() / april["subscribers_start"].sum()
before = df[df["month"] < "2026-04"]
base_rate = before["cancelled"].sum() / before["subscribers_start"].sum()`,
  'by-segment': `by_segment = april.groupby("segment")[["cancelled", "subscribers_start"]].sum()
segment_rates = by_segment["cancelled"] / by_segment["subscribers_start"]`,
  'every-april': `students = df[df["segment"] == "student"]
student_april_rows = students[students["month"].str.endswith("-04")]
by_month = student_april_rows.groupby("month")[["cancelled", "subscribers_start"]].sum()
student_aprils = by_month["cancelled"] / by_month["subscribers_start"]`,
  'student-chart': `import matplotlib.pyplot as plt
students = df[df["segment"] == "student"].set_index("month")
student_rates = students["cancelled"] / students["subscribers_start"]
fig, ax = plt.subplots()
student_rates.plot(ax=ax)
ax.set_title("Student churn by month")
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

describe('churn reference answers', () => {
  it('match the values computed independently from the CSV', () => {
    const python = JSON.parse(
      pyodide.runPython('import json; json.dumps(compute_reference("churn.csv"))'),
    );
    const expected = churnReference();
    expect(python.n_rows).toBe(expected.rows);
    expect(python.last_month).toBe(expected.lastMonth);
    expect(python.lost_last_month).toBe(expected.lastCancelled);
    expect(python.last_rate).toBeCloseTo(expected.lastRate, 12);
    expect(python.base_rate).toBeCloseTo(expected.baseRate, 12);
    expect(python.student_other_rate).toBeCloseTo(expected.studentOtherRate, 12);
    for (const [segment, rate] of Object.entries(expected.segmentRatesLast)) {
      expect(python.segment_rates_last[segment]).toBeCloseTo(rate, 12);
    }
    for (const [month, rate] of Object.entries(expected.studentAprilRates)) {
      expect(python.student_aprils[month.slice(0, 4)]).toBeCloseTo(rate, 12);
    }
  });

  it('report exactly the facts the mission content quotes', () => {
    const summary = JSON.parse(pyodide.runPython('reference_summary()'));
    expect(Object.keys(summary).sort()).toEqual([...theFalseAlarm.facts].sort());
    expect(summary).toMatchObject({
      lostLastMonth: 200,
      lastMonth: 'April 2026',
      lastRate: '4.0%',
    });
  });
});

describe('churn mission checks', () => {
  it('pass every task solved correctly, in order', () => {
    const ws = workspace();
    for (const task of theFalseAlarm.tasks) {
      if (task.kind !== 'code') continue;
      ws.run(SOLUTIONS[task.id]);
      expect(ws.check(task.id), task.id).toMatchObject({ passed: true });
    }
  });

  it('accept other reasonable answers', () => {
    const ws = solvedUpTo('by-segment');
    ws.run(
      'base_rate = before.groupby("month")[["cancelled", "subscribers_start"]].sum().pipe(lambda m: m["cancelled"] / m["subscribers_start"]).mean()',
    );
    expect(ws.check('churn-rate').passed).toBe(true);

    ws.run(
      'segment_rates = april.assign(rate=april["cancelled"] / april["subscribers_start"])[["segment", "rate"]]',
    );
    expect(ws.check('by-segment').passed).toBe(true);

    ws.run(SOLUTIONS['every-april']);
    ws.run('student_aprils.index = [int(month[:4]) for month in student_aprils.index]');
    expect(ws.check('every-april').passed).toBe(true);
  });

  it('explain what is wrong without giving the answer away', () => {
    const cases: Array<[task: string, code: string, message: RegExp]> = [
      ['churn-rate', 'import pandas as pd\ndf = pd.read_csv("churn.csv", nrows=10)', /has 10 rows/],
      [
        'churn-rate',
        `${SOLUTIONS['churn-rate']}\napril_rate = (april["cancelled"] / april["subscribers_start"]).mean()`,
        /average of the three segments/,
      ],
      ['churn-rate', `${SOLUTIONS['churn-rate']}\napril_rate = april_rate * 100`, /percentage/],
      [
        'churn-rate',
        `${SOLUTIONS['churn-rate']}\nbase_rate = df["cancelled"].sum() / df["subscribers_start"].sum()`,
        /includes April 2026 itself/,
      ],
      ['by-segment', 'segment_rates = april.groupby("segment")["cancelled"].sum()', /counts/],
      [
        'by-segment',
        'totals = df.groupby("segment")[["cancelled", "subscribers_start"]].sum()\nsegment_rates = totals["cancelled"] / totals["subscribers_start"]',
        /use every month/,
      ],
      [
        'every-april',
        'aprils = df[df["month"].str.endswith("-04")].groupby("month")[["cancelled", "subscribers_start"]].sum()\nstudent_aprils = aprils["cancelled"] / aprils["subscribers_start"]',
        /mix every segment/,
      ],
      [
        'every-april',
        'rates = df[df["segment"] == "student"].groupby("month")[["cancelled", "subscribers_start"]].sum()\nstudent_aprils = rates["cancelled"] / rates["subscribers_start"]',
        /one rate for each April/,
      ],
      [
        'student-chart',
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
      expect(result.message).not.toMatch(/3\.98|8\.04|2\.70/);
    }
  });

  it('never crash, even with nothing defined', () => {
    const ws = workspace();
    for (const task of theFalseAlarm.tasks) {
      if (task.kind !== 'code') continue;
      const result = ws.check(task.id);
      expect(result.passed).toBe(false);
      expect(result.message.length).toBeGreaterThan(10);
    }
  });
});
