import { describe, expect, it } from 'vitest';
import { fillQuestionText } from './template';
import type {
  MultipleChoiceQuestion,
  NumericEstimateQuestion,
  PredictRevealQuestion,
  Question,
  TapOutlierQuestion,
} from './types';
import { unit1 } from './unit1';
import {
  CONTENT_LIMITS,
  countWords,
  formatIssues,
  isNumericOption,
  parseLeadingNumber,
  validateQuestion,
  validateUnit,
} from './validate';

const allQuestions: Question[] = [
  ...unit1.lessons.flatMap((lesson) => lesson.questions),
  ...unit1.checkpoint.items.map((item) => item.question),
];

describe('Unit 1 content', () => {
  it('passes validation, with every answer recomputed from its data', () => {
    expect(formatIssues(validateUnit(unit1))).toBe('');
  });

  it('has the seven lessons in path order', () => {
    expect(unit1.lessons.map((lesson) => lesson.title)).toEqual([
      "What's in a dataset?",
      'The mean',
      'Median and mode',
      'Mean vs median',
      'Spread: range and IQR',
      'Standard deviation',
      'Shapes of data',
    ]);
  });

  it('keeps lessons short: 6–8 questions and an intro of at most 80 words', () => {
    for (const lesson of unit1.lessons) {
      expect(lesson.questions.length).toBeGreaterThanOrEqual(6);
      expect(lesson.questions.length).toBeLessThanOrEqual(8);
      expect(countWords(lesson.intro)).toBeLessThanOrEqual(80);
    }
  });

  it('uses all four question types across the unit', () => {
    expect(new Set(allQuestions.map((question) => question.type))).toEqual(
      new Set(['multiple_choice', 'numeric_estimate', 'predict_reveal', 'tap_outlier']),
    );
  });

  it('has a 10-question checkpoint that covers every lesson and needs 80% to pass', () => {
    const { checkpoint } = unit1;
    expect(checkpoint.items).toHaveLength(10);
    expect(checkpoint.passMark).toBe(0.8);
    expect(new Set(checkpoint.items.map((item) => item.lessonId))).toEqual(
      new Set(unit1.lessons.map((lesson) => lesson.id)),
    );
  });

  it('backs every numeric multiple choice answer with a check, so none is trusted', () => {
    const unchecked = allQuestions.filter(
      (question): question is MultipleChoiceQuestion =>
        question.type === 'multiple_choice' &&
        isNumericOption(question.options[question.correctIndex]) &&
        !question.check,
    );
    expect(unchecked.map((question) => question.id)).toEqual([]);
  });

  it('fills every placeholder in prompts and explanations', () => {
    for (const question of allQuestions) {
      for (const text of [question.prompt, question.explanation]) {
        expect(fillQuestionText(question, text)).not.toMatch(/\{[a-z_0-9:]+\}/);
      }
    }
  });
});

