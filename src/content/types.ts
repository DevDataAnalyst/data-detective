import type { Statistic } from '../game/stats';

export type { Statistic };

/**
 * Text fields marked "templated" may contain placeholders such as `{mean}` or `{std_dev:1}`.
 * They are filled from the question's single `dataset` at render time, so numbers quoted in
 * prompts and explanations are computed rather than typed by hand.
 */

/** A small list of numbers shown with a question. */
export interface NumberDataset {
  /** What each value measures, e.g. "Delivery time". Used as the chart title and label. */
  label: string;
  /** Written before each value, e.g. "₹". */
  prefix?: string;
  /** Written after each value, e.g. "min" or "GB". */
  suffix?: string;
  /** How multiple choice and estimate questions show the data. Defaults to `list`. */
  display?: 'list' | 'dot_plot';
  values: number[];
}

/** A tiny table, used for questions about rows and columns. */
export interface DataTable {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

interface QuestionBase {
  /** Unique across the whole unit. */
  id: string;
  /** Templated. */
  prompt: string;
  /** Templated. Says why the answer is right in one or two sentences, naming the common mistake. */
  explanation: string;
}

/**
 * Tells validation how to recompute a multiple choice answer from the question's data instead of
 * trusting the content author. Required whenever the correct option is a number.
 */
export type AnswerCheck =
  /** The correct option's number equals this statistic of `dataset`; no other option does. */
  | { kind: 'statistic'; statistic: Statistic }
  /** The correct option's number equals the row or column count of `table`. */
  | { kind: 'table_rows' }
  | { kind: 'table_columns' }
  /** Which option is right depends on comparing two statistics of `dataset`. */
  | {
      kind: 'compare';
      left: Statistic;
      right: Statistic;
      optionIndex: { greater: number; less: number; equal?: number };
    }
  /** Option i refers to `datasets[i]`; the correct option has the largest or smallest statistic. */
  | { kind: 'extreme'; statistic: Statistic; which: 'largest' | 'smallest' }
  /** Which option is right depends on the skewness of `dataset`. */
  | { kind: 'skew'; optionIndex: { right: number; left: number; symmetric: number } }
  /** The correct option says there is no mode: every value in `dataset` appears once. */
  | { kind: 'no_mode' };

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple_choice';
  options: string[];
  correctIndex: number;
  dataset?: NumberDataset;
  /** Several datasets shown side by side, labelled by their `label`. */
  datasets?: NumberDataset[];
  table?: DataTable;
  check?: AnswerCheck;
}

/** "Estimate the mean before we reveal it." */
export interface NumericEstimateQuestion extends QuestionBase {
  type: 'numeric_estimate';
  dataset: NumberDataset;
  /** The statistic being estimated; validation recomputes `correctValue` from it. */
  statistic: Statistic;
  correctValue: number;
  /** Answers within ± tolerance count as correct. */
  tolerance: number;
}

/** What the predict-and-reveal animation draws once the learner commits. */
export type RevealVisual =
  /** A marker slides to the true value (mean, median, mode). */
  | 'marker'
  /** A bracket spans min to max. */
  | 'range_bracket'
  /** A box spans Q1 to Q3. */
  | 'iqr_box'
  /** A band spans one standard deviation either side of the mean. */
  | 'sd_band';

export interface PredictRevealQuestion extends QuestionBase {
  type: 'predict_reveal';
  dataset: NumberDataset;
  statistic: Statistic;
  slider: { min: number; max: number; step: number };
  trueValue: number;
  tolerance: number;
  reveal: { visual: RevealVisual; description: string };
}

export interface TapOutlierQuestion extends QuestionBase {
  type: 'tap_outlier';
  /** Shown as a dot plot. */
  dataset: NumberDataset;
  /** Indices into `dataset.values`. Must match the 1.5 × IQR rule. */
  outlierIndices: number[];
}

export type Question =
  MultipleChoiceQuestion | NumericEstimateQuestion | PredictRevealQuestion | TapOutlierQuestion;

export type QuestionType = Question['type'];

export interface Lesson {
  id: string;
  title: string;
  estimatedMinutes: number;
  /**
   * Short concept intro, at most 80 words. Supports **bold** and blank-line paragraph breaks.
   */
  intro: string;
  /** 6–8 questions, in order. */
  questions: Question[];
}

export interface CheckpointItem {
  /** The lesson this question tests, used to suggest where to review. */
  lessonId: string;
  question: Question;
}

export interface Checkpoint {
  id: string;
  title: string;
  /** Fraction of questions needed to pass, e.g. 0.8. */
  passMark: number;
  /** How long a learner waits after failing before retaking. */
  retakeDelayMinutes: number;
  items: CheckpointItem[];
}

interface MissionTaskBase {
  /** Unique within the mission. */
  id: string;
  title: string;
  /** Short instructions. Supports **bold**, `code` and blank-line paragraph breaks. */
  instructions: string;
  /** Optional stretch task. Not needed to complete the mission. */
  stretch?: boolean;
}

/** A task solved by writing and running Python. */
export interface CodeTask extends MissionTaskBase {
  kind: 'code';
  starterCode: string;
  /** Variables the learner's code should create, shown as a checklist, e.g. `["df"]`. */
  creates: string[];
}

/** A task answered in plain words, such as the final recommendation. */
export interface WrittenTask extends MissionTaskBase {
  kind: 'written';
  placeholder: string;
  /** Suggested length, shown to the learner. */
  suggestedSentences: { min: number; max: number };
}

export type MissionTask = CodeTask | WrittenTask;

export interface MissionDataset {
  /** Name of the file in Python's working directory, e.g. `deliveries.csv`. */
  fileName: string;
  /** Where the app fetches it from, relative to the site root. */
  url: string;
  columns: Array<{ name: string; description: string }>;
}

export interface Mission {
  id: string;
  title: string;
  /** Shown at the top of the workspace. At most 120 words. */
  brief: string;
  dataset: MissionDataset;
  /** Required tasks first, then stretch tasks. */
  tasks: MissionTask[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  /** In path order. */
  lessons: Lesson[];
  checkpoint: Checkpoint;
  missionId: string;
}
