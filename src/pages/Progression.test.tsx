import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unit1 } from '../content/unit1';
import { createInitialProgress, markLessonCompleted } from '../game/progress';
import { awardXp } from '../game/rewards';
import { grantFreeze } from '../game/streak';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore, type ProgressStore } from '../storage/progressStore';
import { playQuestions } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';

const march = (day: number, hour = 10) => new Date(2026, 2, day, hour, 0);

function storeWith(update: (store: ProgressStore) => void): ProgressStore {
  const store = createProgressStore(createMemoryStore());
  update(store);
  return store;
}

async function playLesson(lessonIndex: number) {
  const user = userEvent.setup();
  const lesson = unit1.lessons[lessonIndex];
  await user.click(await screen.findByRole('button', { name: 'Start' }));
  await playQuestions(user, lesson.questions);
  return user;
}

describe('XP, daily goal and streaks in the app', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(march(10));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('awards lesson XP and shows it on the summary, top bar and daily goal', async () => {
    const { store } = renderApp({ path: `/lesson/${unit1.lessons[0].id}` });
    const user = await playLesson(0);

    expect(await screen.findByText('15 XP')).toBeInTheDocument();
    expect(screen.getByText('10 XP for finishing + 5 XP accuracy bonus')).toBeInTheDocument();
    expect(store.getSnapshot().activity.totalXp).toBe(15);

    await user.click(screen.getByRole('button', { name: 'Back to path' }));
    expect(screen.getByTestId('xp-counter')).toHaveTextContent('15 XP in total');
    expect(screen.getByTestId('daily-goal-text')).toHaveTextContent(
      '15 of 20 XP today. 5 XP to go.',
    );
    expect(screen.getByTestId('streak-counter')).toHaveTextContent(
      '0 day streak, today’s goal not met yet',
    );
  });

  it('celebrates the first time the daily goal is met, and starts the streak', async () => {
    const store = storeWith((s) => s.update((state) => awardXp(state, 10, march(10, 8)).state));
    renderApp({ path: `/lesson/${unit1.lessons[0].id}`, store });
    await playLesson(0);

    const toast = await screen.findByRole('status');
    expect(within(toast).getByText('Daily goal reached!')).toBeInTheDocument();
    expect(within(toast).getByText('25 XP today. Your streak starts today.')).toBeInTheDocument();
    expect(store.getSnapshot().activity.currentStreak).toBe(1);
  });

  it('gives practice XP for a completed lesson', async () => {
    const store = storeWith((s) =>
      s.update((state) => markLessonCompleted(state, unit1.lessons[0].id, march(9))),
    );
    renderApp({ path: `/lesson/${unit1.lessons[0].id}`, store });
    await playLesson(0);
    expect(await screen.findByText('5 XP for practising')).toBeInTheDocument();
    expect(store.getSnapshot().activity.totalXp).toBe(5);
  });

  it('uses a streak freeze when the learner comes back after missing one day', () => {
    vi.setSystemTime(march(10));
    let state = awardXp(createInitialProgress(), 20, march(9)).state;
    state = awardXp(state, 20, march(10)).state;
    state = { ...state, activity: grantFreeze(state.activity).activity };
    const store = storeWith((s) => s.update(() => state));

    // Missed 11 March, back on 12 March.
    vi.setSystemTime(march(12));
    renderApp({ store });

    expect(screen.getByTestId('streak-counter')).toHaveTextContent(
      '2 day streak, today’s goal not met yet',
    );
    expect(store.getSnapshot().activity.freezesHeld).toBe(0);
    expect(store.getSnapshot().activity.freezeUsedDays).toEqual(['2026-03-11']);
  });

  it('resets the streak when a day is missed without a freeze', () => {
    const store = storeWith((s) =>
      s.update((state) => awardXp(awardXp(state, 20, march(9)).state, 20, march(10)).state),
    );
    vi.setSystemTime(march(12));
    renderApp({ store });
    expect(screen.getByTestId('streak-counter')).toHaveTextContent(
      '0 day streak, today’s goal not met yet',
    );
    expect(store.getSnapshot().activity.currentStreak).toBe(0);
    expect(store.getSnapshot().activity.longestStreak).toBe(2);
  });

  it('shows totals, streaks, freezes and a 14-day chart on the profile', () => {
    const store = storeWith((s) =>
      s.update((state) => {
        let next = awardXp(state, 25, march(9)).state;
        next = awardXp(next, 12, march(10)).state;
        return { ...next, activity: grantFreeze(next.activity).activity };
      }),
    );
    renderApp({ path: '/profile', store });

    expect(screen.getByText('Total XP').parentElement).toHaveTextContent('37');
    expect(screen.getByText('Current streak').parentElement).toHaveTextContent('1 day');
    expect(screen.getByText('Longest streak').parentElement).toHaveTextContent('1 day');
    expect(
      screen.getByRole('img', { name: /xp per day for the last 14 days/i }),
    ).toHaveAccessibleName('XP per day for the last 14 days. Goal of 20 XP met on 1 of them.');
    expect(screen.getByText('1 held')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'XP per day' });
    expect(within(table).getAllByRole('row')).toHaveLength(15);
  });
});