describe('validateQuestion catches broken content', () => {
  const messages = (question: Question) =>
    validateQuestion(question, 'q').map((found) => found.message);

  const meanQuestion: MultipleChoiceQuestion = {
    id: 'broken-mean',
    type: 'multiple_choice',
    prompt: 'What is the mean?',
    dataset: { label: 'Delivery time', values: [28, 35, 31, 40, 26] },
    options: ['30', '32', '35'],
    correctIndex: 1,
    check: { kind: 'statistic', statistic: 'mean' },
    explanation: 'The total is {sum} over 5 orders.',
  };

  it('accepts a well-formed question', () => {
    expect(messages(meanQuestion)).toEqual([]);
  });

  it('flags a correct index outside the options', () => {
    expect(messages({ ...meanQuestion, correctIndex: 3 })).toContain('is outside the options');
  });

  it('flags a multiple choice answer that does not match the data', () => {
    expect(messages({ ...meanQuestion, correctIndex: 0 }).join()).toMatch(
      /says 30 but the data gives 32/,
    );
  });

  it('flags a numeric correct option with no check', () => {
    expect(messages({ ...meanQuestion, check: undefined }).join()).toMatch(/add a check/);
  });

  it('flags unknown placeholders', () => {
    expect(messages({ ...meanQuestion, explanation: 'About {average}.' }).join()).toMatch(
      /not a known statistic/,
    );
  });

  const estimate: NumericEstimateQuestion = {
    id: 'broken-estimate',
    type: 'numeric_estimate',
    prompt: 'Estimate the median.',
    dataset: { label: 'Commute time', values: [22, 25, 27, 30, 31, 34, 150] },
    statistic: 'median',
    correctValue: 30,
    tolerance: 2,
    explanation: 'The middle value is {median}.',
  };

  it('flags a numeric estimate whose value does not match its statistic', () => {
    expect(messages({ ...estimate, correctValue: 45.6 }).join()).toMatch(
      /says 45.6 but the median of the dataset is 30/,
    );
  });

  it('flags a tolerance that is not positive', () => {
    expect(messages({ ...estimate, tolerance: 0 })).toContain('must be a positive number');
    expect(messages({ ...estimate, tolerance: -1 })).toContain('must be a positive number');
  });

  it('flags quartile answers where another common method falls outside the tolerance', () => {
    const iqrEstimate: NumericEstimateQuestion = {
      ...estimate,
      dataset: { label: 'Marks', values: [45, 52, 58, 60, 63, 67, 70, 74, 88] },
      statistic: 'iqr',
      correctValue: 12,
      tolerance: 1,
      explanation: 'The IQR is {iqr}.',
    };
    expect(messages(iqrEstimate).join()).toMatch(/another common method gives 17/);
  });

  const predict: PredictRevealQuestion = {
    id: 'broken-predict',
    type: 'predict_reveal',
    prompt: 'Predict the mean.',
    dataset: { label: 'Runs', values: [12, 45, 30, 8, 60, 25] },
    statistic: 'mean',
    slider: { min: 0, max: 70, step: 1 },
    trueValue: 30,
    tolerance: 5,
    reveal: { visual: 'marker', description: 'A marker slides to the mean.' },
    explanation: 'The mean is {mean}.',
  };

  it('flags a predict and reveal question whose true value is outside the slider', () => {
    const found = messages({ ...predict, slider: { min: 40, max: 100, step: 1 } });
    expect(found).toContain('is outside the slider range');
  });

  it('flags a reveal visual that does not suit the statistic', () => {
    expect(
      messages({ ...predict, reveal: { ...predict.reveal, visual: 'iqr_box' } }).join(),
    ).toMatch(/does not suit mean/);
  });

  const tap: TapOutlierQuestion = {
    id: 'broken-tap',
    type: 'tap_outlier',
    prompt: 'Tap the outliers.',
    dataset: { label: 'Delivery time', values: [36, 41, 12, 34, 39, 75, 38, 34, 41] },
    outlierIndices: [2, 5],
    explanation: 'Outside {lower_fence} to {upper_fence}.',
  };

  it('accepts outliers that match the IQR rule', () => {
    expect(messages(tap)).toEqual([]);
  });

  it('flags outlier indices outside the dataset', () => {
    expect(messages({ ...tap, outlierIndices: [2, 9] })).toContain(
      'has an index outside the dataset',
    );
  });

  it('flags outlier indices that the IQR rule disagrees with', () => {
    expect(messages({ ...tap, outlierIndices: [5] }).join()).toMatch(/flags \[2, 5\], not \[5\]/);
  });

  it('keeps explanations short', () => {
    const long = Array.from({ length: CONTENT_LIMITS.explanationWords + 1 }, () => 'word').join(
      ' ',
    );
    expect(messages({ ...tap, explanation: long }).join()).toMatch(/keep it to 60 or fewer/);
  });
});

