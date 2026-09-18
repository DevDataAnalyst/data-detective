import { describe, expect, it } from 'vitest';
import {
  isMissionUnlocked,
  lessonStatus,
  lessonStatuses,
  nextLessonId,
  unitUnlocks,
  unlockingLessonId,
} from './unlocks';

const lessons = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'];

describe('lesson unlocking', () => {
  it('starts with only the first lesson available', () => {
    expect(lessonStatuses(lessons, new Set())).toEqual([
      'available',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
  });

  it('unlocks the next lesson when one is completed', () => {
    expect(lessonStatuses(lessons, new Set(['l1'])).slice(0, 3)).toEqual([
      'completed',
      'available',
      'locked',
    ]);
    expect(lessonStatus(lessons, new Set(['l1', 'l2']), 'l3')).toBe('available');
  });

  it('keeps completed lessons completed, even out of order', () => {
    const statuses = lessonStatuses(lessons, new Set(['l1', 'l3']));
    expect(statuses.slice(0, 4)).toEqual(['completed', 'available', 'completed', 'available']);
  });

  it('names the lesson that unlocks each lesson', () => {
    expect(unlockingLessonId(lessons, 'l1')).toBeNull();
    expect(unlockingLessonId(lessons, 'l4')).toBe('l3');
    expect(unlockingLessonId(lessons, 'unknown')).toBeNull();
    expect(lessonStatus(lessons, new Set(), 'unknown')).toBeNull();
  });

  it('points to the first lesson not yet completed', () => {
    expect(nextLessonId(lessons, new Set())).toBe('l1');
    expect(nextLessonId(lessons, new Set(['l1', 'l2']))).toBe('l3');
    expect(nextLessonId(lessons, new Set(lessons))).toBeNull();
  });
});

describe('mission unlocking', () => {
  it('stays locked until all seven lessons are completed', () => {
    expect(isMissionUnlocked(lessons, new Set(), false)).toBe(false);
    expect(isMissionUnlocked(lessons, new Set(lessons.slice(0, 6)), false)).toBe(false);
    expect(isMissionUnlocked(lessons, new Set(lessons), false)).toBe(true);
  });

  it('unlocks straight away after passing the checkpoint', () => {
    expect(isMissionUnlocked(lessons, new Set(), true)).toBe(true);
  });
});

describe('units open in order', () => {
  const unfinished = { missionCompleted: false, checkpointPassed: false };

  it('keeps later units locked until the one before is finished', () => {
    expect(unitUnlocks([unfinished, unfinished, unfinished])).toEqual([true, false, false]);
  });

  it('opens the next unit when the mission is completed, or the checkpoint is passed', () => {
    expect(
      unitUnlocks([{ missionCompleted: true, checkpointPassed: false }, unfinished, unfinished]),
    ).toEqual([true, true, false]);
    expect(
      unitUnlocks([{ missionCompleted: false, checkpointPassed: true }, unfinished, unfinished]),
    ).toEqual([true, true, false]);
  });

  it('needs every unit in between to be finished, not just the first', () => {
    const finished = { missionCompleted: true, checkpointPassed: true };
    expect(unitUnlocks([finished, unfinished, finished])).toEqual([true, true, false]);
    expect(unitUnlocks([finished, finished, unfinished])).toEqual([true, true, true]);
  });
});
