import { describe, expect, it } from 'vitest';
import { lateDeliveryMystery as mission } from '../content/mission1';
import {
  markTaskPassed,
  missionProgress,
  recordTaskRun,
  saveRecommendation,
} from './missionProgress';
import {
  missionState,
  missionTaskCounts,
  nextTaskId,
  suggestedTaskId,
  taskLock,
  taskStatus,
} from './missionRules';
import { createInitialProgress, type ProgressState } from './progress';

const passing = (state: ProgressState, ...taskIds: string[]) =>
  taskIds.reduce(
    (next, taskId) => markTaskPassed(next, mission.id, taskId, new Date('2026-03-10T10:00:00Z')),
    state,
  );

const lockOf = (state: ProgressState, taskId: string) =>
  taskLock(mission, missionProgress(state, mission.id), taskId);

const REQUIRED = [
  'load-data',
  'missing-values',
  'city-averages',
  'flag-outliers',
  'without-outliers',
];

describe('mission task unlocking', () => {
  it('opens only the first task at the start', () => {
    const state = createInitialProgress();
    expect(lockOf(state, 'load-data')).toEqual({ locked: false });
    expect(lockOf(state, 'missing-values')).toEqual({
      locked: true,
      reason: 'Pass “Open the case file” to unlock this task.',
    });
    expect(lockOf(state, 'recommendation').locked).toBe(true);
    expect(lockOf(state, 'dinner-rush').locked).toBe(true);
  });

  it('opens the next code task when one passes, and keeps earlier tasks open', () => {
    const state = passing(createInitialProgress(), 'load-data');
    expect(lockOf(state, 'load-data').locked).toBe(false);
    expect(lockOf(state, 'missing-values').locked).toBe(false);
    expect(lockOf(state, 'city-averages').locked).toBe(true);
  });

  it('opens the recommendation and stretch tasks once all five code tasks pass', () => {
    const almost = passing(createInitialProgress(), ...REQUIRED.slice(0, 4));
    expect(lockOf(almost, 'recommendation')).toEqual({
      locked: true,
      reason: 'Pass every code task to unlock your recommendation.',
    });
    expect(lockOf(almost, 'make-a-chart')).toEqual({
      locked: true,
      reason: 'Pass “Remove the distortion” to unlock the stretch tasks.',
    });

    const done = passing(almost, 'without-outliers');
    expect(lockOf(done, 'recommendation').locked).toBe(false);
    expect(lockOf(done, 'dinner-rush').locked).toBe(false);
    expect(lockOf(done, 'make-a-chart').locked).toBe(false);
  });
});

describe('mission state for the path', () => {
  it('moves from locked to available, in progress and completed', () => {
    let state = createInitialProgress();
    expect(missionState(mission, missionProgress(state, mission.id), false)).toBe('locked');
    expect(missionState(mission, missionProgress(state, mission.id), true)).toBe('available');

    state = recordTaskRun(state, mission.id, 'load-data', { code: 'x', succeeded: false });
    expect(missionState(mission, missionProgress(state, mission.id), true)).toBe('in_progress');

    state = {
      ...state,
      missions: {
        [mission.id]: {
          ...missionProgress(state, mission.id),
          completedAt: '2026-03-10T10:00:00Z',
        },
      },
    };
    expect(missionState(mission, missionProgress(state, mission.id), true)).toBe('completed');
  });
});

describe('choosing the task to show', () => {
  const progressOf = (state: ProgressState) => missionProgress(state, mission.id);

  it('suggests the first open task that is not done', () => {
    let state = createInitialProgress();
    expect(suggestedTaskId(mission, progressOf(state))).toBe('load-data');
    state = passing(state, 'load-data', 'missing-values');
    expect(suggestedTaskId(mission, progressOf(state))).toBe('city-averages');
    state = passing(state, 'city-averages', 'flag-outliers', 'without-outliers');
    expect(suggestedTaskId(mission, progressOf(state))).toBe('recommendation');

    state = {
      ...state,
      missions: {
        [mission.id]: { ...progressOf(state), completedAt: '2026-03-10T10:00:00Z' },
      },
    };
    expect(suggestedTaskId(mission, progressOf(state))).toBe('dinner-rush');
    state = passing(state, 'dinner-rush', 'make-a-chart');
    expect(suggestedTaskId(mission, progressOf(state))).toBe('load-data');
  });

  it('points to the next open task after the current one', () => {
    let state = passing(createInitialProgress(), 'load-data');
    expect(nextTaskId(mission, progressOf(state), 'load-data')).toBe('missing-values');
    expect(nextTaskId(mission, progressOf(state), 'missing-values')).toBeNull();

    state = passing(state, ...REQUIRED);
    expect(nextTaskId(mission, progressOf(state), 'without-outliers')).toBe('recommendation');
    expect(nextTaskId(mission, progressOf(state), 'recommendation')).toBe('dinner-rush');
    expect(nextTaskId(mission, progressOf(state), 'make-a-chart')).toBeNull();
  });

  it('shows the written task as attempted once drafted, and passed once sent', () => {
    let state = createInitialProgress();
    expect(taskStatus(mission, progressOf(state), 'recommendation')).toBe('not_started');
    state = saveRecommendation(state, mission.id, 'Kolkata is slow.');
    expect(taskStatus(mission, progressOf(state), 'recommendation')).toBe('attempted');
    state = {
      ...state,
      missions: {
        [mission.id]: { ...progressOf(state), completedAt: '2026-03-10T10:00:00Z' },
      },
    };
    expect(taskStatus(mission, progressOf(state), 'recommendation')).toBe('passed');
  });

  it('counts passed required and stretch tasks', () => {
    const state = passing(createInitialProgress(), 'load-data', 'missing-values', 'dinner-rush');
    expect(missionTaskCounts(mission, progressOf(state))).toEqual({
      requiredPassed: 2,
      requiredTotal: 5,
      stretchPassed: 1,
      stretchTotal: 2,
    });
  });
});
