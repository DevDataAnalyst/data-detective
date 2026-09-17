import { computeStatistic, isStatistic } from '../game/stats';
import type { NumberDataset } from './types';

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

/** Replaces `{statistic}` and `{statistic:decimals}` placeholders with values from the dataset. */
export function fillTemplate(text: string, dataset?: NumberDataset): string {
  if (!dataset) return text;
  return text.replace(TOKEN_PATTERN, (raw, name: string, decimals: string | undefined) => {
    if (!isStatistic(name)) return raw;
    const value = computeStatistic(name, dataset.values);
    return formatNumber(value, decimals === undefined ? 2 : Number(decimals));
  });
}
