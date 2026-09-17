import { useId, useState } from 'react';
import { STATISTIC_LABELS } from '../../content';
import { formatNumber, formatValue } from '../../content/template';
import type { NumericEstimateQuestion } from '../../content/types';
import { parseLearnerNumber, type NumericEstimateAnswer } from '../../game/grading';
import { DatasetView } from '../data/DatasetView';
import type { QuestionProps } from './types';

export function NumericEstimate({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
}: QuestionProps<NumericEstimateQuestion, NumericEstimateAnswer>) {
  const inputId = useId();
  const hintId = useId();
  const [text, setText] = useState(answer ? String(answer.value) : '');
  const { dataset } = question;
  const statistic = STATISTIC_LABELS[question.statistic];

  return (
    <div className="space-y-5">
      <DatasetView dataset={dataset} />

      <div>
        <label htmlFor={inputId} className="block font-semibold text-slate-800">
          Your estimate of the {statistic}
        </label>
        <div className="mt-2 flex items-center gap-2">
          {dataset.prefix && (
            <span aria-hidden="true" className="text-lg font-semibold text-slate-600">
              {dataset.prefix}
            </span>
          )}
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            value={text}
            readOnly={locked}
            aria-describedby={hintId}
            onChange={(event) => {
              setText(event.target.value);
              const value = parseLearnerNumber(event.target.value);
              onAnswer(value === null ? null : { type: 'numeric_estimate', value });
            }}
            className="min-h-12 w-40 rounded-xl border-2 border-slate-300 bg-white px-3 text-lg font-semibold text-slate-900 tabular-nums focus:border-current-600 focus:outline-none read-only:bg-slate-50"
          />
          {dataset.suffix && <span className="text-lg text-slate-600">{dataset.suffix}</span>}
        </div>
        <p id={hintId} className="mt-1.5 text-sm text-slate-600">
          A rough estimate is fine: anything within ±{formatNumber(question.tolerance)} counts.
        </p>
      </div>

      {reveal && answer && (
        <div className="rounded-2xl bg-slate-50 p-4 text-slate-800 ring-1 ring-slate-200">
          <p>
            The {statistic} is{' '}
            <strong className="text-slate-900">
              {formatValue(dataset, question.correctValue)}
            </strong>
            .
          </p>
          <p className="mt-1">
            You said {formatValue(dataset, answer.value)}
            {Math.abs(answer.value - question.correctValue) < 1e-9
              ? ', spot on.'
              : `, off by ${formatValue(dataset, Math.abs(answer.value - question.correctValue))}.`}
          </p>
        </div>
      )}
    </div>
  );
}
