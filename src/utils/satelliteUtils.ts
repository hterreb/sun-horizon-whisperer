// Satellites (ROADMAP item 97). Pure functions: the free decorative dots (when and how
// often one crosses), and for the Premium tracking the visibility rule, the Earth's shadow
// test, the brightness and the pass search. satellite.js (SGP4) comes in as an argument,
// because the app loads it with a dynamic import() only when the tracking is on.

import type * as SatelliteJs from 'satellite.js';
import { translate } from '@/i18n';
import { type Language } from './language';
import { formatTime, getSunPosition, type SunTimes } from './sunUtils';
import { type GpRecord } from './satelliteData';
import { type WeatherType } from '@/components/CloudLayer';
import { getSatelliteSize, type SatelliteSize } from './sceneInfo';

export type SatelliteLib = typeof SatelliteJs;
type SatRec = SatelliteJs.SatRec;

const DEG = Math.PI / 180;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
// WGS 84 equatorial radius, as satellite.js uses.
export const EARTH_RADIUS_KM = 6378.137;

// A satellite shows when the sun is below this altitude at the observer (the end of civil
// twilight) ...
export const SUN_MAX_ALTITUDE = -6;
// ... and the satellite is above this elevation and in sunlight.
export const MIN_ELEVATION = 10;

export const ISS_NORAD_ID = 25544;

// --- Free part: decorative dots -------------------------------------------------------

// The 2 h after dusk and before dawn, when most satellites are still in sunlight.
const SATELLITE_HOURS_MS = 2 * HOUR_MS;
// About one dot every 2-4 min in those hours, and a third of that in the middle of the night.
export const SPAWN_GAP_MS: [number, number] = [2 * MINUTE_MS, 4 * MINUTE_MS];
export const NIGHT_GAP_FACTOR = 3;
// Speed in % of the screen width per second: 6x the first 0.1-0.3, so the eye finds the
// moving dot (item 130). Slower than the birds (2.5); the fastest pass the sailboat (1.2).
export const DOT_SPEED: [number, number] = [0.6, 1.8];
// The share of dots that fade out in the middle of the sky (into the Earth's shadow).
export const FADE_SHARE = 1 / 3;

// Only a clear or partly cloudy sky shows the dots.
export const isSatelliteWeather = (type: WeatherType): boolean => type === 'clear' || type === 'partly';

// The gap range between two decorative dots at `now`, or null when no dot comes: the sun
// is above -6°. Short in the 2 h after dusk (civil twilight end) and before dawn, else
// NIGHT_GAP_FACTOR times longer. Yesterday's dusk and tomorrow's dawn are today's ± 24 h.
export const getDotGapMs = (now: Date, sunAltitude: number, sunTimes: SunTimes | null): [number, number] | null => {
  if (sunAltitude >= SUN_MAX_ALTITUDE) return null;
  if (!sunTimes || sunTimes.polar) return [SPAWN_GAP_MS[0] * NIGHT_GAP_FACTOR, SPAWN_GAP_MS[1] * NIGHT_GAP_FACTOR];
  const t = now.getTime();
  const day = 24 * HOUR_MS;
  const dusk = sunTimes.dusk.getTime();
  const dawn = sunTimes.dawn.getTime();
  const sinceDusk = Math.min(...[dusk - day, dusk].map((d) => t - d).filter((d) => d >= 0));
  const untilDawn = Math.min(...[dawn, dawn + day].map((d) => d - t).filter((d) => d >= 0));
  const nearTwilight = Math.min(sinceDusk, untilDawn) <= SATELLITE_HOURS_MS;
  const factor = nearTwilight ? 1 : NIGHT_GAP_FACTOR;
  return [SPAWN_GAP_MS[0] * factor, SPAWN_GAP_MS[1] * factor];
};

