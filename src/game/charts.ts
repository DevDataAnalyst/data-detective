/**
 * How a chart misleads, worked out from its data. Content validation uses these to check that a
 * "spot the lie" chart really does what the question says, and the question shows the honest
 * version of the chart after the learner answers.
 */
import type { ChartTrick, ClaimChart } from '../content/types';

/** A truncated bar chart counts as misleading when it makes differences look this much bigger. */
export const MIN_EXAGGERATION = 1.5;

/** Indices of the points the chart shows. */
export function visibleRange(chart: ClaimChart): { from: number; to: number } {
  return chart.window ?? { from: 0, to: chart.labels.length - 1 };
}

function leftValues(chart: ClaimChart): number[] {
  const { from, to } = visibleRange(chart);
  return chart.series
    .filter((series) => series.axis !== 'right')
    .flatMap((series) => series.values.slice(from, to + 1));
}

/**
 * How many times bigger the tallest bar looks than the shortest, compared with how many times
 * bigger it really is. 1 means honest. Infinity when the shortest bar is drawn with no height.
 */
export function exaggeration(chart: ClaimChart): number {
  const values = leftValues(chart);
  if (values.length < 2) return 1;
  const smallest = Math.min(...values);
  const largest = Math.max(...values);
  const baseline = chart.axis.min;
  if (smallest <= 0 || largest === smallest || baseline <= 0) return 1;
  const drawnSmallest = smallest - baseline;
  if (drawnSmallest <= 0) return Number.POSITIVE_INFINITY;
  return (largest - baseline) / drawnSmallest / (largest / smallest);
}

function change(values: readonly number[], from: number, to: number): number {
  return values[to] - values[from];
}

/**
 * The chart hides points that change the story: the full trend runs the other way or is flat;
 * the points before it include a jump just as big, so the "new" one is not new; or the stretch
 * shown sits far from the rest, like the first days of a test when anything new gets clicked.
 */
function isCherryPicked(chart: ClaimChart): boolean {
  if (!chart.window) return false;
  const { from, to } = chart.window;
  const last = chart.labels.length - 1;
  return chart.series.some((series) => {
    const { values } = series;
    const shown = change(values, from, to);
    const full = change(values, 0, last);
    if (shown === 0) return false;
    const reversed = Math.sign(shown) !== Math.sign(full) || Math.abs(full) <= Math.abs(shown) / 4;
    const margin = Math.abs(shown) / 4;
    // Only earlier points can show the "new" jump happened before.
    const before = values.slice(0, from);
    const precedent = before.some((value) =>
      shown > 0 ? value >= values[to] - margin : value <= values[to] + margin,
    );
    const average = (items: readonly number[]) =>
      items.reduce((sum, value) => sum + value, 0) / items.length;
    const spread = Math.max(...values) - Math.min(...values);
    const offLevel =
      spread > 0 && Math.abs(average(values.slice(from, to + 1)) - average(values)) >= spread / 3;
    return reversed || precedent || offLevel;
  });
}

/** Two series on separate axes with different scales, so their lines can be made to look alike. */
function isDualAxis(chart: ClaimChart): boolean {
  const right = chart.rightAxis;
  if (!right || !chart.series.some((series) => series.axis === 'right')) return false;
  return right.min !== chart.axis.min || right.max !== chart.axis.max;
}

/** Every trick the chart's data shows. */
export function chartTricks(chart: ClaimChart): ChartTrick[] {
  const found: ChartTrick[] = [];
  if (chart.kind === 'bar' && chart.axis.min > 0 && exaggeration(chart) >= MIN_EXAGGERATION) {
    found.push('truncated_axis');
  }
  if (isCherryPicked(chart)) found.push('cherry_picked_range');
  if (isDualAxis(chart)) found.push('dual_axis');
  return found;
}

/** A round number at or above `value`, for the top of an axis. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((multiple) => multiple * magnitude >= value) ?? 10;
  return step * magnitude;
}

/**
 * The same data drawn fairly: bars start at zero, every point is shown, and two series share one
 * axis, rescaled to 100 at their first point when their units differ.
 */
export function honestChart(chart: ClaimChart, trick: ChartTrick): ClaimChart {
  switch (trick) {
    case 'truncated_axis':
      return { ...chart, axis: { ...chart.axis, min: 0 } };
    case 'cherry_picked_range': {
      const values = chart.series.flatMap((series) => series.values);
      const low = Math.min(chart.axis.min, ...values);
      const high = Math.max(chart.axis.max, ...values);
      return {
        kind: chart.kind,
        title: chart.title,
        labels: chart.labels,
        series: chart.series,
        axis: { ...chart.axis, min: low, max: high },
        rightAxis: chart.rightAxis,
      };
    }
    case 'dual_axis': {
      const series = chart.series.map((item) => {
        const first = item.values[0];
        return {
          name: item.name,
          values: item.values.map((value) => (first === 0 ? value : (value / first) * 100)),
        };
      });
      const values = series.flatMap((item) => item.values);
      return {
        kind: chart.kind,
        title: chart.title,
        labels: chart.labels,
        window: chart.window,
        series,
        axis: {
          label: 'Index (first point = 100)',
          min: 0,
          max: niceCeiling(Math.max(...values)),
        },
      };
    }
  }
}

/** What the honest version changes, for the caption under it. */
export const HONEST_CHART_NOTES: Record<ChartTrick, string> = {
  truncated_axis: 'The same numbers with the bars starting at zero.',
  cherry_picked_range: 'The same numbers with every point shown, not just the chosen stretch.',
  dual_axis: 'Both lines on one axis, each set to 100 at its first point so they compare fairly.',
};
