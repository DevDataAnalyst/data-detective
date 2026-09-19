import { lateDeliveryMystery } from './mission1';
import { theFalseAlarm } from './mission2';
import { theCheckoutRedesign } from './mission3';
import { theFinalRound } from './mission4';
import type { Mission, MissionDataset, Unit } from './types';

export { lateDeliveryMystery, theCheckoutRedesign, theFalseAlarm, theFinalRound };

export const missions: readonly Mission[] = [
  lateDeliveryMystery,
  theFalseAlarm,
  theCheckoutRedesign,
  theFinalRound,
];

export function findMission(missionId: string): Mission | null {
  return missions.find((mission) => mission.id === missionId) ?? null;
}

/** Every data file a mission uses, its main dataset first. */
export function missionDataFiles(mission: Mission): MissionDataset[] {
  return [mission.dataset, ...(mission.extraData ?? [])];
}

/** The mission at the end of a unit. Every unit has one; validation checks it exists. */
export function unitMission(unit: Unit): Mission {
  const mission = findMission(unit.missionId);
  if (!mission) throw new Error(`No mission "${unit.missionId}" for ${unit.id}`);
  return mission;
}
