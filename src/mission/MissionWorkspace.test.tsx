import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lateDeliveryMystery } from '../content/mission1';
import { missionSummaryPath } from '../content/paths';
import { unit1 } from '../content/unit1';
import { markTaskPassed, missionProgress, selectTask, taskProgress } from '../game/missionProgress';
import { createMemoryStore } from '../storage/keyValue';
import { createProgressStore } from '../storage/progressStore';
import {
  DATASET_SUMMARY,
  NO_OUTPUT,
  pythonReady,
  renderWorkspace,
  runActiveTask,
} from '../test/renderWorkspace';

const SUMMARY = DATASET_SUMMARY;
const OK = NO_OUTPUT;
const MISSION = lateDeliveryMystery.id;
const REQUIRED_CODE_TASKS = [
  'load-data',
  'missing-values',
  'city-averages',
  'flag-outliers',
  'without-outliers',
];

describe('MissionWorkspace', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers a retry when Python fails to load, and retries by itself after reconnecting', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const user = userEvent.setup();
    const { workers } = renderWorkspace();
    await waitFor(() => expect(workers).toHaveLength(1));
    act(() => workers[0].emit({ type: 'init-failed', message: 'Failed to fetch' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Python couldn’t load');
    expect(alert).toHaveTextContent('You’re offline. Python will try again when you reconnect.');

    onLine.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(workers).toHaveLength(2));
    expect(screen.getByText('Setting up Python in your browser')).toBeInTheDocument();

    act(() => workers[1].emit({ type: 'init-failed', message: 'Failed to fetch' }));
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(workers).toHaveLength(3);
  });

  it('shows loading progress, then lets the learner run code once Python is ready', async () => {
    const { workers } = renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Open the case file' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Python is loading…' })).toBeDisabled();
    expect(screen.getByText('Setting up Python in your browser')).toBeInTheDocument();

    await waitFor(() => expect(workers).toHaveLength(1));
    expect(workers[0].sent[0]).toMatchObject({
      type: 'init',
      files: [
        { fileName: 'deliveries.csv', url: expect.stringMatching(/\/data\/deliveries\.csv$/) },
      ],
    });

    workers[0].emit({ type: 'progress', stage: 'packages', message: 'Loading pandas' });
    expect(await screen.findByText('Step 2 of 3: Loading pandas…')).toBeInTheDocument();

    workers[0].emit({ type: 'ready', loadMs: 1200, summary: SUMMARY });
    expect(await screen.findByRole('button', { name: 'Run' })).toBeEnabled();
    expect(screen.queryByText('Setting up Python in your browser')).not.toBeInTheDocument();
  });

  it('downloads the dataset from the app root, whatever page the mission is on', async () => {
    // As in the browser: the page's own URL is the mission's, several folders deep.
    window.history.pushState({}, '', '/units/unit-1-data-detective/mission');
    try {
      const { workers } = renderWorkspace();
      await waitFor(() => expect(workers).toHaveLength(1));
      expect(workers[0].sent[0]).toMatchObject({
        files: [{ url: `${window.location.origin}/data/deliveries.csv` }],
      });
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('runs code and shows printed output, tables and task status', async () => {
    const user = userEvent.setup();
    const { workers, store } = renderWorkspace();
    const worker = await pythonReady(workers);

    await runActiveTask(user, worker);
    const task = lateDeliveryMystery.tasks[0];
    expect(worker.lastRun()).toMatchObject({
      code: task.kind === 'code' ? task.starterCode : '',
      taskId: 'load-data',
    });

    worker.finishLastRun({
      stdout: 'Orders: 600\n',
      rich: [
        {
          kind: 'table',
          columns: ['city', 'delivery_time_min'],
          indexName: null,
          index: ['0', '1'],
          rows: [
            ['Hyderabad', '32.0'],
            ['Chennai', 'NaN'],
          ],
          totalRows: 582,
          totalColumns: 2,
        },
      ],
      error: null,
    });

    const output = screen.getByRole('region', { name: 'Output' });
    expect(await within(output).findByText('Orders: 600')).toBeInTheDocument();
    expect(within(output).getByRole('cell', { name: 'Hyderabad' })).toBeInTheDocument();
    expect(
      within(output).getByText('Showing the first 2 of 582 rows, 2 columns.'),
    ).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Mission tasks' });
    expect(
      within(nav).getByRole('button', { name: /open the case file, attempted/i }),
    ).toBeInTheDocument();
    expect(taskProgress(store.getSnapshot(), MISSION, 'load-data')).toMatchObject({
      runs: 1,
      status: 'attempted',
    });
    // Python keeps the dataset facts for the summary screen.
    expect(missionProgress(store.getSnapshot(), MISSION).facts).toEqual(SUMMARY);
  });

  it('explains errors in plain words', async () => {
    const user = userEvent.setup();
    const { workers } = renderWorkspace();
    const worker = await pythonReady(workers);

    await runActiveTask(user, worker);
    worker.finishLastRun(
      {
        stdout: '',
        rich: [],
        error: {
          type: 'NameError',
          message: "name '____' is not defined",
          line: 4,
          trace: [{ line: 4, code: 'df = pd.read_csv(____)' }],
        },
      },
      { passed: false, message: 'Create a DataFrame called `df`.' },
    );

    expect(await screen.findByText('NameError on line 4')).toBeInTheDocument();
    expect(screen.getByText('Line 4: df = pd.read_csv(____)')).toBeInTheDocument();
    expect(
      screen.getByText('Replace each ____ blank with your own code before running.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Task check' })).toHaveTextContent(
      'Fix the error shown in the output below',
    );
  });

  it('keeps later tasks locked until the earlier ones pass', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const nav = screen.getByRole('navigation', { name: 'Mission tasks' });

    await user.click(within(nav).getByRole('button', { name: /find the gaps, locked/i }));
    expect(screen.getByRole('heading', { name: 'Find the gaps' })).toBeInTheDocument();
    expect(screen.getByText('Pass “Open the case file” to unlock this task.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: /brief the manager, locked/i }));
    expect(
      screen.getByText('Pass every code task to unlock your recommendation.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go to task 1: Open the case file' }));
    expect(screen.getByRole('heading', { name: 'Open the case file' })).toBeInTheDocument();
  });

  it('passes a task when the hidden check passes, awards XP once and opens the next task', async () => {
    const user = userEvent.setup();
    const { workers, store } = renderWorkspace();
    const worker = await pythonReady(workers);

    await runActiveTask(user, worker);
    worker.finishLastRun(OK, { passed: true, message: 'Case file open: `df` has 600 orders.' });

    const check = await screen.findByRole('group', { name: 'Task check' });
    expect(check).toHaveTextContent('Task passed');
    expect(check).toHaveTextContent('+20 XP');
    expect(check).toHaveTextContent('Case file open: df has 600 orders.');
    expect(store.getSnapshot().activity.totalXp).toBe(20);
    expect(screen.getByText('1 of 5 code tasks passed')).toBeInTheDocument();

    // Running a passed task again pays nothing more.
    await runActiveTask(user, worker);
    worker.finishLastRun(OK, { passed: true, message: 'Case file open: `df` has 600 orders.' });
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Task check' })).not.toHaveTextContent('XP'),
    );
    expect(store.getSnapshot().activity.totalXp).toBe(20);

    await user.click(screen.getByRole('button', { name: 'Next: Find the gaps' }));
    expect(screen.getByRole('heading', { name: 'Find the gaps' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
    const nav = screen.getByRole('navigation', { name: 'Mission tasks' });
    expect(
      within(nav).getByRole('button', { name: /open the case file, passed/i }),
    ).toBeInTheDocument();
  });

  it('gives a specific message when the check fails, and opens hints one level at a time', async () => {
    const user = userEvent.setup();
    const { workers, store } = renderWorkspace();
    const worker = await pythonReady(workers);

    await runActiveTask(user, worker);
    worker.finishLastRun(OK, {
      passed: false,
      message: '`n_orders` should be the number of rows in `df`.',
    });

    const check = await screen.findByRole('group', { name: 'Task check' });
    expect(check).toHaveTextContent('Not quite yet');
    expect(check).toHaveTextContent('n_orders should be the number of rows in df.');

    await user.click(within(check).getByRole('button', { name: 'Show a hint' }));
    const nudge = screen.getByText('Hint 1 of 3: a nudge').parentElement;
    expect(nudge).toHaveFocus();
    expect(nudge).toHaveTextContent('single function whose name starts with read_');
    expect(screen.queryByText('Hint 2 of 3: the method')).not.toBeInTheDocument();

    const hints = screen.getByRole('region', { name: 'Hints' });
    await user.click(within(hints).getByRole('button', { name: 'Show another hint' }));
    await user.click(within(hints).getByRole('button', { name: 'Show another hint' }));
    expect(screen.getByText('Hint 3 of 3: fill in the blank').parentElement).toHaveTextContent(
      'n_orders = ____(df)',
    );
    expect(within(hints).queryByRole('button')).not.toBeInTheDocument();
    expect(taskProgress(store.getSnapshot(), MISSION, 'load-data').hintsShown).toBe(3);
    expect(store.getSnapshot().activity.totalXp).toBe(0);
  });

  it('sends the recommendation with a self-review, completes the mission and shows the summary', async () => {
    const user = userEvent.setup();
    const store = createProgressStore(createMemoryStore());
    store.update((state) =>
      selectTask(
        REQUIRED_CODE_TASKS.reduce(
          (next, taskId) => markTaskPassed(next, MISSION, taskId, new Date()),
          state,
        ),
        MISSION,
        'recommendation',
      ),
    );
    const { workers, router } = renderWorkspace(store);
    await pythonReady(workers);

    const textbox = screen.getByRole('textbox', { name: 'Your message to the operations manager' });
    await user.type(textbox, 'Kolkata is slow.');
    await user.click(screen.getByRole('button', { name: 'Send recommendation' }));
    expect(screen.getByText(/write at least 15 words/i)).toBeInTheDocument();
    expect(textbox).toHaveFocus();
    expect(missionProgress(store.getSnapshot(), MISSION).completedAt).toBeNull();

    await user.type(
      textbox,
      ' It stays slowest without outliers, especially at dinner. Hyderabad only looks slow because of a few logging errors, so fix the logging first.',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'I name the city that is genuinely slowest' }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'I suggest a concrete next step for the team' }),
    );
    await user.click(screen.getByRole('button', { name: 'Send recommendation' }));

    expect(await screen.findByRole('heading', { name: 'Mission complete' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(missionSummaryPath(unit1.id));
    const saved = missionProgress(store.getSnapshot(), MISSION);
    expect(saved).toMatchObject({
      recommendation: expect.stringMatching(/^Kolkata is slow\. It stays slowest/),
      selfReview: ['slowest-city', 'next-step'],
      freezeGranted: true,
      facts: SUMMARY,
    });
    expect(saved.completedAt).not.toBeNull();
    expect(store.getSnapshot().activity.freezesHeld).toBe(1);

    const whatYouDid = screen.getByRole('region', { name: 'What you did' });
    expect(
      within(whatYouDid).getByText('Flagged 13 outliers with the 1.5 × IQR rule'),
    ).toBeVisible();
    const xp = screen.getByRole('region', { name: 'XP breakdown' });
    expect(xp).toHaveTextContent('Mission (5 code tasks)100 XP');
    expect(xp).toHaveTextContent('Total100 XP');
    expect(screen.getByRole('region', { name: 'Streak freeze earned' })).toBeInTheDocument();

    const portfolio = screen.getByTestId('portfolio-summary');
    expect(portfolio).toHaveTextContent('600 food delivery orders');
    expect(portfolio).not.toHaveTextContent(/job|placement|salary|hired/i);
    await user.click(screen.getByRole('button', { name: 'Copy summary' }));
    expect(await screen.findByText('Copied to your clipboard.')).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toMatch(
      /^Delivery delay analysis \(Python, pandas\), practice project\n• Cleaned/,
    );

    const compare = screen.getByRole('region', { name: 'Compare your recommendation' });
    expect(within(compare).getByText(/fixing the delivery time logging first/)).toBeVisible();
    expect(within(compare).getByText(/Not ticked:/).parentElement).toHaveTextContent(
      'I explain that a few extreme values distort the mean',
    );

    // Optional UPI support comes last, after the way back to the path, and asks for nothing.
    const support = screen.getByRole('region', { name: 'Enjoying Data Detective?' });
    const back = screen.getByRole('link', { name: 'Back to path' });
    expect(back.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(support).getByRole('link', { name: /with a UPI app/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^upi:\/\/pay\?/),
    );
  });
});
