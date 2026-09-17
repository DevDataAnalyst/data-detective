import { describe, expect, it } from 'vitest';
import type { PlaytestEvent, PlaytestEventBody } from '../storage/events';
import { formatMs, playtestSummaryText, summarizePlaytest } from './playtest';

let clock = Date.parse('2026-03-10T09:00:00.000Z');

/** Builds an event a fixed number of minutes after the one before it. */
function at(minutes: number, body: PlaytestEventBody): PlaytestEvent {
  clock += minutes * 60_000;
  return { ...body, at: new Date(clock).toISOString() };
}

const EVENTS: PlaytestEvent[] = [
  at(0, { type: 'onboarding_completed', goal: 'data_analyst', dailyGoal: 20 }),
  at(1, { type: 'lesson_started', lessonId: 'what-is-a-dataset' }),
  at(1, {
    type: 'question_answered',
    questionId: 'q1',
    questionType: 'multiple_choice',
    source: 'lesson',
    lessonId: 'what-is-a-dataset',
    firstAttempt: true,
    correct: true,
    ms: 8_000,
  }),
  at(1, {
    type: 'question_answered',
    questionId: 'q2',
    questionType: 'numeric_estimate',
    source: 'lesson',
    lessonId: 'what-is-a-dataset',
    firstAttempt: true,
    correct: false,
    ms: 20_000,
  }),
  // The re-asked question does not count toward first-try accuracy.
  at(1, {
    type: 'question_answered',
    questionId: 'q2',
    questionType: 'numeric_estimate',
    source: 'lesson',
    lessonId: 'what-is-a-dataset',
    firstAttempt: false,
    correct: true,
    ms: 5_000,
  }),
  at(1, {
    type: 'lesson_completed',
    lessonId: 'what-is-a-dataset',
    firstAttemptAccuracy: 0.5,
    ms: 240_000,
  }),
  at(1, { type: 'daily_goal_met', dailyGoal: 20, streak: 1 }),
  at(5, { type: 'lesson_started', lessonId: 'the-mean' }),
  at(3, { type: 'lesson_completed', lessonId: 'the-mean', firstAttemptAccuracy: 1, ms: 120_000 }),
  at(2, { type: 'lesson_started', lessonId: 'median-and-mode' }),
  at(2, {
    type: 'lesson_abandoned',
    lessonId: 'median-and-mode',
    answered: 2,
    total: 7,
    ms: 90_000,
  }),
  at(30, { type: 'mission_opened', missionId: 'late-delivery-mystery' }),
  at(1, { type: 'pyodide_loaded', ms: 14_000 }),
  at(1, { type: 'task_run', taskId: 'load-data', passed: false, hadError: true, ms: 300 }),
  at(1, { type: 'hint_viewed', taskId: 'load-data', level: 1 }),
  at(1, { type: 'hint_viewed', taskId: 'load-data', level: 2 }),
  at(1, { type: 'task_run', taskId: 'load-data', passed: true, hadError: false, ms: 250 }),
  at(2, { type: 'survey_answered', surveyId: 'mission_ready', answer: '3' }),
  at(1, { type: 'survey_note', note: 'The IQR lesson was the hard one.' }),
];

describe('playtest summary', () => {
  const summary = summarizePlaytest(EVENTS);

  it('counts lessons started, completed and left part way', () => {
    expect(summary).toMatchObject({
      lessonsStarted: 3,
      lessonsCompleted: 2,
      lessonsAbandoned: 1,
      dailyGoalMetDays: 1,
    });
    expect(summary.onboarding).toEqual({ completed: true, goal: 'data_analyst', dailyGoal: 20 });
  });

  it('takes the median of completed lesson times', () => {
    expect(summary.medianLessonMs).toBe(180_000);
    expect(formatMs(summary.medianLessonMs)).toBe('3m 0s');
  });

  it('counts first tries only for accuracy by question type', () => {
    expect(summary.accuracyByType).toEqual([
      { type: 'multiple_choice', answered: 1, correct: 1 },
      { type: 'numeric_estimate', answered: 1, correct: 0 },
    ]);
  });

  it('measures the gap between the last lesson and opening the mission', () => {
    expect(summary.mission.gapFromLastLessonMs).toBe(34 * 60_000);
    expect(summary.mission.pyodideLoadMs).toBe(14_000);
    expect(summary.mission.opened).toBe(true);
    expect(summary.mission.completed).toBe(false);
  });

  it('counts runs and hints per mission task', () => {
    expect(summary.mission.tasks).toEqual([
      { taskId: 'load-data', runs: 2, passed: true, hints: 2, deepestHint: 2 },
    ]);
  });

  it('keeps survey answers and the free-text note', () => {
    expect(summary.surveys).toEqual([{ surveyId: 'mission_ready', answer: '3' }]);
    expect(summary.notes).toEqual(['The IQR lesson was the hard one.']);
  });

  it('says where the learner stopped', () => {
    expect(summary.stoppedAt).toBe('Mission task “load-data”');
    expect(summarizePlaytest([]).stoppedAt).toBe('Nothing yet');
    expect(summarizePlaytest(EVENTS.slice(0, 6)).stoppedAt).toBe(
      'Finished lesson “what-is-a-dataset”',
    );
  });

  it('writes a summary a tester can paste into a message', () => {
    const text = playtestSummaryText(summary);
    expect(text).toContain('Lessons: 2 completed, 3 started, 1 left part way');
    expect(text).toContain('multiple_choice: 1/1 first try (100%)');
    expect(text).toContain('load-data: 2 runs, passed, 2 hints (level 2)');
    expect(text).toContain('Stopped at: Mission task “load-data”');
  });

  it('handles an empty log', () => {
    const empty = summarizePlaytest([]);
    expect(empty).toMatchObject({ events: 0, lessonsCompleted: 0, medianLessonMs: null });
    expect(empty.mission.tasks).toEqual([]);
    expect(() => playtestSummaryText(empty)).not.toThrow();
  });
});

describe('formatMs', () => {
  it('reads in seconds, minutes, hours and days', () => {
    expect(formatMs(null)).toBe('—');
    expect(formatMs(4_500)).toBe('5s');
    expect(formatMs(150_000)).toBe('2m 30s');
    expect(formatMs(3 * 3_600_000 + 20 * 60_000)).toBe('3h 20m');
    expect(formatMs(50 * 3_600_000)).toBe('2d 2h');
  });
});
