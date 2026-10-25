import React, { useMemo, useRef } from 'react';
import { Sun } from 'lucide-react';
import { type SunPosition, type TimeOfDay, getWaterColors } from '@/utils/sunUtils';
import { type MoonPosition, getMoonPhasePath } from '@/utils/moonUtils';
import { getMoonLook, getSunVisibility } from '@/utils/weatherEffectsUtils';
import {
  DIRECTION_LABELS, getCardinalPills, getGlowClass, getScreenPosition, getSeaPath, getSunColorClass,
  getSunGlowToken, getVisibleCardinalLabels,
} from '@/utils/skyLook';
import { useViewportSize } from '@/hooks/useViewportSize';
import { useLanguage } from '@/hooks/useLanguage';
import { type WeatherType } from './CloudLayer';

// The time the full scene fades in over the light sky, and the time the light sky then fades out
// under it (ROADMAP item 174).
export const SCENE_HANDOFF_MS = 700;
export const LIGHT_SKY_FADE_MS = 400;

interface LightSkyProps {
  sunPosition: SunPosition;
  moonPosition: MoonPosition;
  timeOfDay: TimeOfDay;
  // The sky gradient after the weather mix (SunTracker): the water takes its colours from it.
  skyGradient: string;
  weatherType: WeatherType;
  latitude: number;
  cloudCoverPercent?: number | null;
  // The full scene has fully arrived: this sky fades out under it.
  leaving?: boolean;
}

const isNightSky = (timeOfDay: TimeOfDay) =>
  timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';

