import type { InboxTriageQuestion } from '../../content/types';
import type { InboxTriageAnswer } from '../../game/grading';
import { MessageCard } from '../story/MessageCard';
import { TRIAGE_FLAW_LABELS } from './challengeCopy';
import { ChoiceCards } from './ChoiceCards';
import type { QuestionProps } from './types';

/** A vague request, the data at hand, and three questions: only one can really be answered. */
export function InboxTriage({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
  shortcuts,
}: QuestionProps<InboxTriageQuestion, InboxTriageAnswer>) {
  const { candidates, data } = question;
  return (
    <div className="space-y-5">
      <MessageCard message={question.message} />

      <section
        aria-label={data.caption}
        className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"
      >
        <p className="text-sm font-semibold text-slate-700">{data.caption}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {data.columns.map((column) => (
            <li
              key={column}
              className="rounded-lg bg-surface px-2 py-1 font-mono text-sm text-slate-800 ring-1 ring-slate-300"
            >
              {column}
            </li>
          ))}
        </ul>
      </section>

      <ChoiceCards
        options={candidates.map((candidate) => candidate.question)}
        keys={candidates.map((candidate) => candidate.question)}
        selectedIndex={answer?.selectedIndex ?? null}
        correctIndex={question.answerableIndex}
        reveal={reveal}
        locked={locked}
        shortcuts={shortcuts}
        legend="Which question can the data answer?"
        onSelect={(selectedIndex) => onAnswer({ type: 'inbox_triage', selectedIndex })}
        revealDetail={(index) => {
          const candidate = candidates[index];
          return (
            <>
              <strong className="font-semibold">
                {candidate.flaw ? TRIAGE_FLAW_LABELS[candidate.flaw] : 'Answerable'}:
              </strong>{' '}
              {candidate.note}
            </>
          );
        }}
      />
    </div>
  );
}
