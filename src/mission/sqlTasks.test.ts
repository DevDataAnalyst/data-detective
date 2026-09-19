import { describe, expect, it } from 'vitest';
import type { CodeTask } from '../content/types';
import { codeNoun, codeToRun } from './sqlTasks';

const task = (language?: CodeTask['language']): CodeTask => ({
  kind: 'code',
  id: 'revenue',
  title: 'Revenue by city',
  instructions: 'Add it up.',
  language,
  starterCode: '',
  creates: ['city_revenue'],
  hints: { nudge: 'n', method: 'm', example: '____' },
});

describe('codeToRun', () => {
  it('runs Python as it is', () => {
    expect(codeToRun(task(), 'print(1)')).toBe('print(1)');
    expect(codeNoun(task())).toBe('Python code');
  });

  it('runs SQL through sql(), saved as the task’s variable and shown', () => {
    const query =
      'SELECT city, SUM(order_value) AS revenue\nFROM orders\nWHERE status = "x" -- é ₹';
    const code = codeToRun(task('sql'), query);
    expect(code).toBe(
      'city_revenue = sql("SELECT city, SUM(order_value) AS revenue\\nFROM orders\\nWHERE status = \\"x\\" -- é ₹")\ncity_revenue',
    );
    expect(codeNoun(task('sql'))).toBe('SQL query');
  });
});
