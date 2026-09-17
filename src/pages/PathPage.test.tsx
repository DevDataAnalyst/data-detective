import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { unit1 } from '../content/unit1';
import { markTaskPassed, recordTaskRun, updateMission } from '../game/missionProgress';
import { markLessonCompleted } from '../game/progress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { playQuestions } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';

const [lesson1, lesson2] = unit1.lessons;

function lessonNode(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('path page', () => {
  it('starts with lesson 1 available and everything else locked', () => {
    renderApp();
    expect(lessonNode(/lesson 1: what's in a dataset\?, ready to start/i)).toBeInTheDocument();
    expect(lessonNode(/lesson 2: the mean, locked/i)).toBeInTheDocument();
    expect(lessonNode(/mission.*locked/i)).toBeInTheDocument();
    expect(screen.getByText('0 of 7 lessons')).toBeInTheDocument();
  });

  it('explains which lesson unlocks a locked lesson', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(lessonNode(/lesson 2: the mean/i));
    const popover = screen.getByRole('dialog', { name: 'The mean' });
    expect(
      within(popover).getByText(/complete “what's in a dataset\?” to unlock/i),
    ).toBeInTheDocument();
    expect(within(popover).queryByRole('link')).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(lessonNode(/lesson 2: the mean/i)).toHaveFocus();
  });

  it('shows how to unlock the mission, and that it is worth far more XP', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByText('The Late Delivery Mystery')).toBeInTheDocument();
    expect(screen.getByText('+100 XP')).toBeInTheDocument();
    await user.click(lessonNode(/mission/i));
    expect(screen.getByRole('dialog')).toHaveTextContent(/pass the test-out checkpoint/i);
  });

  it('unlocks lesson 2 after playing lesson 1, and remembers it after a refresh', async () => {
    const user = userEvent.setup();
    const keyValue = createMemoryStore();
    const first = renderApp({ keyValue });

    await user.click(lessonNode(/lesson 1: what's in a dataset\?/i));
    await user.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Start' }));
    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await playQuestions(user, lesson1.questions);
    expect(await screen.findByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to path' }));

    expect(lessonNode(/lesson 1: what's in a dataset\?, completed/i)).toBeInTheDocument();
    expect(lessonNode(/lesson 2: the mean, ready to start/i)).toBeInTheDocument();
    first.unmount();

    // A refresh starts a new store that reads the same saved data.
    renderApp({ keyValue });
    expect(lessonNode(/lesson 2: the mean, ready to start/i)).toBeInTheDocument();
    await user.click(lessonNode(/lesson 1: what's in a dataset\?/i));
    expect(
      within(screen.getByRole('dialog')).getByRole('link', { name: 'Practise again' }),
    ).toBeInTheDocument();
  });

  it('opens the mission once every lesson is completed', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(createMemoryStore());
    for (const lesson of unit1.lessons) {
      store.update((state) => markLessonCompleted(state, lesson.id, new Date()));
    }
    renderApp({ store });
    await user.click(lessonNode(/mission.*unlocked/i));
    expect(
      within(screen.getByRole('dialog')).getByRole('link', { name: 'Open mission' }),
    ).toHaveAttribute('href', '/mission');
  });

  it('shows mission progress, then completion, on the mission node', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(createMemoryStore());
    const at = new Date('2026-03-10T10:00:00Z');
    store.update((state) => {
      let next = unit1.lessons.reduce(
        (current, lesson) => markLessonCompleted(current, lesson.id, at),
        state,
      );
      next = recordTaskRun(next, 'late-delivery-mystery', 'load-data', {
        code: 'df = 1',
        succeeded: true,
      });
      next = markTaskPassed(next, 'late-delivery-mystery', 'load-data', at);
      return markTaskPassed(next, 'late-delivery-mystery', 'missing-values', at);
    });
    const view = renderApp({ store });

    await user.click(lessonNode(/mission.*in progress, 2 of 5 code tasks passed/i));
    expect(screen.getByText('2 of 5 tasks passed')).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).getByRole('link', { name: 'Continue mission' }),
    ).toHaveAttribute('href', '/mission');
    view.unmount();

    store.update((state) =>
      updateMission(state, 'late-delivery-mystery', (mission) => ({
        ...mission,
        completedAt: at.toISOString(),
      })),
    );
    renderApp({ store });
    await user.click(lessonNode(/mission.*completed/i));
    const popover = within(screen.getByRole('dialog'));
    expect(popover.getByRole('link', { name: 'See summary' })).toHaveAttribute(
      'href',
      '/mission/summary',
    );
    expect(popover.getByRole('link', { name: 'Open mission' })).toHaveAttribute('href', '/mission');
  });

  it('sends learners to the mission when they open the summary before finishing it', async () => {
    renderApp({ path: '/mission/summary' });
    expect(
      await screen.findByRole('heading', { name: 'The mission is still locked' }),
    ).toBeInTheDocument();
  });

  it('keeps learners out of locked lessons opened by URL', () => {
    renderApp({ path: `/lesson/${lesson2.id}` });
    expect(screen.getByRole('heading', { name: '“The mean” is still locked' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to path' })).toBeInTheDocument();
  });
});
