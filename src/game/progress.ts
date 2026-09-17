/** The learner's saved progress. Pure data and pure updates; persistence lives in src/storage. */

export interface LessonProgress {
  /** When the lesson was first completed, as an ISO 8601 timestamp. */
  completedAt: string;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
}

export function createInitialProgress(): ProgressState {
  return { lessons: {} };
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
