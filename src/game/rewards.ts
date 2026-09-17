/**
 * Turns learner achievements into progress updates: XP, the daily goal and the streak. Every
 * function is pure and takes `now`, so tests can pick any date and time.
 */
import type { Mission } from '../content/types';
import {
  markTaskPassed,
  missionProgress,
  updateMission,
  type MissionFacts,
} from './missionProgress';
import { codeTasksDone, requiredCodeTasks } from './missionRules';
import { markLessonCompleted, type ProgressState } from './progress';
import { grantFreeze, recordXp, rollOver, toDateKey, type StreakChange } from './streak';
import { lessonXp, missionTaskXp, stretchTaskXp, type LessonXpAward } from './xp';

export interface XpOutcome {
  state: ProgressState;
  xp: number;
  goalJustMet: boolean;
  streakChange: StreakChange;
}

/** Adds XP for today and updates the daily goal and streak. */
export function awardXp(state: ProgressState, amount: number, now: Date): XpOutcome {
  const recorded = recordXp(state.activity, amount, toDateKey(now), state.dailyGoal);
  return {
    state: recorded.activity === state.activity ? state : { ...state, activity: recorded.activity },
    xp: Math.max(0, amount),
    goalJustMet: recorded.goalJustMet,
    streakChange: recorded.change,
  };
}

/** Saves any streak change that happened since the app was last used, such as a used freeze. */
export function applyDayRollover(
  state: ProgressState,
  now: Date,
): { state: ProgressState; streakChange: StreakChange } {
  const rolled = rollOver(state.activity, toDateKey(now));
  if (rolled.change === 'none') return { state, streakChange: 'none' };
  return { state: { ...state, activity: rolled.activity }, streakChange: rolled.change };
}

export interface LessonOutcome extends XpOutcome {
  award: LessonXpAward;
}

export function completeLesson(
  state: ProgressState,
  input: { lessonId: string; firstAttemptAccuracy: number; now: Date },
): LessonOutcome {
  const today = toDateKey(input.now);
  const practiceCounts = state.practiceAwards.day === today ? state.practiceAwards.counts : {};
  const award = lessonXp({
    alreadyCompleted: Boolean(state.lessons[input.lessonId]),
    firstAttemptAccuracy: input.firstAttemptAccuracy,
    practiceAwardsToday: practiceCounts[input.lessonId] ?? 0,
  });

  let next = markLessonCompleted(state, input.lessonId, input.now);
  if (award.kind === 'practice') {
    next = {
      ...next,
      practiceAwards: {
        day: today,
        counts: { ...practiceCounts, [input.lessonId]: (practiceCounts[input.lessonId] ?? 0) + 1 },
      },
    };
  }

  const outcome = awardXp(next, award.total, input.now);
  return { ...outcome, award };
}

export interface MissionTaskOutcome extends XpOutcome {
  /** False when the task had already been passed, so nothing new was awarded. */
  firstPass: boolean;
}

/**
 * Marks a mission code task passed. The first pass of a required task pays its share of the
 * mission's 100 XP; the first pass of a stretch task pays stretch XP.
 */
export function passMissionTask(
  state: ProgressState,
  input: { mission: Mission; taskId: string; now: Date },
): MissionTaskOutcome {
  const { mission, taskId, now } = input;
  const task = mission.tasks.find((candidate) => candidate.id === taskId);
  const progress = missionProgress(state, mission.id);
  if (!task || task.kind !== 'code' || progress.tasks[taskId]?.status === 'passed') {
    return { state, xp: 0, goalJustMet: false, streakChange: 'none', firstPass: false };
  }

  let xp: number;
  if (task.stretch) {
    const stretchPassed = mission.tasks.filter(
      (candidate) => candidate.stretch && progress.tasks[candidate.id]?.status === 'passed',
    ).length;
    xp = stretchTaskXp(stretchPassed);
  } else {
    const required = requiredCodeTasks(mission);
    xp = missionTaskXp(
      required.findIndex((candidate) => candidate.id === taskId),
      required.length,
    );
  }

  const outcome = awardXp(markTaskPassed(state, mission.id, taskId, now), xp, now);
  return { ...outcome, firstPass: true };
}

export interface MissionCompletion {
  state: ProgressState;
  /** False when the mission was already complete, or not ready to complete. */
  completedNow: boolean;
  /** Whether a streak freeze was added (not if one was already held). */
  freezeGranted: boolean;
}

/** Sends the recommendation and completes the mission, earning a streak freeze. */
export function completeMission(
  state: ProgressState,
  input: {
    mission: Mission;
    recommendation: string;
    selfReview: string[];
    facts: MissionFacts | null;
    now: Date;
  },
): MissionCompletion {
  const { mission, now } = input;
  const progress = missionProgress(state, mission.id);
  if (progress.completedAt || !codeTasksDone(mission, progress)) {
    return { state, completedNow: false, freezeGranted: false };
  }
  const freeze = grantFreeze(state.activity);
  const withMission = updateMission(state, mission.id, (current) => ({
    ...current,
    recommendation: input.recommendation,
    selfReview: input.selfReview,
    completedAt: now.toISOString(),
    freezeGranted: freeze.granted,
    facts: input.facts ?? current.facts,
  }));
  return {
    state: { ...withMission, activity: freeze.activity },
    completedNow: true,
    freezeGranted: freeze.granted,
  };
}
