import { describe, expect, it } from 'vitest';
import { layoutDotPlot, linearScale, niceTicks, paddedDomain, stackDots } from './dotPlotLayout';

describe('dot plot layout', () => {
  it('maps values linearly onto pixels', () => {
    const x = linearScale([0, 100], [20, 320]);
    expect(x(0)).toBe(20);
    expect(x(50)).toBe(170);
    expect(x(100)).toBe(320);
  });

  it('picks round tick values', () => {
    expect(niceTicks(0, 70, 5)).toEqual([0, 20, 40, 60]);
    expect(niceTicks(21.6, 176.6, 4)).toEqual([50, 100, 150]);
    expect(niceTicks(0.35, 12.65, 5)).toEqual([2, 4, 6, 8, 10, 12]);
  });

  it('pads the domain so edge values stay inside', () => {
    const [low, high] = paddedDomain([10, 60]);
    expect(low).toBeLessThan(10);
    expect(high).toBeGreaterThan(60);
  });

  it('stacks dots that would overlap and keeps separate ones on the axis row', () => {
    const dots = stackDots([30, 30, 31, 60], (value) => value * 2, 10);
    expect(dots.map((dot) => dot.row)).toEqual([0, 1, 2, 0]);
  });

  it('never puts two dots on one row closer than the minimum gap', () => {
    const values = [4, 5, 6, 5, 7, 6, 5, 22, 6, 18, 5];
    const layout = layoutDotPlot({
      values,
      width: 328,
      rowHeight: 44,
      minGap: 44,
      sidePadding: 22,
      topPadding: 24,
    });
    for (let row = 0; row < layout.rowCount; row += 1) {
      const xs = layout.dots
        .filter((dot) => dot.row === row)
        .map((dot) => dot.cx)
        .sort((a, b) => a - b);
      xs.slice(1).forEach((cx, index) => expect(cx - xs[index]).toBeGreaterThanOrEqual(44 - 1e-9));
    }
    expect(layout.dots.every((dot) => dot.cx >= 22 && dot.cx <= 328 - 22)).toBe(true);
    expect(layout.height).toBe(24 + layout.rowCount * 44 + 28);
  });
});
