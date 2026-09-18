import { describe, expect, it, vi } from 'vitest';
import { markTaskPassed, recordHintShown, recordTaskRun } from '../game/missionProgress';
import { markLessonCompleted } from '../game/progress';
import { completeOnboarding, finishCheckpoint } from '../game/rewards';
import { unit1 } from '../content/unit1';
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

  it('keeps working in memory when saving fails, and reports that progress is not saved', () => {
    const keyValue = createMemoryStore();
    keyValue.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const store = createProgressStore(keyValue);
    expect(store.persistent).toBe(true);
    expect(() =>
      store.update((state) => markLessonCompleted(state, 'a', new Date())),
    ).not.toThrow();
    expect(store.getSnapshot().lessons.a).toBeDefined();
    expect(store.persistent).toBe(false);
  });

  it('saves the onboarding profile and ignores unknown goals', () => {
    const keyValue = createMemoryStore();
    const store = createProgressStore(keyValue);
    store.update((state) =>
      completeOnboarding(state, {
        goal: 'ml_engineer',
        dailyGoal: 10,
        now: new Date('2026-03-10T10:00:00Z'),
      }),
    );
    expect(createProgressStore(keyValue).getSnapshot()).toMatchObject({
      profile: { goal: 'ml_engineer', onboardedAt: '2026-03-10T10:00:00.000Z' },
      dailyGoal: 10,
    });
    expect(
      parseStoredProgress(JSON.stringify({ version: 1, progress: { profile: { goal: 'pilot' } } }))
        .profile,
    ).toEqual({ goal: null, onboardedAt: null });
  });

  it('saves mission progress, including passes, hints and completion', () => {
    const keyValue = createMemoryStore();
    const store = createProgressStore(keyValue);
    const facts = {
      orders: 600,
      missingDeliveryTimes: 18,
      cities: 5,
      outliers: 13,
      misleadingCity: 'Hyderabad',
      slowestCity: 'Kolkata',
    };
    store.update((state) => {
      let next = recordTaskRun(state, 'm', 'load-data', { code: 'df = 1', succeeded: true });
      next = markTaskPassed(next, 'm', 'load-data', new Date('2026-03-10T10:00:00Z'));
      next = recordHintShown(next, 'm', 'load-data', 2);
      return {
        ...next,
        missions: {
          m: {
            ...next.missions.m,
            recommendation: 'Kolkata is slow.',
            selfReview: ['slowest-city'],
            completedAt: '2026-03-10T11:00:00.000Z',
            freezeGranted: true,
            facts,
          },
        },
      };
    });

    expect(createProgressStore(keyValue).getSnapshot()).toEqual(store.getSnapshot());
  });

  it('saves checkpoint attempts and lessons marked as tested out', () => {
    const keyValue = createMemoryStore();
    const store = createProgressStore(keyValue);
    const allRight = Object.fromEntries(
      unit1.checkpoint.items.map((item) => [item.question.id, true]),
    );
    store.update(
      (state) =>
        finishCheckpoint(state, {
          unit: unit1,
          correctByQuestion: allRight,
          now: new Date('2026-03-10T10:00:00Z'),
        }).state,
    );

    const reloaded = createProgressStore(keyValue).getSnapshot();
    expect(reloaded).toEqual(store.getSnapshot());
    expect(reloaded.lessons['the-mean']).toEqual({
      completedAt: '2026-03-10T10:00:00.000Z',
      testedOut: true,
    });

    const odd = parseStoredProgress(
      JSON.stringify({
        version: 1,
        progress: {
          lessons: { a: { completedAt: 'x', testedOut: 'yes' } },
          checkpoints: { c: { passedAt: 3, attempts: -2, lastAttempt: { at: 'x' } }, d: 'no' },
        },
      }),
    );
    expect(odd.lessons.a).toEqual({ completedAt: 'x' });
    expect(odd.checkpoints).toEqual({
      c: { passedAt: null, attempts: 0, lastAttempt: null, correctQuestionIds: [] },
    });
  });

  it('ignores corrupt or unexpected saved data', () => {
    expect(parseStoredProgress('not json').lessons).toEqual({});
    expect(parseStoredProgress('[1,2,3]').lessons).toEqual({});
    expect(
      parseStoredProgress(
        JSON.stringify({ version: 1, progress: { lessons: { ok: { completedAt: 'x' }, bad: 5 } } }),
      ).lessons,
    ).toEqual({ ok: { completedAt: 'x' } });

    const missions = parseStoredProgress(
      JSON.stringify({
        version: 1,
        progress: {
          missions: {
            m: {
              tasks: { a: { hintsShown: 99, status: 'won', passedAt: 7 } },
              selfReview: ['ok', 3],
              facts: { orders: { n: 600 }, cities: Number.NaN, slowestCity: 'Kolkata' },
              freezeGranted: 'yes',
            },
          },
        },
      }),
    ).missions;
    expect(missions.m).toMatchObject({
      selfReview: ['ok'],
      // Facts are kept only when they are text or numbers.
      facts: { slowestCity: 'Kolkata' },
      freezeGranted: false,
      completedAt: null,
    });
    expect(missions.m.tasks.a).toMatchObject({
      hintsShown: 3,
      status: 'not_started',
      passedAt: null,
    });
  });
});
