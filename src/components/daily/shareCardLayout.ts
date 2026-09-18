/**
 * Layout maths for the daily challenge's share card: a 1080 × 1350 image (4:5, the shape phones
 * show best in chats and feeds). Pure, so tests can check every daily question fits the card.
 * SVG text does not wrap, so lines are broken here using a cautious estimate of glyph widths.
 */
import type { DailyQuestion } from '../../content/daily';
import type { ClaimChart } from '../../content/types';
import { CLAIM_CHART, layoutClaimChart, type ClaimChartLayout } from '../charts/claimChartLayout';
import type { ChartPalette } from '../charts/ClaimChartView';

export const CARD = {
  width: 1080,
  height: 1350,
  margin: 72,
  bandHeight: 160,
  panelPadding: 44,
  /** The panel must end above this, clear of Ponku and the link at the bottom. */
  panelLimit: 1090,
} as const;

/** The app's font stack. Images drawn from SVG cannot load web fonts, so it stays a system one. */
export const CARD_FONT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'Helvetica Neue', Arial, sans-serif";

/** Ponku's palette, fixed so the image looks the same whatever theme the page is in. */
export const CARD_COLORS = {
  page: '#feecdc',
  band: '#0e7d7e',
  bandText: '#ffffff',
  bandMuted: '#d3f2f1',
  ink: '#40291e',
  body: '#56402f',
  panel: '#ffffff',
  panelEdge: '#eed8c4',
  accent: '#c2412b',
  link: '#0b6a6b',
} as const;

export const CARD_CHART_PALETTE: ChartPalette = {
  text: '#56402f',
  muted: '#6a4e3c',
  grid: '#eed8c4',
  baseline: '#bb9a80',
  surface: '#ffffff',
  series: ['#0e7d7e', '#e85d44'],
};

/** Average glyph width as a share of the font size. Generous, so real text fits comfortably. */
const GLYPH_WIDTH = { regular: 0.52, bold: 0.58 } as const;

/** How many characters of this size fit across `width`. */
export function charsPerLine(width: number, fontSize: number, bold: boolean): number {
  return Math.floor(width / (fontSize * GLYPH_WIDTH[bold ? 'bold' : 'regular']));
}

/**
 * Breaks text into lines of at most `maxChars`, between words. A word longer than a line gets a
 * line to itself. Beyond `maxLines`, the last line ends with an ellipsis.
 */
