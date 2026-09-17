import { expect, test } from '@playwright/test';
import { unit1 } from '../src/content/unit1';
import { FIXED_TIME, answerCorrectly, playLesson, runTaskAndPass, writeCode } from './helpers';

const TASK_CODE: Record<string, string> = {
  'load-data': `import pandas as pd
df = pd.read_csv("deliveries.csv")
n_orders = len(df)
print("Orders:", n_orders)
df.head()`,
  'missing-values': `missing = df.isna().sum()
print(missing)
clean = df.dropna(subset=["delivery_time_min"])
print("Rows before:", len(df), "after:", len(clean))`,
  'city-averages': `city_stats = clean.groupby("city")["delivery_time_min"].agg(["mean", "median"])
city_stats`,
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME);
});

test('a new learner onboards, plays lesson 1, tests out, and solves the first mission tasks', async ({
  page,
}) => {
  // The mission downloads about 25 MB of Python, so this test is as slow as the connection is.
  test.setTimeout(900_000);
  await page.goto('/');

  // Onboarding: three screens, then straight into lesson 1.
  await expect(page.getByRole('heading', { name: 'Welcome to Data Detective' })).toBeVisible();
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByRole('radio', { name: /data analyst/i }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /regular/i }).check();
  await page.getByRole('button', { name: 'Start lesson 1' }).click();

  const [lesson] = unit1.lessons;
  await expect(page.getByRole('heading', { name: lesson.title })).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  await playLesson(page, lesson.questions);
  await page.getByRole('button', { name: 'Back to path' }).click();
  await expect(page.getByText('1 of 7 lessons')).toBeVisible();

  // Test out of the rest of the unit.
  await page.getByRole('link', { name: 'Test out' }).click();
  await page.getByRole('button', { name: 'Start checkpoint' }).click();
  for (const item of unit1.checkpoint.items) {
    await answerCorrectly(page, item.question);
    await page.getByRole('button', { name: /^(Next|Finish)$/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'You tested out' })).toBeVisible();
  await expect(page.getByText('10 of 10 right. You needed 8.')).toBeVisible();

  // The mission: real Pyodide from the CDN, then the first three tasks.
  await page.getByRole('link', { name: 'Open the mission' }).click();
  await expect(page.getByRole('heading', { name: 'Open the case file' })).toBeVisible();
  await expect(page.getByText('Setting up Python in your browser')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeEnabled({
    timeout: 600_000,
  });

  await writeCode(page, TASK_CODE['load-data']);
  await runTaskAndPass(page);
  await expect(page.getByRole('group', { name: 'Task check' })).toContainText('+20 XP');
  await page.getByRole('button', { name: 'Next: Find the gaps' }).click();

  await writeCode(page, TASK_CODE['missing-values']);
  await runTaskAndPass(page);
  await page.getByRole('button', { name: 'Next: Compare the cities' }).click();

  await writeCode(page, TASK_CODE['city-averages']);
  await runTaskAndPass(page);
  await expect(page.getByText('3 of 5 code tasks passed')).toBeVisible();

  // The playtest log has the events a tester would send back.
  await page.goto('/playtest');
  await expect(page.getByRole('heading', { name: 'Playtest data' })).toBeVisible();
  const summary = await page.locator('pre').innerText();
  expect(summary).toContain('Lessons: 1 completed');
  expect(summary).toContain('Checkpoint: 1 attempt(s), passed');
  expect(summary).toMatch(/load-data: \d+ run/);
});
