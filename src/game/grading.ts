import type { Question } from '../content/types';

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

export type Answer =
  MultipleChoiceAnswer | NumericEstimateAnswer | PredictRevealAnswer | TapOutlierAnswer;

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
      return Number.isInteger(answer.selectedIndex) && answer.selectedIndex >= 0;
    case 'numeric_estimate':
    case 'predict_reveal':
      return Number.isFinite(answer.value);
    case 'tap_outlier':
      return answer.selectedIndices.length > 0;
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
