import { describe, expect, it } from 'vitest';
import type {
  MultipleChoiceQuestion,
  NumericEstimateQuestion,
  PredictRevealQuestion,
  Question,
  TapOutlierQuestion,
} from '../content/types';
import { PREVIEW_QUESTIONS } from '../dev/previewQuestions';
import { gradeAnswer, isAnswerReady, parseLearnerNumber } from './grading';

const multipleChoice: MultipleChoiceQuestion = {
  id: 'mc',
  type: 'multiple_choice',
  prompt: 'Pick one',
  options: ['A', 'B', 'C'],
  correctIndex: 2,
  explanation: 'C',
};

const estimate: NumericEstimateQuestion = {
  id: 'ne',
  type: 'numeric_estimate',
  prompt: 'Estimate the mean',
  dataset: { label: 'x', values: [28, 35, 31, 40, 26] },
  statistic: 'mean',
  correctValue: 32,
  tolerance: 3,
  explanation: '32',
};

const predict: PredictRevealQuestion = {
  id: 'pr',
  type: 'predict_reveal',
  prompt: 'Predict the SD',
  dataset: { label: 'x', values: [38, 30, 46, 34, 42] },
  statistic: 'std_dev',
  slider: { min: 0, max: 15, step: 0.5 },
  trueValue: 5.66,
  tolerance: 1.5,
  reveal: { visual: 'sd_band', description: 'band' },
  explanation: '5.66',
};

const tap: TapOutlierQuestion = {
  id: 'to',
  type: 'tap_outlier',
  prompt: 'Tap',
  dataset: { label: 'x', values: [36, 41, 12, 34, 39, 75, 38, 34, 41] },
  outlierIndices: [2, 5],
  explanation: '12 and 75',
};

describe('gradeAnswer', () => {
  it('grades multiple choice by index', () => {
    expect(gradeAnswer(multipleChoice, { type: 'multiple_choice', selectedIndex: 2 })).toBe(true);
    expect(gradeAnswer(multipleChoice, { type: 'multiple_choice', selectedIndex: 0 })).toBe(false);
  });

  it('accepts estimates within the tolerance, including the edges', () => {
    const grade = (value: number) => gradeAnswer(estimate, { type: 'numeric_estimate', value });
    expect(grade(32)).toBe(true);
    expect(grade(29)).toBe(true);
    expect(grade(35)).toBe(true);
    expect(grade(35.01)).toBe(false);
    expect(grade(28.9)).toBe(false);
  });

  it('grades predictions against the true value', () => {
    const grade = (value: number) => gradeAnswer(predict, { type: 'predict_reveal', value });
    expect(grade(7)).toBe(true);
    expect(grade(4.5)).toBe(true);
    expect(grade(8)).toBe(false);
  });

  it('needs exactly the outliers selected, in any order', () => {
    const grade = (selectedIndices: number[]) =>
      gradeAnswer(tap, { type: 'tap_outlier', selectedIndices });
    expect(grade([5, 2])).toBe(true);
    expect(grade([2])).toBe(false);
    expect(grade([2, 5, 0])).toBe(false);
  });

  it('marks an answer of the wrong type as incorrect', () => {
    expect(gradeAnswer(estimate, { type: 'predict_reveal', value: 32 })).toBe(false);
  });
});

describe('isAnswerReady', () => {
  it('needs a choice, a number, or at least one tapped value', () => {
    expect(isAnswerReady(null)).toBe(false);
    expect(isAnswerReady({ type: 'multiple_choice', selectedIndex: 0 })).toBe(true);
    expect(isAnswerReady({ type: 'numeric_estimate', value: Number.NaN })).toBe(false);
    expect(isAnswerReady({ type: 'tap_outlier', selectedIndices: [] })).toBe(false);
    expect(isAnswerReady({ type: 'tap_outlier', selectedIndices: [1] })).toBe(true);
  });
});

describe('parseLearnerNumber', () => {
  it('reads what learners actually type', () => {
    expect(parseLearnerNumber('32')).toBe(32);
    expect(parseLearnerNumber(' 4.5 ')).toBe(4.5);
    expect(parseLearnerNumber('₹11,000')).toBe(11000);
    expect(parseLearnerNumber('32 min')).toBe(32);
    expect(parseLearnerNumber('.5')).toBe(0.5);
    expect(parseLearnerNumber('')).toBeNull();
    expect(parseLearnerNumber('about thirty')).toBeNull();
  });
});

describe('challenge question grading', () => {
  const find = <T extends Question['type']>(type: T) =>
    PREVIEW_QUESTIONS.find((question) => question.type === type) as Extract<Question, { type: T }>;

  it('grades inbox triage, spot the lie and courtroom by the picked option', () => {
    const triage = find('inbox_triage');
    expect(
      gradeAnswer(triage, { type: 'inbox_triage', selectedIndex: triage.answerableIndex }),
    ).toBe(true);
    expect(
      gradeAnswer(triage, { type: 'inbox_triage', selectedIndex: triage.answerableIndex + 1 }),
    ).toBe(false);

    const lie = find('spot_the_lie');
    expect(gradeAnswer(lie, { type: 'spot_the_lie', selectedIndex: lie.correctIndex })).toBe(true);
    expect(gradeAnswer(lie, { type: 'courtroom', selectedIndex: lie.correctIndex })).toBe(false);

    const court = find('courtroom');
    expect(gradeAnswer(court, { type: 'courtroom', selectedIndex: court.confounderIndex })).toBe(
      true,
    );
    expect(gradeAnswer(court, { type: 'courtroom', selectedIndex: 2 })).toBe(false);
  });

  it('needs the metric’s top and bottom both right, and the right way up', () => {
    const metric = find('build_metric');
    const { numeratorIndex: top, denominatorIndex: bottom } = metric;
    expect(gradeAnswer(metric, { type: 'build_metric', numerator: top, denominator: bottom })).toBe(
      true,
    );
    expect(gradeAnswer(metric, { type: 'build_metric', numerator: bottom, denominator: top })).toBe(
      false,
    );
    expect(isAnswerReady({ type: 'build_metric', numerator: top, denominator: null })).toBe(false);
    expect(isAnswerReady({ type: 'build_metric', numerator: top, denominator: bottom })).toBe(true);
    expect(isAnswerReady({ type: 'courtroom', selectedIndex: 0 })).toBe(true);
  });
});
