import { describe, expect, it } from 'vitest';
import {
  accuracyBonus,
  checkpointXp,
  lessonXp,
  missionTaskXp,
  missionXpSummary,
  stretchTaskXp,
} from './xp';

describe('lesson XP', () => {
  it('gives an accuracy bonus of 5 for 100%, 3 for 80% or more, otherwise none', () => {
    expect(accuracyBonus(1)).toBe(5);
    expect(accuracyBonus(0.875)).toBe(3);
    expect(accuracyBonus(0.8)).toBe(3);
    expect(accuracyBonus(0.79)).toBe(0);
    expect(accuracyBonus(0)).toBe(0);
  });

  it('awards 10 XP plus the bonus for a first completion', () => {
    expect(
      lessonXp({ alreadyCompleted: false, firstAttemptAccuracy: 1, practiceAwardsToday: 0 }),
    ).toEqual({ kind: 'first_completion', base: 10, bonus: 5, total: 15 });
    expect(
      lessonXp({ alreadyCompleted: false, firstAttemptAccuracy: 0.5, practiceAwardsToday: 0 }),
    ).toEqual({ kind: 'first_completion', base: 10, bonus: 0, total: 10 });
  });

  it('awards a flat 5 XP for practice, at most twice per lesson per day', () => {
    const practice = (practiceAwardsToday: number) =>
      lessonXp({ alreadyCompleted: true, firstAttemptAccuracy: 1, practiceAwardsToday });
    expect(practice(0)).toEqual({ kind: 'practice', total: 5 });
    expect(practice(1)).toEqual({ kind: 'practice', total: 5 });
    expect(practice(2)).toEqual({ kind: 'practice_limit_reached', total: 0 });
  });
});

describe('checkpoint and mission XP', () => {
  it('awards 40 XP for passing the checkpoint, once', () => {
    expect(checkpointXp(false)).toBe(40);
    expect(checkpointXp(true)).toBe(0);
  });

  it('splits the 100 mission XP across the required tasks without losing any', () => {
    expect([0, 1, 2, 3, 4].map((index) => missionTaskXp(index, 5))).toEqual([20, 20, 20, 20, 20]);
    const three = [0, 1, 2].map((index) => missionTaskXp(index, 3));
    expect(three).toEqual([33, 33, 34]);
    expect(three.reduce((a, b) => a + b)).toBe(100);
  });

  it('pays up to 30 XP for stretch tasks', () => {
    expect(stretchTaskXp(0)).toBe(15);
    expect(stretchTaskXp(1)).toBe(15);
    expect(stretchTaskXp(2)).toBe(0);
  });

  it('summarises mission XP as base plus stretch', () => {
    expect(
      missionXpSummary({ requiredTasksPassed: 5, requiredTaskCount: 5, stretchTasksPassed: 2 }),
    ).toEqual({ base: 100, stretch: 30, total: 130 });
    expect(
      missionXpSummary({ requiredTasksPassed: 2, requiredTaskCount: 5, stretchTasksPassed: 3 }),
    ).toEqual({ base: 40, stretch: 30, total: 70 });
  });
});
