import type { MultipleChoiceQuestion } from '../../content/types';
import type { MultipleChoiceAnswer } from '../../game/grading';
import { DataTableView, DatasetComparison, DatasetView } from '../data/DatasetView';
import { ChoiceCards } from './ChoiceCards';
import type { QuestionProps } from './types';

export function MultipleChoice({
  question,
  answer,
  onAnswer,
  reveal,
  locked,
  shortcuts,
}: QuestionProps<MultipleChoiceQuestion, MultipleChoiceAnswer>) {
  return (
    <div className="space-y-5">
      {question.table && <DataTableView table={question.table} />}
      {question.dataset && <DatasetView dataset={question.dataset} />}
      {question.datasets && <DatasetComparison datasets={question.datasets} />}

      <ChoiceCards
        options={question.options}
        keys={question.options}
        selectedIndex={answer?.selectedIndex ?? null}
        correctIndex={question.correctIndex}
        reveal={reveal}
        locked={locked}
        shortcuts={shortcuts}
        onSelect={(selectedIndex) => onAnswer({ type: 'multiple_choice', selectedIndex })}
      />
    </div>
  );
}
