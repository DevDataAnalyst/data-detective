/**
 * Boss battle rules: a timed round at the end of a unit, mixing questions the learner has already
 * answered correctly at least once. Each question is asked once (no second tries), and the score
 * is the number answered correctly before time runs out. Pure: time is always passed in.
 */
import type { Question, Unit } from '../content/types';
import type { Answer } from './grading';
import { checkpointProgress, type ProgressState } from './progress';

export const BOSS_RULES = {
  durationMs: 60_000,
  /** For learners who ask for more time. */
  extendedDurationMs: 120_000,
  maxQuestions: 12,
  /** Fewer mastered questions than this and the round would be too thin to play. */
  minQuestions: 4,
} as const;

/**
 * Questions answered correctly at least once in this unit: every question of a lesson played to
 * the end (lessons only finish once every answer is right), plus checkpoint questions answered
 * right. A checkpoint passed before right answers were saved counts all its questions.
 */
export function masteredQuestionIds(unit: Unit, progress: ProgressState): Set<string> {
  const mastered = new Set<string>();
  for (const lesson of unit.lessons) {
    const saved = progress.lessons[lesson.id];
    if (saved && !saved.testedOut)
      lesson.questions.forEach((question) => mastered.add(question.id));
  }
  const checkpoint = checkpointProgress(progress, unit.checkpoint.id);
  const unitCheckpointIds = unit.checkpoint.items.map((item) => item.question.id);
  const right =
    checkpoint.correctQuestionIds.length > 0 || checkpoint.passedAt === null
      ? checkpoint.correctQuestionIds
      : unitCheckpointIds;
  for (const id of right) if (unitCheckpointIds.includes(id)) mastered.add(id);
  return mastered;
}

/** Every question in the unit (lessons, then checkpoint) the learner has mastered. */
export function bossQuestionPool(unit: Unit, mastered: ReadonlySet<string>): Question[] {
  return [
    ...unit.lessons.flatMap((lesson) => lesson.questions),
    ...unit.checkpoint.items.map((item) => item.question),
  ].filter((question) => mastered.has(question.id));
}

/** A small seeded random number generator, so a round can be replayed in tests. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/**
 * Picks up to `max` questions, mixing types: questions are shuffled within each type, then taken
 * from the types in turn, so two questions of the same type rarely sit next to each other.
 */
export function selectBossQuestions(
  pool: readonly Question[],
  seed: number,
  max: number = BOSS_RULES.maxQuestions,
): Question[] {
  const random = seededRandom(seed);
  const byType = new Map<string, Question[]>();
  for (const question of pool) {
    const group = byType.get(question.type) ?? [];
    group.push(question);
    byType.set(question.type, group);
  }
  const groups = shuffle([...byType.values()], random).map((group) => shuffle(group, random));
  const picked: Question[] = [];
  while (picked.length < max && groups.some((group) => group.length > 0)) {
    for (const group of groups) {
      const next = group.shift();
      if (next && picked.length < max) picked.push(next);
    }
  }
  return picked;
}

export interface BossResult {
  questionId: string;
  answer: Answer;
  correct: boolean;
}

export interface BossSessionState {
  phase: 'intro' | 'playing' | 'finished';
  questionIds: readonly string[];
  /** Index of the current question. */
  index: number;
  durationMs: number;
  startedAt: number | null;
  /** When time runs out. */
  endsAt: number | null;
  finishedAt: number | null;
  endReason: 'time_up' | 'all_answered' | null;
  results: BossResult[];
}

export type BossSessionAction =
  | { type: 'start'; now: number; durationMs?: number }
  | { type: 'answer'; answer: Answer; correct: boolean; now: number }
  | { type: 'tick'; now: number };

export function createBossSession(
  questionIds: readonly string[],
  durationMs: number = BOSS_RULES.durationMs,
): BossSessionState {
  return {
    phase: 'intro',
    questionIds,
    index: 0,
    durationMs,
    startedAt: null,
    endsAt: null,
    finishedAt: null,
    endReason: null,
    results: [],
  };
}

function timeUp(state: BossSessionState): BossSessionState {
  return { ...state, phase: 'finished', finishedAt: state.endsAt, endReason: 'time_up' };
}

/** Starts the clock, records answers and ends the round when time runs out. */
export function bossSessionReducer(
  state: BossSessionState,
  action: BossSessionAction,
): BossSessionState {
  switch (action.type) {
    case 'start': {
      if (state.phase !== 'intro') return state;
      const durationMs = action.durationMs ?? state.durationMs;
      if (state.questionIds.length === 0) {
        return {
          ...state,
          durationMs,
          phase: 'finished',
          startedAt: action.now,
          endsAt: action.now,
          finishedAt: action.now,
          endReason: 'all_answered',
        };
      }
      return {
        ...state,
        durationMs,
        phase: 'playing',
        startedAt: action.now,
        endsAt: action.now + durationMs,
      };
    }
    case 'answer': {
      if (state.phase !== 'playing' || state.endsAt === null) return state;
      // An answer that arrives after the buzzer does not count.
      if (action.now >= state.endsAt) return timeUp(state);
      const results = [
        ...state.results,
        {
          questionId: state.questionIds[state.index],
          answer: action.answer,
          correct: action.correct,
        },
      ];
      const index = state.index + 1;
      if (index >= state.questionIds.length) {
        return {
          ...state,
          results,
          index,
          phase: 'finished',
          finishedAt: action.now,
          endReason: 'all_answered',
        };
      }
      return { ...state, results, index };
    }
    case 'tick':
      if (state.phase !== 'playing' || state.endsAt === null) return state;
      return action.now >= state.endsAt ? timeUp(state) : state;
  }
}

export function currentBossQuestionId(state: BossSessionState): string | null {
  return state.phase === 'playing' ? (state.questionIds[state.index] ?? null) : null;
}

/** Time left on the clock, never below zero. The full time before the round starts. */
export function bossTimeLeftMs(state: BossSessionState, now: number): number {
  if (state.phase === 'intro' || state.endsAt === null) return state.durationMs;
  const until = state.phase === 'finished' ? (state.finishedAt ?? state.endsAt) : now;
  return Math.max(0, state.endsAt - until);
}

/** Whole seconds left, rounded up so the clock shows 1 until the very end. */
export function bossSecondsLeft(state: BossSessionState, now: number): number {
  return Math.ceil(bossTimeLeftMs(state, now) / 1000);
}

export interface BossScore {
  correct: number;
  answered: number;
  total: number;
  /** Share of answered questions that were right, 0 to 1. Zero when nothing was answered. */
  accuracy: number;
  timeLeftMs: number;
}

export function scoreBoss(state: BossSessionState): BossScore {
  const correct = state.results.filter((result) => result.correct).length;
  const answered = state.results.length;
  return {
    correct,
    answered,
    total: state.questionIds.length,
    accuracy: answered === 0 ? 0 : correct / answered,
    timeLeftMs: bossTimeLeftMs(state, state.finishedAt ?? 0),
  };
}
