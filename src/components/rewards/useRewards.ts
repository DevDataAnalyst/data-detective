import { awardXp, completeLesson, type XpOutcome } from '../../game/rewards';
import { toDateKey, type DateKey } from '../../game/streak';
import { now } from '../../storage/clock';
import { useProgressStore } from '../../storage/progressContext';
import { useCelebrate } from '../celebration/celebrationContext';

/**
 * The one place the UI turns achievements into saved progress. Calls the pure reward rules with
 * the app clock, saves the result and celebrates the daily goal.
 */
export function useRewards() {
  const store = useProgressStore();
  const celebrate = useCelebrate();

  const save = <T extends XpOutcome>(outcome: T, day: DateKey): T => {
    store.update(() => outcome.state);
    if (outcome.goalJustMet) {
      const { activity, dailyGoal } = outcome.state;
      celebrate({
        streak: activity.currentStreak,
        xpToday: activity.xpByDay[day] ?? 0,
        dailyGoal,
      });
    }
    return outcome;
  };

  return {
    completeLesson(lessonId: string, firstAttemptAccuracy: number) {
      const at = now();
      const outcome = completeLesson(store.getSnapshot(), {
        lessonId,
        firstAttemptAccuracy,
        now: at,
      });
      return save(outcome, toDateKey(at));
    },
    awardXp(amount: number) {
      const at = now();
      return save(awardXp(store.getSnapshot(), amount, at), toDateKey(at));
    },
  };
}
