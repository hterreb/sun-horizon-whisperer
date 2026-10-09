import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLanguage } from '@/hooks/useLanguage';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type CalendarEvent } from '@/utils/calendarEvents';
import {
  getHanukkahNight, isFestivalEvent, isFestivalShown, type FestivalEgg,
} from '@/utils/festivalEvents';
import { type TimeOfDay } from '@/utils/sunUtils';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { type RarityTier } from '@/utils/rarityTier';
import { type EggCardKind } from '@/utils/sceneInfo';
import { HitArea, type SceneInfoHandler, type WeatherType } from './CloudLayer';

interface FestivalEggsProps {
  event: CalendarEvent | null;
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
  latitude: number;
  // The day of the scene: Hanukkah adds one light each night.
  date: Date;
  // The drawn moon (px), or null when it is not shown.
  moon: { x: number; y: number; r: number } | null;
  horizonY: number;
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
  infoRingTier?: RarityTier | null;
}

const c = (name: string, alpha = 1) => `hsl(var(--scene-festival-${name}) / ${alpha})`;
const PASTELS = ['pastel-1', 'pastel-2', 'pastel-3', 'pastel-4', 'pastel-5'];

// Fixed layouts (share of the width, px or s), so a render never re-rolls them.
const KRATHONGS = [0, 1, 2, 3, 4].map(i => ({ left: 10 + i * 19, dy: 40 + ((i * 53) % 110), dx: i % 2 ? -36 : 36, duration: 70 + i * 11 }));
const DIYAS = Array.from({ length: 9 }, (_, i) => ({ left: 6 + i * 11, duration: 4 + (i % 3), delay: -i * 0.9 }));
const LANTERNS = [0, 1, 2, 3, 4, 5].map(i => ({ left: 8 + i * 16, duration: 150 + (i % 3) * 25, delay: -i * 31, still: 0.15 + ((i * 37) % 60) / 100 }));
const PETALS = Array.from({ length: 14 }, (_, i) => ({ top: (i * 23) % 50, duration: 70 + (i % 4) * 10, delay: -i * 6.5 }));
const MARIGOLDS = Array.from({ length: 14 }, (_, i) => ({ left: (i * 41 + 4) % 96, dy: 40 + ((i * 67) % 200), dx: i % 2 ? -20 : 20, duration: 80 + (i % 5) * 9 }));
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({ left: (i * 29 + 3) % 100, duration: 50 + (i % 4) * 7, delay: -i * 3.4, colour: PASTELS[i % 5], tilt: (i * 47) % 90 }));
const BONFIRES = [18, 52, 83];
// Nowruz: 7 blossoms in a gentle arc that frames the equinox pill (px from the pill's top
// centre): the ends beside the pill, the others under it, clear of its edges.
const BLOSSOMS = [[-140, 12, 34], [-98, 46, 28], [-50, 60, 28], [0, 64, 36], [50, 60, 28], [98, 46, 28], [140, 12, 34]]
  .map(([x, y, size]) => ({ x, y, size }));
// A few loose petals sink from the arc, very slowly (about 1.3 px/s), and fade out.
const NOWRUZ_PETALS = [BLOSSOMS[1], BLOSSOMS[3], BLOSSOMS[5]].map((b, n) => ({ x: b.x, y: b.y, dx: n % 2 ? -12 : 12, duration: 28 + n * 5, delay: -n * 9 }));
// Tanabata: Vega high, Altair lower right, the Milky Way between them (share of the width
// and the sky height). Fixed places, not the real sky positions.
const VEGA = { x: 30, y: 0.28 };
const ALTAIR = { x: 66, y: 0.48 };

const Krathong = () => (
  <svg width={30} height={22} viewBox="0 0 30 22" aria-hidden="true" className="block">
    <ellipse cx={15} cy={10} rx={10} ry={8} fill={c('flame', 0.18)} />
    <path d="M2 16 Q15 24 28 16 L25 13 Q15 18 5 13 Z" fill={c('leaf')} />
    <circle cx={9} cy={13} r={2.4} fill={c('marigold')} />
    <circle cx={21} cy={13} r={2.4} fill={c('blossom')} />
    <circle cx={15} cy={14} r={2.2} fill={c('petal')} />
    <rect x={14} y={6} width={2} height={7} rx={0.6} fill={c('flame-core', 0.9)} />
    <ellipse cx={15} cy={4.5} rx={1.4} ry={2.4} fill={c('flame')} />
  </svg>
);

