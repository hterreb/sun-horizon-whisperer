import React, { useMemo, useState } from 'react';
import Fireworks from './Fireworks';
import { HitArea, type SceneInfoHandler } from './CloudLayer';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type NationalDay } from '@/utils/nationalDays';
import { type TimeOfDay } from '@/utils/sunUtils';
import { type RarityTier } from '@/utils/rarityTier';

interface NationalEggsProps {
  // Today's national day for the place's country (utils/nationalDays), or a forced one (?egg=).
  day: NationalDay;
  timeOfDay: TimeOfDay;
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
  infoRingTier?: RarityTier | null;
  // Item 123: the national show starts or ends (SunTracker's EventSkyTaps takes its taps).
  onFireworksRunning?: (running: boolean) => void;
}

// The national-day eggs in the sky and on the shore (the bunting is on the boats: BoatBunting).
// SunTracker draws them behind the scene (like the UFO): they take taps because the
// SunVisualization root is pointer-events-none.
// - jets: nine small jets cross the day sky once per page view, in a slow straight glide, each
//   with a smoke trail in the flag colours. The trails stay, then fade out over SMOKE_FADE_S.
// - fireworks: one Fireworks show in the flag colours per night view.
// - bonfire: a soft, still glow on the shore at night.
// Reduced motion: no jets and no fireworks (their badges do not count); the bonfire stays.
export const JETS_RING = 'egg-jets';
export const BONFIRE_RING = 'egg-bonfire';
const SPEED_PCT = 2; // % of the width per second (calm-motion rule)
const PX_CAP = (390 * SPEED_PCT) / 100; // phone px/s on wide screens
const SMOKE_FADE_S = 40;
const FORM_W = 64;
const FORM_H = 64;
const JET_W = 12;
// An arrowhead: the leader in front, four pairs behind it; y from the top. The smoke colour
// goes by height: the top three trail the first flag colour, the middle three the second,
// the bottom three the third.
const JETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((row, i) => ({ x: FORM_W - JET_W - Math.abs(row) * 11, y: FORM_H / 2 + row * 7, band: Math.floor(i / 3) }));
const DARK: readonly TimeOfDay[] = ['night', 'astronomical-twilight', 'nautical-twilight'];
const DAY: readonly TimeOfDay[] = ['dawn', 'morning', 'midday', 'afternoon', 'evening'];

const cssColor = (token: string) => `hsl(var(--national-${token}))`;
// Canvas needs real colour values: read the tokens from src/index.css.
const resolvedColor = (token: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--national-${token}`).trim();
  return value ? `hsl(${value})` : '#ffffff';
};

const NationalEggs: React.FC<NationalEggsProps> = ({ day, timeOfDay, onInfo, infoRing = null, infoRingTier = null, onFireworksRunning }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { tap } = useDoubleTap(onInfo);
  const isDark = DARK.includes(timeOfDay);
  const isDay = DAY.includes(timeOfDay);
  const [jetsDone, setJetsDone] = useState(false);
  // Once started, the jets and the fireworks run to their end, also when the time of day
  // changes (set during render, like CalendarEggs' Santa).
  const [jetsFlying, setJetsFlying] = useState(false);
  if (day.style === 'jets' && isDay && !jetsFlying && !prefersReducedMotion) setJetsFlying(true);
  const [fireworksOn, setFireworksOn] = useState(false);
  if (day.style === 'fireworks' && isDark && !fireworksOn && !prefersReducedMotion) setFireworksOn(true);
  const palette = useMemo(() => day.colors.map(resolvedColor), [day]);
  // Travel from fully off the left edge to fully off the right edge.
  const [flight] = useState(() => {
    const width = typeof window === 'undefined' ? 390 : window.innerWidth;
    const travel = width + FORM_W;
    return { travel, seconds: travel / Math.min((width * SPEED_PCT) / 100, PX_CAP) };
  });

  const tapProps = (ring: string) => onInfo ? {
    'aria-hidden': true,
    onClick: (e: React.MouseEvent) => tap({ type: 'egg', kind: day.kind }, { x: e.clientX, y: e.clientY }, ring),
  } : {};
  const tapClass = onInfo ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none';
  const hit = (ring: string, w: number, h: number) =>
    onInfo && <HitArea cx={w / 2} cy={h / 2} width={w} height={h} ring={infoRing === ring} tier={infoRing === ring ? infoRingTier : null} />;

  return (
    <>
      {jetsFlying && !jetsDone && !prefersReducedMotion && (
        <div className="absolute left-0 top-[14%] pointer-events-none" data-testid="national-jets">
          {JETS.map((jet, i) => (
            // The trail starts where its jet starts and grows with it (same length and time).
            <div
              key={i}
              data-testid="national-smoke"
              className="absolute"
              style={{
                left: -FORM_W + jet.x,
                top: jet.y - 1.5,
                width: flight.travel,
                height: 3,
                transformOrigin: 'left',
                transform: 'scaleX(0)',
                filter: 'blur(1.5px)',
                background: `linear-gradient(to right, transparent, ${cssColor(day.colors[jet.band % day.colors.length])} 40%)`,
                opacity: 0.7,
                animation: `national-smoke ${flight.seconds}s linear forwards, national-fade ${SMOKE_FADE_S}s ease-in ${flight.seconds}s forwards`,
              }}
              onAnimationEnd={(e) => { if (i === 0 && e.animationName === 'national-fade') setJetsDone(true); }}
            />
          ))}
          <div
            data-testid="national-formation"
            className={`absolute ${tapClass}`} data-scene-hit
            style={{ left: -FORM_W, top: 0, width: FORM_W, height: FORM_H, ['--dx' as string]: `${flight.travel}px`, animation: `national-fly ${flight.seconds}s linear forwards` }}
            {...tapProps(JETS_RING)}
          >
            <svg aria-hidden="true" className="block" width={FORM_W} height={FORM_H}>
              {JETS.map((jet, i) => (
                <path key={i} d={`M${jet.x} ${jet.y - 1}h7l5 1-5 1h-7l-2 2.5h-1.5l1-3.5-1-3.5h1.5Z`} fill="hsl(var(--national-jet))" />
              ))}
            </svg>
            {hit(JETS_RING, FORM_W, FORM_H)}
          </div>
        </div>
      )}

      {fireworksOn && <Fireworks trigger={1} palette={palette} onRunningChange={onFireworksRunning} />}

      {day.bonfire && isDark && (
        // On the shore at the horizon (65 % of the height, as in SunVisualization); the water
        // covers its lower edge. Still: no flicker.
        <div
          data-testid="national-bonfire"
          className={`absolute left-[18%] ${tapClass}`} data-scene-hit
          style={{ top: 'calc(65% - 48px)', width: 120, height: 48, background: 'radial-gradient(ellipse 50% 100% at 50% 100%, hsl(var(--national-bonfire) / 0.6), transparent)' }}
          {...tapProps(BONFIRE_RING)}
        >
          {hit(BONFIRE_RING, 120, 48)}
        </div>
      )}

      <style>{`
        @keyframes national-fly { to { transform: translateX(var(--dx)); } }
        @keyframes national-smoke { to { transform: scaleX(1); } }
        @keyframes national-fade { to { opacity: 0; } }
      `}</style>
    </>
  );
};

export default NationalEggs;
