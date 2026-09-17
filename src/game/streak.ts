/**
 * Daily goal, streaks and XP history. Days are the learner's local calendar dates, passed in as
 * `today` so the rules can be tested for any date.
 */

/** A local calendar date written as YYYY-MM-DD. */
export type DateKey = string;

export type StreakChange = 'none' | 'started' | 'extended' | 'frozen' | 'reset';

export const DEFAULT_DAILY_GOAL = 20;
export const HISTORY_DAYS = 30;
export const MAX_FREEZES = 1;

const DAY_MS = 86_400_000;

export interface ActivityState {
  totalXp: number;
  /** XP earned on each of the last 30 days. */
  xpByDay: Record<DateKey, number>;
  /** Days in the last 30 on which the daily goal was met. */
  goalMetDays: DateKey[];
  currentStreak: number;
  longestStreak: number;
  /** The latest day that kept the streak alive, by meeting the goal or by a freeze. */
  lastStreakDay: DateKey | null;
  freezesHeld: number;
  /** Days in the last 30 that a freeze covered. */
  freezeUsedDays: DateKey[];
}

export function createActivity(): ActivityState {
  return {
    totalXp: 0,
    xpByDay: {},
    goalMetDays: [],
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDay: null,
    freezesHeld: 0,
    freezeUsedDays: [],
  };
}

const pad = (value: number) => String(value).padStart(2, '0');

/** The local calendar date of a moment, not the UTC date. */
export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateKeyToUtcMs(key: DateKey): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Calendar arithmetic on date keys. Unaffected by time zones or daylight saving. */
export function addDays(key: DateKey, days: number): DateKey {
  const date = new Date(dateKeyToUtcMs(key) + days * DAY_MS);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((dateKeyToUtcMs(to) - dateKeyToUtcMs(from)) / DAY_MS);
}

function withinHistory(day: DateKey, today: DateKey): boolean {
  const age = daysBetween(day, today);
  return age >= 0 && age < HISTORY_DAYS;
}

function pruneHistory(activity: ActivityState, today: DateKey): ActivityState {
  return {
    ...activity,
    xpByDay: Object.fromEntries(
      Object.entries(activity.xpByDay).filter(([day]) => withinHistory(day, today)),
    ),
    goalMetDays: activity.goalMetDays.filter((day) => withinHistory(day, today)),
    freezeUsedDays: activity.freezeUsedDays.filter((day) => withinHistory(day, today)),
  };
}

/**
 * Brings the streak up to date for `today`. The streak survives if it was kept alive yesterday or
 * today. If exactly one day was missed and a freeze is held, the freeze covers that day. Otherwise
 * the streak resets to zero. A freeze is not spent when it cannot save the streak.
 */
export function rollOver(
  activity: ActivityState,
  today: DateKey,
): { activity: ActivityState; change: StreakChange } {
  const { lastStreakDay, currentStreak } = activity;
  if (lastStreakDay === null || currentStreak === 0) return { activity, change: 'none' };
  const gap = daysBetween(lastStreakDay, today);
  if (gap <= 1) return { activity, change: 'none' };
  if (gap === 2 && activity.freezesHeld > 0) {
    const missedDay = addDays(today, -1);
    return {
      activity: {
        ...activity,
        freezesHeld: activity.freezesHeld - 1,
        freezeUsedDays: [...activity.freezeUsedDays, missedDay],
        lastStreakDay: missedDay,
      },
      change: 'frozen',
    };
  }
  return { activity: { ...activity, currentStreak: 0 }, change: 'reset' };
}

export interface XpRecorded {
  activity: ActivityState;
  /** True the first time today's XP reaches the daily goal. */
  goalJustMet: boolean;
  change: StreakChange;
}

export function recordXp(
  activity: ActivityState,
  amount: number,
  today: DateKey,
  dailyGoal: number,
): XpRecorded {
  const rolled = rollOver(activity, today);
  let next = rolled.activity;
  let change = rolled.change;
  if (amount <= 0) return { activity: next, goalJustMet: false, change };

  const before = next.xpByDay[today] ?? 0;
  const after = before + amount;
  next = {
    ...next,
    totalXp: next.totalXp + amount,
    xpByDay: { ...next.xpByDay, [today]: after },
  };

  const goalJustMet = before < dailyGoal && after >= dailyGoal;
  if (goalJustMet && next.lastStreakDay !== today) {
    const continues =
      next.currentStreak > 0 &&
      next.lastStreakDay !== null &&
      daysBetween(next.lastStreakDay, today) === 1;
    const currentStreak = continues ? next.currentStreak + 1 : 1;
    next = {
      ...next,
      currentStreak,
      longestStreak: Math.max(next.longestStreak, currentStreak),
      lastStreakDay: today,
      goalMetDays: [...next.goalMetDays, today],
    };
    change = continues ? 'extended' : 'started';
  }

  return { activity: pruneHistory(next, today), goalJustMet, change };
}

/** Gives the learner a streak freeze, up to the maximum they can hold. */
export function grantFreeze(activity: ActivityState): {
  activity: ActivityState;
  granted: boolean;
} {
  if (activity.freezesHeld >= MAX_FREEZES) return { activity, granted: false };
  return { activity: { ...activity, freezesHeld: activity.freezesHeld + 1 }, granted: true };
}

export interface DailyStatus {
  xpToday: number;
  dailyGoal: number;
  goalMetToday: boolean;
  /** 0 to 1. */
  goalProgress: number;
  xpToGoal: number;
  streak: number;
  longestStreak: number;
  freezesHeld: number;
}

/** What to show for today, as if the streak had already been rolled over. */
export function dailyStatus(
  activity: ActivityState,
  today: DateKey,
  dailyGoal: number,
): DailyStatus {
  const current = rollOver(activity, today).activity;
  const xpToday = current.xpByDay[today] ?? 0;
  return {
    xpToday,
    dailyGoal,
    goalMetToday: xpToday >= dailyGoal,
    goalProgress: Math.min(1, dailyGoal > 0 ? xpToday / dailyGoal : 1),
    xpToGoal: Math.max(0, dailyGoal - xpToday),
    streak: current.currentStreak,
    longestStreak: current.longestStreak,
    freezesHeld: current.freezesHeld,
  };
}

export interface DayActivity {
  day: DateKey;
  xp: number;
  goalMet: boolean;
  frozen: boolean;
}

/** The last `count` days, oldest first, ending today. */
export function recentDays(activity: ActivityState, today: DateKey, count = 14): DayActivity[] {
  return Array.from({ length: count }, (_, index) => {
    const day = addDays(today, index - count + 1);
    return {
      day,
      xp: activity.xpByDay[day] ?? 0,
      goalMet: activity.goalMetDays.includes(day),
      frozen: activity.freezeUsedDays.includes(day),
    };
  });
}
