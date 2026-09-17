import type {
  CheckResult,
  DatasetSummary,
  FromWorker,
  LoadStage,
  RunResult,
  ToWorker,
} from './protocol';

export type RuntimePhase =
  | 'idle'
  | 'loading'
  /** Running saved code again so earlier variables exist. */
  | 'restoring'
  | 'ready'
  | 'running'
  | 'restarting'
  | 'failed';

export interface RuntimeState {
  phase: RuntimePhase;
  stage: LoadStage | null;
  /** Packages being downloaded for the code that is about to run, e.g. "matplotlib, pillow". */
  downloadingPackages: string | null;
  /** How long the last successful load took. */
  loadMs: number | null;
  /** Facts about the dataset, known once Python has loaded it. */
  summary: DatasetSummary | null;
  error: string | null;
}

export type RunOutcome =
  | { kind: 'completed'; result: RunResult; check: CheckResult | null; durationMs: number }
  /** The code ran too long. Python was restarted and earlier work replayed. */
  | { kind: 'timed_out'; timeoutMs: number }
  | { kind: 'unavailable'; message: string };

export interface WorkerLike {
  postMessage(message: ToWorker): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<FromWorker>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface PythonRuntimeOptions {
  datasetUrl: string;
  datasetFileName: string;
  /** How long learner code may run once it starts. */
  timeoutMs?: number;
  /** How long downloading the packages a run needs may take, e.g. matplotlib on a slow line. */
  packageTimeoutMs?: number;
  /** Code to run again whenever Python starts, so earlier variables come back. Oldest first. */
  replayCode?: () => string[];
  createWorker?: () => WorkerLike;
  now?: () => number;
}

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_PACKAGE_TIMEOUT_MS = 180_000;

function createPyodideWorker(): WorkerLike {
  return new Worker(new URL('./pyodide.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as WorkerLike;
}

interface Pending {
  resolve: (outcome: RunOutcome) => void;
  started: number;
  timer: ReturnType<typeof setTimeout>;
  /** Called when the code itself runs past the time limit. */
  onRunTimeout: () => void;
  /** Called when downloading packages takes too long. */
  onPackageTimeout: () => void;
}

/**
 * Owns the Python worker: loading, running code with a time limit, resetting and recovering.
 * The UI subscribes to its state.
 */
export class PythonRuntime {
  private state: RuntimeState = {
    phase: 'idle',
    stage: null,
    downloadingPackages: null,
    loadMs: null,
    summary: null,
    error: null,
  };
  private readonly listeners = new Set<() => void>();
  private worker: WorkerLike | null = null;
  private nextId = 1;
  private readonly pendingRuns = new Map<number, Pending>();
  private readonly pendingResets = new Map<number, () => void>();
  private readyWaiters: Array<(ready: boolean) => void> = [];
  private disposed = false;
  private replayTimedOut = false;
  private skipNextReplay = false;
  private replayCode: () => string[];
  private readonly timeoutMs: number;
  private readonly packageTimeoutMs: number;
  private readonly now: () => number;

  constructor(private readonly options: PythonRuntimeOptions) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.packageTimeoutMs = options.packageTimeoutMs ?? DEFAULT_PACKAGE_TIMEOUT_MS;
    this.now = options.now ?? (() => performance.now());
    this.replayCode = options.replayCode ?? (() => []);
  }

  /** Where to get the code that restores earlier variables after a restart. */
  setReplayCode(provider: () => string[]): void {
    this.replayCode = provider;
  }

  getState = (): RuntimeState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Starts loading Python. Safe to call more than once. */
  start(): void {
    if (this.disposed || this.worker) return;
    this.spawn('loading');
  }

  /** Tries loading again after a failure. */
  retry(): void {
    if (this.disposed) return;
    this.teardownWorker();
    this.spawn('loading');
  }

  /** Runs code. With `taskId`, the worker also checks that mission task afterwards. */
  async run(code: string, taskId?: string): Promise<RunOutcome> {
    if (!(await this.whenReady())) {
      return { kind: 'unavailable', message: this.state.error ?? 'Python is not available.' };
    }
    if (!this.worker) return { kind: 'unavailable', message: 'Python is not available.' };

    this.setState({ phase: 'running' });
    return new Promise<RunOutcome>((resolve) => {
      const id = this.send(code, taskId, {
        resolve,
        onRunTimeout: () => {
          this.pendingRuns.delete(id);
          resolve({ kind: 'timed_out', timeoutMs: this.timeoutMs });
          this.restart();
        },
        onPackageTimeout: () => {
          this.pendingRuns.delete(id);
          resolve({
            kind: 'unavailable',
            message:
              'Downloading the packages this code needs took too long. Check your connection and run it again.',
          });
          this.restart();
        },
      });
    });
  }

  /** Clears every variable, as if Python had just started. */
  async resetEnvironment(): Promise<void> {
    if (!(await this.whenReady()) || !this.worker) return;
    const id = this.nextId++;
    await new Promise<void>((resolve) => {
      this.pendingResets.set(id, resolve);
      this.worker?.postMessage({ type: 'reset', id });
    });
  }

  /** Ends the worker but allows `start()` again, as React's strict mode remounts effects. */
  stop(): void {
    this.teardownWorker();
    this.resolveReadyWaiters(false);
    this.setState({ phase: 'idle', stage: null, downloadingPackages: null });
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
    this.listeners.clear();
  }

  /**
   * Posts code to the worker. Until the worker says the code has started, only the (long) package
   * download limit applies; the run time limit starts with the code itself.
   */
  private send(
    code: string,
    taskId: string | undefined,
    handlers: Pick<Pending, 'resolve' | 'onRunTimeout' | 'onPackageTimeout'>,
  ): number {
    const id = this.nextId++;
    this.pendingRuns.set(id, {
      ...handlers,
      started: this.now(),
      timer: setTimeout(() => handlers.onPackageTimeout(), this.packageTimeoutMs),
    });
    this.worker?.postMessage({ type: 'run', id, code, taskId });
    return id;
  }

  private restart() {
    // The only way to stop a busy worker is to end it and start a fresh one.
    this.teardownWorker();
    this.spawn('restarting');
  }

  private spawn(phase: 'loading' | 'restarting') {
    const worker = (this.options.createWorker ?? createPyodideWorker)();
    this.worker = worker;
    this.setState({ phase, stage: null, downloadingPackages: null, error: null });
    worker.onmessage = (event) => this.handleMessage(worker, event.data);
    worker.onerror = (event) => {
      event.preventDefault?.();
      this.fail(worker, event.message || 'Python stopped unexpectedly.');
    };
    worker.postMessage({
      type: 'init',
      datasetUrl: this.options.datasetUrl,
      datasetFileName: this.options.datasetFileName,
    });
  }

  private handleMessage(worker: WorkerLike, message: FromWorker) {
    if (worker !== this.worker) return;
    switch (message.type) {
      case 'progress':
        this.setState({ stage: message.stage });
        break;
      case 'ready':
        this.setState({ summary: message.summary });
        void this.becomeReady(message.loadMs);
        break;
      case 'init-failed':
        this.fail(worker, message.message);
        break;
      case 'run-downloading': {
        if (this.pendingRuns.has(message.id) && this.state.phase === 'running') {
          this.setState({ downloadingPackages: message.packages });
        }
        break;
      }
      case 'run-started': {
        const pending = this.pendingRuns.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        pending.started = this.now();
        pending.timer = setTimeout(() => pending.onRunTimeout(), this.timeoutMs);
        if (this.state.downloadingPackages) this.setState({ downloadingPackages: null });
        break;
      }
      case 'run-result': {
        const pending = this.pendingRuns.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pendingRuns.delete(message.id);
        if (this.state.phase === 'running' && this.pendingRuns.size === 0) {
          this.setState({ phase: 'ready', downloadingPackages: null });
        }
        pending.resolve({
          kind: 'completed',
          result: message.result,
          check: message.check,
          durationMs: Math.round(this.now() - pending.started),
        });
        break;
      }
      case 'reset-done':
        this.pendingResets.get(message.id)?.();
        this.pendingResets.delete(message.id);
        break;
    }
  }

  private async becomeReady(loadMs: number) {
    const replay = this.skipNextReplay ? [] : this.replayCode();
    this.skipNextReplay = false;
    if (replay.length > 0) {
      // Bring back earlier variables before anyone can run new code.
      this.setState({ phase: 'restoring', stage: null });
      this.replayTimedOut = false;
      for (const code of replay) {
        await this.runQuietly(code);
        if (this.replayTimedOut) {
          // Replaying hung too: start clean rather than looping through restarts.
          this.teardownWorker();
          this.skipNextReplay = true;
          this.spawn('loading');
          return;
        }
      }
    }
    this.setState({ phase: 'ready', stage: null, loadMs, error: null });
    this.resolveReadyWaiters(true);
  }

  private runQuietly(code: string): Promise<void> {
    if (!this.worker) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const giveUp = () => {
        this.pendingRuns.delete(id);
        this.replayTimedOut = true;
        resolve();
      };
      const id = this.send(code, undefined, {
        resolve: () => resolve(),
        onRunTimeout: giveUp,
        onPackageTimeout: giveUp,
      });
    });
  }

  private fail(worker: WorkerLike, message: string) {
    if (worker !== this.worker) return;
    this.teardownWorker();
    this.setState({ phase: 'failed', stage: null, downloadingPackages: null, error: message });
    this.resolveReadyWaiters(false);
  }

  private teardownWorker() {
    for (const pending of this.pendingRuns.values()) {
      clearTimeout(pending.timer);
      pending.resolve({ kind: 'unavailable', message: 'Python was restarted.' });
    }
    this.pendingRuns.clear();
    this.pendingResets.forEach((resolve) => resolve());
    this.pendingResets.clear();
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }
  }

  private whenReady(): Promise<boolean> {
    const { phase } = this.state;
    if (phase === 'ready' || phase === 'running') return Promise.resolve(true);
    if (phase === 'failed' || this.disposed) return Promise.resolve(false);
    if (phase === 'idle') this.start();
    return new Promise((resolve) => this.readyWaiters.push(resolve));
  }

  private resolveReadyWaiters(ready: boolean) {
    const waiters = this.readyWaiters;
    this.readyWaiters = [];
    waiters.forEach((resolve) => resolve(ready));
  }

  private setState(patch: Partial<RuntimeState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
