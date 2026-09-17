/**
 * Turns learner achievements into progress updates: XP, the daily goal and the streak. Every
 * function is pure and takes `now`, so tests can pick any date and time.
 */
import { markLessonCompleted, type ProgressState } from './progress';
import { recordXp, rollOver, toDateKey, type StreakChange } from './streak';
import { lessonXp, type LessonXpAward } from './xp';

export interface XpOutcome {
  state: ProgressState;
  xp: number;
  goalJustMet: boolean;
  streakChange: StreakChange;
}

/** Adds XP for today and updates the daily goal and streak. */
export function awardXp(state: ProgressState, amount: number, now: Date): XpOutcome {
  const recorded = recordXp(state.activity, amount, toDateKey(now), state.dailyGoal);
  return {
    state: recorded.activity === state.activity ? state : { ...state, activity: recorded.activity },
    xp: Math.max(0, amount),
    goalJustMet: recorded.goalJustMet,
    streakChange: recorded.change,
  };
}

/** Saves any streak change that happened since the app was last used, such as a used freeze. */
export function applyDayRollover(
  state: ProgressState,
  now: Date,
): { state: ProgressState; streakChange: StreakChange } {
  const rolled = rollOver(state.activity, toDateKey(now));
  if (rolled.change === 'none') return { state, streakChange: 'none' };
  return { state: { ...state, activity: rolled.activity }, streakChange: rolled.change };
}

export interface LessonOutcome extends XpOutcome {
  award: LessonXpAward;
}

export function completeLesson(
  state: ProgressState,
  input: { lessonId: string; firstAttemptAccuracy: number; now: Date },
): LessonOutcome {
  const today = toDateKey(input.now);
  const practiceCounts = state.practiceAwards.day === today ? state.practiceAwards.counts : {};
  const award = lessonXp({
    alreadyCompleted: Boolean(state.lessons[input.lessonId]),
    firstAttemptAccuracy: input.firstAttemptAccuracy,
    practiceAwardsToday: practiceCounts[input.lessonId] ?? 0,
  });

  let next = markLessonCompleted(state, input.lessonId, input.now);
  if (award.kind === 'practice') {
    next = {
      ...next,
      practiceAwards: {
        day: today,
        counts: { ...practiceCounts, [input.lessonId]: (practiceCounts[input.lessonId] ?? 0) + 1 },
      },
    };
  }

  const outcome = awardXp(next, award.total, input.now);
  return { ...outcome, award };
}
