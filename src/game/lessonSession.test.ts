import { describe, expect, it } from 'vitest';
import {
  createLessonSession,
  currentQuestionId,
  firstAttemptAccuracy,
  isRetry,
  lessonProgress,
  lessonSessionReducer,
  sessionDurationMs,
  type LessonSessionAction,
  type LessonSessionState,
} from './lessonSession';

function run(state: LessonSessionState, ...actions: LessonSessionAction[]): LessonSessionState {
  return actions.reduce(lessonSessionReducer, state);
}

const answer = (correct: boolean, now = 0): LessonSessionAction[] => [
  { type: 'submit', correct },
  { type: 'continue', now },
];

describe('lesson session', () => {
  it('starts on the intro and moves to the first question on start', () => {
    const intro = createLessonSession(['a', 'b', 'c']);
    expect(intro.phase).toBe('intro');
    expect(currentQuestionId(intro)).toBeNull();

    const started = run(intro, { type: 'start', now: 1000 });
    expect(started.phase).toBe('question');
    expect(currentQuestionId(started)).toBe('a');
    expect(started.startedAt).toBe(1000);
  });

  it('walks through the questions in order when every answer is right', () => {
    let state = run(createLessonSession(['a', 'b', 'c']), { type: 'start', now: 0 });
    const seen: string[] = [];
    while (state.phase === 'question') {
      seen.push(currentQuestionId(state)!);
      state = run(state, ...answer(true, 90_000));
    }
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(state.phase).toBe('summary');
    expect(firstAttemptAccuracy(state)).toBe(1);
    expect(sessionDurationMs(state)).toBe(90_000);
  });

  it('re-queues a wrong answer at the end of the lesson', () => {
    let state = run(createLessonSession(['a', 'b', 'c']), { type: 'start', now: 0 });
    state = run(state, ...answer(false));
    expect(state.queue).toEqual(['b', 'c', 'a']);
    expect(state.completedIds).toEqual([]);

    state = run(state, ...answer(true), ...answer(true));
    expect(currentQuestionId(state)).toBe('a');
    expect(isRetry(state)).toBe(true);
    expect(state.phase).toBe('question');
  });

  it('only ends once every question has been answered correctly once', () => {
    let state = run(createLessonSession(['a', 'b']), { type: 'start', now: 0 });
    // a wrong, b wrong, a wrong again, b right, a right
    state = run(state, ...answer(false), ...answer(false), ...answer(false));
    expect(state.phase).toBe('question');
    expect(state.queue).toEqual(['b', 'a']);
    state = run(state, ...answer(true));
    expect(state.phase).toBe('question');
    state = run(state, ...answer(true, 5000));
    expect(state.phase).toBe('summary');
    expect(state.completedIds).toEqual(['b', 'a']);
    expect(state.attempts).toEqual({ a: 3, b: 2 });
  });

  it('brings the last question straight back when it is answered wrongly', () => {
    let state = run(createLessonSession(['only']), { type: 'start', now: 0 });
    state = run(state, ...answer(false));
    expect(currentQuestionId(state)).toBe('only');
    expect(state.phase).toBe('question');
  });

  it('scores accuracy on first attempts only', () => {
    let state = run(createLessonSession(['a', 'b', 'c', 'd']), { type: 'start', now: 0 });
    // a right, b wrong, c right, d right, then b right on the retry
    state = run(state, ...answer(true), ...answer(false), ...answer(true), ...answer(true));
    state = run(state, ...answer(true));
    expect(state.phase).toBe('summary');
    expect(state.firstAttemptCorrect).toEqual({ a: true, b: false, c: true, d: true });
    expect(firstAttemptAccuracy(state)).toBe(0.75);
  });

  it('tracks progress as questions are completed, not attempted', () => {
    let state = run(createLessonSession(['a', 'b', 'c', 'd']), { type: 'start', now: 0 });
    state = run(state, ...answer(false));
    expect(lessonProgress(state)).toBe(0);
    state = run(state, ...answer(true));
    expect(lessonProgress(state)).toBe(0.25);
  });

  it('ignores actions that do not fit the current step', () => {
    const intro = createLessonSession(['a', 'b']);
    expect(run(intro, { type: 'submit', correct: true })).toBe(intro);
    expect(run(intro, { type: 'continue', now: 0 })).toBe(intro);

    const answering = run(intro, { type: 'start', now: 0 });
    expect(run(answering, { type: 'continue', now: 0 })).toBe(answering);
    expect(run(answering, { type: 'start', now: 5 })).toBe(answering);

    const feedback = run(answering, { type: 'submit', correct: false });
    // A second submit while feedback is showing must not count as another attempt.
    expect(run(feedback, { type: 'submit', correct: true })).toBe(feedback);
  });
});
