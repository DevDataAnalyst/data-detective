import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unit1 } from '../content/unit1';
import { createActivity, toDateKey, addDays } from '../game/streak';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { answerCorrectly, answerIncorrectly } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';
import { Mascot } from './Mascot';

const pose = (name: string) => document.querySelector(`[data-mascot="${name}"]`);

describe('Professor Ponku', () => {
  it('is decorative, lazy by default and keeps its space while loading', () => {
    render(<Mascot pose="thinking" className="h-20 w-auto" />);
    const image = document.querySelector('img') as HTMLImageElement;
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('width', '258');
    expect(image).toHaveAttribute('height', '300');
    expect(image).toHaveClass('mascot', 'h-20');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('waves on the welcome screen and in the unit header', () => {
    renderApp({ onboarded: false });
    expect(pose('waving')).toBeInTheDocument();
  });

  it('thinks on the lesson intro, and gives a thumbs up or thinks again after an answer', async () => {
    const user = userEvent.setup();
    const [lesson] = unit1.lessons;
    renderApp({ path: `/lesson/${lesson.id}` });
    expect(pose('thinking')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await answerIncorrectly(user, lesson.questions[0]);
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(pose('thinking')).toBeInTheDocument();
    await user.keyboard('{Enter}');

    await answerCorrectly(user, lesson.questions[1]);
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(pose('thumbs-up')).toBeInTheDocument();
  });

  it('thinks on empty states', () => {
    renderApp({ path: '/no-such-page' });
    expect(pose('thinking')).toBeInTheDocument();
  });
});

describe('streak nudge', () => {
  const now = new Date(2026, 2, 10, 18, 0);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function storeWithStreak(xpToday: number) {
    const store = createProgressStore(createMemoryStore());
    const today = toDateKey(now);
    store.update((state) => ({
      ...state,
      activity: {
        ...createActivity(),
        totalXp: 60 + xpToday,
        xpByDay: { [today]: xpToday },
        currentStreak: 2,
        longestStreak: 2,
        lastStreakDay: addDays(today, -1),
        goalMetDays: [addDays(today, -2), addDays(today, -1)],
      },
    }));
    return store;
  }

  it('shows a sleeping Ponku when a streak needs XP today', () => {
    renderApp({ store: storeWithStreak(5) });
    expect(screen.getByTestId('streak-nudge')).toHaveTextContent(
      'Your 2-day streak is snoozing. Earn 15 more XP today to keep it going.',
    );
    expect(pose('sleeping')).toBeInTheDocument();
  });

  it('stays quiet once the goal is met, or when there is no streak yet', () => {
    const met = renderApp({ store: storeWithStreak(25) });
    expect(screen.queryByTestId('streak-nudge')).not.toBeInTheDocument();
    met.unmount();

    renderApp();
    expect(screen.queryByTestId('streak-nudge')).not.toBeInTheDocument();
  });
});
