import type { CheckpointAttempt, CheckpointProgress } from '../game/checkpoint';
import {
  createInitialProgress,
  LEARNER_GOALS,
  type LearnerGoal,
  type LearnerProfile,
  type ProgressState,
} from '../game/progress';
import type {
  MissionFacts,
  MissionProgress,
  MissionTaskProgress,
  MissionTaskStatus,
} from '../game/missionProgress';
import { createActivity, type ActivityState } from '../game/streak';
import type { KeyValueStore } from './keyValue';

export const PROGRESS_STORAGE_KEY = 'data-detective:progress';
const SCHEMA_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function numberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]),
    ),
  );
}

function parseActivity(value: unknown): ActivityState {
  const fresh = createActivity();
  if (!isRecord(value)) return fresh;
  return {
    totalXp: finiteNumber(value.totalXp, fresh.totalXp),
    xpByDay: numberRecord(value.xpByDay),
    goalMetDays: stringList(value.goalMetDays),
    currentStreak: finiteNumber(value.currentStreak, fresh.currentStreak),
    longestStreak: finiteNumber(value.longestStreak, fresh.longestStreak),
    lastStreakDay: typeof value.lastStreakDay === 'string' ? value.lastStreakDay : null,
    freezesHeld: finiteNumber(value.freezesHeld, fresh.freezesHeld),
    freezeUsedDays: stringList(value.freezeUsedDays),
  };
}

function parseFacts(value: unknown): MissionFacts | null {
  if (!isRecord(value)) return null;
  const facts: MissionFacts = {};
  for (const [name, fact] of Object.entries(value)) {
    if (typeof fact === 'string' || (typeof fact === 'number' && Number.isFinite(fact))) {
      facts[name] = fact;
    }
  }
  return Object.keys(facts).length > 0 ? facts : null;
}

const TASK_STATUSES: readonly MissionTaskStatus[] = ['not_started', 'attempted', 'passed'];

