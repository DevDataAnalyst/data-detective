import { describe, expect, it } from 'vitest';
import { churnReference, readChurn } from '../test/churnReference';
import type { Question } from './types';
import { formatIssues, validateMission, validateUnit } from './validate';
import { theFalseAlarm } from './mission2';
import { unit2 } from './unit2';

describe('unit 2 content', () => {
  it('passes validation', () => {
    expect(formatIssues(validateUnit(unit2))).toBe('');
  });

  it('opens with the founder’s message', () => {
    expect(unit2.hook?.from).toBe('Ritika');
    expect(unit2.hook?.text).toMatch(/200 subscribers/);
  });
});

describe('mission 2 content', () => {
  it('passes validation', () => {
    expect(formatIssues(validateMission(theFalseAlarm))).toBe('');
  });
});

describe('unit 2 numbers match the churn dataset', () => {
  const reference = churnReference();
  const { rows } = readChurn();
  const april = rows.filter((row) => row.month === reference.lastMonth);
  const students = april.find((row) => row.segment === 'student');
  const questions = [
    ...unit2.lessons.flatMap((lesson) => lesson.questions),
    ...unit2.checkpoint.items.map((item) => item.question),
  ];
  const question = <T extends Question['type']>(id: string, type: T) => {
    const found = questions.find((candidate) => candidate.id === id);
    if (found?.type !== type) throw new Error(`No ${type} question ${id}`);
    return found as Extract<Question, { type: T }>;
  };
  const percent1 = (value: number) => Math.round(value * 1000) / 10;

  it('plots the real monthly churn rates in lesson 7', () => {
    const plotted = question('u2-predict-mean-churn', 'predict_reveal').dataset.values;
    expect(plotted).toEqual(reference.recentRatesPercent);
    for (const id of ['u2-estimate-sd-churn', 'u2-tap-unusual-months']) {
      const found = questions.find((candidate) => candidate.id === id);
      expect(found && 'dataset' in found ? found.dataset?.values : null).toEqual(plotted);
    }
    expect(question('u2-z-score-april', 'multiple_choice').givens?.april).toBe(
      percent1(reference.lastRate),
    );
  });

  it('quotes April 2026 exactly', () => {
    expect(reference.lastCancelled).toBe(200);
    const churnCards = question('u2-build-churn', 'build_metric').cards.map((card) => card.value);
    expect(churnCards.slice(0, 3)).toEqual([
      200,
      april.reduce((sum, row) => sum + row.newSignups, 0),
      reference.lastSubscribers,
    ]);
    for (const id of ['u2-churn-given-student', 'u2-cp-cancelled-given-student']) {
      expect(question(id, 'multiple_choice').givens).toMatchObject({
        students: students?.subscribersStart,
        student_cancelled: students?.cancelled,
        cancelled: reference.lastCancelled,
      });
    }
  });

  it('shows real April rates, and Priya’s chart uses real months', () => {
    const table = question('u2-aprils-table', 'multiple_choice').table;
    expect(table?.rows).toEqual(
      Object.entries(reference.monthlyRates)
        .filter(([month]) => month.endsWith('-04'))
        .map(([month, rate]) => [month.slice(0, 4), `${percent1(rate).toFixed(1)}%`]),
    );
    const chart = question('u2-lie-cherry-april', 'spot_the_lie').chart;
    const shown = reference.months.filter((month) => month >= '2025-01');
    expect(chart.series[0].values).toEqual(
      shown.map((month) => percent1(reference.monthlyRates[month])),
    );
    const bars = question('u2-cp-lie-april-bars', 'spot_the_lie').chart.series[0].values;
    expect(bars).toEqual([reference.monthlyCancelled['2026-03'], reference.lastCancelled]);
  });
});

describe('mission 2 numbers match the churn dataset', () => {
  const reference = churnReference();

  it('shows the real April rates by segment in the courtroom exhibit', () => {
    const task = theFalseAlarm.tasks.find((candidate) => candidate.id === 'redesign-claim');
    if (task?.kind !== 'question' || task.question.type !== 'courtroom') {
      throw new Error('No courtroom task');
    }
    const rate = (month: string, segment: string) =>
      `${(Math.round(reference.aprilRatesBySegment[month][segment] * 1000) / 10).toFixed(1)}%`;
    expect(task.question.table?.rows).toEqual(
      ['student', 'professional', 'family'].map((segment) => [
        segment,
        rate('2025-04', segment),
        rate('2026-04', segment),
      ]),
    );
  });

  it('asks for the variables the Python checks look for', () => {
    expect(theFalseAlarm.tasks.map((task) => [task.id, task.kind])).toEqual([
      ['pin-the-question', 'question'],
      ['churn-rate', 'code'],
      ['by-segment', 'code'],
      ['every-april', 'code'],
      ['redesign-claim', 'question'],
      ['recommendation', 'written'],
      ['student-chart', 'code'],
    ]);
    expect(
      theFalseAlarm.tasks.flatMap((task) => (task.kind === 'code' ? task.creates : [])),
    ).toEqual(['df', 'april_rate', 'base_rate', 'segment_rates', 'student_aprils']);
  });
});