const Diya = () => (
  <svg width={18} height={14} viewBox="0 0 18 14" aria-hidden="true" className="block" overflow="visible">
    <circle cx={9} cy={5} r={7} fill={c('flame', 0.22)} />
    <path d="M1 8 Q9 15 17 8 Z" fill={c('clay')} />
    <ellipse cx={9} cy={4.5} rx={1.6} ry={3} fill={c('flame')} />
    <ellipse cx={9} cy={5.5} rx={0.7} ry={1.4} fill={c('flame-core')} />
  </svg>
);

const Lantern = () => (
  <svg width={20} height={28} viewBox="0 0 20 28" aria-hidden="true" className="block" overflow="visible">
    <circle cx={10} cy={13} r={13} fill={c('lantern', 0.18)} />
    <rect x={7} y={1} width={6} height={3} rx={1} fill={c('gold')} />
    <ellipse cx={10} cy={13} rx={8} ry={9} fill={c('lantern')} />
    <path d="M10 4 V22 M5 6 Q3 13 5 20 M15 6 Q17 13 15 20" stroke={c('gold', 0.6)} strokeWidth={0.8} fill="none" />
    <rect x={7} y={22} width={6} height={2.5} rx={1} fill={c('gold')} />
    <path d="M10 24.5 V28" stroke={c('gold')} strokeWidth={0.8} />
  </svg>
);

const Petal = () => (
  <svg width={10} height={8} viewBox="0 0 10 8" aria-hidden="true" className="block">
    <path d="M1 4 Q4 0 9 2 Q7 4 9 6 Q4 8 1 4 Z" fill={c('petal')} />
  </svg>
);

const Marigold = () => (
  <svg width={12} height={12} viewBox="-6 -6 12 12" aria-hidden="true" className="block">
    {[0, 60, 120, 180, 240, 300].map(a => <ellipse key={a} rx={2} ry={3.6} cy={-2.4} transform={`rotate(${a})`} fill={c('marigold')} />)}
    <circle r={1.8} fill={c('lantern')} />
  </svg>
);

// A five-petal spring blossom: pink petals with a pale heart, a faint rose outline (it reads
// on the blue day sea and the dark night sea) and a light centre.
const Blossom = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true" className="block">
    {[0, 72, 144, 216, 288].map(a => (
      <g key={a} transform={`rotate(${a})`}>
        <ellipse rx={4.6} ry={5.6} cy={-5.6} fill={c('blossom')} stroke={c('blossom-edge', 0.7)} strokeWidth={0.8} />
        <ellipse rx={2.4} ry={3.2} cy={-3.8} fill={c('blossom-light', 0.85)} />
      </g>
    ))}
    <circle r={2.6} fill={c('blossom-light')} />
    <circle r={1.2} fill={c('gold')} />
  </svg>
);

const Bonfire = () => (
  <svg width={26} height={26} viewBox="0 0 26 26" aria-hidden="true" className="block" overflow="visible">
    <circle cx={13} cy={15} r={14} fill={c('flame', 0.2)} />
    <path d="M4 25 L22 20 M4 20 L22 25" stroke={c('clay')} strokeWidth={2.2} strokeLinecap="round" />
    <path d="M13 4 Q19 12 17 19 Q13 23 9 19 Q7 12 13 4 Z" fill={c('flame')} />
    <path d="M13 11 Q16 15 15 19 Q13 21 11 19 Q10 15 13 11 Z" fill={c('flame-core')} />
  </svg>
);

// A plain cream candle on a small floating holder, with a short reflection streak on the
// water. The flame flickers softly (opacity, 4 s or more) unless the motion is reduced.
const Candle = ({ flicker }: { flicker?: string }) => (
  <svg width={14} height={34} viewBox="0 0 14 34" aria-hidden="true" className="block" overflow="visible">
    <ellipse cx={7} cy={23} rx={3} ry={0.8} fill={c('flame', 0.35)} />
    <ellipse cx={7} cy={26} rx={2.2} ry={0.7} fill={c('flame', 0.22)} />
    <ellipse cx={7} cy={29} rx={1.5} ry={0.6} fill={c('flame', 0.12)} />
    <g style={{ animation: flicker }}>
      <circle cx={7} cy={5} r={6} fill={c('flame', 0.22)} />
      <ellipse cx={7} cy={4} rx={1.6} ry={3} fill={c('flame')} />
      <ellipse cx={7} cy={5} rx={0.7} ry={1.4} fill={c('flame-core')} />
    </g>
    <rect x={5} y={8} width={4} height={10} rx={0.8} fill={c('wax')} />
    <ellipse cx={7} cy={19} rx={6} ry={1.8} fill={c('gold', 0.75)} />
  </svg>
);

