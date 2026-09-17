import { describe, expect, it } from 'vitest';
import {
  addDays,
  createActivity,
  dailyStatus,
  daysBetween,
  grantFreeze,
  HISTORY_DAYS,
  recentDays,
  recordXp,
  rollOver,
  toDateKey,
  type ActivityState,
} from './streak';

const GOAL = 20;

/** Earns XP on a given day and returns the new activity. */
function earn(activity: ActivityState, day: string, xp: number) {
  return recordXp(activity, xp, day, GOAL);
}

/** An activity with the goal met on each listed day, in order. */
function metOn(...days: string[]): ActivityState {
  return days.reduce((activity, day) => earn(activity, day, GOAL).activity, createActivity());
}

describe('dates', () => {
  it('uses the local calendar date, not UTC', () => {
    expect(toDateKey(new Date(2026, 0, 31, 23, 59))).toBe('2026-01-31');
    expect(toDateKey(new Date(2026, 1, 1, 0, 1))).toBe('2026-02-01');
  });

  it('adds days across month, leap-day and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
  });
});

describe('daily goal', () => {
  it('does not count a day below the goal', () => {
    const result = earn(createActivity(), '2026-03-10', 15);
    expect(result.goalJustMet).toBe(false);
    expect(result.activity.currentStreak).toBe(0);
    expect(dailyStatus(result.activity, '2026-03-10', GOAL)).toMatchObject({
      xpToday: 15,
      goalMetToday: false,
      xpToGoal: 5,
      goalProgress: 0.75,
    });
  });

  it('starts a streak when the goal is met, and only counts the day once', () => {
    const first = earn(earn(createActivity(), '2026-03-10', 15).activity, '2026-03-10', 10);
    expect(first.goalJustMet).toBe(true);
    expect(first.change).toBe('started');
    expect(first.activity.currentStreak).toBe(1);

    const more = earn(first.activity, '2026-03-10', 10);
    expect(more.goalJustMet).toBe(false);
    expect(more.activity.currentStreak).toBe(1);
    expect(more.activity.totalXp).toBe(35);
    expect(more.activity.goalMetDays).toEqual(['2026-03-10']);
  });

  it('keeps XP from crossing midnight on separate days', () => {
    const lateNight = toDateKey(new Date(2026, 2, 10, 23, 50));
    const earlyMorning = toDateKey(new Date(2026, 2, 11, 0, 10));
    const afterLateNight = earn(createActivity(), lateNight, 15);
    const afterMorning = earn(afterLateNight.activity, earlyMorning, 10);
    expect(afterMorning.goalJustMet).toBe(false);
    expect(afterMorning.activity.xpByDay).toEqual({ '2026-03-10': 15, '2026-03-11': 10 });
    expect(afterMorning.activity.currentStreak).toBe(0);
  });
});

describe('streaks', () => {
  it('grows on consecutive days and tracks the longest', () => {
    const activity = metOn('2026-03-10', '2026-03-11', '2026-03-12');
    expect(activity.currentStreak).toBe(3);
    expect(activity.longestStreak).toBe(3);
  });

  it('continues across a month boundary', () => {
    const activity = metOn('2026-01-30', '2026-01-31', '2026-02-01');
    expect(activity.currentStreak).toBe(3);
  });

  it('stays alive today when the goal was met yesterday, but shows today as not yet met', () => {
    const activity = metOn('2026-03-10', '2026-03-11');
    expect(dailyStatus(activity, '2026-03-12', GOAL)).toMatchObject({
      streak: 2,
      goalMetToday: false,
    });
  });

  it('resets to zero after a full missed day without a freeze', () => {
    const activity = metOn('2026-03-10', '2026-03-11');
    expect(dailyStatus(activity, '2026-03-13', GOAL).streak).toBe(0);
    expect(rollOver(activity, '2026-03-13').change).toBe('reset');

    const restarted = earn(activity, '2026-03-13', GOAL);
    expect(restarted.change).toBe('started');
    expect(restarted.activity.currentStreak).toBe(1);
    expect(restarted.activity.longestStreak).toBe(2);
  });

  it('uses a freeze automatically to cover exactly one missed day', () => {
    const withFreeze = grantFreeze(metOn('2026-03-10', '2026-03-11', '2026-03-12')).activity;
    // Missed 13 March.
    expect(dailyStatus(withFreeze, '2026-03-14', GOAL)).toMatchObject({
      streak: 3,
      freezesHeld: 0,
    });
    const rolled = rollOver(withFreeze, '2026-03-14');
    expect(rolled.change).toBe('frozen');
    expect(rolled.activity.freezeUsedDays).toEqual(['2026-03-13']);

    const next = earn(withFreeze, '2026-03-14', GOAL);
    expect(next.change).toBe('extended');
    expect(next.activity.currentStreak).toBe(4);
    expect(next.activity.freezesHeld).toBe(0);
  });

  it('does not spend a freeze that cannot save the streak', () => {
    const withFreeze = grantFreeze(metOn('2026-03-10', '2026-03-11')).activity;
    // Missed 12 and 13 March: one freeze is not enough.
    const rolled = rollOver(withFreeze, '2026-03-14');
    expect(rolled.change).toBe('reset');
    expect(rolled.activity.currentStreak).toBe(0);
    expect(rolled.activity.freezesHeld).toBe(1);
  });

  it('lets a freeze cover a missed day that falls in a new month', () => {
    const withFreeze = grantFreeze(metOn('2026-02-27', '2026-02-28')).activity;
    const next = earn(withFreeze, '2026-03-02', GOAL);
    expect(next.activity.freezeUsedDays).toEqual(['2026-03-01']);
    expect(next.activity.currentStreak).toBe(3);
  });

  it('holds at most one freeze', () => {
    const once = grantFreeze(createActivity());
    const twice = grantFreeze(once.activity);
    expect(once.granted).toBe(true);
    expect(twice.granted).toBe(false);
    expect(twice.activity.freezesHeld).toBe(1);
  });

  it('ignores the clock moving backwards', () => {
    const activity = metOn('2026-03-10', '2026-03-11');
    expect(rollOver(activity, '2026-03-09').change).toBe('none');
  });
});

describe('history', () => {
  it(`keeps XP for the last ${HISTORY_DAYS} days only`, () => {
    let activity = createActivity();
    for (let offset = 0; offset < 40; offset += 1) {
      activity = earn(activity, addDays('2026-01-01', offset), 5).activity;
    }
    const days = Object.keys(activity.xpByDay).sort();
    expect(days).toHaveLength(HISTORY_DAYS);
    expect(days[0]).toBe('2026-01-11');
    expect(days.at(-1)).toBe('2026-02-09');
    expect(activity.totalXp).toBe(200);
  });

  it('lists the last 14 days oldest first, including days with no XP', () => {
    const activity = metOn('2026-03-10');
    const days = recentDays(activity, '2026-03-12', 14);
    expect(days).toHaveLength(14);
    expect(days[0].day).toBe('2026-02-27');
    expect(days.at(-1)).toEqual({ day: '2026-03-12', xp: 0, goalMet: false, frozen: false });
    expect(days.find((day) => day.day === '2026-03-10')).toEqual({
      day: '2026-03-10',
      xp: 20,
      goalMet: true,
      frozen: false,
    });
  });
});
