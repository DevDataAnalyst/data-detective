import { expect, test } from '@playwright/test';
import { courseUnits } from '../src/content';
import { missionPath } from '../src/content/paths';
import { unitMission } from '../src/content/missions';
import { FIXED_TIME, answerCorrectly, runTaskAndPass, writeCode } from './helpers';

/** A correct answer to the first code task of each mission. */
const FIRST_CODE: Record<string, string> = {
  'late-delivery-mystery': `import pandas as pd
df = pd.read_csv("deliveries.csv")
n_orders = len(df)
print("Orders:", n_orders)`,
  'the-false-alarm': `import pandas as pd
df = pd.read_csv("churn.csv")
april = df[df["month"] == "2026-04"]
april_rate = april["cancelled"].sum() / april["subscribers_start"].sum()
before = df[df["month"] < "2026-04"]
base_rate = before["cancelled"].sum() / before["subscribers_start"].sum()`,
  'the-checkout-redesign': `import pandas as pd
df = pd.read_csv("checkout.csv")
by_variant = df.groupby("variant")[["visitors", "orders"]].sum()
conversion = by_variant["orders"] / by_variant["visitors"]`,
  // SQL: typed into the editor as a query, run through the mission's SQLite tables.
  'the-final-round': `SELECT COUNT(*) AS item_rows,
  COUNT(DISTINCT order_id) AS orders
FROM order_items;`,
};

/** Every unit tested out, so every mission is open. */
const PASSED = {
  passedAt: '2026-03-01T09:00:00.000Z',
  attempts: 1,
  lastAttempt: {
    at: '2026-03-01T09:00:00.000Z',
    correct: 10,
    total: 10,
    passed: true,
    missedLessonIds: [],
  },
  correctQuestionIds: [],
};

test('every mission loads its own data at its own address, and grades its first code task', async ({
  page,
}) => {
  // Python and pandas download once (about 25 MB); later missions use the browser's cache.
  test.setTimeout(900_000);
  await page.clock.setFixedTime(FIXED_TIME);
  const progress = {
    profile: { goal: 'curious', onboardedAt: '2026-03-01T09:00:00.000Z' },
    checkpoints: Object.fromEntries(courseUnits.map((unit) => [unit.checkpoint.id, PASSED])),
    hooksSeen: courseUnits.map((unit) => unit.id),
  };
  await page.addInitScript(
    (saved) => {
      if (window.localStorage.getItem('data-detective:progress')) return;
      window.localStorage.setItem('data-detective:progress', JSON.stringify(saved));
    },
    { version: 1, progress },
  );

  for (const unit of courseUnits) {
    const mission = unitMission(unit);
    // Missions live several folders deep, so the dataset must not be fetched relative to the page.
    await page.goto(missionPath(unit.id));
    await expect(page.getByRole('heading', { name: `Mission: ${mission.title}` })).toBeVisible();

    // Question tasks are checked in the page, so they can be answered while Python loads.
    const firstCode = mission.tasks.findIndex((task) => task.kind === 'code');
    for (const [index, task] of mission.tasks.slice(0, firstCode).entries()) {
      if (task.kind !== 'question') continue;
      await answerCorrectly(page, task.question);
      await page.getByRole('button', { name: 'Check', exact: true }).click();
      await expect(page.getByRole('group', { name: 'Task check' })).toContainText('Task passed');
      await page.getByRole('button', { name: `Next: ${mission.tasks[index + 1].title}` }).click();
    }

    await expect(page.getByRole('heading', { name: mission.tasks[firstCode].title })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeEnabled({
      timeout: 600_000,
    });
    await writeCode(page, FIRST_CODE[mission.id]);
    await runTaskAndPass(page);
  }
});
