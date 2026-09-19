/**
 * Runs the SQL in question content against its tables, in SQLite (Node's built-in `node:sqlite`),
 * so tests can prove every SQL answer rather than trust it. Test-only: the app never runs SQL
 * outside the mission's Python worker.
 */
import { DatabaseSync } from 'node:sqlite';
import type { DataTable } from '../content/types';

export type SqlValue = string | number | null;

/**
 * The type a column gets, as pandas' `to_sql` would give it: whole numbers are INTEGER (so
 * dividing two of them is whole-number division, as in the real database), other numbers REAL,
 * anything else TEXT.
 */
function columnType(table: DataTable, column: number): 'INTEGER' | 'REAL' | 'TEXT' {
  const values = table.rows.map((row) => row[column]).filter((value) => value !== null);
  if (values.length > 0 && values.every((value) => typeof value === 'number')) {
    return values.every((value) => Number.isInteger(value)) ? 'INTEGER' : 'REAL';
  }
  return 'TEXT';
}

/** Runs one query against the tables, in a fresh in-memory database. Throws on SQL errors. */
export function runSql(tables: readonly DataTable[], query: string): SqlValue[][] {
  const db = new DatabaseSync(':memory:');
  try {
    for (const table of tables) {
      const columns = table.columns.map((name, index) => `"${name}" ${columnType(table, index)}`);
      db.exec(`CREATE TABLE "${table.caption}" (${columns.join(', ')})`);
      const insert = db.prepare(
        `INSERT INTO "${table.caption}" VALUES (${table.columns.map(() => '?').join(', ')})`,
      );
      for (const row of table.rows) insert.run(...row);
    }
    const statement = db.prepare(query);
    statement.setReturnArrays(true);
    return statement.all() as unknown as SqlValue[][];
  } finally {
    db.close();
  }
}

/** Runs a query, or says it failed, for comparing options that may not even run. */
export function tryRunSql(tables: readonly DataTable[], query: string): SqlValue[][] | Error {
  try {
    return runSql(tables, query);
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function rowKey(row: readonly SqlValue[]): string {
  return JSON.stringify(
    row.map((value) => (typeof value === 'number' ? Number(value.toFixed(9)) : value)),
  );
}

/** Whether two results hold the same rows: in the same order, or in any order. */
export function sameRows(
  a: readonly (readonly SqlValue[])[],
  b: readonly (readonly SqlValue[])[],
  ordered = false,
): boolean {
  if (a.length !== b.length) return false;
  const keysA = a.map(rowKey);
  const keysB = b.map(rowKey);
  if (!ordered) {
    keysA.sort();
    keysB.sort();
  }
  return keysA.every((key, index) => key === keysB[index]);
}
