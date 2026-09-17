/** The learner's saved progress. Pure data and pure updates; persistence lives in src/storage. */
import { emptyCheckpointProgress, type CheckpointProgress } from './checkpoint';
import type { MissionProgress } from './missionProgress';
import { createActivity, DEFAULT_DAILY_GOAL, type ActivityState, type DateKey } from './streak';

export interface LessonProgress {
  /** When the lesson was first completed, as an ISO 8601 timestamp. */
  completedAt: string;
  /** Marked done by passing the test-out checkpoint, not by playing the lesson. */
  testedOut?: true;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
  activity: ActivityState;
  /** Practice XP awards per lesson, counted for a single day. */
  practiceAwards: { day: DateKey | null; counts: Record<string, number> };
  dailyGoal: number;
  missions: Record<string, MissionProgress>;
  checkpoints: Record<string, CheckpointProgress>;
}

export function createInitialProgress(): ProgressState {
  return {
    lessons: {},
    activity: createActivity(),
    practiceAwards: { day: null, counts: {} },
    dailyGoal: DEFAULT_DAILY_GOAL,
    missions: {},
    checkpoints: {},
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

/** Marks lessons done by testing out. Lessons already completed keep their record. */
export function markLessonsTestedOut(
  state: ProgressState,
  lessonIds: readonly string[],
  at: Date,
): ProgressState {
  const newlyDone = lessonIds.filter((lessonId) => !state.lessons[lessonId]);
  if (newlyDone.length === 0) return state;
  const completedAt = at.toISOString();
  const lessons = { ...state.lessons };
  for (const lessonId of newlyDone) lessons[lessonId] = { completedAt, testedOut: true };
  return { ...state, lessons };
}

export function completedLessonIds(state: ProgressState): Set<string> {
  return new Set(Object.keys(state.lessons));
}

export function testedOutLessonIds(state: ProgressState): Set<string> {
  return new Set(
    Object.entries(state.lessons)
      .filter(([, lesson]) => lesson.testedOut)
      .map(([lessonId]) => lessonId),
  );
}

export function checkpointProgress(state: ProgressState, checkpointId: string): CheckpointProgress {
  return state.checkpoints[checkpointId] ?? emptyCheckpointProgress();
}

export function hasPassedCheckpoint(state: ProgressState, checkpointId: string): boolean {
  return checkpointProgress(state, checkpointId).passedAt !== null;
}
