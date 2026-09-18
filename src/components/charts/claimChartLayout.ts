/** Layout maths for bar and line charts. Pure, so it is tested without a browser. */
import { formatNumber } from '../../content/template';
import type { ChartAxis, ClaimChart } from '../../content/types';
import { visibleRange } from '../../game/charts';

export const CLAIM_CHART = {
  height: 230,
  top: 26,
  bottom: 30,
  /** Room for tick labels on each axis. */
  axisWidth: 46,
  /** Right padding when there is no right-hand axis. */
  edge: 12,
  /** Category labels closer together than this show every other label. */
  minLabelSpacing: 30,
} as const;

/** A round step that gives about `count` intervals across `span`. */
export function niceStep(span: number, count = 4): number {
  if (!(span > 0)) return 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const multiple = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= raw) ?? 10;
  return multiple * magnitude;
}

/** Tick values from the axis minimum to its maximum, on round numbers. */
export function axisTicks(axis: Pick<ChartAxis, 'min' | 'max'>, count = 4): number[] {
  const step = niceStep(axis.max - axis.min, count);
  const first = Math.ceil(axis.min / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let value = first; value <= axis.max + 1e-9; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  return ticks;
}

export interface ClaimChartLayout {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  /** Indices of the points drawn. */
  indices: number[];
  /** Width of one category. */
  band: number;
  /** Centre of a category, by its index in `indices` order. */
  x(position: number): number;
  y(value: number, axis?: 'left' | 'right'): number;
  leftTicks: number[];
  rightTicks: number[];
  /** Positions (in `indices` order) whose labels are drawn. */
  labelled: number[];
}

export function layoutClaimChart(chart: ClaimChart, width: number): ClaimChartLayout {
  const { height, top, bottom, axisWidth, edge, minLabelSpacing } = CLAIM_CHART;
  const { from, to } = visibleRange(chart);
  const indices = Array.from({ length: to - from + 1 }, (_, offset) => from + offset);
  const plotLeft = axisWidth;
  const plotRight = Math.max(plotLeft + 40, width - (chart.rightAxis ? axisWidth : edge));
  const plotTop = top;
  const plotBottom = height - bottom;
  const band = (plotRight - plotLeft) / indices.length;

  const scale = (axis: ChartAxis) => (value: number) => {
    const span = axis.max - axis.min || 1;
    const clamped = Math.min(axis.max, Math.max(axis.min, value));
    return plotBottom - ((clamped - axis.min) / span) * (plotBottom - plotTop);
  };
  const left = scale(chart.axis);
  const right = chart.rightAxis ? scale(chart.rightAxis) : left;

  const every = Math.max(1, Math.ceil(minLabelSpacing / band));
  const last = indices.length - 1;
  const labelled = indices
    .map((_, position) => position)
    .filter((position) => position % every === 0);
  // The last label is always drawn. If it would crowd the one before, that one gives way.
  if (labelled.at(-1) !== last) {
    const previous = labelled.at(-1);
    if (previous !== undefined && (last - previous) * band < minLabelSpacing * 0.9) labelled.pop();
    labelled.push(last);
  }

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    indices,
    band,
    x: (position) => plotLeft + band * (position + 0.5),
    y: (value, axis = 'left') => (axis === 'right' ? right(value) : left(value)),
    leftTicks: axisTicks(chart.axis),
    rightTicks: chart.rightAxis ? axisTicks(chart.rightAxis) : [],
    labelled,
  };
}

/** A tick or data value with the axis's prefix and suffix, e.g. "₹200" or "4%". */
export function axisValue(axis: ChartAxis, value: number): string {
  return `${axis.prefix ?? ''}${formatNumber(value)}${axis.suffix ?? ''}`;
}

/** What the chart shows, in words, for screen readers. Includes where each axis starts. */
export function describeClaimChart(chart: ClaimChart): string {
  const from = chart.window?.from ?? 0;
  const to = chart.window?.to ?? chart.labels.length - 1;
  const axisText = (axis: ChartAxis, side: string) =>
    `${side}${axis.label} axis runs from ${axisValue(axis, axis.min)} to ${axisValue(axis, axis.max)}.`;
  const series = chart.series.map((item) => {
    const axis = item.axis === 'right' && chart.rightAxis ? chart.rightAxis : chart.axis;
    const points = chart.labels
      .slice(from, to + 1)
      .map((label, offset) => `${label} ${axisValue(axis, item.values[from + offset])}`)
      .join(', ');
    return `${item.name}: ${points}.`;
  });
  return [
    `${chart.kind === 'bar' ? 'Bar' : 'Line'} chart: ${chart.title}.`,
    axisText(chart.axis, chart.rightAxis ? 'Left ' : 'The '),
    chart.rightAxis ? axisText(chart.rightAxis, 'Right ') : '',
    ...series,
  ]
    .filter(Boolean)
    .join(' ');
}
