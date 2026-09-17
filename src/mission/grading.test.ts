import { describe, expect, it } from 'vitest';
import { lateDeliveryMystery as mission } from '../content/mission1';
import type { MissionFacts } from '../game/missionProgress';
import { feedbackForRun } from './grading';
import { summaryLines } from './portfolio';
import type { RunResult } from './python/protocol';

const ok: RunResult = { stdout: '', rich: [], error: null };
const failed: RunResult = {
  stdout: '',
  rich: [],
  error: { type: 'KeyError', message: "'City'", line: 2, trace: [] },
};

describe('feedbackForRun', () => {
  it('shows the check message when a task passes', () => {
    expect(
      feedbackForRun({
        kind: 'completed',
        result: ok,
        check: { passed: true, message: 'Case file open.' },
        durationMs: 5,
      }),
    ).toEqual({ kind: 'passed', message: 'Case file open.' });
  });

  it('shows the specific check message when a task is not passed yet', () => {
    expect(
      feedbackForRun({
        kind: 'completed',
        result: ok,
        check: { passed: false, message: '`clean` still has 18 missing delivery times.' },
        durationMs: 5,
      }),
    ).toEqual({ kind: 'not_yet', message: '`clean` still has 18 missing delivery times.' });
  });

  it('asks to fix a Python error before anything else', () => {
    expect(
      feedbackForRun({
        kind: 'completed',
        result: failed,
        check: { passed: false, message: 'Create `city_stats`.' },
        durationMs: 5,
      }),
    ).toEqual({
      kind: 'not_yet',
      message: 'Fix the error shown in the output below, then run your code again.',
    });
  });

  it('says a task that was passed before stays passed', () => {
    const feedback = feedbackForRun(
      {
        kind: 'completed',
        result: ok,
        check: { passed: false, message: 'Create `clean`.' },
        durationMs: 5,
      },
      { alreadyPassed: true },
    );
    expect(feedback).toEqual({
      kind: 'not_yet',
      message: 'Create `clean`. You passed this task before, so it stays passed.',
    });
  });

  it('explains a timeout, and says nothing for unchecked runs', () => {
    expect(feedbackForRun({ kind: 'timed_out', timeoutMs: 10_000 })?.kind).toBe('not_yet');
    expect(feedbackForRun({ kind: 'unavailable', message: 'offline' })).toBeNull();
    expect(
      feedbackForRun({ kind: 'completed', result: ok, check: null, durationMs: 1 }),
    ).toBeNull();
  });
});

describe('mission summary lines', () => {
  const facts: MissionFacts = {
    orders: 600,
    missingDeliveryTimes: 18,
    cities: 5,
    outliers: 13,
    misleadingCity: 'Hyderabad',
    slowestCity: 'Kolkata',
  };

  it('fills in facts and leaves out stretch lines that were not done', () => {
    const lines = summaryLines(mission.summary.whatYouDid, facts, new Set());
    expect(lines).toContain('Flagged 13 outliers with the 1.5 × IQR rule');
    expect(lines.some((line) => line.includes('chart'))).toBe(false);
  });

  it('leaves out lines that quote facts when Python never worked them out', () => {
    const lines = summaryLines(mission.summary.whatYouDid, null, new Set());
    expect(lines).toEqual(['Wrote a recommendation for the operations manager']);
  });

  it('describes the stretch work in the portfolio summary when it was done', () => {
    const without = summaryLines(mission.summary.portfolio, facts, new Set());
    const withStretch = summaryLines(mission.summary.portfolio, facts, new Set(['dinner-rush']));
    expect(without).toHaveLength(4);
    expect(withStretch).toHaveLength(4);
    expect(withStretch.at(-1)).toMatch(/especially at dinner time/);
    expect(without.join('\n')).toMatch(/600 food delivery orders/);
    expect(without.join('\n')).not.toMatch(/job|placement|salary|hired/i);
  });
});
