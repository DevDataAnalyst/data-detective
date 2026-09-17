/** Messages between the mission workspace and the Python worker, plus what a run returns. */

export type LoadStage = 'python' | 'packages' | 'data';

export interface TableOutput {
  kind: 'table';
  columns: string[];
  indexName: string | null;
  index: string[];
  rows: string[][];
  totalRows: number;
  totalColumns: number;
}

export interface TextOutput {
  kind: 'text';
  text: string;
}

export interface ImageOutput {
  kind: 'image';
  mime: string;
  /** Base64 data. */
  data: string;
}

export type RichOutput = TableOutput | TextOutput | ImageOutput;

export interface PythonError {
  /** Exception class name, e.g. `KeyError`. */
  type: string;
  message: string;
  /** Line in the learner's code, when known. */
  line: number | null;
  /** The learner's own lines involved, innermost last. */
  trace: Array<{ line: number; code: string }>;
}

export interface RunResult {
  stdout: string;
  rich: RichOutput[];
  error: PythonError | null;
}

export type ToWorker =
  | { type: 'init'; datasetUrl: string; datasetFileName: string }
  | { type: 'run'; id: number; code: string }
  | { type: 'reset'; id: number };

export type FromWorker =
  | { type: 'progress'; stage: LoadStage; message: string }
  | { type: 'ready'; loadMs: number }
  | { type: 'init-failed'; message: string }
  /** The run needs packages that are not loaded yet, e.g. "matplotlib, pillow". */
  | { type: 'run-downloading'; id: number; packages: string }
  /** Packages are ready and the learner's code has started. The run time limit starts now. */
  | { type: 'run-started'; id: number }
  | { type: 'run-result'; id: number; result: RunResult }
  | { type: 'reset-done'; id: number };
