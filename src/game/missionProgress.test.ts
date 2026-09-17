import { describe, expect, it } from 'vitest';
import {
  missionProgress,
  recordTaskRun,
  replayCode,
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
    expect(missionProgress(state, MISSION)).toEqual({
      activeTaskId: null,
      tasks: {},
      recommendation: '',
    });
    expect(taskProgress(state, MISSION, 'load-data')).toEqual({
      code: null,
      lastWorkingCode: null,
      runs: 0,
      status: 'not_started',
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
    expect(taskProgress(state, MISSION, 'load-data')).toEqual({
      code: 'df = oops',
      lastWorkingCode: 'df = pd.read_csv("deliveries.csv")',
      runs: 2,
      status: 'attempted',
    });
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

  it('saves the written recommendation', () => {
    const state = saveRecommendation(createInitialProgress(), MISSION, 'Kolkata is slow.');
    expect(missionProgress(state, MISSION).recommendation).toBe('Kolkata is slow.');
  });
});
