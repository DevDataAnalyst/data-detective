/** The minimal storage interface the app needs. localStorage satisfies it; so could a backend. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/**
 * Opens localStorage, or an in-memory store when it is blocked (private browsing, disabled site
 * data). `persistent` tells the UI whether progress will survive a refresh.
 */
export function openBrowserStorage(): { store: KeyValueStore; persistent: boolean } {
  try {
    const storage = window.localStorage;
    const probe = 'data-detective:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return { store: storage, persistent: true };
  } catch {
    return { store: createMemoryStore(), persistent: false };
  }
}
