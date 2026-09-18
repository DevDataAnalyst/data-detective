import {
  computeStatistic,
  isStatistic,
  mean,
  median,
  modes,
  outlierIndices,
  roundTo,
  skewness,
  type QuartileMethod,
  type Statistic,
  type StatisticOptions,
} from '../game/stats';
import { questionDataset, templateTokens } from './template';
import {
  validateBuildMetric,
  validateCourtroom,
  validateInboxTriage,
  validateSpotTheLie,
} from './validateChallenges';
import {
  countWords,
  formatIssues,
  issue,
  validateTable,
  type ValidationIssue,
} from './validationCore';
import type {
  Checkpoint,
  Lesson,
  Mission,
  MultipleChoiceQuestion,
  NumberDataset,
  NumericEstimateQuestion,
  PredictRevealQuestion,
  Question,
  RevealVisual,
  TapOutlierQuestion,
  Unit,
} from './types';

export { countWords, formatIssues, type ValidationIssue };

/** Facts about a mission's dataset that summary text may quote, e.g. `{outliers}`. */
export const MISSION_FACTS = [
  'orders',
  'missingDeliveryTimes',
  'cities',
  'outliers',
  'misleadingCity',
  'slowestCity',
] as const;

export const CONTENT_LIMITS = {
  introWords: 80,
  explanationWords: 60,
  questionsPerLesson: { min: 6, max: 8 },
  lessonMinutes: { min: 3, max: 5 },
  questionTypesPerLesson: 3,
  checkpointQuestions: 10,
  optionsPerQuestion: { min: 2, max: 5 },
  missionBriefWords: 120,
} as const;

/** Stored answers may be rounded to two decimal places. */
const STORED_PRECISION = 0.005 + 1e-9;
/** Skewness beyond ±0.5 counts as skewed. */
const SKEW_THRESHOLD = 0.5;
/** An "extreme" dataset must beat the runner-up by at least 10%. */
const EXTREME_MARGIN = 0.1;

const QUARTILE_STATISTICS: ReadonlySet<Statistic> = new Set([
  'q1',
  'q3',
  'iqr',
  'lower_fence',
  'upper_fence',
]);

const REVEAL_STATISTICS: Record<RevealVisual, readonly Statistic[]> = {
  marker: ['mean', 'median', 'mode'],
  range_bracket: ['range'],
  iqr_box: ['iqr'],
  sd_band: ['std_dev'],
};

/** An option whose answer is a number, e.g. "₹11,000" or "4.5 GB" (not "Half scored above 62"). */
export function isNumericOption(text: string): boolean {
  return /^\s*₹?\s*-?\d/.test(text);
}

/** The first number in an option label, e.g. "₹11,000" → 11000, "It rises to 40 minutes" → 40. */
export function parseLeadingNumber(text: string): number | null {
  const match = text.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function show(value: number): string {
  return String(roundTo(value, 4));
}

function tryCompute(
  statistic: Statistic,
  values: readonly number[],
  path: string,
  issues: ValidationIssue[],
  options?: StatisticOptions,
): number | null {
  try {
    return computeStatistic(statistic, values, options);
  } catch (error) {
    issues.push(issue(path, `cannot compute ${statistic}: ${(error as Error).message}`));
    return null;
  }
}

/**
 * Values a learner could reach with another common method: other quartile conventions, or the
 * sample standard deviation (pandas' default) instead of the population one.
 */
function alternativeValues(statistic: Statistic, values: readonly number[]): number[] {
  if (QUARTILE_STATISTICS.has(statistic)) {
    const methods: QuartileMethod[] = ['exclusive', 'inclusive'];
    return methods.map((quartileMethod) => computeStatistic(statistic, values, { quartileMethod }));
  }
  if (statistic === 'std_dev') return [computeStatistic(statistic, values, { sampleStdDev: true })];
  return [];
}

function validateDataset(dataset: NumberDataset, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!dataset.label.trim()) issues.push(issue(path, 'label is empty'));
  if (dataset.values.length < 2) issues.push(issue(path, 'needs at least 2 values'));
  if (dataset.values.some((value) => !Number.isFinite(value))) {
    issues.push(issue(path, 'values must all be finite numbers'));
  }
  return issues;
}

