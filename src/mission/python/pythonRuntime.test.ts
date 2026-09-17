import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckResult, DatasetSummary, FromWorker, RunResult, ToWorker } from './protocol';
import { PythonRuntime, type RunOutcome, type WorkerLike } from './pythonRuntime';

const SUMMARY: DatasetSummary = {
  orders: 600,
  missingDeliveryTimes: 18,
  cities: 5,
  outliers: 13,
  misleadingCity: 'Hyderabad',
  slowestCity: 'Kolkata',
};

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly sent: ToWorker[] = [];
  terminated = false;

  postMessage(message: ToWorker) {
    this.sent.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emit(message: FromWorker) {
    this.onmessage?.({ data: message } as MessageEvent<FromWorker>);
  }

  lastRun() {
    const runs = this.sent.filter((message) => message.type === 'run');
    return runs[runs.length - 1] as Extract<ToWorker, { type: 'run' }> | undefined;
  }

  /** Answers the latest run as a real worker would: started, then finished. */
  finishLastRun(result: RunResult, check: CheckResult | null = null) {
    const run = this.lastRun();
    if (!run) throw new Error('No run to finish');
    this.emit({ type: 'run-started', id: run.id });
    this.emit({ type: 'run-result', id: run.id, result, check });
  }
}

const okResult = (stdout = ''): RunResult => ({ stdout, rich: [], error: null });

function setup(replay: string[] = []) {
  const workers: FakeWorker[] = [];
  const runtime = new PythonRuntime({
    datasetUrl: 'data/deliveries.csv',
    datasetFileName: 'deliveries.csv',
    timeoutMs: 10_000,
    packageTimeoutMs: 180_000,
    replayCode: () => replay,
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });
  return { runtime, workers };
}

