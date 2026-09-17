import { describe, expect, it } from 'vitest';
import { lateDeliveryMystery as mission } from '../content/mission1';
import { missionProgress, type MissionFacts } from './missionProgress';
import { createInitialProgress, type ProgressState } from './progress';
import { completeMission, passMissionTask } from './rewards';
import { grantFreeze } from './streak';

const now = new Date(2026, 2, 10, 18, 0);
const FACTS: MissionFacts = {
  orders: 600,
  missingDeliveryTimes: 18,
  cities: 5,
  outliers: 13,
  misleadingCity: 'Hyderabad',
  slowestCity: 'Kolkata',
};
const REQUIRED = [
  'load-data',
  'missing-values',
  'city-averages',
  'flag-outliers',
  'without-outliers',
];

function passAll(state: ProgressState, taskIds: readonly string[]) {
  return taskIds.reduce(
    (next, taskId) => passMissionTask(next, { mission, taskId, now }).state,
    state,
  );
}

describe('mission XP', () => {
  it('pays 20 XP for the first pass of each required code task, and nothing for repeats', () => {
    const first = passMissionTask(createInitialProgress(), { mission, taskId: 'load-data', now });
    expect(first).toMatchObject({ xp: 20, firstPass: true, goalJustMet: true });
    expect(missionProgress(first.state, mission.id).tasks['load-data']).toMatchObject({
      status: 'passed',
      passedAt: now.toISOString(),
    });

    const again = passMissionTask(first.state, { mission, taskId: 'load-data', now });
    expect(again).toMatchObject({ xp: 0, firstPass: false });
    expect(again.state).toBe(first.state);
  });

  it('adds up to the 100 XP mission base across the five code tasks', () => {
    const state = passAll(createInitialProgress(), REQUIRED);
    expect(state.activity.totalXp).toBe(100);
  });

  it('pays 15 XP for each stretch task, up to 30', () => {
    const base = passAll(createInitialProgress(), REQUIRED);
    const dinner = passMissionTask(base, { mission, taskId: 'dinner-rush', now });
    const chart = passMissionTask(dinner.state, { mission, taskId: 'make-a-chart', now });
    expect([dinner.xp, chart.xp]).toEqual([15, 15]);
    expect(chart.state.activity.totalXp).toBe(130);
  });

  it('does not treat the written task as a code task', () => {
    const outcome = passMissionTask(createInitialProgress(), {
      mission,
      taskId: 'recommendation',
      now,
    });
    expect(outcome.firstPass).toBe(false);
  });
});

describe('completing the mission', () => {
  const input = {
    mission,
    recommendation: 'Kolkata is slow at dinner; Hyderabad has logging errors.',
    selfReview: ['slowest-city', 'next-step'],
    facts: FACTS,
    now,
  };

  it('needs every required code task passed first', () => {
    const state = passAll(createInitialProgress(), REQUIRED.slice(0, 4));
    const outcome = completeMission(state, input);
    expect(outcome.completedNow).toBe(false);
    expect(outcome.state).toBe(state);
  });

  it('saves the recommendation and self-review, and grants a streak freeze', () => {
    const outcome = completeMission(passAll(createInitialProgress(), REQUIRED), input);
    expect(outcome).toMatchObject({ completedNow: true, freezeGranted: true });
    expect(outcome.state.activity.freezesHeld).toBe(1);
    expect(missionProgress(outcome.state, mission.id)).toMatchObject({
      recommendation: input.recommendation,
      selfReview: ['slowest-city', 'next-step'],
      completedAt: now.toISOString(),
      freezeGranted: true,
      facts: FACTS,
    });

    const again = completeMission(outcome.state, input);
    expect(again.completedNow).toBe(false);
    expect(again.state.activity.freezesHeld).toBe(1);
  });

  it('does not stack a second freeze on top of one already held', () => {
    let state = passAll(createInitialProgress(), REQUIRED);
    state = { ...state, activity: grantFreeze(state.activity).activity };
    const outcome = completeMission(state, input);
    expect(outcome).toMatchObject({ completedNow: true, freezeGranted: false });
    expect(outcome.state.activity.freezesHeld).toBe(1);
  });
});
