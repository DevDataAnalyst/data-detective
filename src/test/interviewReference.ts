/**
 * Works out the facts of the interview dataset (Unit 4's mission) from the three CSV files, in
 * plain TypeScript, so tests can check the content and the Python checks against the data.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA = resolve(__dirname, '../../public/data');
export const INTERVIEW_FILES = {
  customers: resolve(DATA, 'customers.csv'),
  orders: resolve(DATA, 'orders.csv'),
  items: resolve(DATA, 'order_items.csv'),
};

function readRows(path: string): Array<Record<string, string>> {
  const [header, ...lines] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const columns = header.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(columns.map((column, index) => [column, cells[index]]));
  });
}

export interface InterviewReference {
  customers: number;
  orders: number;
  itemRows: number;
  delivered: number;
  cities: string[];
  /** Delivered order value by city, each order counted once. Biggest first. */
  revenue: Array<[city: string, revenue: number]>;
  /** What the dashboard's join gives: delivered order value, counted once per item row. */
  dashboard: Array<[city: string, revenue: number]>;
  /** Delivered and cancelled order value, each counted once. */
  withCancelled: Record<string, number>;
  /** Item rows per order (delivered and cancelled), by city. */
  rowsPerOrder: Record<string, number>;
  ordersByCity: Record<string, number>;
  /** Share of each city's orders that were cancelled. */
  cancelShare: Record<string, number>;
  itemRowsByCity: Record<string, number>;
  /** Sum of quantity × price over delivered orders' items, by city. */
  itemRevenue: Record<string, number>;
  /** Each city's top item by revenue over delivered orders. */
  bestSellers: Record<string, { item: string; revenue: number }>;
  /** Customers with no order in the quarter. */
  neverOrdered: number;
}

export function interviewReference(): InterviewReference {
  const customers = readRows(INTERVIEW_FILES.customers);
  const orders = readRows(INTERVIEW_FILES.orders);
  const items = readRows(INTERVIEW_FILES.items);
  const cityOf = new Map(customers.map((row) => [row.customer_id, row.city]));
  const orderCity = new Map(
    orders.map((row) => [row.order_id, cityOf.get(row.customer_id) ?? '?']),
  );
  const delivered = new Set(
    orders.filter((row) => row.status === 'delivered').map((row) => row.order_id),
  );
  const rowsOf = new Map<string, number>();
  for (const item of items) rowsOf.set(item.order_id, (rowsOf.get(item.order_id) ?? 0) + 1);

  const add = (target: Record<string, number>, key: string, value: number) => {
    target[key] = (target[key] ?? 0) + value;
  };
  const revenue: Record<string, number> = {};
  const dashboard: Record<string, number> = {};
  const withCancelled: Record<string, number> = {};
  const ordersByCity: Record<string, number> = {};
  const cancelledByCity: Record<string, number> = {};
  const itemRowsByCity: Record<string, number> = {};
  for (const order of orders) {
    const city = orderCity.get(order.order_id) ?? '?';
    const value = Number(order.order_value);
    const rows = rowsOf.get(order.order_id) ?? 0;
    add(withCancelled, city, value);
    add(ordersByCity, city, 1);
    add(cancelledByCity, city, order.status === 'cancelled' ? 1 : 0);
    add(itemRowsByCity, city, rows);
    if (delivered.has(order.order_id)) {
      add(revenue, city, value);
      add(dashboard, city, value * rows);
    }
  }

  const itemRevenue: Record<string, number> = {};
  const byItem: Record<string, Record<string, number>> = {};
  for (const item of items) {
    if (!delivered.has(item.order_id)) continue;
    const city = orderCity.get(item.order_id) ?? '?';
    const amount = Number(item.quantity) * Number(item.price);
    add(itemRevenue, city, amount);
    byItem[city] ??= {};
    add(byItem[city], item.item, amount);
  }
  const bestSellers = Object.fromEntries(
    Object.entries(byItem).map(([city, totals]) => {
      const [item, amount] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
      return [city, { item, revenue: amount }];
    }),
  );

  const ranked = (totals: Record<string, number>) =>
    Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const ordered = new Set(orders.map((row) => row.customer_id));
  return {
    customers: customers.length,
    orders: orders.length,
    itemRows: items.length,
    delivered: delivered.size,
    cities: [...new Set(customers.map((row) => row.city))].sort(),
    revenue: ranked(revenue),
    dashboard: ranked(dashboard),
    withCancelled,
    rowsPerOrder: Object.fromEntries(
      Object.keys(ordersByCity).map((city) => [city, itemRowsByCity[city] / ordersByCity[city]]),
    ),
    ordersByCity,
    cancelShare: Object.fromEntries(
      Object.keys(ordersByCity).map((city) => [city, cancelledByCity[city] / ordersByCity[city]]),
    ),
    itemRowsByCity,
    itemRevenue,
    bestSellers,
    neverOrdered: customers.filter((row) => !ordered.has(row.customer_id)).length,
  };
}
