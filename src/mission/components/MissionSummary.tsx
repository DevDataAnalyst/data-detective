import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { buttonStyles } from '../../components/buttonStyles';
import { useCountUp, usePrefersReducedMotion } from '../../components/hooks';
import { CheckIcon, CopyIcon, SearchIcon, SnowflakeIcon } from '../../components/icons';
import type { Mission, WrittenTask } from '../../content/types';
import type { MissionProgress } from '../../game/missionProgress';
import { missionTaskCounts } from '../../game/missionRules';
import { missionXpSummary, XP_RULES } from '../../game/xp';
import { summaryLines } from '../portfolio';
import { RecommendationReview } from './RecommendationReview';

interface MissionSummaryProps {
  mission: Mission;
  progress: MissionProgress;
  /** True straight after completing the mission, to animate the XP and confetti. */
  celebrate: boolean;
  /** Called before going back to the mission, to open the first stretch task not yet passed. */
  onTryStretch: () => void;
}

const CONFETTI = [
  { left: '10%', delay: '0ms', color: 'bg-streak-500' },
  { left: '26%', delay: '140ms', color: 'bg-xp-500' },
  { left: '42%', delay: '60ms', color: 'bg-correct-500' },
  { left: '58%', delay: '200ms', color: 'bg-current-500' },
  { left: '74%', delay: '30ms', color: 'bg-streak-500' },
  { left: '90%', delay: '170ms', color: 'bg-xp-500' },
];

