import type { Lesson, Statistic, Unit } from './types';
import { unit1 } from './unit1';
import { unit2 } from './unit2';

/** Units in course order. Each unit opens when the one before it is finished. */
export const courseUnits: readonly Unit[] = [unit1, unit2];

export function findUnit(unitId: string): Unit | null {
  return courseUnits.find((unit) => unit.id === unitId) ?? null;
}

/** One-based position of a unit in the course, e.g. 2 for "Unit 2". */
export function unitNumber(unit: Unit): number {
  return courseUnits.indexOf(unit) + 1;
}

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
