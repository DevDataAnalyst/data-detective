/** Positions for the winding lesson path, in pixels inside a fixed-width column. */

export const PATH_LAYOUT = {
  width: 320,
  lessonSize: 76,
  missionSize: 104,
  rowHeight: 156,
  swing: 70,
  /** Room above the first node for the "Start" bubble. */
  top: 44,
  /** Room below the mission node for its label and XP badge. */
  bottom: 120,
} as const;

/** Horizontal offsets as a share of the swing, repeating down the path. */
const SWING_PATTERN = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7];

export interface NodePosition {
  cx: number;
  cy: number;
  size: number;
}

export function pathPositions(lessonCount: number): {
  lessons: NodePosition[];
  mission: NodePosition;
  height: number;
} {
  const { width, lessonSize, missionSize, rowHeight, swing, top, bottom } = PATH_LAYOUT;
  const lessons = Array.from({ length: lessonCount }, (_, index) => ({
    cx: width / 2 + SWING_PATTERN[index % SWING_PATTERN.length] * swing,
    cy: top + lessonSize / 2 + index * rowHeight,
    size: lessonSize,
  }));
  const mission = {
    cx: width / 2,
    cy: top + lessonCount * rowHeight + missionSize / 2,
    size: missionSize,
  };
  return { lessons, mission, height: mission.cy + missionSize / 2 + bottom };
}

/** A smooth S-curve between two node centres. */
export function connectorPath(from: NodePosition, to: NodePosition): string {
  const midY = (from.cy + to.cy) / 2;
  return `M ${from.cx} ${from.cy} C ${from.cx} ${midY}, ${to.cx} ${midY}, ${to.cx} ${to.cy}`;
}
