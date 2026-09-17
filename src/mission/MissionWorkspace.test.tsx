import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { lateDeliveryMystery } from '../content/mission1';
import { missionProgress, taskProgress } from '../game/missionProgress';
import { createMemoryStore } from '../storage/keyValue';
import { ProgressProvider } from '../storage/ProgressProvider';
import { createProgressStore } from '../storage/progressStore';
import MissionWorkspace from './MissionWorkspace';
import type { FromWorker, RunResult, ToWorker } from './python/protocol';
import { PythonRuntime, type WorkerLike } from './python/pythonRuntime';

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly sent: ToWorker[] = [];

  postMessage(message: ToWorker) {
    this.sent.push(message);
  }

  terminate() {}

  emit(message: FromWorker) {
    this.onmessage?.({ data: message } as MessageEvent<FromWorker>);
  }

  lastRun() {
    return this.sent.filter((message) => message.type === 'run').at(-1) as
      Extract<ToWorker, { type: 'run' }> | undefined;
  }

  finishLastRun(result: RunResult) {
    const run = this.lastRun();
    if (!run) throw new Error('Nothing is running');
    this.emit({ type: 'run-started', id: run.id });
    this.emit({ type: 'run-result', id: run.id, result });
  }
}

const MISSION = lateDeliveryMystery.id;

function renderWorkspace() {
  const workers: FakeWorker[] = [];
  const store = createProgressStore(createMemoryStore());
  render(
    <ProgressProvider store={store}>
      <MemoryRouter>
        <MissionWorkspace
          mission={lateDeliveryMystery}
          createRuntime={(options) =>
            new PythonRuntime({
              ...options,
              createWorker: () => {
                const worker = new FakeWorker();
                workers.push(worker);
                return worker;
              },
            })
          }
        />
      </MemoryRouter>
    </ProgressProvider>,
  );
  return { workers, store };
}

describe('MissionWorkspace', () => {
  it('shows loading progress, then lets the learner run code once Python is ready', async () => {
    const { workers } = renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Open the case file' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Python is loading…' })).toBeDisabled();
    expect(screen.getByText('Setting up Python in your browser')).toBeInTheDocument();

    await waitFor(() => expect(workers).toHaveLength(1));
    expect(workers[0].sent[0]).toMatchObject({
      type: 'init',
      datasetFileName: 'deliveries.csv',
      datasetUrl: expect.stringMatching(/\/data\/deliveries\.csv$/),
    });

    workers[0].emit({ type: 'progress', stage: 'packages', message: 'Loading pandas' });
    expect(await screen.findByText('Step 2 of 3: Loading pandas…')).toBeInTheDocument();

    workers[0].emit({ type: 'ready', loadMs: 1200 });
    expect(await screen.findByRole('button', { name: 'Run' })).toBeEnabled();
    expect(screen.queryByText('Setting up Python in your browser')).not.toBeInTheDocument();
  });

  it('runs code and shows printed output, tables and task status', async () => {
    const user = userEvent.setup();
    const { workers, store } = renderWorkspace();
    await waitFor(() => expect(workers).toHaveLength(1));
    workers[0].emit({ type: 'ready', loadMs: 10 });

    await user.click(await screen.findByRole('button', { name: 'Run' }));
    await waitFor(() => expect(workers[0].lastRun()).toBeDefined());
    const task = lateDeliveryMystery.tasks[0];
    expect(workers[0].lastRun()?.code).toBe(task.kind === 'code' ? task.starterCode : '');

    workers[0].finishLastRun({
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
  });

  it('explains errors in plain words', async () => {
    const user = userEvent.setup();
    const { workers } = renderWorkspace();
    await waitFor(() => expect(workers).toHaveLength(1));
    workers[0].emit({ type: 'ready', loadMs: 10 });

    await user.click(await screen.findByRole('button', { name: 'Run' }));
    await waitFor(() => expect(workers[0].lastRun()).toBeDefined());
    workers[0].finishLastRun({
      stdout: '',
      rich: [],
      error: {
        type: 'NameError',
        message: "name '____' is not defined",
        line: 4,
        trace: [{ line: 4, code: 'df = pd.read_csv(____)' }],
      },
    });

    expect(await screen.findByText('NameError on line 4')).toBeInTheDocument();
    expect(screen.getByText('Line 4: df = pd.read_csv(____)')).toBeInTheDocument();
    expect(
      screen.getByText('Replace each ____ blank with your own code before running.'),
    ).toBeInTheDocument();
  });

  it('switches between tasks and saves the written recommendation', async () => {
    const user = userEvent.setup();
    const { store } = renderWorkspace();
    const nav = screen.getByRole('navigation', { name: 'Mission tasks' });

    await user.click(within(nav).getByRole('button', { name: /find the gaps/i }));
    expect(screen.getByRole('heading', { name: 'Find the gaps' })).toBeInTheDocument();
    expect(missionProgress(store.getSnapshot(), MISSION).activeTaskId).toBe('missing-values');

    await user.click(within(nav).getByRole('button', { name: /brief the manager/i }));
    const textbox = screen.getByRole('textbox', { name: 'Your message to the operations manager' });
    await user.type(textbox, 'Kolkata is genuinely slow at dinner. Hyderabad has logging errors.');
    expect(screen.getByText('2 sentences. Aim for 2–4.')).toBeInTheDocument();
    await waitFor(() =>
      expect(missionProgress(store.getSnapshot(), MISSION).recommendation).toMatch(/^Kolkata/),
    );
  });
});
