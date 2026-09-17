/** XP rules. Every amount the app awards comes from here. */

export const XP_RULES = {
  lessonFirstCompletion: 10,
  perfectAccuracyBonus: 5,
  strongAccuracyBonus: 3,
  strongAccuracy: 0.8,
  practice: 5,
  practiceAwardsPerLessonPerDay: 2,
  checkpointPassed: 40,
  missionBase: 100,
  stretchTask: 15,
  stretchMax: 30,
} as const;

/** Bonus for first-attempt accuracy: 100% earns +5, 80% or more +3, otherwise nothing. */
export function accuracyBonus(firstAttemptAccuracy: number): number {
  if (firstAttemptAccuracy >= 1) return XP_RULES.perfectAccuracyBonus;
  if (firstAttemptAccuracy >= XP_RULES.strongAccuracy) return XP_RULES.strongAccuracyBonus;
  return 0;
}

export type LessonXpAward =
  | { kind: 'first_completion'; base: number; bonus: number; total: number }
  | { kind: 'practice'; total: number }
  /** Practice XP already earned twice today for this lesson, to stop XP farming. */
  | { kind: 'practice_limit_reached'; total: 0 };

export function lessonXp(input: {
  alreadyCompleted: boolean;
  firstAttemptAccuracy: number;
  /** Practice awards already given for this lesson today. */
  practiceAwardsToday: number;
}): LessonXpAward {
  if (!input.alreadyCompleted) {
    const base = XP_RULES.lessonFirstCompletion;
    const bonus = accuracyBonus(input.firstAttemptAccuracy);
    return { kind: 'first_completion', base, bonus, total: base + bonus };
  }
  if (input.practiceAwardsToday >= XP_RULES.practiceAwardsPerLessonPerDay) {
    return { kind: 'practice_limit_reached', total: 0 };
  }
  return { kind: 'practice', total: XP_RULES.practice };
}

export function checkpointXp(alreadyPassed: boolean): number {
  return alreadyPassed ? 0 : XP_RULES.checkpointPassed;
}

/**
 * The mission's base XP is paid out as it is earned, split evenly across its required code tasks
 * (any remainder goes to the last task). This way any mission progress counts toward the daily
 * goal, and a learner who spreads the mission over several days keeps their streak.
 */
export function missionTaskXp(taskIndex: number, requiredTaskCount: number): number {
  const share = Math.floor(XP_RULES.missionBase / requiredTaskCount);
  const remainder = XP_RULES.missionBase - share * requiredTaskCount;
  return taskIndex === requiredTaskCount - 1 ? share + remainder : share;
}

/** XP for passing a stretch task, given how many stretch tasks have already paid out. */
export function stretchTaskXp(stretchTasksAlreadyAwarded: number): number {
  const alreadyEarned = stretchTasksAlreadyAwarded * XP_RULES.stretchTask;
  return Math.max(0, Math.min(XP_RULES.stretchTask, XP_RULES.stretchMax - alreadyEarned));
}

export interface MissionXpSummary {
  base: number;
  stretch: number;
  total: number;
}

export function missionXpSummary(input: {
  requiredTasksPassed: number;
  requiredTaskCount: number;
  stretchTasksPassed: number;
}): MissionXpSummary {
  let base = 0;
  for (
    let index = 0;
    index < Math.min(input.requiredTasksPassed, input.requiredTaskCount);
    index += 1
  ) {
    base += missionTaskXp(index, input.requiredTaskCount);
  }
  let stretch = 0;
  for (let index = 0; index < input.stretchTasksPassed; index += 1) {
    stretch += stretchTaskXp(index);
  }
  return { base, stretch, total: base + stretch };
}
