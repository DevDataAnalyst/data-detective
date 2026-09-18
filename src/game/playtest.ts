/**
 * Turns the local event log into the handful of numbers this prototype is trying to answer:
 * do lessons prepare learners for the mission, and where do they stop? Pure, so it is testable.
 */
import type { QuestionType } from '../content/types';
import type { PlaytestEvent, SurveyId } from '../storage/events';
import type { LearnerGoal } from './progress';

export interface QuestionTypeAccuracy {
  type: QuestionType;
  answered: number;
  correct: number;
}

export interface TaskStats {
  taskId: string;
  runs: number;
  passed: boolean;
  /** Hints opened, and the deepest level reached (1 nudge, 2 method, 3 example). */
  hints: number;
  deepestHint: number;
}

/** What the summary needs to know about a unit to split the log by unit. */
export interface PlaytestUnit {
  id: string;
  title: string;
  lessonIds: readonly string[];
  checkpointId: string;
  missionId: string;
}

export interface UnitPlaytestSummary {
  unitId: string;
  title: string;
  lessons: { started: number; completed: number; abandoned: number; total: number };
  /** First tries only, from lessons, the checkpoint, boss battles and mission questions. */
  accuracyByType: QuestionTypeAccuracy[];
  checkpoint: { attempts: number; passed: boolean; lastScore: string | null };
  boss: { rounds: number; bestCorrect: number | null };
  mission: { opened: boolean; completed: boolean; tasks: TaskStats[] };
}

export interface PlaytestSummary {
  events: number;
  from: string | null;
  to: string | null;
  onboarding: { completed: boolean; goal: LearnerGoal | null; dailyGoal: number | null };
  lessonsStarted: number;
  lessonsCompleted: number;
  lessonsAbandoned: number;
  /** Median time to finish a lesson, in milliseconds. */
  medianLessonMs: number | null;
  /** First-attempt accuracy, so questions that came back again do not flatter the numbers. */
  accuracyByType: QuestionTypeAccuracy[];
  checkpoint: { attempts: number; passed: boolean; lastScore: string | null };
  mission: {
    opened: boolean;
    pyodideLoadMs: number | null;
    /** From finishing the last lesson to opening the mission. */
    gapFromLastLessonMs: number | null;
    tasks: TaskStats[];
    completed: boolean;
    lastTaskReached: string | null;
  };
  dailyGoalMetDays: number;
  surveys: Array<{ surveyId: SurveyId; answer: string }>;
  notes: string[];
  /** The furthest point the learner reached, in plain words. */
  stoppedAt: string;
  /** The same numbers for each unit, when the course is passed in. */
  units: UnitPlaytestSummary[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function describeStop(events: readonly PlaytestEvent[]): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    switch (event.type) {
      case 'mission_completed':
        return 'Finished the mission';
      case 'task_run':
        return `Mission task “${event.taskId}”`;
      case 'mission_abandoned':
        return `Left the mission on “${event.lastTaskId}”`;
      case 'mission_opened':
        return 'Opened the mission';
      case 'checkpoint_finished':
        return event.passed ? 'Passed the checkpoint' : 'Did not pass the checkpoint';
      case 'checkpoint_started':
      case 'checkpoint_abandoned':
        return 'Started the checkpoint';
      case 'lesson_completed':
        return `Finished lesson “${event.lessonId}”`;
      case 'lesson_abandoned':
        return `Left lesson “${event.lessonId}” after ${event.answered} of ${event.total}`;
      case 'lesson_started':
        return `Started lesson “${event.lessonId}”`;
      case 'onboarding_completed':
        return 'Finished onboarding';
      default:
        break;
    }
  }
  return 'Nothing yet';
}

