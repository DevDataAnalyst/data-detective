/** Seconds as m:ss, e.g. 0:07 or 1:30. */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** Spoken reminders as time runs down, keyed by the seconds left. */
export const TIME_WARNINGS: ReadonlyArray<{ at: number; text: string }> = [
  { at: 30, text: '30 seconds left.' },
  { at: 10, text: '10 seconds left.' },
];