function validateTemplates(question: Question, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const field of ['prompt', 'explanation'] as const) {
    for (const token of templateTokens(question[field])) {
      const dataset = questionDataset(question);
      if (!dataset) {
        issues.push(issue(`${path}.${field}`, `${token.raw} needs the question to have a dataset`));
        continue;
      }
      if (!isStatistic(token.name)) {
        issues.push(issue(`${path}.${field}`, `${token.raw} is not a known statistic`));
        continue;
      }
      tryCompute(token.name, dataset.values, `${path}.${field}`, issues);
    }
  }
  return issues;
}

function validateBase(question: Question, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!question.id.trim()) issues.push(issue(path, 'id is empty'));
  if (!question.prompt.trim()) issues.push(issue(path, 'prompt is empty'));
  if (!question.explanation.trim()) issues.push(issue(path, 'explanation is empty'));
  const words = countWords(question.explanation);
  if (words > CONTENT_LIMITS.explanationWords) {
    issues.push(
      issue(
        `${path}.explanation`,
        `has ${words} words; keep it to ${CONTENT_LIMITS.explanationWords} or fewer`,
      ),
    );
  }
  issues.push(...validateTemplates(question, path));
  return issues;
}

/** Checks the correct option equals `expected` and no other option does. */
function numericOptionIssues(
  question: MultipleChoiceQuestion,
  expected: number,
  alternatives: readonly number[],
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const correct = parseLeadingNumber(question.options[question.correctIndex]);
  if (correct === null) {
    return [issue(path, 'the correct option has no number to compare')];
  }
  if (Math.abs(correct - expected) > STORED_PRECISION) {
    issues.push(
      issue(path, `the correct option says ${correct} but the data gives ${show(expected)}`),
    );
  }
  for (const alternative of alternatives) {
    if (Math.abs(alternative - expected) > STORED_PRECISION) {
      issues.push(
        issue(
          path,
          `another common method gives ${show(alternative)} instead of ${show(expected)}; pick data where methods agree`,
        ),
      );
    }
  }
  question.options.forEach((option, index) => {
    const value = parseLeadingNumber(option);
    if (index !== question.correctIndex && value !== null) {
      if (Math.abs(value - expected) <= STORED_PRECISION) {
        issues.push(issue(`${path}`, `option ${index} ("${option}") is also correct`));
      }
    }
  });
  return issues;
}

