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

describe('playtest summary by unit', () => {
  const course = [
    { id: 'u1', title: 'One', lessonIds: ['a', 'b'], checkpointId: 'c1', missionId: 'm1' },
    { id: 'u2', title: 'Two', lessonIds: ['x', 'y'], checkpointId: 'c2', missionId: 'm2' },
  ];
  const at = (minute: number) => `2026-03-10T09:${String(minute).padStart(2, '0')}:00.000Z`;
  const answer = (source: 'lesson' | 'checkpoint' | 'boss' | 'mission', lessonId: string | null) =>
    ({
      type: 'question_answered',
      questionId: 'q',
      questionType: 'multiple_choice',
      source,
      lessonId,
      firstAttempt: source !== 'boss',
      correct: true,
      ms: 900,
    }) as const;
  const log: PlaytestEvent[] = [
    { type: 'lesson_started', lessonId: 'x', at: at(0) },
    { ...answer('lesson', 'x'), at: at(1) },
    { type: 'lesson_completed', lessonId: 'x', firstAttemptAccuracy: 1, ms: 60_000, at: at(2) },
    {
      type: 'checkpoint_finished',
      checkpointId: 'c1',
      correct: 9,
      total: 10,
      passed: true,
      ms: 1,
      at: at(3),
    },
    { type: 'boss_started', unitId: 'u1', questions: 12, durationMs: 60_000, at: at(4) },
    { ...answer('boss', null), at: at(5) },
    {
      type: 'boss_finished',
      unitId: 'u1',
      correct: 7,
      answered: 9,
      total: 12,
      endReason: 'time_up',
      ms: 60_000,
      at: at(6),
    },
    { type: 'mission_opened', missionId: 'm2', at: at(7) },
    { ...answer('mission', null), at: at(8) },
    { type: 'task_run', taskId: 'recommendation', passed: true, hadError: false, ms: 5, at: at(9) },
    { type: 'hint_viewed', taskId: 'recommendation', level: 2, at: at(10) },
    { type: 'mission_opened', missionId: 'm1', at: at(11) },
    {
      type: 'task_run',
      taskId: 'recommendation',
      passed: false,
      hadError: true,
      ms: 5,
      at: at(12),
    },
  ];
  const [one, two] = summarizePlaytest(log, course).units;

  it('puts lessons and checkpoints in their unit', () => {
    expect(two.lessons).toEqual({ started: 1, completed: 1, abandoned: 0, total: 2 });
    expect(one.lessons.completed).toBe(0);
    expect(one.checkpoint).toEqual({ attempts: 1, passed: true, lastScore: '9 of 10' });
    expect(two.checkpoint.attempts).toBe(0);
  });

  it('counts boss rounds, and boss answers only toward their unit', () => {
    expect(one.boss).toEqual({ rounds: 1, bestCorrect: 7 });
    expect(one.accuracyByType).toEqual([{ type: 'multiple_choice', answered: 1, correct: 1 }]);
    expect(summarizePlaytest(log, course).accuracyByType).toEqual([
      { type: 'multiple_choice', answered: 2, correct: 2 },
    ]);
  });

  it('gives mission task runs to the mission open at the time, even with the same task id', () => {
    expect(two.mission).toMatchObject({ opened: true, completed: false });
    expect(two.mission.tasks).toEqual([
      { taskId: 'recommendation', runs: 1, passed: true, hints: 1, deepestHint: 2 },
    ]);
    expect(one.mission.tasks).toEqual([
      { taskId: 'recommendation', runs: 1, passed: false, hints: 0, deepestHint: 0 },
    ]);
    expect(two.accuracyByType).toHaveLength(1);
  });

  it('adds a line per unit to the text summary', () => {
    const text = playtestSummaryText(summarizePlaytest(log, course));
    expect(text).toContain('By unit:');
    expect(text).toContain('  Two: lessons 1/2, first try 2/2, checkpoint 0 attempt(s)');
    expect(text).toContain(
      '  One: lessons 0/2, first try 1/1, checkpoint passed, boss 1 round(s), best 7',
    );
  });
});
