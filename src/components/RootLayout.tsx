import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { applyDayRollover } from '../game/rewards';
import { now, useToday } from '../storage/clock';
import { useProgressStore } from '../storage/progressContext';
import { CelebrationContext, type GoalCelebration } from './celebration/celebrationContext';
import { GoalCelebrationToast } from './celebration/GoalCelebrationToast';
import { useOnline } from './hooks';
import { AlertIcon, CloseIcon } from './icons';

/** Wraps every route: keeps the streak up to date and shows app-wide celebrations. */
export function RootLayout() {
  const store = useProgressStore();
  const today = useToday();
  const [celebration, setCelebration] = useState<(GoalCelebration & { id: number }) | null>(null);
  const [storageNoticeDismissed, setStorageNoticeDismissed] = useState(false);
  const online = useOnline();
  const persistent = useSyncExternalStore(
    store.subscribe,
    () => store.persistent,
    () => true,
  );

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
      {!persistent && !storageNoticeDismissed && (
        <Notice onDismiss={() => setStorageNoticeDismissed(true)}>
          This browser isn’t saving your progress, perhaps because of private browsing or blocked
          site data. You can keep learning, but your progress will be lost when you close this tab.
        </Notice>
      )}
      {!online && (
        <Notice>
          You’re offline. Lessons keep working, and progress is saved on this device. The mission
          needs a connection to load Python.
        </Notice>
      )}
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

function Notice({ children, onDismiss }: { children: ReactNode; onDismiss?: () => void }) {
  return (
    <div role="status" className="border-b border-incorrect-200 bg-incorrect-50 text-incorrect-900">
      <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-2.5 text-sm">
        <AlertIcon className="mt-0.5 shrink-0 text-lg" aria-hidden="true" />
        <p className="min-w-0 flex-1">{children}</p>
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="-my-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-incorrect-100"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}
