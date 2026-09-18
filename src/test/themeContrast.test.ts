import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * jsdom cannot measure colour contrast, so this reads the theme tokens from src/index.css and
 * checks the pairs the components actually use, in both themes: body text 4.5:1, icons 3:1.
 */
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
const darkStart = css.indexOf(":root[data-theme='dark']");
const darkBlock = css.slice(darkStart, css.indexOf('\n}', darkStart));

function tokens(text: string): Record<string, string> {
  return Object.fromEntries(
    [...text.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(([, name, value]) => [
      name,
      value.toLowerCase(),
    ]),
  );
}

// Tailwind's own slate palette, which the light theme uses as is.
const TAILWIND_SLATE = {
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
};
const light: Record<string, string> = {
  ...TAILWIND_SLATE,
  white: '#ffffff',
  ...tokens(css.slice(0, darkStart)),
};
const dark: Record<string, string> = { ...light, ...tokens(darkBlock) };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** [foreground, background] token pairs for text, which need 4.5:1. */
const TEXT_PAIRS: Array<[string, string]> = [
  ...['slate-900', 'slate-800', 'slate-700', 'slate-600', 'slate-500'].flatMap(
    (text): Array<[string, string]> => [
      [text, 'surface'],
      [text, 'slate-50'],
    ],
  ),
  ['slate-900', 'slate-100'],
  ['slate-800', 'slate-100'],
  ['slate-700', 'slate-100'],
  // The daily challenge's result heading sits straight on the page, and its closing note on teal.
  ['correct-ink-800', 'slate-50'],
  ['incorrect-ink-800', 'slate-50'],
  ['slate-900', 'current-50'],
  // Claims, chat bubbles, revealed option notes and the honest chart note.
  ['slate-900', 'streak-100'],
  ['slate-800', 'current-50'],
  ['slate-700', 'current-50'],
  ['slate-700', 'correct-50'],
  ['slate-700', 'incorrect-50'],
  ...['correct-ink-700', 'correct-ink-800', 'correct-ink-900'].flatMap(
    (text): Array<[string, string]> => [
      [text, 'correct-50'],
      [text, 'correct-100'],
      [text, 'surface'],
    ],
  ),
  ...['incorrect-ink-700', 'incorrect-ink-800', 'incorrect-ink-900'].flatMap(
    (text): Array<[string, string]> => [
      [text, 'incorrect-50'],
      [text, 'incorrect-100'],
      [text, 'surface'],
    ],
  ),
  ...['current-ink-700', 'current-ink-800'].flatMap((text): Array<[string, string]> => [
    [text, 'current-50'],
    [text, 'current-100'],
    [text, 'surface'],
    [text, 'slate-50'],
  ]),
  ['xp-ink-700', 'xp-50'],
  ['xp-ink-700', 'xp-100'],
  ['xp-ink-700', 'surface'],
  ['streak-ink-700', 'surface'],
  ['streak-ink-800', 'streak-100'],
  ['code-ink', 'code'],
  ...['keyword', 'string', 'number', 'function', 'type', 'comment'].flatMap(
    (kind): Array<[string, string]> => [
      [`syntax-${kind}`, 'surface'],
      [`syntax-${kind}`, 'current-50'],
    ],
  ),
  // White text on the solid buttons and badges.
  ['white', 'current-600'],
  ['white', 'correct-700'],
  ['white', 'incorrect-700'],
];

/** Icons and other graphics, which need 3:1. */
const ICON_PAIRS: Array<[string, string]> = [
  ['current-600', 'surface'],
  ['streak-600', 'surface'],
  ['xp-600', 'surface'],
  ['locked-500', 'locked-200'],
  ['slate-500', 'surface'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast', (_name, palette) => {
  it('gives text at least 4.5:1', () => {
    const failures = TEXT_PAIRS.filter(([text, background]) => {
      expect(palette[text], text).toBeDefined();
      expect(palette[background], background).toBeDefined();
      return contrast(palette[text], palette[background]) < 4.5;
    }).map(
      ([text, background]) =>
        `${text} on ${background}: ${contrast(palette[text], palette[background]).toFixed(2)}`,
    );
    expect(failures).toEqual([]);
  });

  it('gives icons at least 3:1', () => {
    const failures = ICON_PAIRS.filter(
      ([icon, background]) => contrast(palette[icon], palette[background]) < 3,
    ).map(
      ([icon, background]) =>
        `${icon} on ${background}: ${contrast(palette[icon], palette[background]).toFixed(2)}`,
    );
    expect(failures).toEqual([]);
  });
});

describe('dark theme tokens', () => {
  it('overrides every neutral, tint and ink token the light theme defines', () => {
    const flipped = Object.keys(tokens(darkBlock));
    const expected = Object.keys(light).filter((name) =>
      /^(slate-\d+|surface|code|code-ink|scrim|[a-z]+-(50|100|200)|[a-z]+-ink-\d+|syntax-.+)$/.test(
        name,
      ),
    );
    const missing = expected.filter(
      (name) => !flipped.includes(name) && !['slate-400'].includes(name),
    );
    expect(missing).toEqual([]);
  });
});
