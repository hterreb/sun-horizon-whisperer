import React, { useCallback, useState } from 'react';
import { Bat } from './sceneIcons';
import LunarDragon, { DRAGON_RING } from './LunarDragon';
import Santa, { SANTA_RING } from './Santa';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLanguage } from '@/hooks/useLanguage';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type MessageKey } from '@/i18n';
import { type CalendarEvent } from '@/utils/calendarEvents';
import { type TimeOfDay } from '@/utils/sunUtils';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { HitArea, type SceneInfoHandler, type WeatherType } from './CloudLayer';
import { type RarityTier } from '@/utils/rarityTier';
import { type EggCardKind } from '@/utils/sceneInfo';

interface CalendarEggsProps {
  event: CalendarEvent | null;
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
  // The drawn moon (px, SunVisualization's position and radius), or null when it is not shown.
  moon: { x: number; y: number; r: number } | null;
  horizonY: number;
  // Item 113: a tap on the dragon, Santa, the cat, a bat or the pumpkin opens its info card (item 95
  // pattern); `infoRing` is the ring id of the open card.
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
  infoRingTier?: RarityTier | null;
  // Christmas Eve from sunset to midnight (calendarEvents.isSantaTime), or ?egg=santa.
  santa?: boolean;
  // The countdown sound is on (item 108): Santa's sleigh bells may play (lookbook S9).
  soundOn?: boolean;
}

const SEASON_TEXT: Partial<Record<CalendarEvent, MessageKey>> = {
  'solstice-longest': 'egg.seasonLongest',
  'solstice-shortest': 'egg.seasonShortest',
  equinox: 'egg.seasonEquinox',
};

// Fixed layouts (share of the width/height, s), so a render never re-rolls them.
const BATS = [0, 1, 2, 3, 4].map((i) => ({ top: 12 + i * 7, duration: 50 + i * 9, delay: -i * 13, dir: i % 2 ? -1 : 1 }));
const BAT_PX = 30;
const FLAKES = Array.from({ length: 28 }, (_, i) => ({ left: (i * 37) % 100, duration: 14 + (i % 5) * 2, delay: -(i * 1.7) }));

