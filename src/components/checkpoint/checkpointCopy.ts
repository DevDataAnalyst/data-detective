/** A wait in words: "1 minute", "45 minutes", "1 hour", "1 hour 30 minutes". */
export function describeMinutes(minutes: number): string {
  const whole = Math.max(0, Math.ceil(minutes));
  if (whole < 60) return whole === 1 ? '1 minute' : `${whole} minutes`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  const hourText = hours === 1 ? '1 hour' : `${hours} hours`;
  return rest === 0 ? hourText : `${hourText} ${describeMinutes(rest)}`;
}

export function questionsMissed(count: number): string {
  return count === 1 ? '1 question missed' : `${count} questions missed`;
}