export interface DotPath {
  // Start and end in % of the scene (x of the width, y of the height).
  x0: number; y0: number; x1: number; y1: number;
  durationMs: number;
  // Where the dot fades out, as a share of the path (into the Earth's shadow); 1 = no fade.
  fadeAt: number;
}

// The sky band of the dots: from near the top to above the horizon (at 65 %).
const SKY_TOP = 6;
const SKY_BOTTOM = 52;

// A straight line from one side of the sky to the other, from five random numbers in [0, 1).
export const makeDotPath = (r: [number, number, number, number, number]): DotPath => {
  const [side, a, b, speed, fade] = r;
  const leftToRight = side < 0.5;
  const y0 = SKY_TOP + a * (SKY_BOTTOM - SKY_TOP);
  const y1 = SKY_TOP + b * (SKY_BOTTOM - SKY_TOP);
  const x0 = leftToRight ? -2 : 102;
  const x1 = leftToRight ? 102 : -2;
  const pctPerSec = DOT_SPEED[0] + speed * (DOT_SPEED[1] - DOT_SPEED[0]);
  // Speed along x: a steep line takes no more time than a flat one.
  const durationMs = (Math.abs(x1 - x0) / pctPerSec) * 1000;
  const fadeAt = fade < FADE_SHARE ? 0.35 + (fade / FADE_SHARE) * 0.35 : 1;
  return { x0, y0, x1, y1, durationMs, fadeAt };
};

// --- Premium part: tracking -------------------------------------------------------------

export interface Vec3 { x: number; y: number; z: number }

export interface TrackedSatellite {
  id: number;
  name: string;
  satrec: SatRec;
  epochMs: number;
}

// The satrec of each record; a record that SGP4 cannot read is left out.
export const toTrackedSatellites = (lib: SatelliteLib, records: GpRecord[]): TrackedSatellite[] =>
  records.flatMap((record) => {
    try {
      const satrec = lib.json2satrec({ ...record });
      const epochMs = Date.parse(`${record.EPOCH}Z`);
      return Number.isFinite(epochMs) ? [{ id: Number(record.NORAD_CAT_ID), name: record.OBJECT_NAME, satrec, epochMs }] : [];
    } catch {
      return [];
    }
  });

// Orbits drift away from the data: positions more than this far from the data's epoch
// (time travel, item 44) are not shown.
export const MAX_EPOCH_AGE_MS = 3 * 24 * HOUR_MS;
export const isNearEpoch = (sat: TrackedSatellite, date: Date): boolean =>
  Math.abs(date.getTime() - sat.epochMs) <= MAX_EPOCH_AGE_MS;

// The sun direction (a unit vector, Earth-fixed) from the sun's azimuth and altitude at the
// observer (sunUtils). The sun is so far away that the direction from the observer is the
// direction from the Earth's centre.
export const sunDirectionEcf = (azimuthDeg: number, altitudeDeg: number, latitudeDeg: number, longitudeDeg: number): Vec3 => {
  const az = azimuthDeg * DEG, alt = altitudeDeg * DEG, lat = latitudeDeg * DEG, lon = longitudeDeg * DEG;
  const e = Math.cos(alt) * Math.sin(az);
  const n = Math.cos(alt) * Math.cos(az);
  const u = Math.sin(alt);
  return {
    x: -Math.sin(lon) * e - Math.sin(lat) * Math.cos(lon) * n + Math.cos(lat) * Math.cos(lon) * u,
    y: Math.cos(lon) * e - Math.sin(lat) * Math.sin(lon) * n + Math.cos(lat) * Math.sin(lon) * u,
    z: Math.cos(lat) * n + Math.sin(lat) * u,
  };
};

// The Earth's shadow as a cylinder of the Earth's radius behind the Earth (away from the
// sun). True when the satellite (Earth-fixed position in km) is inside it.
export const isInEarthShadow = (position: Vec3, sunDirection: Vec3): boolean => {
  const along = position.x * sunDirection.x + position.y * sunDirection.y + position.z * sunDirection.z;
  if (along >= 0) return false;
  const r2 = position.x ** 2 + position.y ** 2 + position.z ** 2;
  return r2 - along * along < EARTH_RADIUS_KM ** 2;
};

