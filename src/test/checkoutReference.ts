import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { abStats } from '../game/abTest';

/**
 * Reference answers for "The Checkout Redesign", computed in TypeScript straight from the CSV.
 * The Python checks compute the same values with pandas; tests compare the two, and Unit 3's
 * content quotes these numbers.
 */

export interface CheckoutRow {
  date: string;
  day: string;
  variant: string;
  visitors: number;
  orders: number;
}

export const CHECKOUT_CSV = resolve(__dirname, '../../public/data/checkout.csv');

export function readCheckout(path = CHECKOUT_CSV): { header: string[]; rows: CheckoutRow[] } {
  const [headerLine, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const header = headerLine.split(',');
  const column = (name: string) => header.indexOf(name);
  const rows = lines.map((line) => {
    const cells = line.split(',');
    return {
      date: cells[column('date')],
      day: cells[column('day')],
      variant: cells[column('variant')],
      visitors: Number(cells[column('visitors')]),
      orders: Number(cells[column('orders')]),
    };
  });
  return { header, rows };
}

export const isWeekend = (row: CheckoutRow) => row.day === 'Sat' || row.day === 'Sun';

function totals(rows: readonly CheckoutRow[], variant: string) {
  const chosen = rows.filter((row) => row.variant === variant);
  return {
    visitors: chosen.reduce((sum, row) => sum + row.visitors, 0),
    conversions: chosen.reduce((sum, row) => sum + row.orders, 0),
  };
}

export function checkoutReference(path = CHECKOUT_CSV) {
  const { header, rows } = readCheckout(path);
  const old = totals(rows, 'old');
  const fresh = totals(rows, 'new');
  const byDayType = (weekend: boolean) => {
    const part = rows.filter((row) => isWeekend(row) === weekend);
    const oldPart = totals(part, 'old');
    const newPart = totals(part, 'new');
    return {
      old: oldPart,
      new: newPart,
      oldRate: oldPart.conversions / oldPart.visitors,
      newRate: newPart.conversions / newPart.visitors,
      stats: abStats(oldPart, newPart),
      rate: (oldPart.conversions + newPart.conversions) / (oldPart.visitors + newPart.visitors),
    };
  };
  const weekendVisitors = (variant: string) =>
    rows
      .filter((row) => row.variant === variant && isWeekend(row))
      .reduce((sum, row) => sum + row.visitors, 0);

  return {
    header,
    rows: rows.length,
    days: new Set(rows.map((row) => row.date)).size,
    firstDate: rows[0]?.date,
    lastDate: rows.at(-1)?.date,
    old,
    new: fresh,
    visitors: old.visitors + fresh.visitors,
    oldRate: old.conversions / old.visitors,
    newRate: fresh.conversions / fresh.visitors,
    overall: abStats(old, fresh),
    weekday: byDayType(false),
    weekend: byDayType(true),
    weekendShare: {
      old: weekendVisitors('old') / old.visitors,
      new: weekendVisitors('new') / fresh.visitors,
    },
  };
}
