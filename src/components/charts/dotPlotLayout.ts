/** Pure layout maths for SVG dot plots, kept separate from rendering so it can be tested. */

export type Scale = (value: number) => number;

export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

/** Round tick values in steps of 1, 2 or 5 × a power of ten. */
export function niceTicks(min: number, max: number, maxTicks = 5): number[] {
  if (!(max > min)) return [min];
  const rawStep = (max - min) / Math.max(1, maxTicks - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual >= 7.5 ? 10 : residual >= 3.5 ? 5 : residual >= 1.5 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step * 1e-9; tick += step) {
    ticks.push(Number(tick.toPrecision(12)));
  }
  return ticks;
}

/** The data extent padded a little on both sides so edge dots are not clipped. */
export function paddedDomain(values: readonly number[], padding = 0.06): [number, number] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || Math.abs(high) || 1;
  return [low - span * padding, high + span * padding];
}

export interface PlacedDot {
  index: number;
  value: number;
  cx: number;
  /** 0 is the row nearest the axis. */
  row: number;
}

/**
 * Places dots at their x position and stacks a dot one row up whenever it would sit closer than
 * `minGap` pixels to the previous dot on a row. Result keeps the original value order.
 */
export function stackDots(values: readonly number[], toX: Scale, minGap: number): PlacedDot[] {
  const rowEnds: number[] = [];
  const placed = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value || a.index - b.index)
    .map(({ value, index }) => {
      const cx = toX(value);
      let row = rowEnds.findIndex((end) => cx - end >= minGap - 1e-9);
      if (row === -1) {
        row = rowEnds.length;
        rowEnds.push(cx);
      } else {
        rowEnds[row] = cx;
      }
      return { index, value, cx, row };
    });
  return placed.sort((a, b) => a.index - b.index);
}

export interface DotPlotLayout {
  width: number;
  height: number;
  domain: [number, number];
  x: Scale;
  left: number;
  right: number;
  /** Top of the area where dots are drawn. Space above it is free for labels. */
  plotTop: number;
  axisY: number;
  rowHeight: number;
  rowCount: number;
  ticks: number[];
  dots: Array<PlacedDot & { cy: number }>;
}

export interface DotPlotLayoutOptions {
  values: readonly number[];
  width: number;
  domain?: [number, number];
  /** Vertical distance between stacked rows. */
  rowHeight: number;
  /** Minimum horizontal distance between dots on the same row. */
  minGap: number;
  sidePadding: number;
  /** Free space above the dots, for labels. */
  topPadding: number;
  /** Space below the axis for tick labels. */
  bottomPadding?: number;
  minRows?: number;
}

export function layoutDotPlot(options: DotPlotLayoutOptions): DotPlotLayout {
  const { values, width, rowHeight, minGap, sidePadding, topPadding } = options;
  const bottomPadding = options.bottomPadding ?? 28;
  const domain = options.domain ?? paddedDomain(values);
  const left = sidePadding;
  const right = Math.max(left + 1, width - sidePadding);
  const x = linearScale(domain, [left, right]);
  const placed = stackDots(values, x, minGap);
  const rowCount = Math.max(options.minRows ?? 1, ...placed.map((dot) => dot.row + 1));
  const plotTop = topPadding;
  const axisY = plotTop + rowCount * rowHeight;
  const tickCount = width < 400 ? 4 : 6;
  const ticks = niceTicks(domain[0], domain[1], tickCount).filter(
    (tick) => tick >= domain[0] && tick <= domain[1],
  );

  return {
    width,
    height: axisY + bottomPadding,
    domain,
    x,
    left,
    right,
    plotTop,
    axisY,
    rowHeight,
    rowCount,
    ticks,
    dots: placed.map((dot) => ({ ...dot, cy: axisY - rowHeight / 2 - dot.row * rowHeight })),
  };
}
