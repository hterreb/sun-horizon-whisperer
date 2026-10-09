import React, { useEffect, useRef, useState } from 'react';
import { type RarityTier } from '@/utils/rarityTier';
import { HitArea, type SceneInfoHandler } from './CloudLayer';

// Christmas Eve (ROADMAP "Ongoing — Easter eggs", Calendar): Santa in his sleigh with four
// reindeer (Rudolph in front) glides once, slowly and in a straight line, high across the night sky. The direction
// is random per page view. No bob and no leg motion. The parent leaves him out under reduced
// motion. Item 113: a tap opens his info card (item 95 pattern: the ring inside the moving wrapper).
const SPEED_PCT = 2.5; // % of the width per second: the calm-motion limit for birds
const PX_CAP = 390 * SPEED_PCT / 100; // phone px/s on wide screens (9.75)
export const SANTA_WIDTH = 120;
const SANTA_HEIGHT = 32;
export const SANTA_RING = 'egg-santa';

// A reindeer in flight (facing right), legs stretched and still.
const Reindeer = ({ x, nose = false }: { x: number; nose?: boolean }) => (
  <g transform={`translate(${x} 8)`}>
    <ellipse cx={7} cy={8} rx={6} ry={2.6} />
    <path d="M11,7 L14,3.5 L16.6,4 L16.4,5.2 L14.6,5.6 L12.6,8.6 Z" />
    <path d="M13.8,3.8 L12.2,-1.6 M13,1 L10.6,-0.6 M12.6,-0.4 L11.2,-2.4 M15,3.6 L16.2,-1.4 M15.6,1 L17.8,-0.6" fill="none" strokeWidth={1.1} strokeLinecap="round" />
    <path d="M11,9.6 L15,12 M10,10.2 L13.4,13.6 M3,9.6 L-1,11.6 M4,10.2 L0.4,13.6" fill="none" strokeWidth={1.4} strokeLinecap="round" />
    {nose && <circle cx={16.8} cy={4.7} r={1} fill="#EF4444" stroke="none" style={{ filter: 'drop-shadow(0 0 2px #EF4444)' }} />}
  </g>
);

// The drawing (facing right), also the collection badge (ROADMAP item 112). Dark silhouettes
// with a light rim, like the black cat; Rudolph's red nose is the one colour.
export const SantaShape = ({ width }: { width: number }) => (
  <svg width={width} height={(width * SANTA_HEIGHT) / SANTA_WIDTH} viewBox={`0 0 ${SANTA_WIDTH} ${SANTA_HEIGHT}`} aria-hidden="true">
    <g fill="#0B0B10" stroke="hsl(var(--scene-glow-white) / 0.45)" strokeWidth={0.6} strokeLinejoin="round">
      {/* The reins, from Santa's hands to Rudolph. */}
      <path d="M20,13 L112,15" fill="none" strokeWidth={0.5} />
      {/* The sack, Santa, then the sleigh in front of him. */}
      <path d="M4,17 Q3,9 8,8.5 Q11,11 10,17 Z" />
      <path d="M11,17 Q11,9 15.5,8 Q20,9 20,17 Z" />
      <circle cx={15.5} cy={6} r={2.6} />
      <path d="M13,5 Q15,-0.5 19.5,1.5 L18,5 Z" />
      <circle cx={19.8} cy={1.8} r={1} />
      <path d="M3,16 L27,16 Q30,16 31,13 L33,14 Q32,22 25,24 L8,24 Q3,24 3,16 Z" />
      <path d="M3,16 Q0,14 1,10 Q3,9 4,11" fill="none" strokeWidth={1} />
      <path d="M8,24 L8,28 M24,24 L24,28 M2,28 L30,28 Q35,28 35,24" fill="none" strokeWidth={1.2} strokeLinecap="round" />
      {[36, 55, 74, 93].map(x => <Reindeer key={x} x={x} nose={x === 93} />)}
    </g>
  </svg>
);

interface SantaProps {
  // Called once the crossing ends (keep it stable: a new function restarts the crossing).
  onDone: () => void;
  onInfo?: SceneInfoHandler;
  ringOn?: boolean; // its info card is open
  ringTier?: RarityTier | null;
}

const Santa: React.FC<SantaProps> = ({ onDone, onInfo, ringOn = false, ringTier = null }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [leftToRight] = useState(() => Math.random() < 0.5);

  useEffect(() => {
    let start: number | null = null;
    const frame = (now: number) => {
      start ??= now;
      const width = window.innerWidth;
      const travelled = Math.min(width * SPEED_PCT / 100, PX_CAP) * (now - start) / 1000;
      if (travelled >= width + SANTA_WIDTH) {
        rafRef.current = null;
        onDone();
        return;
      }
      if (ref.current) {
        const x = leftToRight ? -SANTA_WIDTH + travelled : width - travelled;
        ref.current.style.transform = `translateX(${x}px)`;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [leftToRight, onDone]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="santa"
      data-direction={leftToRight ? 'right' : 'left'}
      className={`absolute left-0 top-[11%] ${onInfo ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
      // Off screen until the first frame places it.
      style={{ transform: `translateX(${-SANTA_WIDTH * 2}px)` }}
      onClick={onInfo && (event => onInfo({ type: 'egg', kind: 'santa' }, { x: event.clientX, y: event.clientY }, SANTA_RING))}
    >
      {/* The glow and the mirror on the drawing only, so the ring (item 113) stays clean. */}
      <span
        className="block"
        style={{ filter: 'drop-shadow(0 0 6px hsl(var(--scene-glow-white) / 0.35))', transform: leftToRight ? undefined : 'scaleX(-1)' }}
      >
        <SantaShape width={SANTA_WIDTH} />
      </span>
      {onInfo && <HitArea cx={SANTA_WIDTH / 2} cy={SANTA_HEIGHT / 2} width={SANTA_WIDTH} height={SANTA_HEIGHT} ring={ringOn} tier={ringTier} />}
    </div>
  );
};

export default Santa;
