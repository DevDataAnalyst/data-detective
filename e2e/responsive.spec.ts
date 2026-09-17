import { expect, test, type Page } from '@playwright/test';
import { unit1 } from '../src/content/unit1';
import { FIXED_TIME } from './helpers';

const WIDTHS = [
  { name: 'phone', width: 360, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
];

/** Marks onboarding as done, so the pages under test open straight away. */
async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    // Only on a first load: later navigations keep whatever the test set up.
    if (window.localStorage.getItem('data-detective:progress')) return;
    window.localStorage.setItem(
      'data-detective:progress',
      JSON.stringify({
        version: 1,
        progress: {
          profile: { goal: 'curious', onboardedAt: '2026-03-01T09:00:00.000Z' },
          lessons: {},
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

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
}

for (const size of WIDTHS) {
  test(`pages fit the window at ${size.width}px (${size.name})`, async ({ page }) => {
    await page.clock.setFixedTime(FIXED_TIME);
    await skipOnboarding(page);
    await page.setViewportSize({ width: size.width, height: size.height });

    const pages: Array<{ path: string; ready: () => Promise<unknown> }> = [
      { path: '/', ready: () => expect(page.getByText('0 of 7 lessons')).toBeVisible() },
      {
        path: `/lesson/${unit1.lessons[0].id}`,
        ready: () => expect(page.getByRole('button', { name: 'Start' })).toBeVisible(),
      },
      {
        path: '/checkpoint',
        ready: () => expect(page.getByRole('button', { name: 'Start checkpoint' })).toBeVisible(),
      },
      {
        path: '/profile',
        ready: () => expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible(),
      },
      {
        path: '/playtest',
        ready: () => expect(page.getByRole('heading', { name: 'Playtest data' })).toBeVisible(),
      },
    ];

    for (const target of pages) {
      await page.goto(target.path);
      await target.ready();
      const { scrollWidth, innerWidth } = await horizontalOverflow(page);
      expect(scrollWidth, `${target.path} at ${size.width}px`).toBeLessThanOrEqual(innerWidth + 1);
      await page.screenshot({
        path: `test-results/screens/${size.width}${target.path.replace(/\//g, '_') || '_path'}.png`,
        fullPage: true,
      });
    }

    // A question, where the charts and touch targets are.
    await page.goto(`/lesson/${unit1.lessons[4].id}`);
    await page.evaluate(() => {
      const saved = JSON.parse(window.localStorage.getItem('data-detective:progress') ?? '{}');
      saved.progress.lessons = Object.fromEntries(
        ['what-is-a-dataset', 'the-mean', 'median-and-mode', 'mean-vs-median'].map((id) => [
          id,
          { completedAt: '2026-03-01T09:00:00.000Z' },
        ]),
      );
      window.localStorage.setItem('data-detective:progress', JSON.stringify(saved));
    });
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Check' })).toBeVisible();
    const question = await horizontalOverflow(page);
    expect(question.scrollWidth, `question at ${size.width}px`).toBeLessThanOrEqual(
      question.innerWidth + 1,
    );
    await page.screenshot({
      path: `test-results/screens/${size.width}_question.png`,
      fullPage: true,
    });
  });
}
