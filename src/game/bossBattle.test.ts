import { describe, expect, it } from 'vitest';
import { unit1 } from '../content/unit1';
import type { Question } from '../content/types';
import {
  BOSS_RULES,
  bossQuestionPool,
  bossSecondsLeft,
  bossSessionReducer,
  bossTimeLeftMs,
  createBossSession,
  currentBossQuestionId,
  masteredQuestionIds,
  scoreBoss,
  selectBossQuestions,
  type BossSessionState,
} from './bossBattle';
import type { Answer } from './grading';
import { createInitialProgress, markLessonCompleted, markLessonsTestedOut } from './progress';
import { finishBossBattle, finishCheckpoint } from './rewards';

const at = new Date('2026-03-10T09:00:00Z');
const answer: Answer = { type: 'multiple_choice', selectedIndex: 0 };

function started(ids: string[], now = 1_000): BossSessionState {
  return bossSessionReducer(createBossSession(ids), { type: 'start', now });
}

describe('which questions a boss battle can use', () => {
  it('uses every question from lessons the learner played to the end', () => {
    const [first, second] = unit1.lessons;
    const played = markLessonCompleted(createInitialProgress(), first.id, at);
    const mastered = masteredQuestionIds(unit1, played);
    expect([...mastered].sort()).toEqual(first.questions.map((question) => question.id).sort());
    expect(second.questions.some((question) => mastered.has(question.id))).toBe(false);
  });

  it('leaves out tested-out lessons, but counts checkpoint questions answered right', () => {
    const [firstItem, secondItem] = unit1.checkpoint.items;
    const right = { [firstItem.question.id]: true, [secondItem.question.id]: false };
    const { state } = finishCheckpoint(createInitialProgress(), {
      unit: unit1,
      correctByQuestion: right,
      now: at,
    });
    const testedOut = markLessonsTestedOut(
      state,
      unit1.lessons.map((lesson) => lesson.id),
      at,
    );
    expect([...masteredQuestionIds(unit1, testedOut)]).toEqual([firstItem.question.id]);
  });

  it('counts a checkpoint passed before right answers were saved as all right', () => {
    const progress = createInitialProgress();
    progress.checkpoints[unit1.checkpoint.id] = {
      passedAt: at.toISOString(),
      attempts: 1,
      lastAttempt: null,
      correctQuestionIds: [],
    };
    expect(masteredQuestionIds(unit1, progress).size).toBe(unit1.checkpoint.items.length);
  });

  it('builds the pool in path order from mastered ids only', () => {
    const lesson = unit1.lessons[2];
    const mastered = new Set([lesson.questions[1].id, lesson.questions[0].id, 'unknown']);
    expect(bossQuestionPool(unit1, mastered).map((question) => question.id)).toEqual([
      lesson.questions[0].id,
      lesson.questions[1].id,
    ]);
  });
});

describe('selecting boss questions', () => {
  const pool: Question[] = unit1.lessons.flatMap((lesson) => lesson.questions);

  it('is repeatable for a seed, and different for another seed', () => {
    const ids = (seed: number) => selectBossQuestions(pool, seed).map((question) => question.id);
    expect(ids(42)).toEqual(ids(42));
    expect(ids(42)).not.toEqual(ids(7));
  });

  it('takes at most the maximum, with no repeats', () => {
    const picked = selectBossQuestions(pool, 3);
    expect(picked).toHaveLength(BOSS_RULES.maxQuestions);
    expect(new Set(picked.map((question) => question.id)).size).toBe(picked.length);
    expect(selectBossQuestions(pool.slice(0, 5), 3)).toHaveLength(5);
  });

  it('mixes question types instead of bunching them', () => {
    const picked = selectBossQuestions(pool, 11);
    const types = new Set(picked.map((question) => question.type));
    expect(types.size).toBeGreaterThanOrEqual(3);
    const types4 = picked.slice(0, 4).map((question) => question.type);
    expect(new Set(types4).size).toBe(4);
  });
});

