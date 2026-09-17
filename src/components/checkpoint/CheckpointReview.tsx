import { fillTemplate } from '../../content/template';
import type { Checkpoint, Lesson } from '../../content/types';
import type { CheckpointAnswerRecord } from '../../game/checkpoint';
import { CheckIcon, LightbulbIcon } from '../icons';
import { QuestionView } from '../questions/QuestionView';

interface CheckpointReviewProps {
  checkpoint: Checkpoint;
  lessons: readonly Lesson[];
  answers: Readonly<Record<string, CheckpointAnswerRecord>>;
}

const noop = () => {};

/** Every checkpoint question with the result. Missed ones show the right answer and explanation. */
export function CheckpointReview({ checkpoint, lessons, answers }: CheckpointReviewProps) {
  return (
    <section aria-labelledby="checkpoint-review" className="space-y-3">
      <h2 id="checkpoint-review" className="text-lg font-bold text-slate-900">
        Your answers
      </h2>
      <ol className="space-y-3">
        {checkpoint.items.map((item, index) => {
          const { question } = item;
          const record = answers[question.id];
          const correct = record?.correct === true;
          const lesson = lessons.find((candidate) => candidate.id === item.lessonId);
          return (
            <li
              key={question.id}
              className={`space-y-3 rounded-2xl p-4 ring-1 ${
                correct ? 'bg-white ring-slate-200' : 'bg-incorrect-50 ring-incorrect-200'
              }`}
            >
              <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600">
                <span>
                  Question {index + 1}
                  {lesson && ` · ${lesson.title}`}
                </span>
                {correct ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-correct-100 px-2 py-0.5 text-correct-800">
                    <CheckIcon aria-hidden="true" />
                    Right
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-incorrect-100 px-2 py-0.5 text-incorrect-900">
                    <LightbulbIcon aria-hidden="true" />
                    Missed
                  </span>
                )}
              </p>
              {correct ? (
                <h3 className="font-semibold text-slate-900">
                  {fillTemplate(question.prompt, question.dataset)}
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
                  <p className="rounded-xl bg-white p-3 leading-relaxed text-slate-800 ring-1 ring-incorrect-200">
                    {fillTemplate(question.explanation, question.dataset)}
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
