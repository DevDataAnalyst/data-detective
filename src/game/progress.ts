/** The learner's saved progress. Pure data and pure updates; persistence lives in src/storage. */
import type { MissionProgress } from './missionProgress';
import { createActivity, DEFAULT_DAILY_GOAL, type ActivityState, type DateKey } from './streak';

export interface LessonProgress {
  /** When the lesson was first completed, as an ISO 8601 timestamp. */
  completedAt: string;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
  activity: ActivityState;
  /** Practice XP awards per lesson, counted for a single day. */
  practiceAwards: { day: DateKey | null; counts: Record<string, number> };
  dailyGoal: number;
  missions: Record<string, MissionProgress>;
}

export function createInitialProgress(): ProgressState {
  return {
    lessons: {},
    activity: createActivity(),
    practiceAwards: { day: null, counts: {} },
    dailyGoal: DEFAULT_DAILY_GOAL,
    missions: {},
  };
}

/** Records a completed lesson. The first completion time is kept if it was already completed. */
export function markLessonCompleted(
  state: ProgressState,
  lessonId: string,
  completedAt: Date,
): ProgressState {
  if (state.lessons[lessonId]) return state;
  return {
    ...state,
    lessons: { ...state.lessons, [lessonId]: { completedAt: completedAt.toISOString() } },
  };
}

export function completedLessonIds(state: ProgressState): Set<string> {
  return new Set(Object.keys(state.lessons));
}
