/** Saved progress inside a mission: code drafts, runs and task status. Pure updates. */
import type { ProgressState } from './progress';

export type MissionTaskStatus = 'not_started' | 'attempted' | 'passed';

export interface MissionTaskProgress {
  /** The learner's latest code, or null to use the starter code. */
  code: string | null;
  /** The latest code that ran without an error. Replayed when Python restarts. */
  lastWorkingCode: string | null;
  runs: number;
  status: MissionTaskStatus;
}

export interface MissionProgress {
  activeTaskId: string | null;
  tasks: Record<string, MissionTaskProgress>;
  recommendation: string;
}

export function emptyMissionProgress(): MissionProgress {
  return { activeTaskId: null, tasks: {}, recommendation: '' };
}

export function emptyTaskProgress(): MissionTaskProgress {
  return { code: null, lastWorkingCode: null, runs: 0, status: 'not_started' };
}

export function missionProgress(state: ProgressState, missionId: string): MissionProgress {
  return state.missions[missionId] ?? emptyMissionProgress();
}

export function taskProgress(
  state: ProgressState,
  missionId: string,
  taskId: string,
): MissionTaskProgress {
  return missionProgress(state, missionId).tasks[taskId] ?? emptyTaskProgress();
}

function updateMission(
  state: ProgressState,
  missionId: string,
  update: (mission: MissionProgress) => MissionProgress,
): ProgressState {
  const current = missionProgress(state, missionId);
  const next = update(current);
  if (next === current) return state;
  return { ...state, missions: { ...state.missions, [missionId]: next } };
}

function updateTask(
  state: ProgressState,
  missionId: string,
  taskId: string,
  update: (task: MissionTaskProgress) => MissionTaskProgress,
): ProgressState {
  return updateMission(state, missionId, (mission) => {
    const current = mission.tasks[taskId] ?? emptyTaskProgress();
    const next = update(current);
    if (next === current) return mission;
    return { ...mission, tasks: { ...mission.tasks, [taskId]: next } };
  });
}

export function selectTask(state: ProgressState, missionId: string, taskId: string): ProgressState {
  return updateMission(state, missionId, (mission) =>
    mission.activeTaskId === taskId ? mission : { ...mission, activeTaskId: taskId },
  );
}

export function saveTaskCode(
  state: ProgressState,
  missionId: string,
  taskId: string,
  code: string,
): ProgressState {
  return updateTask(state, missionId, taskId, (task) =>
    task.code === code ? task : { ...task, code },
  );
}

/** Records a run. A task that was never run becomes attempted; a passed task stays passed. */
export function recordTaskRun(
  state: ProgressState,
  missionId: string,
  taskId: string,
  run: { code: string; succeeded: boolean },
): ProgressState {
  return updateTask(state, missionId, taskId, (task) => ({
    ...task,
    code: run.code,
    lastWorkingCode: run.succeeded ? run.code : task.lastWorkingCode,
    runs: task.runs + 1,
    status: task.status === 'passed' ? 'passed' : 'attempted',
  }));
}

/** Code that recreates the learner's variables, in task order. */
export function replayCode(
  state: ProgressState,
  missionId: string,
  taskIds: readonly string[],
): string[] {
  const { tasks } = missionProgress(state, missionId);
  return taskIds.flatMap((taskId) => {
    const code = tasks[taskId]?.lastWorkingCode;
    return code ? [code] : [];
  });
}

export function saveRecommendation(
  state: ProgressState,
  missionId: string,
  text: string,
): ProgressState {
  return updateMission(state, missionId, (mission) =>
    mission.recommendation === text ? mission : { ...mission, recommendation: text },
  );
}
