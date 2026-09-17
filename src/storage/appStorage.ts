import { openBrowserStorage } from './keyValue';
import { createProgressStore } from './progressStore';

const browserStorage = openBrowserStorage();

/** The app's single progress store, saved to localStorage when it is available. */
export const appProgressStore = createProgressStore(browserStorage.store, {
  persistent: browserStorage.persistent,
});