describe('boss round timing and scoring', () => {
  it('starts the clock on start and counts down', () => {
    const intro = createBossSession(['a', 'b']);
    expect(bossTimeLeftMs(intro, 0)).toBe(BOSS_RULES.durationMs);
    const state = started(['a', 'b'], 1_000);
    expect(state.phase).toBe('playing');
    expect(currentBossQuestionId(state)).toBe('a');
    expect(bossTimeLeftMs(state, 21_000)).toBe(40_000);
    expect(bossSecondsLeft(state, 60_500)).toBe(1);
    expect(bossSecondsLeft(state, 61_000)).toBe(0);
  });

  it('takes a longer round when asked', () => {
    const state = bossSessionReducer(createBossSession(['a']), {
      type: 'start',
      now: 0,
      durationMs: BOSS_RULES.extendedDurationMs,
    });
    expect(bossTimeLeftMs(state, 90_000)).toBe(30_000);
  });

  it('moves on after every answer, right or wrong: no second tries', () => {
    let state = started(['a', 'b', 'c']);
    state = bossSessionReducer(state, { type: 'answer', answer, correct: false, now: 5_000 });
    expect(currentBossQuestionId(state)).toBe('b');
    state = bossSessionReducer(state, { type: 'answer', answer, correct: true, now: 9_000 });
    expect(currentBossQuestionId(state)).toBe('c');
    expect(state.results.map((result) => result.questionId)).toEqual(['a', 'b']);
  });

  it('ends when every question is answered, keeping the time left', () => {
    let state = started(['a', 'b']);
    state = bossSessionReducer(state, { type: 'answer', answer, correct: true, now: 11_000 });
    state = bossSessionReducer(state, { type: 'answer', answer, correct: true, now: 21_000 });
    expect(state.phase).toBe('finished');
    expect(state.endReason).toBe('all_answered');
    expect(scoreBoss(state)).toEqual({
      correct: 2,
      answered: 2,
      total: 2,
      accuracy: 1,
      timeLeftMs: 40_000,
    });
  });

  it('ends when time runs out, and ignores an answer after the buzzer', () => {
    let state = started(['a', 'b', 'c']);
    state = bossSessionReducer(state, { type: 'answer', answer, correct: true, now: 30_000 });
    expect(bossSessionReducer(state, { type: 'tick', now: 60_999 })).toBe(state);
    const late = bossSessionReducer(state, { type: 'answer', answer, correct: true, now: 61_000 });
    expect(late.phase).toBe('finished');
    expect(late.endReason).toBe('time_up');
    expect(late.results).toHaveLength(1);

    const ticked = bossSessionReducer(state, { type: 'tick', now: 61_000 });
    expect(ticked).toEqual(late);
    expect(scoreBoss(ticked)).toMatchObject({ correct: 1, answered: 1, total: 3, timeLeftMs: 0 });
  });

  it('scores zero accuracy when nothing was answered', () => {
    const state = bossSessionReducer(started(['a']), { type: 'tick', now: 99_000 });
    expect(scoreBoss(state)).toMatchObject({ correct: 0, answered: 0, accuracy: 0 });
  });

  it('ignores actions out of turn', () => {
    const intro = createBossSession(['a']);
    expect(bossSessionReducer(intro, { type: 'tick', now: 99_000 })).toBe(intro);
    expect(bossSessionReducer(intro, { type: 'answer', answer, correct: true, now: 1 })).toBe(
      intro,
    );
    const state = started(['a']);
    expect(bossSessionReducer(state, { type: 'start', now: 5 })).toBe(state);
  });
});

describe('finishing a boss battle', () => {
  it('pays the bonus once a day per unit and keeps the best score', () => {
    const first = finishBossBattle(createInitialProgress(), {
      unitId: unit1.id,
      correct: 8,
      answered: 9,
      now: at,
    });
    expect(first.award).toEqual({ kind: 'bonus', base: 24, accuracyBonus: 5, total: 29 });
    expect(first.state.activity.totalXp).toBe(29);
    expect(first.newBest).toBe(false);

    const again = finishBossBattle(first.state, {
      unitId: unit1.id,
      correct: 10,
      answered: 10,
      now: new Date(at.getTime() + 3_600_000),
    });
    expect(again.award).toEqual({ kind: 'already_earned_today', total: 0 });
    expect(again.state.activity.totalXp).toBe(29);
    expect(again.newBest).toBe(true);
    expect(again.state.bossBattles[unit1.id]).toMatchObject({ plays: 2, bestCorrect: 10 });

    const tomorrow = finishBossBattle(again.state, {
      unitId: unit1.id,
      correct: 3,
      answered: 6,
      now: new Date(at.getTime() + 86_400_000),
    });
    expect(tomorrow.award).toMatchObject({ kind: 'bonus', total: 9 });
    expect(tomorrow.state.bossBattles[unit1.id].bestCorrect).toBe(10);
  });
});
