import { useEffect, useRef } from 'react';
import type { Question, Unit } from '../../content/types';
import { scoreBoss, type BossSessionState } from '../../game/bossBattle';
import type { BossOutcome } from '../../game/rewards';
import { XP_RULES } from '../../game/xp';
import { buttonStyles } from '../buttonStyles';
import { formatClock } from './bossCopy';
import { Mascot } from '../Mascot';
import { AnswerReview } from '../review/AnswerReview';

interface BossResultsProps {
  session: BossSessionState;
  questions: ReadonlyMap<string, Question>;
  unit: Unit;
  outcome: BossOutcome;
  onPlayAgain: () => void;
  onExit: () => void;
}

function xpMessage(outcome: BossOutcome, correct: number): string {
  const { award } = outcome;
  if (award.kind === 'already_earned_today') {
    return 'You already earned today’s boss bonus, so this round was practice. Come back tomorrow for more XP.';
  }
  if (award.total === 0) return 'Get a question right next time to earn XP.';
  const parts = [`${correct} × ${XP_RULES.bossPerCorrect} XP`];
  if (award.accuracyBonus > 0) parts.push(`${award.accuracyBonus} XP accuracy bonus`);
  return parts.join(' + ');
}

/** Score, accuracy and XP after a boss round, then every answered question to review. */
export function BossResults({
  session,
  questions,
  unit,
  outcome,
  onPlayAgain,
  onExit,
}: BossResultsProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const score = scoreBoss(session);
  const unanswered = score.total - score.answered;
  const accuracy = Math.round(score.accuracy * 100);
  const strong = score.answered > 0 && score.accuracy >= 0.6;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const items = session.results.flatMap((result) => {
    const question = questions.get(result.questionId);
    return question
      ? [{ question, record: { answer: result.answer, correct: result.correct } }]
      : [];
  });

  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-5 bg-slate-50 px-4 py-6">
      <section className="space-y-4 rounded-3xl bg-surface px-4 py-6 text-center ring-1 ring-slate-200">
        <Mascot
          pose={strong ? 'celebrating' : 'thinking'}
          eager
          className="mx-auto h-28 w-auto motion-safe:animate-pop-in"
        />
        <div>
          <p className="text-sm font-bold tracking-wide text-streak-ink-700 uppercase">
            Boss battle · {unit.title}
          </p>
          <h1
            ref={heading}
            tabIndex={-1}
            className="mt-1 text-3xl font-bold text-slate-900 outline-none"
          >
            {session.endReason === 'time_up' ? 'Time’s up!' : 'You answered them all!'}
          </h1>
        </div>
        <p className="text-slate-700">
          <span className="block text-5xl font-bold text-slate-900 tabular-nums">
            {score.correct}
          </span>
          {score.correct === 1 ? 'right answer' : 'right answers'}
        </p>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-slate-50 p-2">
            <dt className="text-slate-600">Answered</dt>
            <dd className="text-lg font-bold text-slate-900 tabular-nums">
              {score.answered} of {score.total}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-2">
            <dt className="text-slate-600">Accuracy</dt>
            <dd className="text-lg font-bold text-slate-900 tabular-nums">
              {score.answered === 0 ? '—' : `${accuracy}%`}
            </dd>
          </div>
          <div className="rounded-xl bg-xp-50 p-2">
            <dt className="text-slate-600">XP</dt>
            <dd className="text-lg font-bold text-xp-ink-700 tabular-nums">+{outcome.xp}</dd>
          </div>
        </dl>
        <p className="text-sm text-slate-600">{xpMessage(outcome, score.correct)}</p>
        {session.endReason === 'all_answered' && score.timeLeftMs > 0 && (
          <p className="text-sm text-slate-600">
            With {formatClock(score.timeLeftMs / 1000)} still on the clock.
          </p>
        )}
        {outcome.newBest ? (
          <p className="font-semibold text-correct-ink-800">
            New best score! Your last best was {outcome.previousBest}.
          </p>
        ) : (
          outcome.previousBest > 0 && (
            <p className="text-sm text-slate-600">
              Your best so far: {Math.max(outcome.previousBest, score.correct)} right.
            </p>
          )
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onPlayAgain} className={`${buttonStyles.primary} sm:flex-1`}>
          Play again
        </button>
        <button type="button" onClick={onExit} className={`${buttonStyles.secondary} sm:flex-1`}>
          Back to path
        </button>
      </div>

      {items.length > 0 && (
        <AnswerReview items={items} headingId="boss-review" title="Your answers" />
      )}
      {unanswered > 0 && (
        <p className="text-center text-sm text-slate-600">
          {unanswered === 1
            ? 'One question was left when time ran out.'
            : `${unanswered} questions were left when time ran out.`}
        </p>
      )}
    </main>
  );
}
