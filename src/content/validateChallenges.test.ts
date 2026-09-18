import { describe, expect, it } from 'vitest';
import { PREVIEW_QUESTIONS } from '../dev/previewQuestions';
import type {
  BuildMetricQuestion,
  CourtroomQuestion,
  InboxTriageQuestion,
  Question,
  SpotTheLieQuestion,
} from './types';
import { formatIssues, validateQuestion } from './validate';

function find<T extends Question['type']>(type: T, index = 0) {
  const matches = PREVIEW_QUESTIONS.filter((question) => question.type === type);
  return structuredClone(matches[index]) as Extract<Question, { type: T }>;
}

const messages = (question: Question) =>
  validateQuestion(question, 'q')
    .map((found) => found.message)
    .join('\n');

describe('placeholder challenge questions', () => {
  it('pass validation', () => {
    const issues = PREVIEW_QUESTIONS.flatMap((question) => validateQuestion(question, question.id));
    expect(formatIssues(issues)).toBe('');
  });

  it('cover every challenge type two or three times', () => {
    for (const type of ['inbox_triage', 'spot_the_lie', 'courtroom', 'build_metric']) {
      const count = PREVIEW_QUESTIONS.filter((question) => question.type === type).length;
      expect(count, type).toBeGreaterThanOrEqual(2);
      expect(count, type).toBeLessThanOrEqual(3);
    }
  });
});

describe('inbox triage validation', () => {
  it('needs exactly three candidates', () => {
    const question: InboxTriageQuestion = find('inbox_triage');
    question.candidates = question.candidates.slice(0, 2);
    question.answerableIndex = 0;
    question.candidates[0].flaw = undefined;
    expect(messages(question)).toMatch(/needs exactly 3/);
  });

  it('names a flaw for every candidate except the answerable one', () => {
    const question: InboxTriageQuestion = find('inbox_triage');
    const wrong = question.candidates.findIndex((_, index) => index !== question.answerableIndex);
    question.candidates[wrong].flaw = undefined;
    expect(messages(question)).toMatch(/name its flaw/);
  });

  it('rejects an answerable candidate that has a flaw', () => {
    const question: InboxTriageQuestion = find('inbox_triage');
    question.candidates[question.answerableIndex].flaw = 'too_vague';
    expect(messages(question)).toMatch(/points at a candidate that has a flaw/);
  });

  it('checks the message: an email needs a subject, and long messages are cut', () => {
    const question: InboxTriageQuestion = find('inbox_triage');
    question.message = { ...question.message, channel: 'email', subject: undefined };
    question.message.text = 'word '.repeat(90);
    const found = messages(question);
    expect(found).toMatch(/an email needs a subject/);
    expect(found).toMatch(/has 90 words/);
  });

  it('refuses placeholders, because there is no dataset to fill them from', () => {
    const question: InboxTriageQuestion = find('inbox_triage');
    question.prompt = 'About {mean} orders?';
    expect(messages(question)).toMatch(/\{mean\} needs the question to have a dataset/);
  });
});

describe('spot the lie validation', () => {
  it('checks the chart really has the trick the question names', () => {
    const question: SpotTheLieQuestion = find('spot_the_lie');
    question.chart.axis.min = 0;
    expect(messages(question)).toMatch(/does not show truncated_axis/);
  });

  it('does not count a truncated axis that barely exaggerates', () => {
    const question: SpotTheLieQuestion = find('spot_the_lie');
    question.chart.axis = { ...question.chart.axis, min: 500 };
    expect(messages(question)).toMatch(/exaggerate differences 1\.0\d×/);
  });

  it('wants one trick per chart', () => {
    const question: SpotTheLieQuestion = find('spot_the_lie', 1);
    question.chart.kind = 'bar';
    question.chart.axis.min = 85;
    expect(messages(question)).toMatch(/also shows truncated_axis/);
  });

  it('catches values drawn off the chart and a window that hides nothing', () => {
    const question: SpotTheLieQuestion = find('spot_the_lie', 1);
    question.chart.series[0].values[10] = 200;
    question.chart.window = { from: 0, to: 11 };
    const found = messages(question);
    expect(found).toMatch(/outside its axis/);
    expect(found).toMatch(/hides nothing/);
  });

  it('needs a right axis when a series uses one', () => {
    const question: SpotTheLieQuestion = find('spot_the_lie', 2);
    question.chart.rightAxis = undefined;
    expect(messages(question)).toMatch(/add rightAxis/);
  });

  it('checks series lengths and option indices', () => {
    const question: SpotTheLieQuestion = find('spot_the_lie');
    question.chart.series[0].values.push(1000);
    question.correctIndex = 7;
    const found = messages(question);
    expect(found).toMatch(/has 3 values for 2 labels/);
    expect(found).toMatch(/correctIndex.*|is outside the options/);
  });
});

describe('courtroom validation', () => {
  it('needs two different witnesses and two or three suspects', () => {
    const question: CourtroomQuestion = find('courtroom');
    question.witnesses = [question.witnesses[0], { ...question.witnesses[0] }];
    question.suspects = [question.suspects[0]];
    question.confounderIndex = 0;
    const found = messages(question);
    expect(found).toMatch(/names must be different/);
    expect(found).toMatch(/should argue different causes/);
    expect(found).toMatch(/needs 2–3 suspects/);
  });

  it('checks the confounder index and the exhibit table', () => {
    const question: CourtroomQuestion = find('courtroom', 2);
    question.confounderIndex = 3;
    question.table?.rows.push(['Evening']);
    const found = messages(question);
    expect(found).toMatch(/confounderIndex|is outside the suspects/);
    expect(found).toMatch(/has 1 cells for 3 columns/);
  });
});

describe('build the metric validation', () => {
  it('needs distractor cards and two different picks', () => {
    const question: BuildMetricQuestion = find('build_metric');
    question.cards = question.cards.slice(0, 2);
    question.numeratorIndex = 0;
    question.denominatorIndex = 0;
    const found = messages(question);
    expect(found).toMatch(/needs 3–6 cards/);
    expect(found).toMatch(/must be different cards/);
  });

  it('checks the values make sense for the metric', () => {
    const question: BuildMetricQuestion = find('build_metric');
    question.cards[question.numeratorIndex].value = 50000;
    expect(messages(question)).toMatch(/cannot have a bigger top than bottom/);

    const partial: BuildMetricQuestion = find('build_metric');
    partial.cards[1].value = undefined;
    expect(messages(partial)).toMatch(/give every card a value, or none/);
  });
});
