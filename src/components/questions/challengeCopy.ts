import type { TriageFlaw } from '../../content/types';

/** How each flaw in an inbox triage candidate is named after answering. */
export const TRIAGE_FLAW_LABELS: Record<TriageFlaw, string> = {
  data_not_available: 'Data not available',
  too_vague: 'Too vague',
  wrong_metric: 'Wrong metric',
};
