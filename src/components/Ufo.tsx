import React, { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// Hidden egg (ROADMAP "Ongoing — Easter eggs"): a small UFO glides once, slowly and
// in a straight line, across the upper night sky. Reduced motion: no UFO.
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
}

const Ufo: React.FC<UfoProps> = ({ onDone }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

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
      className="fixed left-0 top-[16%] pointer-events-none"
      style={{ transform: `translateX(${-UFO_WIDTH}px)`, filter: 'drop-shadow(0 0 8px hsl(var(--brand-cyan) / 0.6))' }}
    >
      <UfoShape width={UFO_WIDTH} />
    </div>
  );
};

export default Ufo;
