import { captionWithUnit, formatNumber, formatValue } from '../../content/template';
import type { TapOutlierQuestion } from '../../content/types';
import type { TapOutlierAnswer } from '../../game/grading';
import { iqrFences } from '../../game/stats';
import { describeDataset } from '../charts/describe';
import { Axis } from '../charts/DotPlot';
import { layoutDotPlot } from '../charts/dotPlotLayout';
import { useElementWidth } from '../hooks';
import type { QuestionProps } from './types';

type DotState = 'idle' | 'selected' | 'found' | 'missed' | 'wrong' | 'neutral';

function dotState(isSelected: boolean, isOutlier: boolean, reveal: boolean): DotState {
  if (!reveal) return isSelected ? 'selected' : 'idle';
  if (isOutlier) return isSelected ? 'found' : 'missed';
  return isSelected ? 'wrong' : 'neutral';
}

const STATE_TEXT: Partial<Record<DotState, string>> = {
  found: ', outlier you found',
  missed: ', outlier you missed',
  wrong: ', not an outlier',
};

const TARGET = 44;

export function TapOutlier({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
}: QuestionProps<TapOutlierQuestion, TapOutlierAnswer>) {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const { dataset } = question;
  const selected = new Set(answer?.selectedIndices ?? []);
  const outliers = new Set(question.outlierIndices);
  const layout = layoutDotPlot({
    values: dataset.values,
    width,
    rowHeight: TARGET,
    minGap: TARGET,
    sidePadding: TARGET / 2,
    topPadding: 26,
  });
  const fences = iqrFences(dataset.values);
  const visibleFences = [
    { value: fences.lower, name: 'Lower fence' },
    { value: fences.upper, name: 'Upper fence' },
  ].filter(({ value }) => value >= layout.domain[0] && value <= layout.domain[1]);

  const toggle = (index: number) => {
    if (locked) return;
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    onAnswer(
      next.size === 0
        ? null
        : { type: 'tap_outlier', selectedIndices: [...next].sort((a, b) => a - b) },
    );
  };

  const states = layout.dots.map((dot) =>
    dotState(selected.has(dot.index), outliers.has(dot.index), reveal),
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-600">{captionWithUnit(dataset)}</p>
      <div ref={ref} className="w-full">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block h-auto max-w-full overflow-visible"
          role="group"
          aria-label={`${describeDataset(dataset)} Select the values you think are outliers.`}
        >
          {reveal &&
            visibleFences.map((fence) => {
              const x = layout.x(fence.value);
              return (
                <g key={fence.name} aria-hidden="true">
                  <line
                    x1={x}
                    x2={x}
                    y1={18}
                    y2={layout.axisY}
                    className="stroke-slate-500"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={x}
                    y={12}
                    textAnchor={
                      x < layout.left + 50 ? 'start' : x > layout.right - 50 ? 'end' : 'middle'
                    }
                    className="fill-slate-600 text-[11px] font-semibold"
                  >
                    {`fence ${formatNumber(fence.value)}`}
                  </text>
                </g>
              );
            })}
          <Axis layout={layout} />
          {layout.dots.map((dot, position) => {
            const state = states[position];
            const isSelected = selected.has(dot.index);
            return (
              <g
                key={dot.index}
                role="checkbox"
                aria-checked={isSelected}
                aria-disabled={locked || undefined}
                aria-label={`${formatValue(dataset, dot.value)}${STATE_TEXT[state] ?? ''}`}
                tabIndex={locked ? -1 : 0}
                onClick={() => toggle(dot.index)}
                onKeyDown={(event) => {
                  if (event.key === ' ') {
                    event.preventDefault();
                    toggle(dot.index);
                  }
                }}
                className={`group outline-none ${locked ? '' : 'cursor-pointer'}`}
              >
                <rect
                  x={dot.cx - TARGET / 2}
                  y={dot.cy - TARGET / 2}
                  width={TARGET}
                  height={TARGET}
                  fill="transparent"
                />
                <circle
                  cx={dot.cx}
                  cy={dot.cy}
                  r={19}
                  className="fill-none stroke-current-600 opacity-0 group-focus-visible:opacity-100"
                  strokeWidth={3}
                />
                <DotMark state={state} cx={dot.cx} cy={dot.cy} />
                {(state === 'found' || state === 'missed') && (
                  <text
                    x={dot.cx}
                    y={dot.cy - 15}
                    textAnchor="middle"
                    paintOrder="stroke"
                    stroke="white"
                    strokeWidth={3}
                    className="fill-correct-800 text-[11px] font-bold"
                    aria-hidden="true"
                  >
                    {formatNumber(dot.value)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {!reveal && (
        <p className="text-sm text-slate-600" aria-live="polite">
          {selected.size === 0
            ? 'Tap a dot to select it. Tap again to unselect.'
            : `${selected.size} selected`}
        </p>
      )}

      {reveal && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
          {states.includes('found') && <LegendItem state="found" text="Outlier you found" />}
          {states.includes('missed') && <LegendItem state="missed" text="Outlier you missed" />}
          {states.includes('wrong') && <LegendItem state="wrong" text="Not an outlier" />}
        </ul>
      )}
    </div>
  );
}

function DotMark({ state, cx, cy }: { state: DotState; cx: number; cy: number }) {
  switch (state) {
    case 'idle':
      return (
        <circle cx={cx} cy={cy} r={9} className="fill-slate-500 stroke-white" strokeWidth={2} />
      );
    case 'neutral':
      return <circle cx={cx} cy={cy} r={8} className="fill-slate-300" />;
    case 'selected':
    case 'found':
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={12}
            className={state === 'selected' ? 'fill-current-600' : 'fill-correct-700'}
          />
          <path
            d={`M ${cx - 5} ${cy} l 3.5 3.5 l 6.5 -7`}
            className="fill-none stroke-white"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'missed':
      return (
        <circle
          cx={cx}
          cy={cy}
          r={11}
          className="fill-white stroke-correct-700"
          strokeWidth={2.5}
          strokeDasharray="4 3"
        />
      );
    case 'wrong':
      return (
        <g>
          <circle cx={cx} cy={cy} r={12} className="fill-incorrect-700" />
          <path
            d={`M ${cx - 4} ${cy - 4} l 8 8 M ${cx + 4} ${cy - 4} l -8 8`}
            className="stroke-white"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>
      );
  }
}

function LegendItem({ state, text }: { state: DotState; text: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <svg width={26} height={26} viewBox="0 0 26 26" aria-hidden="true">
        <DotMark state={state} cx={13} cy={13} />
      </svg>
      {text}
    </li>
  );
}
