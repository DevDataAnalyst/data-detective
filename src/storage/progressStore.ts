import { createInitialProgress, type ProgressState } from '../game/progress';
import type { KeyValueStore } from './keyValue';

export const PROGRESS_STORAGE_KEY = 'data-detective:progress';
const SCHEMA_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads saved progress defensively: anything missing or malformed falls back to a fresh start
 * for that part, so a bad value never crashes the app.
 */
export function parseStoredProgress(raw: string | null): ProgressState {
  const initial = createInitialProgress();
  if (!raw) return initial;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initial;
  }
  if (!isRecord(parsed) || !isRecord(parsed.progress)) return initial;
  const stored = parsed.progress;

  const lessons: ProgressState['lessons'] = {};
  if (isRecord(stored.lessons)) {
    for (const [id, entry] of Object.entries(stored.lessons)) {
      if (isRecord(entry) && typeof entry.completedAt === 'string') {
        lessons[id] = { completedAt: entry.completedAt };
      }
    }
  }
  return { ...initial, lessons };
}

export function serializeProgress(state: ProgressState): string {
  return JSON.stringify({ version: SCHEMA_VERSION, progress: state });
}

export interface ProgressStore {
  getSnapshot(): ProgressState;
  subscribe(listener: () => void): () => void;
  update(updater: (state: ProgressState) => ProgressState): void;
  reset(): void;
  /** False when progress only lives in memory and will be lost on refresh. */
  readonly persistent: boolean;
}

export function createProgressStore(
  keyValue: KeyValueStore,
  options: { persistent?: boolean } = {},
): ProgressStore {
  const listeners = new Set<() => void>();
  let state = parseStoredProgress(safeRead(keyValue));

  const notify = () => listeners.forEach((listener) => listener());

  return {
    persistent: options.persistent ?? true,
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(updater) {
      const next = updater(state);
      if (next === state) return;
      state = next;
      try {
        keyValue.setItem(PROGRESS_STORAGE_KEY, serializeProgress(state));
      } catch {
        // Storage full or blocked: keep going in memory.
      }
      notify();
    },
    reset() {
      state = createInitialProgress();
      try {
        keyValue.removeItem(PROGRESS_STORAGE_KEY);
      } catch {
        // Nothing saved to remove.
      }
      notify();
    },
  };
}

function safeRead(keyValue: KeyValueStore): string | null {
  try {
    return keyValue.getItem(PROGRESS_STORAGE_KEY);
  } catch {
    return null;
  }
}
