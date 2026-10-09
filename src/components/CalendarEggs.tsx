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
  // A blue moon is shown (astroEvents): its label goes in the season badge.
  blueMoon?: boolean;
}

const SEASON_TEXT: Partial<Record<CalendarEvent, MessageKey>> = {
  'solstice-longest': 'egg.seasonLongest',
  'solstice-shortest': 'egg.seasonShortest',
  equinox: 'egg.seasonEquinox',
  nowruz: 'egg.seasonEquinox', // item 118: the March equinox; FestivalEggs adds the blossoms
};

// Fixed layouts (share of the width/height, s), so a render never re-rolls them.
const BATS = [0, 1, 2, 3, 4].map((i) => ({ top: 12 + i * 7, duration: 50 + i * 9, delay: -i * 13, dir: i % 2 ? -1 : 1 }));
const BAT_PX = 30;
// Christmas: baubles in 4 colours, every 6th one a small gold star.
const ORNAMENT_COLOURS = ['--scene-ornament-red', '--scene-ornament-gold', '--scene-ornament-green', '--scene-ornament-silver'];
const ORNAMENTS = Array.from({ length: 20 }, (_, i) => ({
  left: (i * 37) % 100,
  duration: 16 + (i % 5) * 2,
  delay: -(i * 2.1),
  star: i % 6 === 5,
  colour: ORNAMENT_COLOURS[i % 4],
}));
const ORNAMENT_STROKE = 'hsl(var(--scene-critter-silhouette) / 0.35)';
// The hanging bat: hangs from the bottom edge of the collapsed InfoPanel (82 px high at night,
// measured at 390 px; 10rem lower below 364 px), a quarter of the panel's width from its
// right edge, clear of the arc's top label. On wide screens the panel is a tall column, so it
// hangs from the top edge, left of the badge toast (top centre).
const HANG_CLASS =
  'top-[calc(80px+env(safe-area-inset-top))] max-[363px]:top-[calc(10rem+80px+env(safe-area-inset-top))] right-[calc(min(300px,calc(100vw-2rem))/4)] sm:top-0 sm:right-auto sm:left-[22%]';
const BAT_SHAPE = { fill: 'hsl(var(--scene-critter-silhouette))', stroke: 'hsl(var(--scene-glow-white) / 0.35)', strokeWidth: 0.75 };
const BAT_EYE = 'hsl(var(--scene-bat-eye))';

