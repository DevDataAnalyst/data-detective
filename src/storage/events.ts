/**
 * A local event log for playtesting. Nothing leaves the device: events are kept in localStorage
 * and only shown on /playtest, where a tester can export them. No third-party analytics, no
 * network requests, and nothing personal beyond what a tester types in a survey.
 */
import type { QuestionType } from '../content/types';
import type { LearnerGoal } from '../game/progress';
import type { StreakChange } from '../game/streak';
import type { KeyValueStore } from './keyValue';

export const EVENTS_STORAGE_KEY = 'data-detective:events';
export const EVENTS_SCHEMA_VERSION = 1;
/** Oldest events are dropped beyond this, so storage cannot fill up. */
export const MAX_EVENTS = 2000;

export type SurveyId = 'lessons_feel' | 'mission_ready' | 'lessons_prepared' | 'more_useful';

export type PlaytestEventBody =
  | { type: 'onboarding_completed'; goal: LearnerGoal; dailyGoal: number }
  | { type: 'lesson_started'; lessonId: string }
  | {
      type: 'question_answered';
      questionId: string;
      questionType: QuestionType;
      /** Where it was asked: a lesson, the checkpoint or a boss battle. */
      source: 'lesson' | 'checkpoint' | 'boss';
      lessonId: string | null;
      /** False when the question came back after a wrong answer. */
      firstAttempt: boolean;
      correct: boolean;
      ms: number;
    }
  | { type: 'lesson_completed'; lessonId: string; firstAttemptAccuracy: number; ms: number }
  | { type: 'lesson_abandoned'; lessonId: string; answered: number; total: number; ms: number }
  | { type: 'checkpoint_started'; checkpointId: string }
  | {
      type: 'checkpoint_finished';
      checkpointId: string;
      correct: number;
      total: number;
      passed: boolean;
      ms: number;
    }
  | { type: 'checkpoint_abandoned'; checkpointId: string; answered: number; total: number }
  | { type: 'boss_started'; unitId: string; questions: number; durationMs: number }
  | {
      type: 'boss_finished';
      unitId: string;
      correct: number;
      answered: number;
      total: number;
      endReason: 'time_up' | 'all_answered';
      ms: number;
    }
  | { type: 'boss_abandoned'; unitId: string; answered: number; total: number }
  | { type: 'mission_opened'; missionId: string }
  | { type: 'pyodide_loaded'; ms: number }
  | { type: 'pyodide_failed'; message: string }
  | { type: 'task_run'; taskId: string; passed: boolean; hadError: boolean; ms: number }
  | { type: 'hint_viewed'; taskId: string; level: number }
  | { type: 'mission_abandoned'; missionId: string; lastTaskId: string; codeTasksPassed: number }
  | { type: 'mission_completed'; missionId: string; codeTasksPassed: number; stretchPassed: number }
  | { type: 'daily_goal_met'; dailyGoal: number; streak: number }
  | { type: 'streak_changed'; change: StreakChange; streak: number }
  | { type: 'survey_answered'; surveyId: SurveyId; answer: string }
  | { type: 'survey_skipped'; surveyId: SurveyId }
  | { type: 'survey_note'; note: string };

export type PlaytestEventType = PlaytestEventBody['type'];

/** An event as it is stored: the body plus when it happened. */
export type PlaytestEvent = PlaytestEventBody & { at: string };

export interface EventLog {
  getSnapshot(): readonly PlaytestEvent[];
  subscribe(listener: () => void): () => void;
  record(event: PlaytestEventBody, at?: Date): void;
  clear(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads saved events defensively: anything malformed is dropped rather than crashing the page. */
export function parseStoredEvents(raw: string | null): PlaytestEvent[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.events)) return [];
  return parsed.events.filter(
    (event): event is PlaytestEvent =>
      isRecord(event) && typeof event.type === 'string' && typeof event.at === 'string',
  );
}

export function serializeEvents(events: readonly PlaytestEvent[]): string {
  return JSON.stringify({ version: EVENTS_SCHEMA_VERSION, events });
}

export function createEventLog(keyValue: KeyValueStore): EventLog {
  const listeners = new Set<() => void>();
  let events: PlaytestEvent[] = [];
  try {
    events = parseStoredEvents(keyValue.getItem(EVENTS_STORAGE_KEY));
  } catch {
    events = [];
  }

  const save = () => {
    try {
      keyValue.setItem(EVENTS_STORAGE_KEY, serializeEvents(events));
    } catch {
      // Storage blocked or full: the log still works for this session.
    }
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => events,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    record(event, at = new Date()) {
      const next = [...events, { ...event, at: at.toISOString() }];
      events = next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
      save();
    },
    clear() {
      events = [];
      save();
    },
  };
}
