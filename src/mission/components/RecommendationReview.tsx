import { CheckIcon } from '../../components/icons';
import type { WrittenTask } from '../../content/types';

interface RecommendationReviewProps {
  task: WrittenTask;
  recommendation: string;
  selfReview: readonly string[];
  headingLevel: 'h2' | 'h3';
}

/** The learner's sent recommendation and self-review, next to the model recommendation. */
export function RecommendationReview({
  task,
  recommendation,
  selfReview,
  headingLevel: Heading,
}: RecommendationReviewProps) {
  const ticked = new Set(selfReview);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <Heading className="font-bold text-slate-900">Your recommendation</Heading>
        <p className="leading-relaxed whitespace-pre-wrap text-slate-800">{recommendation}</p>
        <div>
          <p className="text-sm font-semibold text-slate-700">Your self-review</p>
          <ul className="mt-1 space-y-1 text-sm">
            {task.selfReview.map((item) => {
              const done = ticked.has(item.id);
              return (
                <li key={item.id} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
                      done
                        ? 'bg-correct-700 text-white'
                        : 'bg-white text-slate-400 ring-1 ring-slate-300'
                    }`}
                  >
                    {done && <CheckIcon />}
                  </span>
                  <span className={done ? 'text-slate-800' : 'text-slate-600'}>
                    <span className="sr-only">{done ? 'Ticked: ' : 'Not ticked: '}</span>
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="space-y-2 rounded-2xl bg-current-50 p-4 ring-1 ring-current-100">
        <Heading className="font-bold text-slate-900">A model recommendation</Heading>
        <p className="leading-relaxed text-slate-800">{task.modelAnswer}</p>
        <p className="text-sm text-slate-600">
          Yours doesn’t need to match it. Check that you made the same main points in your own
          words.
        </p>
      </div>
    </div>
  );
}
