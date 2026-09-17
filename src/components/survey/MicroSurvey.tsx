import { useState } from 'react';
import type { SurveyId } from '../../storage/events';
import { useEvents } from '../../storage/eventsContext';
import { buttonStyles } from '../buttonStyles';
import { useSurveyPending } from './useSurveyPending';

interface MicroSurveyProps {
  surveyId: SurveyId;
  question: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  /** Labels for the ends of a 1–5 scale. */
  scale?: { low: string; high: string };
}

/**
 * One tap, skippable, saved only on this device. Asked at the few moments where the answer says
 * something about how the two layers fit together.
 */
export function MicroSurvey({ surveyId, question, options, scale }: MicroSurveyProps) {
  const events = useEvents();
  const pending = useSurveyPending(surveyId);
  const [thanks, setThanks] = useState(false);

  if (!pending && !thanks) return null;

  if (thanks) {
    return (
      <div
        role="status"
        className="rounded-2xl bg-current-50 p-4 text-slate-800 ring-1 ring-current-100"
      >
        Thanks. That helps us work out what to change.
      </div>
    );
  }

  return (
    <section
      aria-labelledby={`survey-${surveyId}`}
      className="space-y-3 rounded-2xl bg-current-50 p-4 ring-1 ring-current-100"
    >
      <div>
        <p id={`survey-${surveyId}`} className="font-bold text-slate-900">
          {question}
        </p>
        <p className="text-sm text-slate-600">One tap. It stays on your device.</p>
      </div>
      <div className={scale ? 'space-y-1' : 'flex flex-wrap gap-2'}>
        <div className={scale ? 'flex flex-wrap gap-2' : 'contents'}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                events.record({ type: 'survey_answered', surveyId, answer: option.value });
                setThanks(true);
              }}
              className={`${buttonStyles.secondary} min-h-11 px-4 text-sm ${scale ? 'min-w-11 flex-1' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {scale && (
          <p aria-hidden="true" className="flex justify-between text-xs text-slate-600">
            <span>{scale.low}</span>
            <span>{scale.high}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => events.record({ type: 'survey_skipped', surveyId })}
        className="min-h-11 text-sm font-semibold text-slate-600 underline underline-offset-2"
      >
        Skip
      </button>
    </section>
  );
}

/** The optional free-text question. It is the only place the export can hold typed words. */
export function SurveyNote({ question }: { question: string }) {
  const events = useEvents();
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-2xl bg-current-50 p-4 text-slate-800 ring-1 ring-current-100"
      >
        Thanks. Your note is saved on this device and goes out with your export.
      </div>
    );
  }

  return (
    <section
      aria-labelledby="survey-note"
      className="space-y-3 rounded-2xl bg-current-50 p-4 ring-1 ring-current-100"
    >
      <label
        id="survey-note"
        htmlFor="survey-note-input"
        className="block font-bold text-slate-900"
      >
        {question}
      </label>
      <textarea
        id="survey-note-input"
        value={note}
        rows={3}
        placeholder="Optional. Anything that felt confusing, boring or too hard."
        onChange={(event) => setNote(event.target.value)}
        className="block w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-900 focus:border-current-600 focus:outline-none"
      />
      <button
        type="button"
        disabled={note.trim().length === 0}
        onClick={() => {
          events.record({ type: 'survey_note', note: note.trim() });
          setSent(true);
        }}
        className={`${buttonStyles.secondary} min-h-11 text-sm`}
      >
        Save note
      </button>
    </section>
  );
}
