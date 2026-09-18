import type { Ref } from 'react';
import { ClaimChartShapes } from '../charts/ClaimChartView';
import {
  CARD,
  CARD_CHART_PALETTE,
  CARD_COLORS,
  CARD_FONT,
  layoutShareCard,
  type CardText,
  type ShareCardContent,
} from './shareCardLayout';
import { mascotPlacement, type MascotPlacement } from './shareImage';

interface ShareCardProps extends ShareCardContent {
  /** Ponku's pose on the card. */
  mascot: MascotPlacement['pose'];
  ref?: Ref<SVGSVGElement>;
}

/**
 * The result card people share, drawn as SVG with fixed colours so the saved image matches what
 * the page shows. It scales to fit its container; `renderShareImage` turns it into a PNG.
 */
export function ShareCard({ ref, mascot, ...content }: ShareCardProps) {
  const layout = layoutShareCard(content);
  const ponku = mascotPlacement(mascot, layout.mascot);
  const { chart, panel } = layout;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={CARD.width}
      height={CARD.height}
      viewBox={`0 0 ${CARD.width} ${CARD.height}`}
      fontFamily={CARD_FONT}
      role="img"
      aria-label={`${content.headline} ${content.subtitle}. Play at ${content.link}`}
      className="block h-auto w-full"
    >
      <rect width={CARD.width} height={CARD.height} fill={CARD_COLORS.page} />
      <rect width={CARD.width} height={CARD.bandHeight} fill={CARD_COLORS.band} />
      <rect
        x={panel.x}
        y={panel.y}
        width={panel.width}
        height={panel.height}
        rx={36}
        fill={CARD_COLORS.panel}
        stroke={CARD_COLORS.panelEdge}
        strokeWidth={3}
      />
      {layout.texts.map((text, index) => (
        <CardTextLines key={index} text={text} />
      ))}
      {chart && (
        <>
          {chart.legend.map((item) => (
            <g key={item.name}>
              <line
                x1={item.x}
                x2={item.x + 40}
                y1={item.y - 8}
                y2={item.y - 8}
                stroke={CARD_CHART_PALETTE.series[item.seriesIndex]}
                strokeWidth={5}
                // The chart's second line is dashed; this matches it at the chart's scale.
                strokeDasharray={item.seriesIndex === 1 ? '11 8' : undefined}
                strokeLinecap="round"
              />
              <text x={item.x + 54} y={item.y} fontSize={24} fill={CARD_COLORS.body}>
                {item.name}
              </text>
            </g>
          ))}
          <g transform={`translate(${chart.x} ${chart.y}) scale(${chart.scale})`}>
            <ClaimChartShapes
              chart={chart.chart}
              layout={chart.layout}
              palette={CARD_CHART_PALETTE}
            />
          </g>
        </>
      )}
      {/* Drawn into the image separately: an SVG turned into an image cannot load pictures. */}
      <image
        data-share-mascot=""
        href={ponku.src}
        x={ponku.x}
        y={ponku.y}
        width={ponku.width}
        height={ponku.height}
      />
    </svg>
  );
}

function CardTextLines({ text }: { text: CardText }) {
  return (
    <>
      {text.lines.map((line, index) => (
        <text
          key={index}
          x={text.x}
          y={text.y + index * text.lineHeight}
          fontSize={text.size}
          fontWeight={text.bold ? 700 : 400}
          letterSpacing={text.letterSpacing}
          fill={text.color}
        >
          {line}
        </text>
      ))}
    </>
  );
}
