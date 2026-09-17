import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lateDeliveryMystery } from '../content/mission1';
import { unit1 } from '../content/unit1';
import { markTaskPassed, selectTask } from '../game/missionProgress';
import { summarizePlaytest } from '../game/playtest';
import { answerCorrectly, answerIncorrectly, checkAndContinue } from '../test/answerQuestion';
import { renderApp } from '../test/renderApp';
import { NO_OUTPUT, pythonReady, renderWorkspace, runActiveTask } from '../test/renderWorkspace';

const [lesson] = unit1.lessons;

/** Plays lesson 1, getting the first question wrong the first time. */
async function playFirstLesson(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Start' }));
  await answerIncorrectly(user, lesson.questions[0]);
  await checkAndContinue(user);
  for (const question of [...lesson.questions.slice(1), lesson.questions[0]]) {
    await answerCorrectly(user, question);
    await checkAndContinue(user);
  }
  await screen.findByRole('heading', { name: 'Lesson complete' });
}

describe('playtest page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('summarises a play through, and exports it without anything personal', async () => {
    const user = userEvent.setup();
    const { events } = renderApp({ path: `/lesson/${lesson.id}` });
    await playFirstLesson(user);
    await user.click(screen.getByRole('button', { name: 'Back to path' }));

    // Both navs are in the DOM; CSS shows one per width, so pick the phone one.
    const bottomNav = within(screen.getByTestId('bottom-nav'));
    await user.click(bottomNav.getByRole('link', { name: 'Profile' }));
    await user.click(await screen.findByRole('link', { name: 'Open playtest data' }));
    expect(await screen.findByRole('heading', { name: 'Playtest data' })).toBeInTheDocument();

    const lessons = screen.getByRole('heading', { name: 'Lessons' }).closest('section');
    expect(lessons).toHaveTextContent('Completed1 of 7');
    expect(lessons).toHaveTextContent('Left part way0');
    // One lesson with a wrong answer pays 13 XP, short of the 20 XP daily goal.
    expect(lessons).toHaveTextContent('Daily goal met0 day(s)');

    const accuracy = screen
      .getByRole('heading', { name: 'First-try accuracy by question type' })
      .closest('section');
    expect(accuracy).toHaveTextContent(/Multiple choice/);
    expect(
      screen.getByRole('heading', { name: 'Where you stopped' }).closest('section'),
    ).toHaveTextContent(`Finished lesson “${lesson.title}”`);

    // The export is a download of the same JSON the page shows, with no ids beyond content ones.
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return 'blob:playtest';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Export data' }));
    expect(await screen.findByText('Export saved to your downloads.')).toBeInTheDocument();

    const payload = JSON.parse(await blobs[0].text());
    expect(payload.events).toHaveLength(events.getSnapshot().length);
    expect(payload.summary.lessonsCompleted).toBe(1);

    // Nothing in an event is free text, apart from a survey note or a Python error message.
    const values = (payload.events as Array<Record<string, unknown>>).flatMap((event) =>
      Object.entries(event)
        .filter(([key]) => key !== 'note' && key !== 'message')
        .map(([key, value]) => `${key}=${String(value)}`),
    );
    expect(values.filter((entry) => /\s/.test(entry))).toEqual([]);
    expect(values.some((entry) => entry.startsWith('type=lesson_completed'))).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Copy summary' }));
    await expect(navigator.clipboard.readText()).resolves.toContain(
      'Data Detective playtest summary',
    );
  }, 30_000);

  it('clears the data when the learner asks, after confirming', async () => {
    const user = userEvent.setup();
    const { events } = renderApp({ path: '/playtest' });
    act(() => events.record({ type: 'lesson_started', lessonId: 'the-mean' }));
    expect(await screen.findByText(/from 1 saved events/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear playtest data' }));
    await user.click(screen.getByRole('button', { name: 'Clear it' }));
    expect(events.getSnapshot()).toEqual([]);
    expect(screen.getByText(/from 0 saved events/)).toBeInTheDocument();
  });

  it('records what happens in the mission, and asks how ready the learner feels', async () => {
    const user = userEvent.setup();
    const { workers, store, events } = renderWorkspace();
    const worker = await pythonReady(workers);

    const survey = screen.getByRole('region', {
      name: 'Before you start: how ready do you feel for this?',
    });
    await user.click(within(survey).getByRole('button', { name: '2' }));
    expect(screen.getByText(/thanks/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Show a hint' })[0]);
    await runActiveTask(user, worker);
    act(() => worker.finishLastRun(NO_OUTPUT, { passed: true, message: 'Case file open.' }));
    await screen.findByRole('group', { name: 'Task check' });

    act(() =>
      store.update((state) =>
        selectTask(
          [
            'load-data',
            'missing-values',
            'city-averages',
            'flag-outliers',
            'without-outliers',
          ].reduce(
            (next, taskId) => markTaskPassed(next, lateDeliveryMystery.id, taskId, new Date()),
            state,
          ),
          lateDeliveryMystery.id,
          'recommendation',
        ),
      ),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Your message to the operations manager' }),
      'Kolkata is slowest at dinner. Hyderabad looks slow only because of logging errors, so fix that first.',
    );
    await user.click(screen.getByRole('button', { name: 'Send recommendation' }));
    await screen.findByRole('heading', { name: 'Mission complete' });

    const summary = summarizePlaytest(events.getSnapshot());
    expect(summary.mission).toMatchObject({
      opened: true,
      pyodideLoadMs: 10,
      completed: true,
    });
    expect(summary.mission.tasks).toEqual([
      { taskId: 'load-data', runs: 1, passed: true, hints: 1, deepestHint: 1 },
    ]);
    expect(summary.surveys).toEqual([{ surveyId: 'mission_ready', answer: '2' }]);
    expect(summary.stoppedAt).toBe('Finished the mission');

    // The three questions after finishing.
    await user.click(
      within(
        screen.getByRole('region', { name: 'Did the lessons prepare you for the mission?' }),
      ).getByRole('button', { name: '4' }),
    );
    await user.click(
      within(screen.getByRole('region', { name: 'Which part felt more useful?' })).getByRole(
        'button',
        { name: 'Both equally' },
      ),
    );
    await user.type(screen.getByRole('textbox', { name: 'What would you change?' }), 'More hints');
    await user.click(screen.getByRole('button', { name: 'Save note' }));

    const after = summarizePlaytest(events.getSnapshot());
    expect(after.surveys.map((row) => row.answer)).toEqual(['2', '4', 'both']);
    expect(after.notes).toEqual(['More hints']);
  }, 30_000);
});
