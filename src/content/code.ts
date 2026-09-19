/** Helpers for code shown in questions. No React here, so validation and tests can use them. */
import type { CodeSnippet } from './types';

export const LANGUAGE_NAMES: Record<CodeSnippet['language'], string> = {
  sql: 'SQL',
  python: 'Python',
};

/** Marks the gap a fill-the-blank question's options fill. */
export const CODE_BLANK = '____';

/** The code with its blank filled by one of the options. */
export function fillBlank(code: string, option: string): string {
  return code.replace(CODE_BLANK, () => option);
}