function parseMissions(value: unknown): Record<string, MissionProgress> {
  if (!isRecord(value)) return {};
  const missions: Record<string, MissionProgress> = {};
  for (const [missionId, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;
    const tasks: Record<string, MissionTaskProgress> = {};
    if (isRecord(raw.tasks)) {
      for (const [taskId, task] of Object.entries(raw.tasks)) {
        if (!isRecord(task)) continue;
        tasks[taskId] = {
          code: typeof task.code === 'string' ? task.code : null,
          lastWorkingCode: typeof task.lastWorkingCode === 'string' ? task.lastWorkingCode : null,
          passedAt: typeof task.passedAt === 'string' ? task.passedAt : null,
          hintsShown: Math.min(3, Math.max(0, finiteNumber(task.hintsShown, 0))),
          runs: finiteNumber(task.runs, 0),
          status: TASK_STATUSES.includes(task.status as MissionTaskStatus)
            ? (task.status as MissionTaskStatus)
            : 'not_started',
        };
      }
    }
    missions[missionId] = {
      activeTaskId: typeof raw.activeTaskId === 'string' ? raw.activeTaskId : null,
      tasks,
      recommendation: typeof raw.recommendation === 'string' ? raw.recommendation : '',
      selfReview: stringList(raw.selfReview),
      completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
      freezeGranted: raw.freezeGranted === true,
      facts: parseFacts(raw.facts),
    };
  }
  return missions;
}

function parseProfile(value: unknown): LearnerProfile {
  if (!isRecord(value)) return { goal: null, onboardedAt: null };
  return {
    goal: LEARNER_GOALS.includes(value.goal as LearnerGoal) ? (value.goal as LearnerGoal) : null,
    onboardedAt: typeof value.onboardedAt === 'string' ? value.onboardedAt : null,
  };
}

function parseAttempt(value: unknown): CheckpointAttempt | null {
  if (!isRecord(value) || typeof value.at !== 'string') return null;
  if (typeof value.correct !== 'number' || typeof value.total !== 'number') return null;
  return {
    at: value.at,
    correct: value.correct,
    total: value.total,
    passed: value.passed === true,
    missedLessonIds: stringList(value.missedLessonIds),
  };
}

function parseCheckpoints(value: unknown): Record<string, CheckpointProgress> {
  if (!isRecord(value)) return {};
  const checkpoints: Record<string, CheckpointProgress> = {};
  for (const [checkpointId, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;
    checkpoints[checkpointId] = {
      passedAt: typeof raw.passedAt === 'string' ? raw.passedAt : null,
      attempts: Math.max(0, finiteNumber(raw.attempts, 0)),
      lastAttempt: parseAttempt(raw.lastAttempt),
      correctQuestionIds: stringList(raw.correctQuestionIds),
    };
  }
  return checkpoints;
}

function parseBossBattles(value: unknown): ProgressState['bossBattles'] {
  if (!isRecord(value)) return {};
  const battles: ProgressState['bossBattles'] = {};
  for (const [unitId, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;
    battles[unitId] = {
      plays: Math.max(0, finiteNumber(raw.plays, 0)),
      bestCorrect: Math.max(0, finiteNumber(raw.bestCorrect, 0)),
      lastPlayedAt: typeof raw.lastPlayedAt === 'string' ? raw.lastPlayedAt : null,
      lastXpDay: typeof raw.lastXpDay === 'string' ? raw.lastXpDay : null,
    };
  }
  return battles;
}

/**
 * Reads saved progress defensively: anything missing or malformed falls back to a fresh start
 * for that part, so a bad value never crashes the app.
 */
export function parseStoredProgress(raw: string | null): ProgressState {
  const initial = createInitialProgress();
  if (!raw) return initial;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return initial;
  }
  if (!isRecord(parsed) || !isRecord(parsed.progress)) return initial;
  const stored = parsed.progress;

  const lessons: ProgressState['lessons'] = {};
  if (isRecord(stored.lessons)) {
    for (const [id, entry] of Object.entries(stored.lessons)) {
      if (isRecord(entry) && typeof entry.completedAt === 'string') {
        lessons[id] =
          entry.testedOut === true
            ? { completedAt: entry.completedAt, testedOut: true }
            : { completedAt: entry.completedAt };
      }
    }
  }

  const practice = isRecord(stored.practiceAwards) ? stored.practiceAwards : {};

  return {
    profile: parseProfile(stored.profile),
    lessons,
    activity: parseActivity(stored.activity),
    practiceAwards: {
      day: typeof practice.day === 'string' ? practice.day : null,
      counts: numberRecord(practice.counts),
    },
    dailyGoal: finiteNumber(stored.dailyGoal, initial.dailyGoal),
    missions: parseMissions(stored.missions),
    checkpoints: parseCheckpoints(stored.checkpoints),
    bossBattles: parseBossBattles(stored.bossBattles),
    hooksSeen: stringList(stored.hooksSeen),
  };
}

export function serializeProgress(state: ProgressState): string {
  return JSON.stringify({ version: SCHEMA_VERSION, progress: state });
}

export interface ProgressStore {
  getSnapshot(): ProgressState;
  subscribe(listener: () => void): () => void;
  update(updater: (state: ProgressState) => ProgressState): void;
  reset(): void;
  /**
   * False when progress only lives in memory and will be lost on refresh: storage was blocked
   * from the start, or a save failed (for example because storage is full).
   */
  readonly persistent: boolean;
}

export function createProgressStore(
  keyValue: KeyValueStore,
  options: { persistent?: boolean } = {},
): ProgressStore {
  const listeners = new Set<() => void>();
  let state = parseStoredProgress(safeRead(keyValue));
  let persistent = options.persistent ?? true;

  const notify = () => listeners.forEach((listener) => listener());

  return {
    get persistent() {
      return persistent;
    },
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(updater) {
      const next = updater(state);
      if (next === state) return;
      state = next;
      try {
        keyValue.setItem(PROGRESS_STORAGE_KEY, serializeProgress(state));
      } catch {
        // Storage full or blocked: keep going in memory, and let the UI say so.
        persistent = false;
      }
      notify();
    },
    reset() {
      state = createInitialProgress();
      try {
        keyValue.removeItem(PROGRESS_STORAGE_KEY);
      } catch {
        // Nothing saved to remove.
      }
      notify();
    },
  };
}

function safeRead(keyValue: KeyValueStore): string | null {
  try {
    return keyValue.getItem(PROGRESS_STORAGE_KEY);
  } catch {
    return null;
  }
}
