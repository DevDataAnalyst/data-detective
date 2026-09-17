import type { RunOutcome } from './python/pythonRuntime';

/** What the learner sees under the output after a run of a mission task. */
export type TaskFeedback =
  { kind: 'passed'; message: string } | { kind: 'not_yet'; message: string };

const STAYS_PASSED = 'You passed this task before, so it stays passed.';

function notYet(message: string, alreadyPassed: boolean): TaskFeedback {
  return { kind: 'not_yet', message: alreadyPassed ? `${message} ${STAYS_PASSED}` : message };
}

/**
 * Turns a run into task feedback. The hidden check's message is shown as it is, except when the
 * code stopped with an error: then the error is the thing to fix first. A task that was passed
 * before stays passed, whatever later runs do.
 */
export function feedbackForRun(
  outcome: RunOutcome,
  { alreadyPassed = false }: { alreadyPassed?: boolean } = {},
): TaskFeedback | null {
  switch (outcome.kind) {
    case 'timed_out':
      return notYet(
        'Your code was stopped before it could be checked. Fix the slow part and run it again.',
        alreadyPassed,
      );
    case 'unavailable':
      return null;
    case 'completed': {
      const { check, result } = outcome;
      if (!check) return null;
      if (check.passed) return { kind: 'passed', message: check.message };
      if (result.error) {
        return notYet(
          'Fix the error shown in the output below, then run your code again.',
          alreadyPassed,
        );
      }
      return notYet(check.message, alreadyPassed);
    }
  }
}
