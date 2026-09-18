import { Link } from 'react-router';
import { buttonStyles } from '../../components/buttonStyles';
import { AlertIcon, BoltIcon, CheckIcon, ChevronRightIcon } from '../../components/icons';
import { InlineText } from '../../components/RichText';
import type { TaskFeedback } from '../grading';

export type ShownFeedback = TaskFeedback & { xp: number };

interface TaskFeedbackPanelProps {
  feedback: ShownFeedback;
  /** The next task to go to after a pass, if there is one. */
  next: { label: string; title: string; onSelect: () => void } | null;
  /** Link to the mission summary, once the mission is complete and nothing is left to do. */
  summaryHref: string | null;
  /** Opens the next hint level, when there is one left. */
  hint: { label: string; onShow: () => void } | null;
}

/** The result of the hidden check after a run: passed, or a specific pointer to fix. */
export function TaskFeedbackPanel({ feedback, next, summaryHref, hint }: TaskFeedbackPanelProps) {
  if (feedback.kind === 'passed') {
    return (
      <div
        role="group"
        aria-label="Task check"
        className="flex gap-3 rounded-2xl border-2 border-correct-200 bg-correct-50 p-3 sm:p-4"
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-correct-700 text-lg text-white motion-safe:animate-pop-in"
        >
          <CheckIcon />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="flex flex-wrap items-center gap-x-2 font-bold text-correct-ink-900">
            Task passed
            {feedback.xp > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-xp-100 px-2 py-0.5 text-sm text-xp-ink-700">
                <BoltIcon aria-hidden="true" />+{feedback.xp} XP
              </span>
            )}
          </p>
          <p className="text-slate-800">
            <InlineText text={feedback.message} />
          </p>
          {next ? (
            <button type="button" onClick={next.onSelect} className={buttonStyles.correct}>
              Next: {next.title}
              <ChevronRightIcon aria-hidden="true" />
            </button>
          ) : (
            summaryHref && (
              <Link to={summaryHref} className={buttonStyles.correct}>
                See your mission summary
                <ChevronRightIcon aria-hidden="true" />
              </Link>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Task check"
      className="flex gap-3 rounded-2xl border-2 border-incorrect-200 bg-incorrect-50 p-3 sm:p-4"
    >
      <AlertIcon className="mt-0.5 shrink-0 text-2xl text-incorrect-ink-700" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-bold text-incorrect-ink-900">Not quite yet</p>
        <p className="text-slate-800">
          <InlineText text={feedback.message} />
        </p>
        {hint && (
          <button
            type="button"
            onClick={hint.onShow}
            className={`${buttonStyles.secondary} min-h-11 text-sm`}
          >
            {hint.label}
          </button>
        )}
      </div>
    </div>
  );
}
