import type { ClaimChart } from '../../content/types';
import { useElementWidth } from '../hooks';
import { axisValue, describeClaimChart, layoutClaimChart } from './claimChartLayout';

const SERIES_STYLES = [
  { fill: 'fill-current-600', stroke: 'stroke-current-600', dash: undefined },
  { fill: 'fill-streak-600', stroke: 'stroke-streak-600', dash: '6 4' },
] as const;

/** A bar or line chart drawn exactly as specified, including any misleading choices. */
export function ClaimChartView({ chart }: { chart: ClaimChart }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const layout = layoutClaimChart(chart, width);
  const { rightAxis } = chart;
  const leftSeries = chart.series.filter((series) => series.axis !== 'right');
  const barWidth = Math.max(6, Math.min(40, (layout.band * 0.7) / Math.max(1, leftSeries.length)));

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
          <text x={0} y={12} className="fill-slate-600 text-[11px] font-semibold">
            {chart.axis.label}
          </text>
          {rightAxis && (
            <text
              x={layout.width}
              y={12}
              textAnchor="end"
              className="fill-slate-600 text-[11px] font-semibold"
            >
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
                className="stroke-slate-200"
              />
              <text
                x={layout.plotLeft - 6}
                y={layout.y(tick) + 4}
                textAnchor="end"
                className="fill-slate-600 text-[11px] tabular-nums"
              >
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
                className="fill-slate-600 text-[11px] tabular-nums"
              >
                {axisValue(rightAxis, tick)}
              </text>
            ))}

          <line
            x1={layout.plotLeft}
            x2={layout.plotRight}
            y1={layout.plotBottom}
            y2={layout.plotBottom}
            className="stroke-slate-400"
            strokeWidth={1.5}
          />

          {chart.series.map((series, seriesIndex) => {
            const style = SERIES_STYLES[seriesIndex % SERIES_STYLES.length];
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
                        className={style.fill}
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
                  strokeDasharray={style.dash}
                  className={style.stroke}
                />
                {layout.indices.map((pointIndex, position) => (
                  <circle
                    key={pointIndex}
                    cx={layout.x(position)}
                    cy={layout.y(series.values[pointIndex], axis)}
                    r={4}
                    className={`${style.fill} stroke-surface`}
                    strokeWidth={1.5}
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
              className="fill-slate-700 text-[11px]"
            >
              {chart.labels[layout.indices[position]]}
            </text>
          ))}
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