function validateCheck(question: MultipleChoiceQuestion, path: string): ValidationIssue[] {
  const check = question.check;
  if (!check) return [];
  const issues: ValidationIssue[] = [];
  const optionInRange = (index: number | undefined) =>
    index === undefined ||
    (Number.isInteger(index) && index >= 0 && index < question.options.length);

  switch (check.kind) {
    case 'statistic': {
      if (!question.dataset) return [issue(path, 'a statistic check needs a dataset')];
      const expected = tryCompute(check.statistic, question.dataset.values, path, issues);
      if (expected === null) return issues;
      const alternatives = alternativeValues(check.statistic, question.dataset.values);
      return [...issues, ...numericOptionIssues(question, expected, alternatives, path)];
    }
    case 'table_rows':
    case 'table_columns': {
      if (!question.table) return [issue(path, `a ${check.kind} check needs a table`)];
      const expected =
        check.kind === 'table_rows' ? question.table.rows.length : question.table.columns.length;
      return numericOptionIssues(question, expected, [], path);
    }
    case 'compare': {
      if (!question.dataset) return [issue(path, 'a compare check needs a dataset')];
      const { greater, less, equal } = check.optionIndex;
      if (![greater, less, equal].every(optionInRange)) {
        return [issue(path, 'optionIndex points outside the options')];
      }
      const left = tryCompute(check.left, question.dataset.values, path, issues);
      const right = tryCompute(check.right, question.dataset.values, path, issues);
      if (left === null || right === null) return issues;
      const difference = left - right;
      const expectedIndex =
        Math.abs(difference) <= STORED_PRECISION ? equal : difference > 0 ? greater : less;
      if (expectedIndex === undefined) {
        issues.push(
          issue(path, `${check.left} and ${check.right} are equal but no option says so`),
        );
      } else if (expectedIndex !== question.correctIndex) {
        issues.push(
          issue(
            path,
            `${check.left} is ${show(left)} and ${check.right} is ${show(right)}, so the correct option should be ${expectedIndex}`,
          ),
        );
      }
      return issues;
    }
    case 'extreme': {
      const datasets = question.datasets;
      if (!datasets || datasets.length !== question.options.length) {
        return [issue(path, 'an extreme check needs one dataset per option')];
      }
      const scores = datasets.map((dataset, index) =>
        tryCompute(check.statistic, dataset.values, `${path}.datasets[${index}]`, issues),
      );
      if (scores.some((score) => score === null)) return issues;
      const ranked = (scores as number[])
        .map((score, index) => ({ score, index }))
        .sort((a, b) => (check.which === 'largest' ? b.score - a.score : a.score - b.score));
      const [best, runnerUp] = ranked;
      const margin =
        Math.abs(best.score - runnerUp.score) / Math.max(Math.abs(runnerUp.score), 1e-9);
      if (margin < EXTREME_MARGIN) {
        issues.push(issue(path, `the ${check.which} ${check.statistic} is not clearly separated`));
      }
      if (best.index !== question.correctIndex) {
        issues.push(
          issue(
            path,
            `option ${best.index} has the ${check.which} ${check.statistic}, not option ${question.correctIndex}`,
          ),
        );
      }
      return issues;
    }
    case 'skew': {
      if (!question.dataset) return [issue(path, 'a skew check needs a dataset')];
      const { right, left, symmetric } = check.optionIndex;
      if (![right, left, symmetric].every(optionInRange)) {
        return [issue(path, 'optionIndex points outside the options')];
      }
      const values = question.dataset.values;
      const coefficient = skewness(values);
      const shape =
        coefficient > SKEW_THRESHOLD
          ? 'right'
          : coefficient < -SKEW_THRESHOLD
            ? 'left'
            : 'symmetric';
      const meanMinusMedian = mean(values) - median(values);
      if (shape === 'right' && meanMinusMedian <= 0) {
        issues.push(issue(path, 'looks right-skewed but the mean is not above the median'));
      }
      if (shape === 'left' && meanMinusMedian >= 0) {
        issues.push(issue(path, 'looks left-skewed but the mean is not below the median'));
      }
      const expectedIndex = check.optionIndex[shape];
      if (expectedIndex !== question.correctIndex) {
        issues.push(
          issue(
            path,
            `skewness is ${show(coefficient)} (${shape}), so the correct option should be ${expectedIndex}`,
          ),
        );
      }
      return issues;
    }
    case 'no_mode': {
      if (!question.dataset) return [issue(path, 'a no_mode check needs a dataset')];
      const found = modes(question.dataset.values);
      if (found.length > 0) issues.push(issue(path, `the data has a mode: ${found.join(', ')}`));
      return issues;
    }
  }
}

