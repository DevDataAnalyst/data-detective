import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lateDeliveryMystery } from '../content/mission1';
import { unit1 } from '../content/unit1';
import { PREVIEW_QUESTIONS } from '../dev/previewQuestions';
import { markTaskPassed, selectTask } from '../game/missionProgress';
import { markLessonCompleted } from '../game/progress';
import { finishCheckpoint } from '../game/rewards';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import { answerCorrectly, answerIncorrectly } from './answerQuestion';
import { renderApp } from './renderApp';
import { NO_OUTPUT, pythonReady, renderWorkspace, runActiveTask } from './renderWorkspace';

/**
 * Runs axe on the whole document. jsdom applies no Tailwind CSS, so the audit adds the one rule
 * that matters for what is exposed: `hidden` hides desktop-only parts, as on a phone. jsdom has
 * no layout either, so colour contrast is checked by hand (see CLAUDE.md) rather than here.
 */
async function expectAccessible(label: string) {
  if (!document.getElementById('phone-layout')) {
    const style = document.createElement('style');
    style.id = 'phone-layout';
    style.textContent = '.hidden { display: none; }';
    document.head.append(style);
  }
  const results = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false } },
  });
  const problems = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n    ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join('\n    ')}`,
  );
  expect(problems, label).toEqual([]);
}

const REQUIRED_CODE_TASKS = lateDeliveryMystery.tasks
  .filter((task) => task.kind === 'code' && !task.stretch)
  .map((task) => task.id);

describe('accessibility audit (axe)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('onboarding', async () => {
    const user = userEvent.setup();
    renderApp({ onboarded: false });
    await screen.findByRole('heading', { name: 'Welcome to Data Detective' });
    await expectAccessible('welcome');
    await user.click(screen.getByRole('button', { name: 'Get started' }));
    await user.click(screen.getByRole('radio', { name: /just curious/i }));
    await expectAccessible('learner goal');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await expectAccessible('daily goal');
  });

  it('path, popovers, profile and notices', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const view = renderApp({
      store: createProgressStore(createMemoryStore(), { persistent: false }),
    });
    await expectAccessible('path with notices');
    await user.click(screen.getByRole('button', { name: /lesson 1: what's in a dataset/i }));
    await expectAccessible('lesson popover');
    await user.click(screen.getByRole('button', { name: /mission: the late delivery mystery/i }));
    await expectAccessible('mission popover');
    view.unmount();

    renderApp({ path: '/profile' });
    await expectAccessible('profile');
  });

  it('lesson intro, question, feedback and summary', async () => {
    const user = userEvent.setup();
    const [lesson] = unit1.lessons;
    renderApp({ path: `/lesson/${lesson.id}` });
    await expectAccessible('lesson intro');
    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await expectAccessible('question');

    await answerIncorrectly(user, lesson.questions[0]);
    await user.keyboard('{Enter}');
    await screen.findByRole('button', { name: /continue/i });
    await expectAccessible('feedback');
    await user.keyboard('{Enter}');

    for (const question of [...lesson.questions.slice(1), lesson.questions[0]]) {
      await answerCorrectly(user, question);
      await user.keyboard('{Enter}');
      await user.keyboard('{Enter}');
    }
    await screen.findByRole('heading', { name: 'Lesson complete' });
    await expectAccessible('lesson summary');
  });

  it('checkpoint questions of every type, results and waiting', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 10, 9, 0));
    try {
      const user = userEvent.setup();
      const keyValue = createMemoryStore();
      const view = renderApp({ path: '/checkpoint', keyValue });
      await expectAccessible('checkpoint intro');
      await user.click(await screen.findByRole('button', { name: 'Start checkpoint' }));
      for (const [index, item] of unit1.checkpoint.items.entries()) {
        await expectAccessible(`checkpoint question ${index + 1} (${item.question.type})`);
        await answerIncorrectly(user, item.question);
        await user.keyboard('{Enter}');
      }
      await screen.findByRole('heading', { name: 'Not quite this time' });
      await expectAccessible('checkpoint results with review of every question type');
      view.unmount();

      renderApp({ path: '/checkpoint', keyValue });
      await screen.findByRole('heading', { name: 'Review first, then try again' });
      await expectAccessible('checkpoint waiting');
    } finally {
      vi.useRealTimers();
    }
  }, 30_000);

  it('checkpoint passed', async () => {
    const store = createProgressStore(createMemoryStore());
    const allRight = Object.fromEntries(
      unit1.checkpoint.items.map((item) => [item.question.id, true]),
    );
    store.update(
      (state) =>
        finishCheckpoint(state, { unit: unit1, correctByQuestion: allRight, now: new Date() })
          .state,
    );
    renderApp({ path: '/checkpoint', store });
    await screen.findByRole('heading', { name: 'You already tested out' });
    await expectAccessible('checkpoint already passed');
  });

  it('mission workspace: loading, feedback, hints, locked and written tasks, and summary', async () => {
    const user = userEvent.setup();
    const { workers, store } = renderWorkspace();
    await expectAccessible('mission loading');
    const worker = await pythonReady(workers);

    await runActiveTask(user, worker);
    act(() => worker.finishLastRun(NO_OUTPUT, { passed: false, message: 'Create `df`.' }));
    await screen.findByRole('group', { name: 'Task check' });
    await user.click(screen.getAllByRole('button', { name: 'Show a hint' })[0]);
    await expectAccessible('mission feedback and hint');

    await user.click(screen.getByRole('button', { name: /compare the cities, locked/i }));
    await expectAccessible('locked task');

    act(() =>
      store.update((state) =>
        selectTask(
          REQUIRED_CODE_TASKS.reduce(
            (next, taskId) => markTaskPassed(next, lateDeliveryMystery.id, taskId, new Date()),
            state,
          ),
          lateDeliveryMystery.id,
          'recommendation',
        ),
      ),
    );
    const textbox = screen.getByRole('textbox', { name: 'Your message to the operations manager' });
    await user.type(
      textbox,
      'Kolkata is slowest at dinner. Hyderabad only looks slow because of logging errors, so fix the logging first.',
    );
    await expectAccessible('written task');
    await user.click(screen.getByRole('button', { name: 'Send recommendation' }));
    await screen.findByRole('heading', { name: 'Mission complete' });
    await expectAccessible('mission summary');
  }, 30_000);

  it('playtest data, with events to show', async () => {
    const { events } = renderApp({ path: '/playtest' });
    act(() => {
      events.record({ type: 'lesson_started', lessonId: 'the-mean' });
      events.record({
        type: 'lesson_completed',
        lessonId: 'the-mean',
        firstAttemptAccuracy: 1,
        ms: 120_000,
      });
      events.record({
        type: 'task_run',
        taskId: 'load-data',
        passed: true,
        hadError: false,
        ms: 200,
      });
      events.record({ type: 'survey_answered', surveyId: 'mission_ready', answer: '4' });
    });
    await screen.findByRole('heading', { name: 'Playtest data' });
    await expectAccessible('playtest data');
  });

  it('dark mode, from the top bar toggle', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await expectAccessible('path in dark mode');
  });

  it('challenge questions of every type, with feedback and reveals', async () => {
    const user = userEvent.setup();
    for (const [type, button] of [
      ['inbox_triage', /inbox triage/i],
      ['spot_the_lie', /spot the lie/i],
      ['courtroom', /courtroom/i],
      ['build_metric', /build the metric/i],
      ['ab_verdict', /a\/b verdict/i],
    ] as const) {
      const view = renderApp({ path: '/dev/question-preview' });
      await user.click(await screen.findByRole('button', { name: button }));
      await user.keyboard('{Enter}');
      const question = PREVIEW_QUESTIONS.find((candidate) => candidate.type === type);
      if (!question) throw new Error(`No ${type} placeholder`);
      await expectAccessible(`${type} question`);
      await answerIncorrectly(user, question);
      await expectAccessible(`${type} answered`);
      await user.keyboard('{Enter}');
      await screen.findByRole('button', { name: /continue/i });
      await expectAccessible(`${type} feedback`);
      view.unmount();
    }
  });

  it('boss battle: intro, a question mid-round and the results', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 10, 9, 0));
    try {
      const user = userEvent.setup();
      const store = createProgressStore(createMemoryStore());
      store.update((state) =>
        unit1.lessons.reduce(
          (next, lesson) => markLessonCompleted(next, lesson.id, new Date(2026, 2, 9)),
          state,
        ),
      );
      renderApp({ path: `/units/${unit1.id}/boss`, store });
      await screen.findByRole('heading', { name: 'Beat the clock' });
      await expectAccessible('boss intro');
      await user.click(screen.getByRole('button', { name: 'Start the clock' }));
      await screen.findByRole('timer');
      await expectAccessible('boss question');
      act(() => vi.setSystemTime(new Date(2026, 2, 10, 9, 2)));
      await screen.findByRole('heading', { name: 'Time’s up!' });
      await expectAccessible('boss results');
    } finally {
      vi.useRealTimers();
    }
  });

  it('page not found', async () => {
    renderApp({ path: '/no-such-page' });
    await screen.findByRole('heading', { name: 'We couldn’t find that page' });
    await expectAccessible('not found');
  });
});
