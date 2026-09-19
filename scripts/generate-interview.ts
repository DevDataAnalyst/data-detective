/**
 * Generates the synthetic dataset for the mission "The Final Round" (Unit 4).
 *
 *   npm run generate:data
 *
 * Nashta Now, a breakfast delivery app in five cities, shares three tables with interview
 * candidates: customers, orders (one row per order) and order_items (one row per item in an
 * order). The finance dashboard joins orders to order_items before adding up order value, so each
 * order counts once per item. Pune's orders are big combos, so Pune looks like the top city by
 * far; counted once per order, Mumbai earns the most. Every order's value is exactly the sum of
 * its items, so the total can be checked a second way. The output is deterministic, and the
 * script checks the planted patterns described in scripts/README.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED = 20260920;
const DATA = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data');

/** 1 April to 30 June 2026. */
const FIRST_DAY = Date.UTC(2026, 3, 1);
const DAYS = 91;
const DAY_MS = 86_400_000;
/** Customers signed up from January 2025 to the last week of the quarter. */
const SIGNUP_FIRST = Date.UTC(2025, 0, 1);
const SIGNUP_DAYS = 540;
const CANCEL_RATE = 0.08;

interface MenuItem {
  item: string;
  category: 'Chai & coffee' | 'Breakfast' | 'Snacks' | 'Juice' | 'Sweets';
  price: number;
}

const MENU: readonly MenuItem[] = [
  { item: 'Masala chai', category: 'Chai & coffee', price: 30 },
  { item: 'Filter coffee', category: 'Chai & coffee', price: 40 },
  { item: 'Cold coffee', category: 'Chai & coffee', price: 90 },
  { item: 'Poha', category: 'Breakfast', price: 60 },
  { item: 'Misal pav', category: 'Breakfast', price: 90 },
  { item: 'Masala dosa', category: 'Breakfast', price: 90 },
  { item: 'Idli', category: 'Breakfast', price: 50 },
  { item: 'Pesarattu', category: 'Breakfast', price: 80 },
  { item: 'Upma', category: 'Breakfast', price: 60 },
  { item: 'Vada pav', category: 'Snacks', price: 30 },
  { item: 'Sandwich', category: 'Snacks', price: 70 },
  { item: 'Orange juice', category: 'Juice', price: 70 },
  { item: 'Jalebi', category: 'Sweets', price: 40 },
];

interface CityPlan {
  city: string;
  customers: number;
  orders: number;
  /** Chances of 1, 2, 3, 4 or 5 different items in an order. */
  itemCounts: readonly number[];
  /** Chances of a quantity of 1, 2 or 3 for each item. */
  quantities: readonly number[];
  /** Extra weight for local favourites; every other item weighs 1. */
  favourites: Readonly<Record<string, number>>;
}

/**
 * Pune orders are family combos with many different items; Mumbai orders are one or two items,
 * often more than one of each. Mumbai has the most orders and the most money.
 */
const CITIES: readonly CityPlan[] = [
  {
    city: 'Mumbai',
    customers: 700,
    orders: 1100,
    itemCounts: [0.62, 0.28, 0.1, 0, 0],
    quantities: [0.35, 0.45, 0.2],
    favourites: { 'Vada pav': 3, 'Cold coffee': 4, 'Misal pav': 2, Poha: 2 },
  },
  {
    city: 'Pune',
    customers: 520,
    orders: 650,
    itemCounts: [0, 0.05, 0.4, 0.4, 0.15],
    quantities: [0.95, 0.05, 0],
    favourites: { 'Misal pav': 5, Poha: 3, 'Masala chai': 2 },
  },
  {
    city: 'Bengaluru',
    customers: 600,
    orders: 700,
    itemCounts: [0.3, 0.45, 0.2, 0.05, 0],
    quantities: [0.6, 0.3, 0.1],
    favourites: { 'Masala dosa': 5, 'Filter coffee': 3, Idli: 2 },
  },
  {
    city: 'Hyderabad',
    customers: 450,
    orders: 560,
    itemCounts: [0.4, 0.4, 0.15, 0.05, 0],
    quantities: [0.6, 0.3, 0.1],
    favourites: { Pesarattu: 5, Upma: 2, 'Masala chai': 2 },
  },
  {
    city: 'Chennai',
    customers: 380,
    orders: 450,
    itemCounts: [0.45, 0.4, 0.15, 0, 0],
    quantities: [0.65, 0.3, 0.05],
    favourites: { Idli: 5, 'Filter coffee': 4, 'Masala dosa': 1 },
  },
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

function pick<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index];
    if (roll < 0) return items[index];
  }
  return items[items.length - 1];
}

const dateKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------------------------
// Generate

export interface CustomerRow {
  customer_id: number;
  city: string;
  signup_date: string;
}

export interface OrderRow {
  order_id: number;
  customer_id: number;
  order_date: string;
  status: 'delivered' | 'cancelled';
  order_value: number;
}

export interface ItemRow {
  order_id: number;
  item: string;
  category: string;
  quantity: number;
  price: number;
}

function generate() {
  const customers: CustomerRow[] = [];
  const draftOrders: Array<{ customer: CustomerRow; day: number; plan: CityPlan }> = [];

  for (const plan of CITIES) {
    const cityCustomers: Array<CustomerRow & { signupDay: number; appetite: number }> = [];
    for (let index = 0; index < plan.customers; index += 1) {
      const signupDay = Math.floor(random() * SIGNUP_DAYS);
      const customer = {
        customer_id: 0,
        city: plan.city,
        signup_date: dateKey(SIGNUP_FIRST + signupDay * DAY_MS),
        signupDay,
        // Some customers order far more than others.
        appetite: 0.3 + random() ** 2 * 3,
      };
      cityCustomers.push(customer);
    }
    for (let index = 0; index < plan.orders; index += 1) {
      const day = Math.floor(random() * DAYS);
      const orderDayFromSignupStart = Math.round((FIRST_DAY - SIGNUP_FIRST) / DAY_MS) + day;
      const eligible = cityCustomers.filter(
        (customer) => customer.signupDay <= orderDayFromSignupStart,
      );
      const customer = pick(
        eligible,
        eligible.map((candidate) => candidate.appetite),
      );
      draftOrders.push({ customer, day, plan });
    }
    customers.push(...cityCustomers);
  }

  // Ids in signup order, so they read like a real sign-up table.
  customers.sort(
    (a, b) => a.signup_date.localeCompare(b.signup_date) || a.city.localeCompare(b.city),
  );
  customers.forEach((customer, index) => {
    customer.customer_id = 1001 + index;
  });

  draftOrders.sort((a, b) => a.day - b.day);
  const orders: OrderRow[] = [];
  const items: ItemRow[] = [];
  draftOrders.forEach(({ customer, day, plan }, index) => {
    const orderId = 50001 + index;
    const count = pick([1, 2, 3, 4, 5], plan.itemCounts);
    const chosen = new Set<MenuItem>();
    while (chosen.size < count) {
      chosen.add(
        pick(
          MENU,
          MENU.map((entry) => plan.favourites[entry.item] ?? 1),
        ),
      );
    }
    let value = 0;
    for (const entry of chosen) {
      const quantity = pick([1, 2, 3], plan.quantities);
      value += quantity * entry.price;
      items.push({
        order_id: orderId,
        item: entry.item,
        category: entry.category,
        quantity,
        price: entry.price,
      });
    }
    orders.push({
      order_id: orderId,
      customer_id: customer.customer_id,
      order_date: dateKey(FIRST_DAY + day * DAY_MS),
      status: random() < CANCEL_RATE ? 'cancelled' : 'delivered',
      order_value: value,
    });
  });

  customers.sort((a, b) => a.customer_id - b.customer_id);
  return {
    customers: customers.map(({ customer_id, city, signup_date }) => ({
      customer_id,
      city,
      signup_date,
    })),
    orders,
    items,
  };
}

