import type { Question, TriageFlaw } from '../../content/types';
import type { Answer } from '../../game/grading';

/** How each flaw in an inbox triage candidate is named after answering. */
export const TRIAGE_FLAW_LABELS: Record<TriageFlaw, string> = {
  data_not_available: 'Data not available',
  too_vague: 'Too vague',
  wrong_metric: 'Wrong metric',
};

/**
 * Why a picked option is wrong, when the content says so: the flaw of an inbox triage candidate or
 * the note on a courtroom suspect. Used where a wrong answer must not give the right one away.
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
  return null;
}
