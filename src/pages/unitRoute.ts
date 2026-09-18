import { useParams } from 'react-router';
import { courseUnits } from '../content';
import { courseStanding, unitLockReason, type UnitStanding } from '../game/course';
import { useProgress } from '../storage/progressContext';

/** The unit named in the URL (`/units/:unitId/…`) and where the learner stands in it. */
export function useUnitRoute(): { standing: UnitStanding; previous: UnitStanding | null } | null {
  const { unitId = '' } = useParams();
  const progress = useProgress();
  const standings = courseStanding(courseUnits, progress);
  const index = standings.findIndex((standing) => standing.unit.id === unitId);
  if (index === -1) return null;
  return { standing: standings[index], previous: standings[index - 1] ?? null };
}

export { unitLockReason };
