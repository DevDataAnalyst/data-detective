import { Navigate, useLocation } from 'react-router';
import { lateDeliveryMystery } from '../content/missions';
import { missionProgress, selectTask } from '../game/missionProgress';
import { suggestedTaskId } from '../game/missionRules';
import { MissionSummary } from '../mission/components/MissionSummary';
import { useProgress, useProgressStore } from '../storage/progressContext';

/** The mission complete screen. Until the mission is complete, it sends learners to the mission. */
export function MissionSummaryPage() {
  const progress = useProgress();
  const store = useProgressStore();
  const location = useLocation();
  const mission = lateDeliveryMystery;
  const saved = missionProgress(progress, mission.id);

  if (!saved.completedAt) return <Navigate to="/mission" replace />;

  const state = location.state as { justCompleted?: unknown } | null;
  return (
    <MissionSummary
      mission={mission}
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
