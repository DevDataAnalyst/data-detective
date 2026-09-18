import { describe, expect, it } from 'vitest';
import { fillTemplate, formatNumber, formatValue, templateTokens } from './template';

describe('templates', () => {
  const stipends = { label: 'Stipend', prefix: '₹', values: [8000, 10000, 12000, 10000, 15000] };

  it('fills statistics from the dataset with Indian digit grouping', () => {
    expect(fillTemplate('Total ₹{sum}, mean ₹{mean}', stipends)).toBe(
      'Total ₹55,000, mean ₹11,000',
    );
    expect(formatNumber(150000)).toBe('1,50,000');
  });

  it('never writes zero with a minus sign', () => {
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-0.001)).toBe('0');
    expect(formatNumber(-0.5)).toBe('-0.5');
  });

  it('rounds to the requested decimals', () => {
    const commute = { label: 'Commute', values: [22, 25, 27, 30, 31, 34, 150] };
    expect(fillTemplate('about {mean:1}', commute)).toBe('about 45.6');
    expect(fillTemplate('about {mean}', commute)).toBe('about 45.57');
  });

  it('leaves unknown placeholders and text without a dataset untouched', () => {
    expect(fillTemplate('{nonsense}', stipends)).toBe('{nonsense}');
    expect(fillTemplate('Mean is {mean}')).toBe('Mean is {mean}');
  });

  it('lists tokens with their decimals', () => {
    expect(templateTokens('{q1} and {std_dev:1}')).toEqual([
      { raw: '{q1}', name: 'q1', decimals: undefined },
      { raw: '{std_dev:1}', name: 'std_dev', decimals: 1 },
    ]);
  });

  it('formats values with a prefix or a suffix', () => {
    expect(formatValue({ prefix: '₹' }, 12000)).toBe('₹12,000');
    expect(formatValue({ suffix: 'min' }, 32.5)).toBe('32.5 min');
  });
});
