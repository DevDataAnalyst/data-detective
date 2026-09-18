import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { Unit } from '../../content/types';
import type { MissionState } from '../../game/missionRules';
import { lessonStatuses, nextLessonId, type LessonStatus } from '../../game/unlocks';
import { MISSION_SUMMARY_PATH } from '../../mission/missionHelpers';
import { buttonStyles } from '../buttonStyles';
import { BOSS_RULES } from '../../game/bossBattle';
import { XP_RULES } from '../../game/xp';
import { BoltIcon, CheckIcon, LockIcon, SearchIcon, StarIcon, TrophyIcon } from '../icons';
import { NodePopover } from './NodePopover';
import { connectorPath, PATH_LAYOUT, pathPositions, type NodePosition } from './pathGeometry';

export interface PathMission {
  title: string;
  xp: number;
  state: MissionState;
  codeTasksPassed: number;
  codeTaskCount: number;
  /** "code tasks", or "tasks" when the mission also has question tasks. */
  taskLabel: string;
}

export interface PathBoss {
  /** Locked until the mission opens; played once there is a best score. */
  state: 'locked' | 'available' | 'played';
  bestCorrect: number;
  /** Whether today's boss XP bonus has already been paid. */
  bonusEarnedToday: boolean;
}

interface PathMapProps {
  unit: Unit;
  completed: ReadonlySet<string>;
  /** Completed lessons that were marked done by passing the checkpoint. */
  testedOut: ReadonlySet<string>;
  boss: PathBoss;
  mission: PathMission;
}

const BOSS_NODE = 'boss';
const MISSION_NODE = 'mission';
/** The most a boss round can pay: every question right, plus the accuracy bonus. */
const BOSS_TOP_XP = Math.min(
  XP_RULES.bossMax,
  BOSS_RULES.maxQuestions * XP_RULES.bossPerCorrect + XP_RULES.bossAccuracyBonus,
);

const STATUS_TEXT: Record<LessonStatus, string> = {
  completed: 'completed',
  available: 'ready to start',
  locked: 'locked',
};

const CIRCLE_CLASSES: Record<LessonStatus, string> = {
  completed: 'bg-correct-600 text-white shadow-[0_6px_0_var(--color-correct-800)]',
  available: 'bg-current-600 text-white shadow-[0_6px_0_var(--color-current-800)]',
  locked: 'bg-locked-200 text-locked-500 shadow-[0_6px_0_var(--color-locked-300)]',
};

function missionStateText({
  state,
  codeTasksPassed,
  codeTaskCount,
  taskLabel,
}: PathMission): string {
  switch (state) {
    case 'locked':
      return 'locked';
    case 'available':
      return 'unlocked';
    case 'in_progress':
      return `in progress, ${codeTasksPassed} of ${codeTaskCount} ${taskLabel} passed`;
    case 'completed':
      return 'completed';
  }
}

