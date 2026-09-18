import { createEventLog } from './events';
import { openBrowserStorage } from './keyValue';
import { createProgressStore } from './progressStore';
import { createThemeStore } from './theme';

const browserStorage = openBrowserStorage();

/** The app's single progress store, saved to localStorage when it is available. */
export const appProgressStore = createProgressStore(browserStorage.store, {
  persistent: browserStorage.persistent,
});

/** The app's playtest event log, saved beside progress and never sent anywhere. */
export const appEventLog = createEventLog(browserStorage.store);

/** Light or dark, following the device unless the learner picks one. Applied to <html>. */
export const appThemeStore = createThemeStore({
  storage: browserStorage.store,
  media:
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null,
  root: document.documentElement,
});