// The light first sky (ROADMAP item 174): the first thing a slow phone shows, from the first
// bundle, while the full scene (clouds, fish, boats, birds, terrain, eggs ...) is on its way. The
// sky gradient is SunTracker's own; the horizon, the sun, the moon and the compass labels use the
// full scene's mapping and look (utils/skyLook.ts), so the full scene replaces this sky with no
// jump. It takes no taps; the full scene brings them.
const LightSky: React.FC<LightSkyProps> = ({
  sunPosition, moonPosition, timeOfDay, skyGradient, weatherType, latitude, cloudCoverPercent = null, leaving = false,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useViewportSize(containerRef);

  const water = getWaterColors(skyGradient, weatherType === 'storm');
  const seaPath = useMemo(() => getSeaPath(width, height), [width, height]);
  const horizonLabelY = height * 0.65;
  const pills = useMemo(() => getCardinalPills(getVisibleCardinalLabels(latitude, null), width), [latitude, width]);

  const sunVisibility = getSunVisibility(weatherType);
  const sunDot = getScreenPosition(sunPosition.altitude, sunPosition.azimuth, width, height, latitude, null);
  const isSunShown = sunPosition.altitude > -18 && sunVisibility.halo > 0 && sunDot.visible;
  const sunShines = sunVisibility.disc >= 0.5;
  const glowToken = getSunGlowToken(sunPosition.altitude);

  const moonDot = getScreenPosition(moonPosition.altitude, moonPosition.azimuth, width, height, latitude, null);
  const moonLook = getMoonLook(weatherType, cloudCoverPercent);
  const isMoonShown = moonPosition.visible && isNightSky(timeOfDay) && moonDot.visible;
  const moonBright = moonPosition.illumination * 0.8 + 0.2;
  const moonRadius = 18 + moonPosition.illumination * 6;
  const moonPhasePath = useMemo(
    () => getMoonPhasePath(moonPosition.illumination, moonPosition.phase, latitude, moonRadius),
    [moonPosition.illumination, moonPosition.phase, latitude, moonRadius],
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="light-sky"
      className="absolute inset-x-0 top-0 h-dvh overflow-hidden pointer-events-none"
      style={{
        opacity: leaving ? 0 : 1,
        // Under the full scene, which has faded in over it first: no dip in between.
        transition: leaving ? `opacity ${LIGHT_SKY_FADE_MS}ms ease-in-out` : undefined,
      }}
    >
      {isSunShown && glowToken && (
        <div
          className="absolute rounded-full"
          style={{
            left: `${sunDot.x}px`,
            top: `${sunDot.y}px`,
            width: (sunPosition.altitude > 0 ? 200 : 160) * sunVisibility.haloScale,
            height: (sunPosition.altitude > 0 ? 200 : 160) * sunVisibility.haloScale,
            transform: 'translate(-50%, -50%)',
            opacity: sunVisibility.halo,
            background: `radial-gradient(circle, hsl(var(${sunShines ? glowToken : '--scene-glow-white'}) / 0.55) 0%, transparent 70%)`,
          }}
        />
      )}
      {isSunShown && sunVisibility.disc > 0 && (
        <div
          data-testid="light-sky-sun"
          className={`absolute rounded-full ${getSunColorClass(sunPosition.altitude)} ${getGlowClass(sunPosition.altitude, weatherType)}`}
          style={{ left: `${sunDot.x}px`, top: `${sunDot.y}px`, transform: 'translate(-50%, -50%)' }}
        >
          <Sun
            size={sunPosition.altitude > 0 ? 96 : 80}
            strokeWidth={1}
            style={{
              opacity: sunVisibility.disc,
              ...(sunVisibility.pale > 0 && { color: `color-mix(in srgb, currentColor, hsl(var(--scene-sky-overcast)) ${sunVisibility.pale * 100}%)` }),
            }}
          />
        </div>
      )}

      {isMoonShown && moonLook.corona > 0 && (
        <div
          className="absolute rounded-full"
          style={{
            left: `${moonDot.x}px`,
            top: `${moonDot.y}px`,
            width: moonRadius * moonLook.coronaRadius * 2,
            height: moonRadius * moonLook.coronaRadius * 2,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle closest-side, hsl(var(--scene-moon) / ${0.32 * moonLook.corona * moonBright}) 0%, hsl(var(--scene-moon) / ${0.13 * moonLook.corona * moonBright}) 40%, transparent 100%)`,
          }}
        />
      )}
      {isMoonShown && moonLook.disc > 0 && (
        <div
          data-testid="light-sky-moon"
          className="absolute flex min-h-11 min-w-11 items-center justify-center rounded-full"
          style={{
            left: `${moonDot.x}px`,
            top: `${moonDot.y}px`,
            transform: 'translate(-50%, -50%)',
            opacity: moonBright * moonLook.disc,
            filter: `drop-shadow(0 0 ${moonPosition.illumination * 15}px hsl(var(--scene-glow-white) / 0.4))`,
          }}
        >
          <svg width={moonRadius * 2} height={moonRadius * 2} viewBox={`${-moonRadius} ${-moonRadius} ${moonRadius * 2} ${moonRadius * 2}`}>
            <circle cx={0} cy={0} r={moonRadius - 0.5} fill="hsl(var(--scene-moon-dark))" stroke="hsl(var(--scene-moon))" strokeOpacity={0.3} />
            <path d={moonPhasePath} fill="hsl(var(--scene-moon))" />
          </svg>
        </div>
      )}

      {seaPath && (
        <svg className="absolute inset-0 w-full h-full" data-testid="light-sky-sea">
          <defs>
            <linearGradient id="lightSkyWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={water.surface} />
              <stop offset="100%" stopColor={water.deep} />
            </linearGradient>
          </defs>
          <path d={seaPath} fill="url(#lightSkyWater)" />
        </svg>
      )}

      {width > 0 && (
        <div className="absolute inset-0" data-testid="light-sky-labels">
          {pills.map(({ label, x }) => (
            <div
              key={label}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: `${x}px`, top: `${horizonLabelY}px`, transform: 'translate(-50%, -50%)' }}
            >
              <span className="block h-3 w-px bg-white/50" />
              <span className="text-caption text-white/90 bg-panel-background border border-panel-border px-2 py-0.5 rounded-full">
                {t(DIRECTION_LABELS[label])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LightSky;
