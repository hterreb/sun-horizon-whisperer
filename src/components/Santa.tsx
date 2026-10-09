import React, { useEffect, useRef, useState } from 'react';
import { type RarityTier } from '@/utils/rarityTier';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { useLanguage } from '@/hooks/useLanguage';
import { getRunningAudioContext } from '@/utils/audioContext';
import { santaGreetingOpacity, santaStopTimes, santaTravel } from '@/utils/santaFlight';
import { playSleighBells } from '@/utils/sleighBells';
import { HitArea, type SceneInfoHandler } from './CloudLayer';

// Christmas Eve (ROADMAP "Ongoing — Easter eggs", Calendar): Santa in his sleigh with four
// reindeer (Rudolph in front) flies once, slowly and in a straight line, across the night sky. The
// direction is random per page view. No bob, no leg motion, no scale animation. The parent leaves
// him out under reduced motion. Item 113: a tap opens his info card (item 95 pattern: the ring
// inside the moving wrapper).
// Lookbook 2026-10-09 (S2, S4, S6, S9):
// - S2: with the moon on the screen, he flies at the moon's centre height, in front of the disc,
//   MOON_WIDTH_PER_R px wide per px of moon radius (lookbook: radius 28 -> 54 px).
// - S4: else small and far (FAR_WIDTH px, FAR_TOP_PCT down the sky, FAR_SPEED x the speed), with a
//   red glow on Rudolph's nose.
// - S6: halfway he stops (on the moon, or in the middle of the screen) and says "Ho ho ho!".
// - S9: with the sound on, a short sleigh-bell jingle when he enters the screen.
const SPEED_PCT = 2.5; // % of the width per second: the calm-motion limit for birds
const PX_CAP = 390 * SPEED_PCT / 100; // phone px/s on wide screens (9.75)
export const SANTA_WIDTH = 120;
const SANTA_HEIGHT = 32;
export const SANTA_RING = 'egg-santa';
export const MOON_WIDTH_PER_R = 54 / 28;
export const FAR_WIDTH = 24;
const FAR_TOP_PCT = 23;
export const FAR_SPEED = 0.45;
// Rudolph's nose in SantaShape units, and its glow (px) in the far view.
const NOSE = { x: 109.8, y: 12.7 };
const NOSE_GLOW_R = 2.4;
const HIT_HEIGHT = 32; // HitArea makes it at least 44 x 44

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

// The drawn moon (px in the scene), as CalendarEggs gets it from SunVisualization.
export interface SantaMoon {
  x: number;
  y: number;
  r: number;
}

interface SantaProps {
  // Called once the crossing ends (keep it stable: a new function restarts the crossing).
  onDone: () => void;
  onInfo?: SceneInfoHandler;
  ringOn?: boolean; // its info card is open
  ringTier?: RarityTier | null;
  // The drawn moon (S2), else null (S4). The mode and his size are set at the start; he follows
  // the moon's latest position (the first one can be from before the layout).
  moon?: SantaMoon | null;
  // The countdown sound is on (item 108): the bells may play (S9).
  soundOn?: boolean;
}

