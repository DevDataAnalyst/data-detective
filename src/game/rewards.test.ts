import { describe, expect, it } from 'vitest';
import { createInitialProgress } from './progress';
import { applyDayRollover, awardXp, completeLesson } from './rewards';
import { grantFreeze } from './streak';

const at = (day: number, hour = 10) => new Date(2026, 2, day, hour, 0);

describe('completing lessons', () => {
  it('awards first-completion XP and marks the lesson completed', () => {
    const outcome = completeLesson(createInitialProgress(), {
      lessonId: 'the-mean',
      firstAttemptAccuracy: 0.8,
      now: at(10),
    });
    expect(outcome.award).toEqual({ kind: 'first_completion', base: 10, bonus: 3, total: 13 });
    expect(outcome.state.lessons['the-mean']).toBeDefined();
    expect(outcome.state.activity.totalXp).toBe(13);
    expect(outcome.goalJustMet).toBe(false);
  });

  it('meets the daily goal with a new lesson plus practice', () => {
    let state = completeLesson(createInitialProgress(), {
      lessonId: 'the-mean',
      firstAttemptAccuracy: 1,
      now: at(10),
    }).state;
    const practice = completeLesson(state, {
      lessonId: 'the-mean',
      firstAttemptAccuracy: 1,
      now: at(10, 11),
    });
    state = practice.state;
    expect(practice.award).toEqual({ kind: 'practice', total: 5 });
    expect(practice.goalJustMet).toBe(true);
    expect(state.activity.currentStreak).toBe(1);
  });

  it('caps practice XP at two awards per lesson per day, and resets the next day', () => {
    let state = completeLesson(createInitialProgress(), {
      lessonId: 'a',
      firstAttemptAccuracy: 1,
      now: at(10),
    }).state;
    const totals: number[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const outcome = completeLesson(state, {
        lessonId: 'a',
        firstAttemptAccuracy: 1,
        now: at(10),
      });
      totals.push(outcome.award.total);
      state = outcome.state;
    }
    expect(totals).toEqual([5, 5, 0]);

    // Another lesson the same day still pays.
    state = completeLesson(state, { lessonId: 'b', firstAttemptAccuracy: 1, now: at(10) }).state;
    expect(
      completeLesson(state, { lessonId: 'b', firstAttemptAccuracy: 1, now: at(10) }).award.total,
    ).toBe(5);

    // Practice on lesson a pays again the next day.
    expect(
      completeLesson(state, { lessonId: 'a', firstAttemptAccuracy: 1, now: at(11) }).award.total,
    ).toBe(5);
  });
});

describe('day rollover', () => {
  it('saves a used freeze and reports it', () => {
    let state = awardXp(createInitialProgress(), 20, at(10)).state;
    state = { ...state, activity: grantFreeze(state.activity).activity };
    const rolled = applyDayRollover(state, at(12));
    expect(rolled.streakChange).toBe('frozen');
    expect(rolled.state.activity.freezesHeld).toBe(0);
    expect(rolled.state.activity.currentStreak).toBe(1);
  });

  it('returns the same state when nothing changed', () => {
    const state = awardXp(createInitialProgress(), 20, at(10)).state;
    expect(applyDayRollover(state, at(11)).state).toBe(state);
  });
});
