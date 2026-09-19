import { describe, expect, it } from 'vitest';
import { fillBlank } from '../content/code';
import type { DataTable, MultipleChoiceQuestion, OrderStepsQuestion } from '../content/types';
import { parseLeadingNumber } from '../content/validate';
import { contentQuestions } from './contentQuestions';
import { runSql, sameRows, tryRunSql } from './sqlQuestions';

const orders: DataTable = {
  caption: 'orders',
  columns: ['order_id', 'city', 'value', 'coupon'],
  rows: [
    [1, 'Pune', 400, null],
    [2, 'Pune', 250.5, 'NEW10'],
    [3, 'Delhi', 1000, null],
  ],
};

describe('runSql', () => {
  it('types columns as pandas does, so whole numbers divide as whole numbers', () => {
    expect(
      runSql([orders], 'SELECT 400 / 1000, order_id / 2 FROM orders WHERE order_id = 3'),
    ).toEqual([[0, 1]]);
    expect(
      runSql([orders], 'SELECT typeof(value), typeof(coupon) FROM orders WHERE order_id = 2'),
    ).toEqual([['real', 'text']]);
  });

  it('keeps missing values as NULL', () => {
    expect(runSql([orders], 'SELECT COUNT(*), COUNT(coupon) FROM orders')).toEqual([[3, 1]]);
  });

  it('compares results with or without their order', () => {
    expect(sameRows([[1], [2]], [[2], [1]])).toBe(true);
    expect(sameRows([[1], [2]], [[2], [1]], true)).toBe(false);
    expect(tryRunSql([orders], 'SELECT nope FROM orders')).toBeInstanceOf(Error);
  });
});

/** Every SQL question in the content, so a wrong answer or a bad query fails the build. */
const sqlChoices = contentQuestions().flatMap(({ path, question }) =>
  question.type === 'multiple_choice' && question.check?.kind.startsWith('sql_')
    ? [{ path, question }]
    : [],
);
const sqlOrders = contentQuestions().flatMap(({ path, question }) =>
  question.type === 'order_steps' && question.reference ? [{ path, question }] : [],
);

function checkChoice(question: MultipleChoiceQuestion): string[] {
  const { check, code, tables = [] } = question;
  if (!check || !code) return ['has no check or no code'];
  const problems: string[] = [];
  const numbers = question.options.map(parseLeadingNumber);
  const correct = numbers[question.correctIndex];
  const matches = (value: number) =>
    numbers.flatMap((number, index) =>
      number !== null && Math.abs(number - value) <= 0.005 ? [index] : [],
    );

  switch (check.kind) {
    case 'sql_value': {
      const rows = runSql(tables, code.text);
      if (rows.length !== 1 || rows[0].length !== 1) {
        return [`returns ${rows.length} rows, not one value`];
      }
      const [[value]] = rows;
      if (typeof value !== 'number') return [`returns ${String(value)}, not a number`];
      if (correct === null || matches(value).join() !== String(question.correctIndex)) {
        problems.push(`the query returns ${value}, but the options say otherwise`);
      }
      return problems;
    }
    case 'sql_rows': {
      const count = runSql(tables, code.text).length;
      if (correct === null || matches(count).join() !== String(question.correctIndex)) {
        problems.push(`the query returns ${count} rows, but the options say otherwise`);
      }
      return problems;
    }
    case 'sql_blank': {
      const expected = runSql(tables, check.reference);
      question.options.forEach((option, index) => {
        const result = tryRunSql(tables, fillBlank(code.text, option));
        const same = !(result instanceof Error) && sameRows(result, expected, check.ordered);
        if (index === question.correctIndex && !same) {
          problems.push(
            `the right option "${option}" ${result instanceof Error ? `fails: ${result.message}` : 'does not match the reference'}`,
          );
        }
        if (index !== question.correctIndex && same) {
          problems.push(`the wrong option "${option}" gives the same rows as the reference`);
        }
      });
      return problems;
    }
    default:
      return [];
  }
}

function checkOrder(question: OrderStepsQuestion): string[] {
  const tables = question.tables ?? [];
  const result = tryRunSql(tables, question.steps.join('\n'));
  if (result instanceof Error) return [`the steps in order fail: ${result.message}`];
  const expected = runSql(tables, question.reference ?? '');
  return sameRows(result, expected) ? [] : ['the steps in order do not match the reference'];
}

describe('SQL in the content', () => {
  it('has questions to check', () => {
    expect(sqlChoices.length + sqlOrders.length).toBeGreaterThan(0);
  });

  it.each(sqlChoices.map(({ path, question }) => [`${path}/${question.id}`, question] as const))(
    '%s: the right option is right, and only that one',
    (_label, question) => {
      expect(checkChoice(question as MultipleChoiceQuestion)).toEqual([]);
    },
  );

  it.each(sqlOrders.map(({ path, question }) => [`${path}/${question.id}`, question] as const))(
    '%s: the steps in order make a query that works',
    (_label, question) => {
      expect(checkOrder(question as OrderStepsQuestion)).toEqual([]);
    },
  );
});
