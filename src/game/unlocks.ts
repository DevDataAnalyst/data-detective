/** Unlocking rules for a unit's path. */

export type LessonStatus = 'locked' | 'available' | 'completed';

/** Lessons unlock in order: each one opens when the lesson before it is completed. */
export function lessonStatuses(
  lessonIds: readonly string[],
  completed: ReadonlySet<string>,
): LessonStatus[] {
  return lessonIds.map((id, index) => {
    if (completed.has(id)) return 'completed';
    if (index === 0 || completed.has(lessonIds[index - 1])) return 'available';
    return 'locked';
  });
}

export function lessonStatus(
  lessonIds: readonly string[],
  completed: ReadonlySet<string>,
  lessonId: string,
): LessonStatus | null {
  const index = lessonIds.indexOf(lessonId);
  return index === -1 ? null : lessonStatuses(lessonIds, completed)[index];
}

/** The lesson that has to be completed to unlock this one. Null for the first lesson. */
export function unlockingLessonId(lessonIds: readonly string[], lessonId: string): string | null {
  const index = lessonIds.indexOf(lessonId);
  return index > 0 ? lessonIds[index - 1] : null;
}

/** Where the learner should go next: the first lesson not yet completed. */
export function nextLessonId(
  lessonIds: readonly string[],
  completed: ReadonlySet<string>,
): string | null {
  return lessonIds.find((id) => !completed.has(id)) ?? null;
}

/** The mission opens after every lesson is completed, or after passing the checkpoint. */
export function isMissionUnlocked(
  lessonIds: readonly string[],
  completed: ReadonlySet<string>,
  checkpointPassed: boolean,
): boolean {
  return checkpointPassed || lessonIds.every((id) => completed.has(id));
}
