import { describe, expect, it } from 'vitest';
import { abStats } from '../game/abTest';
import { checkoutReference } from '../test/checkoutReference';
import { theCheckoutRedesign } from './mission3';
import type { Question } from './types';
import { unit3 } from './unit3';
import { formatIssues, validateMission, validateUnit } from './validate';

describe('unit 3 content', () => {
  it('passes validation', () => {
    expect(formatIssues(validateUnit(unit3))).toBe('');
  });

  it('opens with the product manager’s email', () => {
    expect(unit3.hook).toMatchObject({ from: 'Arjun', channel: 'email' });
  });

  it('uses the A/B verdict to teach all three calls', () => {
    const verdicts = [
      ...unit3.lessons.flatMap((lesson) => lesson.questions),
      ...unit3.checkpoint.items.map((item) => item.question),
    ].flatMap((question) => (question.type === 'ab_verdict' ? [question.verdict] : []));
    expect(new Set(verdicts)).toEqual(new Set(['ship', 'kill', 'wait']));
  });
});

describe('mission 3 content', () => {
  it('passes validation', () => {
    expect(formatIssues(validateMission(theCheckoutRedesign))).toBe('');
  });

  it('asks for the variables the Python checks look for, in a sensible order', () => {
    expect(theCheckoutRedesign.tasks.map((task) => [task.id, task.kind])).toEqual([
      ['conversion', 'code'],
      ['significance', 'code'],
      ['weekend-question', 'question'],
      ['by-day-type', 'code'],
      ['the-call', 'question'],
      ['recommendation', 'written'],
      ['daily-chart', 'code'],
    ]);
    expect(
      theCheckoutRedesign.tasks.flatMap((task) => (task.kind === 'code' ? task.creates : [])),
    ).toEqual(['df', 'conversion', 'z', 'p_value', 'by_day_type']);
  });
});

describe('unit 3 numbers match the checkout dataset', () => {
  const reference = checkoutReference();
  const percent = (value: number, decimals = 1) => `${(value * 100).toFixed(decimals)}%`;
  const count = (value: number) => value.toLocaleString('en-IN');
  const questions: Question[] = [
    ...unit3.lessons.flatMap((lesson) => lesson.questions),
    ...unit3.checkpoint.items.map((item) => item.question),
  ];
  const find = <T extends Question['type']>(id: string, type: T) => {
    const found = questions.find((question) => question.id === id);
    if (found?.type !== type) throw new Error(`No ${type} question ${id}`);
    return found as Extract<Question, { type: T }>;
  };

  it('quotes the overall rates in the hook and the lessons', () => {
    expect(unit3.hook?.text).toContain(
      `**${percent(reference.newRate)}** against ${percent(reference.oldRate)}`,
    );
    const cards = find('u3-build-conversion', 'build_metric').cards.map((card) => card.value);
    expect(cards.slice(0, 2)).toEqual([reference.new.conversions, reference.new.visitors]);
    const z = find('u3-build-z', 'build_metric').cards.map((card) => card.value);
    expect(z).toEqual([
      +reference.overall.difference.toFixed(1),
      +((reference.overall.ciHigh - reference.overall.difference) / 1.96).toFixed(2),
      +(reference.oldRate * 100).toFixed(1),
      reference.visitors,
    ]);
    expect(find('u3-plain-words', 'multiple_choice').options[1]).toBe(
      `p = ${reference.overall.pValue.toFixed(9)}, z = ${reference.overall.z.toFixed(2)}, pooled standard error 0.0014.`,
    );
  });

  it('builds the mission’s exhibit and verdict from the real counts', () => {
    const courtroom = theCheckoutRedesign.tasks.find((task) => task.id === 'weekend-question');
    const verdict = theCheckoutRedesign.tasks.find((task) => task.id === 'the-call');
    if (courtroom?.kind !== 'question' || courtroom.question.type !== 'courtroom') {
      throw new Error('No courtroom task');
    }
    if (verdict?.kind !== 'question' || verdict.question.type !== 'ab_verdict') {
      throw new Error('No verdict task');
    }
    const { weekday, weekend } = reference;
    expect(courtroom.question.table?.rows).toEqual([
      ['weekday', percent(weekday.rate), count(weekday.old.visitors), count(weekday.new.visitors)],
      ['weekend', percent(weekend.rate), count(weekend.old.visitors), count(weekend.new.visitors)],
    ]);
    expect(verdict.question.control).toMatchObject(reference.old);
    expect(verdict.question.variant).toMatchObject(reference.new);
    expect(verdict.question.context).toContain(
      `${percent(reference.weekendShare.new, 0)} of its visitors at weekends, against ${percent(reference.weekendShare.old, 0)}`,
    );
    const stats = abStats(reference.old, reference.new);
    expect(stats.pValue).toBeLessThan(0.05);
    expect(verdict.question.verdict).toBe('wait');
  });
});
