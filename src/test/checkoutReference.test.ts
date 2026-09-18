import { describe, expect, it } from 'vitest';
import { checkoutReference } from './checkoutReference';

/**
 * The checkout dataset's planted patterns, as documented in scripts/README.md. If the generator
 * changes, update the README, Unit 3's content and these numbers together.
 */
describe('reference answers for the checkout dataset', () => {
  const reference = checkoutReference();
  const percent = (value: number, decimals = 2) => +(value * 100).toFixed(decimals);

  it('covers two full weeks for both checkouts', () => {
    expect(reference.header).toEqual(['date', 'day', 'variant', 'visitors', 'orders']);
    expect(reference.rows).toBe(28);
    expect(reference.days).toBe(14);
    expect([reference.firstDate, reference.lastDate]).toEqual(['2026-08-03', '2026-08-16']);
    expect(reference.visitors).toBe(91792);
  });

  it('makes the new checkout look clearly better overall', () => {
    expect(reference.old).toEqual({ visitors: 61201, conversions: 2356 });
    expect(reference.new).toEqual({ visitors: 30591, conversions: 1433 });
    expect(percent(reference.oldRate)).toBe(3.85);
    expect(percent(reference.newRate)).toBe(4.68);
    expect(reference.overall.difference).toBeCloseTo(0.83, 2);
    expect(reference.overall.pValue).toBeLessThan(0.0001);
  });

  it('hides a weekday effect: day for day, the two checkouts convert the same', () => {
    expect(percent(reference.weekday.oldRate)).toBe(3.46);
    expect(percent(reference.weekday.newRate)).toBe(3.43);
    expect(percent(reference.weekend.oldRate)).toBe(5.43);
    expect(percent(reference.weekend.newRate)).toBe(5.54);
    expect(reference.weekday.stats.pValue).toBeGreaterThan(0.25);
    expect(reference.weekend.stats.pValue).toBeGreaterThan(0.25);
    expect(percent(reference.weekday.rate, 1)).toBe(3.5);
    expect(percent(reference.weekend.rate, 1)).toBe(5.5);
  });

  it('sent most of the new checkout’s visitors to the high-converting weekend', () => {
    expect(percent(reference.weekendShare.new, 1)).toBe(59.5);
    expect(percent(reference.weekendShare.old, 1)).toBe(19.8);
  });
});
