import { describe, expect, it } from 'vitest';
import { churnReference } from './churnReference';

/**
 * The churn dataset's planted patterns, as documented in scripts/README.md. If the generator
 * changes, update the README, Unit 2's content and these numbers together.
 */
describe('reference answers for the churn dataset', () => {
  const reference = churnReference();
  const percent = (value: number) => +(value * 100).toFixed(2);
  const percents = (values: Record<string, number>) =>
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key, percent(value)]));

  it('covers January 2024 to April 2026 for three segments', () => {
    expect(reference.header).toEqual([
      'month',
      'segment',
      'subscribers_start',
      'new_signups',
      'cancelled',
    ]);
    expect(reference.rows).toBe(84);
    expect(reference.months).toHaveLength(28);
    expect(reference.lastMonth).toBe('2026-04');
    expect(reference.segments).toEqual(['family', 'professional', 'student']);
  });

  it('has the founder’s 200 cancellations, the most ever, at a 3.98% churn rate', () => {
    expect(reference.lastCancelled).toBe(200);
    expect(reference.lastSubscribers).toBe(5022);
    expect(Math.max(...Object.values(reference.monthlyCancelled).slice(0, -1))).toBeLessThan(200);
    expect(percent(reference.lastRate)).toBe(3.98);
    expect(percent(reference.baseRate)).toBe(2.7);
    expect(percent(reference.baseRateMeanOfMonths)).toBe(2.7);
  });

  it('puts the whole spike in the student segment', () => {
    expect(percents(reference.segmentRatesLast)).toEqual({
      family: 2.2,
      professional: 2.6,
      student: 8.04,
    });
    expect(percents(reference.segmentBaseRates)).toEqual({
      family: 2.21,
      professional: 2.61,
      student: 3.35,
    });
  });

  it('shows students cancel about 8% every April, and about 3% otherwise', () => {
    expect(percents(reference.studentAprilRates)).toEqual({
      '2024-04': 7.8,
      '2025-04': 7.73,
      '2026-04': 8.04,
    });
    expect(percent(reference.studentOtherRate)).toBe(3.03);
  });

  it('gives lesson 7 its monthly rates, where only the Aprils stand out', () => {
    expect(reference.recentMonths[0]).toBe('2024-05');
    expect(reference.recentRatesPercent).toEqual([
      2.5, 2.5, 2.5, 2.5, 2.8, 2.7, 2.6, 2.8, 2.4, 2.7, 2.9, 3.7, 2.6, 2.4, 2.5, 2.7, 2.5, 2.6, 2.9,
      2.8, 2.4, 2.6, 2.3, 4,
    ]);
  });
});
