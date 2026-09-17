import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { unit1 } from '../content/unit1';
import { markLessonCompleted } from '../game/progress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { renderApp } from '../test/renderApp';

describe('onboarding', () => {
  it('asks a first-time visitor two questions, then goes straight into lesson 1', async () => {
    const user = userEvent.setup();
    const { store, router } = renderApp({ onboarded: false });

    expect(
      await screen.findByRole('heading', { name: 'Welcome to Data Detective' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/welcome');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Get started' }));

    const goalQuestion = screen.getByRole('heading', { name: 'What brings you here?' });
    expect(goalQuestion).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    const goals = screen.getByRole('radiogroup', { name: 'What brings you here?' });
    expect(within(goals).getAllByRole('radio')).toHaveLength(4);
    await user.click(within(goals).getByRole('radio', { name: /data analyst/i }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: 'Pick a daily goal' })).toHaveFocus();
    const dailyGoals = screen.getByRole('radiogroup', { name: 'Pick a daily goal' });
    expect(
      within(dailyGoals)
        .getAllByRole('radio')
        .map((radio) => radio.closest('label')?.textContent),
    ).toEqual([
      'Casual · 10 XP a dayAbout 5 minutes a day',
      'Regular · 20 XP a dayAbout 10 minutes a day',
      'Serious · 40 XP a dayAbout 20 minutes a day',
    ]);

    // Going back keeps the earlier answer.
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByRole('radio', { name: /data analyst/i })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('radio', { name: /serious/i }));
    await user.click(screen.getByRole('button', { name: 'Start lesson 1' }));

    expect(
      await screen.findByRole('heading', { name: unit1.lessons[0].title }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/lesson/${unit1.lessons[0].id}`);
    expect(store.getSnapshot()).toMatchObject({
      profile: { goal: 'data_analyst' },
      dailyGoal: 40,
    });
    expect(store.getSnapshot().profile.onboardedAt).not.toBeNull();
  });

  it('skips onboarding for learners who already have progress', () => {
    const store = createProgressStore(createMemoryStore());
    store.update((state) => markLessonCompleted(state, unit1.lessons[0].id, new Date()));
    renderApp({ store, onboarded: false });
    expect(screen.getByText('1 of 7 lessons')).toBeInTheDocument();
  });

  it('lets learners change their daily goal on the profile page', async () => {
    const user = userEvent.setup();
    const { store } = renderApp({ path: '/profile' });
    const goals = screen.getByRole('radiogroup', { name: 'Daily goal' });
    expect(within(goals).getByRole('radio', { name: 'Regular · 20 XP' })).toBeChecked();

    await user.click(within(goals).getByRole('radio', { name: 'Casual · 10 XP' }));
    expect(store.getSnapshot().dailyGoal).toBe(10);
    expect(within(goals).getByRole('radio', { name: 'Casual · 10 XP' })).toBeChecked();
    expect(screen.getByText(/Daily goal: 10 XP/)).toBeInTheDocument();
  });
});
