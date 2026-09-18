import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';

interface NodePopoverProps {
  id: string;
  /** Top edge in pixels inside the path column. */
  top: number;
  /** Horizontal position of the arrow, in pixels inside the path column. */
  arrowX: number;
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

const WIDTH = 288;
const COLUMN = 320;

/** A small card under a path node. Closes on Escape or a tap outside. */
export function NodePopover({ id, top, arrowX, labelledBy, onClose, children }: NodePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);
  const left = (COLUMN - WIDTH) / 2;

  useEffect(() => {
    const popover = ref.current;
    const firstAction = popover?.querySelector<HTMLElement>('a[href], button');
    (firstAction ?? popover)?.focus({ preventScroll: true });
    popover?.scrollIntoView?.({ block: 'nearest' });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      // Taps on this path's nodes are handled by the nodes themselves (toggle or switch). A node
      // on another unit's path closes this popover like any other tap outside.
      const node = target?.closest('[data-path-node]');
      if (
        !target ||
        popover?.contains(target) ||
        (node && popover?.parentElement?.contains(node))
      ) {
        return;
      }
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // The node that opened this popover points at it with aria-controls.
      const anchor = document.querySelector<HTMLElement>(`[aria-controls="${id}"]`);
      close();
      anchor?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [id]);

  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className="absolute z-20 rounded-2xl bg-surface p-4 shadow-xl ring-1 ring-slate-200 outline-none motion-safe:animate-pop-in"
      style={{ top, left, width: WIDTH }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 size-4 rotate-45 bg-surface ring-1 ring-slate-200 [clip-path:polygon(0_0,100%_0,0_100%)]"
        style={{ left: Math.min(WIDTH - 24, Math.max(8, arrowX - left - 8)) }}
      />
      {children}
    </div>
  );
}