function validateMultipleChoice(question: MultipleChoiceQuestion, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { min, max } = CONTENT_LIMITS.optionsPerQuestion;
  if (question.options.length < min || question.options.length > max) {
    issues.push(issue(`${path}.options`, `needs ${min}–${max} options`));
  }
  question.options.forEach((option, index) => {
    if (!option.trim()) issues.push(issue(`${path}.options[${index}]`, 'is empty'));
  });
  const distinct = new Set(question.options.map((option) => option.trim().toLowerCase()));
  if (distinct.size !== question.options.length) {
    issues.push(issue(`${path}.options`, 'must all be different'));
  }
  if (
    !Number.isInteger(question.correctIndex) ||
    question.correctIndex < 0 ||
    question.correctIndex >= question.options.length
  ) {
    issues.push(issue(`${path}.correctIndex`, 'is outside the options'));
    return issues;
  }
  if (question.dataset && question.datasets) {
    issues.push(issue(path, 'use either dataset or datasets, not both'));
  }
  if (question.dataset) issues.push(...validateDataset(question.dataset, `${path}.dataset`));
  question.datasets?.forEach((dataset, index) =>
    issues.push(...validateDataset(dataset, `${path}.datasets[${index}]`)),
  );
  if (question.table) issues.push(...validateTable(question.table, `${path}.table`));

  if (isNumericOption(question.options[question.correctIndex]) && !question.check) {
    issues.push(issue(path, 'the correct option is a number, so add a check that recomputes it'));
  }
  issues.push(...validateCheck(question, `${path}.check`));
  return issues;
}

function validateEstimateValue(
  question: NumericEstimateQuestion | PredictRevealQuestion,
  stated: number,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!(question.tolerance > 0) || !Number.isFinite(question.tolerance)) {
    issues.push(issue(`${path}.tolerance`, 'must be a positive number'));
  }
  const expected = tryCompute(question.statistic, question.dataset.values, path, issues);
  if (expected === null) return issues;
  if (Math.abs(stated - expected) > STORED_PRECISION) {
    issues.push(
      issue(
        path,
        `says ${stated} but the ${question.statistic} of the dataset is ${show(expected)}`,
      ),
    );
  }
  for (const alternative of alternativeValues(question.statistic, question.dataset.values)) {
    if (Math.abs(alternative - stated) > question.tolerance) {
      issues.push(
        issue(
          `${path}.tolerance`,
          `another common method gives ${show(alternative)}, which falls outside ±${question.tolerance}`,
        ),
      );
    }
  }
  return issues;
}

function validateNumericEstimate(question: NumericEstimateQuestion, path: string) {
  const issues = validateDataset(question.dataset, `${path}.dataset`);
  issues.push(...validateEstimateValue(question, question.correctValue, `${path}.correctValue`));
  if (question.correctValue !== 0 && question.tolerance >= Math.abs(question.correctValue)) {
    issues.push(issue(`${path}.tolerance`, 'is so wide that guessing 0 would pass'));
  }
  return issues;
}

function validatePredictReveal(question: PredictRevealQuestion, path: string) {
  const issues = validateDataset(question.dataset, `${path}.dataset`);
  const { min, max, step } = question.slider;
  if (!(min < max)) issues.push(issue(`${path}.slider`, 'min must be less than max'));
  if (!(step > 0)) {
    issues.push(issue(`${path}.slider`, 'step must be positive'));
  } else {
    const steps = (max - min) / step;
    if (Math.abs(steps - Math.round(steps)) > 1e-9) {
      issues.push(issue(`${path}.slider`, 'max − min must be a whole number of steps'));
    }
    if (steps < 10) issues.push(issue(`${path}.slider`, 'needs at least 10 steps'));
    if (step > 2 * question.tolerance) {
      issues.push(issue(`${path}.slider`, 'step is too coarse to land within the tolerance'));
    }
  }
  if (question.trueValue < min || question.trueValue > max) {
    issues.push(issue(`${path}.trueValue`, 'is outside the slider range'));
  }
  if (question.tolerance >= (max - min) / 4) {
    issues.push(issue(`${path}.tolerance`, 'is too wide for the slider range'));
  }
  issues.push(...validateEstimateValue(question, question.trueValue, `${path}.trueValue`));
  if (!question.reveal.description.trim()) {
    issues.push(issue(`${path}.reveal`, 'description is empty'));
  }
  if (!REVEAL_STATISTICS[question.reveal.visual].includes(question.statistic)) {
    issues.push(
      issue(
        `${path}.reveal`,
        `a ${question.reveal.visual} reveal does not suit ${question.statistic}`,
      ),
    );
  }
  return issues;
}

