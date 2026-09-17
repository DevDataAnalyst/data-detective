import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Unit } from '../../content/types';
import type { CheckpointAnswerRecord } from '../../game/checkpoint';
import type { CheckpointOutcome } from '../../game/rewards';
import type { LessonStatus } from '../../game/unlocks';
import { buttonStyles } from '../buttonStyles';
import { usePrefersReducedMotion, useCountUp } from '../hooks';
import { BoltIcon, ClockIcon, StarIcon, TargetIcon } from '../icons';
import { CheckpointReview } from './CheckpointReview';
import { TopicsToReview } from './TopicsToReview';

/** Full-page layout for checkpoint screens outside the question flow. */
export function CheckpointScreen({ children }: { children: ReactNode }) {
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
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">{children}</main>
    </div>
  );
}

/** A focused page title, so screen readers start at the result. */
export function ScreenTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <div className="space-y-4 text-center">
      {icon}
      <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold text-slate-900 outline-none">
        {children}
      </h1>
    </div>
  );
}

interface CheckpointResultsProps {
  unit: Unit;
  outcome: CheckpointOutcome;
  answers: Readonly<Record<string, CheckpointAnswerRecord>>;
  /** Lesson status after the attempt was saved. */
  statusOf: (lessonId: string) => LessonStatus;
  /** Where to start reviewing after a failed attempt. */
  reviewStartLessonId: string | null;
  retakeDelay: string;
}

export function CheckpointResults({
  unit,
  outcome,
  answers,
  statusOf,
  reviewStartLessonId,
  retakeDelay,
}: CheckpointResultsProps) {
  const { score } = outcome;
  const reducedMotion = usePrefersReducedMotion();
  const shownXp = useCountUp(outcome.xp, !reducedMotion && outcome.xp > 0);
  const startIndex = unit.lessons.findIndex((lesson) => lesson.id === reviewStartLessonId);
  const startLesson = unit.lessons[startIndex];

  if (score.passed) {
    return (
      <CheckpointScreen>
        <section className="space-y-4 rounded-3xl bg-white px-4 py-6 text-center ring-1 ring-slate-200">
          <ScreenTitle
            icon={
              <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-correct-100 text-5xl text-correct-700 motion-safe:animate-pop-in">
                <StarIcon aria-hidden="true" />
              </span>
            }
          >
            You tested out
          </ScreenTitle>
          <p className="text-lg text-slate-700">
            {score.correct} of {score.total} right. You needed {score.needed}.
          </p>
          {outcome.xp > 0 && (
            <p className="inline-flex items-center gap-1 rounded-full bg-xp-100 px-3 py-1 text-lg font-bold text-xp-700 tabular-nums">
              <BoltIcon aria-hidden="true" />
              <span aria-hidden="true">+{shownXp} XP</span>
              <span className="sr-only">{outcome.xp} XP earned</span>
            </p>
          )}
          <p className="text-slate-700">
            All {unit.lessons.length} lessons are now marked as done, and the mission is open. You
            can still play any lesson for practice.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/mission" className={`${buttonStyles.primary} sm:flex-1`}>
              Open the mission
            </Link>
            <Link to="/" className={`${buttonStyles.secondary} sm:flex-1`}>
              Back to path
            </Link>
          </div>
        </section>
        <CheckpointReview checkpoint={unit.checkpoint} lessons={unit.lessons} answers={answers} />
      </CheckpointScreen>
    );
  }

  return (
    <CheckpointScreen>
      <section className="space-y-4 rounded-3xl bg-white px-4 py-6 text-center ring-1 ring-slate-200">
        <ScreenTitle
          icon={
            <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-current-100 text-5xl text-current-700">
              <TargetIcon aria-hidden="true" />
            </span>
          }
        >
          Not quite this time
        </ScreenTitle>
        <p className="text-lg text-slate-700">
          {score.correct} of {score.total} right. You need {score.needed} to test out.
        </p>
        {startLesson && (
          <p className="text-slate-700">
            {score.missedLessonIds.includes(startLesson.id)
              ? `Start with “${startLesson.title}”, then try again.`
              : `Lessons open in order, so start with “${startLesson.title}”. The topics below come up along the way.`}
          </p>
        )}
        <p className="flex items-center justify-center gap-1.5 text-sm text-slate-600">
          <ClockIcon aria-hidden="true" />
          You can take the checkpoint again in {retakeDelay}.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {startLesson && (
            <Link to={`/lesson/${startLesson.id}`} className={`${buttonStyles.primary} sm:flex-1`}>
              Start lesson {startIndex + 1}
            </Link>
          )}
          <Link to="/" className={`${buttonStyles.secondary} sm:flex-1`}>
            Back to path
          </Link>
        </div>
      </section>
      <TopicsToReview
        lessons={unit.lessons}
        missedLessonIds={score.missedLessonIds}
        missedByLesson={score.missedByLesson}
        statusOf={statusOf}
      />
      <CheckpointReview checkpoint={unit.checkpoint} lessons={unit.lessons} answers={answers} />
    </CheckpointScreen>
  );
}
