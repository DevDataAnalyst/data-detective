import type { ReactNode } from 'react';
import type { NumberDataset } from '../../content/types';
import { formatNumber } from '../../content/template';
import { useElementWidth } from '../hooks';
import { describeDataset } from './describe';
import { layoutDotPlot, type DotPlotLayout } from './dotPlotLayout';

export function Axis({ layout }: { layout: DotPlotLayout }) {
  return (
    <g aria-hidden="true">
      <line
        x1={layout.left - 8}
        x2={layout.right + 8}
        y1={layout.axisY}
        y2={layout.axisY}
        className="stroke-slate-400"
        strokeWidth={1.5}
      />
      {layout.ticks.map((tick) => {
        const x = layout.x(tick);
        return (
          <g key={tick}>
            <line
              x1={x}
              x2={x}
              y1={layout.axisY}
              y2={layout.axisY + 5}
              className="stroke-slate-400"
            />
            <text
              x={x}
              y={layout.axisY + 19}
              textAnchor="middle"
              className="fill-slate-600 text-[12px]"
            >
              {formatNumber(tick)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface DotPlotProps {
  dataset: NumberDataset;
  domain?: [number, number];
  /** Space above the dots for labels drawn by overlays. */
  topPadding?: number;
  /** Drawn behind the dots, e.g. bands and boxes. */
  behind?: (layout: DotPlotLayout) => ReactNode;
  /** Drawn on top of the dots, e.g. markers. */
  front?: (layout: DotPlotLayout) => ReactNode;
  /** Extra text for screen readers, e.g. what a reveal shows. */
  description?: string;
  /** Keeps the plot at least this many dot rows tall. */
  minRows?: number;
}

/** A static dot plot. Dots with equal or close values stack upwards. */
export function DotPlot({
  dataset,
  domain,
  topPadding = 6,
  behind,
  front,
  description,
  minRows = 2,
}: DotPlotProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const layout = layoutDotPlot({
    values: dataset.values,
    width,
    domain,
    rowHeight: 14,
    minGap: 14,
    sidePadding: 16,
    topPadding,
    minRows,
  });

  return (
    <div ref={ref} className="w-full">
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block h-auto max-w-full overflow-visible"
        role="img"
        aria-label={[describeDataset(dataset), description].filter(Boolean).join(' ')}
      >
        {behind?.(layout)}
        <Axis layout={layout} />
        {layout.dots.map((dot) => (
          <circle
            key={dot.index}
            cx={dot.cx}
            cy={dot.cy}
            r={6}
            className="fill-current-600 stroke-white"
            strokeWidth={1.5}
          />
        ))}
        {front?.(layout)}
      </svg>
    </div>
  );
}
