import { describe, expect, it } from 'vitest';
import { axisTicks, layoutClaimChart, niceStep } from '../components/charts/claimChartLayout';
import type { ClaimChart } from '../content/types';
import { chartTricks, exaggeration, honestChart, niceCeiling, visibleRange } from './charts';

const bars: ClaimChart = {
  kind: 'bar',
  title: 'Weekly sign-ups',
  labels: ['Before', 'After'],
  series: [{ name: 'Sign-ups', values: [980, 1040] }],
  axis: { min: 950, max: 1050, label: 'Sign-ups' },
};

const falling: ClaimChart = {
  kind: 'line',
  title: 'Sales',
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [{ name: 'Sales', values: [120, 110, 100, 90, 95, 101] }],
  axis: { min: 80, max: 130, label: 'Sales' },
  window: { from: 3, to: 5 },
};

describe('chart tricks', () => {
  it('measures how much a truncated axis exaggerates bars', () => {
    // Drawn 90 vs 30 (3×) for a real ratio of 1040 / 980.
    expect(exaggeration(bars)).toBeCloseTo(3 / (1040 / 980), 6);
    expect(chartTricks(bars)).toEqual(['truncated_axis']);
    expect(exaggeration({ ...bars, axis: { ...bars.axis, min: 0 } })).toBe(1);
  });

  it('does not call a line chart with a non-zero axis truncated', () => {
    expect(chartTricks({ ...bars, kind: 'line' })).toEqual([]);
  });

  it('spots a window that hides a falling trend', () => {
    expect(visibleRange(falling)).toEqual({ from: 3, to: 5 });
    expect(chartTricks(falling)).toEqual(['cherry_picked_range']);
    const whole = { ...falling, window: { from: 0, to: 2 } };
    expect(chartTricks(whole)).toEqual([]);
  });

  it('spots a window that hides an earlier jump just as big', () => {
    const seasonal: ClaimChart = {
      kind: 'line',
      title: 'Churn',
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jan', 'Feb', 'Mar', 'Apr'],
      series: [{ name: 'Churn', values: [2.4, 2.7, 2.9, 3.7, 2.6, 2.4, 2.4, 2.6, 2.3, 4] }],
      axis: { min: 2, max: 4.5, label: 'Churn', suffix: '%' },
      window: { from: 6, to: 9 },
    };
    expect(chartTricks(seasonal)).toEqual(['cherry_picked_range']);
    const firstTime = {
      ...seasonal,
      series: [{ name: 'Churn', values: [2.4, 2.7, 2.9, 2.8, 2.6, 2.4, 2.4, 2.6, 2.3, 4] }],
    };
    expect(chartTricks(firstTime)).toEqual([]);
  });

  it('spots a window that shows only an unusual stretch, such as a novelty spike', () => {
    const fading: ClaimChart = {
      kind: 'line',
      title: 'Daily lift',
      labels: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
      series: [{ name: 'Lift', values: [2.1, 1.8, 1.5, 0.6, 0.2, -0.1, 0.3, 0.1] }],
      axis: { min: -1, max: 3, label: 'Lift' },
      window: { from: 0, to: 2 },
    };
    expect(chartTricks(fading)).toEqual(['cherry_picked_range']);
    expect(chartTricks({ ...fading, window: { from: 3, to: 7 } })).toEqual([]);
  });

  it('spots two axes with different scales', () => {
    const dual: ClaimChart = {
      ...falling,
      window: undefined,
      series: [
        { name: 'Hours', values: [40, 42, 45, 47, 50, 52] },
        { name: 'Sales', values: [200, 204, 210, 213, 219, 222], axis: 'right' },
      ],
      axis: { min: 38, max: 54, label: 'Hours' },
      rightAxis: { min: 195, max: 225, label: 'Sales' },
    };
    expect(chartTricks(dual)).toEqual(['dual_axis']);
    const honest = honestChart(dual, 'dual_axis');
    expect(honest.rightAxis).toBeUndefined();
    expect(honest.series.map((series) => series.values[0])).toEqual([100, 100]);
    expect(honest.axis).toMatchObject({ min: 0, max: 200 });
  });

  it('draws honest versions that no longer mislead', () => {
    expect(chartTricks(honestChart(bars, 'truncated_axis'))).toEqual([]);
    const honest = honestChart(falling, 'cherry_picked_range');
    expect(honest.window).toBeUndefined();
    expect(honest.axis.max).toBeGreaterThanOrEqual(120);
  });

  it('rounds axis tops and steps to friendly numbers', () => {
    expect(niceCeiling(130)).toBe(200);
    expect(niceCeiling(96)).toBe(100);
    expect(niceStep(100)).toBe(25);
    expect(axisTicks({ min: 950, max: 1050 })).toEqual([950, 975, 1000, 1025, 1050]);
  });
});

describe('claim chart layout', () => {
  it('maps the axis range onto the plot and centres categories', () => {
    const layout = layoutClaimChart(bars, 320);
    expect(layout.y(950)).toBe(layout.plotBottom);
    expect(layout.y(1050)).toBe(layout.plotTop);
    expect(layout.x(0)).toBeCloseTo(layout.plotLeft + layout.band / 2);
    expect(layout.indices).toEqual([0, 1]);
  });

  it('draws only the window, and thins labels when they would crowd', () => {
    expect(layoutClaimChart(falling, 320).indices).toEqual([3, 4, 5]);
    const year: ClaimChart = {
      ...falling,
      window: undefined,
      labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      series: [{ name: 'Sales', values: Array.from({ length: 12 }, () => 100) }],
    };
    const narrow = layoutClaimChart(year, 300);
    expect(narrow.labelled.length).toBeLessThan(12);
    expect(narrow.labelled.at(-1)).toBe(11);
    expect(layoutClaimChart(year, 900).labelled).toHaveLength(12);
  });
});
