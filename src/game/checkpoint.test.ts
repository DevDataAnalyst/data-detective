import { describe, expect, it } from 'vitest';
import { unit1 } from '../content/unit1';
import {
  checkpointAvailability,
  checkpointSessionReducer,
  correctByQuestion,
  correctNeeded,
  createCheckpointSession,
  reviewStartLessonId,
  scoreCheckpoint,
  type CheckpointProgress,
} from './checkpoint';
import { checkpointProgress, createInitialProgress, markLessonCompleted } from './progress';
import { finishCheckpoint } from './rewards';

const { checkpoint } = unit1;
const lessonOrder = unit1.lessons.map((lesson) => lesson.id);
const questionIds = checkpoint.items.map((item) => item.question.id);

/** Results with every question right except the given indices. */
function resultsMissing(...missedIndices: number[]): Record<string, boolean> {
  return Object.fromEntries(
    questionIds.map((questionId, index) => [questionId, !missedIndices.includes(index)]),
  );
}

describe('checkpoint scoring', () => {
  it('needs 8 of 10 to pass', () => {
    expect(correctNeeded(checkpoint)).toBe(8);
    expect(scoreCheckpoint(checkpoint, lessonOrder, resultsMissing(3, 9)).passed).toBe(true);
    expect(scoreCheckpoint(checkpoint, lessonOrder, resultsMissing(3, 8, 9)).passed).toBe(false);
  });

  it('works out the smallest passing score without floating point surprises', () => {
    expect(correctNeeded({ ...checkpoint, passMark: 0.7 })).toBe(7);
    expect(correctNeeded({ ...checkpoint, passMark: 0.75 })).toBe(8);
    expect(correctNeeded({ ...checkpoint, passMark: 1 })).toBe(10);
  });

  it('lists missed topics once each, in path order', () => {
    const lastIndex = questionIds.length - 1;
    const score = scoreCheckpoint(checkpoint, lessonOrder, resultsMissing(lastIndex, 0, 1, 3));
    expect(score).toMatchObject({ correct: 6, total: 10, needed: 8, passed: false });
    expect(score.missedLessonIds).toEqual([
      'what-is-a-dataset',
      'median-and-mode',
      'shapes-of-data',
    ]);
    expect(score.missedByLesson).toEqual({
      'what-is-a-dataset': 2,
      'median-and-mode': 1,
      'shapes-of-data': 1,
    });
  });

  it('counts unanswered questions as missed', () => {
    expect(scoreCheckpoint(checkpoint, lessonOrder, {}).correct).toBe(0);
  });
});

describe('where to start after a failed attempt', () => {
  it('suggests the first missed lesson the learner can open', () => {
    const completed = new Set(['what-is-a-dataset', 'the-mean']);
    expect(reviewStartLessonId(lessonOrder, completed, ['the-mean', 'shapes-of-data'])).toBe(
      'the-mean',
    );
    expect(reviewStartLessonId(lessonOrder, completed, ['median-and-mode', 'range-and-iqr'])).toBe(
      'median-and-mode',
    );
  });

  it('suggests the next lesson on the path when every missed lesson is still locked', () => {
    expect(reviewStartLessonId(lessonOrder, new Set(), ['range-and-iqr', 'shapes-of-data'])).toBe(
      'what-is-a-dataset',
    );
  });
});

describe('checkpoint retake wait', () => {
  const failedAt = new Date('2026-03-10T10:00:00Z');
  const failed: CheckpointProgress = {
    passedAt: null,
    attempts: 1,
    lastAttempt: {
      at: failedAt.toISOString(),
      correct: 6,
      total: 10,
      passed: false,
      missedLessonIds: ['the-mean'],
    },
    correctQuestionIds: [],
  };
  const minutesLater = (minutes: number) => new Date(failedAt.getTime() + minutes * 60_000);

  it('is open before any attempt', () => {
    expect(
      checkpointAvailability(checkpointProgress(createInitialProgress(), 'x'), 60, failedAt),
    ).toEqual({
      kind: 'available',
    });
  });

  it('waits the configured delay after a failed attempt, counting minutes up', () => {
    expect(checkpointAvailability(failed, 60, minutesLater(0))).toEqual({
      kind: 'waiting',
      retakeAt: minutesLater(60),
      minutesLeft: 60,
    });
    expect(checkpointAvailability(failed, 60, minutesLater(59.5))).toMatchObject({
      kind: 'waiting',
      minutesLeft: 1,
    });
    expect(checkpointAvailability(failed, 60, minutesLater(60))).toEqual({ kind: 'available' });
  });

  it('uses whatever delay the content sets', () => {
    expect(checkpointAvailability(failed, 5, minutesLater(4))).toMatchObject({ minutesLeft: 1 });
    expect(checkpointAvailability(failed, 5, minutesLater(5)).kind).toBe('available');
    expect(checkpointAvailability(failed, 0, minutesLater(0)).kind).toBe('available');
  });

  it('stays passed once passed', () => {
    const passed = { ...failed, passedAt: '2026-03-09T10:00:00.000Z' };
    expect(checkpointAvailability(passed, 60, minutesLater(1))).toEqual({
      kind: 'passed',
      passedAt: '2026-03-09T10:00:00.000Z',
    });
  });
});