function validateTapOutlier(question: TapOutlierQuestion, path: string) {
  const issues = validateDataset(question.dataset, `${path}.dataset`);
  const { values } = question.dataset;
  const indices = question.outlierIndices;
  if (indices.length === 0) issues.push(issue(`${path}.outlierIndices`, 'is empty'));
  if (new Set(indices).size !== indices.length) {
    issues.push(issue(`${path}.outlierIndices`, 'contains duplicates'));
  }
  if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= values.length)) {
    issues.push(issue(`${path}.outlierIndices`, 'has an index outside the dataset'));
    return issues;
  }
  const stated = [...indices].sort((a, b) => a - b).join(',');
  const methods: QuartileMethod[] = ['linear', 'exclusive', 'inclusive'];
  for (const method of methods) {
    const expected = outlierIndices(values, method);
    if (expected.join(',') !== stated) {
      issues.push(
        issue(
          `${path}.outlierIndices`,
          `the 1.5 × IQR rule (${method} quartiles) flags [${expected.join(', ')}], not [${stated}]`,
        ),
      );
    }
  }
  return issues;
}

export function validateQuestion(question: Question, path: string): ValidationIssue[] {
  const issues = validateBase(question, path);
  switch (question.type) {
    case 'multiple_choice':
      return [...issues, ...validateMultipleChoice(question, path)];
    case 'numeric_estimate':
      return [...issues, ...validateNumericEstimate(question, path)];
    case 'predict_reveal':
      return [...issues, ...validatePredictReveal(question, path)];
    case 'tap_outlier':
      return [...issues, ...validateTapOutlier(question, path)];
    case 'inbox_triage':
      return [...issues, ...validateInboxTriage(question, path)];
    case 'spot_the_lie':
      return [...issues, ...validateSpotTheLie(question, path)];
    case 'courtroom':
      return [...issues, ...validateCourtroom(question, path)];
    case 'build_metric':
      return [...issues, ...validateBuildMetric(question, path)];
  }
}

export function validateLesson(lesson: Lesson, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!lesson.id.trim()) issues.push(issue(path, 'id is empty'));
  if (!lesson.title.trim()) issues.push(issue(path, 'title is empty'));
  const { lessonMinutes, questionsPerLesson, introWords, questionTypesPerLesson } = CONTENT_LIMITS;
  if (lesson.estimatedMinutes < lessonMinutes.min || lesson.estimatedMinutes > lessonMinutes.max) {
    issues.push(
      issue(`${path}.estimatedMinutes`, `should be ${lessonMinutes.min}–${lessonMinutes.max}`),
    );
  }
  const words = countWords(lesson.intro);
  if (words > introWords) {
    issues.push(issue(`${path}.intro`, `has ${words} words; the limit is ${introWords}`));
  }
  const count = lesson.questions.length;
  if (count < questionsPerLesson.min || count > questionsPerLesson.max) {
    issues.push(
      issue(
        `${path}.questions`,
        `has ${count} questions; needs ${questionsPerLesson.min}–${questionsPerLesson.max}`,
      ),
    );
  }
  const types = new Set(lesson.questions.map((question) => question.type));
  if (types.size < questionTypesPerLesson) {
    issues.push(
      issue(
        `${path}.questions`,
        `mixes ${types.size} question types; use ${questionTypesPerLesson}+`,
      ),
    );
  }
  lesson.questions.forEach((question, index) =>
    issues.push(...validateQuestion(question, `${path}.questions[${index}]`)),
  );
  return issues;
}

