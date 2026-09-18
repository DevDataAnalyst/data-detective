import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { buttonStyles } from '../../components/buttonStyles';
import { ChevronRightIcon } from '../../components/icons';
import type { WrittenTask } from '../../content/types';
import { countSentences, countWords } from '../missionHelpers';
import { RecommendationReview } from './RecommendationReview';

interface WrittenTaskPanelProps {
  task: WrittenTask;
  savedText: string;
  /** Set once the recommendation was sent: the panel then shows it next to the model answer. */
  sent: { selfReview: readonly string[]; summaryHref: string } | null;
  onTextChange: (text: string) => void;
  onSubmit: (answer: { text: string; selfReview: string[] }) => void;
}

const SAVE_DELAY_MS = 600;

/** A plain-text recommendation with a self-review checklist, saved as the learner types. */
export function WrittenTaskPanel({
  task,
  savedText,
  sent,
  onTextChange,
  onSubmit,
}: WrittenTaskPanelProps) {
  const textareaId = useId();
  const countId = useId();
  const errorId = useId();
  const [text, setText] = useState(savedText);
  const [ticked, setTicked] = useState<string[]>([]);
  const [tooShort, setTooShort] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(savedText);
  const save = useRef(onTextChange);

  useEffect(() => {
    save.current = onTextChange;
  });

  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      if (latest.current !== savedText) save.current(latest.current);
    },
    // Flush once on unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-correct-50 p-3 font-semibold text-correct-ink-900 ring-1 ring-correct-200">
          Sent to the operations manager. Compare it with a model recommendation.
        </p>
        <RecommendationReview
          task={task}
          recommendation={savedText}
          selfReview={sent.selfReview}
          headingLevel="h3"
        />
        <Link to={sent.summaryHref} className={buttonStyles.primary}>
          See your mission summary
          <ChevronRightIcon aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const words = countWords(text);
  const sentences = countSentences(text);
  const { min, max } = task.suggestedSentences;
  const wordsToGo = task.minWords - words;

  const submit = () => {
    clearTimeout(saveTimer.current);
    if (wordsToGo > 0) {
      setTooShort(true);
      textarea.current?.focus();
      return;
    }
    onSubmit({ text: text.trim(), selfReview: ticked });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor={textareaId} className="block font-semibold text-slate-800">
          Your message to the operations manager
        </label>
        <textarea
          ref={textarea}
          id={textareaId}
          value={text}
          rows={7}
          placeholder={task.placeholder}
          aria-describedby={tooShort && wordsToGo > 0 ? `${countId} ${errorId}` : countId}
          aria-invalid={tooShort && wordsToGo > 0 ? true : undefined}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            latest.current = next;
            clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => save.current(next), SAVE_DELAY_MS);
          }}
          className="block w-full rounded-xl border-2 border-slate-300 bg-surface p-3 text-base leading-relaxed text-slate-900 focus:border-current-600 focus:outline-none"
        />
        <p id={countId} className="text-sm text-slate-600">
          {sentences} {sentences === 1 ? 'sentence' : 'sentences'}. Aim for {min}–{max}.
        </p>
      </div>

      <fieldset className="space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:p-4">
        <legend className="float-left mb-1 w-full font-semibold text-slate-900">
          Before you send it, tick what your message does
        </legend>
        {task.selfReview.map((item) => {
          const checked = ticked.includes(item.id);
          return (
            <label
              key={item.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-surface p-2.5 ring-1 ring-slate-200 has-focus-visible:ring-3 has-focus-visible:ring-current-600"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setTicked((current) =>
                    checked ? current.filter((id) => id !== item.id) : [...current, item.id],
                  )
                }
                className="mt-0.5 size-5 shrink-0 accent-current-600"
              />
              <span className="text-slate-800">{item.label}</span>
            </label>
          );
        })}
        <p className="text-sm text-slate-600">
          It’s fine to leave some unticked. This is for you, and nothing is graded.
        </p>
      </fieldset>

      <div className="space-y-2">
        {tooShort && wordsToGo > 0 && (
          <p id={errorId} className="font-medium text-incorrect-ink-800">
            Write at least {task.minWords} words so the manager has something to act on ({wordsToGo}{' '}
            to go).
          </p>
        )}
        <button type="button" onClick={submit} className={buttonStyles.primary}>
          Send recommendation
        </button>
      </div>
    </div>
  );
}
