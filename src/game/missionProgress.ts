/** Saved progress inside a mission: code drafts, runs, passes, hints and completion. Pure updates. */
import type { ProgressState } from './progress';

export type MissionTaskStatus = 'not_started' | 'attempted' | 'passed';

export interface MissionTaskProgress {
  /** The learner's latest code, or null to use the starter code. */
  code: string | null;
  /** The latest code that ran without an error. Replayed when Python restarts. */
  lastWorkingCode: string | null;
  runs: number;
  status: MissionTaskStatus;
  /** When the task was first passed, as an ISO 8601 timestamp. */
  passedAt: string | null;
  /** How many hint levels the learner has opened, 0 to 3. */
  hintsShown: number;
}

/** Facts about the dataset worked out when Python loaded it, kept for the summary screen. */
export interface MissionFacts {
  orders: number;
  missingDeliveryTimes: number;
  cities: number;
  outliers: number;
  /** The city whose mean looks worst because of outliers. */
  misleadingCity: string;
  /** The city that is slowest once outliers are removed. */
  slowestCity: string;
}

export interface MissionProgress {
  activeTaskId: string | null;
  tasks: Record<string, MissionTaskProgress>;
  recommendation: string;
  /** Self-review items the learner ticked when submitting the recommendation. */
  selfReview: string[];
  completedAt: string | null;
  /** Whether completing the mission added a streak freeze (not if one was already held). */
  freezeGranted: boolean;
  facts: MissionFacts | null;
}

export function emptyMissionProgress(): MissionProgress {
  return {
    activeTaskId: null,
    tasks: {},
    recommendation: '',
    selfReview: [],
    completedAt: null,
    freezeGranted: false,
    facts: null,
  };
}

export function emptyTaskProgress(): MissionTaskProgress {
  return {
    code: null,
    lastWorkingCode: null,
    runs: 0,
    status: 'not_started',
    passedAt: null,
    hintsShown: 0,
  };
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

export function updateMission(
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

/** Marks a task passed. The first pass time is kept. */
export function markTaskPassed(
  state: ProgressState,
  missionId: string,
  taskId: string,
  at: Date,
): ProgressState {
  return updateTask(state, missionId, taskId, (task) =>
    task.status === 'passed' ? task : { ...task, status: 'passed', passedAt: at.toISOString() },
  );
}

/** Remembers the deepest hint level opened. Hints never cost XP. */
export function recordHintShown(
  state: ProgressState,
  missionId: string,
  taskId: string,
  level: number,
): ProgressState {
  return updateTask(state, missionId, taskId, (task) =>
    level <= task.hintsShown ? task : { ...task, hintsShown: Math.min(3, level) },
  );
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

function sameFacts(a: MissionFacts | null, b: MissionFacts): boolean {
  return (
    a !== null && (Object.keys(b) as Array<keyof MissionFacts>).every((key) => a[key] === b[key])
  );
}

/** Keeps the facts Python worked out about the dataset, for the summary screen. */
export function saveMissionFacts(
  state: ProgressState,
  missionId: string,
  facts: MissionFacts,
): ProgressState {
  return updateMission(state, missionId, (mission) =>
    sameFacts(mission.facts, facts) ? mission : { ...mission, facts: { ...facts } },
  );
}
