import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { Unit } from '../../content/types';
import {
  isMissionUnlocked,
  lessonStatuses,
  nextLessonId,
  type LessonStatus,
} from '../../game/unlocks';
import { buttonStyles } from '../buttonStyles';
import { BoltIcon, CheckIcon, LockIcon, SearchIcon, StarIcon } from '../icons';
import { NodePopover } from './NodePopover';
import { connectorPath, PATH_LAYOUT, pathPositions, type NodePosition } from './pathGeometry';

interface PathMapProps {
  unit: Unit;
  completed: ReadonlySet<string>;
  checkpointPassed: boolean;
  missionTitle: string;
  missionXp: number;
}

const MISSION_NODE = 'mission';

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

export function PathMap({
  unit,
  completed,
  checkpointPassed,
  missionTitle,
  missionXp,
}: PathMapProps) {
  const baseId = useId();
  const [openNode, setOpenNode] = useState<string | null>(null);

  const lessonIds = unit.lessons.map((lesson) => lesson.id);
  const statuses = lessonStatuses(lessonIds, completed);
  const missionUnlocked = isMissionUnlocked(lessonIds, completed, checkpointPassed);
  const upNext = nextLessonId(lessonIds, completed) ?? (missionUnlocked ? MISSION_NODE : null);
  const { lessons: positions, mission, height } = pathPositions(unit.lessons.length);
  const allPositions = [...positions, mission];
  const reached = [...statuses.map((status) => status !== 'locked'), missionUnlocked];

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
        <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
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
          <Link to={`/lesson/${lesson.id}`} className={`mt-3 w-full ${buttonStyles.primary}`}>
            {status === 'completed' ? 'Practise again' : 'Start'}
          </Link>
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
                aria-label={`Lesson ${index + 1}: ${lesson.title}, ${STATUS_TEXT[status]}`}
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
                  className={`rounded-lg bg-slate-50 px-1.5 py-0.5 text-center text-sm leading-tight font-semibold ${status === 'locked' ? 'text-slate-500' : 'text-slate-800'}`}
                >
                  {lesson.title}
                </span>
              </button>
            </li>
          );
        })}

        <li
          className="absolute w-60"
          style={{ left: mission.cx - 120, top: mission.cy - mission.size / 2 }}
        >
          <button
            type="button"
            data-path-node={MISSION_NODE}
            aria-label={`Mission: ${missionTitle}, ${missionUnlocked ? 'unlocked' : 'locked'}, worth ${missionXp} XP`}
            aria-expanded={openNode === MISSION_NODE}
            aria-controls={openNode === MISSION_NODE ? popoverId : undefined}
            onClick={() => toggle(MISSION_NODE)}
            className="group relative flex w-full flex-col items-center gap-2 rounded-2xl pb-1 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-current-600"
          >
            {upNext === MISSION_NODE && <UpNextBubble label="Next" />}
            <span className="relative flex size-[104px] items-center justify-center">
              {missionUnlocked && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-xp-500/35 motion-safe:animate-ping-soft motion-reduce:hidden"
                />
              )}
              <span
                aria-hidden="true"
                className={`relative flex size-full items-center justify-center rounded-full text-5xl transition-transform group-active:translate-y-1 ${
                  missionUnlocked
                    ? 'bg-linear-to-br from-xp-500 to-xp-700 text-white shadow-[0_7px_0_var(--color-xp-700)]'
                    : 'bg-locked-200 text-locked-500 shadow-[0_7px_0_var(--color-locked-300)]'
                }`}
              >
                <SearchIcon />
                {!missionUnlocked && (
                  <span className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full bg-white text-xl text-locked-600 ring-2 ring-locked-200">
                    <LockIcon />
                  </span>
                )}
              </span>
            </span>
            <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-center leading-tight">
              <span className="block text-xs font-bold tracking-wide text-xp-700 uppercase">
                Mission
              </span>
              <span className="block font-bold text-slate-900">{missionTitle}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-xp-100 px-2.5 py-0.5 text-sm font-bold text-xp-700">
              <BoltIcon aria-hidden="true" />+{missionXp} XP
            </span>
          </button>
        </li>
      </ol>

      {openNode && openNode !== MISSION_NODE && renderLessonPopover(openNode)}

      {openNode === MISSION_NODE && (
        <NodePopover key={MISSION_NODE} {...popoverFor(mission)}>
          <p className="text-xs font-bold tracking-wide text-xp-700 uppercase">
            Mission · worth {missionXp} XP
          </p>
          <h2 id={popoverTitleId} className="mt-0.5 text-lg font-bold text-slate-900">
            {missionTitle}
          </h2>
          {missionUnlocked ? (
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
      className="absolute -top-11 z-10 rounded-xl bg-white px-3 py-1 text-sm font-bold text-current-700 uppercase shadow-md ring-2 ring-current-200 motion-safe:animate-float"
    >
      {label}
    </span>
  );
}
