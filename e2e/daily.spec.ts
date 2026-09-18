import { expect, test, type Browser } from '@playwright/test';
import { dailyQuestions } from '../src/content/daily';
import { answerCorrectly } from './helpers';

/** Launch day, when challenge #1 is played. */
const LAUNCH = new Date('2026-09-19T09:30:00');
const PHONE = { width: 360, height: 780 };

/** A visitor with a browser of their own: nothing saved, nothing shared with anyone else. */
async function newVisitor(browser: Browser) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: PHONE,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.clock.install({ time: LAUNCH });
  return { context, page };
}

test('every visitor gets the same daily question on a date', async ({ browser }) => {
  const [question] = dailyQuestions;
  for (const hoursLater of [0, 10]) {
    const { context, page } = await newVisitor(browser);
    await page.clock.setSystemTime(new Date(LAUNCH.getTime() + hoursLater * 3_600_000));
    await page.goto('/daily');
    await expect(page.getByText('Daily challenge #1')).toBeVisible();
    await page.getByRole('button', { name: 'Start the clock' }).click();
    await expect(page.getByRole('heading', { name: question.prompt })).toBeVisible();
    await context.close();
  }
});

test('the share card fits a phone and saves as a 1080 × 1350 image', async ({ browser }) => {
  const [question] = dailyQuestions;
  const { context, page } = await newVisitor(browser);
  await page.goto('/daily');
  await page.getByRole('button', { name: 'Start the clock' }).click();
  await page.clock.runFor(8_000);
  await answerCorrectly(page, question);
  await page.getByRole('button', { name: 'Check' }).click();

  await expect(page.getByRole('heading', { name: 'Solved in 8 seconds' })).toBeVisible();
  const card = page.getByRole('img', { name: /^I spotted the lying chart in 8 seconds/ });
  // Centred, so the fixed bottom navigation does not cover it in the screenshot.
  await card.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width);
  // The card keeps its 4:5 shape.
  expect(box!.height / box!.width).toBeCloseTo(1350 / 1080, 2);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The image is made by the browser's own canvas: check what it produced.
  const download = page.getByRole('link', { name: 'Download image' });
  await expect(download).toHaveAttribute('download', 'data-detective-daily-2026-09-19.png');
  const image = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>('a[download]');
    const blob = await fetch(link!.href).then((response) => response.blob());
    const bitmap = await createImageBitmap(blob);
    return { type: blob.type, width: bitmap.width, height: bitmap.height };
  });
  expect(image).toEqual({ type: 'image/png', width: 1080, height: 1350 });

  await card.screenshot({ path: 'test-results/screens/360_daily_card.png' });
  await page.screenshot({ path: 'test-results/screens/360_daily.png', fullPage: true });
  await context.close();
});
