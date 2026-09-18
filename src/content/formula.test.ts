import { describe, expect, it } from 'vitest';
import { normalCdf } from '../game/stats';
import { evaluateFormula, formulaNames } from './formula';
import { fillQuestionText, questionScope, templateTokens } from './template';
import type { MultipleChoiceQuestion } from './types';
import { validateQuestion } from './validate';

describe('content formulas', () => {
  it('does arithmetic with the usual order of operations', () => {
    expect(evaluateFormula('1 + 2 * 3', {})).toBe(7);
    expect(evaluateFormula('(1 + 2) * 3', {})).toBe(9);
    expect(evaluateFormula('2 ^ 3 ^ 2', {})).toBe(512);
    expect(evaluateFormula('-2 ^ 2', {})).toBe(4);
    expect(evaluateFormula('10 / 4 - .5', {})).toBe(2);
  });

  it('reads names from the scope and calls the allowed functions', () => {
    const scope = { hits: 40, flagged: 135 };
    expect(evaluateFormula('hits / flagged * 100', scope)).toBeCloseTo(29.63, 2);
    expect(evaluateFormula('sqrt(16) + abs(-2) + max(1, 5) - min(3, 4)', {})).toBe(8);
    expect(evaluateFormula('phi(0)', {})).toBeCloseTo(0.5, 7);
    expect(formulaNames('sqrt(p * (1 - p) / n) + phi(z)')).toEqual(['p', 'p', 'n', 'z']);
  });

  it('refuses anything it does not understand', () => {
    expect(() => evaluateFormula('rate * 2', {})).toThrow(/unknown name “rate”/);
    expect(() => evaluateFormula('alert(1)', {})).toThrow(/unknown function/);
    expect(() => evaluateFormula('1 +', {})).toThrow(/ends too soon/);
    expect(() => evaluateFormula('2 3', {})).toThrow(/left over/);
    expect(() => evaluateFormula('window.x', {})).toThrow(/cannot read/);
  });

  it('computes the standard normal CDF', () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
    expect(normalCdf(1)).toBeCloseTo(0.8413, 4);
  });
});

describe('questions built on givens', () => {
  const base: MultipleChoiceQuestion = {
    id: 'bayes',
    type: 'multiple_choice',
    prompt:
      '{base:%} cancel; the model flags {hit_rate:%} of them and {false_alarm:%} of the rest.',
    givens: { base: 0.05, hit_rate: 0.8, false_alarm: 0.1, people: 1000 },
    derived: {
      caught: 'base * people * hit_rate',
      wrongly_flagged: '(1 - base) * people * false_alarm',
      answer: 'caught / (caught + wrongly_flagged)',
    },
    options: ['About 30%', 'About 80%', 'About 10%'],
    correctIndex: 0,
    check: { kind: 'formula', formula: 'answer * 100', tolerance: 1 },
    explanation: 'Only {caught} of {caught} + {wrongly_flagged} flagged people cancel: {answer:%}.',
  };

  it('works out derived values in order and fills text with them', () => {
    expect(questionScope(base)).toMatchObject({ caught: 40, wrongly_flagged: 95 });
    expect(fillQuestionText(base, base.prompt)).toBe(
      '5% cancel; the model flags 80% of them and 10% of the rest.',
    );
    expect(fillQuestionText(base, base.explanation)).toBe(
      'Only 40 of 40 + 95 flagged people cancel: 29.6%.',
    );
    expect(templateTokens('{answer:%}')).toEqual([
      { raw: '{answer:%}', name: 'answer', decimals: undefined, percent: true },
    ]);
  });

  it('checks the option against the formula, rounding aside', () => {
    expect(validateQuestion(base, 'q')).toEqual([]);
    const wrong = { ...base, options: ['About 25%', 'About 80%', 'About 10%'] };
    expect(validateQuestion(wrong, 'q').map((found) => found.message)).toContainEqual(
      expect.stringMatching(/says 25 but the data gives 29\.6/),
    );
    const twoRight = { ...base, options: ['About 30%', 'About 29.5%', 'About 10%'] };
    expect(validateQuestion(twoRight, 'q').map((found) => found.message)).toContainEqual(
      expect.stringMatching(/option 1 .* is also correct/),
    );
  });

  it('catches unknown names, statistic clashes and placeholders with no value', () => {
    const broken: MultipleChoiceQuestion = {
      ...base,
      givens: { mean: 3, base: 0.05 },
      derived: { answer: 'base * missing' },
      explanation: 'Look at {nothing}.',
    };
    const messages = validateQuestion(broken, 'q').map((found) => found.message);
    expect(messages).toContainEqual(expect.stringMatching(/"mean" is a statistic name/));
    expect(messages).toContainEqual(expect.stringMatching(/uses unknown missing/));
    expect(messages).toContainEqual(expect.stringMatching(/\{nothing\} is not a known statistic/));
  });
});
