const CORRECT_HEADLINES = ['Nice work!', 'Correct!', 'Spot on!', 'You got it!', 'Exactly right!'];
const INCORRECT_HEADLINES = ['Not quite', 'Almost there', 'Good try', 'Not this time'];

/** A small, stable hash so the same question gets the same headline on every render. */
function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

export function feedbackHeadline(correct: boolean, seed: string): string {
  const options = correct ? CORRECT_HEADLINES : INCORRECT_HEADLINES;
  return options[hash(seed) % options.length];
}

export function summaryMessage(accuracy: number): string {
  if (accuracy === 1) return 'Every answer right on the first try. Impressive detective work.';
  if (accuracy >= 0.8) return 'Strong work. The few you missed are now fresh in your mind.';
  if (accuracy >= 0.5) return 'Good progress. Retrying the tricky ones is exactly how this sticks.';
  return 'You kept going until every answer was right. That is how new ideas sink in.';
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}
