import type { Question } from '../content/types';
import { VERDICTS } from './abTest';

export interface MultipleChoiceAnswer {
  type: 'multiple_choice';
  selectedIndex: number;
}

export interface NumericEstimateAnswer {
  type: 'numeric_estimate';
  value: number;
}

export interface PredictRevealAnswer {
  type: 'predict_reveal';
  value: number;
}

export interface TapOutlierAnswer {
  type: 'tap_outlier';
  selectedIndices: number[];
}

export interface InboxTriageAnswer {
  type: 'inbox_triage';
  selectedIndex: number;
}

export interface SpotTheLieAnswer {
  type: 'spot_the_lie';
  selectedIndex: number;
}

export interface CourtroomAnswer {
  type: 'courtroom';
  selectedIndex: number;
}

/** The call picked, by its position in `VERDICTS` (ship, kill, wait). */
export interface AbVerdictAnswer {
  type: 'ab_verdict';
  selectedIndex: number;
}

/** Step indices in the order the learner placed them, and how many steps there are. */
export interface OrderStepsAnswer {
  type: 'order_steps';
  order: number[];
  total: number;
}

/** Card indices placed on top and bottom of the fraction. */
export interface BuildMetricAnswer {
  type: 'build_metric';
  numerator: number | null;
  denominator: number | null;
}

export type Answer =
  | MultipleChoiceAnswer
  | NumericEstimateAnswer
  | PredictRevealAnswer
  | TapOutlierAnswer
  | InboxTriageAnswer
  | SpotTheLieAnswer
  | CourtroomAnswer
  | BuildMetricAnswer
  | AbVerdictAnswer
  | OrderStepsAnswer;

/** Guards against floating point noise when comparing with a tolerance. */
const EPSILON = 1e-9;

export function withinTolerance(value: number, target: number, tolerance: number): boolean {
  return Math.abs(value - target) <= tolerance + EPSILON;
}

/** Whether the learner has given enough of an answer to check it. */
export function isAnswerReady(answer: Answer | null): answer is Answer {
  if (!answer) return false;
  switch (answer.type) {
    case 'multiple_choice':
    case 'inbox_triage':
    case 'spot_the_lie':
    case 'courtroom':
    case 'ab_verdict':
      return Number.isInteger(answer.selectedIndex) && answer.selectedIndex >= 0;
    case 'build_metric':
      return answer.numerator !== null && answer.denominator !== null;
    case 'numeric_estimate':
    case 'predict_reveal':
      return Number.isFinite(answer.value);
    case 'tap_outlier':
      return answer.selectedIndices.length > 0;
    case 'order_steps':
      return answer.total > 0 && answer.order.length === answer.total;
  }
}

export function gradeAnswer(question: Question, answer: Answer): boolean {
  if (question.type === 'multiple_choice' && answer.type === 'multiple_choice') {
    return answer.selectedIndex === question.correctIndex;
  }
  if (question.type === 'numeric_estimate' && answer.type === 'numeric_estimate') {
    return withinTolerance(answer.value, question.correctValue, question.tolerance);
  }
  if (question.type === 'predict_reveal' && answer.type === 'predict_reveal') {
    return withinTolerance(answer.value, question.trueValue, question.tolerance);
  }
  if (question.type === 'tap_outlier' && answer.type === 'tap_outlier') {
    const selected = new Set(answer.selectedIndices);
    return (
      selected.size === question.outlierIndices.length &&
      question.outlierIndices.every((index) => selected.has(index))
    );
  }
  if (question.type === 'inbox_triage' && answer.type === 'inbox_triage') {
    return answer.selectedIndex === question.answerableIndex;
  }
  if (question.type === 'spot_the_lie' && answer.type === 'spot_the_lie') {
    return answer.selectedIndex === question.correctIndex;
  }
  if (question.type === 'courtroom' && answer.type === 'courtroom') {
    return answer.selectedIndex === question.confounderIndex;
  }
  if (question.type === 'ab_verdict' && answer.type === 'ab_verdict') {
    return VERDICTS[answer.selectedIndex] === question.verdict;
  }
  if (question.type === 'order_steps' && answer.type === 'order_steps') {
    return (
      answer.order.length === question.steps.length &&
      answer.order.every((step, position) => step === position)
    );
  }
  if (question.type === 'build_metric' && answer.type === 'build_metric') {
    return (
      answer.numerator === question.numeratorIndex &&
      answer.denominator === question.denominatorIndex
    );
  }
  return false;
}

/**
 * Reads a number the learner typed, forgiving the usual extras: "₹11,000", "32 min", " 4.5 ".
 * Returns null when there is no number to read.
 */
export function parseLearnerNumber(text: string): number | null {
  const cleaned = text.replace(/[₹,\s]/g, '');
  const match = cleaned.match(/^-?(?:\d+\.?\d*|\.\d+)/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}
