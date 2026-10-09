import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type MessageKey } from '@/i18n';
import { type AstroEvent } from '@/utils/astroEvents';
import { type PlanetName, type PlanetSky } from '@/utils/planets';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { type RarityTier } from '@/utils/rarityTier';
import { type EggCardKind } from '@/utils/sceneInfo';
import { HitArea, type SceneInfoHandler } from './CloudLayer';

interface SkyEggsProps {
  event: AstroEvent | null;
  // Sky position (degrees) -> scene px, SunVisualization's mapping; null outside the compass view.
  project: (altitude: number, azimuth: number) => { x: number; y: number } | null;
  latitude: number;
  horizonY: number;
  // 0-1: clouds hide the sky things like the stars (getStarCloudFactor). The pills stay.
  opacity: number;
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
  infoRingTier?: RarityTier | null;
}

const PLANET_NAMES: Record<PlanetName, MessageKey> = {
  venus: 'planet.venus', mars: 'planet.mars', jupiter: 'planet.jupiter', saturn: 'planet.saturn',
};

// Matariki: low in the east-north-east, where the Pleiades rise. The seven brightest stars as
// [x, y, r] px around the centre.
const PLEIADES_SKY = { altitude: 7, azimuth: 65 };
const PLEIADES: readonly [number, number, number][] = [
  [0, 0, 2.2], [-7, -3, 1.6], [-11, 1, 1.5], [6, -4, 1.4], [8, 2, 1.3], [-3, 5, 1.3], [-14, -3, 1.2],
];
// `?egg=conjunction` has no real planets: Venus and Jupiter low in the west after sunset.
const DEMO_PLANETS: [PlanetSky, PlanetSky] = [
  { name: 'venus', altitude: 12, azimuth: 255 },
  { name: 'jupiter', altitude: 13.2, azimuth: 256 },
];
// Two planets under 2° apart are 1-2 px apart on the 360° screen, so the dots are spread to at
// least this distance along the line between them.
const PLANET_GAP_PX = 14;
// Noctilucent clouds: wisps low over the pole-side horizon, [azimuth offset, altitude, width px].
const WISPS: readonly [number, number, number][] = [
  [-24, 5, 56], [-14, 8, 70], [-5, 4, 64], [5, 7, 80], [15, 5, 60], [25, 8, 48],
];

const PILL = `whitespace-nowrap rounded-full px-3 py-1 text-caption text-white ${GLASS_SURFACE}`;

