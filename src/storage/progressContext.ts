import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ProgressState } from '../game/progress';
import type { ProgressStore } from './progressStore';

export const ProgressContext = createContext<ProgressStore | null>(null);

export function useProgressStore(): ProgressStore {
  const store = useContext(ProgressContext);
  if (!store) throw new Error('useProgressStore must be used inside <ProgressProvider>');
  return store;
}

/** The learner's current progress. Re-renders when it changes. */
export function useProgress(): ProgressState {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
