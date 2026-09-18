import { useEffect, useId, useRef } from 'react';
import { buttonStyles } from '../buttonStyles';
import { CheckIcon, LightbulbIcon } from '../icons';
import { Mascot } from '../Mascot';

interface FeedbackPanelProps {
  correct: boolean;
  headline: string;
  explanation: string;
  /** Shown under the explanation when the question will come back later. */
  note?: string;
  continueLabel?: string;
  onContinue: () => void;
}

/** Slides up from the bottom after a check. Green when right, amber (never red) when not. */
export function FeedbackPanel({
  correct,
  headline,
  explanation,
  note,
  continueLabel = 'Continue',
  onContinue,
}: FeedbackPanelProps) {
  const headlineId = useId();
  const explanationId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      aria-labelledby={headlineId}
      className={`fixed inset-x-0 bottom-0 z-30 border-t-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(15_23_42/0.12)] motion-safe:animate-slide-up ${
        correct ? 'border-correct-500 bg-correct-50' : 'border-incorrect-500 bg-incorrect-50'
      }`}
    >
      <div className="mx-auto max-h-[60dvh] max-w-2xl overflow-y-auto px-4 pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id={headlineId}
              className={`flex items-center gap-2 text-xl font-bold ${
                correct ? 'text-correct-ink-800' : 'text-incorrect-ink-800'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-8 items-center justify-center rounded-full text-white ${
                  correct ? 'bg-correct-700' : 'bg-incorrect-700'
                }`}
              >
                {correct ? <CheckIcon /> : <LightbulbIcon />}
              </span>
              {headline}
            </h2>
            <p id={explanationId} className="mt-2 text-base leading-relaxed text-slate-800">
              {explanation}
            </p>
            {note && <p className="mt-2 text-sm font-medium text-slate-600">{note}</p>}
          </div>
          <Mascot
            pose={correct ? 'thumbs-up' : 'thinking'}
            eager
            className="h-16 w-auto shrink-0 sm:h-24"
          />
        </div>
        <button
          ref={continueRef}
          type="button"
          onClick={onContinue}
          aria-describedby={`${headlineId} ${explanationId}`}
          className={`mt-4 w-full ${correct ? buttonStyles.correct : buttonStyles.incorrect}`}
        >
          {continueLabel}
        </button>
      </div>
    </section>
  );
}
