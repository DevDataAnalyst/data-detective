import { Link } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { PathMap } from '../components/path/PathMap';
import { findMission } from '../content/missions';
import { unit1 } from '../content/unit1';
import { completedLessonIds } from '../game/progress';
import { useProgress } from '../storage/progressContext';

/** Shown on the mission node until the XP rules land in build step 5. */
const MISSION_XP = 100;

export function PathPage() {
  const progress = useProgress();
  const unit = unit1;
  const completed = completedLessonIds(progress);
  const completedCount = unit.lessons.filter((lesson) => completed.has(lesson.id)).length;
  const mission = findMission(unit.missionId);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-current-600 p-5 text-white shadow-[0_6px_0_var(--color-current-800)]">
        <p className="text-sm font-bold tracking-wide uppercase">Unit 1</p>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <p className="mt-1 text-white/90">{unit.description}</p>
        <div className="mt-4 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Lessons completed"
            aria-valuemin={0}
            aria-valuemax={unit.lessons.length}
            aria-valuenow={completedCount}
            className="h-3 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${(completedCount / unit.lessons.length) * 100}%` }}
            />
          </div>
          <p className="text-sm font-bold whitespace-nowrap">
            {completedCount} of {unit.lessons.length} lessons
          </p>
        </div>
      </header>

      <section
        aria-labelledby="test-out-title"
        className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        <div className="min-w-0 flex-1">
          <h2 id="test-out-title" className="font-bold text-slate-900">
            Already know this?
          </h2>
          <p className="text-sm text-slate-600">
            Pass a 10-question checkpoint to skip ahead to the mission.
          </p>
        </div>
        <Link to="/checkpoint" className={buttonStyles.secondary}>
          Test out
        </Link>
      </section>

      <PathMap
        unit={unit}
        completed={completed}
        checkpointPassed={false}
        missionTitle={mission?.title ?? 'Mission'}
        missionXp={MISSION_XP}
      />
    </div>
  );
}
