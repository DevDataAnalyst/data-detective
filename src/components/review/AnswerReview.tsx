import { fillQuestionText } from '../../content/template';
import type { Question } from '../../content/types';
import type { Answer } from '../../game/grading';
import { CheckIcon, LightbulbIcon } from '../icons';
import { QuestionView } from '../questions/QuestionView';

export interface ReviewItem {
  question: Question;
  /** Shown after the question number, e.g. the lesson it came from. */
  context?: string;
  /** The learner's answer. Missing when the question was not answered. */
  record?: { answer: Answer; correct: boolean };
}

interface AnswerReviewProps {
  items: readonly ReviewItem[];
  headingId: string;
  title?: string;
}

const noop = () => {};

/** Questions with their results. Missed ones show the right answer and the explanation. */
export function AnswerReview({ items, headingId, title = 'Your answers' }: AnswerReviewProps) {
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-lg font-bold text-slate-900">
        {title}
      </h2>
      <ol className="space-y-3">
        {items.map(({ question, context, record }, index) => {
          const correct = record?.correct === true;
          return (
            <li
              key={question.id}
              className={`space-y-3 rounded-2xl p-4 ring-1 ${
                correct ? 'bg-surface ring-slate-200' : 'bg-incorrect-50 ring-incorrect-200'
              }`}
            >
              <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600">
                <span>
                  Question {index + 1}
                  {context && ` · ${context}`}
                </span>
                {correct ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-correct-100 px-2 py-0.5 text-correct-ink-800">
                    <CheckIcon aria-hidden="true" />
                    Right
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-incorrect-100 px-2 py-0.5 text-incorrect-ink-900">
                    <LightbulbIcon aria-hidden="true" />
                    Missed
                  </span>
                )}
              </p>
              {correct ? (
                <h3 className="font-semibold text-slate-900">
                  {fillQuestionText(question, question.prompt)}
                </h3>
              ) : (
                <>
                  <QuestionView
                    question={question}
                    answer={record?.answer ?? null}
                    onAnswer={noop}
                    reveal
                    locked
                    shortcuts={false}
                    animate={false}
                    headingLevel="h3"
                  />
                  <p className="rounded-xl bg-surface p-3 leading-relaxed text-slate-800 ring-1 ring-incorrect-200">
                    {fillQuestionText(question, question.explanation)}
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
