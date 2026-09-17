import type { SurveyId } from '../../storage/events';
import { usePlaytestEvents } from '../../storage/eventsContext';

/** True until this survey has been answered or skipped, so it is only ever asked once. */
export function useSurveyPending(surveyId: SurveyId): boolean {
  const events = usePlaytestEvents();
  return !events.some(
    (event) =>
      (event.type === 'survey_answered' || event.type === 'survey_skipped') &&
      event.surveyId === surveyId,
  );
}