describe('option parsing', () => {
  it('reads numbers out of option labels', () => {
    expect(parseLeadingNumber('₹11,000')).toBe(11000);
    expect(parseLeadingNumber('4.5 GB')).toBe(4.5);
    expect(parseLeadingNumber('It rises to 40 minutes')).toBe(40);
    expect(parseLeadingNumber('The mean')).toBeNull();
  });

  it('treats only options that start with a number as numeric answers', () => {
    expect(isNumericOption('₹24k')).toBe(true);
    expect(isNumericOption('69.5')).toBe(true);
    expect(isNumericOption('Half the class scored above 62')).toBe(false);
  });
});

describe('code questions', () => {
  const orders = {
    caption: 'orders',
    columns: ['order_id', 'city'],
    rows: [
      [1, 'Pune'],
      [2, null],
    ],
  };
  const sqlQuestion: MultipleChoiceQuestion = {
    id: 'sql-count',
    type: 'multiple_choice',
    prompt: 'What does this return?',
    code: { language: 'sql', text: 'SELECT COUNT(city) FROM orders;' },
    tables: [orders],
    options: ['1', '2'],
    correctIndex: 0,
    check: { kind: 'sql_value' },
    explanation: 'COUNT(city) skips the NULL. The common mistake is counting rows instead.',
  };

  it('accepts a SQL question with code and tables to run against', () => {
    expect(formatIssues(validateQuestion(sqlQuestion, 'q'))).toBe('');
  });

  it('needs the code and tables a SQL check runs', () => {
    expect(formatIssues(validateQuestion({ ...sqlQuestion, code: undefined }, 'q'))).toContain(
      'needs some',
    );
    expect(formatIssues(validateQuestion({ ...sqlQuestion, tables: undefined }, 'q'))).toContain(
      'needs tables',
    );
  });

  it('needs exactly one blank for options to fill, and none otherwise', () => {
    const blank: MultipleChoiceQuestion = {
      ...sqlQuestion,
      options: ['COUNT(city)', 'COUNT(*)'],
      check: { kind: 'sql_blank', reference: 'SELECT COUNT(city) FROM orders' },
    };
    expect(formatIssues(validateQuestion(blank, 'q'))).toContain('exactly one ____');
    const filled = {
      ...blank,
      code: { language: 'sql' as const, text: 'SELECT ____ FROM orders;' },
    };
    expect(formatIssues(validateQuestion(filled, 'q'))).toBe('');
    const stray = { ...sqlQuestion, code: { language: 'sql' as const, text: 'SELECT ____;' } };
    expect(formatIssues(validateQuestion(stray, 'q'))).toContain('does not fill it');
  });

  it('keeps table and column names usable in SQL, and lines short enough for a phone', () => {
    const badName = { ...sqlQuestion, tables: [{ ...orders, caption: 'my orders' }] };
    expect(formatIssues(validateQuestion(badName, 'q'))).toContain('not a table name');
    const long = {
      ...sqlQuestion,
      code: {
        language: 'sql' as const,
        text: `SELECT COUNT(city) FROM orders WHERE ${'x'.repeat(40)}`,
      },
    };
    expect(formatIssues(validateQuestion(long, 'q'))).toContain(
      `keep to ${CONTENT_LIMITS.codeLineChars}`,
    );
  });

  it('checks the steps of an order question', () => {
    const steps: Question = {
      id: 'steps',
      type: 'order_steps',
      prompt: 'Order them.',
      steps: ['One', 'Two', 'Three'],
      explanation: 'One comes first. The common mistake is starting at two.',
    };
    expect(formatIssues(validateQuestion(steps, 'q'))).toBe('');
    expect(formatIssues(validateQuestion({ ...steps, steps: ['One', 'Two'] }, 'q'))).toContain(
      'needs 3–7 steps',
    );
    expect(
      formatIssues(validateQuestion({ ...steps, steps: ['One', 'Two', 'one'] }, 'q')),
    ).toContain('ambiguous');
    expect(formatIssues(validateQuestion({ ...steps, reference: 'SELECT 1' }, 'q'))).toContain(
      'lines of SQL',
    );
  });
});