// The visibility rule: high enough, a dark sky at the observer, the satellite in sunlight.
export const isSatelliteVisible = ({ elevation, sunAltitude, sunlit }: { elevation: number; sunAltitude: number; sunlit: boolean }): boolean =>
  elevation > MIN_ELEVATION && sunAltitude < SUN_MAX_ALTITUDE && sunlit;

// Brightness from the distance: the standard magnitude (at 1000 km) of the satellite's size
// class (item 130), plus 5 log10(range / 1000 km). The opacity of the dot: 1 at magnitude -2
// and brighter, down to MIN_OPACITY for faint ones.
// ponytail: one magnitude per size class; a table of per-satellite standard magnitudes
// (McCants' list) if a known one looks wrong.
const STANDARD_MAGNITUDE: Record<SatelliteSize, number> = { iss: -1.8, giant: 1, large: 2.5, medium: 4, small: 6 };
const MIN_OPACITY = 0.25;
export const getSatelliteMagnitude = (id: number, name: string, rangeKm: number): number =>
  STANDARD_MAGNITUDE[getSatelliteSize(id, name)] + 5 * Math.log10(Math.max(rangeKm, 100) / 1000);
export const getSatelliteOpacity = (magnitude: number): number =>
  Math.min(1, Math.max(MIN_OPACITY, 1 - (magnitude + 2) / 8));
// The dot's size from the magnitude (item 130): 2.5 px for faint ones up to 7 px (the ISS
// overhead, about -3.7), on the stars' scale. A glow below magnitude 0.
export const getSatelliteDotPx = (magnitude: number): number => Math.min(7, Math.max(2.5, 4.5 - 0.65 * magnitude));
export const getSatelliteGlowPx = (magnitude: number): number => Math.min(8, Math.max(0, -2 * magnitude));

export interface Observer { latitude: number; longitude: number }

export interface SatelliteLook {
  azimuth: number; // degrees, 0 = north
  elevation: number; // degrees
  rangeKm: number;
  sunlit: boolean;
}

interface Snapshot {
  date: Date;
  sunAltitude: number;
  sunDirection: Vec3;
}

const snapshot = (date: Date, observer: Observer): Snapshot => {
  const sun = getSunPosition(date, observer.latitude, observer.longitude);
  return { date, sunAltitude: sun.altitude, sunDirection: sunDirectionEcf(sun.azimuth, sun.altitude, observer.latitude, observer.longitude) };
};

const geodetic = (lib: SatelliteLib, observer: Observer) => ({
  latitude: lib.degreesToRadians(observer.latitude),
  longitude: lib.degreesToRadians(observer.longitude),
  height: 0,
});

// The Earth-fixed position (km) of a satellite at `date`, with its velocity (km/s) and
// height; null when SGP4 fails (a decayed orbit).
const propagateEcf = (lib: SatelliteLib, satrec: SatRec, date: Date) => {
  const pv = lib.propagate(satrec, date);
  if (!pv) return null;
  const gmst = lib.gstime(date);
  return { ecf: lib.eciToEcf(pv.position, gmst) as Vec3, eci: pv.position, velocity: pv.velocity, gmst };
};

// Where an observer sees the satellite at `date`, and whether it is in sunlight.
export const lookAtSatellite = (lib: SatelliteLib, satrec: SatRec, date: Date, observer: Observer, sunDirection: Vec3): SatelliteLook | null => {
  const state = propagateEcf(lib, satrec, date);
  if (!state) return null;
  const look = lib.ecfToLookAngles(geodetic(lib, observer), state.ecf);
  return {
    azimuth: ((look.azimuth / DEG) % 360 + 360) % 360,
    elevation: look.elevation / DEG,
    rangeKm: look.rangeSat,
    sunlit: !isInEarthShadow(state.ecf, sunDirection),
  };
};

