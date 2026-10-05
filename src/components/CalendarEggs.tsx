import React, { useState } from 'react';
import { Bat } from './sceneIcons';
import LunarDragon from './LunarDragon';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { type CalendarEvent } from '@/utils/calendarEvents';
import { type TimeOfDay } from '@/utils/sunUtils';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { type WeatherType } from './CloudLayer';

interface CalendarEggsProps {
  event: CalendarEvent | null;
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
  // The drawn moon (px, SunVisualization's position and radius), or null when it is not shown.
  moon: { x: number; y: number; r: number } | null;
  horizonY: number;
}

const SEASON_TEXT: Partial<Record<CalendarEvent, string>> = {
  'solstice-longest': 'Solstice · the longest day of the year',
  'solstice-shortest': 'Solstice · the shortest day of the year',
  equinox: 'Equinox · day and night are equal',
};

// Fixed layouts (share of the width/height, s), so a render never re-rolls them.
const BATS = [0, 1, 2, 3, 4].map((i) => ({ top: 12 + i * 7, duration: 50 + i * 9, delay: -i * 13, dir: i % 2 ? -1 : 1 }));
const FLAKES = Array.from({ length: 28 }, (_, i) => ({ left: (i * 37) % 100, duration: 14 + (i % 5) * 2, delay: -(i * 1.7) }));

// The calendar easter eggs (the New Year one is SunTracker's fireworks). All motion is
// slow straight CSS glides; reduced motion turns the moving ones off.
const CalendarEggs: React.FC<CalendarEggsProps> = ({ event, timeOfDay, weatherType, moon, horizonY }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [catDone, setCatDone] = useState(false);
  const [dragonDone, setDragonDone] = useState(false);
  const isNight = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
  const seasonText = event ? SEASON_TEXT[event] : undefined;

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
        <svg
          data-testid="pumpkin-moon"
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{ left: moon.x - moon.r, top: moon.y - moon.r, filter: 'drop-shadow(0 0 14px #F9731680)' }}
          width={moon.r * 2}
          height={moon.r * 2}
          viewBox="-24 -24 48 48"
        >
          <ellipse rx={22} ry={20} cy={2} fill="#F97316" />
          <path d="M-8,-17 Q-14,2 -8,21 M8,-17 Q14,2 8,21" fill="none" stroke="#C2410C" strokeWidth={1.5} />
          <path d="M-2,-17 L-1,-23 L3,-22 L2,-17 Z" fill="#4D7C0F" />
          <path d="M-12,-4 L-6,-4 L-9,-10 Z M6,-4 L12,-4 L9,-10 Z M-13,6 L-8,9 L-4,6 L0,9 L4,6 L8,9 L13,6 L9,13 L-9,13 Z" fill="#FEF3C7" />
        </svg>
      )}

      {event === 'halloween-bats' && isNight && !prefersReducedMotion && BATS.map((b, i) => (
        <div
          key={i}
          data-testid="halloween-bat"
          className="absolute pointer-events-none"
          style={{
            top: `${b.top}%`,
            left: b.dir > 0 ? '-10%' : '105%',
            ['--dx' as string]: `${b.dir * 115}vw`,
            animation: `egg-glide ${b.duration}s linear ${b.delay}s infinite`,
          }}
        >
          <Bat size={30} strokeWidth={0.6} fill="currentColor" style={{ color: 'hsl(var(--scene-critter-silhouette) / 0.9)' }} />
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
        <svg
          data-testid="black-cat"
          aria-hidden="true"
          // z-5: in front of the terrain silhouette, drawn later in SunVisualization.
          className="absolute z-5 pointer-events-none"
          style={{ left: '-10%', top: horizonY - 30, ['--dx' as string]: '120vw', animation: 'egg-glide 45s linear forwards' }}
          width={48}
          height={30}
          viewBox="0 0 48 30"
          onAnimationEnd={() => setCatDone(true)}
        >
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
      )}

      {event === 'lunar-new-year' && !dragonDone && !prefersReducedMotion && (
        // ROADMAP item 100: one flight per page view.
        <LunarDragon timeOfDay={timeOfDay} onDone={() => setDragonDone(true)} />
      )}

      <style>{`
        @keyframes egg-glide { to { transform: translateX(var(--dx)); } }
        @keyframes egg-snow { to { transform: translateY(110vh) translateX(30px); } }
      `}</style>
    </>
  );
};

export default CalendarEggs;
