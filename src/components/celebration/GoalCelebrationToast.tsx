import { useEffect, useEffectEvent } from 'react';
import { CloseIcon, FlameIcon } from '../icons';
import type { GoalCelebration } from './celebrationContext';

const CONFETTI = [
  { left: '8%', delay: '0ms', color: 'bg-streak-500' },
  { left: '22%', delay: '120ms', color: 'bg-xp-500' },
  { left: '38%', delay: '60ms', color: 'bg-correct-500' },
  { left: '55%', delay: '180ms', color: 'bg-current-500' },
  { left: '70%', delay: '30ms', color: 'bg-streak-500' },
  { left: '86%', delay: '150ms', color: 'bg-xp-500' },
];

const AUTO_DISMISS_MS = 5000;

export function GoalCelebrationToast({
  celebration,
  onDismiss,
}: {
  celebration: GoalCelebration;
  onDismiss: () => void;
}) {
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  const streakText =
    celebration.streak === 1 ? 'Your streak starts today.' : `${celebration.streak} day streak.`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-xl ring-2 ring-streak-500 motion-safe:animate-pop-in"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-full motion-reduce:hidden">
          {CONFETTI.map((piece) => (
            <span
              key={piece.left}
              className={`absolute -top-2 size-2 rounded-sm ${piece.color} motion-safe:animate-confetti`}
              style={{ left: piece.left, animationDelay: piece.delay }}
            />
          ))}
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-streak-100 text-2xl text-streak-600">
          <FlameIcon aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">Daily goal reached!</p>
          <p className="text-sm text-slate-600">
            {celebration.xpToday} XP today. {streakText}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
