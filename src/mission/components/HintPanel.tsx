import { useEffect, useId, useRef } from 'react';
import { buttonStyles } from '../../components/buttonStyles';
import { LightbulbIcon } from '../../components/icons';
import { RichText } from '../../components/RichText';
import type { CodeTaskHints } from '../../content/types';
import { HINT_LEVELS } from '../missionHelpers';

interface HintPanelProps {
  hints: CodeTaskHints;
  /** How many hint levels are open, from saved progress. */
  shown: number;
  onShow: (level: number) => void;
}

const TITLES = [
  'Hint 1 of 3: a nudge',
  'Hint 2 of 3: the method',
  'Hint 3 of 3: fill in the blank',
];

/** Hints for a code task, opened one level at a time. Opened hints stay open. */
export function HintPanel({ hints, shown, onShow }: HintPanelProps) {
  const titleId = useId();
  const hintRefs = useRef<Array<HTMLDivElement | null>>([]);
  const previousShown = useRef(shown);

  // Move focus to a hint the learner just opened, so it is read out and scrolled into view.
  useEffect(() => {
    if (shown > previousShown.current) hintRefs.current[shown - 1]?.focus();
    previousShown.current = shown;
  }, [shown]);

  const levels = Math.min(shown, HINT_LEVELS);

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 rounded-2xl bg-streak-100/40 p-3 ring-1 ring-streak-100 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <LightbulbIcon className="shrink-0 text-xl text-streak-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="font-bold text-slate-900">
            {levels === 0 ? 'Stuck?' : 'Hints'}
          </h3>
          <p className="text-sm text-slate-600">Hints never cost XP.</p>
        </div>
        {levels < HINT_LEVELS && (
          <button
            type="button"
            onClick={() => onShow(levels + 1)}
            className={`${buttonStyles.secondary} min-h-11 text-sm`}
          >
            {levels === 0 ? 'Show a hint' : 'Show another hint'}
          </button>
        )}
      </div>

      {levels > 0 && (
        <ol className="space-y-2">
          {TITLES.slice(0, levels).map((title, index) => (
            <li key={title}>
              <div
                ref={(node) => {
                  hintRefs.current[index] = node;
                }}
                tabIndex={-1}
                className="rounded-xl bg-white p-3 ring-1 ring-slate-200 outline-none focus-visible:ring-3 focus-visible:ring-current-600"
              >
                <p className="text-sm font-bold text-slate-700">{title}</p>
                {index < 2 ? (
                  <RichText
                    text={index === 0 ? hints.nudge : hints.method}
                    className="mt-1 space-y-1 text-slate-800"
                  />
                ) : (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-sm leading-relaxed text-slate-100">
                    <code>{hints.example}</code>
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
