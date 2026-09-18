/**
 * Generates the synthetic dataset for the mission "The False Alarm" (Unit 2).
 *
 *   npm run generate:data
 *
 * Kathakar, an audiobook subscription app, has three kinds of subscriber. Students cancel far
 * more every April, before their summer break, so April 2026's "spike" of 200 cancellations is
 * the usual seasonal pattern, not a new problem. The output is deterministic, and after writing,
 * the script checks the planted patterns described in scripts/README.md are really there.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED = 20260918;
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/churn.csv');

const SEGMENTS = ['student', 'professional', 'family'] as const;
type Segment = (typeof SEGMENTS)[number];

const FIRST_MONTH = { year: 2024, month: 1 };
const LAST_MONTH = { year: 2026, month: 4 };

const STARTING_SUBSCRIBERS: Record<Segment, number> = {
  student: 900,
  professional: 1700,
  family: 1000,
};

/** Share of a segment's subscribers who cancel in a normal month. */
const MONTHLY_CHURN: Record<Segment, number> = {
  student: 0.03,
  professional: 0.026,
  family: 0.022,
};

/** Students cancel before the summer break: April churn is much higher, every year. */
const STUDENT_APRIL_CHURN = 0.08;

/** The founder's "200 users last month". */
const LAST_MONTH_CANCELLATIONS = 200;

/** New sign-ups per month. Students join at the start of the academic year, in July and August. */
function signupsFor(segment: Segment, month: number): number {
  switch (segment) {
    case 'student':
      return 40 + (month === 7 ? 150 : month === 8 ? 90 : 0);
    case 'professional':
      return 72;
    case 'family':
      return 42;
  }
}

// ---------------------------------------------------------------------------------------------
// Seeded randomness

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(SEED);

/** A multiplier near 1, e.g. 0.93 to 1.07 for a spread of 0.07. */
const wobble = (spread: number) => 1 + (random() * 2 - 1) * spread;

// ---------------------------------------------------------------------------------------------
// Generate

export interface ChurnRow {
  month: string;
  segment: Segment;
  subscribers_start: number;
  new_signups: number;
  cancelled: number;
}

function monthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function* months(): Generator<{ year: number; month: number }> {
  let { year, month } = FIRST_MONTH;
  while (year < LAST_MONTH.year || (year === LAST_MONTH.year && month <= LAST_MONTH.month)) {
    yield { year, month };
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

function generateRows(): ChurnRow[] {
  const rows: ChurnRow[] = [];
  const subscribers = { ...STARTING_SUBSCRIBERS };
  for (const { year, month } of months()) {
    const isLast = year === LAST_MONTH.year && month === LAST_MONTH.month;
    // Some months are simply a little better or worse for everyone. The founder's month is an
    // ordinary one for professionals and families, so the spike is all students.
    const monthMood = isLast ? 1 : wobble(0.11);
    const cancelled = {} as Record<Segment, number>;
    for (const segment of SEGMENTS) {
      const summerBreak = segment === 'student' && month === 4;
      const rate = summerBreak ? STUDENT_APRIL_CHURN : MONTHLY_CHURN[segment];
      // The summer break swamps everything else in students' April.
      const mood = summerBreak ? 1 : monthMood;
      const noise = isLast ? 1 : wobble(0.04);
      cancelled[segment] = Math.round(subscribers[segment] * rate * mood * noise);
    }
    if (isLast) {
      // The founder's month: students take up whatever is left of the 200.
      cancelled.student = LAST_MONTH_CANCELLATIONS - cancelled.professional - cancelled.family;
    }
    for (const segment of SEGMENTS) {
      const newSignups = Math.round(signupsFor(segment, month) * wobble(0.12));
      rows.push({
        month: monthLabel(year, month),
        segment,
        subscribers_start: subscribers[segment],
        new_signups: newSignups,
        cancelled: cancelled[segment],
      });
      subscribers[segment] += newSignups - cancelled[segment];
    }
  }
  return rows;
}

function toCsv(rows: readonly ChurnRow[]): string {
  const header = ['month', 'segment', 'subscribers_start', 'new_signups', 'cancelled'];
  const lines = rows.map((row) => header.map((column) => row[column as keyof ChurnRow]).join(','));
  return `${[header.join(','), ...lines].join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------
// Check the planted patterns

const rate = (rows: readonly ChurnRow[]) =>
  rows.reduce((sum, row) => sum + row.cancelled, 0) /
  rows.reduce((sum, row) => sum + row.subscribers_start, 0);

function quantile(sorted: readonly number[], p: number): number {
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

function check(rows: readonly ChurnRow[]): string[] {
  const problems: string[] = [];
  const last = monthLabel(LAST_MONTH.year, LAST_MONTH.month);
  const monthLabels = [...new Set(rows.map((row) => row.month))];
  const byMonth = (label: string) => rows.filter((row) => row.month === label);
  const totals = monthLabels.map((label) =>
    byMonth(label).reduce((sum, row) => sum + row.cancelled, 0),
  );

  if (totals.at(-1) !== LAST_MONTH_CANCELLATIONS) {
    problems.push(`last month has ${totals.at(-1)} cancellations, not ${LAST_MONTH_CANCELLATIONS}`);
  }
  if (Math.max(...totals.slice(0, -1)) >= LAST_MONTH_CANCELLATIONS) {
    problems.push('last month should have the most cancellations ever');
  }

  const lastRate = rate(byMonth(last));
  const baseRate = rate(rows.filter((row) => row.month !== last));
  if (lastRate < 0.037 || lastRate > 0.042) problems.push(`last month's rate is ${lastRate}`);
  if (baseRate < 0.025 || baseRate > 0.031) problems.push(`the base rate is ${baseRate}`);

  const aprils = monthLabels.filter((label) => label.endsWith('-04'));
  for (const label of aprils) {
    const students = rate(byMonth(label).filter((row) => row.segment === 'student'));
    if (students < 0.075 || students > 0.085) {
      problems.push(`students' churn in ${label} is ${students}, not about 8%`);
    }
  }
  const studentOther = rate(
    rows.filter((row) => row.segment === 'student' && !row.month.endsWith('-04')),
  );
  if (studentOther < 0.025 || studentOther > 0.035) {
    problems.push(`students' churn outside April is ${studentOther}`);
  }
  for (const segment of ['professional', 'family'] as const) {
    const lastMonth = rate(byMonth(last).filter((row) => row.segment === segment));
    const usual = rate(rows.filter((row) => row.segment === segment && row.month !== last));
    if (Math.abs(lastMonth - usual) > 0.004) {
      problems.push(`${segment} churn last month (${lastMonth}) is not its usual ${usual}`);
    }
  }

  // Lesson 7 plots the last 24 monthly rates, rounded to 0.1%: only the two Aprils are outliers.
  const recent = monthLabels.slice(-24);
  const rates = recent.map((label) => Math.round(rate(byMonth(label)) * 1000) / 10);
  const sorted = [...rates].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const flagged = recent.filter(
    (_, index) => rates[index] > q3 + 1.5 * (q3 - q1) || rates[index] < q1 - 1.5 * (q3 - q1),
  );
  if (flagged.join(',') !== aprils.slice(-2).join(',')) {
    problems.push(`the IQR rule flags ${flagged.join(', ')} instead of the last two Aprils`);
  }
  return problems;
}

const rows = generateRows();
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, toCsv(rows));
console.log(`Wrote ${rows.length} rows to ${OUTPUT}`);

const problems = check(rows);
if (problems.length > 0) {
  console.error(`Planted patterns missing:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('All planted patterns are present.');
