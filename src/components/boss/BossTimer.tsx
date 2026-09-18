import { ClockIcon } from '../icons';
import { formatClock } from './bossCopy';

interface BossTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  /** Animate the draining bar. False when the learner prefers reduced motion. */
  animate: boolean;
}

/**
 * The countdown. The numbers are always there and never animate; the bar drains smoothly only
 * when motion is allowed, and otherwise steps once a second.
 */
export function BossTimer({ secondsLeft, totalSeconds, animate }: BossTimerProps) {
  const share = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const low = secondsLeft <= 10;
  return (
    <div className="flex flex-1 items-center gap-3">
      <p
        role="timer"
        aria-label={`Time left: ${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'}`}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-lg font-bold tabular-nums ${
          low ? 'bg-streak-100 text-streak-ink-800' : 'bg-slate-100 text-slate-900'
        }`}
      >
        <ClockIcon aria-hidden="true" />
        {formatClock(secondsLeft)}
      </p>
      <div aria-hidden="true" className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${low ? 'bg-streak-600' : 'bg-current-600'} ${
            animate ? 'transition-[width] duration-1000 ease-linear' : ''
          }`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  );
}