describe('PythonRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads Python in a worker and reports progress', () => {
    const { runtime, workers } = setup();
    runtime.start();
    expect(runtime.getState().phase).toBe('loading');
    expect(workers[0].sent[0]).toEqual({
      type: 'init',
      datasetUrl: 'data/deliveries.csv',
      datasetFileName: 'deliveries.csv',
    });

    workers[0].emit({ type: 'progress', stage: 'packages', message: 'Loading pandas' });
    expect(runtime.getState().stage).toBe('packages');

    workers[0].emit({ type: 'ready', loadMs: 4200, summary: SUMMARY });
    expect(runtime.getState()).toMatchObject({ phase: 'ready', loadMs: 4200, stage: null });
  });

  it('waits for Python to be ready before running code', async () => {
    const { runtime, workers } = setup();
    runtime.start();
    const outcome = runtime.run('print(1)');
    expect(workers[0].lastRun()).toBeUndefined();

    workers[0].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });
    await vi.waitFor(() => expect(workers[0].lastRun()).toBeDefined());
    expect(runtime.getState().phase).toBe('running');

    workers[0].finishLastRun(okResult('1\n'));
    await expect(outcome).resolves.toMatchObject({ kind: 'completed', result: okResult('1\n') });
    expect(runtime.getState().phase).toBe('ready');
  });

  it('stops code that runs too long, restarts Python and replays earlier work', async () => {
    const replay: string[] = [];
    const { runtime, workers } = setup(replay);
    runtime.start();
    workers[0].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });
    // Work saved after the first load is what comes back after a restart.
    replay.push('import pandas as pd', 'df = pd.read_csv("x.csv")');

    const outcome = runtime.run('while True: pass');
    await vi.waitFor(() => expect(workers[0].lastRun()).toBeDefined());
    workers[0].emit({ type: 'run-started', id: workers[0].lastRun()!.id });
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(outcome).resolves.toEqual({
      kind: 'timed_out',
      timeoutMs: 10_000,
    } satisfies RunOutcome);

    expect(workers[0].terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(runtime.getState().phase).toBe('restarting');

    workers[1].emit({ type: 'ready', loadMs: 900, summary: SUMMARY });
    await vi.waitFor(() => expect(workers[1].lastRun()?.code).toBe('import pandas as pd'));
    workers[1].finishLastRun(okResult());
    await vi.waitFor(() => expect(workers[1].lastRun()?.code).toBe('df = pd.read_csv("x.csv")'));
    expect(runtime.getState().phase).toBe('restoring');
    workers[1].finishLastRun(okResult());

    await vi.waitFor(() => expect(runtime.getState().phase).toBe('ready'));
  });

  it('does not count package downloads toward the time limit', async () => {
    const { runtime, workers } = setup();
    runtime.start();
    workers[0].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });

    const outcome = runtime.run('import matplotlib.pyplot as plt');
    await vi.waitFor(() => expect(workers[0].lastRun()).toBeDefined());
    const { id } = workers[0].lastRun()!;
    workers[0].emit({ type: 'run-downloading', id, packages: 'matplotlib, pillow' });
    expect(runtime.getState().downloadingPackages).toBe('matplotlib, pillow');

    // A slow download: well past the 10 second run limit.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(workers[0].terminated).toBe(false);

    workers[0].emit({ type: 'run-started', id });
    expect(runtime.getState().downloadingPackages).toBeNull();
    workers[0].emit({ type: 'run-result', id, result: okResult(), check: null });
    await expect(outcome).resolves.toMatchObject({ kind: 'completed' });
  });

  it('gives up on a package download that never finishes', async () => {
    const { runtime, workers } = setup();
    runtime.start();
    workers[0].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });

    const outcome = runtime.run('import matplotlib');
    await vi.advanceTimersByTimeAsync(180_000);
    await expect(outcome).resolves.toMatchObject({ kind: 'unavailable' });
    expect(workers[0].terminated).toBe(true);
    expect(workers).toHaveLength(2);
  });

  it('starts clean instead of looping when a replay hangs too', async () => {
    const replay: string[] = [];
    const { runtime, workers } = setup(replay);
    runtime.start();
    workers[0].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });
    replay.push('while True: pass');

    const outcome = runtime.run('while True: pass');
    await vi.waitFor(() => expect(workers[0].lastRun()).toBeDefined());
    workers[0].emit({ type: 'run-started', id: workers[0].lastRun()!.id });
    await vi.advanceTimersByTimeAsync(10_000);
    await outcome;

    workers[1].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });
    await vi.waitFor(() => expect(workers[1].lastRun()).toBeDefined());
    workers[1].emit({ type: 'run-started', id: workers[1].lastRun()!.id });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(workers).toHaveLength(3);
    expect(runtime.getState().phase).toBe('loading');
    workers[2].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });
    expect(runtime.getState().phase).toBe('ready');
    expect(workers[2].lastRun()).toBeUndefined();
  });

  it('restores saved work when Python first loads', async () => {
    const { runtime, workers } = setup(['clean = df.dropna()']);
    runtime.start();
    workers[0].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });
    expect(runtime.getState().phase).toBe('restoring');
    await vi.waitFor(() => expect(workers[0].lastRun()?.code).toBe('clean = df.dropna()'));
    workers[0].finishLastRun(okResult());
    await vi.waitFor(() => expect(runtime.getState().phase).toBe('ready'));
  });

  it('reports a failed load and can try again', async () => {
    const { runtime, workers } = setup();
    runtime.start();
    const outcome = runtime.run('1 + 1');
    workers[0].emit({ type: 'init-failed', message: 'Failed to fetch' });

    await expect(outcome).resolves.toEqual({ kind: 'unavailable', message: 'Failed to fetch' });
    expect(runtime.getState()).toMatchObject({ phase: 'failed', error: 'Failed to fetch' });
    expect(workers[0].terminated).toBe(true);

    runtime.retry();
    expect(workers).toHaveLength(2);
    expect(runtime.getState()).toMatchObject({ phase: 'loading', error: null });
  });

  it('resets the environment', async () => {
    const { runtime, workers } = setup();
    runtime.start();
    workers[0].emit({ type: 'ready', loadMs: 10, summary: SUMMARY });
    const done = runtime.resetEnvironment();
    await vi.waitFor(() => expect(workers[0].sent.at(-1)?.type).toBe('reset'));
    const reset = workers[0].sent.at(-1) as Extract<ToWorker, { type: 'reset' }>;
    workers[0].emit({ type: 'reset-done', id: reset.id });
    await expect(done).resolves.toBeUndefined();
  });

  it('can start again after stop, as strict mode remounts do', () => {
    const { runtime, workers } = setup();
    runtime.start();
    runtime.stop();
    expect(workers[0].terminated).toBe(true);
    expect(runtime.getState().phase).toBe('idle');
    runtime.start();
    expect(workers).toHaveLength(2);
  });
});
