import { describe, expect, it } from 'vitest';
import { abDecision, abStats } from './abTest';

describe('A/B test statistics', () => {
  it('works out rates, the difference and a two-proportion z-test', () => {
    const stats = abStats(
      { visitors: 20000, conversions: 800 },
      { visitors: 20000, conversions: 960 },
    );
    expect(stats.controlRate).toBe(0.04);
    expect(stats.variantRate).toBe(0.048);
    expect(stats.difference).toBeCloseTo(0.8, 10);
    expect(stats.relativeLift).toBeCloseTo(0.2, 10);
    // Pooled rate 4.4%: z = 0.008 ÷ √(0.044 × 0.956 × 2 ÷ 20000).
    expect(stats.z).toBeCloseTo(0.008 / Math.sqrt((0.044 * 0.956 * 2) / 20000), 10);
    expect(stats.pValue).toBeLessThan(0.001);
    expect(stats.ciLow).toBeGreaterThan(0);
    expect(stats.ciLow).toBeLessThan(stats.difference);
    expect(stats.ciHigh - stats.difference).toBeCloseTo(stats.difference - stats.ciLow, 10);
  });

  it('gives a p-value near 1 for identical results, and a symmetric one for a drop', () => {
    const same = abStats({ visitors: 500, conversions: 25 }, { visitors: 500, conversions: 25 });
    expect(same.z).toBe(0);
    expect(same.pValue).toBeCloseTo(1, 6);
    const up = abStats({ visitors: 1000, conversions: 40 }, { visitors: 1000, conversions: 60 });
    const down = abStats({ visitors: 1000, conversions: 60 }, { visitors: 1000, conversions: 40 });
    expect(down.pValue).toBeCloseTo(up.pValue, 12);
    expect(down.difference).toBeCloseTo(-up.difference, 12);
  });
});

describe('the A/B verdict', () => {
  const clearWin = abStats(
    { visitors: 20000, conversions: 800 },
    { visitors: 20000, conversions: 960 },
  );
  const tinyWin = abStats(
    { visitors: 400000, conversions: 16000 },
    { visitors: 400000, conversions: 16400 },
  );
  const smallSample = abStats(
    { visitors: 400, conversions: 16 },
    { visitors: 400, conversions: 22 },
  );

  it('ships a clear lift that is big enough to matter', () => {
    expect(abDecision(clearWin, 0.5)).toBe('ship');
  });

  it('kills a real lift that is too small to be worth it, and a clear drop', () => {
    expect(tinyWin.pValue).toBeLessThan(0.05);
    expect(abDecision(tinyWin, 0.5)).toBe('kill');
    const drop = abStats(
      { visitors: 20000, conversions: 960 },
      { visitors: 20000, conversions: 800 },
    );
    expect(abDecision(drop, 0.5)).toBe('kill');
  });

  it('waits when the result is not significant but could still be worth having', () => {
    expect(smallSample.pValue).toBeGreaterThan(0.05);
    expect(abDecision(smallSample, 0.5)).toBe('wait');
  });

  it('kills a non-significant result when even the best case is not worth it', () => {
    const flat = abStats(
      { visitors: 200000, conversions: 8000 },
      { visitors: 200000, conversions: 8030 },
    );
    expect(flat.pValue).toBeGreaterThan(0.05);
    expect(flat.ciHigh).toBeLessThan(0.5);
    expect(abDecision(flat, 0.5)).toBe('kill');
  });

  it('always waits when the test itself was flawed', () => {
    expect(abDecision(clearWin, 0.5, 'confounded')).toBe('wait');
    expect(abDecision(tinyWin, 0.5, 'peeked_early')).toBe('wait');
  });
});
