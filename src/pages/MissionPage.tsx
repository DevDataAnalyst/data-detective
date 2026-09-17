import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { buttonStyles } from '../components/buttonStyles';
import { LockIcon } from '../components/icons';
import { lateDeliveryMystery } from '../content/missions';
import { unit1 } from '../content/unit1';
import { completedLessonIds, hasPassedCheckpoint } from '../game/progress';
import { isMissionUnlocked } from '../game/unlocks';
import { useProgress } from '../storage/progressContext';

// The workspace brings CodeMirror and the Python worker, so it loads only when a mission opens.
const MissionWorkspace = lazy(() => import('../mission/MissionWorkspace'));

export function MissionPage() {
  const progress = useProgress();
  const unit = unit1;
  const unlocked = isMissionUnlocked(
    unit.lessons.map((lesson) => lesson.id),
    completedLessonIds(progress),
    hasPassedCheckpoint(progress, unit.checkpoint.id),
  );

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-locked-200 text-3xl text-locked-600">
          <LockIcon aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold text-slate-900">The mission is still locked</h1>
        <p className="text-slate-600">
          Finish all {unit.lessons.length} lessons, or pass the test-out checkpoint, to open “
          {lateDeliveryMystery.title}”.
        </p>
        <Link to="/" className={buttonStyles.primary}>
          Back to path
        </Link>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center p-4">
          <p role="status" className="text-slate-600">
            Opening the mission…
          </p>
        </main>
      }
    >
      <MissionWorkspace mission={lateDeliveryMystery} />
    </Suspense>
  );
}
