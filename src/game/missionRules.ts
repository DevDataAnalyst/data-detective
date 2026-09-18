/** Which mission tasks are open, and when a mission counts as complete. */
import type { GradedTask, Mission, MissionTask } from '../content/types';
import type { MissionProgress, MissionTaskStatus } from './missionProgress';

export type TaskLock = { locked: false } | { locked: true; reason: string };

export type MissionState = 'locked' | 'available' | 'in_progress' | 'completed';

/** Required tasks that are checked automatically: code tasks and question tasks. */
export function requiredGradedTasks(mission: Mission): GradedTask[] {
  return mission.tasks.filter(
    (task): task is GradedTask => task.kind !== 'written' && !task.stretch,
  );
}

/** How the graded tasks are named in counts: "code tasks" when every one of them is code. */
export function gradedTasksLabel(mission: Mission): string {
  return requiredGradedTasks(mission).every((task) => task.kind === 'code')
    ? 'code tasks'
    : 'tasks';
}

function passed(progress: MissionProgress, task: MissionTask): boolean {
  return progress.tasks[task.id]?.status === 'passed';
}

/** Every required graded task is passed, so the recommendation can be sent. */
export function gradedTasksDone(mission: Mission, progress: MissionProgress): boolean {
  return requiredGradedTasks(mission).every((task) => passed(progress, task));
}

/**
 * Required graded tasks (code and question tasks) open one after another. The written task opens
 * once every one of them passes, and stretch tasks open after the last. Passed tasks stay open.
 */
export function taskLock(mission: Mission, progress: MissionProgress, taskId: string): TaskLock {
  const task = mission.tasks.find((candidate) => candidate.id === taskId);
  if (!task || passed(progress, task)) return { locked: false };
  const required = requiredGradedTasks(mission);

  if (task.stretch) {
    const last = required[required.length - 1];
    return !last || passed(progress, last)
      ? { locked: false }
      : { locked: true, reason: `Pass “${last.title}” to unlock the stretch tasks.` };
  }
  if (task.kind === 'written') {
    return gradedTasksDone(mission, progress)
      ? { locked: false }
      : {
          locked: true,
          reason: `Pass every ${gradedTasksLabel(mission).replace(/s$/, '')} to unlock your recommendation.`,
        };
  }
  const index = required.findIndex((candidate) => candidate.id === taskId);
  const previous = required[index - 1];
  return !previous || passed(progress, previous)
    ? { locked: false }
    : { locked: true, reason: `Pass “${previous.title}” to unlock this task.` };
}

export function missionState(
  mission: Mission,
  progress: MissionProgress,
  unlocked: boolean,
): MissionState {
  if (progress.completedAt) return 'completed';
  if (!unlocked) return 'locked';
  const started = mission.tasks.some((task) => (progress.tasks[task.id]?.runs ?? 0) > 0);
  return started ? 'in_progress' : 'available';
}

/** A graded task is done when passed; the written task when the mission is complete. */
export function taskDone(progress: MissionProgress, task: MissionTask): boolean {
  return task.kind === 'written' ? progress.completedAt !== null : passed(progress, task);
}

/** A task's status for the task list. The written task passes when the mission is complete. */
export function taskStatus(
  mission: Mission,
  progress: MissionProgress,
  taskId: string,
): MissionTaskStatus {
  const task = mission.tasks.find((candidate) => candidate.id === taskId);
  if (task?.kind === 'written') {
    if (progress.completedAt) return 'passed';
    return progress.recommendation.trim() ? 'attempted' : 'not_started';
  }
  return progress.tasks[taskId]?.status ?? 'not_started';
}

/** The task to open when the learner has not picked one: the first open task not yet done. */
export function suggestedTaskId(mission: Mission, progress: MissionProgress): string {
  const next = mission.tasks.find(
    (task) => !taskDone(progress, task) && !taskLock(mission, progress, task.id).locked,
  );
  return (next ?? mission.tasks[0]).id;
}

/** The first open task after `taskId` that is not done yet, if any. */
export function nextTaskId(
  mission: Mission,
  progress: MissionProgress,
  taskId: string,
): string | null {
  const index = mission.tasks.findIndex((task) => task.id === taskId);
  const next = mission.tasks
    .slice(index + 1)
    .find((task) => !taskDone(progress, task) && !taskLock(mission, progress, task.id).locked);
  return next?.id ?? null;
}

export interface MissionTaskCounts {
  requiredPassed: number;
  requiredTotal: number;
  stretchPassed: number;
  stretchTotal: number;
}

export function missionTaskCounts(mission: Mission, progress: MissionProgress): MissionTaskCounts {
  const required = requiredGradedTasks(mission);
  const stretch = mission.tasks.filter((task) => task.stretch);
  return {
    requiredPassed: required.filter((task) => passed(progress, task)).length,
    requiredTotal: required.length,
    stretchPassed: stretch.filter((task) => passed(progress, task)).length,
    stretchTotal: stretch.length,
  };
}
