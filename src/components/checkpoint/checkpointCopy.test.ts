import { describe, expect, it } from 'vitest';
import { describeMinutes, questionsMissed } from './checkpointCopy';

describe('checkpoint copy', () => {
  it('describes waits in minutes and hours', () => {
    expect(describeMinutes(1)).toBe('1 minute');
    expect(describeMinutes(0.2)).toBe('1 minute');
    expect(describeMinutes(45)).toBe('45 minutes');
    expect(describeMinutes(60)).toBe('1 hour');
    expect(describeMinutes(90)).toBe('1 hour 30 minutes');
    expect(describeMinutes(121)).toBe('2 hours 1 minute');
  });

  it('counts missed questions', () => {
    expect(questionsMissed(1)).toBe('1 question missed');
    expect(questionsMissed(2)).toBe('2 questions missed');
  });
});
