import { describe, expect, it } from 'vitest';
import { chartTricks } from '../game/charts';
import { dailyQuestions } from './daily';
import { courseUnits } from './index';
import { missions } from './missions';
import { formatIssues, validateDailyQuestions } from './validate';

describe('daily challenges', () => {
  it('pass validation, with ids of their own', () => {
    expect(formatIssues(validateDailyQuestions(dailyQuestions, courseUnits, missions))).toBe('');
  });

  it('alternate a lying chart with a courtroom case, starting with a chart', () => {
    dailyQuestions.forEach((question, index) => {
      expect(question.type, question.id).toBe(index % 2 === 0 ? 'spot_the_lie' : 'courtroom');
    });
  });

  it('play every kind of chart trick', () => {
    const tricks = dailyQuestions.flatMap((question) =>
      question.type === 'spot_the_lie' ? chartTricks(question.chart) : [],
    );
    expect(new Set(tricks)).toEqual(
      new Set(['truncated_axis', 'cherry_picked_range', 'dual_axis']),
    );
  });

  it('name the common mistake in every explanation', () => {
    for (const question of dailyQuestions) {
      expect(question.explanation, question.id).toMatch(/common mistake/);
    }
  });

  it('put the right answer in different places', () => {
    const positions = dailyQuestions.map((question) =>
      question.type === 'spot_the_lie' ? question.correctIndex : question.confounderIndex,
    );
    expect(new Set(positions).size).toBe(3);
  });

  it('catch a daily question that reuses a course id', () => {
    const [first] = dailyQuestions;
    const courseId = courseUnits[0].lessons[0].questions[0].id;
    const issues = formatIssues(
      validateDailyQuestions([{ ...first, id: courseId }], courseUnits, missions),
    );
    expect(issues).toContain('already used in the course');
  });
});
