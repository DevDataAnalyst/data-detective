import { lazy, Suspense } from 'react';
import { FullScreenMessage } from '../components/FullScreenMessage';
import { unitMission } from '../content/missions';
import { missionSummaryPath } from '../content/paths';
import { unitLockReason, useUnitRoute } from './unitRoute';

// The workspace brings CodeMirror and the Python worker, so it loads only when a mission opens.
const MissionWorkspace = lazy(() => import('../mission/MissionWorkspace'));

export function MissionPage() {
  const route = useUnitRoute();
  if (!route) {
    return (
      <FullScreenMessage title="We couldn’t find that mission">
        The link might be old or mistyped.
      </FullScreenMessage>
    );
  }

  const { standing, previous } = route;
  const { unit } = standing;
  const mission = unitMission(unit);

  if (!standing.missionUnlocked) {
    return (
      <FullScreenMessage title="The mission is still locked" locked>
        {standing.unlocked
          ? `Finish all ${unit.lessons.length} lessons, or pass the test-out checkpoint, to open “${mission.title}”.`
          : unitLockReason(previous)}
      </FullScreenMessage>
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
      <MissionWorkspace
        key={mission.id}
        mission={mission}
        summaryPath={missionSummaryPath(unit.id)}
      />
    </Suspense>
  );
}
