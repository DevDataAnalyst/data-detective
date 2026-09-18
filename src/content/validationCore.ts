/** Helpers shared by the content validators. */
import type { DataTable } from './types';

export interface ValidationIssue {
  path: string;
  message: string;
}

export function countWords(text: string): number {
  return text
    .replace(/\*\*/g, '')
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export function formatIssues(issues: readonly ValidationIssue[]): string {
  return issues.map((found) => `${found.path}: ${found.message}`).join('\n');
}

export function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

export function validateTable(table: DataTable, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (table.columns.length === 0) issues.push(issue(path, 'has no columns'));
  if (table.rows.length === 0) issues.push(issue(path, 'has no rows'));
  table.rows.forEach((row, index) => {
    if (row.length !== table.columns.length) {
      issues.push(
        issue(
          `${path}.rows[${index}]`,
          `has ${row.length} cells for ${table.columns.length} columns`,
        ),
      );
    }
  });
  return issues;
}
