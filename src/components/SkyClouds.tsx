import React, { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { type WeatherType } from './CloudLayer';
import { type TimeOfDay, getBackgroundGradient, getWaterColors } from '@/utils/sunUtils';
import { getCloudDriftDirection, getCloudMoonlight } from '@/utils/cloudLayoutUtils';
import { CLOUD_SHAPES } from '@/utils/cloudShapes';
import {
  type CloudGlider, type CloudLayers, type CloudLight, type SkyCloud,
  getCloudCentre, getCloudFill, getCloudLayers, getCloudLight, getCloudShadowBox,
  getCloudShadowLook, getCloudTypes, getCloudVeil, getGliderOffset, getGliderStartProgress, getLightAngle,
  getSceneScale, getSkyClouds, getSkyColorAt, getTimeOfDayAltitude,
} from '@/utils/skyCloudUtils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// Clouds by type (ROADMAP item 84): the real cloud layers (C1), lit by the sun (C2), in
// three bands that glide at their own pace (C3), with soft fills (C4), the rare
// lenticular and mammatus clouds (X1) and their shadows on the sea (X2). CloudLayer
// mounts it first, so the clouds paint behind the moon disc (item 76) and item 83's play
// rate reaches the glides, which are plain CSS animations.

interface SkyCloudsProps {
  weatherType: WeatherType;
  timeOfDay: TimeOfDay;
  date: Date; // the day seeds the layout
  latitude: number;
  longitude: number;
  // The current hour's cover per layer (live weather); null: the weather type's own.
  cloudLayers: CloudLayers | null;
  windDirectionDeg: number | null;
  // The sun and the moon in % of the scene; the sun with its altitude (°), the moon with
  // its radius (px) and brightness (0-1) for the silver lining.
  sun: { x: number; y: number; altitude: number } | null;
  moon: { x: number; y: number; r?: number; light?: number } | null;
  skyGradient: string | null;
  egg: boolean; // an X1 day
}

// Blur of the soft edge (C4): 2.6 px at the cloud's own size, less for the thin high clouds.
const BAND_BLUR = { high: 0.6, mid: 0.75, low: 1 };
const LINING_STEP = 0.5; // the lining moves in half-unit steps
const quantize = (n: number, step: number) => Math.round(n / step) * step;

interface CloudSvgProps {
  cloud: SkyCloud;
  gradId: string;
  weather: WeatherType;
  light: CloudLight;
  angle: number | null;
  skyGradient: string;
  height: number;
  liningX?: number;
  liningY?: number;
  liningR?: number;
  moonGlow: number;
}

// One cloud. Memoized on plain values, so the once-a-second tick only redraws a cloud
// whose light direction or silver lining changed.
const CloudSvg = memo(function CloudSvg({
  cloud, gradId, weather, light, angle, skyGradient, height, liningX, liningY, liningR, moonGlow,
}: CloudSvgProps) {
  const shape = CLOUD_SHAPES[cloud.type][cloud.variant];
  const fill = getCloudFill(cloud, weather, light, angle, cloud.tint > 0 ? getSkyColorAt(skyGradient, cloud.y / height) : null);
  const size = { width: 120 * cloud.scale, height: 60 * cloud.scale };
  return (
    <div
      className="absolute"
      style={{
        left: cloud.x,
        top: cloud.y - 30 * cloud.scale,
        ...size,
        opacity: cloud.opacity,
        filter: `blur(${(2.6 * BAND_BLUR[cloud.band] * cloud.scale).toFixed(2)}px)`,
      }}
      data-testid="sky-cloud"
      data-type={cloud.type}
    >
      <svg {...size} viewBox="0 0 120 60" overflow="visible" aria-hidden="true">
        <defs>
          <linearGradient id={`${gradId}f`} gradientUnits="userSpaceOnUse" x1={fill.x1} y1={fill.y1} x2={fill.x2} y2={fill.y2}>
            <stop offset="0" stopColor={fill.stops[0]} />
            <stop offset="0.55" stopColor={fill.stops[1]} />
            <stop offset="1" stopColor={fill.stops[2]} />
          </linearGradient>
          {fill.shade && (
            <linearGradient id={`${gradId}v`} gradientUnits="userSpaceOnUse" x1="0" y1={fill.shade.top} x2="0" y2={fill.shade.bottom}>
              <stop offset="0.35" stopColor="rgba(0, 0, 0, 0)" />
              <stop offset="1" stopColor={fill.shade.to} />
            </linearGradient>
          )}
          {fill.glow && (
            <radialGradient id={`${gradId}g`} gradientUnits="userSpaceOnUse" cx={fill.glow.cx} cy={fill.glow.cy} r={fill.glow.r}>
              <stop offset="0" stopColor={fill.glow.from} />
              <stop offset="1" stopColor={fill.glow.to} />
            </radialGradient>
          )}
          {cloud.shafts && (
            <linearGradient id={`${gradId}s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={fill.shafts[0]} />
              <stop offset="1" stopColor={fill.shafts[1]} />
            </linearGradient>
          )}
          {liningR !== undefined && (
            <radialGradient id={`${gradId}m`} gradientUnits="userSpaceOnUse" cx={liningX} cy={liningY} r={liningR}>
              <stop offset="0" stopColor="hsl(var(--scene-moon))" stopOpacity={0.85 * moonGlow} />
              <stop offset="0.5" stopColor="hsl(var(--scene-moon))" stopOpacity={0.32 * moonGlow} />
              <stop offset="1" stopColor="hsl(var(--scene-moon))" stopOpacity={0} />
            </radialGradient>
          )}
        </defs>
        {cloud.shafts && shape.shafts?.map(([x, w, slant, y0]) => (
          <path key={x} d={`M${x} ${y0}H${x + w}L${x + w + slant} ${y0 + 110}H${x + slant}Z`} fill={`url(#${gradId}s)`} />
        ))}
        <path d={shape.d} fill={`url(#${gradId}f)`} />
        {fill.shade && <path d={shape.d} fill={`url(#${gradId}v)`} />}
        {fill.glow && <path d={shape.d} fill={`url(#${gradId}g)`} />}
        {/* Silver lining (item 76): the parts near the moon catch its light. */}
        {liningR !== undefined && <path d={shape.d} fill={`url(#${gradId}m)`} data-testid="cloud-moonlight" />}
      </svg>
    </div>
  );
});

// The glide: a plain CSS animation, or the start place when still or with reduced motion.
// The glider is as wide as its track and moves by its own width, so two static keyframes
// serve every glide.
const glideStyle = (glider: CloudGlider, reduced: boolean): React.CSSProperties =>
  glider.durationSec > 0 && !reduced
    ? {
        left: Math.round(glider.from * 10) / 10,
        width: Math.round(Math.abs(glider.to - glider.from) * 10) / 10,
        animation: `${glider.to > glider.from ? 'skyGlideRight' : 'skyGlideLeft'} ${glider.durationSec.toFixed(1)}s linear ${glider.delaySec.toFixed(1)}s infinite`,
      }
    : { left: Math.round(getGliderOffset(glider, getGliderStartProgress(glider)) * 10) / 10 };

const canTick = typeof Element !== 'undefined' && typeof Element.prototype.getAnimations === 'function';

// A new layout (a forecast hour in time travel, the weather, a new day) cross-fades with
// the old one (ROADMAP item 87). A transition, so item 83's play rate does not speed it up
// or run it back; a forecast hour lasts 6 s in play.
export const LAYOUT_FADE_MS = 3000;
const FADE = 'transition-opacity duration-3000 ease-in-out starting:opacity-0 motion-reduce:transition-none';

interface Layout {
  key: string;
  gliders: CloudGlider[];
  weather: WeatherType;
  low: string;
}

const SkyClouds: React.FC<SkyCloudsProps> = ({
  weatherType, timeOfDay, date, latitude, longitude, cloudLayers, windDirectionDeg, sun, moon, skyGradient, egg,
}) => {
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const { width, height } = size;

  // The layout changes once a day, with the weather or with the screen, not every second.
  const seed = `${date.toDateString()}|${Math.round(latitude * 10) / 10}|${Math.round(longitude * 10) / 10}`;
  const layers = getCloudLayers(weatherType, cloudLayers);
  const direction = getCloudDriftDirection(windDirectionDeg);
  const layoutKey = `${seed}|${weatherType}|${layers.low}|${layers.mid}|${layers.high}|${width}x${height}|${egg}|${direction}`;
  const gliders = useMemo(
    () => getSkyClouds({ weather: weatherType, layers, width, height, seed, egg, direction }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on layoutKey, which holds every input
    [layoutKey]
  );

  // C2: the palettes by the sun's altitude (in half-degree steps), else by the time of day.
  const altitude = sun ? quantize(sun.altitude, 0.5) : getTimeOfDayAltitude(timeOfDay);
  const light = useMemo(() => getCloudLight(altitude), [altitude]);
  const sunPx = sun ? { x: (sun.x / 100) * width, y: (sun.y / 100) * height } : null;
  const moonPx = moon ? { x: (moon.x / 100) * width, y: (moon.y / 100) * height, r: moon.r ?? 0 } : null;
  const source = sun && sun.altitude > -12 ? sunPx : moonPx;
  const sky = skyGradient ?? getBackgroundGradient(timeOfDay);
  const shadowColor = useMemo(() => getWaterColors(sky).deep, [sky]);

  // Where each glider is now. Once a second the tick reads each glide's progress (so the
  // light also follows item 83's play rate) and moves the silver lining, the light
  // direction and the shadow with it; the lookbook did the same.
  const glideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [ticked, setTicked] = useState<{ key: string; progress: number[] } | null>(null);
  const progress = ticked?.key === layoutKey ? ticked.progress : gliders.map(getGliderStartProgress);
  useEffect(() => {
    if (reduced || !canTick || gliders.length === 0) return;
    const id = setInterval(() => {
      const next = gliders.map((g, i) => {
        const p = glideRefs.current[i]?.getAnimations()[0]?.effect?.getComputedTiming().progress;
        return typeof p === 'number' ? p : getGliderStartProgress(g);
      });
      setTicked(prev => {
        const before = prev?.key === layoutKey ? prev.progress : gliders.map(getGliderStartProgress);
        // Skip the update while no glider moved by 1.5 px.
        const moved = next.some((p, i) => Math.abs(getGliderOffset(gliders[i], p) - getGliderOffset(gliders[i], before[i])) >= 1.5);
        return moved ? { key: layoutKey, progress: next } : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gliders, layoutKey, reduced]);

  const moonGlow = moon?.light ?? 1;
  const scale = getSceneScale(height);

  // The layout fading out (item 87), with the glide progress it had; the new one fades in.
  const layout = useMemo<Layout>(
    () => ({ key: layoutKey, gliders, weather: weatherType, low: getCloudTypes(weatherType, layers).low ?? 'none' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on layoutKey, which holds every input
    [layoutKey]
  );
  const [shown, setShown] = useState<{ current: Layout; fading: (Layout & { progress: number[] }) | null }>(
    () => ({ current: layout, fading: null })
  );
  if (shown.current.key !== layoutKey) {
    const old = shown.current;
    setShown({
      current: layout,
      fading: { ...old, progress: ticked?.key === old.key ? ticked.progress : old.gliders.map(getGliderStartProgress) },
    });
  }
  useEffect(() => {
    if (!shown.fading) return;
    const id = setTimeout(() => setShown(prev => ({ ...prev, fading: null })), LAYOUT_FADE_MS);
    return () => clearTimeout(id);
  }, [shown.fading]);
  const layouts = [
    ...(shown.fading ? [{ ...shown.fading, out: true }] : []),
    { ...layout, progress, out: false },
  ];

  return (
    <>
      {layouts.map(({ key, weather, out }) => {
        const veil = getCloudVeil(weather, light);
        // The fade is on a wrapper: an inline opacity would win over the starting style.
        return veil && (
          <div key={key} className={`absolute inset-0 ${FADE}`} style={out ? { opacity: 0 } : undefined}>
            {/* The overcast veil over the top of the sky (item 10), in the clouds' light (C2). */}
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, ${veil.color} 0%, transparent 40%)`, opacity: veil.opacity }}
              data-testid="cloud-veil"
            />
          </div>
        );
      })}
      {layouts.map(({ key, gliders, weather, low, progress, out }) => (
      <div
        key={key}
        className={`absolute inset-0 ${FADE}`}
        style={out ? { opacity: 0 } : undefined}
        data-testid="sky-clouds"
        data-low={low}
        data-fading={out || undefined}
      >
        {gliders.map((glider, i) => (
          <div
            key={glider.id}
            ref={out ? undefined : el => { glideRefs.current[i] = el; }}
            className="absolute left-0 top-0"
            style={glideStyle(glider, reduced)}
            data-testid={glider.clouds.length > 1 ? 'cloud-row' : 'cloud-glider'}
            data-speed={glider.speed.toFixed(2)}
          >
            {glider.clouds.map((cloud, j) => {
              const centre = getCloudCentre(glider, cloud, progress[i]);
              const lining = moonPx && moonPx.r > 0 ? getCloudMoonlight({ ...centre, scale: cloud.scale }, moonPx) : null;
              return (
                <CloudSvg
                  key={j}
                  cloud={cloud}
                  gradId={`${uid}-${glider.id}-${j}`}
                  weather={weather}
                  light={light}
                  angle={getLightAngle(centre, source)}
                  skyGradient={sky}
                  height={height}
                  liningX={lining ? quantize(lining.cx, LINING_STEP) : undefined}
                  liningY={lining ? quantize(lining.cy, LINING_STEP) : undefined}
                  liningR={lining ? quantize(lining.r, LINING_STEP) : undefined}
                  moonGlow={moonGlow}
                />
              );
            })}
          </div>
        ))}
      </div>
      ))}
      {layouts.map(({ key, gliders, weather, progress, out }) => {
        const shadowLook = getCloudShadowLook(weather, light);
        return shadowLook && (
        // X2: the shadows on the sea, over the water and the waves, under the fish (z 5).
        <div key={`shadows-${key}`} className={`absolute inset-0 ${FADE}`} style={{ zIndex: 4, opacity: out ? 0 : undefined }} data-testid="cloud-shadows">
          {gliders.map((glider, i) => {
            const cloud = glider.clouds[0];
            if (!cloud.shadow) return null;
            const box = getCloudShadowBox(cloud, height);
            const centre = getCloudCentre(glider, cloud, progress[i]);
            const shift = sunPx ? Math.round(-(sunPx.x - centre.x) * shadowLook.shift) : 0;
            return (
              <div key={glider.id} className="absolute left-0 top-0" style={glideStyle(glider, reduced)}>
                <div
                  className="absolute"
                  style={{
                    left: cloud.x + shift,
                    top: box.y - box.height / 2,
                    width: 120 * cloud.scale,
                    height: box.height,
                    borderRadius: '50%',
                    opacity: shadowLook.alpha,
                    background: `radial-gradient(closest-side, ${shadowColor}, transparent)`,
                    filter: `blur(${(3 * scale).toFixed(1)}px)`,
                  }}
                  data-testid="cloud-shadow"
                />
              </div>
            );
          })}
        </div>
        );
      })}
      <style>{`
        @keyframes skyGlideRight {
          to { transform: translateX(100%); }
        }
        @keyframes skyGlideLeft {
          to { transform: translateX(-100%); }
        }
      `}</style>
    </>
  );
};

export default SkyClouds;
