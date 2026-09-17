import { describe, expect, it } from 'vitest';
import {
  emptyMissionProgress,
  markTaskPassed,
  missionProgress,
  recordHintShown,
  recordTaskRun,
  replayCode,
  saveMissionFacts,
  saveRecommendation,
  saveTaskCode,
  selectTask,
  taskProgress,
} from './missionProgress';
import { createInitialProgress } from './progress';

const MISSION = 'late-delivery-mystery';

describe('mission progress', () => {
  it('starts every task as not started, using the starter code', () => {
    const state = createInitialProgress();
    expect(missionProgress(state, MISSION)).toEqual(emptyMissionProgress());
    expect(missionProgress(state, MISSION)).toMatchObject({ completedAt: null, facts: null });
    expect(taskProgress(state, MISSION, 'load-data')).toEqual({
      code: null,
      lastWorkingCode: null,
      runs: 0,
      status: 'not_started',
      passedAt: null,
      hintsShown: 0,
    });
  });

  it('saves drafts, and returns the same state when nothing changed', () => {
    const state = saveTaskCode(createInitialProgress(), MISSION, 'load-data', 'df = 1');
    expect(taskProgress(state, MISSION, 'load-data').code).toBe('df = 1');
    expect(saveTaskCode(state, MISSION, 'load-data', 'df = 1')).toBe(state);
    expect(
      selectTask(selectTask(state, MISSION, 'b'), MISSION, 'b').missions[MISSION].activeTaskId,
    ).toBe('b');
  });

  it('marks a task attempted on its first run and remembers the last working code', () => {
    let state = recordTaskRun(createInitialProgress(), MISSION, 'load-data', {
      code: 'df = pd.read_csv("deliveries.csv")',
      succeeded: true,
    });
    state = recordTaskRun(state, MISSION, 'load-data', { code: 'df = oops', succeeded: false });
    expect(taskProgress(state, MISSION, 'load-data')).toMatchObject({
      code: 'df = oops',
      lastWorkingCode: 'df = pd.read_csv("deliveries.csv")',
      runs: 2,
      status: 'attempted',
    });
  });

  it('keeps a task passed, with its first pass time, after later runs', () => {
    const first = new Date('2026-03-10T10:00:00Z');
    let state = markTaskPassed(createInitialProgress(), MISSION, 'load-data', first);
    state = markTaskPassed(state, MISSION, 'load-data', new Date('2026-03-11T10:00:00Z'));
    state = recordTaskRun(state, MISSION, 'load-data', { code: 'df = oops', succeeded: false });
    expect(taskProgress(state, MISSION, 'load-data')).toMatchObject({
      status: 'passed',
      passedAt: first.toISOString(),
    });
  });

  it('remembers the deepest hint level opened, up to 3', () => {
    let state = recordHintShown(createInitialProgress(), MISSION, 'load-data', 2);
    const same = recordHintShown(state, MISSION, 'load-data', 1);
    expect(same).toBe(state);
    state = recordHintShown(state, MISSION, 'load-data', 5);
    expect(taskProgress(state, MISSION, 'load-data').hintsShown).toBe(3);
  });

  it('replays the last working code of each task in task order', () => {
    let state = createInitialProgress();
    state = recordTaskRun(state, MISSION, 'city-averages', {
      code: 'city_stats = 3',
      succeeded: true,
    });
    state = recordTaskRun(state, MISSION, 'load-data', { code: 'df = 1', succeeded: true });
    state = recordTaskRun(state, MISSION, 'missing-values', {
      code: 'clean = ?',
      succeeded: false,
    });
    expect(replayCode(state, MISSION, ['load-data', 'missing-values', 'city-averages'])).toEqual([
      'df = 1',
      'city_stats = 3',
    ]);
  });

  it('keeps dataset facts, and returns the same state when they have not changed', () => {
    const facts = {
      orders: 600,
      missingDeliveryTimes: 18,
      cities: 5,
      outliers: 13,
      misleadingCity: 'Hyderabad',
      slowestCity: 'Kolkata',
    };
    const state = saveMissionFacts(createInitialProgress(), MISSION, facts);
    expect(missionProgress(state, MISSION).facts).toEqual(facts);
    expect(saveMissionFacts(state, MISSION, { ...facts })).toBe(state);
    expect(
      missionProgress(saveMissionFacts(state, MISSION, { ...facts, outliers: 14 }), MISSION).facts
        ?.outliers,
    ).toBe(14);
  });

  it('saves the written recommendation', () => {
    const state = saveRecommendation(createInitialProgress(), MISSION, 'Kolkata is slow.');
    expect(missionProgress(state, MISSION).recommendation).toBe('Kolkata is slow.');
  });
});
