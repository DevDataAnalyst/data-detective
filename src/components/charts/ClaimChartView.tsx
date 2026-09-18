import type { ClaimChart } from '../../content/types';
import { useElementWidth } from '../hooks';
import {
  axisValue,
  describeClaimChart,
  layoutClaimChart,
  SERIES_DASHES,
  type ClaimChartLayout,
} from './claimChartLayout';

const SERIES_STYLES = [
  { fill: 'fill-current-600', stroke: 'stroke-current-600', dash: SERIES_DASHES[0] },
  { fill: 'fill-streak-600', stroke: 'stroke-streak-600', dash: SERIES_DASHES[1] },
] as const;

/**
 * Fixed colours for a chart drawn outside the page, such as on a share card saved as an image,
 * where the theme's classes do not apply. Without one, the chart follows the theme.
 */
export interface ChartPalette {
  /** Category labels under the chart. */
  text: string;
  /** Axis labels and tick values. */
  muted: string;
  grid: string;
  baseline: string;
  /** Background behind the chart, used to outline line points. */
  surface: string;
  series: readonly [string, string];
}

/** A bar or line chart drawn exactly as specified, including any misleading choices. */
export function ClaimChartView({ chart }: { chart: ClaimChart }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const layout = layoutClaimChart(chart, width);

  return (
    <figure className="space-y-2">
      <figcaption className="font-bold text-slate-900">{chart.title}</figcaption>
      <div ref={ref} className="w-full">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block h-auto max-w-full overflow-visible"
          role="img"
          aria-label={describeClaimChart(chart)}
        >
          <ClaimChartShapes chart={chart} layout={layout} />
        </svg>
      </div>
      {chart.series.length > 1 && (
        <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
          {chart.series.map((series, seriesIndex) => {
            const style = SERIES_STYLES[seriesIndex % SERIES_STYLES.length];
            return (
              <li key={series.name} className="flex items-center gap-1.5">
                <svg width={24} height={10} viewBox="0 0 24 10">
                  <line
                    x1={1}
                    x2={23}
                    y1={5}
                    y2={5}
                    strokeWidth={3}
                    strokeDasharray={style.dash}
                    className={style.stroke}
                  />
                </svg>
                {series.name}
                {series.axis === 'right' && ' (right axis)'}
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}

/** How each part of the chart is painted: by theme classes, or by a palette's fixed colours. */
function chartPaint(palette: ChartPalette | undefined) {
  if (!palette) {
    return {
      axisLabel: { className: 'fill-slate-600 text-[11px] font-semibold' },
      tick: { className: 'fill-slate-600 text-[11px] tabular-nums' },
      grid: { className: 'stroke-slate-200' },
      baseline: { className: 'stroke-slate-400' },
      category: { className: 'fill-slate-700 text-[11px]' },
      bar: (index: number) => ({ className: SERIES_STYLES[index % SERIES_STYLES.length].fill }),
      line: (index: number) => ({ className: SERIES_STYLES[index % SERIES_STYLES.length].stroke }),
      point: (index: number) => ({
        className: `${SERIES_STYLES[index % SERIES_STYLES.length].fill} stroke-surface`,
      }),
    };
  }
  const color = (index: number) => palette.series[index % palette.series.length];
  return {
    axisLabel: { fill: palette.muted, fontSize: 11, fontWeight: 600 },
    tick: { fill: palette.muted, fontSize: 11 },
    grid: { stroke: palette.grid },
    baseline: { stroke: palette.baseline },
    category: { fill: palette.text, fontSize: 11 },
    bar: (index: number) => ({ fill: color(index) }),
    line: (index: number) => ({ stroke: color(index) }),
    point: (index: number) => ({ fill: color(index), stroke: palette.surface }),
  };
}

interface ClaimChartShapesProps {
  chart: ClaimChart;
  layout: ClaimChartLayout;
  /** Fixed colours instead of the theme's, for drawing the chart into an image. */
  palette?: ChartPalette;
}

/** The chart's axes, bars, lines and labels, to place inside an `<svg>` of the layout's size. */
export function ClaimChartShapes({ chart, layout, palette }: ClaimChartShapesProps) {
  const paint = chartPaint(palette);
  const { rightAxis } = chart;
  const leftSeries = chart.series.filter((series) => series.axis !== 'right');
  const barWidth = Math.max(6, Math.min(40, (layout.band * 0.7) / Math.max(1, leftSeries.length)));

  return (
    <g>
      <text x={0} y={12} {...paint.axisLabel}>
        {chart.axis.label}
      </text>
      {rightAxis && (
        <text x={layout.width} y={12} textAnchor="end" {...paint.axisLabel}>
          {rightAxis.label}
        </text>
      )}

      {layout.leftTicks.map((tick) => (
        <g key={`left-${tick}`}>
          <line
            x1={layout.plotLeft}
            x2={layout.plotRight}
            y1={layout.y(tick)}
            y2={layout.y(tick)}
            {...paint.grid}
          />
          <text x={layout.plotLeft - 6} y={layout.y(tick) + 4} textAnchor="end" {...paint.tick}>
            {axisValue(chart.axis, tick)}
          </text>
        </g>
      ))}
      {rightAxis &&
        layout.rightTicks.map((tick) => (
          <text
            key={`right-${tick}`}
            x={layout.plotRight + 6}
            y={layout.y(tick, 'right') + 4}
            {...paint.tick}
          >
            {axisValue(rightAxis, tick)}
          </text>
        ))}

      <line
        x1={layout.plotLeft}
        x2={layout.plotRight}
        y1={layout.plotBottom}
        y2={layout.plotBottom}
        strokeWidth={1.5}
        {...paint.baseline}
      />

      {chart.series.map((series, seriesIndex) => {
        const axis = series.axis === 'right' ? 'right' : 'left';
        if (chart.kind === 'bar' && axis === 'left') {
          const slot = leftSeries.indexOf(series);
          const offset = (slot - (leftSeries.length - 1) / 2) * barWidth;
          return (
            <g key={series.name}>
              {layout.indices.map((pointIndex, position) => {
                const top = layout.y(series.values[pointIndex]);
                return (
                  <rect
                    key={pointIndex}
                    x={layout.x(position) + offset - barWidth / 2}
                    y={top}
                    width={barWidth - 2}
                    height={Math.max(0, layout.plotBottom - top)}
                    rx={2}
                    {...paint.bar(seriesIndex)}
                  />
                );
              })}
            </g>
          );
        }
        const points = layout.indices.map(
          (pointIndex, position) =>
            `${layout.x(position)},${layout.y(series.values[pointIndex], axis)}`,
        );
        return (
          <g key={series.name}>
            <polyline
              points={points.join(' ')}
              fill="none"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeDasharray={SERIES_DASHES[seriesIndex % SERIES_DASHES.length]}
              {...paint.line(seriesIndex)}
            />
            {layout.indices.map((pointIndex, position) => (
              <circle
                key={pointIndex}
                cx={layout.x(position)}
                cy={layout.y(series.values[pointIndex], axis)}
                r={4}
                strokeWidth={1.5}
                {...paint.point(seriesIndex)}
              />
            ))}
          </g>
        );
      })}

      {layout.labelled.map((position) => (
        <text
          key={position}
          x={layout.x(position)}
          y={layout.plotBottom + 18}
          textAnchor="middle"
          {...paint.category}
        >
          {chart.labels[layout.indices[position]]}
        </text>
      ))}
    </g>
  );
}
