import { useEffect, useEffectEvent, useId, type ReactNode } from 'react';
import { isTextEntryTarget } from '../hooks';
import { CheckIcon, CloseIcon } from '../icons';

type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'dimmed';

const optionClasses: Record<OptionState, string> = {
  idle: 'border-slate-300 bg-surface hover:border-current-500 hover:bg-current-50',
  selected: 'border-current-600 bg-current-50 text-current-ink-800',
  correct: 'border-correct-600 bg-correct-50 text-correct-ink-900',
  incorrect: 'border-incorrect-600 bg-incorrect-50 text-incorrect-ink-900',
  dimmed: 'border-slate-200 bg-surface text-slate-500',
};

interface ChoiceCardsProps {
  options: readonly ReactNode[];
  /** React keys for the options. Defaults to their positions. */
  keys?: readonly string[];
  selectedIndex: number | null;
  correctIndex: number;
  reveal: boolean;
  locked: boolean;
  /** Number keys pick options. */
  shortcuts: boolean;
  onSelect: (index: number) => void;
  /** Read out by screen readers before the options. */
  legend?: string;
  /** Extra text under an option once the answer is revealed, such as why it is wrong. */
  revealDetail?: (index: number) => ReactNode;
}

/**
 * Pick-one answer cards: a radio group styled as big tappable cards, numbered so number keys can
 * pick them. After a check, the right card turns green and a wrong pick turns amber.
 */
export function ChoiceCards({
  options,
  keys,
  selectedIndex,
  correctIndex,
  reveal,
  locked,
  shortcuts,
  onSelect,
  legend = 'Choose one answer',
  revealDetail,
}: ChoiceCardsProps) {
  const groupName = useId();
  const optionCount = options.length;
  const choose = useEffectEvent((index: number) => onSelect(index));

  useEffect(() => {
    if (!shortcuts || locked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTextEntryTarget(event.target)) return;
      if (!/^[1-9]$/.test(event.key)) return;
      const index = Number(event.key) - 1;
      if (index >= optionCount) return;
      event.preventDefault();
      choose(index);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, locked, optionCount]);

  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-3">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = index === correctIndex;
          const state: OptionState = !reveal
            ? isSelected
              ? 'selected'
              : 'idle'
            : isCorrect
              ? 'correct'
              : isSelected
                ? 'incorrect'
                : 'dimmed';
          const detail = reveal ? revealDetail?.(index) : null;

          return (
            <label
              key={keys?.[index] ?? index}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-base font-medium transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-current-600 ${optionClasses[state]} ${locked ? 'cursor-default' : ''}`}
            >
              <input
                type="radio"
                name={groupName}
                className="sr-only"
                checked={isSelected}
                disabled={locked}
                onChange={() => onSelect(index)}
              />
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-current/30 text-sm font-bold"
              >
                {index + 1}
              </span>
              {detail ? (
                <span className="flex-1">
                  <span className="block">{option}</span>
                  <span className="mt-1 block text-sm font-normal text-slate-700">{detail}</span>
                </span>
              ) : (
                <span className="flex-1">{option}</span>
              )}
              {state === 'correct' && (
                <span className="flex items-center gap-1 text-sm font-bold text-correct-ink-800">
                  <CheckIcon className="text-lg" />
                  {isSelected ? 'Your answer' : 'Correct answer'}
                </span>
              )}
              {state === 'incorrect' && (
                <span className="flex items-center gap-1 text-sm font-bold text-incorrect-ink-800">
                  <CloseIcon className="text-lg" />
                  Your answer
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
