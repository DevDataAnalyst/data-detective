import { describe, expect, it } from 'vitest';
import { courseUnits, findLesson, findUnit, unitNumber } from '.';
import { missions, unitMission } from './missions';
import { unit1 } from './unit1';
import { unit2 } from './unit2';
import { formatIssues, validateCourse } from './validate';

describe('the course', () => {
  it('has unique ids across units, and a mission for every unit', () => {
    expect(formatIssues(validateCourse(courseUnits, missions))).toBe('');
    expect(courseUnits.map((unit) => unitMission(unit).id)).toEqual(
      courseUnits.map((unit) => unit.missionId),
    );
  });

  it('catches ids reused across units', () => {
    const clash = { ...unit2, lessons: [unit1.lessons[0], ...unit2.lessons.slice(1)] };
    const issues = formatIssues(validateCourse([unit1, clash], missions));
    expect(issues).toMatch(/lesson ids used in two units: what-is-a-dataset/);
    expect(issues).toMatch(/question ids used twice/);
    expect(formatIssues(validateCourse([{ ...unit1, missionId: 'nope' }], missions))).toMatch(
      /mission "nope" does not exist/,
    );
  });

  it('finds units and lessons by id', () => {
    expect(findUnit(unit2.id)).toBe(unit2);
    expect(findUnit('unit-9')).toBeNull();
    expect(unitNumber(unit2)).toBe(2);
    expect(findLesson(unit2.lessons[3].id)).toMatchObject({ unit: unit2, index: 3 });
  });
});
