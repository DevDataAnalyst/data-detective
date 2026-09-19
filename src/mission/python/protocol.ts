import type { MissionFacts } from '../../game/missionProgress';

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

/** The hidden check for a mission task, run after the learner's code. */
export interface CheckResult {
  passed: boolean;
  message: string;
}

/** Facts about the dataset, used on the mission complete screen. */
export type DatasetSummary = MissionFacts;

export interface RunResult {
  stdout: string;
  rich: RichOutput[];
  error: PythonError | null;
}

/** A data file the worker downloads into Python's working directory. */
export interface DataFile {
  url: string;
  fileName: string;
  /** Also load it into the SQL database as this table. */
  table?: string;
}

export type ToWorker =
  /** The first file is the mission's main dataset, which its checks work from. */
  | { type: 'init'; missionId: string; files: DataFile[] }
  /** `taskId` asks the worker to check that task after the code runs. */
  | { type: 'run'; id: number; code: string; taskId?: string }
  | { type: 'reset'; id: number };

export type FromWorker =
  | { type: 'progress'; stage: LoadStage; message: string }
  | { type: 'ready'; loadMs: number; summary: DatasetSummary }
  | { type: 'init-failed'; message: string }
  /** The run needs packages that are not loaded yet, e.g. "matplotlib, pillow". */
  | { type: 'run-downloading'; id: number; packages: string }
  /** Packages are ready and the learner's code has started. The run time limit starts now. */
  | { type: 'run-started'; id: number }
  | { type: 'run-result'; id: number; result: RunResult; check: CheckResult | null }
  | { type: 'reset-done'; id: number };
