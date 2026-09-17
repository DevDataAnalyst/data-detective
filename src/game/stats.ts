/**
 * Descriptive statistics used by content validation, grading and the lesson visuals.
 * Quartiles default to linear interpolation, which matches pandas' default `quantile`.
 */

export const STATISTICS = [
  'count',
  'sum',
  'min',
  'max',
  'mean',
  'median',
  'mode',
  'range',
  'q1',
  'q3',
  'iqr',
  'std_dev',
  'lower_fence',
  'upper_fence',
] as const;

export type Statistic = (typeof STATISTICS)[number];

export function isStatistic(name: string): name is Statistic {
  return (STATISTICS as readonly string[]).includes(name);
}

/**
 * - `linear`: pandas default (numpy "linear" / Hyndman–Fan type 7).
 * - `inclusive`: median of each half, counting the median in both halves when n is odd.
 * - `exclusive`: median of each half, leaving the median out when n is odd (common in textbooks).
 */
export type QuartileMethod = 'linear' | 'inclusive' | 'exclusive';

function assertNonEmpty(values: readonly number[]): void {
  if (values.length === 0) throw new Error('Expected at least one value');
}

export function sortNumbers(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values: readonly number[]): number {
  assertNonEmpty(values);
  return sum(values) / values.length;
}

export function median(values: readonly number[]): number {
  assertNonEmpty(values);
  const sorted = sortNumbers(values);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** All values that share the highest count. Empty when every value appears once. */
export function modes(values: readonly number[]): number[] {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const highest = Math.max(0, ...counts.values());
  if (highest <= 1) return [];
  return sortNumbers([...counts].filter(([, count]) => count === highest).map(([value]) => value));
}

export function min(values: readonly number[]): number {
  assertNonEmpty(values);
  return Math.min(...values);
}

export function max(values: readonly number[]): number {
  assertNonEmpty(values);
  return Math.max(...values);
}

export function range(values: readonly number[]): number {
  return max(values) - min(values);
}

/** Linear-interpolation quantile, identical to pandas `Series.quantile(p)`. */
export function quantile(values: readonly number[], p: number): number {
  assertNonEmpty(values);
  const sorted = sortNumbers(values);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function quartiles(
  values: readonly number[],
  method: QuartileMethod = 'linear',
): { q1: number; q3: number } {
  assertNonEmpty(values);
  if (method === 'linear') return { q1: quantile(values, 0.25), q3: quantile(values, 0.75) };

  const sorted = sortNumbers(values);
  const n = sorted.length;
  if (n < 2) return { q1: sorted[0], q3: sorted[0] };
  const odd = n % 2 === 1;
  const half = Math.floor(n / 2);
  const lowerHalf =
    odd && method === 'inclusive' ? sorted.slice(0, half + 1) : sorted.slice(0, half);
  const upperHalf = odd && method === 'exclusive' ? sorted.slice(half + 1) : sorted.slice(half);
  return { q1: median(lowerHalf), q3: median(upperHalf) };
}

export function iqr(values: readonly number[], method: QuartileMethod = 'linear'): number {
  const { q1, q3 } = quartiles(values, method);
  return q3 - q1;
}

/** Tukey fences: values beyond Q1 − k·IQR or Q3 + k·IQR are outliers. */
export function iqrFences(
  values: readonly number[],
  method: QuartileMethod = 'linear',
  k = 1.5,
): { lower: number; upper: number } {
  const { q1, q3 } = quartiles(values, method);
  const spread = q3 - q1;
  return { lower: q1 - k * spread, upper: q3 + k * spread };
}

/** Indices (in the original order) of values outside the IQR fences. */
export function outlierIndices(
  values: readonly number[],
  method: QuartileMethod = 'linear',
  k = 1.5,
): number[] {
  const { lower, upper } = iqrFences(values, method, k);
  return values.flatMap((value, index) => (value < lower || value > upper ? [index] : []));
}

export function variance(values: readonly number[], options: { sample?: boolean } = {}): number {
  assertNonEmpty(values);
  const avg = mean(values);
  const squares = sum(values.map((value) => (value - avg) ** 2));
  const divisor = options.sample ? values.length - 1 : values.length;
  return divisor > 0 ? squares / divisor : 0;
}

/** Population standard deviation by default; pass `sample: true` for pandas' `.std()`. */
export function stdDev(values: readonly number[], options: { sample?: boolean } = {}): number {
  return Math.sqrt(variance(values, options));
}

/** Moment coefficient of skewness (population). Positive means a longer right tail. */
export function skewness(values: readonly number[]): number {
  const sd = stdDev(values);
  if (sd === 0) return 0;
  const avg = mean(values);
  return mean(values.map((value) => ((value - avg) / sd) ** 3));
}

export interface StatisticOptions {
  quartileMethod?: QuartileMethod;
  sampleStdDev?: boolean;
}

export function computeStatistic(
  statistic: Statistic,
  values: readonly number[],
  options: StatisticOptions = {},
): number {
  const method = options.quartileMethod ?? 'linear';
  switch (statistic) {
    case 'count':
      return values.length;
    case 'sum':
      return sum(values);
    case 'min':
      return min(values);
    case 'max':
      return max(values);
    case 'mean':
      return mean(values);
    case 'median':
      return median(values);
    case 'mode': {
      const found = modes(values);
      if (found.length !== 1) throw new Error('The data does not have a single mode');
      return found[0];
    }
    case 'range':
      return range(values);
    case 'q1':
      return quartiles(values, method).q1;
    case 'q3':
      return quartiles(values, method).q3;
    case 'iqr':
      return iqr(values, method);
    case 'std_dev':
      return stdDev(values, { sample: options.sampleStdDev });
    case 'lower_fence':
      return iqrFences(values, method).lower;
    case 'upper_fence':
      return iqrFences(values, method).upper;
  }
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
