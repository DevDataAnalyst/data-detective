import { MASCOT_ART, type MascotPose } from './mascotArt';

export type { MascotPose };

interface MascotProps {
  pose: MascotPose;
  /** Size it with a height class, such as `h-24 w-auto`. */
  className?: string;
  /** Load straight away, for Ponku at the top of the first screen. */
  eager?: boolean;
}

/**
 * Decorative: the text beside Ponku says what matters, so screen readers skip the picture. The
 * width and height attributes keep the space reserved while it loads.
 */
export function Mascot({ pose, className = 'h-24 w-auto', eager = false }: MascotProps) {
  const art = MASCOT_ART[pose];
  return (
    <img
      src={art.src}
      alt=""
      width={art.width}
      height={art.height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      data-mascot={pose}
      className={`mascot pointer-events-none select-none ${className}`}
    />
  );
}
