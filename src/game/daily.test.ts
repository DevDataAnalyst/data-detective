import { describe, expect, it } from 'vitest';
import { dailyQuestions } from '../content/daily';
import {
  DAILY_HISTORY_DAYS,
  DAILY_LAUNCH,
  dailyNumber,
  dailyNumberText,
  dailyQuestionFor,
  dailyShareHeadline,
  dailyShareText,
  formatDailyTime,
  saveDailyResult,
  secondsTaken,
  type DailyResult,
} from './daily';
import { createInitialProgress } from './progress';
import { addDays } from './streak';

const result = (overrides: Partial<DailyResult> = {}): DailyResult => ({
  questionId: 'daily-lie-chai',
  selectedIndex: 0,
  correct: true,
  seconds: 8,
  ...overrides,
});

describe('dailyNumber', () => {
  it('counts from 1 on launch day', () => {
    expect(dailyNumber(DAILY_LAUNCH)).toBe(1);
    expect(dailyNumber(addDays(DAILY_LAUNCH, 1))).toBe(2);
    expect(dailyNumber(addDays(DAILY_LAUNCH, 365))).toBe(366);
    expect(dailyNumber(addDays(DAILY_LAUNCH, -1))).toBe(0);
  });

  it('is left out of names before launch day', () => {
    expect(dailyNumberText(addDays(DAILY_LAUNCH, 11))).toBe(' #12');
    expect(dailyNumberText(addDays(DAILY_LAUNCH, -1))).toBe('');
    expect(dailyShareText('Headline', addDays(DAILY_LAUNCH, -30), 'https://x.in/daily')).toBe(
      'Headline\nData Detective daily challenge\nhttps://x.in/daily',
    );
  });
});

describe('dailyQuestionFor', () => {
  const letters = ['a', 'b', 'c'];

  it('depends only on the date, so every visitor gets the same question that day', () => {
    expect(dailyQuestionFor('2026-10-02', dailyQuestions)).toBe(
      dailyQuestionFor('2026-10-02', [...dailyQuestions]),
    );
    expect(dailyQuestionFor(DAILY_LAUNCH, dailyQuestions)).toBe(dailyQuestions[0]);
  });

  it('takes the list in order, one a day, then starts again', () => {
    const days = Array.from({ length: 7 }, (_, offset) =>
      dailyQuestionFor(addDays(DAILY_LAUNCH, offset), letters),
    );
    expect(days).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a']);
    expect(dailyQuestionFor(addDays(DAILY_LAUNCH, -1), letters)).toBe('c');
  });

  it('keeps earlier days’ questions when new ones are added at the end', () => {
    const longer = [...letters, 'd', 'e'];
    for (let offset = 0; offset < letters.length; offset += 1) {
      const date = addDays(DAILY_LAUNCH, offset);
      expect(dailyQuestionFor(date, longer)).toBe(dailyQuestionFor(date, letters));
    }
  });

  it('never repeats a question on two days in a row', () => {
    for (let offset = 0; offset < dailyQuestions.length * 2; offset += 1) {
      const today = dailyQuestionFor(addDays(DAILY_LAUNCH, offset), dailyQuestions);
      const tomorrow = dailyQuestionFor(addDays(DAILY_LAUNCH, offset + 1), dailyQuestions);
      expect(tomorrow.id).not.toBe(today.id);
    }
  });

  it('refuses an empty list', () => {
    expect(() => dailyQuestionFor(DAILY_LAUNCH, [])).toThrow();
  });
});

describe('secondsTaken', () => {
  it('rounds to whole seconds and never says 0', () => {
    expect(secondsTaken(1_000, 9_400)).toBe(8);
    expect(secondsTaken(1_000, 9_600)).toBe(9);
    expect(secondsTaken(1_000, 1_200)).toBe(1);
  });
});

describe('saveDailyResult', () => {
  it('keeps the first result of the day, so the clock cannot be replayed', () => {
    const first = saveDailyResult(createInitialProgress(), DAILY_LAUNCH, result());
    const second = saveDailyResult(first, DAILY_LAUNCH, result({ seconds: 2 }));
    expect(second).toBe(first);
    expect(second.daily[DAILY_LAUNCH].seconds).toBe(8);
  });

  it('leaves the course alone: no XP, no lessons, no streak', () => {
    const before = createInitialProgress();
    const after = saveDailyResult(before, DAILY_LAUNCH, result());
    expect({ ...after, daily: {} }).toEqual(before);
  });

  it(`drops results older than ${DAILY_HISTORY_DAYS} days`, () => {
    const old = addDays(DAILY_LAUNCH, -DAILY_HISTORY_DAYS);
    const recent = addDays(DAILY_LAUNCH, -(DAILY_HISTORY_DAYS - 1));
    let state = saveDailyResult(createInitialProgress(), old, result());
    state = saveDailyResult(state, recent, result());
    state = saveDailyResult(state, DAILY_LAUNCH, result());
    expect(Object.keys(state.daily).sort()).toEqual([recent, DAILY_LAUNCH]);
  });
});

describe('share text', () => {
  it('reads the time in words', () => {
    expect(formatDailyTime(1)).toBe('1 second');
    expect(formatDailyTime(8)).toBe('8 seconds');
    expect(formatDailyTime(120)).toBe('120 seconds');
    expect(formatDailyTime(185)).toBe('3 minutes');
  });

  it('boasts about a right answer and owns up to a wrong one', () => {
    expect(dailyShareHeadline('spot_the_lie', { correct: true, seconds: 8 })).toBe(
      'I spotted the lying chart in 8 seconds — can you?',
    );
    expect(dailyShareHeadline('courtroom', { correct: true, seconds: 12 })).toBe(
      'I cracked the case in 12 seconds — can you?',
    );
    expect(dailyShareHeadline('spot_the_lie', { correct: false, seconds: 8 })).toBe(
      'Today’s lying chart fooled me — can you spot the lie?',
    );
    expect(dailyShareHeadline('courtroom', { correct: false, seconds: 8 })).toBe(
      'Today’s case stumped me — can you crack it?',
    );
  });

  it('adds the challenge number and the link', () => {
    expect(dailyShareText('Headline', addDays(DAILY_LAUNCH, 4), 'https://example.com/daily')).toBe(
      'Headline\nData Detective daily challenge #5\nhttps://example.com/daily',
    );
  });
});