export interface SkySatellite extends SatelliteLook {
  id: number;
  name: string;
  visible: boolean;
  magnitude: number;
  opacity: number;
}

// Around the sun's -6° the scene does not cut the satellites off: they fade in and out by
// opacity while the sun crosses this band, about 1 min at mid latitudes (Lutz, 2026-10-06).
export const TWILIGHT_FADE: [number, number] = [-6.1, -5.9];
// 1 with the sun below the band, 0 above it, linear in between.
export const getTwilightFade = (sunAltitude: number): number =>
  Math.min(1, Math.max(0, (TWILIGHT_FADE[1] - sunAltitude) / (TWILIGHT_FADE[1] - TWILIGHT_FADE[0])));

// A satellite that was visible FADE_MS ago stays in the list (not visible), so the scene can
// fade it out: into the Earth's shadow, or below 10°.
export const FADE_MS = 6000;

// The visibility rule for the scene: in the twilight band the sun part of the rule becomes
// the fade (the opacity), so a satellite does not vanish at the sun's -6°.
const isShownInScene = (look: SatelliteLook, sunAltitude: number): boolean =>
  isSatelliteVisible({ elevation: look.elevation, sunAltitude: getTwilightFade(sunAltitude) > 0 ? SUN_MAX_ALTITUDE - 1 : sunAltitude, sunlit: look.sunlit });

// The satellites the scene shows at `date`: the visible ones, and the ones fading out (with
// `visible` false). The opacity includes the twilight fade. Empty while the sun is above the
// twilight band (nothing is computed then).
export const getSkySatellites = (lib: SatelliteLib, satellites: TrackedSatellite[], date: Date, observer: Observer): SkySatellite[] => {
  const snap = snapshot(date, observer);
  const fade = getTwilightFade(snap.sunAltitude);
  if (fade === 0) return [];
  const before = new Date(date.getTime() - FADE_MS);
  let snapBefore: Snapshot | null = null;
  const wasVisible = (sat: TrackedSatellite): boolean => {
    snapBefore ??= snapshot(before, observer);
    const look = lookAtSatellite(lib, sat.satrec, before, observer, snapBefore.sunDirection);
    return !!look && isShownInScene(look, snapBefore.sunAltitude);
  };
  const result: SkySatellite[] = [];
  for (const sat of satellites) {
    if (!isNearEpoch(sat, date)) continue;
    const look = lookAtSatellite(lib, sat.satrec, date, observer, snap.sunDirection);
    if (!look || look.elevation <= 0) continue;
    const visible = isShownInScene(look, snap.sunAltitude);
    if (!visible && !wasVisible(sat)) continue;
    const magnitude = getSatelliteMagnitude(sat.id, sat.name, look.rangeKm);
    result.push({
      ...look,
      id: sat.id,
      name: sat.name,
      visible,
      magnitude,
      opacity: getSatelliteOpacity(magnitude) * fade,
    });
  }
  return result;
};

// A low satellite climbs less than 0.3°/s near the horizon, so one that is below this
// elevation cannot be above the horizon within CANDIDATE_STEP_MS.
export const CANDIDATE_STEP_MS = 30_000;
const CANDIDATE_MIN_ELEVATION = -12;

// The satellites that can be in the sky within CANDIDATE_STEP_MS after `date` (about one in
// six), so the per-second update propagates only those.
export const getCandidateSatellites = (lib: SatelliteLib, satellites: TrackedSatellite[], date: Date, observer: Observer): TrackedSatellite[] => {
  const sunDirection = snapshot(date, observer).sunDirection;
  return satellites.filter((sat) => {
    const look = isNearEpoch(sat, date) ? lookAtSatellite(lib, sat.satrec, date, observer, sunDirection) : null;
    return !!look && look.elevation > CANDIDATE_MIN_ELEVATION;
  });
};