// The sky easter eggs (astroEvents: matariki, conjunction, noctilucent, midnightSun,
// polarNight). All static (calm-motion rule), so reduced motion needs no change. A double
// tap opens the egg's info card (item 116 pattern).
const SkyEggs: React.FC<SkyEggsProps> = ({ event, project, latitude, horizonY, opacity, onInfo, infoRing = null, infoRingTier = null }) => {
  const { t } = useLanguage();
  const { tap } = useDoubleTap(onInfo);
  if (!event) return null;
  const tapProps = (kind: EggCardKind, ring: string) => onInfo ? {
    'aria-hidden': true,
    onClick: (e: React.MouseEvent) => tap({ type: 'egg', kind }, { x: e.clientX, y: e.clientY }, ring),
  } : {};
  const tapClass = onInfo ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none';
  const hit = (ring: string, w: number, h: number) =>
    onInfo && <HitArea cx={w / 2} cy={h / 2} width={w} height={h} ring={infoRing === ring} tier={infoRing === ring ? infoRingTier : null} />;
  const sky = opacity > 0;

  // A pill on the water, below the season badge (CalendarEggs, horizon + 90 px).
  const polarPill = (kind: 'midnightSun' | 'polarNight', ring: string) => (
    <div
      data-testid="sky-egg-polar"
      style={{ top: horizonY + 130 }}
      className={`absolute left-1/2 z-9 -translate-x-1/2 ${tapClass}`}
      {...tapProps(kind, ring)}
    >
      <div className={PILL}>{t(kind === 'midnightSun' ? 'egg.midnightSun' : 'egg.polarNight')}</div>
      {/* The pill is the hit area (at least 44 px wide); the ring goes round it, as on the moon button. */}
      {onInfo && (infoRing === ring) && <span className="absolute inset-0 rounded-full border border-white/70" data-testid="scene-info-ring" />}
    </div>
  );

  switch (event.kind) {
    case 'matariki': {
      const at = sky ? project(PLEIADES_SKY.altitude, PLEIADES_SKY.azimuth) : null;
      if (!at) return null;
      return (
        <div
          data-testid="sky-egg-matariki"
          className={`absolute flex flex-col items-center gap-1 ${tapClass}`}
          style={{ left: at.x - 40, top: at.y - 12, width: 80, opacity }}
          {...tapProps('matariki', 'egg-matariki')}
        >
          <svg aria-hidden="true" width={36} height={24} viewBox="-18 -12 36 24" style={{ filter: 'drop-shadow(0 0 6px hsl(var(--scene-pleiades) / 0.9))' }}>
            {PLEIADES.map(([x, y, r]) => <circle key={`${x},${y}`} cx={x} cy={y} r={r} fill="hsl(var(--scene-pleiades))" />)}
          </svg>
          <div className={PILL}>{t('egg.matariki')}</div>
          {hit('egg-matariki', 80, 24)}
        </div>
      );
    }
    case 'conjunction': {
      const [a, b] = event.planets ?? DEMO_PLANETS;
      const pa = sky ? project(a.altitude, a.azimuth) : null;
      const pb = sky ? project(b.altitude, b.azimuth) : null;
      if (!pa || !pb) return null;
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const [ux, uy] = len > 0.5 ? [(pb.x - pa.x) / len, (pb.y - pa.y) / len] : [1, 0];
      const half = Math.max(len, PLANET_GAP_PX) / 2;
      const label = t('egg.conjunctionPair', { a: t(PLANET_NAMES[a.name]), b: t(PLANET_NAMES[b.name]) });
      return (
        <div
          data-testid="sky-egg-conjunction"
          className={`absolute flex flex-col items-center gap-1 ${tapClass}`}
          style={{ left: mid.x - 60, top: mid.y - 12, width: 120, opacity }}
          {...tapProps('conjunction', 'egg-conjunction')}
        >
          <svg aria-hidden="true" width={40} height={24} viewBox="-20 -12 40 24" style={{ filter: 'drop-shadow(0 0 5px hsl(var(--scene-planet) / 0.9))' }}>
            <circle data-testid="sky-egg-planet" cx={-ux * half} cy={-uy * half} r={2.6} fill="hsl(var(--scene-planet))" />
            <circle data-testid="sky-egg-planet" cx={ux * half} cy={uy * half} r={2.2} fill="hsl(var(--scene-planet))" />
          </svg>
          <div className={PILL}>{label}</div>
          {hit('egg-conjunction', 120, 24)}
        </div>
      );
    }
    case 'noctilucent': {
      if (!sky) return null;
      const pole = latitude < 0 ? 180 : 0;
      return (
        <>
          {WISPS.flatMap(([offset, altitude, width], i) => {
            const at = project(altitude, (pole + offset + 360) % 360);
            if (!at) return [];
            return [
              <div
                key={i}
                data-testid="sky-egg-noctilucent"
                className={`absolute ${tapClass}`}
                style={{ left: at.x - width / 2, top: at.y - 6, width, height: 12, opacity }}
                {...tapProps('noctilucent', 'egg-noctilucent')}
              >
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    opacity: 0.55,
                    filter: 'blur(4px)',
                    background: 'linear-gradient(to right, transparent, hsl(var(--scene-noctilucent) / 0.8) 30%, hsl(var(--scene-noctilucent) / 0.5) 70%, transparent)',
                  }}
                />
                {hit('egg-noctilucent', width, 12)}
              </div>,
            ];
          })}
        </>
      );
    }
    case 'midnightSun': return polarPill('midnightSun', 'egg-midnight-sun');
    case 'polarNight': return polarPill('polarNight', 'egg-polar-night');
    default: return null;
  }
};

export default SkyEggs;