describe('checkpoint session', () => {
  const multipleChoice = (selectedIndex: number) =>
    ({ type: 'multiple_choice', selectedIndex }) as const;

  it('asks each question once, in order, with no re-queue for wrong answers', () => {
    let state = createCheckpointSession(['a', 'b', 'c']);
    state = checkpointSessionReducer(state, { type: 'start', now: 1_000 });
    expect(state).toMatchObject({ phase: 'question', index: 0 });

    state = checkpointSessionReducer(state, {
      type: 'answer',
      answer: multipleChoice(1),
      correct: false,
      now: 2_000,
    });
    expect(state.index).toBe(1);
    state = checkpointSessionReducer(state, {
      type: 'answer',
      answer: multipleChoice(0),
      correct: true,
      now: 3_000,
    });
    state = checkpointSessionReducer(state, {
      type: 'answer',
      answer: multipleChoice(2),
      correct: true,
      now: 4_000,
    });
    expect(state).toMatchObject({
      phase: 'finished',
      index: 2,
      startedAt: 1_000,
      finishedAt: 4_000,
    });
    expect(correctByQuestion(state)).toEqual({ a: false, b: true, c: true });
    expect(state.answers.a.answer).toEqual(multipleChoice(1));

    const after = checkpointSessionReducer(state, {
      type: 'answer',
      answer: multipleChoice(0),
      correct: true,
      now: 5_000,
    });
    expect(after).toBe(state);
  });
});

describe('finishing the checkpoint', () => {
  const now = new Date(2026, 2, 10, 18, 0);

  it('marks every lesson tested out, opens the mission and pays 40 XP when passed', () => {
    const played = markLessonCompleted(
      createInitialProgress(),
      'what-is-a-dataset',
      new Date(2026, 2, 9),
    );
    const outcome = finishCheckpoint(played, {
      unit: unit1,
      correctByQuestion: resultsMissing(4),
      now,
    });

    expect(outcome).toMatchObject({ xp: 40, firstPass: true, goalJustMet: true });
    expect(outcome.score).toMatchObject({ correct: 9, passed: true });
    expect(outcome.testedOutLessonIds).toEqual(lessonOrder.slice(1));
    expect(Object.keys(outcome.state.lessons)).toEqual(expect.arrayContaining(lessonOrder));
    expect(outcome.state.lessons['what-is-a-dataset']).toEqual(played.lessons['what-is-a-dataset']);
    expect(outcome.state.lessons['the-mean']).toEqual({
      completedAt: now.toISOString(),
      testedOut: true,
    });
    expect(checkpointProgress(outcome.state, checkpoint.id)).toEqual({
      passedAt: now.toISOString(),
      attempts: 1,
      lastAttempt: {
        at: now.toISOString(),
        correct: 9,
        total: 10,
        passed: true,
        missedLessonIds: ['median-and-mode'],
      },
      correctQuestionIds: checkpoint.items
        .map((item) => item.question.id)
        .filter((questionId) => resultsMissing(4)[questionId]),
    });
    expect(checkpointProgress(outcome.state, checkpoint.id).correctQuestionIds).toHaveLength(9);
    expect(outcome.state.activity.totalXp).toBe(40);

    const again = finishCheckpoint(outcome.state, {
      unit: unit1,
      correctByQuestion: resultsMissing(),
      now,
    });
    expect(again).toMatchObject({ xp: 0, firstPass: false, testedOutLessonIds: [] });
    expect(checkpointProgress(again.state, checkpoint.id).passedAt).toBe(now.toISOString());
  });

  it('changes no lessons and pays nothing when failed, but records the attempt', () => {
    const outcome = finishCheckpoint(createInitialProgress(), {
      unit: unit1,
      correctByQuestion: resultsMissing(0, 5, 6),
      now,
    });
    expect(outcome).toMatchObject({ xp: 0, firstPass: false, testedOutLessonIds: [] });
    expect(outcome.state.lessons).toEqual({});
    expect(outcome.state.activity.totalXp).toBe(0);
    expect(checkpointProgress(outcome.state, checkpoint.id)).toMatchObject({
      passedAt: null,
      attempts: 1,
      lastAttempt: {
        passed: false,
        correct: 7,
        missedLessonIds: ['what-is-a-dataset', 'mean-vs-median', 'range-and-iqr'],
      },
    });
  });
});
