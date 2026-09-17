import { describe, expect, it } from 'vitest';
import {
  computeStatistic,
  iqrFences,
  mean,
  median,
  modes,
  outlierIndices,
  quantile,
  quartiles,
  range,
  skewness,
  stdDev,
  sum,
} from './stats';

describe('averages', () => {
  it('computes sum and mean', () => {
    expect(sum([28, 35, 31, 40, 26])).toBe(160);
    expect(mean([28, 35, 31, 40, 26])).toBe(32);
  });

  it('computes the median for odd and even counts, sorting first', () => {
    expect(median([34, 22, 41, 28, 30])).toBe(30);
    expect(median([3, 8, 5, 2])).toBe(4);
  });

  it('returns every mode, or none when all values are unique', () => {
    expect(modes([20, 45, 20, 8, 33, 20, 45])).toEqual([20]);
    expect(modes([1, 1, 2, 2, 3])).toEqual([1, 2]);
    expect(modes([30, 35, 40])).toEqual([]);
  });

  it('refuses to report a mode that is not unique', () => {
    expect(() => computeStatistic('mode', [1, 1, 2, 2])).toThrow();
    expect(computeStatistic('mode', [1, 1, 2])).toBe(1);
  });

  it('throws on empty data instead of returning NaN', () => {
    expect(() => mean([])).toThrow();
  });
});

describe('quartiles', () => {
  it('matches pandas linear interpolation', () => {
    // pd.Series([1, 2, 3, 4, 5, 6, 7, 8]).quantile([0.25, 0.75]) → 2.75, 6.25
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8], 0.25)).toBe(2.75);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8], 0.75)).toBe(6.25);
    expect(quartiles([28, 30, 33, 35, 38, 40, 42, 45, 380])).toEqual({ q1: 33, q3: 42 });
  });

  it('supports the two textbook "halves" methods', () => {
    const odd = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(quartiles(odd, 'exclusive')).toEqual({ q1: 2.5, q3: 7.5 });
    expect(quartiles(odd, 'inclusive')).toEqual({ q1: 3, q3: 7 });
    // For odd counts the inclusive method agrees with pandas.
    expect(quartiles(odd, 'linear')).toEqual({ q1: 3, q3: 7 });
    expect(quartiles([1, 2, 3, 4, 5, 6, 7, 8], 'exclusive')).toEqual({ q1: 2.5, q3: 6.5 });
  });

  it('flags outliers with the 1.5 × IQR rule, returning original indices', () => {
    const values = [36, 41, 12, 34, 39, 75, 38, 34, 41];
    expect(iqrFences(values)).toEqual({ lower: 23.5, upper: 51.5 });
    expect(outlierIndices(values)).toEqual([2, 5]);
  });

  it('computes the range', () => {
    expect(range([25, 40, 32, 58, 30])).toBe(33);
  });
});

describe('spread and shape', () => {
  it('computes population and sample standard deviation', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(stdDev(values)).toBe(2);
    expect(stdDev(values, { sample: true })).toBeCloseTo(Math.sqrt(32 / 7), 10);
  });

  it('gives skewness the sign of the longer tail', () => {
    expect(skewness([22, 24, 25, 26, 26, 27, 28, 28, 29, 30, 32, 35, 41, 50, 64])).toBeGreaterThan(
      1,
    );
    expect(skewness([35, 52, 68, 74, 78, 80, 82, 84, 85, 86, 88, 88, 90, 92, 95])).toBeLessThan(-1);
    expect(skewness([30, 34, 36, 38, 40, 40, 42, 44, 46, 50])).toBeCloseTo(0, 10);
    expect(skewness([5, 5, 5])).toBe(0);
  });
});
