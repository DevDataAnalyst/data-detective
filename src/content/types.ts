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
  /** Unique across the whole course. */
  id: string;
  /** Templated. */
  prompt: string;
  /** Templated. Says why the answer is right in one or two sentences, naming the common mistake. */
  explanation: string;
  /**
   * Named numbers the question is built on, e.g. `{ strong: 100, applicants: 1000 }`. Text can quote
   * them as `{strong}`, or `{rate:%}` for a fraction shown as a percentage.
   */
  givens?: Record<string, number>;
  /**
   * Values worked out from the givens (and the dataset's statistics) with a formula such as
   * `strong / applicants`, in order. Text and checks use them like givens.
   */
  derived?: Record<string, string>;
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
  | { kind: 'no_mode' }
  /**
   * The correct option's number equals this formula over the question's givens, derived values
   * and dataset statistics, e.g. `caught / flagged * 100` for an option like "29.6%".
   */
  | {
      kind: 'formula';
      formula: string;
      /** How far a rounded option ("About 30%") may be from the exact value. Defaults to 0.005. */
      tolerance?: number;
    };

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

/**
 * "Estimate the mean before we reveal it." The answer is either a statistic of `dataset`, or a
 * `formula` over the question's givens, such as a probability.
 */
export interface NumericEstimateQuestion extends QuestionBase {
  type: 'numeric_estimate';
  dataset?: NumberDataset;
  /** The statistic being estimated; validation recomputes `correctValue` from it. */
  statistic?: Statistic;
  /** Instead of a statistic: the formula validation recomputes `correctValue` from. */
  formula?: string;
  /** Labels the answer box when there is no statistic, e.g. "Your estimate of the chance". */
  answerLabel?: string;
  /** Written before and after the answer when there is no dataset, e.g. "₹" or "%". */
  answerPrefix?: string;
  answerSuffix?: string;
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

/**
 * A message from a character in the story, such as a manager on chat or a client by email.
 * Supports **bold** and blank-line paragraph breaks.
 */
export interface StoryMessage {
  /** Who sent it, e.g. "Ritika". */
  from: string;
  /** Their role, e.g. "Founder, Kahani". */
  role: string;
  channel: 'chat' | 'email';
  /** Email subject line. Only for email. */
  subject?: string;
  text: string;
}

/** Why a candidate question cannot be answered well. */
export type TriageFlaw = 'data_not_available' | 'too_vague' | 'wrong_metric';

export interface TriageCandidate {
  question: string;
  /** Why this question fails. Leave it out for the one question that can be answered. */
  flaw?: TriageFlaw;
  /** One sentence shown after answering: why it works, or why it fails. */
  note: string;
}

/** A vague ask arrives. Which of three questions can the data you have actually answer? */
export interface InboxTriageQuestion extends QuestionBase {
  type: 'inbox_triage';
  message: StoryMessage;
  /** The data the analyst has to work with, e.g. the columns of a table. */
  data: { caption: string; columns: string[] };
  /** Exactly three. */
  candidates: TriageCandidate[];
  answerableIndex: number;
}

/** A value axis, as drawn. A bar chart's axis that starts above zero is truncated. */
export interface ChartAxis {
  min: number;
  max: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

export interface ChartSeries {
  name: string;
  /** One value per label. */
  values: number[];
  /** `right` draws the series against the right-hand axis, as in a dual-axis chart. */
  axis?: 'left' | 'right';
}

/** A small bar or line chart, drawn as SVG. */
export interface ClaimChart {
  kind: 'bar' | 'line';
  title: string;
  /** One label per point, e.g. months. Keep them short so they fit on a phone. */
  labels: string[];
  series: ChartSeries[];
  axis: ChartAxis;
  rightAxis?: ChartAxis;
  /**
   * Shows only the points from `from` to `to` (inclusive indices), hiding the rest. The honest
   * version drawn after answering shows every point.
   */
  window?: { from: number; to: number };
}

/** Ways a chart misleads. Validation checks the chart's data really does it. */
export type ChartTrick = 'truncated_axis' | 'cherry_picked_range' | 'dual_axis';

/** Someone makes a claim with a chart. What is wrong with it? */
export interface SpotTheLieQuestion extends QuestionBase {
  type: 'spot_the_lie';
  claim: { by: string; text: string };
  chart: ClaimChart;
  /** What is really wrong with the chart. */
  trick: ChartTrick;
  options: string[];
  correctIndex: number;
}

export interface Witness {
  name: string;
  /** The cause this witness reads into the evidence. */
  claim: string;
}

/**
 * Correlation vs causation. Two witnesses read opposite causes into the same correlation; the
 * learner finds the lurking variable that explains it. With a `table`, it is a confounder hunt.
 */
export interface CourtroomQuestion extends QuestionBase {
  type: 'courtroom';
  /** The correlation both witnesses agree on. */
  evidence: string;
  witnesses: [Witness, Witness];
  /** An exhibit: data that hides the third variable. */
  table?: DataTable;
  /** Two or three possible lurking variables. Each note says why it is or is not the answer. */
  suspects: Array<{ text: string; note: string }>;
  confounderIndex: number;
}

/** Pick the numerator and denominator that answer a business question. */
export interface BuildMetricQuestion extends QuestionBase {
  type: 'build_metric';
  /** The business question, e.g. "What share of visitors buy something?" */
  goal: string;
  /** What the finished metric is called, e.g. "Conversion rate". */
  metricName: string;
  /** Cards to place on top or bottom. Some are distractors. `value` shows the result. */
  cards: Array<{ label: string; value?: number }>;
  numeratorIndex: number;
  denominatorIndex: number;
  /** Show the result as a percentage. */
  percent?: boolean;
  /** Written before the result, e.g. "₹". */
  prefix?: string;
}

export interface AbVariant {
  name: string;
  visitors: number;
  conversions: number;
}

/**
 * Two versions were tested. Ship the new one, kill it, or wait for better data? Validation
 * recomputes the right call from the numbers (`abDecision`); each call shows what happens next.
 */
export interface AbVerdictQuestion extends QuestionBase {
  type: 'ab_verdict';
  /** What was tested, e.g. "Old checkout vs new checkout". */
  test: string;
  control: AbVariant;
  variant: AbVariant;
  /** The smallest lift, in percentage points of conversion, that is worth shipping. */
  minWorthwhileLift: number;
  /** Something else the learner knows about how the test ran, e.g. that it stopped early. */
  context?: string;
  /** A flaw in how the test was run. With one, the right call is to wait. */
  issue?: 'peeked_early' | 'confounded' | 'novelty_effect' | 'too_short';
  verdict: 'ship' | 'kill' | 'wait';
  /** What happens after each call, shown once the learner decides. */
  consequences: Record<'ship' | 'kill' | 'wait', string>;
}

export type Question =
  | MultipleChoiceQuestion
  | NumericEstimateQuestion
  | PredictRevealQuestion
  | TapOutlierQuestion
  | InboxTriageQuestion
  | SpotTheLieQuestion
  | CourtroomQuestion
  | BuildMetricQuestion
  | AbVerdictQuestion;

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

/** Three hints, shown one at a time. Supports `code` and **bold** like instructions. */
export interface CodeTaskHints {
  /** A gentle push in the right direction. */
  nudge: string;
  /** Names the pandas method or idea to use. */
  method: string;
  /** Nearly complete code with ____ blanks left to fill in. Shown as a code block. */
  example: string;
}

/** A task solved by writing and running Python. */
export interface CodeTask extends MissionTaskBase {
  kind: 'code';
  starterCode: string;
  /** Variables the learner's code should create, shown as a checklist, e.g. `["df"]`. */
  creates: string[];
  hints: CodeTaskHints;
}

/** A task answered in plain words, such as the final recommendation. */
export interface WrittenTask extends MissionTaskBase {
  kind: 'written';
  placeholder: string;
  /** Suggested length, shown to the learner. */
  suggestedSentences: { min: number; max: number };
  /** The answer needs at least this many words before it can be submitted. */
  minWords: number;
  /** Points learners tick for themselves before submitting. There is no automatic grading. */
  selfReview: Array<{ id: string; label: string }>;
  /** Shown after submitting, so learners can compare their own answer. */
  modelAnswer: string;
}

/**
 * A task answered with a challenge question, such as inbox triage or the courtroom. It is checked
 * in the browser, so it works while Python is still loading.
 */
export interface QuestionTask extends MissionTaskBase {
  kind: 'question';
  question: Question;
}

export type MissionTask = CodeTask | WrittenTask | QuestionTask;

/** Tasks that are checked automatically and pay XP: code and question tasks. */
export type GradedTask = CodeTask | QuestionTask;

export interface MissionDataset {
  /** Name of the file in Python's working directory, e.g. `deliveries.csv`. */
  fileName: string;
  /** Where the app fetches it from, relative to the site root. */
  url: string;
  columns: Array<{ name: string; description: string }>;
}

/**
 * A line on the mission complete screen. Placeholders such as `{orders}` are filled from the
 * mission's `facts`, worked out from the dataset. `requiresTask` shows the line only if that task
 * was passed; `unlessTask` hides it then.
 */
export interface MissionSummaryLine {
  text: string;
  requiresTask?: string;
  unlessTask?: string;
}

export interface Mission {
  id: string;
  title: string;
  /** Shown at the top of the workspace. At most 120 words. */
  brief: string;
  dataset: MissionDataset;
  /**
   * Facts about the dataset that the mission's Python checks report when they load, such as
   * `orders`. Summary lines can quote only these.
   */
  facts: readonly string[];
  /** Required tasks first, then stretch tasks. */
  tasks: MissionTask[];
  /** The mission complete screen. */
  summary: {
    /** What the learner did, in plain words. */
    whatYouDid: MissionSummaryLine[];
    /** A 3–4 line project description learners can adapt. No claims about jobs. */
    portfolio: MissionSummaryLine[];
  };
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  /**
   * The message that opens the unit, from a manager or client, shown once when the unit becomes
   * available. Null when the unit has no opening message.
   */
  hook: StoryMessage | null;
  /** In path order. */
  lessons: Lesson[];
  checkpoint: Checkpoint;
  missionId: string;
}
