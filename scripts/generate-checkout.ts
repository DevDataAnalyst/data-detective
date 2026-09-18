/**
 * Generates the synthetic dataset for the mission "The Checkout Redesign" (Unit 3).
 *
 *   npm run generate:data
 *
 * Haatbox, an online grocery app, tested a new checkout for two weeks. The new checkout looks
 * clearly better overall, but only because it got most of the weekend traffic, and everyone
 * converts more at weekends. Day for day, the two checkouts convert the same. The output is
 * deterministic, and the script checks the planted patterns described in scripts/README.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED = 20260919;
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/checkout.csv');

/** Monday 3 August to Sunday 16 August 2026. */
const FIRST_DAY = Date.UTC(2026, 7, 3);
const DAYS = 14;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const VISITORS = { weekday: 6000, weekend: 7500 };
/** Share of each day's visitors sent to the new checkout. The team watched it at weekends. */
const NEW_SHARE = { weekday: 0.2, weekend: 0.6 };
/** The chance a visitor orders. The same for both checkouts: the redesign changes nothing. */
const CONVERSION = { weekday: 0.035, weekend: 0.055 };

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

/** How many of `trials` visitors order, each with chance `chance`. */
function binomial(trials: number, chance: number): number {
  let successes = 0;
  for (let index = 0; index < trials; index += 1) if (random() < chance) successes += 1;
  return successes;
}

// ---------------------------------------------------------------------------------------------
// Generate

export interface CheckoutRow {
  date: string;
  day: string;
  variant: 'old' | 'new';
  visitors: number;
  orders: number;
}

function generateRows(): CheckoutRow[] {
  const rows: CheckoutRow[] = [];
  for (let offset = 0; offset < DAYS; offset += 1) {
    const date = new Date(FIRST_DAY + offset * 86_400_000);
    const day = DAY_NAMES[date.getUTCDay()];
    const type = day === 'Sat' || day === 'Sun' ? 'weekend' : 'weekday';
    const total = Math.round(VISITORS[type] * (0.92 + random() * 0.16));
    const newVisitors = binomial(total, NEW_SHARE[type]);
    const label = date.toISOString().slice(0, 10);
    // Some days are better for everyone; on any one day, both checkouts convert alike.
    const dayRate = CONVERSION[type] * (0.9 + random() * 0.2);
    for (const [variant, visitors] of [
      ['old', total - newVisitors],
      ['new', newVisitors],
    ] as const) {
      const orders = Math.round(visitors * dayRate * (0.97 + random() * 0.06));
      rows.push({ date: label, day, variant, visitors, orders });
    }
  }
  return rows;
}

function toCsv(rows: readonly CheckoutRow[]): string {
  const header = ['date', 'day', 'variant', 'visitors', 'orders'];
  const lines = rows.map((row) =>
    header.map((column) => row[column as keyof CheckoutRow]).join(','),
  );
  return `${[header.join(','), ...lines].join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------
// Check the planted patterns

function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

function test(rows: readonly CheckoutRow[]) {
  const sum = (variant: string, key: 'visitors' | 'orders') =>
    rows.filter((row) => row.variant === variant).reduce((total, row) => total + row[key], 0);
  const oldRate = sum('old', 'orders') / sum('old', 'visitors');
  const newRate = sum('new', 'orders') / sum('new', 'visitors');
  const pooled =
    (sum('old', 'orders') + sum('new', 'orders')) /
    (sum('old', 'visitors') + sum('new', 'visitors'));
  const error = Math.sqrt(
    pooled * (1 - pooled) * (1 / sum('old', 'visitors') + 1 / sum('new', 'visitors')),
  );
  const z = (newRate - oldRate) / error;
  return { oldRate, newRate, pValue: 2 * (1 - normalCdf(Math.abs(z))) };
}

const isWeekend = (row: CheckoutRow) => row.day === 'Sat' || row.day === 'Sun';

function check(rows: readonly CheckoutRow[]): string[] {
  const problems: string[] = [];
  const overall = test(rows);
  if (overall.newRate - overall.oldRate < 0.006) {
    problems.push(
      `the new checkout only looks ${(overall.newRate - overall.oldRate) * 100} points better`,
    );
  }
  if (overall.pValue > 0.001) problems.push(`the overall p-value is ${overall.pValue}, not tiny`);

  for (const [name, part] of [
    ['weekday', rows.filter((row) => !isWeekend(row))],
    ['weekend', rows.filter(isWeekend)],
  ] as const) {
    const result = test(part);
    if (result.pValue < 0.25) {
      problems.push(`${name}s alone show a difference (p = ${result.pValue})`);
    }
    if (Math.abs(result.newRate - result.oldRate) > 0.002) {
      problems.push(`${name}s alone differ by ${(result.newRate - result.oldRate) * 100} points`);
    }
  }

  const weekendShare = (variant: string) =>
    rows
      .filter((row) => row.variant === variant && isWeekend(row))
      .reduce((s, r) => s + r.visitors, 0) /
    rows.filter((row) => row.variant === variant).reduce((s, r) => s + r.visitors, 0);
  if (weekendShare('new') < 0.55 || weekendShare('old') > 0.25) {
    problems.push(
      `weekend shares are ${weekendShare('old')} (old) and ${weekendShare('new')} (new)`,
    );
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