// Cultural festival eggs (ROADMAP item 118). The calm-motion rule holds: slow straight drifts,
// rises and falls, a soft glow; nothing jumps, flaps or flickers fast. Reduced motion: the
// floating and glowing things stand still, the drifting petals and the confetti are hidden
// (the Nowruz blossoms stay, their sinking petals go).
// Holi tints the clouds (SkyClouds) and Día de los Muertos adds bunting to the boats (SceneBoat).
const FestivalEggs: React.FC<FestivalEggsProps> = ({
  event, timeOfDay, weatherType, latitude, date, moon, horizonY, onInfo, infoRing = null, infoRingTier = null,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const { t } = useLanguage();
  const { tap } = useDoubleTap(onInfo);
  if (!isFestivalEvent(event)) return null;
  const shown = isFestivalShown(event, { timeOfDay, weatherType, reducedMotion });

  // Item 113's tap pattern: the moving wrapper takes the tap, the hit area moves with it.
  const tapProps = (kind: EggCardKind & FestivalEgg, ring: string) => onInfo ? {
    'aria-hidden': true,
    onClick: (e: React.MouseEvent) => tap({ type: 'egg', kind }, { x: e.clientX, y: e.clientY }, ring),
  } : {};
  const tapClass = onInfo ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none';
  const hit = (ring: string, w: number, h: number) =>
    onInfo && <HitArea cx={w / 2} cy={h / 2} width={w} height={h} ring={infoRing === ring} tier={infoRing === ring ? infoRingTier : null} />;
  const anim = (value: string) => (reducedMotion ? undefined : value);
  const pill = (testId: string, text: string) => (
    <div
      data-testid={testId}
      style={{ top: horizonY + 90 }}
      className={`absolute left-1/2 z-9 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-caption text-white pointer-events-none ${GLASS_SURFACE}`}
    >
      {text}
    </div>
  );

  return (
    <>
      {event === 'loy-krathong' && shown && KRATHONGS.map((k, i) => (
        <div
          key={i}
          data-testid="festival-krathong"
          // z-6: on the sea, over the waves and the fish (z 5), under the boats (z 7).
          className={`absolute z-6 ${tapClass}`}
          style={{ left: `${k.left}%`, top: horizonY + k.dy, ['--dx' as string]: `${k.dx}px`, animation: anim(`festival-drift ${k.duration}s ease-in-out infinite alternate`) }}
          {...tapProps('loyKrathong', `egg-krathong-${i}`)}
        >
          <Krathong />
          {hit(`egg-krathong-${i}`, 30, 22)}
        </div>
      ))}

      {event === 'diwali' && shown && DIYAS.map((d, i) => (
        // Along the far shore at the horizon; a slow, soft glow (4-6 s), not a flicker.
        <div
          key={i}
          data-testid="festival-diya"
          className={`absolute z-5 ${tapClass}`}
          style={{ left: `${d.left}%`, top: horizonY - 12, animation: anim(`festival-glow ${d.duration}s ease-in-out ${d.delay}s infinite alternate`) }}
          {...tapProps('diwali', `egg-diya-${i}`)}
        >
          <Diya />
          {hit(`egg-diya-${i}`, 18, 14)}
        </div>
      ))}

      {event === 'eid-al-fitr' && (
        <>
          {pill('festival-eid-pill', t('egg.eidPill'))}
          {moon && (
            // A soft golden glow over the crescent; a tap opens the Eid card (like the pumpkin moon).
            <div
              data-testid="festival-eid-glow"
              className={`absolute rounded-full ${tapClass}`}
              style={{
                left: moon.x - moon.r * 2, top: moon.y - moon.r * 2, width: moon.r * 4, height: moon.r * 4,
                background: `radial-gradient(circle closest-side, ${c('gold', 0.45)} 0%, ${c('gold', 0.18)} 50%, transparent 100%)`,
              }}
              {...tapProps('eidAlFitr', 'egg-eid')}
            >
              {hit('egg-eid', moon.r * 4, moon.r * 4)}
            </div>
          )}
        </>
      )}

      {event === 'mid-autumn' && shown && (
        <>
          {moon && (
            // The moon rabbit: a faint shape on the full moon. No taps (the lanterns take them).
            <svg
              data-testid="festival-moon-rabbit"
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{ left: moon.x - moon.r, top: moon.y - moon.r, opacity: 0.28 }}
              width={moon.r * 2}
              height={moon.r * 2}
              viewBox="-24 -24 48 48"
            >
              <path
                d="M-10 8 Q-14 -2 -6 -4 L-8 -16 Q-5 -18 -3 -8 L0 -17 Q3 -16 1 -6 Q8 -6 10 2 Q14 2 13 8 Q6 12 -10 8 Z"
                fill="hsl(var(--scene-moon-dark))"
              />
            </svg>
          )}
          {LANTERNS.map((l, i) => (
            <div
              key={i}
              data-testid="festival-lantern"
              className={`absolute ${tapClass}`}
              style={reducedMotion
                ? { left: `${l.left}%`, top: horizonY * l.still }
                : { left: `${l.left}%`, top: horizonY, opacity: 0, ['--dy' as string]: `${-(horizonY + 40)}px`, animation: `festival-rise ${l.duration}s linear ${l.delay}s infinite` }}
              {...tapProps('midAutumn', `egg-lantern-${i}`)}
            >
              <Lantern />
              {hit(`egg-lantern-${i}`, 20, 28)}
            </div>
          ))}
        </>
      )}

      {event === 'hanami' && shown && PETALS.map((p, i) => (
        <div
          key={i}
          data-testid="festival-petal"
          className={`absolute ${tapClass}`}
          style={{ left: '-5%', top: `${p.top}%`, ['--dx' as string]: '110vw', ['--dy' as string]: '20vh', animation: `festival-fall ${p.duration}s linear ${p.delay}s infinite` }}
          {...tapProps('hanami', `egg-petal-${i}`)}
        >
          <Petal />
          {hit(`egg-petal-${i}`, 10, 8)}
        </div>
      ))}

      {event === 'tanabata' && shown && (
        <>
          <div
            data-testid="festival-milky-way"
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              left: `${(VEGA.x + ALTAIR.x) / 2 - 10}%`, top: horizonY * ((VEGA.y + ALTAIR.y) / 2) - horizonY * 0.3,
              width: '20%', height: horizonY * 0.6, transform: 'rotate(-35deg)', filter: 'blur(12px)',
              background: 'radial-gradient(ellipse closest-side, hsl(var(--scene-glow-white) / 0.16), transparent)',
            }}
          />
          {[VEGA, ALTAIR].map((s, i) => (
            <div
              key={i}
              data-testid="festival-tanabata-star"
              className={`absolute ${tapClass}`}
              style={{ left: `calc(${s.x}% - 7px)`, top: horizonY * s.y - 7, filter: 'drop-shadow(0 0 6px hsl(var(--scene-glow-white) / 0.9))' }}
              {...tapProps('tanabata', `egg-star-${i}`)}
            >
              <span className="block h-3.5 w-3.5 rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--scene-glow-white)) 30%, hsl(var(--scene-festival-pastel-4) / 0.6) 60%, transparent 100%)' }} />
              {hit(`egg-star-${i}`, 14, 14)}
            </div>
          ))}
        </>
      )}

      {event === 'dia-de-muertos' && shown && MARIGOLDS.map((m, i) => (
        <div
          key={i}
          data-testid="festival-marigold"
          // z-6: on the sea, over the waves and the fish (z 5), under the boats (z 7).
          className={`absolute z-6 ${tapClass}`}
          style={{ left: `${m.left}%`, top: horizonY + m.dy, ['--dx' as string]: `${m.dx}px`, animation: anim(`festival-drift ${m.duration}s ease-in-out infinite alternate`) }}
          {...tapProps('diaDeMuertos', `egg-marigold-${i}`)}
        >
          <Marigold />
          {hit(`egg-marigold-${i}`, 12, 12)}
        </div>
      ))}

      {event === 'hanukkah' && shown && (
        // One more candle each night (1-8), in an even row on the water, below the horizon
        // labels. z-6: on the sea, over the waves and the fish (z 5), under the boats (z 7).
        // A very slow bob (2 px, 6-8 s) and a soft flicker; no shamash, so the count is the night.
        <div data-testid="festival-hanukkah" className="absolute left-1/2 z-6 flex -translate-x-1/2 gap-3" style={{ top: horizonY + 50 }}>
          {Array.from({ length: getHanukkahNight(date) ?? 8 }, (_, i) => (
            <div
              key={i}
              data-testid="festival-hanukkah-light"
              className={`relative ${tapClass}`}
              style={{ animation: anim(`festival-bob ${6 + (i % 3)}s ease-in-out ${-i * 1.3}s infinite alternate`) }}
              {...tapProps('hanukkah', `egg-light-${i}`)}
            >
              <Candle flicker={anim(`festival-glow ${4 + (i % 2)}s ease-in-out ${-i * 0.7}s infinite alternate`)} />
              {hit(`egg-light-${i}`, 14, 34)}
            </div>
          ))}
        </div>
      )}

      {event === 'nowruz' && (
        // A gentle arc of spring blossoms framing the equinox pill (CalendarEggs draws the pill
        // at horizon + 90 px). Under reduced motion the blossoms stay and the petals are hidden.
        <div data-testid="festival-nowruz" className="absolute left-1/2 z-9" style={{ top: horizonY + 90 }}>
          {BLOSSOMS.map((b, i) => (
            <div
              key={i}
              data-testid="festival-blossom"
              className={`absolute ${tapClass}`}
              style={{ left: b.x - b.size / 2, top: b.y - b.size / 2 }}
              {...tapProps('nowruz', `egg-blossom-${i}`)}
            >
              <Blossom size={b.size} />
              {hit(`egg-blossom-${i}`, b.size, b.size)}
            </div>
          ))}
          {!reducedMotion && NOWRUZ_PETALS.map((p, i) => (
            <div
              key={i}
              data-testid="festival-nowruz-petal"
              className="absolute pointer-events-none"
              style={{ left: p.x - 5, top: p.y, opacity: 0, ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: '36px', animation: `festival-sink ${p.duration}s linear ${p.delay}s infinite` }}
            >
              <Petal />
            </div>
          ))}
        </div>
      )}

      {event === 'midsummer' && (
        <>
          {shown && BONFIRES.map((left, i) => (
            <div
              key={i}
              data-testid="festival-bonfire"
              className={`absolute z-5 ${tapClass}`}
              style={{ left: `${left}%`, top: horizonY - 22, animation: anim(`festival-glow ${5 + i}s ease-in-out ${-i * 1.7}s infinite alternate`) }}
              {...tapProps('midsummer', `egg-bonfire-${i}`)}
            >
              <Bonfire />
              {hit(`egg-bonfire-${i}`, 26, 26)}
            </div>
          ))}
        </>
      )}

      {event === 'carnival' && shown && CONFETTI.map((f, i) => (
        <div
          key={i}
          data-testid="festival-confetti"
          className={`absolute top-[-5%] ${tapClass}`}
          style={{ left: `${f.left}%`, ['--dx' as string]: '24px', ['--dy' as string]: '110vh', animation: `festival-fall ${f.duration}s linear ${f.delay}s infinite` }}
          {...tapProps('carnival', `egg-confetti-${i}`)}
        >
          <span className="block h-1.5 w-2.5 rounded-[1px]" style={{ background: c(f.colour), transform: `rotate(${f.tilt}deg)` }} />
          {hit(`egg-confetti-${i}`, 10, 6)}
        </div>
      ))}

      <style>{`
        @keyframes festival-drift { to { transform: translateX(var(--dx)); } }
        @keyframes festival-glow { from { opacity: 0.8; } to { opacity: 1; } }
        @keyframes festival-bob { to { transform: translateY(2px); } }
        @keyframes festival-rise { 0% { opacity: 0; } 8% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; transform: translateY(var(--dy)); } }
        @keyframes festival-fall { to { transform: translate(var(--dx), var(--dy)); } }
        @keyframes festival-sink { 0% { opacity: 0; } 15% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); } }
      `}</style>
    </>
  );
};

export default FestivalEggs;
