import { describe, expect, it } from 'vitest';
import { interviewReference } from '../test/interviewReference';
import { theFinalRound } from './mission4';
import type { Question } from './types';
import { unit4 } from './unit4';
import { formatIssues, validateMission, validateUnit } from './validate';

const questions: Question[] = [
  ...unit4.lessons.flatMap((lesson) => lesson.questions),
  ...unit4.checkpoint.items.map((item) => item.question),
];

describe('unit 4 content', () => {
  it('passes validation', () => {
    expect(formatIssues(validateUnit(unit4))).toBe('');
  });

  it('opens with the interviewer’s email', () => {
    expect(unit4.hook).toMatchObject({ from: 'Kavya', channel: 'email' });
  });

  it('teaches the six-step routine first, then SQL, pandas and explaining', () => {
    expect(unit4.lessons.map((lesson) => lesson.id)).toEqual([
      'think-before-you-type',
      'how-sql-runs',
      'joins-without-double-counting',
      'window-functions',
      'pandas-patterns',
      'rates-and-retention',
      'check-and-explain',
    ]);
  });

  it('proves its code answers by running them: most questions carry code', () => {
    const withCode = questions.filter(
      (question) =>
        (question.type === 'multiple_choice' && question.code) ||
        (question.type === 'order_steps' && question.language),
    );
    expect(withCode.length).toBeGreaterThanOrEqual(25);
    const checks = new Set(
      questions.flatMap((question) =>
        question.type === 'multiple_choice' && question.check ? [question.check.kind] : [],
      ),
    );
    for (const kind of ['sql_value', 'sql_rows', 'sql_blank', 'python_output', 'python_blank']) {
      expect(checks, kind).toContain(kind);
    }
  });

  it('names the common mistake in every explanation', () => {
    for (const question of questions) {
      expect(question.explanation, question.id).toMatch(/common mistake/);
    }
  });
});

describe('mission 4 content', () => {
  it('passes validation', () => {
    expect(formatIssues(validateMission(theFinalRound))).toBe('');
  });

  it('walks the routine: clarify, plan, inspect, build, diagnose, check, explain', () => {
    expect(theFinalRound.tasks.map((task) => [task.id, task.kind])).toEqual([
      ['clarify', 'question'],
      ['plan', 'question'],
      ['grain', 'code'],
      ['revenue', 'code'],
      ['dashboard-gap', 'question'],
      ['second-way', 'code'],
      ['explain', 'written'],
      ['best-sellers', 'code'],
    ]);
    const languages = theFinalRound.tasks.flatMap((task) =>
      task.kind === 'code' ? [[task.id, task.language ?? 'python']] : [],
    );
    expect(languages).toEqual([
      ['grain', 'sql'],
      ['revenue', 'sql'],
      ['second-way', 'python'],
      ['best-sellers', 'sql'],
    ]);
  });
});

describe('unit 4 numbers match the interview dataset', () => {
  const reference = interviewReference();
  const lakh = (amount: number, decimals = 1) => `₹${(amount / 100_000).toFixed(decimals)} lakh`;
  const grouped = (value: number) => value.toLocaleString('en-IN');
  const revenue = Object.fromEntries(reference.revenue);
  const dashboard = Object.fromEntries(reference.dashboard);

  it('plants the twist: counted once Mumbai leads, but the join puts Pune far ahead', () => {
    expect(reference.revenue.slice(0, 2).map(([city]) => city)).toEqual(['Mumbai', 'Pune']);
    expect(reference.dashboard[0][0]).toBe('Pune');
    expect(reference.itemRevenue).toEqual(revenue);
  });

  it('backs the courtroom notes: few cancellations, and Pune nearly four times too big', () => {
    for (const share of Object.values(reference.cancelShare)) expect(share).toBeLessThan(0.1);
    const inflation = dashboard.Pune / revenue.Pune;
    expect(inflation).toBeGreaterThan(3.5);
    expect(inflation).toBeLessThan(4);
  });

  it('quotes the dashboard and the orders table correctly in the courtroom exhibit', () => {
    const task = theFinalRound.tasks.find((candidate) => candidate.id === 'dashboard-gap');
    if (task?.kind !== 'question' || task.question.type !== 'courtroom') {
      throw new Error('No courtroom task');
    }
    const { evidence, table } = task.question;
    expect(evidence).toContain(`Pune brought in ${lakh(dashboard.Pune)}`);
    expect(evidence).toContain(`add up to ${lakh(revenue.Pune)}`);
    expect(table?.rows).toEqual(
      ['Mumbai', 'Pune', 'Bengaluru'].map((city) => [
        city,
        grouped(reference.ordersByCity[city]),
        grouped(reference.itemRowsByCity[city]),
        reference.rowsPerOrder[city].toFixed(1),
      ]),
    );
    expect(task.question.explanation).toContain(
      `about ${reference.rowsPerOrder.Pune.toFixed(1)} items`,
    );
  });

  it('quotes the real totals in the model answer and the lessons', () => {
    const written = theFinalRound.tasks.find((task) => task.id === 'explain');
    if (written?.kind !== 'written') throw new Error('No written task');
    expect(written.modelAnswer).toContain(`₹${grouped(revenue.Mumbai)}`);
    expect(written.modelAnswer).toContain(`₹${grouped(revenue.Pune)}`);
    expect(written.modelAnswer).toContain(`about ${reference.rowsPerOrder.Pune.toFixed(1)} items`);

    const chart = questions.find((question) => question.id === 'u4-lie-ranking');
    if (chart?.type !== 'spot_the_lie') throw new Error('No ranking chart');
    expect(chart.chart.series[0].values).toEqual(
      ['Mumbai', 'Pune', 'Bengaluru'].map((city) => Number((revenue[city] / 100_000).toFixed(2))),
    );
    expect(chart.options[chart.correctIndex]).toContain(
      `${Math.round((revenue.Mumbai / revenue.Pune - 1) * 100)}% lead`,
    );

    const repeat = questions.find((question) => question.id === 'u4-cp-repeat-rate');
    if (repeat?.type !== 'build_metric') throw new Error('No repeat-rate question');
    expect(repeat.cards.map((card) => card.value)).toContain(reference.customers);
    expect(repeat.cards.map((card) => card.value)).toContain(reference.orders);
  });
});
