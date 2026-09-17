import { StarIcon } from '../icons';
import { formatDuration, summaryMessage } from './feedbackCopy';

interface LessonSummaryProps {
  lessonTitle: string;
  accuracy: number;
  durationMs: number;
  xpEarned: number;
}

export function LessonSummary({ lessonTitle, accuracy, durationMs, xpEarned }: LessonSummaryProps) {
  return (
    <section aria-labelledby="summary-title" className="space-y-6 pt-6 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-correct-100 text-correct-700 motion-safe:animate-pop-in">
        <StarIcon className="text-5xl" />
      </div>
      <div>
        <h1 id="summary-title" className="text-3xl font-bold text-slate-900">
          Lesson complete
        </h1>
        <p className="mt-1 text-lg text-slate-600">{lessonTitle}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat label="First-try accuracy" value={`${Math.round(accuracy * 100)}%`} />
        <SummaryStat label="Time" value={formatDuration(durationMs)} />
        <SummaryStat label="XP earned" value={`+${xpEarned}`} highlight />
      </dl>

      <p className="text-slate-700">{summaryMessage(accuracy)}</p>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col-reverse justify-end rounded-2xl p-3 ring-1 ${
        highlight ? 'bg-xp-50 ring-xp-200' : 'bg-white ring-slate-200'
      }`}
    >
      <dt className="text-xs font-semibold text-slate-600">{label}</dt>
      <dd
        className={`text-xl font-bold tabular-nums sm:text-2xl ${highlight ? 'text-xp-700' : 'text-slate-900'}`}
      >
        {value}
      </dd>
    </div>
  );
}
