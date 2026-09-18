import { describe, expect, it, vi } from 'vitest';
import { createMemoryStore } from './keyValue';
import {
  createThemeStore,
  parseThemePreference,
  resolveTheme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
} from './theme';

/** A stand-in for the `(prefers-color-scheme: dark)` query that tests can flip. */
function fakeMedia(matches: boolean) {
  let listener: (() => void) | null = null;
  return {
    matches,
    addEventListener: (_type: string, callback: () => void) => {
      listener = callback;
    },
    set(next: boolean) {
      this.matches = next;
      listener?.();
    },
  };
}

function fakeRoot() {
  document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
  const root = document.createElement('html');
  document.documentElement.append(root);
  return { root, meta: () => document.querySelector('meta[name="theme-color"]') };
}

describe('theme rules', () => {
  it('follows the device unless the learner picks light or dark', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('reads saved choices defensively', () => {
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('purple')).toBe('system');
  });
});

describe('theme store', () => {
  it('starts from the device setting and applies it to the page', () => {
    const { root, meta } = fakeRoot();
    const store = createThemeStore({ storage: createMemoryStore(), media: fakeMedia(true), root });
    expect(store.getSnapshot()).toEqual({ preference: 'system', theme: 'dark' });
    expect(root.dataset.theme).toBe('dark');
    expect(meta()?.getAttribute('content')).toBe(THEME_COLORS.dark);
  });

  it('saves a choice, applies it, and tells subscribers once', () => {
    const { root } = fakeRoot();
    const storage = createMemoryStore();
    const store = createThemeStore({ storage, media: fakeMedia(false), root });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPreference('dark');
    expect(store.getSnapshot()).toEqual({ preference: 'dark', theme: 'dark' });
    expect(root.dataset.theme).toBe('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(listener).toHaveBeenCalledTimes(1);

    store.setPreference('dark');
    expect(listener).toHaveBeenCalledTimes(1);

    // Going back to the device setting forgets the saved choice.
    store.setPreference('system');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(root.dataset.theme).toBe('light');
  });

  it('remembers the choice after a refresh', () => {
    const storage = createMemoryStore();
    createThemeStore({ storage, media: null, root: null }).setPreference('dark');
    expect(createThemeStore({ storage, media: null, root: null }).getSnapshot().theme).toBe('dark');
  });

  it('switches with the device while following it, but not after a choice', () => {
    const { root } = fakeRoot();
    const media = fakeMedia(false);
    const store = createThemeStore({ storage: createMemoryStore(), media, root });

    media.set(true);
    expect(root.dataset.theme).toBe('dark');

    store.setPreference('light');
    media.set(true);
    media.set(false);
    media.set(true);
    expect(store.getSnapshot()).toEqual({ preference: 'light', theme: 'light' });
    expect(root.dataset.theme).toBe('light');
  });

  it('keeps working when storage is blocked', () => {
    const storage = createMemoryStore();
    storage.getItem = () => {
      throw new Error('blocked');
    };
    storage.setItem = () => {
      throw new Error('blocked');
    };
    const store = createThemeStore({ storage, media: null, root: null });
    expect(store.getSnapshot().preference).toBe('system');
    expect(() => store.setPreference('dark')).not.toThrow();
    expect(store.getSnapshot().theme).toBe('dark');
  });
});
