// Astronomy easter eggs (ROADMAP "Easter eggs and special events", Astronomy): pure
// checks for eclipses, supermoon, blue moon, meteor showers, aurora and the green
// flash. getAstroEvent picks at most one event for the scene.
import { getNextFullMoon } from '@/utils/moonUtils';
import { getMoonEclipticGeocentric } from '@/utils/lunarEphemeris';
import { type TimeOfDay } from '@/utils/sunUtils';
import { type WeatherType } from '@/components/CloudLayer';

export type AstroEventKind =
  | 'solarEclipse'
  | 'lunarEclipse'
  | 'greenFlash'
  | 'supermoon'
  | 'blueMoon'
  | 'meteorShower'
  | 'aurora';

export interface AstroEvent {
  kind: AstroEventKind;
  // 0-1: how dark the eclipse is; 1 for the other events.
  strength: number;
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Solar eclipses 2026-2035: instant of greatest eclipse (UT = NASA's TD minus Delta T)
// and the point on Earth where it happens. Source: NASA GSFC, Espenak, "Five Millennium
// Catalog of Solar Eclipses", https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html
export const SOLAR_ECLIPSES: readonly { peak: string; lat: number; lon: number }[] = [
  { peak: '2026-02-17T12:11:51Z', lat: -65, lon: 87 }, // annular
  { peak: '2026-08-12T17:45:51Z', lat: 65, lon: -25 }, // total
  { peak: '2027-02-06T15:59:32Z', lat: -31, lon: -48 }, // annular
  { peak: '2027-08-02T10:06:34Z', lat: 26, lon: 33 }, // total
  { peak: '2028-01-26T15:07:43Z', lat: 3, lon: -52 }, // annular
  { peak: '2028-07-22T02:55:23Z', lat: -16, lon: 127 }, // total
  { peak: '2029-01-14T17:12:31Z', lat: 64, lon: -114 }, // partial
  { peak: '2029-06-12T04:04:56Z', lat: 67, lon: -66 }, // partial
  { peak: '2029-07-11T15:36:02Z', lat: -64, lon: -86 }, // partial
  { peak: '2029-12-05T15:02:41Z', lat: -68, lon: 136 }, // partial
  { peak: '2030-06-01T06:27:55Z', lat: 57, lon: 80 }, // annular
  { peak: '2030-11-25T06:50:19Z', lat: -44, lon: 71 }, // total
  { peak: '2031-05-21T07:14:46Z', lat: 9, lon: 72 }, // annular
  { peak: '2031-11-14T21:06:12Z', lat: -1, lon: -138 }, // hybrid
  { peak: '2032-05-09T13:25:23Z', lat: -51, lon: -7 }, // annular
  { peak: '2032-11-03T05:32:54Z', lat: 70, lon: 133 }, // partial
  { peak: '2033-03-30T18:01:16Z', lat: 71, lon: -156 }, // total
  { peak: '2033-09-23T13:53:11Z', lat: -72, lon: -121 }, // partial
  { peak: '2034-03-20T10:17:25Z', lat: 16, lon: 22 }, // total
  { peak: '2034-09-12T16:18:07Z', lat: -18, lon: -73 }, // annular
  { peak: '2035-03-09T23:04:33Z', lat: -29, lon: -155 }, // annular
  { peak: '2035-09-02T01:55:25Z', lat: 29, lon: 158 }, // total
];

// Partial and total lunar eclipses 2026-2035 (penumbral ones are left out: the eye
// barely sees them): greatest eclipse (UT) and the umbral (partial phase) duration.
// Source: NASA GSFC, https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html and
// LEdecade2031.html.
export const LUNAR_ECLIPSES: readonly { peak: string; umbralMin: number; total: boolean }[] = [
  { peak: '2026-03-03T11:33:37Z', umbralMin: 207, total: true },
  { peak: '2026-08-28T04:12:49Z', umbralMin: 198, total: false },
  { peak: '2028-01-12T04:12:56Z', umbralMin: 56, total: false },
  { peak: '2028-07-06T18:19:40Z', umbralMin: 141, total: false },
  { peak: '2028-12-31T16:51:58Z', umbralMin: 209, total: true },
  { peak: '2029-06-26T03:22:05Z', umbralMin: 220, total: true },
  { peak: '2029-12-20T22:41:55Z', umbralMin: 213, total: true },
  { peak: '2030-06-15T18:33:16Z', umbralMin: 144, total: false },
  { peak: '2032-04-25T15:13:32Z', umbralMin: 211, total: true },
  { peak: '2032-10-18T19:02:21Z', umbralMin: 196, total: true },
  { peak: '2033-04-14T19:12:31Z', umbralMin: 215, total: true },
  { peak: '2033-10-08T10:55:03Z', umbralMin: 202, total: true },
  { peak: '2034-09-28T02:46:16Z', umbralMin: 27, total: false },
  { peak: '2035-08-19T01:10:54Z', umbralMin: 77, total: false },
];

// The partial phases seen from one place last up to ~3 h; the partial zone reaches
// roughly 3500 km from the path. Coarse, but it keeps the egg to the right region.
const SOLAR_WINDOW_MS = 90 * MINUTE_MS;
const SOLAR_REACH_KM = 3500;
const EARTH_RADIUS_KM = 6371;

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

// 0 = no eclipse here now; up to 1 near greatest eclipse on the path.
export const getSolarEclipseDepth = (date: Date, latitude: number, longitude: number, sunAltitude: number): number => {
  if (sunAltitude <= 0) return 0;
  for (const e of SOLAR_ECLIPSES) {
    const dt = Math.abs(date.getTime() - Date.parse(e.peak));
    if (dt >= SOLAR_WINDOW_MS) continue;
    const d = distanceKm(latitude, longitude, e.lat, e.lon);
    if (d >= SOLAR_REACH_KM) continue;
    return (1 - dt / SOLAR_WINDOW_MS) * (1 - 0.6 * (d / SOLAR_REACH_KM));
  }
  return 0;
};

// 0 = no eclipse; 1 = totality (a partial eclipse peaks at 0.5). Everyone who sees the
// moon sees a lunar eclipse, so only the moon's altitude matters.
export const getLunarEclipseDepth = (date: Date, moonAltitude: number): number => {
  if (moonAltitude <= 0) return 0;
  for (const e of LUNAR_ECLIPSES) {
    const half = (e.umbralMin / 2) * MINUTE_MS;
    const dt = Math.abs(date.getTime() - Date.parse(e.peak));
    if (dt >= half) continue;
    return Math.min(1, 1.5 * (1 - dt / half)) * (e.total ? 1 : 0.5);
  }
  return 0;
};

// The full moon nearest to `date` when it is within a day, else null.
const nearbyFullMoon = (date: Date): Date | null => {
  const full = getNextFullMoon(new Date(date.getTime() - DAY_MS));
  return full.getTime() - date.getTime() <= DAY_MS ? full : null;
};

// Supermoon: a full moon closer than 360 000 km (Espenak's definition).
export const SUPERMOON_KM = 360_000;
export const isSupermoon = (date: Date): boolean => {
  const full = nearbyFullMoon(date);
  return full !== null && getMoonEclipticGeocentric(full).distanceKm < SUPERMOON_KM;
};

// Blue moon: the second full moon in one calendar month (local time).
export const isBlueMoon = (date: Date): boolean => {
  const full = nearbyFullMoon(date);
  if (!full) return false;
  // Full moons are 29.3-29.8 days apart, so the one before is the next after full - 30 d.
  const previous = getNextFullMoon(new Date(full.getTime() - 30 * DAY_MS));
  return previous.getMonth() === full.getMonth() && previous.getFullYear() === full.getFullYear();
};

// Meteor showers around their peaks (local dates, the same every year).
const METEOR_SHOWERS: readonly { name: string; month: number; from: number; to: number }[] = [
  { name: 'Quadrantids', month: 0, from: 2, to: 4 },
  { name: 'Perseids', month: 7, from: 11, to: 13 },
  { name: 'Geminids', month: 11, from: 13, to: 15 },
];
export const getMeteorShower = (date: Date): string | null =>
  METEOR_SHOWERS.find((s) => s.month === date.getMonth() && date.getDate() >= s.from && date.getDate() <= s.to)
    ?.name ?? null;
// Meteor streaks during a shower (NightStars): one at a time, one every ~8 s on
// average; long, 3 px wide, slow (px per ms) and with a slow fade in and out.
export const METEOR_SHOWER = {
  intervalMs: 8000,
  durationMs: 1600,
  fadeInMs: 250,
  fadeOutMs: 700,
  width: 3,
  length: 160,
  speed: 0.2,
} as const;
// Chance to start a meteor in a frame of `dtMs` while none flies. The sky waits
// (interval - duration) on average, so one starts every `intervalMs` on average.
export const meteorSpawnChance = (dtMs: number): number =>
  Math.min(1, dtMs / (METEOR_SHOWER.intervalMs - METEOR_SHOWER.durationMs));
// Meteor opacity at `ageMs`: fades in, holds at 1, fades out; 0 once it is over.
export const meteorOpacity = (ageMs: number): number =>
  Math.max(0, Math.min(1, ageMs / METEOR_SHOWER.fadeInMs, (METEOR_SHOWER.durationMs - ageMs) / METEOR_SHOWER.fadeOutMs));

// Aurora: static rule for now (the NOAA Kp index comes later).
export const isAuroraTime = (latitude: number, timeOfDay: TimeOfDay): boolean =>
  Math.abs(latitude) > 60 && timeOfDay === 'night';

// Green flash: the first 4 s after a clear sunset, on 1 day in 20. The roll is seeded
// by the local day and the place, so it does not change on every render.
export const GREEN_FLASH_MS = 4000;
export const greenFlashRoll = (date: Date, latitude: number, longitude: number): number => {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}|${latitude.toFixed(1)}|${longitude.toFixed(1)}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % 20;
};
export const isGreenFlash = (
  date: Date,
  sunset: Date | null,
  weatherType: WeatherType,
  latitude: number,
  longitude: number
): boolean => {
  if (!sunset || weatherType !== 'clear') return false;
  const dt = date.getTime() - sunset.getTime();
  return dt >= 0 && dt < GREEN_FLASH_MS && greenFlashRoll(sunset, latitude, longitude) === 0;
};

export interface AstroInput {
  date: Date;
  latitude: number;
  longitude: number;
  sunAltitude: number;
  moonAltitude: number;
  timeOfDay: TimeOfDay;
  weatherType: WeatherType;
  sunset: Date | null;
}

const MOON_SHOWN: readonly TimeOfDay[] = ['night', 'astronomical-twilight', 'nautical-twilight'];
const KINDS: readonly AstroEventKind[] = [
  'solarEclipse', 'lunarEclipse', 'greenFlash', 'supermoon', 'blueMoon', 'meteorShower', 'aurora',
];

// Reads the test override `?egg=<kind>` (e.g. `?egg=aurora`), or null.
export const parseEggOverride = (search: string): AstroEventKind | null => {
  const egg = new URLSearchParams(search).get('egg');
  return KINDS.find((k) => k.toLowerCase() === egg?.toLowerCase()) ?? null;
};

// At most one event, in this order: eclipses, green flash, supermoon, blue moon,
// meteor shower, aurora. `forced` (the URL override) always wins.
export const getAstroEvent = (input: AstroInput, forced: AstroEventKind | null = null): AstroEvent | null => {
  if (forced) return { kind: forced, strength: 1 };
  const { date, latitude, longitude, sunAltitude, moonAltitude, timeOfDay, weatherType, sunset } = input;

  const solar = getSolarEclipseDepth(date, latitude, longitude, sunAltitude);
  if (solar > 0) return { kind: 'solarEclipse', strength: solar };
  const moonUp = moonAltitude > 0 && MOON_SHOWN.includes(timeOfDay);
  const lunar = moonUp ? getLunarEclipseDepth(date, moonAltitude) : 0;
  if (lunar > 0) return { kind: 'lunarEclipse', strength: lunar };
  if (isGreenFlash(date, sunset, weatherType, latitude, longitude)) return { kind: 'greenFlash', strength: 1 };
  if (moonUp && isSupermoon(date)) return { kind: 'supermoon', strength: 1 };
  if (moonUp && isBlueMoon(date)) return { kind: 'blueMoon', strength: 1 };
  if (timeOfDay === 'night' && getMeteorShower(date)) return { kind: 'meteorShower', strength: 1 };
  if (isAuroraTime(latitude, timeOfDay)) return { kind: 'aurora', strength: 1 };
  return null;
};
