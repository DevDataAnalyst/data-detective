import { createContext, useContext } from 'react';

export interface GoalCelebration {
  streak: number;
  xpToday: number;
  dailyGoal: number;
}

/** Shows the daily goal celebration. A no-op outside the app root, for isolated component tests. */
export const CelebrationContext = createContext<(celebration: GoalCelebration) => void>(() => {});

export function useCelebrate() {
  return useContext(CelebrationContext);
}
