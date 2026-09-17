import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lateDeliveryMystery } from './mission1';
import { formatIssues, validateMission } from './validate';

describe('mission content', () => {
  it('passes validation', () => {
    expect(formatIssues(validateMission(lateDeliveryMystery))).toBe('');
  });

  it('has five required code tasks, a written recommendation, then stretch tasks', () => {
    const required = lateDeliveryMystery.tasks.filter((task) => !task.stretch);
    expect(required.map((task) => task.kind)).toEqual([
      'code',
      'code',
      'code',
      'code',
      'code',
      'written',
    ]);
    expect(lateDeliveryMystery.tasks.filter((task) => task.stretch)).toHaveLength(2);
  });

  it('asks for the variables the grading will look for', () => {
    const creates = lateDeliveryMystery.tasks.flatMap((task) =>
      task.kind === 'code' ? task.creates : [],
    );
    expect(creates).toEqual([
      'df',
      'n_orders',
      'missing',
      'clean',
      'city_stats',
      'n_outliers',
      'city_stats_no_outliers',
      'slow_city_by_hour',
    ]);
  });

  it('does not let stretch task titles repeat the Stretch badge', () => {
    const tasks = lateDeliveryMystery.tasks.map((task) =>
      task.id === 'dinner-rush' ? { ...task, title: 'Stretch: the dinner rush' } : task,
    );
    expect(formatIssues(validateMission({ ...lateDeliveryMystery, tasks }))).toMatch(
      /do not start the title with "Stretch"/,
    );
  });

  it('checks summary placeholders, task references and portfolio length', () => {
    const { summary } = lateDeliveryMystery;
    const broken = {
      ...lateDeliveryMystery,
      summary: {
        whatYouDid: [...summary.whatYouDid, { text: 'Found {suspects} suspects' }],
        portfolio: [
          ...summary.portfolio,
          { text: 'Charted the rush', requiresTask: 'chart-it' },
          { text: 'Checked ratings' },
        ],
      },
    };
    const issues = formatIssues(validateMission(broken));
    expect(issues).toMatch(/\{suspects\} is not a known mission fact/);
    expect(issues).toMatch(/refers to unknown task "chart-it"/);
    expect(issues).toMatch(/shows 5 lines; keep it to 3–4/);
  });

  it('needs a fill-in-the-blank example in every code hint', () => {
    const tasks = lateDeliveryMystery.tasks.map((task) =>
      task.kind === 'code' && task.id === 'load-data'
        ? { ...task, hints: { ...task.hints, example: 'df = pd.read_csv("deliveries.csv")' } }
        : task,
    );
    expect(formatIssues(validateMission({ ...lateDeliveryMystery, tasks }))).toMatch(/____/);
  });

  it('catches a stretch task placed before a required one', () => {
    const [first, ...rest] = lateDeliveryMystery.tasks;
    const broken = { ...lateDeliveryMystery, tasks: [{ ...first, stretch: true }, ...rest] };
    expect(formatIssues(validateMission(broken))).toMatch(/stretch tasks must come after/);
  });
});

describe('deliveries dataset', () => {
  const csv = readFileSync(resolve(__dirname, '../../public/data/deliveries.csv'), 'utf8');
  const [header, ...rows] = csv.trim().split('\n');

  it('has the documented columns and 600 orders', () => {
    expect(header).toBe(lateDeliveryMystery.dataset.columns.map((column) => column.name).join(','));
    expect(rows).toHaveLength(600);
  });

  it('is missing 18 delivery times and 42 ratings, as scripts/README.md says', () => {
    const cells = rows.map((row) => row.split(','));
    expect(cells.filter((cell) => cell[5] === '')).toHaveLength(18);
    expect(cells.filter((cell) => cell[6] === '')).toHaveLength(42);
  });
});
