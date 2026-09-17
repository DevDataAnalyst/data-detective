import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { isOnboarded } from '../game/progress';
import { completeOnboarding } from '../game/rewards';
import { routes } from '../routes';
import { createEventLog } from '../storage/events';
import { createMemoryStore, type KeyValueStore } from '../storage/keyValue';
import { ProgressProvider } from '../storage/ProgressProvider';
import { createProgressStore, type ProgressStore } from '../storage/progressStore';

interface RenderAppOptions {
  path?: string;
  keyValue?: KeyValueStore;
  store?: ProgressStore;
  /** Set false to see onboarding, as a first-time visitor would. */
  onboarded?: boolean;
}

/**
 * Renders the whole app at a path, with its own in-memory storage. The learner has finished
 * onboarding (keeping the default daily goal) unless `onboarded` is false.
 */
export function renderApp({
  path = '/',
  keyValue,
  store,
  onboarded = true,
}: RenderAppOptions = {}) {
  const progressStore = store ?? createProgressStore(keyValue ?? createMemoryStore());
  const events = createEventLog(createMemoryStore());
  if (onboarded && !isOnboarded(progressStore.getSnapshot())) {
    progressStore.update((state) =>
      completeOnboarding(state, {
        goal: 'curious',
        dailyGoal: state.dailyGoal,
        now: new Date('2026-01-01T09:00:00Z'),
      }),
    );
  }
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <ProgressProvider store={progressStore} events={events}>
      <RouterProvider router={router} />
    </ProgressProvider>,
  );
  return { ...view, router, store: progressStore, events };
}
