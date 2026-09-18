import type { CourtroomQuestion } from '../../content/types';
import type { CourtroomAnswer } from '../../game/grading';
import { DataTableView } from '../data/DatasetView';
import { ScaleIcon } from '../icons';
import { ChoiceCards } from './ChoiceCards';
import type { QuestionProps } from './types';

/**
 * Correlation vs causation. Two witnesses read opposite causes into the same evidence; the learner
 * cross-examines them by naming the lurking variable behind both.
 */
export function Courtroom({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
  shortcuts,
}: QuestionProps<CourtroomQuestion, CourtroomAnswer>) {
  const { suspects } = question;
  return (
    <div className="space-y-5">
      <section
        aria-label="The evidence"
        className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
      >
        <p className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-600 uppercase">
          <ScaleIcon aria-hidden="true" className="text-lg" />
          The evidence
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{question.evidence}</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {question.witnesses.map((witness, index) => (
          <figure key={witness.name} className="rounded-2xl bg-surface p-4 ring-1 ring-slate-200">
            <figcaption className="text-sm font-bold text-slate-600">
              Witness {index + 1}: {witness.name}
            </figcaption>
            <blockquote className="mt-1 text-slate-800">“{witness.claim}”</blockquote>
          </figure>
        ))}
      </div>

      {question.table && <DataTableView table={question.table} />}

      <ChoiceCards
        options={suspects.map((suspect) => suspect.text)}
        keys={suspects.map((suspect) => suspect.text)}
        selectedIndex={answer?.selectedIndex ?? null}
        correctIndex={question.confounderIndex}
        reveal={reveal}
        locked={locked}
        shortcuts={shortcuts}
        legend="Which lurking variable explains the evidence?"
        onSelect={(selectedIndex) => onAnswer({ type: 'courtroom', selectedIndex })}
        revealDetail={(index) => suspects[index].note}
      />
    </div>
  );
}
