import { useEffect, useId, useRef, useState } from 'react';
import type { WrittenTask } from '../../content/types';
import { countSentences } from '../missionHelpers';

interface WrittenTaskPanelProps {
  task: WrittenTask;
  savedText: string;
  onTextChange: (text: string) => void;
}

const SAVE_DELAY_MS = 600;

/** A plain-text answer, saved as the learner types. */
export function WrittenTaskPanel({ task, savedText, onTextChange }: WrittenTaskPanelProps) {
  const textareaId = useId();
  const countId = useId();
  const [text, setText] = useState(savedText);
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

  const sentences = countSentences(text);
  const { min, max } = task.suggestedSentences;

  return (
    <div className="space-y-2">
      <label htmlFor={textareaId} className="block font-semibold text-slate-800">
        Your message to the operations manager
      </label>
      <textarea
        id={textareaId}
        value={text}
        rows={7}
        placeholder={task.placeholder}
        aria-describedby={countId}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          latest.current = next;
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => save.current(next), SAVE_DELAY_MS);
        }}
        className="block w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base leading-relaxed text-slate-900 focus:border-current-600 focus:outline-none"
      />
      <p id={countId} className="text-sm text-slate-600">
        {sentences} {sentences === 1 ? 'sentence' : 'sentences'}. Aim for {min}–{max}.
      </p>
    </div>
  );
}
