import type { CSSProperties } from 'react';
import { useId } from 'react';
import { STATISTIC_LABELS } from '../../content';
import { captionWithUnit, formatValue } from '../../content/template';
import type { PredictRevealQuestion } from '../../content/types';
import type { PredictRevealAnswer } from '../../game/grading';
import { DotPlot } from '../charts/DotPlot';
import { paddedDomain, type DotPlotLayout } from '../charts/dotPlotLayout';
import { spreadExtents } from './revealGeometry';
import type { QuestionProps } from './types';

const LANE_Y = [16, 36] as const;

function revealDomain(question: PredictRevealQuestion): [number, number] {
  const { values } = question.dataset;
  if (question.reveal.visual === 'marker') {
    return paddedDomain([...values, question.slider.min, question.slider.max], 0.04);
  }
  return paddedDomain(values, 0.1);
}

function labelAnchor(x: number, layout: DotPlotLayout): 'start' | 'middle' | 'end' {
  if (x < layout.left + 44) return 'start';
  if (x > layout.right - 44) return 'end';
  return 'middle';
}

function LaneLabel({
  x,
  lane,
  layout,
  className,
  children,
}: {
  x: number;
  lane: 0 | 1;
  layout: DotPlotLayout;
  className: string;
  children: string;
}) {
  return (
    <text
      x={x}
      y={LANE_Y[lane]}
      textAnchor={labelAnchor(x, layout)}
      paintOrder="stroke"
      stroke="white"
      strokeWidth={4}
      className={`text-[13px] font-bold ${className}`}
    >
      {children}
    </text>
  );
}

interface OverlayProps {
  layout: DotPlotLayout;
  question: PredictRevealQuestion;
  prediction: number | null;
  reveal: boolean;
  animate: boolean;
}

function clampX(x: number, layout: DotPlotLayout) {
  return Math.min(layout.right + 10, Math.max(layout.left - 10, x));
}

function SpreadShapes({
  layout,
  question,
  prediction,
  reveal,
  animate,
  layer,
}: OverlayProps & { layer: 'behind' | 'front' }) {
  const extents = spreadExtents(question, prediction);
  if (!extents) return null;
  const { dataset } = question;
  const label = STATISTIC_LABELS[question.statistic];
  const top = layout.plotTop - 6;
  const truthFrom = clampX(layout.x(extents.truth.from), layout);
  const truthTo = clampX(layout.x(extents.truth.to), layout);

  if (layer === 'behind') {
    if (!reveal) return null;
    const growStyle: CSSProperties = {
      transformBox: 'fill-box',
      transformOrigin: 'center',
      animation: animate ? 'reveal-grow 900ms cubic-bezier(0.22, 1, 0.36, 1) both' : undefined,
    };
    return question.reveal.visual === 'range_bracket' ? (
      <path
        d={`M ${truthFrom} ${layout.axisY} V ${top + 4} H ${truthTo} V ${layout.axisY}`}
        className="fill-none stroke-slate-900"
        strokeWidth={3}
        style={growStyle}
      />
    ) : (
      <rect
        x={truthFrom}
        y={top + 4}
        width={Math.max(2, truthTo - truthFrom)}
        height={layout.axisY - top - 4}
        rx={4}
        className="fill-current-100 stroke-slate-900"
        strokeWidth={2.5}
        style={growStyle}
      />
    );
  }

  const predictedFrom = extents.predicted ? clampX(layout.x(extents.predicted.from), layout) : 0;
  const predictedTo = extents.predicted ? clampX(layout.x(extents.predicted.to), layout) : 0;
  return (
    <g>
      {extents.predicted && (
        <g>
          <rect
            x={predictedFrom}
            y={top - 2}
            width={Math.max(2, predictedTo - predictedFrom)}
            height={layout.axisY - top + 2}
            rx={6}
            className="fill-none stroke-xp-600"
            strokeWidth={2.5}
            strokeDasharray="6 4"
          />
          <LaneLabel
            x={(predictedFrom + predictedTo) / 2}
            lane={0}
            layout={layout}
            className="fill-xp-700"
          >
            {`You: ${formatValue(dataset, prediction ?? 0)}`}
          </LaneLabel>
        </g>
      )}
      {reveal && (
        <LaneLabel
          x={(truthFrom + truthTo) / 2}
          lane={1}
          layout={layout}
          className="fill-slate-900"
        >
          {`${label[0].toUpperCase()}${label.slice(1)}: ${formatValue(dataset, question.trueValue)}`}
        </LaneLabel>
      )}
    </g>
  );
}

