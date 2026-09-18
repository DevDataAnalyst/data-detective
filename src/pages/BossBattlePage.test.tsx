import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fillQuestionText } from '../content/template';
import { unit1 } from '../content/unit1';
import { bossQuestionPool, masteredQuestionIds, selectBossQuestions } from '../game/bossBattle';
import { markLessonCompleted } from '../game/progress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { answerCorrectly, answerIncorrectly } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';

const T0 = new Date(2026, 2, 10, 9, 0, 0).getTime();
const BOSS_PATH = `/units/${unit1.id}/boss`;

/** A learner who has played every lesson in Unit 1, so the boss battle is open. */
function finishedLessons() {
  const store = createProgressStore(createMemoryStore());
  store.update((state) =>
    unit1.lessons.reduce(
      (next, lesson) => markLessonCompleted(next, lesson.id, new Date(T0 - 86_400_000)),
      state,
    ),
  );
  return store;
}

/** The questions a round started at T0 asks, in order. */
function roundQuestions(store: ReturnType<typeof finishedLessons>) {
  const pool = bossQuestionPool(unit1, masteredQuestionIds(unit1, store.getSnapshot()));
  return selectBossQuestions(pool, T0);
}

describe('boss battle page', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays locked until the lessons are done or the checkpoint is passed', async () => {
    renderApp({ path: BOSS_PATH });
    expect(
      await screen.findByRole('heading', { name: 'The boss battle is still locked' }),
    ).toBeVisible();
  });

  it('plays a full round with the keyboard, then shows the score and XP', async () => {
    const user = userEvent.setup();
    const store = finishedLessons();
    const { events } = renderApp({ path: BOSS_PATH, store });
    const questions = roundQuestions(store);
    expect(questions).toHaveLength(12);

    expect(await screen.findByText(/12 questions\. Each one is asked once/)).toBeVisible();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('timer')).toHaveTextContent('1:00');

    for (const question of questions) {
      await screen.findByRole('heading', { name: fillQuestionText(question, question.prompt) });
      await answerCorrectly(user, question);
      await user.keyboard('{Enter}');
    }

    expect(await screen.findByRole('heading', { name: 'You answered them all!' })).toHaveFocus();
    expect(screen.getByText('12 × 3 XP + 5 XP accuracy bonus')).toBeVisible();
    expect(store.getSnapshot().activity.totalXp).toBe(41);
    expect(store.getSnapshot().bossBattles[unit1.id]).toMatchObject({ plays: 1, bestCorrect: 12 });
    const finished = events.getSnapshot().find((event) => event.type === 'boss_finished');
    expect(finished).toMatchObject({ correct: 12, answered: 12, endReason: 'all_answered' });
    const answered = events.getSnapshot().filter((event) => event.type === 'question_answered');
    expect(answered.every((event) => event.source === 'boss' && !event.firstAttempt)).toBe(true);
  });

  it('does not bring wrong answers back, and ends when the time runs out', async () => {
    const user = userEvent.setup();
    const store = finishedLessons();
    renderApp({ path: BOSS_PATH, store });
    const [first, second, third] = roundQuestions(store);

    await user.click(await screen.findByRole('button', { name: 'Start the clock' }));
    await answerIncorrectly(user, first);
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: fillQuestionText(second, second.prompt) });
    expect(screen.getByText('Question 2 of 12')).toBeVisible();
    await answerCorrectly(user, second);
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: fillQuestionText(third, third.prompt) });

    act(() => vi.setSystemTime(T0 + 45_000));
    await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent('0:15'));

    act(() => vi.setSystemTime(T0 + 61_000));
    expect(await screen.findByRole('heading', { name: 'Time’s up!' })).toBeVisible();
    const answered = screen.getByText('Answered').closest('div') as HTMLElement;
    expect(within(answered).getByText('2 of 12')).toBeVisible();
    expect(screen.getByText('10 questions were left when time ran out.')).toBeVisible();
    // The missed question is reviewed with its explanation.
    expect(screen.getByText(fillQuestionText(first, first.explanation))).toBeVisible();
    expect(store.getSnapshot().activity.totalXp).toBe(3);
  });

  it('pays the XP bonus once a day, and a replay is practice', async () => {
    const user = userEvent.setup();
    const store = finishedLessons();
    renderApp({ path: BOSS_PATH, store });
    await user.click(await screen.findByRole('button', { name: 'Start the clock' }));
    act(() => vi.setSystemTime(T0 + 61_000));
    await screen.findByRole('heading', { name: 'Time’s up!' });
    expect(screen.getByText('Get a question right next time to earn XP.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Play again' }));
    await user.click(await screen.findByRole('button', { name: 'Start the clock' }));
    act(() => vi.setSystemTime(T0 + 200_000));
    await screen.findByRole('heading', { name: 'Time’s up!' });
    expect(screen.getByText(/already earned today’s boss bonus/)).toBeVisible();
    expect(store.getSnapshot().bossBattles[unit1.id].plays).toBe(2);
  });

  it('offers more time, and keeps a plain countdown when motion is reduced', async () => {
    const user = userEvent.setup();
    const matchMedia = vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    try {
      const { container } = renderApp({ path: BOSS_PATH, store: finishedLessons() });
      await user.click(await screen.findByRole('checkbox', { name: /give me more time/i }));
      await user.click(screen.getByRole('button', { name: 'Start the clock' }));
      expect(screen.getByRole('timer')).toHaveTextContent('2:00');
      expect(screen.getByRole('timer')).toHaveAccessibleName('Time left: 120 seconds');
      expect(container.querySelector('[class*="transition-[width]"]')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
