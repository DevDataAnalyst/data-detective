import type { Mission } from './types';

/** Placeholder mission records until the full mission model arrives in build step 6. */
export const lateDeliveryMystery: Mission = {
  id: 'late-delivery-mystery',
  title: 'The Late Delivery Mystery',
};

export const missions: readonly Mission[] = [lateDeliveryMystery];

export function findMission(missionId: string): Mission | null {
  return missions.find((mission) => mission.id === missionId) ?? null;
}
