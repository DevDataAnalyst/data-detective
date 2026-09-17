import { useEffect, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { applyDayRollover } from '../game/rewards';
import { now, useToday } from '../storage/clock';
import { useProgressStore } from '../storage/progressContext';
import { CelebrationContext, type GoalCelebration } from './celebration/celebrationContext';
import { GoalCelebrationToast } from './celebration/GoalCelebrationToast';

/** Wraps every route: keeps the streak up to date and shows app-wide celebrations. */
export function RootLayout() {
  const store = useProgressStore();
  const today = useToday();
  const [celebration, setCelebration] = useState<(GoalCelebration & { id: number }) | null>(null);

  // Save streak changes from days away, such as a freeze covering a missed day.
  useEffect(() => {
    store.update((state) => applyDayRollover(state, now()).state);
  }, [store, today]);

  const celebrate = (next: GoalCelebration) =>
    setCelebration((previous) => ({ ...next, id: (previous?.id ?? 0) + 1 }));

  return (
    <CelebrationContext value={celebrate}>
      {/* New pages start at the top; back and forward return to where the learner was. */}
      <ScrollRestoration />
      <Outlet />
      {celebration && (
        <GoalCelebrationToast
          key={celebration.id}
          celebration={celebration}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </CelebrationContext>
  );
}
