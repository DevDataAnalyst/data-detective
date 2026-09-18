import { formatNumber, formatPercent } from '../../content/template';
import type { AbVariant, AbVerdictQuestion } from '../../content/types';
import { abStats, VERDICTS } from '../../game/abTest';
import type { AbVerdictAnswer } from '../../game/grading';
import { formatPoints, formatPValue, VERDICT_LABELS } from './challengeCopy';
import { ChoiceCards } from './ChoiceCards';
import type { QuestionProps } from './types';

function VariantCard({ variant, rate }: { variant: AbVariant; rate: number }) {
  return (
    <div className="rounded-2xl bg-surface p-3 ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-700">{variant.name}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatPercent(rate)}</p>
      <p className="text-sm text-slate-600 tabular-nums">
        {formatNumber(variant.conversions)} of {formatNumber(variant.visitors)} converted
      </p>
    </div>
  );
}

/** A test's results and statistics. The learner ships, kills or waits, then sees what follows. */
export function AbVerdict({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
  shortcuts,
}: QuestionProps<AbVerdictQuestion, AbVerdictAnswer>) {
  const stats = abStats(question.control, question.variant);
  const lift = `${stats.relativeLift >= 0 ? '+' : '−'}${formatPercent(Math.abs(stats.relativeLift))}`;
  const facts: Array<[string, string]> = [
    ['Difference', `${formatPoints(stats.difference)} (${lift})`],
    ['p-value', formatPValue(stats.pValue)],
    ['95% confidence interval', `${formatPoints(stats.ciLow)} to ${formatPoints(stats.ciHigh)}`],
    ['Worth shipping from', formatPoints(question.minWorthwhileLift)],
  ];

  return (
    <div className="space-y-5">
      <section aria-label="Test results" className="space-y-3">
        <p className="text-sm font-bold tracking-wide text-slate-600 uppercase">{question.test}</p>
        <div className="grid grid-cols-2 gap-3">
          <VariantCard variant={question.control} rate={stats.controlRate} />
          <VariantCard variant={question.variant} rate={stats.variantRate} />
        </div>
        <dl className="space-y-1 rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-x-3">
              <dt className="text-slate-700">{label}</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        {question.context && (
          <p className="rounded-2xl bg-streak-100 px-4 py-3 text-slate-900">
            <strong className="font-semibold text-streak-ink-800">Also: </strong>
            {question.context}
          </p>
        )}
      </section>

      <ChoiceCards
        options={VERDICTS.map((verdict) => VERDICT_LABELS[verdict])}
        keys={[...VERDICTS]}
        selectedIndex={answer?.selectedIndex ?? null}
        correctIndex={VERDICTS.indexOf(question.verdict)}
        reveal={reveal}
        locked={locked}
        shortcuts={shortcuts}
        legend="What is your call?"
        onSelect={(selectedIndex) => onAnswer({ type: 'ab_verdict', selectedIndex })}
        revealDetail={(index) => question.consequences[VERDICTS[index]]}
      />
    </div>
  );
}