export function summarizePlaytest(
  events: readonly PlaytestEvent[],
  course: readonly PlaytestUnit[] = [],
): PlaytestSummary {
  const onboarded = events.find((event) => event.type === 'onboarding_completed');
  const lessonsStarted = new Set<string>();
  const lessonsCompleted = new Set<string>();
  const lessonDurations: number[] = [];
  const accuracy = new Map<QuestionType, { answered: number; correct: number }>();
  const tasks = new Map<string, TaskStats>();
  const surveys: Array<{ surveyId: SurveyId; answer: string }> = [];
  const notes: string[] = [];

  let lessonsAbandoned = 0;
  let checkpointAttempts = 0;
  let checkpointPassed = false;
  let checkpointLastScore: string | null = null;
  let missionOpenedAt: string | null = null;
  let lastLessonCompletedAt: string | null = null;
  let pyodideLoadMs: number | null = null;
  let missionCompleted = false;
  let lastTaskReached: string | null = null;
  let dailyGoalMetDays = 0;

  const taskFor = (taskId: string): TaskStats => {
    const existing = tasks.get(taskId);
    if (existing) return existing;
    const created: TaskStats = { taskId, runs: 0, passed: false, hints: 0, deepestHint: 0 };
    tasks.set(taskId, created);
    return created;
  };

  for (const event of events) {
    switch (event.type) {
      case 'lesson_started':
        lessonsStarted.add(event.lessonId);
        break;
      case 'lesson_completed':
        lessonsCompleted.add(event.lessonId);
        lessonDurations.push(event.ms);
        lastLessonCompletedAt = event.at;
        break;
      case 'lesson_abandoned':
        lessonsAbandoned += 1;
        break;
      case 'question_answered': {
        if (!event.firstAttempt) break;
        const current = accuracy.get(event.questionType) ?? { answered: 0, correct: 0 };
        accuracy.set(event.questionType, {
          answered: current.answered + 1,
          correct: current.correct + (event.correct ? 1 : 0),
        });
        break;
      }
      case 'checkpoint_finished':
        checkpointAttempts += 1;
        checkpointPassed = checkpointPassed || event.passed;
        checkpointLastScore = `${event.correct} of ${event.total}`;
        break;
      case 'mission_opened':
        missionOpenedAt = missionOpenedAt ?? event.at;
        break;
      case 'pyodide_loaded':
        pyodideLoadMs = pyodideLoadMs ?? event.ms;
        break;
      case 'task_run': {
        const task = taskFor(event.taskId);
        task.runs += 1;
        task.passed = task.passed || event.passed;
        lastTaskReached = event.taskId;
        break;
      }
      case 'hint_viewed': {
        const task = taskFor(event.taskId);
        task.hints += 1;
        task.deepestHint = Math.max(task.deepestHint, event.level);
        break;
      }
      case 'mission_completed':
        missionCompleted = true;
        break;
      case 'mission_abandoned':
        lastTaskReached = lastTaskReached ?? event.lastTaskId;
        break;
      case 'daily_goal_met':
        dailyGoalMetDays += 1;
        break;
      case 'survey_answered':
        surveys.push({ surveyId: event.surveyId, answer: event.answer });
        break;
      case 'survey_note':
        notes.push(event.note);
        break;
      default:
        break;
    }
  }

  const gapFromLastLessonMs =
    missionOpenedAt && lastLessonCompletedAt
      ? Math.max(0, Date.parse(missionOpenedAt) - Date.parse(lastLessonCompletedAt))
      : null;

  return {
    events: events.length,
    from: events[0]?.at ?? null,
    to: events.at(-1)?.at ?? null,
    onboarding: {
      completed: Boolean(onboarded),
      goal: onboarded?.type === 'onboarding_completed' ? onboarded.goal : null,
      dailyGoal: onboarded?.type === 'onboarding_completed' ? onboarded.dailyGoal : null,
    },
    lessonsStarted: lessonsStarted.size,
    lessonsCompleted: lessonsCompleted.size,
    lessonsAbandoned,
    medianLessonMs: median(lessonDurations),
    accuracyByType: [...accuracy.entries()].map(([type, counts]) => ({ type, ...counts })),
    checkpoint: {
      attempts: checkpointAttempts,
      passed: checkpointPassed,
      lastScore: checkpointLastScore,
    },
    mission: {
      opened: missionOpenedAt !== null,
      pyodideLoadMs,
      gapFromLastLessonMs,
      tasks: [...tasks.values()],
      completed: missionCompleted,
      lastTaskReached,
    },
    dailyGoalMetDays,
    surveys,
    notes,
    stoppedAt: describeStop(events),
    units: summarizeUnits(events, course),
  };
}

function addAccuracy(
  accuracy: Map<QuestionType, { answered: number; correct: number }>,
  type: QuestionType,
  correct: boolean,
) {
  const current = accuracy.get(type) ?? { answered: 0, correct: 0 };
  accuracy.set(type, {
    answered: current.answered + 1,
    correct: current.correct + (correct ? 1 : 0),
  });
}

/**
 * Splits the log by unit. Lesson and checkpoint events name their lesson or checkpoint; boss
 * events name their unit; mission task events belong to the mission most recently opened.
 */