const Santa: React.FC<SantaProps> = ({ onDone, onInfo, ringOn = false, ringTier = null, moon = null, soundOn = false }) => {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const greetingRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const soundRef = useRef(soundOn);
  const [leftToRight] = useState(() => Math.random() < 0.5);
  const [startMoon] = useState(() => moon);
  const atMoon = startMoon !== null;
  // The latest drawn moon; when it hides behind clouds mid-flight he keeps its last place.
  const moonRef = useRef(startMoon);
  // Item 116: a double tap opens the card; a single tap shows the ring for a moment.
  const { tap, hint } = useDoubleTap(onInfo);
  const width = startMoon ? Math.round(startMoon.r * MOON_WIDTH_PER_R) : FAR_WIDTH;
  const height = (width * SANTA_HEIGHT) / SANTA_WIDTH;
  const scale = width / SANTA_WIDTH;

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);
  useEffect(() => {
    if (moon) moonRef.current = moon;
  }, [moon]);

  useEffect(() => {
    let start: number | null = null;
    // Latched on the first frame, so a resize cannot make the whole path jump.
    let v = 0;
    let x0 = 0;
    let farStop = 0; // S4: the middle of the screen at his start
    // Set once he starts to slow down, so a moving moon (compass) cannot make him jump.
    let frozenStop: number | null = null;
    let stopAhead = 0;
    let lastSeconds = 0;
    const frame = (now: number) => {
      const screen = window.innerWidth;
      if (start === null) {
        start = now;
        // At least 1 px/s, so a zero width cannot stop the flight (onDone always comes).
        v = Math.max(1, Math.min(screen * SPEED_PCT / 100, PX_CAP) * (atMoon ? 1 : FAR_SPEED));
        x0 = leftToRight ? -width : screen;
        farStop = screen / 2;
        // S9: he enters the screen now.
        playSleighBells(getRunningAudioContext(), soundRef.current);
      }
      const m = atMoon ? moonRef.current : null;
      const xs = (m ? m.x : farStop) - width / 2;
      const seconds = (now - start) / 1000;
      if (frozenStop === null) {
        const ahead = leftToRight ? xs - x0 : x0 - xs;
        const { tA } = santaStopTimes(ahead, v);
        // The braking point is behind his place of the last frame (the moon moved back, e.g. a
        // compass pan): he slows down from that place, so he never flies back.
        if (tA < lastSeconds) frozenStop = v * lastSeconds + 1.5 * v;
        else if (seconds >= tA) frozenStop = ahead;
        else stopAhead = ahead;
      }
      lastSeconds = seconds;
      const stopDistance = frozenStop ?? stopAhead;
      const travelled = santaTravel(seconds, stopDistance, v);
      const x = leftToRight ? x0 + travelled : x0 - travelled;
      if (leftToRight ? x >= screen : x <= -width) {
        rafRef.current = null;
        onDone();
        return;
      }
      if (ref.current) {
        ref.current.style.transform = `translateX(${x}px)`;
        if (m) ref.current.style.top = `${m.y - height / 2}px`;
      }
      if (greetingRef.current) greetingRef.current.style.opacity = String(santaGreetingOpacity(seconds, stopDistance, v));
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [leftToRight, onDone, atMoon, width, height]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="santa"
      data-direction={leftToRight ? 'right' : 'left'}
      data-mode={atMoon ? 'moon' : 'far'}
      className={`absolute left-0 ${onInfo ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none'}`}
      // Off screen until the first frame places it. S2: his middle on the moon's centre height.
      style={{ transform: `translateX(${-width * 2}px)`, top: startMoon ? startMoon.y - height / 2 : `${FAR_TOP_PCT}%`, width, height }}
      onClick={onInfo && (event => tap({ type: 'egg', kind: 'santa' }, { x: event.clientX, y: event.clientY }, SANTA_RING))}
    >
      {/* The glow and the mirror on the drawing only, so the ring (item 113) stays clean. */}
      <span
        className="relative block"
        style={{ filter: 'drop-shadow(0 0 6px hsl(var(--scene-glow-white) / 0.35))', transform: leftToRight ? undefined : 'scaleX(-1)' }}
      >
        <SantaShape width={width} />
        {!atMoon && (
          // S4: a viewer first sees a red dot. Inside the mirrored span, so it stays on the nose.
          <span
            data-testid="santa-nose-glow"
            className="absolute rounded-full"
            style={{
              left: NOSE.x * scale - NOSE_GLOW_R,
              top: NOSE.y * scale - NOSE_GLOW_R,
              width: NOSE_GLOW_R * 2,
              height: NOSE_GLOW_R * 2,
              background: '#FF5050',
              filter: 'blur(2px)',
            }}
          />
        )}
      </span>
      {/* S6: "Ho ho ho!" during the stop; the rAF loop sets the opacity (no bounce, no scale).
          On the moon it sits above the disc, so the bright disc does not hide it. */}
      <span
        ref={greetingRef}
        data-testid="santa-greeting"
        className="absolute bottom-full left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] leading-4 pointer-events-none"
        style={{
          opacity: 0,
          marginBottom: (startMoon ? Math.max(0, startMoon.r - height / 2) : 0) + 4,
          color: '#FFF4DC',
          textShadow: '0 0 4px rgb(0 0 0 / 0.6)',
        }}
      >
        {t('egg.santaGreeting')}
      </span>
      {onInfo && <HitArea cx={width / 2} cy={height / 2} width={width} height={HIT_HEIGHT} ring={ringOn || hint === SANTA_RING} tier={ringOn ? ringTier : null} />}
    </div>
  );
};

export default Santa;
