import { expect, test } from '@playwright/test';

/**
 * Measures how long Python takes to load on a throttled connection, which is the slowest thing a
 * learner waits for. Opt in: it downloads about 25 MB at 1.6 Mbit/s, so it takes minutes.
 *
 *   RUN_SLOW_NETWORK=1 npx playwright test slow-network
 */
const SLOW_4G = {
  offline: false,
  // Chrome DevTools "Slow 4G": 1.6 Mbit/s down, 750 kbit/s up, 562.5 ms round trip.
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 562.5,
};

test('@slow the mission explains the wait and loads Python on Slow 4G', async ({ page }) => {
  test.skip(!process.env.RUN_SLOW_NETWORK, 'Set RUN_SLOW_NETWORK=1 to run this measurement.');
  test.setTimeout(600_000);

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'data-detective:progress',
      JSON.stringify({
        version: 1,
        progress: {
          profile: { goal: 'curious', onboardedAt: '2026-03-01T09:00:00.000Z' },
          lessons: Object.fromEntries(
            [
              'what-is-a-dataset',
              'the-mean',
              'median-and-mode',
              'mean-vs-median',
              'range-and-iqr',
              'standard-deviation',
              'shapes-of-data',
            ].map((id) => [id, { completedAt: '2026-03-01T09:00:00.000Z' }]),
          ),
          activity: {},
          practiceAwards: { day: null, counts: {} },
          dailyGoal: 20,
          missions: {},
          checkpoints: {},
        },
      }),
    );
  });

  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', SLOW_4G);

  const started = Date.now();
  await page.goto('/mission');

  // The wait is explained while Python downloads.
  await expect(page.getByText('Setting up Python in your browser')).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByText(/about 25 MB, saved for next time/)).toBeVisible();

  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeEnabled({
    timeout: 540_000,
  });
  const wallClockMs = Date.now() - started;

  const reported = await page.evaluate(() => {
    const raw = window.localStorage.getItem('data-detective:events');
    const events = raw ? (JSON.parse(raw).events as Array<{ type: string; ms?: number }>) : [];
    return events.find((event) => event.type === 'pyodide_loaded')?.ms ?? null;
  });

  console.log(
    `Slow 4G: Python ready after ${Math.round(wallClockMs / 1000)}s from opening the mission` +
      (reported ? ` (worker reported ${Math.round(reported / 1000)}s)` : ''),
  );
  expect(reported ?? wallClockMs).toBeGreaterThan(0);
});
