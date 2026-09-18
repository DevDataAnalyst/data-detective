import type { SpotTheLieQuestion } from '../../content/types';
import { HONEST_CHART_NOTES, honestChart } from '../../game/charts';
import type { SpotTheLieAnswer } from '../../game/grading';
import { ClaimChartView } from '../charts/ClaimChartView';
import { ChoiceCards } from './ChoiceCards';
import type { QuestionProps } from './types';

/** A claim made with a misleading chart. After answering, the honest version is drawn below. */
export function SpotTheLie({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
  shortcuts,
}: QuestionProps<SpotTheLieQuestion, SpotTheLieAnswer>) {
  const { claim, chart, trick } = question;
  return (
    <div className="space-y-5">
      <figure className="rounded-2xl bg-streak-100 px-4 py-3">
        <figcaption className="text-sm font-semibold text-streak-ink-800">
          {claim.by} says
        </figcaption>
        <blockquote className="mt-1 text-lg font-semibold text-slate-900">
          “{claim.text}”
        </blockquote>
      </figure>

      <div className="rounded-2xl bg-surface p-3 ring-1 ring-slate-200">
        <ClaimChartView chart={chart} />
      </div>

      <ChoiceCards
        options={question.options}
        keys={question.options}
        selectedIndex={answer?.selectedIndex ?? null}
        correctIndex={question.correctIndex}
        reveal={reveal}
        locked={locked}
        shortcuts={shortcuts}
        legend="What is wrong with this chart?"
        onSelect={(selectedIndex) => onAnswer({ type: 'spot_the_lie', selectedIndex })}
      />

      {reveal && (
        <section
          aria-label="The honest version"
          className="space-y-2 rounded-2xl bg-correct-50 p-3 ring-1 ring-correct-200"
        >
          <p className="font-bold text-correct-ink-900">The honest version</p>
          <p className="text-sm text-slate-700">{HONEST_CHART_NOTES[trick]}</p>
          <div className="rounded-xl bg-surface p-3">
            <ClaimChartView chart={honestChart(chart, trick)} />
          </div>
        </section>
      )}
    </div>
  );
}
