/**
 * Validation for the challenge question types: inbox triage, spot the lie, courtroom and build
 * the metric. Like the other rules, anything that can be worked out from the content (such as
 * whether a chart really has the flaw the question names) is recomputed, not trusted.
 */
import { chartTricks, exaggeration } from '../game/charts';
import type {
  BuildMetricQuestion,
  ChartAxis,
  ClaimChart,
  CourtroomQuestion,
  InboxTriageQuestion,
  SpotTheLieQuestion,
  StoryMessage,
} from './types';
import { countWords, issue, validateTable, type ValidationIssue } from './validationCore';

export const CHALLENGE_LIMITS = {
  messageWords: 80,
  triageCandidates: 3,
  courtroomSuspects: { min: 2, max: 3 },
  metricCards: { min: 3, max: 6 },
  chartLabels: { min: 2, max: 16 },
  chartSeries: { min: 1, max: 2 },
  options: { min: 2, max: 5 },
} as const;

function blank(text: string | undefined): boolean {
  return !text || !text.trim();
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (seen.has(key)) repeated.add(value);
    seen.add(key);
  }
  return [...repeated];
}

function indexInRange(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

export function validateStoryMessage(message: StoryMessage, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (blank(message.from)) issues.push(issue(path, 'needs a sender'));
  if (blank(message.role)) issues.push(issue(path, 'needs the sender’s role'));
  if (blank(message.text)) issues.push(issue(path, 'text is empty'));
  if (message.channel === 'email' && blank(message.subject)) {
    issues.push(issue(path, 'an email needs a subject'));
  }
  if (message.channel === 'chat' && message.subject) {
    issues.push(issue(path, 'a chat message has no subject; use email instead'));
  }
  const words = countWords(message.text);
  if (words > CHALLENGE_LIMITS.messageWords) {
    issues.push(
      issue(
        `${path}.text`,
        `has ${words} words; keep it to ${CHALLENGE_LIMITS.messageWords} or fewer`,
      ),
    );
  }
  return issues;
}

export function validateInboxTriage(question: InboxTriageQuestion, path: string) {
  const issues = validateStoryMessage(question.message, `${path}.message`);
  if (blank(question.data.caption)) issues.push(issue(`${path}.data`, 'caption is empty'));
  if (question.data.columns.length === 0) issues.push(issue(`${path}.data`, 'lists no columns'));
  if (duplicates(question.data.columns).length > 0) {
    issues.push(issue(`${path}.data`, 'lists a column twice'));
  }

  const { candidates, answerableIndex } = question;
  if (candidates.length !== CHALLENGE_LIMITS.triageCandidates) {
    issues.push(
      issue(
        `${path}.candidates`,
        `has ${candidates.length}; needs exactly ${CHALLENGE_LIMITS.triageCandidates}`,
      ),
    );
  }
  if (duplicates(candidates.map((candidate) => candidate.question)).length > 0) {
    issues.push(issue(`${path}.candidates`, 'must all be different'));
  }
  candidates.forEach((candidate, index) => {
    const candidatePath = `${path}.candidates[${index}]`;
    if (blank(candidate.question)) issues.push(issue(candidatePath, 'question is empty'));
    if (blank(candidate.note)) issues.push(issue(candidatePath, 'needs a note saying why'));
    if (index !== answerableIndex && !candidate.flaw) {
      issues.push(issue(candidatePath, 'is not the answerable one, so name its flaw'));
    }
  });
  if (!indexInRange(answerableIndex, candidates.length)) {
    issues.push(issue(`${path}.answerableIndex`, 'is outside the candidates'));
  } else if (candidates[answerableIndex].flaw) {
    issues.push(issue(`${path}.answerableIndex`, 'points at a candidate that has a flaw'));
  }
  return issues;
}

function validateAxis(axis: ChartAxis, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (blank(axis.label)) issues.push(issue(path, 'label is empty'));
  if (!(Number.isFinite(axis.min) && Number.isFinite(axis.max) && axis.min < axis.max)) {
    issues.push(issue(path, 'min must be a number below max'));
  }
  return issues;
}

export function validateChart(chart: ClaimChart, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (blank(chart.title)) issues.push(issue(path, 'title is empty'));
  const labelCount = chart.labels.length;
  const { chartLabels, chartSeries } = CHALLENGE_LIMITS;
  if (labelCount < chartLabels.min || labelCount > chartLabels.max) {
    issues.push(issue(`${path}.labels`, `needs ${chartLabels.min}–${chartLabels.max} labels`));
  }
  if (chart.labels.some((label) => blank(label))) {
    issues.push(issue(`${path}.labels`, 'has an empty label'));
  }
  if (chart.series.length < chartSeries.min || chart.series.length > chartSeries.max) {
    issues.push(issue(`${path}.series`, `needs ${chartSeries.min}–${chartSeries.max} series`));
  }
  if (duplicates(chart.series.map((series) => series.name)).length > 0) {
    issues.push(issue(`${path}.series`, 'names must be different'));
  }
  issues.push(...validateAxis(chart.axis, `${path}.axis`));
  const usesRight = chart.series.some((series) => series.axis === 'right');
  if (usesRight && !chart.rightAxis) {
    issues.push(issue(path, 'a series uses the right axis, so add rightAxis'));
  }
  if (!usesRight && chart.rightAxis) {
    issues.push(issue(path, 'has a rightAxis that no series uses'));
  }
  if (chart.rightAxis) issues.push(...validateAxis(chart.rightAxis, `${path}.rightAxis`));

  let from = 0;
  let to = labelCount - 1;
  if (chart.window) {
    ({ from, to } = chart.window);
    const valid = Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to < labelCount;
    if (!valid || to - from < 1) {
      issues.push(issue(`${path}.window`, 'must span at least two points inside the labels'));
      return issues;
    }
    if (from === 0 && to === labelCount - 1) {
      issues.push(issue(`${path}.window`, 'shows every point, so it hides nothing'));
    }
  }

  chart.series.forEach((series, index) => {
    const seriesPath = `${path}.series[${index}]`;
    if (series.values.length !== labelCount) {
      issues.push(issue(seriesPath, `has ${series.values.length} values for ${labelCount} labels`));
      return;
    }
    if (series.values.some((value) => !Number.isFinite(value))) {
      issues.push(issue(seriesPath, 'values must all be finite numbers'));
      return;
    }
    const axis = series.axis === 'right' ? chart.rightAxis : chart.axis;
    if (!axis) return;
    const shown = series.values.slice(from, to + 1);
    if (shown.some((value) => value < axis.min || value > axis.max)) {
      issues.push(
        issue(seriesPath, 'has values outside its axis, which would be drawn off the chart'),
      );
    }
  });
  return issues;
}

function validateOptions(
  options: readonly string[],
  correctIndex: number,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { min, max } = CHALLENGE_LIMITS.options;
  if (options.length < min || options.length > max) {
    issues.push(issue(`${path}.options`, `needs ${min}–${max} options`));
  }
  if (options.some((option) => blank(option))) {
    issues.push(issue(`${path}.options`, 'has an empty option'));
  }
  if (duplicates(options).length > 0)
    issues.push(issue(`${path}.options`, 'must all be different'));
  if (!indexInRange(correctIndex, options.length)) {
    issues.push(issue(`${path}.correctIndex`, 'is outside the options'));
  }
  return issues;
}

export function validateSpotTheLie(question: SpotTheLieQuestion, path: string) {
  const issues: ValidationIssue[] = [];
  if (blank(question.claim.by) || blank(question.claim.text)) {
    issues.push(issue(`${path}.claim`, 'needs who is claiming and what'));
  }
  const chartIssues = validateChart(question.chart, `${path}.chart`);
  issues.push(...chartIssues, ...validateOptions(question.options, question.correctIndex, path));
  if (chartIssues.length > 0) return issues;

  const found = chartTricks(question.chart);
  if (!found.includes(question.trick)) {
    const detail =
      question.trick === 'truncated_axis'
        ? ` (bars exaggerate differences ${exaggeration(question.chart).toFixed(2)}×; needs 1.5× or more)`
        : '';
    issues.push(issue(`${path}.trick`, `the chart data does not show ${question.trick}${detail}`));
  }
  const others = found.filter((trick) => trick !== question.trick);
  if (others.length > 0) {
    issues.push(issue(`${path}.chart`, `also shows ${others.join(', ')}; use one trick per chart`));
  }
  return issues;
}

export function validateCourtroom(question: CourtroomQuestion, path: string) {
  const issues: ValidationIssue[] = [];
  if (blank(question.evidence)) issues.push(issue(`${path}.evidence`, 'is empty'));
  const [first, second] = question.witnesses;
  if (question.witnesses.length !== 2 || !first || !second) {
    issues.push(issue(`${path}.witnesses`, 'needs exactly two witnesses'));
  } else {
    if (blank(first.name) || blank(second.name) || blank(first.claim) || blank(second.claim)) {
      issues.push(issue(`${path}.witnesses`, 'each witness needs a name and a claim'));
    }
    if (first.name.trim() === second.name.trim()) {
      issues.push(issue(`${path}.witnesses`, 'names must be different'));
    }
    if (first.claim.trim() === second.claim.trim()) {
      issues.push(issue(`${path}.witnesses`, 'should argue different causes'));
    }
  }
  if (question.table) issues.push(...validateTable(question.table, `${path}.table`));

  const { suspects, confounderIndex } = question;
  const { min, max } = CHALLENGE_LIMITS.courtroomSuspects;
  if (suspects.length < min || suspects.length > max) {
    issues.push(issue(`${path}.suspects`, `needs ${min}–${max} suspects`));
  }
  if (duplicates(suspects.map((suspect) => suspect.text)).length > 0) {
    issues.push(issue(`${path}.suspects`, 'must all be different'));
  }
  suspects.forEach((suspect, index) => {
    if (blank(suspect.text) || blank(suspect.note)) {
      issues.push(issue(`${path}.suspects[${index}]`, 'needs text and a note'));
    }
  });
  if (!indexInRange(confounderIndex, suspects.length)) {
    issues.push(issue(`${path}.confounderIndex`, 'is outside the suspects'));
  }
  return issues;
}

export function validateBuildMetric(question: BuildMetricQuestion, path: string) {
  const issues: ValidationIssue[] = [];
  if (blank(question.goal)) issues.push(issue(`${path}.goal`, 'is empty'));
  if (blank(question.metricName)) issues.push(issue(`${path}.metricName`, 'is empty'));

  const { cards, numeratorIndex, denominatorIndex } = question;
  const { min, max } = CHALLENGE_LIMITS.metricCards;
  if (cards.length < min || cards.length > max) {
    issues.push(issue(`${path}.cards`, `needs ${min}–${max} cards, so some are distractors`));
  }
  if (cards.some((card) => blank(card.label))) {
    issues.push(issue(`${path}.cards`, 'has an empty label'));
  }
  if (duplicates(cards.map((card) => card.label)).length > 0) {
    issues.push(issue(`${path}.cards`, 'labels must all be different'));
  }
  if (!indexInRange(numeratorIndex, cards.length)) {
    issues.push(issue(`${path}.numeratorIndex`, 'is outside the cards'));
  }
  if (!indexInRange(denominatorIndex, cards.length)) {
    issues.push(issue(`${path}.denominatorIndex`, 'is outside the cards'));
  }
  if (numeratorIndex === denominatorIndex) {
    issues.push(issue(path, 'the numerator and denominator must be different cards'));
  }

  const valued = cards.filter((card) => card.value !== undefined);
  if (valued.length > 0 && valued.length !== cards.length) {
    issues.push(issue(`${path}.cards`, 'give every card a value, or none'));
  } else if (valued.length > 0 && issues.length === 0) {
    if (cards.some((card) => !Number.isFinite(card.value))) {
      issues.push(issue(`${path}.cards`, 'values must be finite numbers'));
    }
    const top = cards[numeratorIndex].value as number;
    const bottom = cards[denominatorIndex].value as number;
    if (!(bottom > 0))
      issues.push(issue(`${path}.cards`, 'the denominator’s value must be above 0'));
    if (question.percent && top > bottom) {
      issues.push(
        issue(`${path}.cards`, 'a percentage share cannot have a bigger top than bottom'),
      );
    }
  }
  return issues;
}
