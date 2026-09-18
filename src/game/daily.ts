/**
 * The daily challenge: one question a day, the same for every visitor on a date, with a result
 * to share. Pure, so the choice of question and the share text are tested for any date. It is
 * separate from the course: no XP, no streak and no lessons needed.
 */
import type { DailyQuestion } from '../content/daily';
import type { ProgressState } from './progress';
import { daysBetween, type DateKey } from './streak';

/** Challenge #1 was played on this date. */
export const DAILY_LAUNCH: DateKey = '2026-09-19';

/** Results older than this many days are dropped when a new one is saved. */
export const DAILY_HISTORY_DAYS = 60;

/** A time up to this many seconds is written in seconds; longer ones in minutes. */
const SECONDS_LIMIT = 120;

/** The challenge's number, counting from 1 on launch day. Before launch it is 0 or less. */
export function dailyNumber(date: DateKey): number {
  return daysBetween(DAILY_LAUNCH, date) + 1;
}

/**
 * " #12", to follow "Daily challenge". Empty before launch day, which only a device set to the
 * wrong date would see.
 */
export function dailyNumberText(date: DateKey): string {
  const number = dailyNumber(date);
  return number >= 1 ? ` #${number}` : '';
}

/**
 * The question for a date. Days take the list in order, then start again, so every visitor gets
 * the same question on the same local date. Adding questions to the end never changes a day that
 * has already been played, until the list wraps round.
 */
export function dailyQuestionFor<T>(date: DateKey, questions: readonly T[]): T {
  if (questions.length === 0) throw new Error('No daily questions');
  const day = daysBetween(DAILY_LAUNCH, date);
  const count = questions.length;
  return questions[((day % count) + count) % count];
}

export interface DailyResult {
  questionId: string;
  /** The option the learner picked. There is one try a day. */
  selectedIndex: number;
  correct: boolean;
  /** Whole seconds from starting the clock to checking the answer, at least 1. */
  seconds: number;
}

/** Seconds on the clock, rounded to the nearest whole second, and never 0. */
export function secondsTaken(startedAtMs: number, answeredAtMs: number): number {
  return Math.max(1, Math.round((answeredAtMs - startedAtMs) / 1000));
}

/**
 * Saves the day's result. The first result of a day stands, so the clock cannot be replayed for a
 * better time, and results older than {@link DAILY_HISTORY_DAYS} are dropped.
 */
export function saveDailyResult(
  state: ProgressState,
  date: DateKey,
  result: DailyResult,
): ProgressState {
  if (state.daily[date]) return state;
  const kept = Object.entries(state.daily).filter(([day]) => {
    const age = daysBetween(day, date);
    return age >= 0 && age < DAILY_HISTORY_DAYS;
  });
  return { ...state, daily: { ...Object.fromEntries(kept), [date]: result } };
}

/** The challenge's name, by what the learner has to do. */
export const DAILY_TITLES: Record<DailyQuestion['type'], string> = {
  spot_the_lie: 'Spot the lying chart',
  courtroom: 'Crack the case',
};

/** A time in words: "1 second", "8 seconds", "95 seconds", then "3 minutes". */
export function formatDailyTime(seconds: number): string {
  if (seconds === 1) return '1 second';
  if (seconds <= SECONDS_LIMIT) return `${seconds} seconds`;
  return `${Math.round(seconds / 60)} minutes`;
}

/** The line at the top of the share card, e.g. "I spotted the lying chart in 8 seconds — can you?" */
export function dailyShareHeadline(
  type: DailyQuestion['type'],
  result: Pick<DailyResult, 'correct' | 'seconds'>,
): string {
  const time = formatDailyTime(result.seconds);
  if (type === 'spot_the_lie') {
    return result.correct
      ? `I spotted the lying chart in ${time} — can you?`
      : 'Today’s lying chart fooled me — can you spot the lie?';
  }
  return result.correct
    ? `I cracked the case in ${time} — can you?`
    : 'Today’s case stumped me — can you crack it?';
}

/** What gets shared or copied as text: the headline, the challenge number and the link. */
export function dailyShareText(headline: string, date: DateKey, url: string): string {
  return `${headline}\nData Detective daily challenge${dailyNumberText(date)}\n${url}`;
}