export function PathMap({
  unit,
  completed,
  testedOut,
  boss: bossInfo,
  mission: missionInfo,
}: PathMapProps) {
  const baseId = useId();
  const [openNode, setOpenNode] = useState<string | null>(null);

  const { title: missionTitle, xp: missionXp, state: missionState } = missionInfo;
  const lessonIds = unit.lessons.map((lesson) => lesson.id);
  const statuses = lessonStatuses(lessonIds, completed);
  const missionUnlocked = missionState !== 'locked';
  const missionDone = missionState === 'completed';
  const bossUnlocked = bossInfo.state !== 'locked';
  const upNext =
    nextLessonId(lessonIds, completed) ??
    (bossInfo.state === 'available' && !missionDone
      ? BOSS_NODE
      : missionUnlocked && !missionDone
        ? MISSION_NODE
        : null);
  const { lessons: positions, boss, mission, height } = pathPositions(unit.lessons.length);
  const allPositions = [...positions, boss, mission];
  const reached = [...statuses.map((status) => status !== 'locked'), bossUnlocked, missionUnlocked];

  const toggle = (nodeId: string) => setOpenNode((open) => (open === nodeId ? null : nodeId));
  const closePopover = () => setOpenNode(null);
  const popoverId = `${baseId}-popover`;
  const popoverTitleId = `${baseId}-popover-title`;

  const popoverFor = (position: NodePosition) => ({
    id: popoverId,
    labelledBy: popoverTitleId,
    top: position.cy + position.size / 2 + 14,
    arrowX: position.cx,
    onClose: closePopover,
  });

  const renderLessonPopover = (lessonId: string) => {
    const index = lessonIds.indexOf(lessonId);
    const lesson = unit.lessons[index];
    const status = statuses[index];
    return (
      <NodePopover key={lessonId} {...popoverFor(positions[index])}>
        <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
          Lesson {index + 1} · about {lesson.estimatedMinutes} min
        </p>
        <h2 id={popoverTitleId} className="mt-0.5 text-lg font-bold text-slate-900">
          {lesson.title}
        </h2>
        {status === 'locked' ? (
          <p className="mt-2 flex items-start gap-2 text-slate-700">
            <LockIcon className="mt-0.5 shrink-0 text-locked-500" aria-hidden="true" />
            <span>Complete “{unit.lessons[index - 1]?.title}” to unlock this lesson.</span>
          </p>
        ) : (
          <>
            {testedOut.has(lesson.id) && (
              <p className="mt-1 text-slate-700">
                You tested out of this lesson. Play it any time for practice.
              </p>
            )}
            <Link to={`/lesson/${lesson.id}`} className={`mt-3 w-full ${buttonStyles.primary}`}>
              {testedOut.has(lesson.id)
                ? 'Practise'
                : status === 'completed'
                  ? 'Practise again'
                  : 'Start'}
            </Link>
          </>
        )}
      </NodePopover>
    );
  };

  return (
    <div className="relative mx-auto" style={{ width: PATH_LAYOUT.width, height }}>
      <svg
        aria-hidden="true"
        width={PATH_LAYOUT.width}
        height={height}
        className="absolute inset-0 overflow-visible"
      >
        {allPositions.slice(1).map((position, index) => (
          <path
            key={index}
            d={connectorPath(allPositions[index], position)}
            fill="none"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={reached[index + 1] ? undefined : '1 20'}
            className={reached[index + 1] ? 'stroke-correct-200' : 'stroke-locked-300'}
          />
        ))}
      </svg>

      <ol aria-label={`${unit.title} lessons`}>
        {unit.lessons.map((lesson, index) => {
          const status = statuses[index];
          const position = positions[index];
          const isOpen = openNode === lesson.id;
          return (
            <li
              key={lesson.id}
              className="absolute w-40"
              style={{ left: position.cx - 80, top: position.cy - position.size / 2 }}
            >
              <button
                type="button"
                data-path-node={lesson.id}
                aria-label={`Lesson ${index + 1}: ${lesson.title}, ${STATUS_TEXT[status]}${testedOut.has(lesson.id) ? ' (tested out)' : ''}`}
                aria-expanded={isOpen}
                aria-controls={isOpen ? popoverId : undefined}
                onClick={() => toggle(lesson.id)}
                className="group relative flex w-full flex-col items-center gap-2.5 rounded-2xl pb-1 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-current-600"
              >
                {upNext === lesson.id && (
                  <UpNextBubble label={completed.size === 0 ? 'Start' : 'Next'} />
                )}
                <span className="relative flex size-[76px] items-center justify-center">
                  {status === 'available' && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-current-500/35 motion-safe:animate-ping-soft motion-reduce:hidden"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative flex size-full items-center justify-center rounded-full text-3xl transition-transform group-active:translate-y-1 ${CIRCLE_CLASSES[status]}`}
                  >
                    {status === 'completed' ? (
                      <CheckIcon />
                    ) : status === 'locked' ? (
                      <LockIcon />
                    ) : (
                      <StarIcon />
                    )}
                  </span>
                </span>
                <span
                  className={`rounded-lg bg-slate-50 px-1.5 py-0.5 text-center text-sm leading-tight font-semibold ${status === 'locked' ? 'text-slate-600' : 'text-slate-800'}`}
                >
                  {lesson.title}
                </span>
              </button>
            </li>
          );
        })}

        <li className="absolute w-48" style={{ left: boss.cx - 96, top: boss.cy - boss.size / 2 }}>
          <button
            type="button"
            data-path-node={BOSS_NODE}
            aria-label={`Boss battle, ${
              bossInfo.state === 'locked'
                ? 'locked'
                : bossInfo.state === 'played'
                  ? `best score ${bossInfo.bestCorrect} right`
                  : 'ready to start'
            }`}
            aria-expanded={openNode === BOSS_NODE}
            aria-controls={openNode === BOSS_NODE ? popoverId : undefined}
            onClick={() => toggle(BOSS_NODE)}
            className="group relative flex w-full flex-col items-center gap-2 rounded-2xl pb-1 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-current-600"
          >
            {upNext === BOSS_NODE && <UpNextBubble label="Next" />}
            <span className="relative flex size-[88px] items-center justify-center">
              {bossInfo.state === 'available' && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-streak-500/35 motion-safe:animate-ping-soft motion-reduce:hidden"
                />
              )}
              <span
                aria-hidden="true"
                className={`relative flex size-full items-center justify-center rounded-full text-4xl transition-transform group-active:translate-y-1 ${
                  bossUnlocked
                    ? 'bg-streak-600 text-white shadow-[0_7px_0_var(--color-streak-800)]'
                    : 'bg-locked-200 text-locked-500 shadow-[0_7px_0_var(--color-locked-300)]'
                }`}
              >
                {bossUnlocked ? <TrophyIcon /> : <LockIcon />}
              </span>
            </span>
            <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-center leading-tight">
              <span className="block text-xs font-bold tracking-wide text-streak-ink-700 uppercase">
                Boss battle
              </span>
              <span className="block text-sm font-semibold text-slate-800">
                {bossInfo.state === 'played'
                  ? `Best: ${bossInfo.bestCorrect} right`
                  : `${BOSS_RULES.durationMs / 1000}-second round`}
              </span>
            </span>
          </button>
        </li>

        <li
          className="absolute w-60"
          style={{ left: mission.cx - 120, top: mission.cy - mission.size / 2 }}
        >
          <button
            type="button"
            data-path-node={MISSION_NODE}
            aria-label={`Mission: ${missionTitle}, ${missionStateText(missionInfo)}, worth ${missionXp} XP`}
            aria-expanded={openNode === MISSION_NODE}
            aria-controls={openNode === MISSION_NODE ? popoverId : undefined}
            onClick={() => toggle(MISSION_NODE)}
            className="group relative flex w-full flex-col items-center gap-2 rounded-2xl pb-1 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-current-600"
          >
            {upNext === MISSION_NODE && <UpNextBubble label="Next" />}
            <span className="relative flex size-[104px] items-center justify-center">
              {missionUnlocked && !missionDone && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-xp-500/35 motion-safe:animate-ping-soft motion-reduce:hidden"
                />
              )}
              <span
                aria-hidden="true"
                className={`relative flex size-full items-center justify-center rounded-full text-5xl transition-transform group-active:translate-y-1 ${
                  missionDone
                    ? 'bg-correct-600 text-white shadow-[0_7px_0_var(--color-correct-800)]'
                    : missionUnlocked
                      ? 'bg-linear-to-br from-xp-500 to-xp-700 text-white shadow-[0_7px_0_var(--color-xp-700)]'
                      : 'bg-locked-200 text-locked-500 shadow-[0_7px_0_var(--color-locked-300)]'
                }`}
              >
                <SearchIcon />
                {!missionUnlocked && (
                  <span className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full bg-surface text-xl text-locked-600 ring-2 ring-locked-200">
                    <LockIcon />
                  </span>
                )}
                {missionDone && (
                  <span className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full bg-surface text-xl text-correct-ink-700 ring-2 ring-correct-200">
                    <CheckIcon />
                  </span>
                )}
              </span>
            </span>
            <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-center leading-tight">
              <span className="block text-xs font-bold tracking-wide text-xp-ink-700 uppercase">
                Mission
              </span>
              <span className="block font-bold text-slate-900">{missionTitle}</span>
            </span>
            {missionState === 'in_progress' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-xp-100 px-2.5 py-0.5 text-sm font-bold text-xp-ink-700">
                {missionInfo.codeTasksPassed} of {missionInfo.codeTaskCount} tasks passed
              </span>
            ) : missionDone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-correct-100 px-2.5 py-0.5 text-sm font-bold text-correct-ink-800">
                <CheckIcon aria-hidden="true" />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-xp-100 px-2.5 py-0.5 text-sm font-bold text-xp-ink-700">
                <BoltIcon aria-hidden="true" />+{missionXp} XP
              </span>
            )}
          </button>
        </li>
      </ol>

      {openNode &&
        openNode !== MISSION_NODE &&
        openNode !== BOSS_NODE &&
        renderLessonPopover(openNode)}

      {openNode === BOSS_NODE && (
        <NodePopover key={BOSS_NODE} {...popoverFor(boss)}>
          <p className="text-xs font-bold tracking-wide text-streak-ink-700 uppercase">
            Boss battle · up to {BOSS_TOP_XP} XP
          </p>
          <h2 id={popoverTitleId} className="mt-0.5 text-lg font-bold text-slate-900">
            Beat the clock
          </h2>
          {bossInfo.state === 'locked' ? (
            <p className="mt-2 flex items-start gap-2 text-slate-700">
              <LockIcon className="mt-0.5 shrink-0 text-locked-500" aria-hidden="true" />
              <span>
                Finish all {unit.lessons.length} lessons, or pass the test-out checkpoint, to take
                on the boss.
              </span>
            </p>
          ) : (
            <>
              <p className="mt-1 text-slate-700">
                {BOSS_RULES.durationMs / 1000} seconds of mixed questions you have got right before
                in this unit.
                {bossInfo.state === 'played' && ` Your best: ${bossInfo.bestCorrect} right.`}
              </p>
              {bossInfo.bonusEarnedToday && (
                <p className="mt-1 text-sm text-slate-600">
                  Today’s XP bonus is earned. Play again for practice.
                </p>
              )}
              <Link to={`/units/${unit.id}/boss`} className={`mt-3 w-full ${buttonStyles.primary}`}>
                {bossInfo.state === 'played' ? 'Play again' : 'Start the boss battle'}
              </Link>
            </>
          )}
        </NodePopover>
      )}

      {openNode === MISSION_NODE && (
        <NodePopover key={MISSION_NODE} {...popoverFor(mission)}>
          <p className="text-xs font-bold tracking-wide text-xp-ink-700 uppercase">
            Mission · worth {missionXp} XP
          </p>
          <h2 id={popoverTitleId} className="mt-0.5 text-lg font-bold text-slate-900">
            {missionTitle}
          </h2>
          {missionDone ? (
            <>
              <p className="mt-1 text-slate-700">
                You solved it. Your summary and portfolio text are here whenever you need them.
              </p>
              <Link to={MISSION_SUMMARY_PATH} className={`mt-3 w-full ${buttonStyles.primary}`}>
                See summary
              </Link>
              <Link to="/mission" className={`mt-2 w-full ${buttonStyles.secondary}`}>
                Open mission
              </Link>
            </>
          ) : missionState === 'in_progress' ? (
            <>
              <p className="mt-1 text-slate-700">
                You have passed {missionInfo.codeTasksPassed} of {missionInfo.codeTaskCount}{' '}
                {missionInfo.taskLabel}. Your work is saved.
              </p>
              <Link to="/mission" className={`mt-3 w-full ${buttonStyles.primary}`}>
                Continue mission
              </Link>
            </>
          ) : missionUnlocked ? (
            <>
              <p className="mt-1 text-slate-700">
                Write real Python to find out where deliveries are really late.
              </p>
              <Link to="/mission" className={`mt-3 w-full ${buttonStyles.primary}`}>
                Open mission
              </Link>
            </>
          ) : (
            <p className="mt-2 flex items-start gap-2 text-slate-700">
              <LockIcon className="mt-0.5 shrink-0 text-locked-500" aria-hidden="true" />
              <span>
                Finish all {unit.lessons.length} lessons, or pass the test-out checkpoint, to unlock
                the mission.
              </span>
            </p>
          )}
        </NodePopover>
      )}
    </div>
  );
}

function UpNextBubble({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-11 z-10 rounded-xl bg-surface px-3 py-1 text-sm font-bold text-current-ink-700 uppercase shadow-md ring-2 ring-current-200 motion-safe:animate-float"
    >
      {label}
    </span>
  );
}
