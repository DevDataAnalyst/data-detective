import { computeStatistic, isStatistic } from '../game/stats';
import type { NumberDataset, Question } from './types';

const TOKEN_PATTERN = /\{([a-z_0-9]+)(?::(\d))?\}/g;

export interface TemplateToken {
  raw: string;
  name: string;
  decimals?: number;
}

export function templateTokens(text: string): TemplateToken[] {
  return [...text.matchAll(TOKEN_PATTERN)].map((match) => ({
    raw: match[0],
    name: match[1],
    decimals: match[2] === undefined ? undefined : Number(match[2]),
  }));
}

/** Indian digit grouping (1,00,000) and at most `maxDecimals` decimal places. */
export function formatNumber(value: number, maxDecimals = 2): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: maxDecimals });
}

export function formatValue(dataset: Pick<NumberDataset, 'prefix' | 'suffix'>, value: number) {
  const number = formatNumber(value);
  return `${dataset.prefix ?? ''}${number}${dataset.suffix ? ` ${dataset.suffix}` : ''}`;
}

/** The dataset label with its unit, e.g. "Delivery time (min)" or "Monthly stipend (₹)". */
export function captionWithUnit(dataset: Pick<NumberDataset, 'label' | 'prefix' | 'suffix'>) {
  const unit = dataset.suffix ?? dataset.prefix;
  return unit ? `${dataset.label} (${unit})` : dataset.label;
}

/** Replaces `{statistic}` and `{statistic:decimals}` placeholders with values from the dataset. */
export function fillTemplate(text: string, dataset?: NumberDataset): string {
  if (!dataset) return text;
  return text.replace(TOKEN_PATTERN, (raw, name: string, decimals: string | undefined) => {
    if (!isStatistic(name)) return raw;
    const value = computeStatistic(name, dataset.values);
    return formatNumber(value, decimals === undefined ? 2 : Number(decimals));
  });
}

/** The dataset a question's placeholders are filled from, if it has one. */
export function questionDataset(question: Question): NumberDataset | undefined {
  return 'dataset' in question ? question.dataset : undefined;
}

/** Fills the placeholders in one of a question's templated fields, such as its prompt. */
export function fillQuestionText(question: Question, text: string): string {
  return fillTemplate(text, questionDataset(question));
}
