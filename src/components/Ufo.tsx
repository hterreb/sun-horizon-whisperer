import React, { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type RarityTier } from '@/utils/rarityTier';
import { HitArea, type SceneInfoHandler } from './CloudLayer';

// Hidden egg (ROADMAP "Ongoing — Easter eggs"): a small UFO glides once, slowly and
// in a straight line, across the upper night sky. Reduced motion: no UFO.
// Item 113: a tap opens its info card (item 95 pattern: a hit area of at least 44 px, the ring
// inside the moving wrapper, the UFO flies on). No z-index: it draws behind the sun, the moon and the
// clouds; it takes taps because the SunVisualization root is pointer-events-none.
export const UFO_CROSSING_MS = 40_000;
const UFO_WIDTH = 56;

// The UFO drawing, also shown as its badge in the collection (ROADMAP item 112).
export const UfoShape = ({ width }: { width: number }) => (
  <svg width={width} height={width / 2} viewBox="0 0 56 28">
    <path d="M18 14 a10 9 0 0 1 20 0 z" fill="hsl(var(--brand-cyan) / 0.45)" stroke="hsl(var(--scene-moon))" strokeWidth={1} />
    <ellipse cx={28} cy={17} rx={26} ry={6} fill="hsl(var(--scene-moon-dark))" stroke="hsl(var(--scene-moon))" strokeWidth={1} />
    <circle cx={14} cy={17.5} r={1.4} fill="hsl(var(--brand-gold-light))" />
    <circle cx={28} cy={19} r={1.4} fill="hsl(var(--brand-gold-light))" />
    <circle cx={42} cy={17.5} r={1.4} fill="hsl(var(--brand-gold-light))" />
  </svg>
);

interface UfoProps {
  // Called once the crossing ends (keep it stable: a new function restarts the crossing).
  onDone: () => void;
  onInfo?: SceneInfoHandler;
  ringOn?: boolean; // its info card is open
  ringTier?: RarityTier | null;
}

import { UFO_RING } from '@/utils/hiddenEggs';
export { UFO_RING };

const Ufo: React.FC<UfoProps> = ({ onDone, onInfo, ringOn = false, ringTier = null }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  // Item 116: a double tap opens the card; a single tap shows the ring for a moment.
  const { tap } = useDoubleTap(onInfo);

  useEffect(() => {
    if (prefersReducedMotion) {
      onDone();
      return;
    }
    let start: number | null = null;
    const frame = (t: number) => {
      start ??= t;
      const progress = (t - start) / UFO_CROSSING_MS;
      if (progress >= 1) {
        rafRef.current = null;
        onDone();
        return;
      }
      if (ref.current) {
        const x = -UFO_WIDTH + progress * (window.innerWidth + UFO_WIDTH * 2);
        ref.current.style.transform = `translateX(${x}px)`;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion, onDone]);

  if (prefersReducedMotion) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="ufo"
      data-scene-hit
      className={`fixed left-0 top-[16%] ${onInfo ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none'}`}
      style={{ transform: `translateX(${-UFO_WIDTH}px)` }}
      onClick={onInfo && (event => tap({ type: 'egg', kind: 'ufo' }, { x: event.clientX, y: event.clientY }, UFO_RING))}
    >
      {/* The glow on the drawing only, so the ring (item 113) stays clean. */}
      <span className="block" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--brand-cyan) / 0.6))' }}>
        <UfoShape width={UFO_WIDTH} />
      </span>
      {onInfo && <HitArea cx={UFO_WIDTH / 2} cy={UFO_WIDTH / 4} width={UFO_WIDTH} height={UFO_WIDTH / 2} ring={ringOn} tier={ringOn ? ringTier : null} />}
    </div>
  );
};

export default Ufo;
