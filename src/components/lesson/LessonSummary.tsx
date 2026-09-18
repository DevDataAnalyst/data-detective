import type { LessonXpAward } from '../../game/xp';
import { useCountUp, usePrefersReducedMotion } from '../hooks';
import { Mascot } from '../Mascot';
import { formatDuration, summaryMessage } from './feedbackCopy';

interface LessonSummaryProps {
  lessonTitle: string;
  accuracy: number;
  durationMs: number;
  award: LessonXpAward | null;
}

function awardDetail(award: LessonXpAward): string {
  switch (award.kind) {
    case 'first_completion':
      return award.bonus > 0
        ? `${award.base} XP for finishing + ${award.bonus} XP accuracy bonus`
        : `${award.base} XP for finishing`;
    case 'practice':
      return `${award.total} XP for practising`;
    case 'practice_limit_reached':
      return 'You have earned practice XP for this lesson twice today. Practice still helps, and XP returns tomorrow.';
  }
}

export function LessonSummary({ lessonTitle, accuracy, durationMs, award }: LessonSummaryProps) {
  const reducedMotion = usePrefersReducedMotion();
  const xp = award?.total ?? 0;
  const shownXp = useCountUp(xp, !reducedMotion && xp > 0);

  return (
    <section aria-labelledby="summary-title" className="space-y-6 pt-6 text-center">
      <Mascot pose="celebrating" eager className="mx-auto h-32 w-auto motion-safe:animate-pop-in" />
      <div>
        <h1 id="summary-title" className="text-3xl font-bold text-slate-900">
          Lesson complete
        </h1>
        <p className="mt-1 text-lg text-slate-600">{lessonTitle}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryStat label="First-try accuracy" value={`${Math.round(accuracy * 100)}%`} />
        <SummaryStat label="Time" value={formatDuration(durationMs)} />
        <div className="flex flex-col-reverse justify-end rounded-2xl bg-xp-50 p-3 ring-1 ring-xp-200">
          <dt className="text-xs font-semibold text-slate-600">XP earned</dt>
          <dd className="text-xl font-bold text-xp-ink-700 tabular-nums sm:text-2xl">
            <span aria-hidden="true">+{shownXp}</span>
            <span className="sr-only">{xp} XP</span>
          </dd>
        </div>
      </dl>

      {award && <p className="text-sm font-medium text-xp-ink-700">{awardDetail(award)}</p>}
      <p className="text-slate-700">{summaryMessage(accuracy)}</p>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse justify-end rounded-2xl bg-surface p-3 ring-1 ring-slate-200">
      <dt className="text-xs font-semibold text-slate-600">{label}</dt>
      <dd className="text-xl font-bold text-slate-900 tabular-nums sm:text-2xl">{value}</dd>
    </div>
  );
}
