import type { Lesson, Statistic, Unit } from './types';
import { unit1 } from './unit1';

/** Units in course order. The prototype has one. */
export const courseUnits: readonly Unit[] = [unit1];

export interface LessonLocation {
  unit: Unit;
  lesson: Lesson;
  /** Zero-based position of the lesson on its unit's path. */
  index: number;
}

export function findLesson(lessonId: string): LessonLocation | null {
  for (const unit of courseUnits) {
    const index = unit.lessons.findIndex((lesson) => lesson.id === lessonId);
    if (index !== -1) return { unit, lesson: unit.lessons[index], index };
  }
  return null;
}

/** How statistics are named in learner-facing copy. */
export const STATISTIC_LABELS: Record<Statistic, string> = {
  count: 'count',
  sum: 'total',
  min: 'minimum',
  max: 'maximum',
  mean: 'mean',
  median: 'median',
  mode: 'mode',
  range: 'range',
  q1: 'Q1',
  q3: 'Q3',
  iqr: 'IQR',
  std_dev: 'standard deviation',
  lower_fence: 'lower fence',
  upper_fence: 'upper fence',
};
