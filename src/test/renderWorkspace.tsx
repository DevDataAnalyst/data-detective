import { render, screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect } from 'vitest';
import { lateDeliveryMystery } from '../content/mission1';
import type { Mission } from '../content/types';
import type {
  CheckResult,
  DatasetSummary,
  FromWorker,
  RunResult,
  ToWorker,
} from '../mission/python/protocol';
import { PythonRuntime, type WorkerLike } from '../mission/python/pythonRuntime';
import MissionWorkspace from '../mission/MissionWorkspace';
import { MissionSummaryPage } from '../pages/MissionSummaryPage';
import { createEventLog } from '../storage/events';
import { createMemoryStore } from '../storage/keyValue';
import { ProgressProvider } from '../storage/ProgressProvider';
import { createProgressStore, type ProgressStore } from '../storage/progressStore';

/** What the real worker reports about the generated dataset. */
export const DATASET_SUMMARY: DatasetSummary = {
  orders: 600,
  missingDeliveryTimes: 18,
  cities: 5,
  outliers: 13,
  misleadingCity: 'Hyderabad',
  slowestCity: 'Kolkata',
};

export const NO_OUTPUT: RunResult = { stdout: '', rich: [], error: null };

/** Stands in for the Pyodide worker. Tests push its messages with `emit`. */
export class FakeWorker implements WorkerLike {
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

  runs() {
    return this.sent.filter(
      (message): message is Extract<ToWorker, { type: 'run' }> => message.type === 'run',
    );
  }

  lastRun() {
    return this.runs().at(-1);
  }

  finishLastRun(result: RunResult, check: CheckResult | null = null) {
    const run = this.lastRun();
    if (!run) throw new Error('Nothing is running');
    this.emit({ type: 'run-started', id: run.id });
    this.emit({ type: 'run-result', id: run.id, result, check });
  }
}

/** Renders the mission workspace (and its summary route) with fake Python workers. */
export function renderWorkspace(
  store: ProgressStore = createProgressStore(createMemoryStore()),
  mission: Mission = lateDeliveryMystery,
) {
  const workers: FakeWorker[] = [];
  const events = createEventLog(createMemoryStore());
  const router = createMemoryRouter(
    [
      {
        path: '/mission',
        element: (
          <MissionWorkspace
            mission={mission}
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
        ),
      },
      { path: '/mission/summary', element: <MissionSummaryPage /> },
      { path: '/', element: <p>Path</p> },
    ],
    { initialEntries: ['/mission'] },
  );
  const view = render(
    <ProgressProvider store={store} events={events}>
      <RouterProvider router={router} />
    </ProgressProvider>,
  );
  return { ...view, workers, store, router, events };
}

/** Waits for the first worker and reports Python as ready. */
export async function pythonReady(workers: FakeWorker[]) {
  await waitFor(() => expect(workers).toHaveLength(1));
  workers[0].emit({ type: 'ready', loadMs: 10, summary: DATASET_SUMMARY });
  return workers[0];
}

/** Clicks Run on the open task and waits for the code to reach the worker. */
export async function runActiveTask(user: UserEvent, worker: FakeWorker) {
  const runsBefore = worker.runs().length;
  await user.click(await screen.findByRole('button', { name: 'Run' }));
  await waitFor(() => expect(worker.runs()).toHaveLength(runsBefore + 1));
}
