import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderShareImage } from '../components/daily/shareImage';
import { dailyQuestions } from '../content/daily';
import { fillQuestionText } from '../content/template';
import type { Question } from '../content/types';
import { isOnboarded } from '../game/progress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { answerCorrectly, answerIncorrectly } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';

vi.mock('../components/daily/shareImage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/daily/shareImage')>()),
  renderShareImage: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}));

/** Launch day, challenge #1, mid-morning local time. */
const LAUNCH = new Date(2026, 8, 19, 9, 30).getTime();
const DAY_MS = 86_400_000;
const [chaiChart, shoeCase] = dailyQuestions;

function defineOnNavigator(name: 'share' | 'canShare', value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true, writable: true });
}

async function start(user: UserEvent, question: Question) {
  await screen.findByRole('button', { name: 'Start the clock' });
  await user.keyboard('{Enter}');
  expect(
    await screen.findByRole('heading', { name: fillQuestionText(question, question.prompt) }),
  ).toHaveFocus();
}

describe('daily challenge', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(LAUNCH);
    URL.createObjectURL = vi.fn(() => 'blob:daily-card');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'canShare');
  });

  it('gives every visitor the same question on a date, and a new one the next day', async () => {
    const user = userEvent.setup();
    const first = renderApp({ path: '/daily' });
    expect(await screen.findByRole('heading', { name: 'Spot the lying chart' })).toBeVisible();
    expect(screen.getByText('Daily challenge #1')).toBeVisible();
    await start(user, chaiChart);
    first.unmount();

    // Someone else, on another device, later the same day.
    vi.setSystemTime(LAUNCH + 12 * 3_600_000);
    const second = renderApp({ path: '/daily', onboarded: false });
    await start(user, chaiChart);
    second.unmount();

    vi.setSystemTime(LAUNCH + DAY_MS);
    renderApp({ path: '/daily' });
    expect(await screen.findByRole('heading', { name: 'Crack the case' })).toBeVisible();
    expect(screen.getByText('Daily challenge #2')).toBeVisible();
    await start(user, shoeCase);
  });

  it('plays with the keyboard alone, times the answer and makes the share card', async () => {
    const user = userEvent.setup();
    const { store, events } = renderApp({ path: '/daily' });
    await start(user, chaiChart);
    const timer = screen.getByRole('timer', { name: 'Time taken' });
    expect(timer).toHaveTextContent('0:00');

    vi.setSystemTime(LAUNCH + 8_200);
    await waitFor(() => expect(timer).toHaveTextContent('0:08'));
    await answerCorrectly(user, chaiChart);
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Solved in 8 seconds' })).toHaveFocus();
    expect(
      screen.getByRole('img', {
        name: 'I spotted the lying chart in 8 seconds — can you? Daily challenge #1 · 19 Sep 2026. Play at localhost:3000/daily',
      }),
    ).toBeVisible();
    expect(screen.getByRole('region', { name: 'The honest version' })).toBeVisible();
    expect(store.getSnapshot().daily['2026-09-19']).toEqual({
      questionId: chaiChart.id,
      selectedIndex: 0,
      correct: true,
      seconds: 8,
    });
    expect(events.getSnapshot()).toContainEqual(
      expect.objectContaining({ type: 'daily_answered', number: 1, correct: true, ms: 8_200 }),
    );
  });

  it('owns up to a wrong answer and explains the trick', async () => {
    vi.setSystemTime(LAUNCH + DAY_MS);
    const user = userEvent.setup();
    renderApp({ path: '/daily' });
    await start(user, shoeCase);
    await answerIncorrectly(user, shoeCase);
    await user.click(screen.getByRole('button', { name: 'Check' }));

    expect(await screen.findByRole('heading', { name: 'This one fooled you' })).toBeVisible();
    expect(screen.getByText(shoeCase.explanation)).toBeVisible();
    expect(screen.getByText(/About your pick:/)).toBeVisible();
    expect(
      screen.getByRole('img', { name: /^Today’s case stumped me — can you crack it\?/ }),
    ).toBeVisible();
  });

  it('allows one try a day', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(createMemoryStore());
    const first = renderApp({ path: '/daily', store });
    await start(user, chaiChart);
    await answerIncorrectly(user, chaiChart);
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: 'This one fooled you' });
    first.unmount();

    renderApp({ path: '/daily', store });
    expect(await screen.findByRole('heading', { name: 'This one fooled you' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Start the clock' })).not.toBeInTheDocument();
  });

  it('shares the image, downloads it or copies the text', async () => {
    const share = vi.fn(async () => {});
    defineOnNavigator('share', share);
    defineOnNavigator(
      'canShare',
      vi.fn(() => true),
    );
    const user = userEvent.setup();
    const { events } = renderApp({ path: '/daily' });
    await start(user, chaiChart);
    vi.setSystemTime(LAUNCH + 8_000);
    await answerCorrectly(user, chaiChart);
    await user.keyboard('{Enter}');

    const download = await screen.findByRole('link', { name: 'Download image' });
    expect(download).toHaveAttribute('href', 'blob:daily-card');
    expect(download).toHaveAttribute('download', 'data-detective-daily-2026-09-19.png');

    const text = `I spotted the lying chart in 8 seconds — can you?\nData Detective daily challenge #1\n${window.location.origin}/daily`;
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({
      files: [
        expect.objectContaining({ name: 'data-detective-daily-2026-09-19.png', type: 'image/png' }),
      ],
      title: 'Data Detective daily challenge',
      text,
    });

    await user.click(screen.getByRole('button', { name: 'Copy text' }));
    expect(await screen.findByText('Copied. Paste it into any chat.')).toBeVisible();
    expect(await navigator.clipboard.readText()).toBe(text);
    expect(
      events
        .getSnapshot()
        .flatMap((event) => (event.type === 'daily_shared' ? [event.method] : [])),
    ).toEqual(['share', 'copy']);
  });

  it('shares the text alone when the image cannot be made', async () => {
    vi.mocked(renderShareImage).mockRejectedValueOnce(new Error('No canvas'));
    const share = vi.fn(async () => {});
    defineOnNavigator('share', share);
    defineOnNavigator(
      'canShare',
      vi.fn(() => true),
    );
    const user = userEvent.setup();
    renderApp({ path: '/daily' });
    await start(user, chaiChart);
    await answerCorrectly(user, chaiChart);
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('button', { name: 'Image not available' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({
      title: 'Data Detective daily challenge',
      text: expect.stringContaining('Data Detective daily challenge #1'),
    });
  });

  it('hides the share button where the browser cannot share', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/daily' });
    await start(user, chaiChart);
    await answerCorrectly(user, chaiChart);
    await user.keyboard('{Enter}');

    await screen.findByRole('link', { name: 'Download image' });
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy text' })).toBeEnabled();
  });

  it('is open to first-time visitors and leaves course progress alone', async () => {
    const user = userEvent.setup();
    const { store, router } = renderApp({ path: '/daily', onboarded: false });
    await start(user, chaiChart);
    await answerCorrectly(user, chaiChart);
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: /^Solved in/ });

    const progress = store.getSnapshot();
    expect(isOnboarded(progress)).toBe(false);
    expect(progress.activity.totalXp).toBe(0);
    expect(progress.lessons).toEqual({});

    await user.click(screen.getByRole('link', { name: 'Start learning' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/welcome'));
  });

  it('is a tab in the main navigation', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();
    await user.click(within(screen.getByTestId('bottom-nav')).getByRole('link', { name: 'Daily' }));
    expect(router.state.location.pathname).toBe('/daily');
    expect(await screen.findByRole('heading', { name: 'Spot the lying chart' })).toBeVisible();
  });
});
