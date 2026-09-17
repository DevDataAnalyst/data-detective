import { useEffect, useEffectEvent, useId } from 'react';
import type { MultipleChoiceQuestion } from '../../content/types';
import type { MultipleChoiceAnswer } from '../../game/grading';
import { DataTableView, DatasetComparison, DatasetView } from '../data/DatasetView';
import { isTextEntryTarget } from '../hooks';
import { CheckIcon, CloseIcon } from '../icons';
import type { QuestionProps } from './types';

type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'dimmed';

const optionClasses: Record<OptionState, string> = {
  idle: 'border-slate-300 bg-white hover:border-current-500 hover:bg-current-50',
  selected: 'border-current-600 bg-current-50 text-current-800',
  correct: 'border-correct-600 bg-correct-50 text-correct-900',
  incorrect: 'border-incorrect-600 bg-incorrect-50 text-incorrect-900',
  dimmed: 'border-slate-200 bg-white text-slate-500',
};

export function MultipleChoice({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
  shortcuts,
}: QuestionProps<MultipleChoiceQuestion, MultipleChoiceAnswer>) {
  const groupName = useId();
  const optionCount = question.options.length;
  const choose = useEffectEvent((selectedIndex: number) =>
    onAnswer({ type: 'multiple_choice', selectedIndex }),
  );

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
    <div className="space-y-5">
      {question.table && <DataTableView table={question.table} />}
      {question.dataset && <DatasetView dataset={question.dataset} />}
      {question.datasets && <DatasetComparison datasets={question.datasets} />}

      <fieldset>
        <legend className="sr-only">Choose one answer</legend>
        <div className="grid gap-3">
          {question.options.map((option, index) => {
            const isSelected = answer?.selectedIndex === index;
            const isCorrect = index === question.correctIndex;
            const state: OptionState = !reveal
              ? isSelected
                ? 'selected'
                : 'idle'
              : isCorrect
                ? 'correct'
                : isSelected
                  ? 'incorrect'
                  : 'dimmed';

            return (
              <label
                key={option}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-base font-medium transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-current-600 ${optionClasses[state]} ${locked ? 'cursor-default' : ''}`}
              >
                <input
                  type="radio"
                  name={groupName}
                  className="sr-only"
                  checked={isSelected}
                  disabled={locked}
                  onChange={() => onAnswer({ type: 'multiple_choice', selectedIndex: index })}
                />
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-current/30 text-sm font-bold"
                >
                  {index + 1}
                </span>
                <span className="flex-1">{option}</span>
                {state === 'correct' && (
                  <span className="flex items-center gap-1 text-sm font-bold text-correct-800">
                    <CheckIcon className="text-lg" />
                    {isSelected ? 'Your answer' : 'Correct answer'}
                  </span>
                )}
                {state === 'incorrect' && (
                  <span className="flex items-center gap-1 text-sm font-bold text-incorrect-800">
                    <CloseIcon className="text-lg" />
                    Your answer
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
