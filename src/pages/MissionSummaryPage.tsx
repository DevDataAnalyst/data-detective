import { Navigate, useLocation } from 'react-router';
import { FullScreenMessage } from '../components/FullScreenMessage';
import { unitMission } from '../content/missions';
import { missionPath } from '../content/paths';
import { missionProgress, selectTask } from '../game/missionProgress';
import { suggestedTaskId } from '../game/missionRules';
import { MissionSummary } from '../mission/components/MissionSummary';
import { useProgress, useProgressStore } from '../storage/progressContext';
import { useUnitRoute } from './unitRoute';

/** The mission complete screen. Until the mission is complete, it sends learners to the mission. */
export function MissionSummaryPage() {
  const progress = useProgress();
  const store = useProgressStore();
  const location = useLocation();
  const route = useUnitRoute();

  if (!route) {
    return (
      <FullScreenMessage title="We couldn’t find that mission">
        The link might be old or mistyped.
      </FullScreenMessage>
    );
  }

  const { unit } = route.standing;
  const mission = unitMission(unit);
  const saved = missionProgress(progress, mission.id);
  if (!saved.completedAt) return <Navigate to={missionPath(unit.id)} replace />;

  const state = location.state as { justCompleted?: unknown } | null;
  return (
    <MissionSummary
      mission={mission}
      missionHref={missionPath(unit.id)}
      progress={saved}
      celebrate={state?.justCompleted === true}
      onTryStretch={() =>
        store.update((current) =>
          selectTask(
            current,
            mission.id,
            suggestedTaskId(mission, missionProgress(current, mission.id)),
          ),
        )
      }
    />
  );
}
