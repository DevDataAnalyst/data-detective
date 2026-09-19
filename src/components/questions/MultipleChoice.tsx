import type { MultipleChoiceQuestion } from '../../content/types';
import type { MultipleChoiceAnswer } from '../../game/grading';
import { DataTableView, DatasetComparison, DatasetView } from '../data/DatasetView';
import { ChoiceCards } from './ChoiceCards';
import { CodeSnippetView } from './CodeSnippetView';
import type { QuestionProps } from './types';

/** Options that fill a blank in code are code themselves, so they show in the code font. */
function optionsAreCode(question: MultipleChoiceQuestion): boolean {
  return question.check?.kind === 'sql_blank' || question.check?.kind === 'python_blank';
}

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
      {question.code && <CodeSnippetView code={question.code} />}
      {question.tables?.map((table) => (
        <DataTableView key={table.caption} table={table} sqlNames />
      ))}
      {question.dataset && <DatasetView dataset={question.dataset} />}
      {question.datasets && <DatasetComparison datasets={question.datasets} />}

      <ChoiceCards
        options={
          optionsAreCode(question)
            ? question.options.map((option) => (
                <code key={option} className="font-mono text-sm break-words">
                  {option}
                </code>
              ))
            : question.options
        }
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