export interface SatelliteCard {
  details: SatelliteDetails | null;
  nextPass: SatellitePass | null;
}

// The card (item 95) of a tracked satellite: the live values, and the next pass after the
// one in progress (the satellite is visible when someone taps it).
export const getSatelliteCard = (lib: SatelliteLib, sat: TrackedSatellite, now: Date, observer: Observer): SatelliteCard => {
  let nextPass = findNextPass(lib, sat.satrec, now, observer);
  if (nextPass?.inProgress) nextPass = findNextPass(lib, sat.satrec, new Date(nextPass.end.getTime() + MINUTE_MS), observer);
  return { details: getSatelliteDetails(lib, sat.satrec, now, observer), nextPass };
};

// True when the satellite is visible at `ms` (the elevation first: it rules out most times).
const visibleAt = (lib: SatelliteLib, satrec: SatRec, ms: number, observer: Observer): SatelliteLook | null => {
  const date = new Date(ms);
  const state = propagateEcf(lib, satrec, date);
  if (!state) return null;
  const look = lib.ecfToLookAngles(geodetic(lib, observer), state.ecf);
  const elevation = look.elevation / DEG;
  if (elevation <= MIN_ELEVATION) return null;
  const snap = snapshot(date, observer);
  if (snap.sunAltitude >= SUN_MAX_ALTITUDE || isInEarthShadow(state.ecf, snap.sunDirection)) return null;
  return { azimuth: ((look.azimuth / DEG) % 360 + 360) % 360, elevation, rangeKm: look.rangeSat, sunlit: true };
};

// The time (to the second) between a time `a` with the state `stateA` and a time `b` with
// the other state, where the visibility changes.
const bisect = (test: (ms: number) => boolean, a: number, b: number): number => {
  const stateA = test(a);
  while (Math.abs(b - a) > 1000) {
    const mid = (a + b) / 2;
    if (test(mid) === stateA) a = mid; else b = mid;
  }
  return Math.round(b / 1000) * 1000;
};

export interface SatellitePass {
  start: Date;
  end: Date;
  startAzimuth: number;
  startElevation: number;
  endAzimuth: number;
  endElevation: number;
  maxElevation: number;
  maxAt: Date;
  // The pass had begun at the search start.
  inProgress: boolean;
}

const PASS_STEP_MS = 20_000;
const PASS_SCAN_MS = 5_000;

// The next visible pass from `from` (the one in progress when it is visible at `from`),
// within `maxHours`. A pass is the time the visibility rule holds: it starts at 10° or
// when the satellite comes out of the Earth's shadow, and ends at 10° or in the shadow.
export const findNextPass = (
  lib: SatelliteLib,
  satrec: SatRec,
  from: Date,
  observer: Observer,
  maxHours = 24,
): SatellitePass | null => {
  const test = (ms: number) => visibleAt(lib, satrec, ms, observer) !== null;
  const fromMs = from.getTime();
  const limit = fromMs + maxHours * HOUR_MS;
  let startMs: number | null = null;
  const inProgress = test(fromMs);
  if (inProgress) startMs = fromMs;
  for (let t = fromMs + PASS_STEP_MS; startMs === null && t <= limit; t += PASS_STEP_MS) {
    if (test(t)) startMs = bisect(test, t - PASS_STEP_MS, t);
  }
  if (startMs === null) return null;
  // Walk the pass in short steps for the highest point, then find the end.
  let max = visibleAt(lib, satrec, startMs, observer) ?? visibleAt(lib, satrec, startMs + 1000, observer);
  if (!max) return null;
  const startLook = max;
  let maxAt = startMs;
  let t = startMs + PASS_SCAN_MS;
  let look = visibleAt(lib, satrec, t, observer);
  while (look) {
    if (look.elevation > max.elevation) {
      max = look;
      maxAt = t;
    }
    t += PASS_SCAN_MS;
    look = visibleAt(lib, satrec, t, observer);
  }
  const endMs = bisect(test, t - PASS_SCAN_MS, t) - 1000;
  const endLook = visibleAt(lib, satrec, endMs, observer) ?? max;
  return {
    start: new Date(startMs),
    end: new Date(endMs),
    startAzimuth: startLook.azimuth,
    startElevation: startLook.elevation,
    endAzimuth: endLook.azimuth,
    endElevation: endLook.elevation,
    maxElevation: max.elevation,
    maxAt: new Date(maxAt),
    inProgress,
  };
};

