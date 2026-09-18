import { computeStatistic, isStatistic, STATISTICS } from '../game/stats';
import { evaluateFormula } from './formula';
import type { NumberDataset, Question } from './types';

/** `{name}`, `{name:1}` (one decimal place) or `{name:%}` (a fraction shown as a percentage). */
const TOKEN_PATTERN = /\{([a-z_0-9]+)(?::(\d|%))?\}/g;

export interface TemplateToken {
  raw: string;
  name: string;
  decimals?: number;
  /** Show the value, a fraction, as a percentage. */
  percent?: true;
}

export function templateTokens(text: string): TemplateToken[] {
  return [...text.matchAll(TOKEN_PATTERN)].map((match) => ({
    raw: match[0],
    name: match[1],
    decimals: match[2] === undefined || match[2] === '%' ? undefined : Number(match[2]),
    percent: match[2] === '%' ? true : undefined,
  }));
}

/** Indian digit grouping (1,00,000) and at most `maxDecimals` decimal places. */
export function formatNumber(value: number, maxDecimals = 2): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: maxDecimals });
}

/** A fraction as a percentage with at most one decimal place, e.g. 0.296 → "29.6%". */
export function formatPercent(fraction: number): string {
  return `${formatNumber(fraction * 100, 1)}%`;
}

export function formatValue(dataset: Pick<NumberDataset, 'prefix' | 'suffix'>, value: number) {
  const number = formatNumber(value);
  const suffix = dataset.suffix ? (dataset.suffix === '%' ? '%' : ` ${dataset.suffix}`) : '';
  return `${dataset.prefix ?? ''}${number}${suffix}`;
}

/** The dataset label with its unit, e.g. "Delivery time (min)" or "Monthly stipend (₹)". */
export function captionWithUnit(dataset: Pick<NumberDataset, 'label' | 'prefix' | 'suffix'>) {
  const unit = dataset.suffix ?? dataset.prefix;
  return unit ? `${dataset.label} (${unit})` : dataset.label;
}

/** Every statistic of a dataset that can be computed (a dataset may have no single mode). */
export function datasetScope(dataset: NumberDataset | undefined): Record<string, number> {
  const scope: Record<string, number> = {};
  if (!dataset) return scope;
  for (const statistic of STATISTICS) {
    try {
      scope[statistic] = computeStatistic(statistic, dataset.values);
    } catch {
      // Not defined for this data, such as the mode of values that all differ.
    }
  }
  return scope;
}

/** Replaces placeholders with numbers from `scope`. Unknown placeholders are left as they are. */
export function fillScoped(text: string, scope: Readonly<Record<string, number>>): string {
  return text.replace(TOKEN_PATTERN, (raw, name: string, format: string | undefined) => {
    if (!(name in scope)) return raw;
    const value = scope[name];
    if (format === '%') return formatPercent(value);
    return formatNumber(value, format === undefined ? 2 : Number(format));
  });
}

/** Replaces `{statistic}` and `{statistic:decimals}` placeholders with values from the dataset. */
export function fillTemplate(text: string, dataset?: NumberDataset): string {
  if (!dataset) return text;
  const scope = datasetScope(dataset);
  return text.replace(TOKEN_PATTERN, (raw, name: string) =>
    isStatistic(name) ? fillScoped(raw, scope) : raw,
  );
}

/** The dataset a question's placeholders are filled from, if it has one. */
export function questionDataset(question: Question): NumberDataset | undefined {
  return 'dataset' in question ? question.dataset : undefined;
}

/**
 * The numbers a question's text and checks can use: its dataset's statistics, its `givens`, then
 * its `derived` values, each worked out from the ones before. Throws if a derived formula fails;
 * validation makes sure none do.
 */
export function questionScope(question: Question): Record<string, number> {
  const scope = { ...datasetScope(questionDataset(question)), ...question.givens };
  for (const [name, formula] of Object.entries(question.derived ?? {})) {
    scope[name] = evaluateFormula(formula, scope);
  }
  return scope;
}

/** Fills the placeholders in one of a question's templated fields, such as its prompt. */
export function fillQuestionText(question: Question, text: string): string {
  try {
    return fillScoped(text, questionScope(question));
  } catch {
    return fillTemplate(text, questionDataset(question));
  }
}
