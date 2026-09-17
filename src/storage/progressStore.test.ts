import { describe, expect, it, vi } from 'vitest';
import { markLessonCompleted } from '../game/progress';
import { createMemoryStore } from './keyValue';
import { createProgressStore, parseStoredProgress, PROGRESS_STORAGE_KEY } from './progressStore';

describe('progress store', () => {
  it('saves progress so a new store (a page refresh) reads it back', () => {
    const keyValue = createMemoryStore();
    const first = createProgressStore(keyValue);
    first.update((state) =>
      markLessonCompleted(state, 'the-mean', new Date('2026-03-10T10:00:00Z')),
    );

    const afterRefresh = createProgressStore(keyValue);
    expect(afterRefresh.getSnapshot().lessons).toEqual({
      'the-mean': { completedAt: '2026-03-10T10:00:00.000Z' },
    });
  });

  it('notifies subscribers on changes, but not when nothing changed', () => {
    const store = createProgressStore(createMemoryStore());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.update((state) => markLessonCompleted(state, 'a', new Date()));
    store.update((state) => markLessonCompleted(state, 'a', new Date()));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.reset();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resets to a fresh start and clears storage', () => {
    const keyValue = createMemoryStore();
    const store = createProgressStore(keyValue);
    store.update((state) => markLessonCompleted(state, 'a', new Date()));
    store.reset();
    expect(store.getSnapshot().lessons).toEqual({});
    expect(keyValue.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it('keeps working in memory when saving fails', () => {
    const keyValue = createMemoryStore();
    keyValue.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const store = createProgressStore(keyValue);
    expect(() =>
      store.update((state) => markLessonCompleted(state, 'a', new Date())),
    ).not.toThrow();
    expect(store.getSnapshot().lessons.a).toBeDefined();
  });

  it('ignores corrupt or unexpected saved data', () => {
    expect(parseStoredProgress('not json').lessons).toEqual({});
    expect(parseStoredProgress('[1,2,3]').lessons).toEqual({});
    expect(
      parseStoredProgress(
        JSON.stringify({ version: 1, progress: { lessons: { ok: { completedAt: 'x' }, bad: 5 } } }),
      ).lessons,
    ).toEqual({ ok: { completedAt: 'x' } });
  });
});