// The calendar easter eggs (the New Year one is SunTracker's fireworks). All motion is
// slow straight CSS glides; reduced motion turns the moving ones off.
const CalendarEggs: React.FC<CalendarEggsProps> = ({ event, timeOfDay, weatherType, moon, horizonY, onInfo, infoRing = null, infoRingTier = null, santa = false, soundOn = false }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [catDone, setCatDone] = useState(false);
  const [dragonDone, setDragonDone] = useState(false);
  const [santaDone, setSantaDone] = useState(false);
  const handleSantaDone = useCallback(() => setSantaDone(true), []);
  // Once he starts, Santa flies to the edge, also when `santa` turns false at midnight (no jump).
  // Set during render, like SunTracker's night roll.
  const [santaFlying, setSantaFlying] = useState(false);
  if (event === 'christmas' && santa && !santaFlying && !santaDone && !prefersReducedMotion) setSantaFlying(true);
  const isNight = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
  const { t } = useLanguage();
  const seasonKey = event ? SEASON_TEXT[event] : undefined;
  const seasonText = seasonKey && t(seasonKey);
  // Item 113: the wrapper of a tappable egg (pointer only, hidden from screen readers) and its
  // hit area with the ring, a child of the moving wrapper.
  // Item 116: a double tap opens the card; a single tap shows the ring for a moment.
  const { tap, hint } = useDoubleTap(onInfo);
  const tapProps = (kind: EggCardKind, ring: string) => onInfo ? {
    'aria-hidden': true,
    onClick: (e: React.MouseEvent) => tap({ type: 'egg', kind }, { x: e.clientX, y: e.clientY }, ring),
  } : {};
  const tapClass = onInfo ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none';
  const hit = (ring: string, w: number, h: number) =>
    onInfo && <HitArea cx={w / 2} cy={h / 2} width={w} height={h} ring={infoRing === ring || hint === ring} tier={infoRing === ring ? infoRingTier : null} />;

  return (
    <>
      {seasonText && (
        <div
          data-testid="season-badge"
          // On the water, clear of the InfoPanel (top) and the arc labels (horizon).
          style={{ top: horizonY + 90 }}
          className={`absolute left-1/2 z-9 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-caption text-white pointer-events-none ${GLASS_SURFACE}`}
        >
          {seasonText}
        </div>
      )}

      {event === 'halloween-pumpkin' && moon && (
        // Over the moon button: a tap opens the pumpkin's card, not the moon's.
        <div
          className={`absolute ${tapClass}`}
          style={{ left: moon.x - moon.r, top: moon.y - moon.r, width: moon.r * 2, height: moon.r * 2 }}
          {...tapProps('pumpkinMoon', 'egg-pumpkin')}
        >
        <svg
          data-testid="pumpkin-moon"
          aria-hidden="true"
          className="block"
          style={{ filter: 'drop-shadow(0 0 14px #F9731680)' }}
          width={moon.r * 2}
          height={moon.r * 2}
          viewBox="-24 -24 48 48"
        >
          <ellipse rx={22} ry={20} cy={2} fill="#F97316" />
          <path d="M-8,-17 Q-14,2 -8,21 M8,-17 Q14,2 8,21" fill="none" stroke="#C2410C" strokeWidth={1.5} />
          <path d="M-2,-17 L-1,-23 L3,-22 L2,-17 Z" fill="#4D7C0F" />
          <path d="M-12,-4 L-6,-4 L-9,-10 Z M6,-4 L12,-4 L9,-10 Z M-13,6 L-8,9 L-4,6 L0,9 L4,6 L8,9 L13,6 L9,13 L-9,13 Z" fill="#FEF3C7" />
        </svg>
        {hit('egg-pumpkin', moon.r * 2, moon.r * 2)}
        </div>
      )}

      {event === 'halloween-bats' && isNight && !prefersReducedMotion && BATS.map((b, i) => (
        <div
          key={i}
          data-testid="halloween-bat"
          className={`absolute ${tapClass}`}
          {...tapProps('halloweenBat', `egg-bat-${i}`)}
          style={{
            top: `${b.top}%`,
            left: b.dir > 0 ? '-10%' : '105%',
            ['--dx' as string]: `${b.dir * 115}vw`,
            animation: `egg-glide ${b.duration}s linear ${b.delay}s infinite`,
          }}
        >
          <Bat size={BAT_PX} strokeWidth={0.6} fill="currentColor" style={{ color: 'hsl(var(--scene-critter-silhouette) / 0.9)' }} />
          {hit(`egg-bat-${i}`, BAT_PX, BAT_PX)}
        </div>
      ))}

      {event === 'christmas' && weatherType !== 'snow' && !prefersReducedMotion && FLAKES.map((f, i) => (
        <div
          key={i}
          data-testid="christmas-flake"
          className="absolute top-[-5%] text-white opacity-70 pointer-events-none"
          style={{ left: `${f.left}%`, fontSize: '0.7rem', animation: `egg-snow ${f.duration}s linear ${f.delay}s infinite` }}
        >
          ❄
        </div>
      ))}

      {event === 'friday-13' && !catDone && !prefersReducedMotion && (
        // One slow walk along the horizon, left to right, then gone. No bounce.
        <div
          data-testid="black-cat"
          // z-5: in front of the terrain silhouette, drawn later in SunVisualization.
          className={`absolute z-5 ${tapClass}`}
          style={{ left: '-10%', top: horizonY - 30, width: 48, height: 30, ['--dx' as string]: '120vw', animation: 'egg-glide 45s linear forwards' }}
          onAnimationEnd={() => setCatDone(true)}
          {...tapProps('blackCat', 'egg-cat')}
        >
        <svg aria-hidden="true" className="block" width={48} height={30} viewBox="0 0 48 30">
          <g fill="#0B0B10" stroke="hsl(var(--scene-glow-white) / 0.35)" strokeWidth={0.75}>
            <path d="M4,16 Q0,6 6,3 Q4,9 8,15 Z" />
            <ellipse cx={20} cy={18} rx={13} ry={6} />
            <rect x={10} y={20} width={3} height={10} rx={1} />
            <rect x={16} y={21} width={3} height={9} rx={1} />
            <rect x={25} y={21} width={3} height={9} rx={1} />
            <rect x={30} y={20} width={3} height={10} rx={1} />
            <path d="M31,12 L32,4 L36,9 L40,9 L44,4 L45,12 Q46,18 38,19 Q30,18 31,12 Z" />
          </g>
          <circle cx={35.5} cy={13} r={1.1} fill="#FDE047" />
          <circle cx={41} cy={13} r={1.1} fill="#FDE047" />
        </svg>
        {hit('egg-cat', 48, 30)}
        </div>
      )}

      {event === 'lunar-new-year' && !dragonDone && !prefersReducedMotion && (
        // ROADMAP item 100: one flight per page view.
        <LunarDragon
          timeOfDay={timeOfDay}
          onDone={() => setDragonDone(true)}
          onInfo={onInfo && tap}
          ringOn={infoRing === DRAGON_RING || hint === DRAGON_RING}
          ringTier={infoRing === DRAGON_RING ? infoRingTier : null}
        />
      )}

      {santaFlying && !santaDone && !prefersReducedMotion && (
        // One flight per page view, also when it already snows. With the moon on the screen he crosses it
        // (lookbook S2), else he flies small and far (S4).
        <Santa onDone={handleSantaDone} onInfo={onInfo} ringOn={infoRing === SANTA_RING} ringTier={infoRingTier} moon={moon} soundOn={soundOn} />
      )}

      <style>{`
        @keyframes egg-glide { to { transform: translateX(var(--dx)); } }
        @keyframes egg-snow { to { transform: translateY(110vh) translateX(30px); } }
      `}</style>
    </>
  );
};

export default CalendarEggs;
