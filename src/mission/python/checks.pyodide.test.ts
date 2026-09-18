/**
 * Runs the real Python checks in Pyodide under Node, against the generated dataset.
 *
 *   npm run test:python
 *
 * Needs the internet the first time, to download pandas and matplotlib wheels (then cached).
 */
import { readFileSync } from 'node:fs';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { beforeAll, describe, expect, it } from 'vitest';
import { lateDeliveryMystery } from '../../content/mission1';
import { DELIVERIES_CSV, deliveriesReference } from '../../test/deliveriesReference';
import checksSource from './checks.py?raw';
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
  pyodide.FS.writeFile('/home/pyodide/deliveries.csv', readFileSync(DELIVERIES_CSV, 'utf8'));
  pyodide.runPython('import os; os.chdir("/home/pyodide")');
  pyodide.runPython(runnerSource);
  pyodide.runPython(checksSource);
  pyodide.runPython('compute_reference("deliveries.csv")');
}, 300_000);

/** A fresh Python namespace with helpers to run code and check a task. */
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
  'load-data': `import pandas as pd
df = pd.read_csv("deliveries.csv")
n_orders = len(df)
df.head()`,
  'missing-values': `missing = df.isna().sum()
clean = df.dropna(subset=["delivery_time_min"])`,
  'city-averages': `city_stats = clean.groupby("city")["delivery_time_min"].agg(["mean", "median"])`,
  'flag-outliers': `times = clean["delivery_time_min"]
q1 = times.quantile(0.25)
q3 = times.quantile(0.75)
iqr = q3 - q1
lower = q1 - 1.5 * iqr
upper = q3 + 1.5 * iqr
n_outliers = ((times < lower) | (times > upper)).sum()`,
  'without-outliers': `no_outliers = clean[(clean["delivery_time_min"] >= lower) & (clean["delivery_time_min"] <= upper)]
city_stats_no_outliers = no_outliers.groupby("city")["delivery_time_min"].mean()`,
  'dinner-rush': `slow_city = "Kolkata"
slow_city_by_hour = clean[clean["city"] == slow_city].groupby("order_hour")["delivery_time_min"].mean()`,
  'make-a-chart': `import matplotlib.pyplot as plt
fig, ax = plt.subplots()
city_stats_no_outliers.plot.bar(ax=ax)
ax.set_title("Mean delivery time without outliers")
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

describe('reference answers', () => {
  it('match the values computed independently from the CSV', () => {
    const python = JSON.parse(
      pyodide.runPython('import json; json.dumps(compute_reference("deliveries.csv"))'),
    );
    const expected = deliveriesReference();
    expect(python.n_orders).toBe(expected.nOrders);
    expect(python.columns).toEqual(expected.columns);
    expect(python.missing.delivery_time_min).toBe(expected.missing.delivery_time_min);
    expect(python.missing.rating).toBe(expected.missing.rating);
    expect(python.clean_rows).toBe(expected.cleanRows);
    expect(python.cities).toEqual(expected.cities);
    for (const city of expected.cities) {
      expect(python.city_mean[city]).toBeCloseTo(expected.cityMean[city], 9);
      expect(python.city_median[city]).toBeCloseTo(expected.cityMedian[city], 9);
      expect(python.city_mean_no_outliers[city]).toBeCloseTo(expected.cityMeanNoOutliers[city], 9);
    }
    expect([python.q1, python.q3, python.lower, python.upper]).toEqual([
      expected.q1,
      expected.q3,
      expected.lower,
      expected.upper,
    ]);
    expect(python.n_outliers).toBe(expected.nOutliers);
    expect(python.raw_slowest_city).toBe(expected.rawSlowestCity);
    expect(python.slowest_city).toBe(expected.slowestCity);
    for (const [hour, minutes] of Object.entries(expected.slowCityByHour)) {
      expect(python.city_by_hour[expected.slowestCity][hour]).toBeCloseTo(minutes, 9);
    }
  });
});

describe('dataset facts', () => {
  it('report exactly the facts the mission content quotes', () => {
    const summary = JSON.parse(pyodide.runPython('reference_summary()'));
    expect(Object.keys(summary).sort()).toEqual([...lateDeliveryMystery.facts].sort());
  });
});

describe('mission checks', () => {
  it('pass every task solved correctly, in order', () => {
    const ws = workspace();
    for (const task of lateDeliveryMystery.tasks) {
      if (task.kind !== 'code') continue;
      ws.run(SOLUTIONS[task.id]);
      expect(ws.check(task.id), task.id).toMatchObject({ passed: true });
    }
  });

  it('accept other reasonable answers', () => {
    const ws = solvedUpTo('city-averages');
    ws.run(
      `city_stats = clean.groupby("city", as_index=False).agg(mean=("delivery_time_min", "mean"), median=("delivery_time_min", "median"))`,
    );
    expect(ws.check('city-averages').passed).toBe(true);

    ws.run(SOLUTIONS['flag-outliers']);
    ws.run('n_outliers = len(clean[(times < lower) | (times > upper)])');
    expect(ws.check('flag-outliers').passed).toBe(true);

    ws.run(
      `city_stats_no_outliers = clean[(times >= lower) & (times <= upper)].groupby("city")[["delivery_time_min"]].mean()`,
    );
    expect(ws.check('without-outliers').passed).toBe(true);
  });

  it('explain what is wrong without giving the answer away', () => {
    const cases: Array<[task: string, code: string, message: RegExp]> = [
      [
        'load-data',
        'import pandas as pd\ndf = pd.read_csv("deliveries.csv", nrows=100)',
        /has 100 rows/,
      ],
      [
        'load-data',
        'import pandas as pd\ndf = pd.read_csv("deliveries.csv")\nn_orders = "600"',
        /single number/,
      ],
      ['missing-values', 'missing = df.isna().sum().sum()', /not give one total/],
      [
        'missing-values',
        'missing = df.isna().sum()\nclean = df.dropna()',
        /only the rating is missing/,
      ],
      [
        'missing-values',
        'missing = df.isna().sum()\nclean = df.copy()',
        /still has 18 missing delivery times/,
      ],
      [
        'city-averages',
        'city_stats = clean.groupby("city")["delivery_time_min"].mean()',
        /DataFrame with both/,
      ],
      [
        'city-averages',
        'city_stats = clean.groupby("city")["prep_time_min"].agg(["mean", "median"])',
        /mean for \w+ does not match/,
      ],
      [
        'flag-outliers',
        `${SOLUTIONS['flag-outliers']}\nn_outliers = (times < lower) | (times > upper)`,
        /single number/,
      ],
      [
        'flag-outliers',
        `${SOLUTIONS['flag-outliers']}\nn_outliers = ((times < q1 - 3 * iqr) | (times > q3 + 3 * iqr)).sum()`,
        /3 × IQR/,
      ],
      [
        'flag-outliers',
        `${SOLUTIONS['flag-outliers']}\nn_outliers = ((times < q1) | (times > q3)).sum()`,
        /outside Q1 and Q3/,
      ],
      [
        'without-outliers',
        'city_stats_no_outliers = city_stats["mean"]',
        /same means as in `city_stats`/,
      ],
      [
        'dinner-rush',
        'slow_city_by_hour = clean[clean["city"] == "Hyderabad"].groupby("order_hour")["delivery_time_min"].mean()',
        /This is Hyderabad/,
      ],
      [
        'make-a-chart',
        'import matplotlib.pyplot as plt\nfig, ax = plt.subplots()\ncity_stats["median"].plot.bar(ax=ax)\nplt.show()',
        /needs a title/,
      ],
    ];
    for (const [task, code, message] of cases) {
      const ws = solvedUpTo(task);
      ws.run(code);
      const result = ws.check(task);
      expect(result.passed, `${task}: ${code}`).toBe(false);
      expect(result.message, `${task}: ${code}`).toMatch(message);
      expect(result.message).not.toMatch(/48\.5|33\.16|38\.31/);
    }
  });

  it('never crash, even with nothing defined', () => {
    const ws = workspace();
    for (const task of lateDeliveryMystery.tasks) {
      if (task.kind !== 'code') continue;
      const result = ws.check(task.id);
      expect(result.passed).toBe(false);
      expect(result.message.length).toBeGreaterThan(10);
    }
  });
});
