import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Reference answers for "The False Alarm", computed in TypeScript straight from the CSV. The
 * Python checks compute the same values with pandas; tests compare the two, and Unit 2's content
 * quotes these numbers.
 */

export interface ChurnRow {
  month: string;
  segment: string;
  subscribersStart: number;
  newSignups: number;
  cancelled: number;
}

export const CHURN_CSV = resolve(__dirname, '../../public/data/churn.csv');

export function readChurn(path = CHURN_CSV): { header: string[]; rows: ChurnRow[] } {
  const [headerLine, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const header = headerLine.split(',');
  const column = (name: string) => header.indexOf(name);
  const rows = lines.map((line) => {
    const cells = line.split(',');
    return {
      month: cells[column('month')],
      segment: cells[column('segment')],
      subscribersStart: Number(cells[column('subscribers_start')]),
      newSignups: Number(cells[column('new_signups')]),
      cancelled: Number(cells[column('cancelled')]),
    };
  });
  return { header, rows };
}

/** Cancelled ÷ subscribers at the start, over all the rows given. */
export function churnRate(rows: readonly ChurnRow[]): number {
  const cancelled = rows.reduce((sum, row) => sum + row.cancelled, 0);
  const subscribers = rows.reduce((sum, row) => sum + row.subscribersStart, 0);
  return cancelled / subscribers;
}

const byKey = <T>(items: readonly T[], key: (item: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
};

export function churnReference(path = CHURN_CSV) {
  const { header, rows } = readChurn(path);
  const months = [...new Set(rows.map((row) => row.month))].sort();
  const lastMonth = months.at(-1) as string;
  const byMonth = byKey(rows, (row) => row.month);
  const inMonth = (month: string) => byMonth.get(month) ?? [];
  const earlier = rows.filter((row) => row.month !== lastMonth);
  const segments = [...new Set(rows.map((row) => row.segment))].sort();

  const monthlyRates = Object.fromEntries(
    months.map((month) => [month, churnRate(inMonth(month))]),
  );
  const monthlyCancelled = Object.fromEntries(
    months.map((month) => [month, inMonth(month).reduce((sum, row) => sum + row.cancelled, 0)]),
  );
  const earlierRates = months.slice(0, -1).map((month) => monthlyRates[month]);

  const segmentRate = (month: string | null, segment: string) =>
    churnRate(
      rows.filter((row) => row.segment === segment && (month === null || row.month === month)),
    );
  const aprils = months.filter((month) => month.endsWith('-04'));

  return {
    header,
    rows: rows.length,
    months,
    lastMonth,
    segments,
    lastCancelled: monthlyCancelled[lastMonth],
    lastSubscribers: inMonth(lastMonth).reduce((sum, row) => sum + row.subscribersStart, 0),
    lastRate: monthlyRates[lastMonth],
    /** Every earlier month pooled: all cancellations ÷ all subscriber-months. */
    baseRate: churnRate(earlier),
    /** The same, as the average of the monthly rates. */
    baseRateMeanOfMonths: earlierRates.reduce((sum, rate) => sum + rate, 0) / earlierRates.length,
    monthlyRates,
    monthlyCancelled,
    segmentRatesLast: Object.fromEntries(
      segments.map((segment) => [segment, segmentRate(lastMonth, segment)]),
    ),
    segmentBaseRates: Object.fromEntries(
      segments.map((segment) => [
        segment,
        churnRate(earlier.filter((row) => row.segment === segment)),
      ]),
    ),
    studentAprilRates: Object.fromEntries(
      aprils.map((month) => [month, segmentRate(month, 'student')]),
    ),
    studentOtherRate: churnRate(
      rows.filter((row) => row.segment === 'student' && !row.month.endsWith('-04')),
    ),
    aprilRatesBySegment: Object.fromEntries(
      aprils.map((month) => [
        month,
        Object.fromEntries(segments.map((segment) => [segment, segmentRate(month, segment)])),
      ]),
    ),
    /** The last 24 monthly rates as percentages to one decimal place, as lesson 7 shows them. */
    recentRatesPercent: months
      .slice(-24)
      .map((month) => Math.round(monthlyRates[month] * 1000) / 10),
    recentMonths: months.slice(-24),
  };
}