export function summarizeUnits(
  events: readonly PlaytestEvent[],
  course: readonly PlaytestUnit[],
): UnitPlaytestSummary[] {
  const byLesson = new Map<string, string>();
  const byCheckpoint = new Map<string, string>();
  const byMission = new Map<string, string>();
  for (const unit of course) {
    unit.lessonIds.forEach((lessonId) => byLesson.set(lessonId, unit.id));
    byCheckpoint.set(unit.checkpointId, unit.id);
    byMission.set(unit.missionId, unit.id);
  }

  interface Tally {
    started: Set<string>;
    completed: Set<string>;
    abandoned: number;
    accuracy: Map<QuestionType, { answered: number; correct: number }>;
    checkpoint: UnitPlaytestSummary['checkpoint'];
    boss: UnitPlaytestSummary['boss'];
    missionOpened: boolean;
    missionCompleted: boolean;
    tasks: Map<string, TaskStats>;
  }
  const tallies = new Map<string, Tally>(
    course.map((unit) => [
      unit.id,
      {
        started: new Set(),
        completed: new Set(),
        abandoned: 0,
        accuracy: new Map(),
        checkpoint: { attempts: 0, passed: false, lastScore: null },
        boss: { rounds: 0, bestCorrect: null },
        missionOpened: false,
        missionCompleted: false,
        tasks: new Map(),
      },
    ]),
  );
  const tallyFor = (unitId: string | undefined) => (unitId ? tallies.get(unitId) : undefined);
  const taskFor = (tally: Tally, taskId: string) => {
    const existing = tally.tasks.get(taskId);
    if (existing) return existing;
    const created: TaskStats = { taskId, runs: 0, passed: false, hints: 0, deepestHint: 0 };
    tally.tasks.set(taskId, created);
    return created;
  };

  let missionUnit: string | undefined;
  let bossUnit: string | undefined;
  for (const event of events) {
    switch (event.type) {
      case 'lesson_started':
        tallyFor(byLesson.get(event.lessonId))?.started.add(event.lessonId);
        break;
      case 'lesson_completed':
        tallyFor(byLesson.get(event.lessonId))?.completed.add(event.lessonId);
        break;
      case 'lesson_abandoned': {
        const tally = tallyFor(byLesson.get(event.lessonId));
        if (tally) tally.abandoned += 1;
        break;
      }
      case 'question_answered': {
        if (!event.firstAttempt && event.source !== 'boss') break;
        const unitId =
          event.source === 'boss'
            ? bossUnit
            : event.source === 'mission'
              ? missionUnit
              : byLesson.get(event.lessonId ?? '');
        const tally = tallyFor(unitId);
        // Boss answers are never first tries, so they only count toward their unit.
        if (tally && (event.firstAttempt || event.source === 'boss')) {
          addAccuracy(tally.accuracy, event.questionType, event.correct);
        }
        break;
      }
      case 'checkpoint_finished': {
        const tally = tallyFor(byCheckpoint.get(event.checkpointId));
        if (!tally) break;
        tally.checkpoint = {
          attempts: tally.checkpoint.attempts + 1,
          passed: tally.checkpoint.passed || event.passed,
          lastScore: `${event.correct} of ${event.total}`,
        };
        break;
      }
      case 'boss_started':
        bossUnit = event.unitId;
        break;
      case 'boss_finished': {
        const tally = tallyFor(event.unitId);
        if (!tally) break;
        tally.boss = {
          rounds: tally.boss.rounds + 1,
          bestCorrect: Math.max(tally.boss.bestCorrect ?? 0, event.correct),
        };
        break;
      }
      case 'mission_opened': {
        missionUnit = byMission.get(event.missionId);
        const tally = tallyFor(missionUnit);
        if (tally) tally.missionOpened = true;
        break;
      }
      case 'mission_completed': {
        const tally = tallyFor(byMission.get(event.missionId));
        if (tally) tally.missionCompleted = true;
        break;
      }
      case 'task_run': {
        const tally = tallyFor(missionUnit);
        if (!tally) break;
        const task = taskFor(tally, event.taskId);
        task.runs += 1;
        task.passed = task.passed || event.passed;
        break;
      }
      case 'hint_viewed': {
        const tally = tallyFor(missionUnit);
        if (!tally) break;
        const task = taskFor(tally, event.taskId);
        task.hints += 1;
        task.deepestHint = Math.max(task.deepestHint, event.level);
        break;
      }
      default:
        break;
    }
  }

  return course.map((unit) => {
    const tally = tallies.get(unit.id) as Tally;
    return {
      unitId: unit.id,
      title: unit.title,
      lessons: {
        started: tally.started.size,
        completed: tally.completed.size,
        abandoned: tally.abandoned,
        total: unit.lessonIds.length,
      },
      accuracyByType: [...tally.accuracy.entries()].map(([type, counts]) => ({ type, ...counts })),
      checkpoint: tally.checkpoint,
      boss: tally.boss,
      mission: {
        opened: tally.missionOpened,
        completed: tally.missionCompleted,
        tasks: [...tally.tasks.values()],
      },
    };
  });
}

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ${Math.round((ms % 60_000) / 1000)}s`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export { formatMs };

/** A short plain-text summary a tester can paste into a message. */
export function playtestSummaryText(summary: PlaytestSummary): string {
  const accuracy = summary.accuracyByType
    .map(
      (row) =>
        `  ${row.type}: ${row.correct}/${row.answered} first try` +
        (row.answered > 0 ? ` (${Math.round((row.correct / row.answered) * 100)}%)` : ''),
    )
    .join('\n');
  const tasks = summary.mission.tasks
    .map(
      (task) =>
        `  ${task.taskId}: ${task.runs} run${task.runs === 1 ? '' : 's'}, ${
          task.passed ? 'passed' : 'not passed'
        }, ${task.hints} hint${task.hints === 1 ? '' : 's'}` +
        (task.deepestHint > 0 ? ` (level ${task.deepestHint})` : ''),
    )
    .join('\n');
  const surveys = summary.surveys.map((row) => `  ${row.surveyId}: ${row.answer}`).join('\n');

  return [
    'Data Detective playtest summary',
    `Events: ${summary.events}${summary.from ? ` from ${summary.from.slice(0, 10)} to ${(summary.to ?? '').slice(0, 10)}` : ''}`,
    `Goal: ${summary.onboarding.goal ?? '—'}, daily goal ${summary.onboarding.dailyGoal ?? '—'} XP`,
    `Lessons: ${summary.lessonsCompleted} completed, ${summary.lessonsStarted} started, ${summary.lessonsAbandoned} left part way`,
    `Median lesson time: ${formatMs(summary.medianLessonMs)}`,
    'First-try accuracy by question type:',
    accuracy || '  none yet',
    `Checkpoint: ${summary.checkpoint.attempts} attempt(s), ${
      summary.checkpoint.passed ? 'passed' : 'not passed'
    }${summary.checkpoint.lastScore ? `, last ${summary.checkpoint.lastScore}` : ''}`,
    `Mission: ${summary.mission.opened ? 'opened' : 'not opened'}, Python load ${formatMs(
      summary.mission.pyodideLoadMs,
    )}, gap after last lesson ${formatMs(summary.mission.gapFromLastLessonMs)}, ${
      summary.mission.completed ? 'completed' : 'not completed'
    }`,
    'Mission tasks:',
    tasks || '  none yet',
    `Daily goal met on ${summary.dailyGoalMetDays} day(s)`,
    'Surveys:',
    surveys || '  none yet',
    summary.notes.length > 0 ? `Notes: ${summary.notes.join(' | ')}` : 'Notes: none',
    `Stopped at: ${summary.stoppedAt}`,
    ...(summary.units.length > 0 ? ['By unit:', ...summary.units.map(unitLine)] : []),
  ].join('\n');
}

function unitLine(unit: UnitPlaytestSummary): string {
  const answered = unit.accuracyByType.reduce((sum, row) => sum + row.answered, 0);
  const correct = unit.accuracyByType.reduce((sum, row) => sum + row.correct, 0);
  return [
    `  ${unit.title}: lessons ${unit.lessons.completed}/${unit.lessons.total}`,
    answered > 0 ? `first try ${correct}/${answered}` : 'no answers yet',
    `checkpoint ${unit.checkpoint.passed ? 'passed' : `${unit.checkpoint.attempts} attempt(s)`}`,
    `boss ${unit.boss.rounds} round(s)${unit.boss.bestCorrect !== null ? `, best ${unit.boss.bestCorrect}` : ''}`,
    `mission ${unit.mission.completed ? 'completed' : unit.mission.opened ? 'opened' : 'not opened'}`,
  ].join(', ');
}