function Markers({ layout, question, prediction, reveal, animate }: OverlayProps) {
  if (question.reveal.visual !== 'marker') return null;
  const { dataset } = question;
  const label = STATISTIC_LABELS[question.statistic];
  const trueX = layout.x(question.trueValue);
  const predictedX = prediction === null ? null : layout.x(prediction);
  const slideStyle = {
    '--slide-from': `${(predictedX ?? trueX) - trueX}px`,
    animation: animate ? 'reveal-slide 1000ms cubic-bezier(0.22, 1, 0.36, 1) both' : undefined,
  } as CSSProperties;

  return (
    <g>
      {predictedX !== null && prediction !== null && (
        <g>
          <line
            x1={predictedX}
            x2={predictedX}
            y1={LANE_Y[0] + 5}
            y2={layout.axisY}
            className="stroke-xp-600"
            strokeWidth={2.5}
            strokeDasharray="5 4"
          />
          <LaneLabel x={predictedX} lane={0} layout={layout} className="fill-xp-700">
            {`You: ${formatValue(dataset, prediction)}`}
          </LaneLabel>
        </g>
      )}
      {reveal && (
        <g style={slideStyle}>
          <line
            x1={trueX}
            x2={trueX}
            y1={LANE_Y[1] + 5}
            y2={layout.axisY}
            className="stroke-slate-900"
            strokeWidth={3}
          />
          <path d={`M ${trueX - 6} ${LANE_Y[1] + 5} h 12 l -6 8 z`} className="fill-slate-900" />
          <LaneLabel x={trueX} lane={1} layout={layout} className="fill-slate-900">
            {`${label[0].toUpperCase()}${label.slice(1)}: ${formatValue(dataset, question.trueValue)}`}
          </LaneLabel>
        </g>
      )}
    </g>
  );
}

export function PredictReveal({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
  animate,
}: QuestionProps<PredictRevealQuestion, PredictRevealAnswer>) {
  const sliderId = useId();
  const hintId = useId();
  const { dataset, slider } = question;
  const label = STATISTIC_LABELS[question.statistic];
  const prediction = answer?.value ?? null;
  const midpoint =
    slider.min + Math.round((slider.max - slider.min) / 2 / slider.step) * slider.step;
  const domain = revealDomain(question);
  const overlay = (layout: DotPlotLayout) => ({ layout, question, prediction, reveal, animate });

  return (
    <div className="space-y-5">
      <figure>
        <figcaption className="text-sm font-semibold text-slate-600">
          {captionWithUnit(dataset)}
        </figcaption>
        <DotPlot
          dataset={dataset}
          domain={domain}
          topPadding={50}
          minRows={4}
          behind={(layout) => <SpreadShapes {...overlay(layout)} layer="behind" />}
          front={(layout) => (
            <>
              <SpreadShapes {...overlay(layout)} layer="front" />
              <Markers {...overlay(layout)} />
            </>
          )}
          description={reveal ? question.reveal.description : undefined}
        />
      </figure>

      <div>
        <div className="flex items-end justify-between gap-3">
          <label htmlFor={sliderId} className="min-w-0 font-semibold text-slate-800">
            Your prediction for the {label}
          </label>
          <output
            htmlFor={sliderId}
            className="shrink-0 text-xl font-bold whitespace-nowrap text-xp-700 tabular-nums"
          >
            {prediction === null ? '–' : formatValue(dataset, prediction)}
          </output>
        </div>
        <input
          id={sliderId}
          type="range"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={prediction ?? midpoint}
          disabled={locked}
          aria-describedby={prediction === null ? hintId : undefined}
          aria-valuetext={
            prediction === null ? 'No prediction yet' : formatValue(dataset, prediction)
          }
          onChange={(event) =>
            onAnswer({ type: 'predict_reveal', value: Number(event.target.value) })
          }
          className="mt-2 block h-11 w-full cursor-pointer accent-xp-600 disabled:cursor-default"
        />
        <div aria-hidden="true" className="flex justify-between text-xs text-slate-500">
          <span>{formatValue(dataset, slider.min)}</span>
          <span>{formatValue(dataset, slider.max)}</span>
        </div>
        {prediction === null && (
          <p id={hintId} className="mt-1 text-sm text-slate-600">
            Move the slider to commit to a prediction.
          </p>
        )}
      </div>

      {reveal && prediction !== null && (
        <p className="rounded-2xl bg-slate-50 p-4 text-slate-800 ring-1 ring-slate-200">
          The {label} is{' '}
          <strong className="text-slate-900">{formatValue(dataset, question.trueValue)}</strong>.
          You predicted {formatValue(dataset, prediction)}.
        </p>
      )}
    </div>
  );
}
