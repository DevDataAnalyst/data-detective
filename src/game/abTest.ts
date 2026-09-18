/**
 * A/B test arithmetic: conversion rates, a two-proportion z-test and a 95% confidence interval for
 * the difference, plus the decision rule behind the "A/B verdict" challenge. Pure, so content
 * validation can recompute the right call from the numbers instead of trusting the author.
 */
import { normalCdf } from './stats';

export interface AbGroup {
  visitors: number;
  conversions: number;
}

export interface AbStats {
  controlRate: number;
  variantRate: number;
  /** Variant minus control, in percentage points. */
  difference: number;
  /** Difference relative to the control's rate, e.g. 0.12 for 12% better. */
  relativeLift: number;
  z: number;
  /** Two-sided. */
  pValue: number;
  /** 95% confidence interval for the difference, in percentage points. */
  ciLow: number;
  ciHigh: number;
}

export const SIGNIFICANCE_LEVEL = 0.05;
const Z_95 = 1.96;

export function abStats(control: AbGroup, variant: AbGroup): AbStats {
  const controlRate = control.conversions / control.visitors;
  const variantRate = variant.conversions / variant.visitors;
  const pooled =
    (control.conversions + variant.conversions) / (control.visitors + variant.visitors);
  const pooledError = Math.sqrt(
    pooled * (1 - pooled) * (1 / control.visitors + 1 / variant.visitors),
  );
  const z = pooledError === 0 ? 0 : (variantRate - controlRate) / pooledError;
  const error = Math.sqrt(
    (controlRate * (1 - controlRate)) / control.visitors +
      (variantRate * (1 - variantRate)) / variant.visitors,
  );
  const difference = (variantRate - controlRate) * 100;
  return {
    controlRate,
    variantRate,
    difference,
    relativeLift: controlRate === 0 ? 0 : variantRate / controlRate - 1,
    z,
    pValue: 2 * (1 - normalCdf(Math.abs(z))),
    ciLow: difference - Z_95 * error * 100,
    ciHigh: difference + Z_95 * error * 100,
  };
}

export const VERDICTS = ['ship', 'kill', 'wait'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Problems with how a test was run that no p-value can see. */
export type TestIssue = 'peeked_early' | 'confounded' | 'novelty_effect' | 'too_short';

/**
 * The call a careful analyst makes:
 * - a flawed test (peeking, a confounder, novelty, too short) → wait and run it properly;
 * - not significant → kill if even the top of the interval is below the smallest lift worth
 *   having, otherwise wait for more data;
 * - significantly worse → kill; significantly better → ship only if the lift is worth it.
 */
export function abDecision(
  stats: AbStats,
  minWorthwhileLift: number,
  issue: TestIssue | null = null,
): Verdict {
  if (issue) return 'wait';
  if (stats.pValue >= SIGNIFICANCE_LEVEL) {
    return stats.ciHigh < minWorthwhileLift ? 'kill' : 'wait';
  }
  if (stats.difference < 0) return 'kill';
  return stats.difference >= minWorthwhileLift ? 'ship' : 'kill';
}
