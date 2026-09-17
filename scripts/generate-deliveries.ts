/**
 * Generates the synthetic dataset for the mission "The Late Delivery Mystery".
 *
 *   npm run generate:data
 *
 * The output is deterministic: the same seed always writes the same CSV. After writing, the script
 * checks that the planted patterns described in scripts/README.md really are in the data, and
 * exits with an error if any is missing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED = 20260917;
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/deliveries.csv');

const CITIES = ['Bengaluru', 'Pune', 'Hyderabad', 'Kolkata', 'Chennai'] as const;
type City = (typeof CITIES)[number];

const ORDERS_PER_CITY = 120;

/** Extra minutes every order in a city takes. */
const CITY_EXTRA_MIN: Record<City, number> = {
  Bengaluru: 2,
  Pune: 0,
  Hyderabad: 0,
  Kolkata: 3,
  Chennai: 1,
};

/** Kolkata is genuinely slow at dinner time. */
const SLOW_DINNER_CITY: City = 'Kolkata';
const DINNER_HOURS = [19, 20, 21, 22];
const SLOW_DINNER_EXTRA_MIN = 10;

/** Logging errors: orders recorded as taking hours. Most are in Hyderabad. */
const LOGGING_ERRORS: ReadonlyArray<{ city: City; minutes: number }> = [
  { city: 'Hyderabad', minutes: 312 },
  { city: 'Hyderabad', minutes: 355 },
  { city: 'Hyderabad', minutes: 398 },
  { city: 'Hyderabad', minutes: 421 },
  { city: 'Hyderabad', minutes: 476 },
  { city: 'Pune', minutes: 334 },
  { city: 'Chennai', minutes: 305 },
];

const MISSING_DELIVERY_TIMES = 18;
const MISSING_RATINGS = 42;

/** Relative order volume by hour of day: quiet at night, busy at lunch and dinner. */
const HOUR_WEIGHTS = [
  1, 0.6, 0.3, 0.2, 0.2, 0.3, 0.8, 1.5, 2.5, 3, 3.5, 4.5, 8, 9, 7, 4, 3.5, 4, 6, 9, 10, 9, 6, 2.5,
];

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

function normal(mean: number, sd: number): number {
  const u = 1 - random();
  const v = random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function weightedIndex(weights: readonly number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    target -= weights[index];
    if (target < 0) return index;
  }
  return weights.length - 1;
}