export function wrapText(text: string, maxChars: number, maxLines = Infinity): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= maxChars) line = `${line} ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = `${last.length >= maxChars ? last.slice(0, maxChars - 1).trimEnd() : last}…`;
  return kept;
}

export interface CardText {
  lines: string[];
  x: number;
  /** Baseline of the first line. */
  y: number;
  size: number;
  lineHeight: number;
  bold: boolean;
  color: string;
  letterSpacing?: number;
}

interface TextStyle {
  size: number;
  lineHeight: number;
  bold: boolean;
  color: string;
  letterSpacing?: number;
  maxLines?: number;
}

/** Lays out a text block whose top edge is at `top`, and says where its bottom edge is. */
function textBlock(
  text: string,
  x: number,
  top: number,
  width: number,
  style: TextStyle,
): { block: CardText; bottom: number } {
  const lines = wrapText(text, charsPerLine(width, style.size, style.bold), style.maxLines);
  const block: CardText = {
    lines,
    x,
    y: top + Math.round(style.size * 0.8),
    size: style.size,
    lineHeight: style.lineHeight,
    bold: style.bold,
    color: style.color,
    letterSpacing: style.letterSpacing,
  };
  return { block, bottom: top + (lines.length - 1) * style.lineHeight + style.size };
}

export interface CardChart {
  chart: ClaimChart;
  x: number;
  y: number;
  scale: number;
  layout: ClaimChartLayout;
  /** One row per series when there are two, since the colours alone would not say which is which. */
  legend: Array<{ name: string; x: number; y: number; seriesIndex: number }>;
}

export interface ShareCardLayout {
  texts: CardText[];
  panel: { x: number; y: number; width: number; height: number };
  chart: CardChart | null;
  /** Ponku stands in the bottom right corner: where his right and bottom edges go, and his height. */
  mascot: { right: number; bottom: number; height: number };
}

export interface ShareCardContent {
  question: DailyQuestion;
  headline: string;
  /** e.g. "Daily challenge #1 · 19 Sep 2026" */
  subtitle: string;
  /** The link people can follow to play, shown without https://. */
  link: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-19" as "19 Sep 2026". Written out by hand so every browser shows the same thing. */
export function formatCardDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** The chart may shrink to fit a long claim, but never below this. */
const MIN_CHART_SCALE = 1.2;
const MAX_CHART_SCALE = 1.9;

export function layoutShareCard(content: ShareCardContent): ShareCardLayout {
  const { width, height, margin, bandHeight, panelPadding, panelLimit } = CARD;
  const inner = width - margin * 2;
  const texts: CardText[] = [
    {
      lines: ['Data Detective'],
      x: margin,
      y: 86,
      size: 40,
      lineHeight: 48,
      bold: true,
      color: CARD_COLORS.bandText,
    },
    {
      lines: [content.subtitle],
      x: margin,
      y: 130,
      size: 28,
      lineHeight: 34,
      bold: false,
      color: CARD_COLORS.bandMuted,
    },
  ];

  const headline = textBlock(content.headline, margin, bandHeight + 50, inner, {
    size: 60,
    lineHeight: 72,
    bold: true,
    color: CARD_COLORS.ink,
    maxLines: 3,
  });
  texts.push(headline.block);

  const panelTop = headline.bottom + 40;
  const x = margin + panelPadding;
  const textWidth = inner - panelPadding * 2;
  let top = panelTop + 40;
  let chart: CardChart | null = null;
  const add = (text: string, gapAfter: number, style: TextStyle) => {
    const placed = textBlock(text, x, top, textWidth, style);
    texts.push(placed.block);
    top = placed.bottom + gapAfter;
  };

  const { question } = content;
  if (question.type === 'spot_the_lie') {
    add(`${question.claim.by} says`, 14, {
      size: 26,
      lineHeight: 32,
      bold: true,
      color: CARD_COLORS.accent,
      maxLines: 1,
    });
    add(`“${question.claim.text}”`, 30, {
      size: 36,
      lineHeight: 46,
      bold: true,
      color: CARD_COLORS.ink,
      maxLines: 3,
    });
    add(question.chart.title, 14, {
      size: 26,
      lineHeight: 32,
      bold: true,
      color: CARD_COLORS.body,
      maxLines: 1,
    });
    const legend: CardChart['legend'] = [];
    if (question.chart.series.length > 1) {
      question.chart.series.forEach((series, seriesIndex) => {
        legend.push({
          name: series.axis === 'right' ? `${series.name} (right axis)` : series.name,
          x,
          y: top + 22,
          seriesIndex,
        });
        top += 34;
      });
      top += 10;
    }
    const room = panelLimit - panelPadding - top;
    const scale = Math.max(MIN_CHART_SCALE, Math.min(MAX_CHART_SCALE, room / CLAIM_CHART.height));
    chart = {
      chart: question.chart,
      x,
      y: top,
      scale,
      layout: layoutClaimChart(question.chart, textWidth / scale),
      legend,
    };
    top += CLAIM_CHART.height * scale + panelPadding;
  } else {
    add('THE EVIDENCE', 16, {
      size: 24,
      lineHeight: 30,
      bold: true,
      color: CARD_COLORS.accent,
      letterSpacing: 3,
      maxLines: 1,
    });
    add(question.evidence, 26, {
      size: 38,
      lineHeight: 50,
      bold: true,
      color: CARD_COLORS.ink,
      maxLines: 4,
    });
    for (const witness of question.witnesses) {
      add(witness.name, 8, {
        size: 26,
        lineHeight: 32,
        bold: true,
        color: CARD_COLORS.link,
        maxLines: 1,
      });
      add(`“${witness.claim}”`, 20, {
        size: 28,
        lineHeight: 38,
        bold: false,
        color: CARD_COLORS.body,
        maxLines: 3,
      });
    }
    // The options, numbered as in the app, so whoever sees the card can take a guess.
    add('THE SUSPECTS', 12, {
      size: 24,
      lineHeight: 30,
      bold: true,
      color: CARD_COLORS.accent,
      letterSpacing: 3,
      maxLines: 1,
    });
    question.suspects.forEach((suspect, index) => {
      add(`${index + 1}. ${suspect.text}`, index === question.suspects.length - 1 ? 24 : 8, {
        size: 28,
        lineHeight: 36,
        bold: false,
        color: CARD_COLORS.ink,
        maxLines: 2,
      });
    });
    add('Who’s really behind it?', 40, {
      size: 34,
      lineHeight: 42,
      bold: true,
      color: CARD_COLORS.accent,
      maxLines: 1,
    });
  }

  texts.push(
    {
      lines: ['Play today’s challenge at'],
      x: margin,
      y: height - 110,
      size: 28,
      lineHeight: 34,
      bold: false,
      color: CARD_COLORS.body,
    },
    {
      lines: [content.link],
      x: margin,
      y: height - 66,
      size: 30,
      lineHeight: 36,
      bold: true,
      color: CARD_COLORS.link,
    },
  );

  return {
    texts,
    panel: { x: margin, y: panelTop, width: inner, height: top - panelTop },
    chart,
    mascot: { right: width - margin, bottom: height - 40, height: 210 },
  };
}
