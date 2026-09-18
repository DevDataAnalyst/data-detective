/** Where the learner stands in each unit of the course. Pure: reads progress, never writes it. */
import { unitMission } from '../content/missions';
import type { Unit } from '../content/types';
import { missionProgress } from './missionProgress';
import { missionState, missionTaskCounts, type MissionState } from './missionRules';
import {
  bossProgress,
  completedLessonIds,
  hasPassedCheckpoint,
  type BossProgress,
  type ProgressState,
} from './progress';
import { isMissionUnlocked, unitUnlocks } from './unlocks';

export interface UnitStanding {
  unit: Unit;
  /** One-based, as in "Unit 2". */
  number: number;
  unlocked: boolean;
  lessonsCompleted: number;
  checkpointPassed: boolean;
  missionUnlocked: boolean;
  missionState: MissionState;
  graded: { passed: number; total: number };
  boss: BossProgress;
  /** Whether the unit's opening message is still waiting to be read. */
  hookPending: boolean;
}

export function courseStanding(units: readonly Unit[], progress: ProgressState): UnitStanding[] {
  const completed = completedLessonIds(progress);
  const gates = units.map((unit) => ({
    missionCompleted: missionProgress(progress, unit.missionId).completedAt !== null,
    checkpointPassed: hasPassedCheckpoint(progress, unit.checkpoint.id),
  }));
  const unlocks = unitUnlocks(gates);
  return units.map((unit, index) => {
    const lessonIds = unit.lessons.map((lesson) => lesson.id);
    const unlocked = unlocks[index];
    const missionUnlocked =
      unlocked && isMissionUnlocked(lessonIds, completed, gates[index].checkpointPassed);
    const mission = unitMission(unit);
    const saved = missionProgress(progress, mission.id);
    const counts = missionTaskCounts(mission, saved);
    return {
      unit,
      number: index + 1,
      unlocked,
      lessonsCompleted: lessonIds.filter((id) => completed.has(id)).length,
      checkpointPassed: gates[index].checkpointPassed,
      missionUnlocked,
      missionState: missionState(mission, saved, missionUnlocked),
      graded: { passed: counts.requiredPassed, total: counts.requiredTotal },
      boss: bossProgress(progress, unit.id),
      hookPending: unlocked && unit.hook !== null && !progress.hooksSeen.includes(unit.id),
    };
  });
}

/**
 * The unit the learner is working on: the first open unit whose mission is not complete, or the
 * last open unit once everything open is done.
 */
export function currentUnitIndex(standings: readonly UnitStanding[]): number {
  const working = standings.findIndex(
    (standing) => standing.unlocked && standing.missionState !== 'completed',
  );
  if (working !== -1) return working;
  const open = standings.filter((standing) => standing.unlocked).length;
  return Math.max(0, open - 1);
}

/** Why a unit is locked, in words: finish the unit before it. */
export function unitLockReason(previous: UnitStanding | null): string {
  if (!previous) return '';
  return `Finish Unit ${previous.number} first: complete “${unitMission(previous.unit).title}”, or pass its test-out checkpoint.`;
}
