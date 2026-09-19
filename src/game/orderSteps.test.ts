import { describe, expect, it } from 'vitest';
import type { OrderStepsQuestion } from '../content/types';
import { gradeAnswer, isAnswerReady } from './grading';
import { hashText, stepOfferOrder } from './orderSteps';

const question: OrderStepsQuestion = {
  id: 'order-test',
  type: 'order_steps',
  prompt: 'Put them in order.',
  steps: ['First', 'Second', 'Third', 'Fourth'],
  explanation: 'First things first. The common mistake is starting in the middle.',
};

describe('stepOfferOrder', () => {
  it('shuffles the same way every time for the same question', () => {
    expect(stepOfferOrder('order-test', 5)).toEqual(stepOfferOrder('order-test', 5));
    expect(hashText('order-test')).toBe(hashText('order-test'));
    expect(hashText('order-test')).not.toBe(hashText('order-tesu'));
  });

  it('offers every step once, never already in the right order', () => {
    for (let count = 2; count <= 7; count += 1) {
      for (const id of ['a', 'b', 'c', 'order-test', 'u4-lie', 'plan-steps']) {
        const order = stepOfferOrder(id, count);
        expect([...order].sort((x, y) => x - y)).toEqual(
          Array.from({ length: count }, (_, i) => i),
        );
        expect(order).not.toEqual(Array.from({ length: count }, (_, i) => i));
      }
    }
    expect(stepOfferOrder('one', 1)).toEqual([0]);
  });
});

describe('grading the order', () => {
  it('is ready only once every step is placed', () => {
    expect(isAnswerReady({ type: 'order_steps', order: [0, 1], total: 4 })).toBe(false);
    expect(isAnswerReady({ type: 'order_steps', order: [0, 1, 2, 3], total: 4 })).toBe(true);
  });

  it('is right only in exactly the authored order', () => {
    expect(gradeAnswer(question, { type: 'order_steps', order: [0, 1, 2, 3], total: 4 })).toBe(
      true,
    );
    expect(gradeAnswer(question, { type: 'order_steps', order: [1, 0, 2, 3], total: 4 })).toBe(
      false,
    );
    expect(gradeAnswer(question, { type: 'order_steps', order: [0, 1, 2], total: 4 })).toBe(false);
  });
});
