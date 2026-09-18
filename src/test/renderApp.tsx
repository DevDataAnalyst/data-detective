import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { isOnboarded } from '../game/progress';
import { completeOnboarding } from '../game/rewards';
import { routes } from '../routes';
import { createEventLog } from '../storage/events';
import { createMemoryStore, type KeyValueStore } from '../storage/keyValue';
import { ProgressProvider } from '../storage/ProgressProvider';
import { createProgressStore, type ProgressStore } from '../storage/progressStore';
import { createThemeStore } from '../storage/theme';

interface RenderAppOptions {
  path?: string;
  keyValue?: KeyValueStore;
  store?: ProgressStore;
  /** Set false to see onboarding, as a first-time visitor would. */
  onboarded?: boolean;
  /** Where the theme choice is saved, to test that it survives a refresh. */
  themeStorage?: KeyValueStore;
}

/**
 * Renders the whole app at a path, with its own in-memory storage. The learner has finished
 * onboarding (keeping the default daily goal) unless `onboarded` is false. The theme is applied to
 * the real `<html>`, as in the app; the test setup clears it after each test.
 */
export function renderApp({
  path = '/',
  keyValue,
  store,
  onboarded = true,
  themeStorage,
}: RenderAppOptions = {}) {
  const progressStore = store ?? createProgressStore(keyValue ?? createMemoryStore());
  const events = createEventLog(createMemoryStore());
  const theme = createThemeStore({
    storage: themeStorage ?? createMemoryStore(),
    media: null,
    root: document.documentElement,
  });
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
    <ProgressProvider store={progressStore} events={events} theme={theme}>
      <RouterProvider router={router} />
    </ProgressProvider>,
  );
  return { ...view, router, store: progressStore, events, theme };
}