export interface SatelliteDetails {
  heightKm: number;
  speedKmS: number;
  sunlit: boolean;
  // Time until the satellite enters the Earth's shadow; null when it is in the shadow now
  // or stays lit for the next 2 h (a high orbit).
  shadowInMs: number | null;
}

const SHADOW_STEP_MS = 10_000;
// Longer than a low orbit (the ISS: 92 min), so a lit satellite always finds its shadow.
const SHADOW_SEARCH_MS = 2 * HOUR_MS;

// The card's live values (item 95): height, speed and the time until the Earth's shadow.
export const getSatelliteDetails = (lib: SatelliteLib, satrec: SatRec, now: Date, observer: Observer): SatelliteDetails | null => {
  const state = propagateEcf(lib, satrec, now);
  if (!state) return null;
  const { x, y, z } = state.velocity;
  const heightKm = lib.eciToGeodetic(state.eci, state.gmst).height;
  const litAt = (ms: number): boolean => {
    const s = propagateEcf(lib, satrec, new Date(ms));
    return !!s && !isInEarthShadow(s.ecf, snapshot(new Date(ms), observer).sunDirection);
  };
  let shadowInMs: number | null = null;
  const nowMs = now.getTime();
  const sunlit = litAt(nowMs);
  if (sunlit) {
    for (let t = nowMs + SHADOW_STEP_MS; t <= nowMs + SHADOW_SEARCH_MS; t += SHADOW_STEP_MS) {
      if (!litAt(t)) {
        shadowInMs = bisect(litAt, t - SHADOW_STEP_MS, t) - nowMs;
        break;
      }
    }
  }
  return { heightKm, speedKmS: Math.hypot(x, y, z), sunlit, shadowInMs };
};

// --- Pass reminder (item 69's notification) -------------------------------------------

export const PASS_REMINDER_MIN = 10;
// A reminder that a throttled background timer shows late still counts until the pass starts.
export const getPassReminderTime = (pass: SatellitePass): Date => new Date(pass.start.getTime() - PASS_REMINDER_MIN * MINUTE_MS);
export const getPassReminderKey = (pass: SatellitePass): string => String(Math.round(pass.start.getTime() / MINUTE_MS));

// True from 10 min before the pass until it starts, once per pass; never for a pass that
// was already in progress at the search.
export const isPassReminderDue = (now: Date, pass: SatellitePass | null, shownKey: string | null): boolean => {
  if (!pass || pass.inProgress || shownKey === getPassReminderKey(pass)) return false;
  const t = now.getTime();
  return t >= getPassReminderTime(pass).getTime() && t < pass.start.getTime();
};

const DIRECTION_KEYS = [
  'direction.n', 'direction.ne', 'direction.e', 'direction.se',
  'direction.s', 'direction.sw', 'direction.w', 'direction.nw',
] as const;
export const directionKey = (azimuth: number) => DIRECTION_KEYS[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8];

// "ISS visible at 20:14, from W to SE, up to 54°"
export const getPassReminderText = (pass: SatellitePass, language: Language): string =>
  translate(language, 'satellite.passReminder', {
    time: formatTime(pass.start, language),
    from: translate(language, directionKey(pass.startAzimuth)),
    to: translate(language, directionKey(pass.endAzimuth)),
    elevation: Math.round(pass.maxElevation),
  });