function shuffle<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function sample<T>(items: readonly T[], count: number): T[] {
  return shuffle([...items]).slice(0, count);
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

// ---------------------------------------------------------------------------------------------
// Generate

interface Order {
  order_id: string;
  city: City;
  order_hour: number;
  distance_km: number;
  prep_time_min: number;
  delivery_time_min: number | null;
  rating: number | null;
}

function generateOrders(): Order[] {
  const orders: Order[] = [];
  for (const city of CITIES) {
    for (let count = 0; count < ORDERS_PER_CITY; count += 1) {
      const hour = weightedIndex(HOUR_WEIGHTS);
      const distance = round1(0.8 + 6.2 * random());
      const prep = clamp(Math.round(normal(14, 3.5)), 6, 28);
      const lunchOrDinnerPeak = [12, 13, 19, 20, 21].includes(hour) ? 2 : 0;
      const slowDinner =
        city === SLOW_DINNER_CITY && DINNER_HOURS.includes(hour)
          ? SLOW_DINNER_EXTRA_MIN + normal(0, 2)
          : 0;
      const delivery = Math.max(
        15,
        Math.round(
          prep +
            distance * 3 +
            6 +
            CITY_EXTRA_MIN[city] +
            lunchOrDinnerPeak +
            slowDinner +
            normal(0, 3),
        ),
      );
      const rating = clamp(Math.round(5.4 - (delivery - 28) / 10 + normal(0, 0.6)), 1, 5);
      orders.push({
        order_id: '',
        city,
        order_hour: hour,
        distance_km: distance,
        prep_time_min: prep,
        delivery_time_min: delivery,
        rating,
      });
    }
  }

  // Logging errors replace a real delivery time with an impossible one.
  const errorRows = new Set<Order>();
  for (const error of LOGGING_ERRORS) {
    const candidates = orders.filter(
      (order) =>
        order.city === error.city &&
        !errorRows.has(order) &&
        !(order.city === SLOW_DINNER_CITY && DINNER_HOURS.includes(order.order_hour)),
    );
    const [row] = sample(candidates, 1);
    row.delivery_time_min = error.minutes;
    errorRows.add(row);
  }

  // Missing values: some delivery times never got logged, and many customers skip the rating.
  for (const row of sample(
    orders.filter((order) => !errorRows.has(order)),
    MISSING_DELIVERY_TIMES,
  )) {
    row.delivery_time_min = null;
  }
  for (const row of sample(orders, MISSING_RATINGS)) {
    row.rating = null;
  }

  shuffle(orders).forEach((order, index) => {
    order.order_id = `ORD-${10001 + index}`;
  });
  return orders;
}

function toCsv(orders: readonly Order[]): string {
  const header = [
    'order_id',
    'city',
    'order_hour',
    'distance_km',
    'prep_time_min',
    'delivery_time_min',
    'rating',
  ];
  const lines = orders.map((order) =>
    [
      order.order_id,
      order.city,
      order.order_hour,
      order.distance_km.toFixed(1),
      order.prep_time_min,
      order.delivery_time_min ?? '',
      order.rating ?? '',
    ].join(','),
  );
  return `${[header.join(','), ...lines].join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------
// Check the planted patterns (same maths as pandas: linear quantiles, NaN skipped)

const mean = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / values.length;

function quantile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

function describe(orders: readonly Order[]) {
  const clean = orders.filter((order) => order.delivery_time_min !== null);
  const times = clean.map((order) => order.delivery_time_min as number);
  const q1 = quantile(times, 0.25);
  const q3 = quantile(times, 0.75);
  const lower = q1 - 1.5 * (q3 - q1);
  const upper = q3 + 1.5 * (q3 - q1);
  const inside = (order: Order) =>
    (order.delivery_time_min as number) >= lower && (order.delivery_time_min as number) <= upper;
  const noOutliers = clean.filter(inside);

  const byCity = CITIES.map((city) => {
    const cityTimes = clean
      .filter((o) => o.city === city)
      .map((o) => o.delivery_time_min as number);
    const trimmed = noOutliers
      .filter((o) => o.city === city)
      .map((o) => o.delivery_time_min as number);
    return {
      city,
      mean: mean(cityTimes),
      median: quantile(cityTimes, 0.5),
      meanNoOutliers: mean(trimmed),
    };
  });

  const slowCity = clean.filter((o) => o.city === SLOW_DINNER_CITY);
  const dinner = slowCity.filter((o) => DINNER_HOURS.includes(o.order_hour));
  const other = slowCity.filter((o) => !DINNER_HOURS.includes(o.order_hour));

  return {
    rows: orders.length,
    missingDelivery: orders.length - clean.length,
    missingRating: orders.filter((order) => order.rating === null).length,
    fences: { q1, q3, lower, upper },
    outliers: clean.length - noOutliers.length,
    lowOutliers: clean.filter((o) => (o.delivery_time_min as number) < lower).length,
    loggingErrorsFlagged: clean.filter((o) => (o.delivery_time_min as number) >= 300 && !inside(o))
      .length,
    byCity,
    slowCityDinnerMean: mean(dinner.map((o) => o.delivery_time_min as number)),
    slowCityOtherMean: mean(other.map((o) => o.delivery_time_min as number)),
  };
}

function checkPatterns(summary: ReturnType<typeof describe>): string[] {
  const problems: string[] = [];
  const top = (key: 'mean' | 'median' | 'meanNoOutliers') =>
    [...summary.byCity].sort((a, b) => b[key] - a[key])[0].city;
  const change = (city: (typeof summary.byCity)[number]) => city.mean - city.meanNoOutliers;
  const biggestChange = [...summary.byCity].sort((a, b) => change(b) - change(a))[0].city;

  if (summary.missingDelivery !== MISSING_DELIVERY_TIMES) problems.push('missing delivery count');
  if (summary.loggingErrorsFlagged !== LOGGING_ERRORS.length) {
    problems.push('not every logging error is an IQR outlier');
  }
  if (summary.outliers > LOGGING_ERRORS.length + 6) problems.push('too many IQR outliers');
  if (summary.lowOutliers > 0) problems.push('no order should fall below the lower fence');
  if (top('mean') !== 'Hyderabad') problems.push('Hyderabad should have the highest raw mean');
  if (top('median') !== SLOW_DINNER_CITY) problems.push('Kolkata should have the highest median');
  if (top('meanNoOutliers') !== SLOW_DINNER_CITY) {
    problems.push('Kolkata should have the highest mean without outliers');
  }
  if (biggestChange !== 'Hyderabad') problems.push('Hyderabad’s mean should change the most');
  const hyderabad = summary.byCity.find((city) => city.city === 'Hyderabad')!;
  const ordinaryMedians = summary.byCity
    .filter((city) => city.city !== 'Hyderabad' && city.city !== SLOW_DINNER_CITY)
    .map((city) => city.median)
    .sort((a, b) => a - b);
  if (hyderabad.median - ordinaryMedians[1] > 2) {
    problems.push('Hyderabad’s median should be ordinary');
  }
  if (summary.slowCityDinnerMean - summary.slowCityOtherMean < 9) {
    problems.push('Kolkata’s dinner slowdown should be at least 9 minutes');
  }
  return problems;
}

const orders = generateOrders();
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, toCsv(orders));

const summary = describe(orders);
console.log(`Wrote ${summary.rows} orders to ${OUTPUT}`);
console.table(
  summary.byCity.map((city) => ({
    city: city.city,
    mean: city.mean.toFixed(2),
    median: city.median,
    mean_no_outliers: city.meanNoOutliers.toFixed(2),
  })),
);
console.log({
  missingDelivery: summary.missingDelivery,
  missingRating: summary.missingRating,
  fences: summary.fences,
  outliers: summary.outliers,
  kolkataDinnerMean: summary.slowCityDinnerMean.toFixed(1),
  kolkataOtherMean: summary.slowCityOtherMean.toFixed(1),
});

const problems = checkPatterns(summary);
if (problems.length > 0) {
  console.error(`Planted patterns missing:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('All planted patterns are present.');
