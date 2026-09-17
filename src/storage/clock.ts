import { useEffect, useState, useSyncExternalStore } from 'react';
import { toDateKey, type DateKey } from '../game/streak';

/**
 * The app's clock. Game logic never reads the time itself; it is handed `now()` from here. In
 * development builds a day offset can be set from the profile page to test streak rollover.
 */

const OFFSET_KEY = 'data-detective:dev-day-offset';
const DAY_MS = 86_400_000;
const listeners = new Set<() => void>();

function readOffset(): number {
  if (!import.meta.env.DEV) return 0;
  try {
    return Number(window.localStorage.getItem(OFFSET_KEY)) || 0;
  } catch {
    return 0;
  }
}

let dayOffset = readOffset();

export function now(): Date {
  return new Date(Date.now() + dayOffset * DAY_MS);
}

export function today(): DateKey {
  return toDateKey(now());
}

export function devDayOffset(): number {
  return dayOffset;
}

/** Development only: pretend it is `days` days from now. */
export function setDevDayOffset(days: number): void {
  if (!import.meta.env.DEV) return;
  dayOffset = days;
  try {
    if (days === 0) window.localStorage.removeItem(OFFSET_KEY);
    else window.localStorage.setItem(OFFSET_KEY, String(days));
  } catch {
    // The offset still applies until the page reloads.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleMidnight = () => {
    const current = now();
    const nextDay = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + 1,
      0,
      0,
      1,
    );
    timer = setTimeout(() => {
      listener();
      scheduleMidnight();
    }, nextDay.getTime() - current.getTime());
  };
  scheduleMidnight();
  const onVisible = () => {
    if (document.visibilityState === 'visible') listener();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', listener);
  return () => {
    listeners.delete(listener);
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', listener);
  };
}

/** Today's local date. Updates at midnight, when the app regains focus, and on dev offset changes. */
export function useToday(): DateKey {
  return useSyncExternalStore(subscribe, today, today);
}

/** The current time, refreshed every `refreshMs`, for countdowns such as the checkpoint retake. */
export function useNow(refreshMs = 30_000): Date {
  const [current, setCurrent] = useState(now);
  useEffect(() => {
    const timer = setInterval(() => setCurrent(now()), refreshMs);
    return () => clearInterval(timer);
  }, [refreshMs]);
  return current;
}
