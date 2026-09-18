import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { unit1 } from '../content/unit1';
import { markLessonCompleted } from '../game/progress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { renderApp } from '../test/renderApp';

describe('profile page', () => {
  it('resets progress from the developer tools after confirming', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(createMemoryStore());
    store.update((state) => markLessonCompleted(state, unit1.lessons[0].id, new Date()));
    renderApp({ path: '/profile', store });

    const unitOne = () => within(screen.getByRole('region', { name: 'Unit 1: Data Detective' }));
    expect(unitOne().getByText('1 of 7 completed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset progress' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Reset all progress?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reset progress' }));

    expect(unitOne().getByText('0 of 7 completed')).toBeInTheDocument();
    expect(store.getSnapshot().lessons).toEqual({});
  });

  it('breaks progress down by unit', () => {
    const store = createProgressStore(createMemoryStore());
    store.update((state) => ({
      ...markLessonCompleted(state, unit1.lessons[0].id, new Date()),
      bossBattles: {
        [unit1.id]: { plays: 2, bestCorrect: 9, lastPlayedAt: null, lastXpDay: null },
      },
    }));
    renderApp({ path: '/profile', store });

    const unitOne = within(screen.getByRole('region', { name: 'Unit 1: Data Detective' }));
    expect(unitOne.getByText('Best: 9 right in 2 rounds')).toBeInTheDocument();
    expect(unitOne.getByText('Locked')).toBeInTheDocument();
    const unitTwo = within(
      screen.getByRole('region', { name: /unit 2: the churn culprit \(locked\)/i }),
    );
    expect(unitTwo.getByText('0 of 7 completed')).toBeInTheDocument();
    expect(unitTwo.getByText('Mission: The False Alarm')).toBeInTheDocument();
  });
});
