import { describe, expect, it } from 'vitest';
import { createInitialProgress, isOnboarded, markLessonCompleted } from './progress';
import { awardXp, completeOnboarding, setDailyGoal } from './rewards';
import { DAILY_GOAL_CHOICES } from './streak';

const morning = new Date(2026, 2, 10, 9, 0);
const evening = new Date(2026, 2, 10, 20, 0);

describe('onboarding', () => {
  it('shows only on a first visit', () => {
    const fresh = createInitialProgress();
    expect(isOnboarded(fresh)).toBe(false);
    expect(isOnboarded(markLessonCompleted(fresh, 'the-mean', morning))).toBe(true);
    expect(isOnboarded(awardXp(fresh, 5, morning).state)).toBe(true);
  });

  it('saves the learner goal and the chosen daily goal', () => {
    const state = completeOnboarding(createInitialProgress(), {
      goal: 'data_analyst',
      dailyGoal: 40,
      now: morning,
    });
    expect(state.profile).toEqual({ goal: 'data_analyst', onboardedAt: morning.toISOString() });
    expect(state.dailyGoal).toBe(40);
    expect(isOnboarded(state)).toBe(true);
  });

  it('offers casual, regular and serious goals', () => {
    expect(DAILY_GOAL_CHOICES.map((choice) => choice.xp)).toEqual([10, 20, 40]);
  });
});

describe('the chosen daily goal in streak logic', () => {
  it('uses a casual goal of 10 XP to start the streak', () => {
    const casual = completeOnboarding(createInitialProgress(), {
      goal: 'curious',
      dailyGoal: 10,
      now: morning,
    });
    const outcome = awardXp(casual, 10, morning);
    expect(outcome).toMatchObject({ goalJustMet: true, streakChange: 'started' });
    expect(outcome.state.activity.currentStreak).toBe(1);
  });

  it('needs 40 XP for a serious goal', () => {
    const serious = setDailyGoal(createInitialProgress(), 40, morning).state;
    const partWay = awardXp(serious, 25, morning);
    expect(partWay.goalJustMet).toBe(false);
    expect(partWay.state.activity.currentStreak).toBe(0);
    expect(awardXp(partWay.state, 15, evening).goalJustMet).toBe(true);
  });

  it('counts today at once when the goal is lowered below XP already earned', () => {
    const serious = setDailyGoal(createInitialProgress(), 40, morning).state;
    const earned = awardXp(serious, 25, morning).state;
    const lowered = setDailyGoal(earned, 20, evening);
    expect(lowered).toMatchObject({ goalJustMet: true, streakChange: 'started' });
    expect(lowered.state.dailyGoal).toBe(20);
    expect(lowered.state.activity.currentStreak).toBe(1);

    // Raising it again never undoes the day, and the same goal changes nothing.
    const raised = setDailyGoal(lowered.state, 40, evening);
    expect(raised.state.activity.currentStreak).toBe(1);
    expect(setDailyGoal(raised.state, 40, evening).state).toBe(raised.state);
  });
});
