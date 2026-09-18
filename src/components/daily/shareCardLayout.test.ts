import { describe, expect, it } from 'vitest';
import { dailyQuestions } from '../../content/daily';
import { dailyShareHeadline } from '../../game/daily';
import {
  CARD,
  charsPerLine,
  formatCardDate,
  layoutShareCard,
  wrapText,
  type ShareCardContent,
} from './shareCardLayout';

describe('wrapText', () => {
  it('breaks between words without passing the limit', () => {
    expect(wrapText('I spotted the lying chart in 8 seconds — can you?', 26)).toEqual([
      'I spotted the lying chart',
      'in 8 seconds — can you?',
    ]);
  });

  it('gives a word longer than a line a line of its own', () => {
    expect(wrapText('a extraordinarily b', 5)).toEqual(['a', 'extraordinarily', 'b']);
  });

  it('ends with an ellipsis when there are more lines than allowed', () => {
    expect(wrapText('one two three four five six', 9, 2)).toEqual(['one two', 'three…']);
    expect(wrapText('aaaa bbbb cccc', 4, 2)).toEqual(['aaaa', 'bbb…']);
  });
});

describe('formatCardDate', () => {
  it('writes the date the same way in every browser', () => {
    expect(formatCardDate('2026-09-19')).toBe('19 Sep 2026');
    expect(formatCardDate('2027-01-02')).toBe('2 Jan 2027');
  });
});

describe('layoutShareCard', () => {
  const link = 'data-detective-omega.vercel.app/daily';
  const cases: ShareCardContent[] = dailyQuestions.flatMap((question) =>
    [
      { correct: true, seconds: 8 },
      { correct: true, seconds: 115 },
      { correct: false, seconds: 8 },
    ].map((result) => ({
      question,
      headline: dailyShareHeadline(question.type, result),
      subtitle: 'Daily challenge #365 · 19 Sep 2027',
      link,
    })),
  );

  it('fits every daily question, whatever the result, above Ponku and the link', () => {
    for (const content of cases) {
      const layout = layoutShareCard(content);
      const label = `${content.question.id}: ${content.headline}`;
      expect(layout.panel.y + layout.panel.height, label).toBeLessThanOrEqual(CARD.panelLimit);
      expect(layout.mascot.bottom - layout.mascot.height).toBeGreaterThanOrEqual(CARD.panelLimit);
      for (const text of layout.texts) {
        // Nothing real is cut short.
        expect(text.lines.join(' '), label).not.toContain('…');
        for (const line of text.lines) {
          const right = text.x + line.length * text.size * (text.bold ? 0.58 : 0.52);
          expect(right, `${label}: ${line}`).toBeLessThanOrEqual(CARD.width - CARD.margin);
        }
      }
    }
  });

  it('keeps charts big enough to read, with a legend when there are two lines', () => {
    for (const content of cases) {
      const { chart } = layoutShareCard(content);
      if (content.question.type !== 'spot_the_lie') {
        expect(chart).toBeNull();
        continue;
      }
      expect(chart?.scale).toBeGreaterThanOrEqual(1.2);
      expect(chart?.legend).toHaveLength(content.question.chart.series.length > 1 ? 2 : 0);
    }
  });

  it('lists a case’s suspects, numbered as in the app, so anyone can take a guess', () => {
    for (const content of cases) {
      const { question } = content;
      if (question.type !== 'courtroom') continue;
      const text = layoutShareCard(content)
        .texts.flatMap((block) => block.lines)
        .join(' ');
      question.suspects.forEach((suspect, index) => {
        expect(text).toContain(`${index + 1}. ${suspect.text}`);
      });
    }
  });

  it('leaves room for the link beside Ponku', () => {
    const layout = layoutShareCard(cases[0]);
    const linkText = layout.texts.find((text) => text.lines[0] === link);
    expect(linkText).toBeDefined();
    const linkEnd = CARD.margin + link.length * 30 * 0.58;
    // Ponku is at most as wide as he is tall.
    expect(linkEnd).toBeLessThan(layout.mascot.right - layout.mascot.height);
    expect(charsPerLine(CARD.width - CARD.margin * 2, 60, true)).toBeGreaterThanOrEqual(25);
  });
});
