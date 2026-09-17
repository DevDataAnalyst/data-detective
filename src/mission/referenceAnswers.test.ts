import { describe, expect, it } from 'vitest';
import { deliveriesReference } from '../test/deliveriesReference';

/**
 * The dataset's planted patterns, as documented in scripts/README.md. If the generator changes,
 * update the README and these numbers together. Grading itself computes answers from the CSV.
 */
describe('reference answers for the generated dataset', () => {
  const reference = deliveriesReference();

  it('has 600 orders, 18 missing delivery times and 42 missing ratings', () => {
    expect(reference.nOrders).toBe(600);
    expect(reference.missing).toEqual({ delivery_time_min: 18, rating: 42 });
    expect(reference.cleanRows).toBe(582);
  });

  it('puts the IQR fences at 12.875 and 55.875 minutes, flagging 13 outliers', () => {
    expect(reference.q1).toBe(29);
    expect(reference.q3).toBe(39.75);
    expect(reference.lower).toBe(12.875);
    expect(reference.upper).toBe(55.875);
    expect(reference.nOutliers).toBe(13);
  });

  it('makes Hyderabad look slowest by mean, while Kolkata is genuinely slowest', () => {
    const round = (values: Record<string, number>) =>
      Object.fromEntries(Object.entries(values).map(([key, value]) => [key, +value.toFixed(2)]));
    expect(round(reference.cityMean)).toEqual({
      Bengaluru: 33.91,
      Chennai: 35.74,
      Hyderabad: 48.51,
      Kolkata: 39.43,
      Pune: 35.63,
    });
    expect(reference.cityMedian).toEqual({
      Bengaluru: 34,
      Chennai: 34,
      Hyderabad: 34,
      Kolkata: 39,
      Pune: 33,
    });
    expect(round(reference.cityMeanNoOutliers)).toEqual({
      Bengaluru: 33.91,
      Chennai: 33.46,
      Hyderabad: 33.16,
      Kolkata: 38.31,
      Pune: 33.02,
    });
    expect(reference.rawSlowestCity).toBe('Hyderabad');
    expect(reference.slowestCity).toBe('Kolkata');
  });

  it('shows Kolkata slowing down at dinner time', () => {
    const dinner = [19, 20, 21, 22].map((hour) => reference.slowCityByHour[String(hour)]);
    const lunch = [12, 13].map((hour) => reference.slowCityByHour[String(hour)]);
    expect(Math.min(...dinner)).toBeGreaterThan(Math.max(...lunch) + 5);
  });
});