export function validateCheckpoint(
  checkpoint: Checkpoint,
  lessons: readonly Lesson[],
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (checkpoint.items.length !== CONTENT_LIMITS.checkpointQuestions) {
    issues.push(
      issue(
        `${path}.items`,
        `has ${checkpoint.items.length} questions; needs ${CONTENT_LIMITS.checkpointQuestions}`,
      ),
    );
  }
  if (!(checkpoint.passMark > 0 && checkpoint.passMark <= 1)) {
    issues.push(issue(`${path}.passMark`, 'must be a fraction between 0 and 1'));
  }
  if (!(checkpoint.retakeDelayMinutes >= 0)) {
    issues.push(issue(`${path}.retakeDelayMinutes`, 'must be zero or more'));
  }
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  checkpoint.items.forEach((item, index) => {
    const itemPath = `${path}.items[${index}]`;
    if (!lessonIds.has(item.lessonId)) {
      issues.push(issue(itemPath, `lessonId "${item.lessonId}" is not a lesson in this unit`));
    }
    issues.push(...validateQuestion(item.question, `${itemPath}.question`));
  });
  if (lessons.length <= checkpoint.items.length) {
    const covered = new Set(checkpoint.items.map((item) => item.lessonId));
    const missing = lessons.filter((lesson) => !covered.has(lesson.id));
    if (missing.length > 0) {
      issues.push(
        issue(`${path}.items`, `no questions on: ${missing.map((lesson) => lesson.id).join(', ')}`),
      );
    }
  }
  return issues;
}

export function validateUnit(unit: Unit): ValidationIssue[] {
  const path = `unit(${unit.id})`;
  const issues: ValidationIssue[] = [];
  if (!unit.id.trim()) issues.push(issue(path, 'id is empty'));
  if (!unit.title.trim()) issues.push(issue(path, 'title is empty'));
  if (!unit.description.trim()) issues.push(issue(path, 'description is empty'));
  if (!unit.missionId.trim()) issues.push(issue(path, 'missionId is empty'));
  if (unit.lessons.length === 0) issues.push(issue(path, 'has no lessons'));

  const lessonIds = unit.lessons.map((lesson) => lesson.id);
  const duplicateLessons = lessonIds.filter((id, index) => lessonIds.indexOf(id) !== index);
  if (duplicateLessons.length > 0) {
    issues.push(issue(path, `duplicate lesson ids: ${duplicateLessons.join(', ')}`));
  }

  const questionIds = [
    ...unit.lessons.flatMap((lesson) => lesson.questions.map((question) => question.id)),
    ...unit.checkpoint.items.map((item) => item.question.id),
  ];
  const duplicateQuestions = questionIds.filter((id, index) => questionIds.indexOf(id) !== index);
  if (duplicateQuestions.length > 0) {
    issues.push(issue(path, `duplicate question ids: ${duplicateQuestions.join(', ')}`));
  }

  unit.lessons.forEach((lesson, index) =>
    issues.push(...validateLesson(lesson, `${path}.lessons[${index}](${lesson.id})`)),
  );
  issues.push(...validateCheckpoint(unit.checkpoint, unit.lessons, `${path}.checkpoint`));
  return issues;
}

