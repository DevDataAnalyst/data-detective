import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function prefersReducedMotionNow(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** True when the learner has asked their device for less motion. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotionNow, () => false);
}

/**
 * Measures an element's width in CSS pixels so SVG charts can be drawn at 1:1 scale, which keeps
 * touch targets at their real size. Falls back to `fallback` until measured (and in tests).
 */
export function useElementWidth<T extends Element>(fallback: number) {
  const [width, setWidth] = useState(fallback);
  const ref = useCallback((node: T | null) => {
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured) setWidth(Math.floor(measured));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Keys typed into these elements should not trigger lesson shortcuts. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return (
    target instanceof HTMLInputElement &&
    !['radio', 'checkbox', 'range', 'button', 'submit'].includes(target.type)
  );
}

/** Elements that already act on Enter by themselves. */
export function handlesEnterNatively(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLButtonElement ||
    target instanceof HTMLAnchorElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** Counts up from 0 to `target` with an ease-out, or shows `target` at once when not animating. */
export function useCountUp(target: number, animate: boolean, durationMs = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!animate || typeof requestAnimationFrame !== 'function') return;
    let frame = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / durationMs);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, durationMs]);

  return animate && typeof requestAnimationFrame === 'function' ? value : target;
}
