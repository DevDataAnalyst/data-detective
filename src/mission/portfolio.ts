import type { MissionSummaryLine } from '../content/types';
import type { MissionFacts } from '../game/missionProgress';

export function fillFacts(text: string, facts: MissionFacts): string {
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in facts ? String(facts[name as keyof MissionFacts]) : placeholder,
  );
}

const PLACEHOLDER = /\{\w+\}/;

/**
 * The summary lines that apply, given which tasks were passed, with facts filled in. Without
 * facts (Python never finished loading), lines that quote a fact are left out.
 */
export function summaryLines(
  lines: readonly MissionSummaryLine[],
  facts: MissionFacts | null,
  passedTaskIds: ReadonlySet<string>,
): string[] {
  return lines
    .filter((line) => !line.requiresTask || passedTaskIds.has(line.requiresTask))
    .filter((line) => !line.unlessTask || !passedTaskIds.has(line.unlessTask))
    .flatMap((line) => {
      if (facts) return [fillFacts(line.text, facts)];
      return PLACEHOLDER.test(line.text) ? [] : [line.text];
    });
}