/** The mission complete screen: what the learner did, XP, the streak freeze and a portfolio blurb. */
export function MissionSummary({
  mission,
  progress,
  celebrate,
  onTryStretch,
}: MissionSummaryProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const passed = new Set(
    mission.tasks
      .filter((task) => progress.tasks[task.id]?.status === 'passed')
      .map((task) => task.id),
  );
  const counts = missionTaskCounts(mission, progress);
  const xp = missionXpSummary({
    requiredTasksPassed: counts.requiredPassed,
    requiredTaskCount: counts.requiredTotal,
    stretchTasksPassed: counts.stretchPassed,
  });
  const shownXp = useCountUp(xp.total, celebrate && !reducedMotion);
  const stretchLeft = counts.stretchTotal - counts.stretchPassed;
  const stretchXpLeft = Math.max(0, XP_RULES.stretchMax - xp.stretch);
  const written = mission.tasks.find((task): task is WrittenTask => task.kind === 'written');

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-current-700 hover:bg-current-50"
          >
            ← Path
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <section className="relative overflow-hidden rounded-3xl bg-white px-4 py-6 text-center ring-1 ring-slate-200">
          {celebrate && (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-full motion-reduce:hidden"
            >
              {CONFETTI.map((piece) => (
                <span
                  key={piece.left}
                  className={`absolute -top-2 size-2.5 rounded-sm ${piece.color} motion-safe:animate-confetti`}
                  style={{ left: piece.left, animationDelay: piece.delay }}
                />
              ))}
            </div>
          )}
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-linear-to-br from-xp-500 to-xp-700 text-4xl text-white shadow-[0_6px_0_var(--color-xp-700)] motion-safe:animate-pop-in">
            <SearchIcon aria-hidden="true" />
          </span>
          <h1
            ref={heading}
            tabIndex={-1}
            className="mt-4 text-3xl font-bold text-slate-900 outline-none"
          >
            Mission complete
          </h1>
          <p className="mt-1 text-lg text-slate-600">You solved “{mission.title}”.</p>
          <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-xp-100 px-3 py-1 text-lg font-bold text-xp-700 tabular-nums">
            <span aria-hidden="true">+{shownXp} XP</span>
            <span className="sr-only">{xp.total} XP earned in this mission</span>
          </p>
        </section>

        <section
          aria-labelledby="what-you-did"
          className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
        >
          <h2 id="what-you-did" className="text-lg font-bold text-slate-900">
            What you did
          </h2>
          <ul className="space-y-2">
            {summaryLines(mission.summary.whatYouDid, progress.facts, passed).map((line) => (
              <li key={line} className="flex items-start gap-2 text-slate-800">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-correct-100 text-xs text-correct-800"
                >
                  <CheckIcon />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          <section
            aria-labelledby="xp-breakdown"
            className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <h2 id="xp-breakdown" className="text-lg font-bold text-slate-900">
              XP breakdown
            </h2>
            <dl className="space-y-2 tabular-nums">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-700">Mission ({counts.requiredPassed} code tasks)</dt>
                <dd className="font-semibold text-slate-900">{xp.base} XP</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-700">
                  Stretch bonus ({counts.stretchPassed} of {counts.stretchTotal})
                </dt>
                <dd className="font-semibold text-slate-900">+{xp.stretch} XP</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
                <dt className="font-bold text-slate-900">Total</dt>
                <dd className="font-bold text-xp-700">{xp.total} XP</dd>
              </div>
            </dl>
            {stretchLeft > 0 && stretchXpLeft > 0 && (
              <p className="text-sm text-slate-600">
                {stretchLeft === 1 ? 'One stretch task is' : `${stretchLeft} stretch tasks are`}{' '}
                still open, worth up to {stretchXpLeft} more XP.
              </p>
            )}
          </section>

          <section
            aria-labelledby="streak-freeze"
            className="space-y-2 rounded-2xl bg-current-50 p-4 ring-1 ring-current-100"
          >
            <h2
              id="streak-freeze"
              className="flex items-center gap-2 text-lg font-bold text-slate-900"
            >
              <SnowflakeIcon className="text-current-700" aria-hidden="true" />
              {progress.freezeGranted ? 'Streak freeze earned' : 'Streak freeze'}
            </h2>
            <p className="text-slate-700">
              {progress.freezeGranted
                ? 'If you miss a day, the freeze keeps your streak going. It is used automatically.'
                : 'You already had a streak freeze saved, and you can hold one at a time, so your streak is still protected.'}
            </p>
          </section>
        </div>

        <PortfolioSummary lines={summaryLines(mission.summary.portfolio, progress.facts, passed)} />

        {written && progress.recommendation && (
          <section aria-labelledby="compare-recommendation" className="space-y-3">
            <h2 id="compare-recommendation" className="text-lg font-bold text-slate-900">
              Compare your recommendation
            </h2>
            <RecommendationReview
              task={written}
              recommendation={progress.recommendation}
              selfReview={progress.selfReview}
              headingLevel="h3"
            />
          </section>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/" className={`${buttonStyles.primary} sm:flex-1`}>
            Back to path
          </Link>
          {stretchLeft > 0 ? (
            <Link
              to="/mission"
              onClick={onTryStretch}
              className={`${buttonStyles.secondary} sm:flex-1`}
            >
              Try the stretch tasks
            </Link>
          ) : (
            <Link to="/mission" className={`${buttonStyles.secondary} sm:flex-1`}>
              Back to the mission
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

function PortfolioSummary({ lines }: { lines: string[] }) {
  const titleId = useId();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('The clipboard is not available');
      await navigator.clipboard.writeText(lines.join('\n'));
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
    >
      <div>
        <h2 id={titleId} className="text-lg font-bold text-slate-900">
          Portfolio summary
        </h2>
        <p className="text-slate-600">
          A starting point for your resume or LinkedIn. Edit it so it matches your own words and the
          work you did.
        </p>
      </div>
      <div
        data-testid="portfolio-summary"
        className="space-y-1 rounded-xl bg-slate-50 p-3 leading-relaxed text-slate-800 ring-1 ring-slate-200 select-all"
      >
        {lines.map((line, index) => (
          <p key={line} className={index === 0 ? 'font-semibold text-slate-900' : undefined}>
            {line}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void copy()} className={buttonStyles.secondary}>
          <CopyIcon aria-hidden="true" />
          {status === 'copied' ? 'Copied' : 'Copy summary'}
        </button>
        <p aria-live="polite" className="text-sm text-slate-600">
          {status === 'copied' && 'Copied to your clipboard.'}
          {status === 'failed' &&
            'Copying didn’t work here. Select the text above and copy it yourself.'}
        </p>
      </div>
    </section>
  );
}
