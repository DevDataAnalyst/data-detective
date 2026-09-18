import type { Question, TriageFlaw } from '../../content/types';
import { VERDICTS, type Verdict } from '../../game/abTest';
import type { Answer } from '../../game/grading';

/** How each flaw in an inbox triage candidate is named after answering. */
export const TRIAGE_FLAW_LABELS: Record<TriageFlaw, string> = {
  data_not_available: 'Data not available',
  too_vague: 'Too vague',
  wrong_metric: 'Wrong metric',
};

/** The three calls in an A/B verdict, in the order they are offered. */
export const VERDICT_LABELS: Record<Verdict, string> = {
  ship: 'Ship it: roll it out to everyone',
  kill: 'Kill it: keep the old version',
  wait: 'Wait: get better data first',
};

/** A p-value in words people can read, e.g. "0.030" or "less than 0.001". */
export function formatPValue(pValue: number): string {
  return pValue < 0.001 ? 'less than 0.001' : pValue.toFixed(3);
}

/** A difference in percentage points with its sign, e.g. "+0.80 points" or "−0.12 points". */
export function formatPoints(points: number, decimals = 2): string {
  const size = Math.abs(points).toFixed(decimals);
  const sign = Number(size) === 0 ? '' : points > 0 ? '+' : '−';
  return `${sign}${size} points`;
}

/**
 * Why a picked option is wrong, when the content says so: the flaw of an inbox triage candidate,
 * the note on a courtroom suspect, or what happens after an A/B call. Used where a wrong answer
 * must not give the right one away.
 */
export function wrongAnswerNote(question: Question, answer: Answer): string | null {
  if (question.type === 'inbox_triage' && answer.type === 'inbox_triage') {
    const candidate = question.candidates[answer.selectedIndex];
    if (!candidate?.flaw) return null;
    return `${TRIAGE_FLAW_LABELS[candidate.flaw]}: ${candidate.note}`;
  }
  if (question.type === 'courtroom' && answer.type === 'courtroom') {
    return question.suspects[answer.selectedIndex]?.note ?? null;
  }
  if (question.type === 'ab_verdict' && answer.type === 'ab_verdict') {
    const verdict = VERDICTS[answer.selectedIndex];
    return verdict ? question.consequences[verdict] : null;
  }
  return null;
}
