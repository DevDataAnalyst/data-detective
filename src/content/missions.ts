import { lateDeliveryMystery } from './mission1';
import { theFalseAlarm } from './mission2';
import type { Mission, Unit } from './types';

export { lateDeliveryMystery, theFalseAlarm };

export const missions: readonly Mission[] = [lateDeliveryMystery, theFalseAlarm];

export function findMission(missionId: string): Mission | null {
  return missions.find((mission) => mission.id === missionId) ?? null;
}

/** The mission at the end of a unit. Every unit has one; validation checks it exists. */
export function unitMission(unit: Unit): Mission {
  const mission = findMission(unit.missionId);
  if (!mission) throw new Error(`No mission "${unit.missionId}" for ${unit.id}`);
  return mission;
}
