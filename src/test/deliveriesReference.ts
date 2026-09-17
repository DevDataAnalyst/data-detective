import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mean, median, quantile } from '../game/stats';

/**
 * Reference answers for the mission, computed in TypeScript straight from the CSV. The Python
 * checks compute the same values with pandas; tests compare the two.
 */

export interface Delivery {
  city: string;
  orderHour: number;
  deliveryTime: number | null;
  rating: number | null;
}

export const DELIVERIES_CSV = resolve(__dirname, '../../public/data/deliveries.csv');

export function readDeliveries(path = DELIVERIES_CSV): { header: string[]; rows: Delivery[] } {
  const [headerLine, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const header = headerLine.split(',');
  const column = (name: string) => header.indexOf(name);
  const number = (text: string) => (text === '' ? null : Number(text));
  const rows = lines.map((line) => {
    const cells = line.split(',');
    return {
      city: cells[column('city')],
      orderHour: Number(cells[column('order_hour')]),
      deliveryTime: number(cells[column('delivery_time_min')]),
      rating: number(cells[column('rating')]),
    };
  });
  return { header, rows };
}

function groupMeans<T>(items: readonly T[], key: (item: T) => string, value: (item: T) => number) {
  const groups = new Map<string, number[]>();
  for (const item of items) {
    const values = groups.get(key(item)) ?? [];
    values.push(value(item));
    groups.set(key(item), values);
  }
  return Object.fromEntries([...groups].map(([group, values]) => [group, mean(values)]));
}

export function deliveriesReference(path = DELIVERIES_CSV) {
  const { header, rows } = readDeliveries(path);
  const clean = rows.filter((row) => row.deliveryTime !== null);
  const time = (row: Delivery) => row.deliveryTime as number;
  const times = clean.map(time);
  const q1 = quantile(times, 0.25);
  const q3 = quantile(times, 0.75);
  const lower = q1 - 1.5 * (q3 - q1);
  const upper = q3 + 1.5 * (q3 - q1);
  const inside = clean.filter((row) => time(row) >= lower && time(row) <= upper);

  const cityMean = groupMeans(clean, (row) => row.city, time);
  const cityMeanNoOutliers = groupMeans(inside, (row) => row.city, time);
  const cities = Object.keys(cityMean).sort();
  const cityMedian = Object.fromEntries(
    cities.map((city) => [city, median(clean.filter((row) => row.city === city).map(time))]),
  );
  const top = (values: Record<string, number>) =>
    Object.entries(values).sort((a, b) => b[1] - a[1])[0][0];
  const slowestCity = top(cityMeanNoOutliers);

  return {
    nOrders: rows.length,
    columns: header,
    missing: {
      delivery_time_min: rows.length - clean.length,
      rating: rows.filter((row) => row.rating === null).length,
    },
    cleanRows: clean.length,
    cities,
    cityMean,
    cityMedian,
    q1,
    q3,
    lower,
    upper,
    nOutliers: clean.length - inside.length,
    cityMeanNoOutliers,
    rawSlowestCity: top(cityMean),
    slowestCity,
    slowCityByHour: groupMeans(
      clean.filter((row) => row.city === slowestCity),
      (row) => String(row.orderHour),
      time,
    ),
  };
}
