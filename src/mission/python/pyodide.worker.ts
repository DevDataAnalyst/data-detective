/**
 * Web Worker that runs Python with Pyodide, so loading and running code never freezes the page.
 * Pyodide is fetched from the jsDelivr CDN the first time a mission opens.
 */
import { CHECK_MODULES } from './checkModules';
import type { CheckResult, DatasetSummary, FromWorker, RunResult, ToWorker } from './protocol';
import runnerSource from './runner.py?raw';

export const PYODIDE_VERSION = '314.0.7';
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const HOME = '/home/pyodide';

interface PyProxy {
  destroy(): void;
}

interface PyCallable extends PyProxy {
  (...args: unknown[]): unknown;
}

interface Pyodide {
  loadPackage(
    names: string[],
    options?: { messageCallback?: (message: string) => void },
  ): Promise<unknown>;
  loadPackagesFromImports(
    code: string,
    options?: { messageCallback?: (message: string) => void },
  ): Promise<unknown>;
  runPython(code: string): unknown;
  globals: { get(name: string): PyCallable };
  FS: { writeFile(path: string, data: string): void };
}

const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<ToWorker>) => void): void;
};

let pyodide: Pyodide | null = null;
let runCode: PyCallable | null = null;
let newNamespace: PyCallable | null = null;
let checkTask: PyCallable | null = null;
let namespace: PyProxy | null = null;
/** Messages are handled one at a time, in order. */
let queue: Promise<void> = Promise.resolve();

const post = (message: FromWorker) => scope.postMessage(message);

async function initialise(missionId: string, datasetUrl: string, datasetFileName: string) {
  const checksSource = CHECK_MODULES[missionId];
  if (!checksSource) throw new Error(`No checks for the mission "${missionId}"`);
  const started = performance.now();
  post({ type: 'progress', stage: 'python', message: 'Downloading Python' });
  const { loadPyodide } = (await import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`)) as {
    loadPyodide(options: { indexURL: string }): Promise<Pyodide>;
  };
  const loaded = await loadPyodide({ indexURL: INDEX_URL });

  post({ type: 'progress', stage: 'packages', message: 'Loading pandas' });
  await loaded.loadPackage(['pandas']);

  post({ type: 'progress', stage: 'data', message: 'Loading the data' });
  const response = await fetch(datasetUrl);
  if (!response.ok) throw new Error(`Could not download the dataset (${response.status})`);
  loaded.FS.writeFile(`${HOME}/${datasetFileName}`, await response.text());

  loaded.runPython(runnerSource);
  loaded.runPython(checksSource);
  // Work out the right answers from the data itself, so a regenerated dataset still grades.
  loaded.runPython(`compute_reference(${JSON.stringify(datasetFileName)})`);
  const summary = JSON.parse(loaded.runPython('reference_summary()') as string) as DatasetSummary;
  runCode = loaded.globals.get('run_code');
  newNamespace = loaded.globals.get('new_namespace');
  checkTask = loaded.globals.get('check_task');
  namespace = newNamespace() as PyProxy;
  pyodide = loaded;
  post({ type: 'ready', loadMs: Math.round(performance.now() - started), summary });
}

async function run(id: number, code: string, taskId?: string) {
  if (!pyodide || !runCode || !checkTask || !namespace) {
    throw new Error('Python is not ready yet');
  }
  try {
    // Loads matplotlib and friends the first time learner code imports them.
    await pyodide.loadPackagesFromImports(code, {
      messageCallback: (text) => {
        if (text.startsWith('Loading ')) {
          post({ type: 'run-downloading', id, packages: text.slice('Loading '.length) });
        }
      },
    });
  } catch {
    // Unknown packages surface as a normal ModuleNotFoundError when the code runs.
  }
  post({ type: 'run-started', id });
  const result = JSON.parse(runCode(code, namespace) as string) as RunResult;
  const check = taskId
    ? (JSON.parse(checkTask(taskId, namespace) as string) as CheckResult | null)
    : null;
  post({ type: 'run-result', id, result, check });
}

function reset(id: number) {
  if (namespace && newNamespace) {
    namespace.destroy();
    namespace = newNamespace() as PyProxy;
  }
  post({ type: 'reset-done', id });
}

scope.addEventListener('message', (event) => {
  const message = event.data;
  queue = queue.then(async () => {
    switch (message.type) {
      case 'init':
        try {
          await initialise(message.missionId, message.datasetUrl, message.datasetFileName);
        } catch (error) {
          post({ type: 'init-failed', message: (error as Error).message ?? String(error) });
        }
        break;
      case 'run':
        try {
          await run(message.id, message.code, message.taskId);
        } catch (error) {
          post({
            type: 'run-result',
            id: message.id,
            result: {
              stdout: '',
              rich: [],
              error: {
                type: 'WorkspaceError',
                message: (error as Error).message ?? String(error),
                line: null,
                trace: [],
              },
            },
            check: null,
          });
        }
        break;
      case 'reset':
        reset(message.id);
        break;
    }
  });
});
