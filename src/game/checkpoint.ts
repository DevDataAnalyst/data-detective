/**
 * Test-out checkpoint rules: scoring, the retake wait and the question session. Unlike lessons,
 * each question is asked once, in order, and nothing is explained until the end.
 */
import type { Checkpoint } from '../content/types';
import type { Answer } from './grading';
import { lessonStatuses, nextLessonId } from './unlocks';

export interface CheckpointAttempt {
  /** When the attempt finished, as an ISO 8601 timestamp. */
  at: string;
  correct: number;
  total: number;
  passed: boolean;
  /** Lessons with at least one missed question, in path order. */
  missedLessonIds: string[];
}

export interface CheckpointProgress {
  /** When the checkpoint was first passed. */
  passedAt: string | null;
  attempts: number;
  lastAttempt: CheckpointAttempt | null;
  /** Questions answered right in any attempt, for the boss battle. */
  correctQuestionIds: string[];
}

export function emptyCheckpointProgress(): CheckpointProgress {
  return { passedAt: null, attempts: 0, lastAttempt: null, correctQuestionIds: [] };
}

/** The fewest right answers that pass, e.g. 8 of 10 for a pass mark of 0.8. */
export function correctNeeded(checkpoint: Checkpoint): number {
  return Math.ceil(checkpoint.passMark * checkpoint.items.length - 1e-9);
}

export interface CheckpointScore {
  correct: number;
  total: number;
  needed: number;
  passed: boolean;
  missedLessonIds: string[];
  /** Missed questions per lesson. */
  missedByLesson: Record<string, number>;
}

/**
 * Scores an attempt. `correctByQuestion` holds the result for each question id; a question with
 * no result counts as missed. Missed lessons follow `lessonOrder`, the order of the path.
 */
export function scoreCheckpoint(
  checkpoint: Checkpoint,
  lessonOrder: readonly string[],
  correctByQuestion: Readonly<Record<string, boolean>>,
): CheckpointScore {
  const total = checkpoint.items.length;
  const missedByLesson: Record<string, number> = {};
  let correct = 0;
  for (const item of checkpoint.items) {
    if (correctByQuestion[item.question.id] === true) {
      correct += 1;
    } else {
      missedByLesson[item.lessonId] = (missedByLesson[item.lessonId] ?? 0) + 1;
    }
  }
  const needed = correctNeeded(checkpoint);
  const position = (lessonId: string) => {
    const index = lessonOrder.indexOf(lessonId);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return {
    correct,
    total,
    needed,
    passed: total > 0 && correct >= needed,
    missedLessonIds: Object.keys(missedByLesson).sort((a, b) => position(a) - position(b)),
    missedByLesson,
  };
}

/**
 * Where to start after a failed attempt: the first missed lesson the learner can open. Lessons
 * unlock in order, so when every missed lesson is still locked, it is the next lesson on the path.
 */
export function reviewStartLessonId(
  lessonIds: readonly string[],
  completed: ReadonlySet<string>,
  missedLessonIds: readonly string[],
): string | null {
  const statuses = lessonStatuses(lessonIds, completed);
  const open = missedLessonIds.find((lessonId) => {
    const index = lessonIds.indexOf(lessonId);
    return index !== -1 && statuses[index] !== 'locked';
  });
  return open ?? nextLessonId(lessonIds, completed) ?? missedLessonIds[0] ?? null;
}

export type CheckpointAvailability =
  | { kind: 'available' }
  | { kind: 'passed'; passedAt: string }
  | { kind: 'waiting'; retakeAt: Date; minutesLeft: number };

/** Whether the checkpoint can be taken now. After a failed attempt there is a wait. */
export function checkpointAvailability(
  progress: CheckpointProgress,
  retakeDelayMinutes: number,
  now: Date,
): CheckpointAvailability {
  if (progress.passedAt) return { kind: 'passed', passedAt: progress.passedAt };
  const last = progress.lastAttempt;
  if (!last || last.passed) return { kind: 'available' };
  const finishedAt = Date.parse(last.at);
  if (Number.isNaN(finishedAt)) return { kind: 'available' };
  const retakeAt = new Date(finishedAt + Math.max(0, retakeDelayMinutes) * 60_000);
  const msLeft = retakeAt.getTime() - now.getTime();
  if (msLeft <= 0) return { kind: 'available' };
  return { kind: 'waiting', retakeAt, minutesLeft: Math.ceil(msLeft / 60_000) };
}

export interface CheckpointAnswerRecord {
  answer: Answer;
  correct: boolean;
}

export interface CheckpointSessionState {
  phase: 'intro' | 'question' | 'finished';
  questionIds: readonly string[];
  /** Index of the current question. */
  index: number;
  answers: Record<string, CheckpointAnswerRecord>;
  startedAt: number | null;
  finishedAt: number | null;
}

export type CheckpointSessionAction =
  | { type: 'start'; now: number }
  | { type: 'answer'; answer: Answer; correct: boolean; now: number };

export function createCheckpointSession(questionIds: readonly string[]): CheckpointSessionState {
  return {
    phase: 'intro',
    questionIds,
    index: 0,
    answers: {},
    startedAt: null,
    finishedAt: null,
  };
}

/** Records the answer to the current question and moves on. There are no second tries. */
export function checkpointSessionReducer(
  state: CheckpointSessionState,
  action: CheckpointSessionAction,
): CheckpointSessionState {
  switch (action.type) {
    case 'start':
      if (state.phase !== 'intro') return state;
      return state.questionIds.length === 0
        ? { ...state, phase: 'finished', startedAt: action.now, finishedAt: action.now }
        : { ...state, phase: 'question', startedAt: action.now };
    case 'answer': {
      if (state.phase !== 'question') return state;
      const questionId = state.questionIds[state.index];
      const answers = {
        ...state.answers,
        [questionId]: { answer: action.answer, correct: action.correct },
      };
      const last = state.index >= state.questionIds.length - 1;
      return last
        ? { ...state, answers, phase: 'finished', finishedAt: action.now }
        : { ...state, answers, index: state.index + 1 };
    }
  }
}

export function correctByQuestion(state: CheckpointSessionState): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(state.answers).map(([questionId, record]) => [questionId, record.correct]),
  );
}