function toCsv<T extends object>(rows: readonly T[], columns: ReadonlyArray<keyof T>): string {
  return `${[columns.join(','), ...rows.map((row) => columns.map((column) => String(row[column])).join(','))].join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------
// Check the planted patterns

function check({ customers, orders, items }: ReturnType<typeof generate>): string[] {
  const problems: string[] = [];
  const cityOf = new Map(customers.map((customer) => [customer.customer_id, customer.city]));
  const itemsOf = new Map<number, ItemRow[]>();
  for (const item of items)
    itemsOf.set(item.order_id, [...(itemsOf.get(item.order_id) ?? []), item]);

  const revenue = new Map<string, number>();
  const naive = new Map<string, number>();
  const rows = new Map<string, number>();
  const count = new Map<string, number>();
  const cancelled = new Map<string, number>();
  const add = (map: Map<string, number>, key: string, value: number) =>
    map.set(key, (map.get(key) ?? 0) + value);

  for (const order of orders) {
    const city = cityOf.get(order.customer_id) ?? '?';
    const lines = itemsOf.get(order.order_id) ?? [];
    if (lines.length === 0) problems.push(`order ${order.order_id} has no items`);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    if (total !== order.order_value) problems.push(`order ${order.order_id} does not add up`);
    add(count, city, 1);
    add(rows, city, lines.length);
    if (order.status === 'cancelled') add(cancelled, city, 1);
    else {
      add(revenue, city, order.order_value);
      add(naive, city, order.order_value * lines.length);
    }
  }

  const ranked = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1]);
  const [trueTop, trueSecond] = ranked(revenue);
  const [naiveTop, naiveSecond] = ranked(naive);
  if (trueTop[0] !== 'Mumbai' || trueSecond[0] !== 'Pune') {
    problems.push(`counted once, the top two are ${trueTop[0]} and ${trueSecond[0]}`);
  }
  if (trueTop[1] < trueSecond[1] * 1.06) {
    problems.push(`Mumbai leads Pune by only ${(trueTop[1] / trueSecond[1] - 1) * 100}%`);
  }
  if (naiveTop[0] !== 'Pune' || naiveTop[1] < naiveSecond[1] * 1.4) {
    problems.push(`the dashboard's join does not put Pune clearly first: ${ranked(naive)}`);
  }
  const perOrder = (city: string) => (rows.get(city) ?? 0) / (count.get(city) ?? 1);
  if (perOrder('Pune') < 3.2 || perOrder('Mumbai') > 1.6) {
    problems.push(`items per order: Pune ${perOrder('Pune')}, Mumbai ${perOrder('Mumbai')}`);
  }
  for (const [city] of count) {
    const share = (cancelled.get(city) ?? 0) / (count.get(city) ?? 1);
    if (share < 0.04 || share > 0.13) problems.push(`${city} cancels ${share * 100}% of orders`);
  }

  // Each city's best seller must win clearly, so the stretch task has one right answer.
  const delivered = new Set(orders.filter((o) => o.status === 'delivered').map((o) => o.order_id));
  const orderCity = new Map(orders.map((o) => [o.order_id, cityOf.get(o.customer_id) ?? '?']));
  const itemRevenue = new Map<string, Map<string, number>>();
  for (const line of items) {
    if (!delivered.has(line.order_id)) continue;
    const city = orderCity.get(line.order_id) ?? '?';
    const byItem = itemRevenue.get(city) ?? new Map<string, number>();
    add(byItem, line.item, line.quantity * line.price);
    itemRevenue.set(city, byItem);
  }
  const winners = new Set<string>();
  for (const [city, byItem] of itemRevenue) {
    const [first, second] = ranked(byItem);
    winners.add(first[0]);
    if (first[1] < second[1] * 1.05) {
      problems.push(`${city}'s best seller ${first[0]} barely beats ${second[0]}`);
    }
  }
  if (winners.size < 4) problems.push(`best sellers repeat across cities: ${[...winners]}`);

  const ordered = new Set(orders.map((order) => order.customer_id));
  const never = customers.filter((customer) => !ordered.has(customer.customer_id)).length;
  if (never / customers.length < 0.15) {
    problems.push(`only ${never} customers never ordered, so the anti-join finds little`);
  }
  return problems;
}

const data = generate();
mkdirSync(DATA, { recursive: true });
writeFileSync(
  resolve(DATA, 'customers.csv'),
  toCsv(data.customers, ['customer_id', 'city', 'signup_date']),
);
writeFileSync(
  resolve(DATA, 'orders.csv'),
  toCsv(data.orders, ['order_id', 'customer_id', 'order_date', 'status', 'order_value']),
);
writeFileSync(
  resolve(DATA, 'order_items.csv'),
  toCsv(data.items, ['order_id', 'item', 'category', 'quantity', 'price']),
);
console.log(
  `Wrote ${data.customers.length} customers, ${data.orders.length} orders and ${data.items.length} order items to ${DATA}`,
);

const problems = check(data);
if (problems.length > 0) {
  console.error(`Planted patterns missing:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('All planted patterns are present.');
