import { createEventLog } from './events';
import { openBrowserStorage } from './keyValue';
import { createProgressStore } from './progressStore';

const browserStorage = openBrowserStorage();

/** The app's single progress store, saved to localStorage when it is available. */
export const appProgressStore = createProgressStore(browserStorage.store, {
  persistent: browserStorage.persistent,
});

/** The app's playtest event log, saved beside progress and never sent anywhere. */
export const appEventLog = createEventLog(browserStorage.store);
