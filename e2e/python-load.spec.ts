import { expect, test, type Page } from '@playwright/test';

/**
 * Measures how long Python takes to load, which is the longest a learner ever waits. Opt in: it
 * downloads about 25 MB with a cold cache.
 *
 *   RUN_SLOW_NETWORK=1 npx playwright test python-load
 *
 * Throttling sets a ceiling, not a floor, so the Slow 4G number is only meaningful on a machine
 * whose own connection is faster than the profile.
 */
const SLOW_4G = {
  offline: false,
  // Chrome DevTools "Slow 4G": 1.6 Mbit/s down, 750 kbit/s up, 562.5 ms round trip.
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 562.5,
};

/** Opens the app with the unit finished, so the mission is unlocked. */
async function openWithMissionUnlocked(page: Page) {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('data-detective:progress')) return;
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
}

/** Waits for Python and reports how long it took, in seconds. */
async function measureLoad(page: Page, label: string, timeoutMs: number) {
  const started = Date.now();
  await page.goto('/mission');

  await expect(page.getByText('Setting up Python in your browser')).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByText(/about 25 MB, saved for next time/)).toBeVisible();

  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeEnabled({
    timeout: timeoutMs,
  });
  const wallClockMs = Date.now() - started;
  const reported = await page.evaluate(() => {
    const raw = window.localStorage.getItem('data-detective:events');
    const events = raw ? (JSON.parse(raw).events as Array<{ type: string; ms?: number }>) : [];
    return events.find((event) => event.type === 'pyodide_loaded')?.ms ?? null;
  });

  console.log(
    `${label}: Python ready ${Math.round(wallClockMs / 1000)}s after opening the mission` +
      (reported ? ` (worker reported ${Math.round(reported / 1000)}s)` : ''),
  );
  expect(reported ?? wallClockMs).toBeGreaterThan(0);
  return wallClockMs;
}

test.beforeEach(async ({ page }) => {
  test.skip(!process.env.RUN_SLOW_NETWORK, 'Set RUN_SLOW_NETWORK=1 to run these measurements.');
  await openWithMissionUnlocked(page);
});

test('the mission explains the wait and loads Python on this connection', async ({ page }) => {
  test.setTimeout(900_000);
  await measureLoad(page, 'This connection', 600_000);
});

test('@slow the mission loads Python on a Slow 4G profile', async ({ page }) => {
  test.setTimeout(1_800_000);
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', SLOW_4G);
  await measureLoad(page, 'Slow 4G', 1_500_000);
});
