import { lateDeliveryMystery } from './mission1';
import type { Mission } from './types';

export { lateDeliveryMystery };

export const missions: readonly Mission[] = [lateDeliveryMystery];

export function findMission(missionId: string): Mission | null {
  return missions.find((mission) => mission.id === missionId) ?? null;
}