// The calendar easter eggs (the New Year one is SunTracker's fireworks). All motion is
// slow straight CSS glides; reduced motion turns the moving ones off.
const CalendarEggs: React.FC<CalendarEggsProps> = ({ event, timeOfDay, weatherType, moon, horizonY, onInfo, infoRing = null, infoRingTier = null, santa = false, blueMoon = false }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [dragonDone, setDragonDone] = useState(false);
  const [santaDone, setSantaDone] = useState(false);
  // The hanging bat: 'hang', then on a tap 'leave' (one slow glide away), then 'gone'.
  const [hangBat, setHangBat] = useState<'hang' | 'leave' | 'gone'>('hang');
  const handleSantaDone = useCallback(() => setSantaDone(true), []);
  // Once he starts, Santa flies to the edge, also when `santa` turns false at midnight (no jump).
  // Set during render, like SunTracker's night roll.
  const [santaFlying, setSantaFlying] = useState(false);
  if (santa && !santaFlying && !santaDone && !prefersReducedMotion) setSantaFlying(true);
  const isNight = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
  const { t } = useLanguage();
  const seasonKey = event ? SEASON_TEXT[event] : undefined;
  const seasonText = seasonKey ? t(seasonKey) : blueMoon && t('egg.blueMoonLabel');
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

      {event === 'halloween-bats' && isNight && hangBat !== 'gone' && (
        // Hangs wrapped in its wings, red eyes blink every 5 s. A tap opens its wings, and it
        // glides away once (no flapping). Reduced motion: it hangs still, a tap opens the card only.
        <div
          data-testid="hanging-bat"
          data-state={hangBat}
          className={`absolute ${HANG_CLASS} ${tapClass}`}
          style={{ width: 28, height: 60, animation: hangBat === 'leave' ? 'egg-bat-leave 40s linear 1.2s forwards' : undefined }}
          {...tapProps('halloweenBat', 'egg-bat-hang')}
          onClickCapture={() => { if (onInfo && !prefersReducedMotion) setHangBat('leave'); }}
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) setHangBat('gone'); }}
        >
          <svg aria-hidden="true" className="absolute inset-0 block transition-opacity duration-1000" style={{ opacity: hangBat === 'leave' ? 0 : 1 }} width={28} height={60} viewBox="-2 -1 28 60">
            <path d="M12,0 L12,4" stroke={BAT_SHAPE.fill} strokeWidth={2} />
            <g {...BAT_SHAPE}>
              <path d="M12,4 C0,7 -1,32 12,44 C25,32 24,7 12,4 Z" />
              <path d="M7,49 L5.5,57 L10,51 Z M17,49 L18.5,57 L14,51 Z" />
              <circle cx={12} cy={46} r={6.5} />
            </g>
            <g fill={BAT_EYE} style={{ animation: prefersReducedMotion ? undefined : 'egg-bat-blink 5s linear infinite' }} data-testid="hanging-bat-eyes">
              <circle cx={9.6} cy={45} r={1.3} />
              <circle cx={14.4} cy={45} r={1.3} />
            </g>
          </svg>
          {hangBat === 'leave' && (
            <svg aria-hidden="true" className="absolute block" style={{ left: -21, top: 12, animation: 'egg-fade-in 1.2s ease-out' }} width={70} height={28} viewBox="0 0 100 40">
              <g {...BAT_SHAPE} strokeWidth={1}>
                <path d="M46,20 L30,8 L2,14 Q10,17 14,26 Q20,21 26,30 Q32,24 40,30 L46,26 Z M54,20 L70,8 L98,14 Q90,17 86,26 Q80,21 74,30 Q68,24 60,30 L54,26 Z" />
                <ellipse cx={50} cy={24} rx={6} ry={9} />
                <circle cx={50} cy={13} r={5.2} />
              </g>
              <circle cx={48.2} cy={12.2} r={1} fill={BAT_EYE} />
              <circle cx={51.8} cy={12.2} r={1} fill={BAT_EYE} />
              <path d="M48.6,16.6 L49.2,19 L49.8,16.6 Z M50.2,16.6 L50.8,19 L51.4,16.6 Z" fill="white" />
            </svg>
          )}
          {hit('egg-bat-hang', 28, 60)}
        </div>
      )}

      {event === 'christmas' && weatherType !== 'snow' && !prefersReducedMotion && ORNAMENTS.map((o, i) => (
        <svg
          key={i}
          data-testid="christmas-ornament"
          aria-hidden="true"
          className="absolute top-[-5%] opacity-90 pointer-events-none"
          style={{ left: `${o.left}%`, animation: `egg-snow ${o.duration}s linear ${o.delay}s infinite` }}
          width={14}
          height={18}
          viewBox="0 0 14 18"
        >
          {o.star ? (
            <path d="M7,3 L8.8,7.6 L13.5,7.8 L9.8,10.8 L11.1,15.5 L7,12.8 L2.9,15.5 L4.2,10.8 L0.5,7.8 L5.2,7.6 Z" fill="hsl(var(--scene-ornament-gold))" stroke={ORNAMENT_STROKE} strokeWidth={0.6} />
          ) : (
            <>
              <rect x={5} y={1} width={4} height={3} rx={0.8} fill="hsl(var(--scene-ornament-gold))" stroke={ORNAMENT_STROKE} strokeWidth={0.5} />
              <circle cx={7} cy={10.5} r={6} fill={`hsl(var(${o.colour}))`} stroke={ORNAMENT_STROKE} strokeWidth={0.6} />
              <circle cx={5} cy={8.5} r={1.5} fill="hsl(var(--scene-glow-white) / 0.6)" />
            </>
          )}
        </svg>
      ))}

      {event === 'friday-13' && (
        // "Moon-watcher": all day on a shore rock left on the horizon, seen from behind, looking up.
        // Only the tail sways (6 s, ±6°); reduced motion keeps it still.
        <div
          data-testid="black-cat"
          // z-5: in front of the terrain silhouette, drawn later in SunVisualization.
          className={`absolute z-5 ${tapClass}`}
          style={{ left: '12%', top: horizonY - 71, width: 51, height: 71 }}
          {...tapProps('blackCat', 'egg-cat')}
        >
        <svg aria-hidden="true" className="block" width={51} height={71} viewBox="0 0 44 62">
          <path d="M2,62 Q4,44 20,42 Q38,42 42,62 Z" fill="hsl(var(--scene-cat-rock))" stroke="hsl(var(--scene-glow-white) / 0.2)" strokeWidth={0.75} />
          <g transform="translate(6,6)" fill="hsl(var(--scene-critter-silhouette))" stroke="hsl(var(--scene-glow-white) / 0.35)" strokeWidth={0.75}>
            <g
              data-testid="black-cat-tail"
              fill="none"
              strokeLinecap="round"
              style={{ transformBox: 'fill-box', transformOrigin: '0% 100%', animation: prefersReducedMotion ? undefined : 'egg-tail 6s ease-in-out infinite' }}
            >
              <path d="M22,36 Q34,36 32,24" strokeWidth={4.5} />
              <path d="M22,36 Q34,36 32,24" stroke="hsl(var(--scene-critter-silhouette))" strokeWidth={3} />
            </g>
            <ellipse cx={14} cy={26} rx={10} ry={13} />
            <path d="M8,5 L8.6,-3 L13,3 Z M20,5 L19.4,-3 L15,3 Z" />
            <circle cx={14} cy={9} r={7.5} />
          </g>
        </svg>
        {hit('egg-cat', 51, 71)}
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
        // One flight per page view, also when it already snows.
        <Santa onDone={handleSantaDone} onInfo={onInfo} ringOn={infoRing === SANTA_RING} ringTier={infoRingTier} />
      )}

      <style>{`
        @keyframes egg-glide { to { transform: translateX(var(--dx)); } }
        @keyframes egg-snow { to { transform: translateY(110vh) translateX(30px); } }
        @keyframes egg-tail { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
        @keyframes egg-bat-blink { 0%, 93%, 100% { opacity: 1; } 96.5% { opacity: 0; } }
        @keyframes egg-fade-in { from { opacity: 0; } }
        /* 400 px in 40 s: 10 px/s, the calm cap for scene bats. */
        @keyframes egg-bat-leave { to { transform: translate(-240px, -320px); } }
      `}</style>
    </>
  );
};

export default CalendarEggs;
