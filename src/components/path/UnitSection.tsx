import { useRef } from 'react';
import { Link } from 'react-router';
import { unitMission } from '../../content/missions';
import { checkpointPath } from '../../content/paths';
import type { StoryMessage } from '../../content/types';
import { checkpointAvailability } from '../../game/checkpoint';
import { unitLockReason, type UnitStanding } from '../../game/course';
import { gradedTasksLabel } from '../../game/missionRules';
import { checkpointProgress, completedLessonIds, testedOutLessonIds } from '../../game/progress';
import { XP_RULES } from '../../game/xp';
import { useNow, useToday } from '../../storage/clock';
import { useProgress } from '../../storage/progressContext';
import { buttonStyles } from '../buttonStyles';
import { describeMinutes } from '../checkpoint/checkpointCopy';
import { CheckIcon, LockIcon } from '../icons';
import { Mascot } from '../Mascot';
import { MessageCard } from '../story/MessageCard';
import { PathMap } from './PathMap';
import { unitAnchor } from './unitAnchor';

interface UnitSectionProps {
  standing: UnitStanding;
  previous: UnitStanding | null;
  /** The unit the learner is working on: its banner gets Ponku. */
  current: boolean;
  onDismissHook: () => void;
}

/** One unit on the path: the milestone after the unit before it, its opening message and its map. */
export function UnitSection({ standing, previous, current, onDismissHook }: UnitSectionProps) {
  const progress = useProgress();
  const today = useToday();
  const currentTime = useNow();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { unit, number } = standing;
  const mission = unitMission(unit);
  const completed = completedLessonIds(progress);
  const checkpoint = checkpointAvailability(
    checkpointProgress(progress, unit.checkpoint.id),
    unit.checkpoint.retakeDelayMinutes,
    currentTime,
  );
  const showTestOut =
    standing.unlocked &&
    !standing.checkpointPassed &&
    standing.lessonsCompleted < unit.lessons.length;
  const titleId = `unit-${number}-title`;

  return (
    <section
      id={unitAnchor(number)}
      aria-labelledby={titleId}
      className="scroll-mt-20 space-y-5"
      data-unit={unit.id}
    >
      {previous && <UnitMilestone previous={previous} next={standing} />}

      {standing.hookPending && unit.hook && (
        <HookCard
          hook={unit.hook}
          unitNumber={number}
          onDismiss={() => {
            onDismissHook();
            titleRef.current?.focus();
          }}
        />
      )}

      <header
        className={`rounded-3xl p-5 ${
          standing.unlocked
            ? 'bg-current-600 text-white shadow-[0_6px_0_var(--color-current-800)]'
            : 'bg-surface text-slate-900 ring-1 ring-slate-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-bold tracking-wide uppercase">
              {!standing.unlocked && <LockIcon aria-hidden="true" className="text-locked-600" />}
              Unit {number}
            </p>
            <h2
              id={titleId}
              ref={titleRef}
              tabIndex={-1}
              className="text-2xl font-bold outline-none"
            >
              {unit.title}
            </h2>
            <p className={`mt-1 ${standing.unlocked ? 'text-white' : 'text-slate-700'}`}>
              {unit.description}
            </p>
          </div>
          {current && standing.unlocked && (
            <Mascot pose="waving" eager className="-mt-1 -mr-1 h-20 w-auto shrink-0 sm:h-28" />
          )}
        </div>
        {standing.unlocked ? (
          <div className="mt-4 flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={`Unit ${number} lessons completed`}
              aria-valuemin={0}
              aria-valuemax={unit.lessons.length}
              aria-valuenow={standing.lessonsCompleted}
              className="h-3 flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${(standing.lessonsCompleted / unit.lessons.length) * 100}%` }}
              />
            </div>
            <p className="text-sm font-bold whitespace-nowrap">
              {standing.lessonsCompleted} of {unit.lessons.length} lessons
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-slate-700">{unitLockReason(previous)}</p>
        )}
      </header>

      {showTestOut && (
        <section
          aria-labelledby={`${titleId}-test-out`}
          className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-slate-200"
        >
          <div className="min-w-0 flex-1">
            <h3 id={`${titleId}-test-out`} className="font-bold text-slate-900">
              Already know this?
            </h3>
            <p className="text-sm text-slate-600">
              {checkpoint.kind === 'waiting'
                ? `You can take the checkpoint again in ${describeMinutes(checkpoint.minutesLeft)}.`
                : `Pass a ${unit.checkpoint.items.length}-question checkpoint to skip ahead to the mission.`}
            </p>
          </div>
          <Link to={checkpointPath(unit.id)} className={buttonStyles.secondary}>
            {checkpoint.kind === 'waiting' ? 'See what to review' : 'Test out'}
          </Link>
        </section>
      )}

      <PathMap
        unit={unit}
        completed={completed}
        testedOut={testedOutLessonIds(progress)}
        lockedReason={standing.unlocked ? undefined : unitLockReason(previous)}
        boss={{
          state: !standing.missionUnlocked
            ? 'locked'
            : standing.boss.plays > 0
              ? 'played'
              : 'available',
          bestCorrect: standing.boss.bestCorrect,
          bonusEarnedToday: standing.boss.lastXpDay === today,
        }}
        mission={{
          title: mission.title,
          xp: XP_RULES.missionBase,
          state: standing.missionState,
          codeTasksPassed: standing.graded.passed,
          codeTaskCount: standing.graded.total,
          taskLabel: gradedTasksLabel(mission),
        }}
      />
    </section>
  );
}

/** Between two units: the one before is done (or tested out), or still needs finishing. */
function UnitMilestone({ previous, next }: { previous: UnitStanding; next: UnitStanding }) {
  const done = previous.missionState === 'completed';
  if (!next.unlocked) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-600">
        <LockIcon aria-hidden="true" className="shrink-0 text-locked-500" />
        Finish Unit {previous.number} to open Unit {next.number}
      </p>
    );
  }
  return (
    <p className="flex items-center justify-center gap-2 rounded-2xl bg-correct-50 px-4 py-3 text-center font-bold text-correct-ink-800 ring-1 ring-correct-200">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-correct-700 text-white"
      >
        <CheckIcon />
      </span>
      {done ? `Unit ${previous.number} complete!` : `Unit ${previous.number} tested out`}
    </p>
  );
}

/** A unit's opening message, shown once as a chat from the person who needs the answer. */
function HookCard({
  hook,
  unitNumber,
  onDismiss,
}: {
  hook: StoryMessage;
  unitNumber: number;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-label={`New message for unit ${unitNumber}`}
      className="space-y-3 rounded-3xl bg-surface p-4 shadow-md ring-2 ring-current-200 motion-safe:animate-pop-in"
    >
      <p className="text-xs font-bold tracking-wide text-current-ink-700 uppercase">
        New message · Unit {unitNumber}
      </p>
      <MessageCard message={hook}>
        <button type="button" onClick={onDismiss} className={`${buttonStyles.primary} w-full`}>
          I’m on it
        </button>
      </MessageCard>
    </section>
  );
}
