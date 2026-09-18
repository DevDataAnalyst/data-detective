import { describe, expect, it } from 'vitest';
import { courseUnits } from '../content';
import { lateDeliveryMystery, theFalseAlarm } from '../content/missions';
import { unit1 } from '../content/unit1';
import { unit2 } from '../content/unit2';
import { courseStanding, currentUnitIndex } from './course';
import { updateMission } from './missionProgress';
import { createInitialProgress, markHookSeen, markLessonCompleted } from './progress';
import { finishCheckpoint } from './rewards';

const now = new Date('2026-03-10T09:00:00Z');

describe('course standing', () => {
  it('starts with unit 1 open and unit 2 locked, its message not yet due', () => {
    const [first, second] = courseStanding(courseUnits, createInitialProgress());
    expect(first).toMatchObject({
      number: 1,
      unlocked: true,
      lessonsCompleted: 0,
      hookPending: false,
    });
    expect(second).toMatchObject({
      number: 2,
      unlocked: false,
      missionUnlocked: false,
      missionState: 'locked',
      hookPending: false,
    });
  });

  it('opens unit 2 with its message once unit 1’s mission is complete', () => {
    const done = updateMission(createInitialProgress(), lateDeliveryMystery.id, (mission) => ({
      ...mission,
      completedAt: now.toISOString(),
    }));
    const standings = courseStanding(courseUnits, done);
    expect(standings[1]).toMatchObject({ unlocked: true, hookPending: true });
    expect(currentUnitIndex(standings)).toBe(1);
    expect(courseStanding(courseUnits, markHookSeen(done, unit2.id))[1].hookPending).toBe(false);
  });

  it('opens unit 2 when unit 1’s checkpoint is passed, even before its mission', () => {
    const allRight = Object.fromEntries(
      unit1.checkpoint.items.map((item) => [item.question.id, true]),
    );
    const { state } = finishCheckpoint(createInitialProgress(), {
      unit: unit1,
      correctByQuestion: allRight,
      now,
    });
    const standings = courseStanding(courseUnits, state);
    expect(standings[0]).toMatchObject({ missionUnlocked: true, missionState: 'available' });
    expect(standings[1].unlocked).toBe(true);
    expect(currentUnitIndex(standings)).toBe(0);
  });

  it('keeps a locked unit’s mission locked, even with its lessons done', () => {
    const played = unit2.lessons.reduce(
      (state, lesson) => markLessonCompleted(state, lesson.id, now),
      createInitialProgress(),
    );
    const second = courseStanding(courseUnits, played)[1];
    expect(second).toMatchObject({ unlocked: false, lessonsCompleted: 7, missionUnlocked: false });
    expect(second.graded.total).toBe(
      theFalseAlarm.tasks.filter((task) => task.kind !== 'written' && !task.stretch).length,
    );
  });
});
