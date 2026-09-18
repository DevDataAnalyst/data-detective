/**
 * Light or dark appearance. The learner's choice is saved on the device; "system" follows the
 * device setting and changes with it. `index.html` applies the same rule before the app loads, so
 * the first paint is already in the right theme.
 */
import type { KeyValueStore } from './keyValue';

export const THEME_STORAGE_KEY = 'data-detective:theme';
export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type Theme = 'light' | 'dark';

/** The browser bar colour for each theme, matching the app's top bar. */
export const THEME_COLORS: Record<Theme, string> = { light: '#ffffff', dark: '#111a2e' };

export function parseThemePreference(value: string | null): ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : 'system';
}

export function resolveTheme(preference: ThemePreference, deviceIsDark: boolean): Theme {
  if (preference === 'system') return deviceIsDark ? 'dark' : 'light';
  return preference;
}

export interface ThemeState {
  preference: ThemePreference;
  theme: Theme;
}

/** What the store needs from the browser. Tests pass fakes. */
export interface ThemeEnvironment {
  storage: KeyValueStore;
  /** The `(prefers-color-scheme: dark)` query, when the browser has one. */
  media: { matches: boolean; addEventListener(type: 'change', listener: () => void): void } | null;
  /** Where `data-theme` goes: `<html>` in the app, or nothing in isolated tests. */
  root: HTMLElement | null;
}

export interface ThemeStore {
  getSnapshot(): ThemeState;
  subscribe(listener: () => void): () => void;
  setPreference(preference: ThemePreference): void;
}

export function createThemeStore({ storage, media, root }: ThemeEnvironment): ThemeStore {
  const listeners = new Set<() => void>();
  let preference: ThemePreference = 'system';
  try {
    preference = parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage blocked: follow the device.
  }

  const compute = (): ThemeState => ({
    preference,
    theme: resolveTheme(preference, media?.matches ?? false),
  });
  let state = compute();

  const apply = () => {
    if (!root) return;
    root.dataset.theme = state.theme;
    root.ownerDocument
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[state.theme]);
  };

  const update = () => {
    const next = compute();
    if (next.preference === state.preference && next.theme === state.theme) return;
    state = next;
    apply();
    listeners.forEach((listener) => listener());
  };

  apply();
  // While on "system", switching the device between light and dark switches the app too.
  media?.addEventListener('change', update);

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPreference(next) {
      preference = next;
      try {
        if (next === 'system') storage.removeItem(THEME_STORAGE_KEY);
        else storage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // The choice still applies until the page is reloaded.
      }
      update();
    },
  };
}
