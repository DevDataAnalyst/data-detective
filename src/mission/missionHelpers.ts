import type { MissionTask } from '../content/types';
import type { RunOutcome } from './python/pythonRuntime';

/** The mission complete screen. It does not load Python, so it opens quickly. */
export const MISSION_SUMMARY_PATH = '/mission/summary';

/** Each code task has a nudge, a pointer to the method, and an example with a blank. */
export const HINT_LEVELS = 3;

/** "1" to "5" for required tasks, "S1", "S2" for stretch tasks. */
export function taskLabel(tasks: readonly MissionTask[], taskId: string): string {
  const required = tasks.filter((task) => !task.stretch);
  const stretch = tasks.filter((task) => task.stretch);
  const requiredIndex = required.findIndex((task) => task.id === taskId);
  if (requiredIndex !== -1) return String(requiredIndex + 1);
  return `S${stretch.findIndex((task) => task.id === taskId) + 1}`;
}

/** A one-line summary of a run for screen reader announcements. */
export function describeOutcome(outcome: RunOutcome): string {
  switch (outcome.kind) {
    case 'timed_out':
      return 'Your code was stopped because it took too long.';
    case 'unavailable':
      return outcome.message;
    case 'completed':
      return outcome.result.error
        ? `Your code stopped with a ${outcome.result.error.type}.`
        : 'Your code ran successfully.';
  }
}

/** A run that finished and raised no error. */
export function runSucceeded(outcome: RunOutcome): boolean {
  return outcome.kind === 'completed' && outcome.result.error === null;
}

/** Sentences of at least three words, for the suggested length of written answers. */
export function countSentences(text: string): number {
  return text
    .split(/[.!?]+(?:\s|$)/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 3).length;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}
