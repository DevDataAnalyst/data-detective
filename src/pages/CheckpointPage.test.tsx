import { screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unit1 } from '../content/unit1';
import { checkpointProgress } from '../game/progress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { answerCorrectly, answerIncorrectly } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';

const { checkpoint } = unit1;
const START = new Date(2026, 2, 10, 9, 0);
const minutesAfter = (minutes: number) => new Date(START.getTime() + minutes * 60_000);

/** Answers every checkpoint question, missing the given indices, pressing Enter after each. */
async function playCheckpoint(user: UserEvent, missedIndices: number[] = []) {
  await user.click(await screen.findByRole('button', { name: 'Start checkpoint' }));
  for (const [index, item] of checkpoint.items.entries()) {
    expect(screen.getByText(`Question ${index + 1} of 10`)).toBeInTheDocument();
    if (missedIndices.includes(index)) await answerIncorrectly(user, item.question);
    else await answerCorrectly(user, item.question);
    await user.keyboard('{Enter}');
  }
}

describe('test-out checkpoint', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets an experienced learner test out, marking every lesson done and opening the mission', async () => {
    const user = userEvent.setup();
    const { store } = renderApp();

    await user.click(screen.getByRole('link', { name: 'Test out' }));
    expect(
      await screen.findByRole('heading', { name: 'Data Detective checkpoint' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/get 8 of 10 right to mark all 7 lessons as done/i),
    ).toBeInTheDocument();

    await playCheckpoint(user, [4, 9]);

    expect(await screen.findByRole('heading', { name: 'You tested out' })).toHaveFocus();
    expect(screen.getByText('8 of 10 right. You needed 8.')).toBeInTheDocument();
    expect(screen.getByText('40 XP earned')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the mission' })).toHaveAttribute(
      'href',
      '/mission',
    );
    const review = screen.getByRole('region', { name: 'Your answers' });
    expect(within(review).getAllByText('Missed')).toHaveLength(2);
    expect(within(review).getAllByText('Right')).toHaveLength(8);

    const state = store.getSnapshot();
    expect(state.activity.totalXp).toBe(40);
    expect(Object.values(state.lessons)).toHaveLength(7);
    expect(Object.values(state.lessons).every((lesson) => lesson.testedOut)).toBe(true);
    expect(checkpointProgress(state, checkpoint.id).passedAt).toBe(START.toISOString());

    await user.click(screen.getByRole('link', { name: 'Back to path' }));
    expect(
      screen.getByRole('button', { name: /lesson 3: .*, completed \(tested out\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mission.*unlocked/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Test out' })).not.toBeInTheDocument();
  });

  it('asks each question once, without explanations until the end', async () => {
    const user = userEvent.setup();
    renderApp({ path: '/checkpoint' });
    await user.click(await screen.findByRole('button', { name: 'Start checkpoint' }));

    const [first, second] = checkpoint.items;
    await answerIncorrectly(user, first.question);
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Question 2 of 10')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.queryByText(first.question.explanation)).not.toBeInTheDocument();
    expect(second.question.id).not.toBe(first.question.id);
  });

  it('shows missed topics linked to their lessons, then waits an hour before a retake', async () => {
    const user = userEvent.setup();
    const keyValue = createMemoryStore();
    const first = renderApp({ path: '/checkpoint', keyValue });

    // Misses both questions on lesson 1 and the one on lesson 4.
    await playCheckpoint(user, [0, 1, 5]);

    expect(await screen.findByRole('heading', { name: 'Not quite this time' })).toBeInTheDocument();
    expect(screen.getByText('7 of 10 right. You need 8 to test out.')).toBeInTheDocument();
    const lesson1 = unit1.lessons[0];
    expect(screen.getByText(`Start with “${lesson1.title}”, then try again.`)).toBeInTheDocument();
    expect(screen.getByText('You can take the checkpoint again in 1 hour.')).toBeInTheDocument();

    const topics = screen.getByRole('region', { name: 'Topics to review' });
    expect(within(topics).getByText('2 questions missed')).toBeInTheDocument();
    expect(
      within(topics).getByRole('link', { name: `Start lesson 1: ${lesson1.title}` }),
    ).toHaveAttribute('href', `/lesson/${lesson1.id}`);
    expect(within(topics).getByText(`Opens after “${unit1.lessons[2].title}”`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start lesson 1' })).toBeInTheDocument();

    const saved = createProgressStore(keyValue).getSnapshot();
    expect(saved.lessons).toEqual({});
    expect(saved.activity.totalXp).toBe(0);
    first.unmount();

    // 20 minutes later: still waiting, on both the path and the checkpoint page.
    vi.setSystemTime(minutesAfter(20));
    const path = renderApp({ keyValue });
    expect(
      screen.getByText('You can take the checkpoint again in 40 minutes.'),
    ).toBeInTheDocument();
    path.unmount();

    const waiting = renderApp({ path: '/checkpoint', keyValue });
    expect(
      await screen.findByRole('heading', { name: 'Review first, then try again' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Last time you got 7 of 10 right. You need 8 to test out.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start checkpoint' })).not.toBeInTheDocument();
    waiting.unmount();

    // An hour after the attempt, it can be taken again.
    vi.setSystemTime(minutesAfter(60));
    renderApp({ path: '/checkpoint', keyValue });
    expect(await screen.findByRole('button', { name: 'Start checkpoint' })).toBeInTheDocument();
  });

  it('does not count an attempt the learner leaves part way through', async () => {
    const user = userEvent.setup();
    const { store, router } = renderApp({ path: '/checkpoint' });
    await user.click(await screen.findByRole('button', { name: 'Start checkpoint' }));
    await answerCorrectly(user, checkpoint.items[0].question);
    await user.keyboard('{Enter}');

    await user.click(screen.getByRole('button', { name: 'Exit checkpoint' }));
    await user.click(screen.getByRole('button', { name: 'Leave' }));
    expect(router.state.location.pathname).toBe('/');
    expect(store.getSnapshot().checkpoints).toEqual({});
    expect(screen.getByRole('link', { name: 'Test out' })).toBeInTheDocument();
  });
});