export function validateMission(mission: Mission): ValidationIssue[] {
  const path = `mission(${mission.id})`;
  const issues: ValidationIssue[] = [];
  if (!mission.id.trim()) issues.push(issue(path, 'id is empty'));
  if (!mission.title.trim()) issues.push(issue(path, 'title is empty'));
  const briefWords = countWords(mission.brief);
  if (briefWords > CONTENT_LIMITS.missionBriefWords) {
    issues.push(
      issue(
        `${path}.brief`,
        `has ${briefWords} words; the limit is ${CONTENT_LIMITS.missionBriefWords}`,
      ),
    );
  }
  if (!mission.dataset.fileName.trim() || !mission.dataset.url.trim()) {
    issues.push(issue(`${path}.dataset`, 'needs a file name and a url'));
  }
  if (mission.tasks.length === 0) issues.push(issue(path, 'has no tasks'));

  const ids = mission.tasks.map((task) => task.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0)
    issues.push(issue(path, `duplicate task ids: ${duplicates.join(', ')}`));

  const firstStretch = mission.tasks.findIndex((task) => task.stretch);
  if (firstStretch !== -1 && mission.tasks.slice(firstStretch).some((task) => !task.stretch)) {
    issues.push(issue(`${path}.tasks`, 'stretch tasks must come after every required task'));
  }
  if (!mission.tasks.some((task) => task.kind === 'written' && !task.stretch)) {
    issues.push(issue(`${path}.tasks`, 'needs a required written task for the recommendation'));
  }

  const summaryLines = [
    ...mission.summary.whatYouDid.map((line) => ({ line, part: 'whatYouDid' })),
    ...mission.summary.portfolio.map((line) => ({ line, part: 'portfolio' })),
  ];
  for (const { line, part } of summaryLines) {
    for (const [, name] of line.text.matchAll(/\{(\w+)\}/g)) {
      if (!(MISSION_FACTS as readonly string[]).includes(name)) {
        issues.push(issue(`${path}.summary.${part}`, `{${name}} is not a known mission fact`));
      }
    }
    for (const taskId of [line.requiresTask, line.unlessTask]) {
      if (taskId && !ids.includes(taskId)) {
        issues.push(issue(`${path}.summary.${part}`, `refers to unknown task "${taskId}"`));
      }
    }
  }
  const portfolioLines = (passed: ReadonlySet<string>) =>
    mission.summary.portfolio.filter(
      (line) =>
        (!line.requiresTask || passed.has(line.requiresTask)) &&
        (!line.unlessTask || !passed.has(line.unlessTask)),
    ).length;
  const stretchIds = mission.tasks.filter((task) => task.stretch).map((task) => task.id);
  for (const passed of [new Set<string>(), new Set(stretchIds)]) {
    const count = portfolioLines(passed);
    if (count < 3 || count > 4) {
      issues.push(issue(`${path}.summary.portfolio`, `shows ${count} lines; keep it to 3–4`));
    }
  }

  mission.tasks.forEach((task, index) => {
    const taskPath = `${path}.tasks[${index}](${task.id})`;
    if (!task.title.trim()) issues.push(issue(taskPath, 'title is empty'));
    if (/^stretch\b/i.test(task.title)) {
      issues.push(
        issue(taskPath, 'the UI marks stretch tasks; do not start the title with "Stretch"'),
      );
    }
    if (!task.instructions.trim()) issues.push(issue(taskPath, 'instructions are empty'));
    if (task.kind === 'code') {
      if (!task.starterCode.trim()) issues.push(issue(taskPath, 'starter code is empty'));
      for (const name of task.creates) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
          issues.push(issue(taskPath, `"${name}" is not a valid Python variable name`));
        }
      }
      if (!task.hints.nudge.trim() || !task.hints.method.trim()) {
        issues.push(issue(taskPath, 'needs a nudge hint and a method hint'));
      }
      if (!task.hints.example.includes('____')) {
        issues.push(issue(taskPath, 'the example hint should leave a ____ blank to fill in'));
      }
    } else {
      const { min, max } = task.suggestedSentences;
      if (!(min >= 1 && max >= min)) {
        issues.push(issue(taskPath, 'suggested sentences are invalid'));
      }
      if (!(task.minWords >= 1)) issues.push(issue(taskPath, 'minWords must be at least 1'));
      const reviewIds = task.selfReview.map((item) => item.id);
      if (reviewIds.length === 0 || new Set(reviewIds).size !== reviewIds.length) {
        issues.push(issue(taskPath, 'needs self-review items with unique ids'));
      }
      if (!task.modelAnswer.trim()) issues.push(issue(taskPath, 'needs a model answer'));
    }
  });
  return issues;
}
