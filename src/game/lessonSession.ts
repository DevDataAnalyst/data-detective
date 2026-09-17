/**
 * Lesson session state, Duolingo style: questions are asked in order, and a question answered
 * incorrectly goes to the back of the queue. The lesson ends once every question has been
 * answered correctly once.
 */

export type LessonPhase = 'intro' | 'question' | 'summary';

export interface LessonSessionState {
  phase: LessonPhase;
  /** Original question order. */
  questionIds: readonly string[];
  /** Questions still to answer correctly. The head is the current question. */
  queue: string[];
  /** `feedback` while the result of the last check is on screen. */
  status: 'answering' | 'feedback';
  lastAnswerCorrect: boolean | null;
  /** How many times each question has been checked. */
  attempts: Record<string, number>;
  /** Whether each question was right the first time it was checked. */
  firstAttemptCorrect: Record<string, boolean>;
  completedIds: string[];
  startedAt: number | null;
  finishedAt: number | null;
}

export type LessonSessionAction =
  | { type: 'start'; now: number }
  | { type: 'submit'; correct: boolean }
  | { type: 'continue'; now: number };

export function createLessonSession(questionIds: readonly string[]): LessonSessionState {
  return {
    phase: 'intro',
    questionIds,
    queue: [...questionIds],
    status: 'answering',
    lastAnswerCorrect: null,
    attempts: {},
    firstAttemptCorrect: {},
    completedIds: [],
    startedAt: null,
    finishedAt: null,
  };
}

export function lessonSessionReducer(
  state: LessonSessionState,
  action: LessonSessionAction,
): LessonSessionState {
  switch (action.type) {
    case 'start': {
      if (state.phase !== 'intro') return state;
      if (state.queue.length === 0) {
        return { ...state, phase: 'summary', startedAt: action.now, finishedAt: action.now };
      }
      return { ...state, phase: 'question', startedAt: action.now };
    }

    case 'submit': {
      if (state.phase !== 'question' || state.status !== 'answering') return state;
      const id = state.queue[0];
      const previousAttempts = state.attempts[id] ?? 0;
      return {
        ...state,
        status: 'feedback',
        lastAnswerCorrect: action.correct,
        attempts: { ...state.attempts, [id]: previousAttempts + 1 },
        firstAttemptCorrect:
          previousAttempts === 0
            ? { ...state.firstAttemptCorrect, [id]: action.correct }
            : state.firstAttemptCorrect,
      };
    }

    case 'continue': {
      if (state.phase !== 'question' || state.status !== 'feedback') return state;
      const [id, ...rest] = state.queue;
      const correct = state.lastAnswerCorrect === true;
      const queue = correct ? rest : [...rest, id];
      const completedIds = correct ? [...state.completedIds, id] : state.completedIds;
      const finished = queue.length === 0;
      return {
        ...state,
        queue,
        completedIds,
        status: 'answering',
        lastAnswerCorrect: null,
        phase: finished ? 'summary' : 'question',
        finishedAt: finished ? action.now : null,
      };
    }
  }
}

export function currentQuestionId(state: LessonSessionState): string | null {
  return state.phase === 'question' ? (state.queue[0] ?? null) : null;
}

/**
 * How many times the current question had been checked before this showing. Stays the same while
 * its feedback is on screen, so it can key per-attempt UI state.
 */
export function attemptNumber(state: LessonSessionState): number {
  const id = currentQuestionId(state);
  if (id === null) return 0;
  const attempts = state.attempts[id] ?? 0;
  return state.status === 'feedback' ? attempts - 1 : attempts;
}

/** True when the current question is coming back after a wrong answer. */
export function isRetry(state: LessonSessionState): boolean {
  const id = currentQuestionId(state);
  return id !== null && (state.attempts[id] ?? 0) > 0 && state.status === 'answering';
}

/** Share of questions answered correctly so far, from 0 to 1. */
export function lessonProgress(state: LessonSessionState): number {
  if (state.questionIds.length === 0) return 1;
  return state.completedIds.length / state.questionIds.length;
}

/** Share of questions that were right on the first try, from 0 to 1. */
export function firstAttemptAccuracy(state: LessonSessionState): number {
  if (state.questionIds.length === 0) return 1;
  const right = state.questionIds.filter((id) => state.firstAttemptCorrect[id] === true).length;
  return right / state.questionIds.length;
}

export function sessionDurationMs(state: LessonSessionState): number | null {
  if (state.startedAt === null || state.finishedAt === null) return null;
  return Math.max(0, state.finishedAt - state.startedAt);
}
