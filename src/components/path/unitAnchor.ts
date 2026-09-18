/** The id of a unit's section on the path, e.g. "unit-2", used as a link target. */
export function unitAnchor(number: number): string {
  return `unit-${number}`;
}
