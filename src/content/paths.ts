/** Where each unit's full-screen pages live. */

export function checkpointPath(unitId: string): string {
  return `/units/${unitId}/checkpoint`;
}

export function bossPath(unitId: string): string {
  return `/units/${unitId}/boss`;
}

export function missionPath(unitId: string): string {
  return `/units/${unitId}/mission`;
}

/** The mission complete screen. It does not load Python, so it opens quickly. */
export function missionSummaryPath(unitId: string): string {
  return `/units/${unitId}/mission/summary`;
}
