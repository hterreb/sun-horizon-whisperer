// Astronomy easter eggs (ROADMAP "Easter eggs and special events", Astronomy and Sky): pure
// checks for eclipses, supermoon, blue moon, meteor showers, aurora, the green flash,
// Matariki, planet conjunctions, noctilucent clouds, midnight sun and polar night.
// getAstroEvent picks at most one event for the scene.
import { getNextFullMoon } from '@/utils/moonUtils';
import { getMoonEclipticGeocentric } from '@/utils/lunarEphemeris';
import { PLANETS, getGeocentricVector, separationDeg, toHorizontal, type PlanetSky } from '@/utils/planets';
import { type SunTimes, type TimeOfDay } from '@/utils/sunUtils';
import { type WeatherType } from '@/components/CloudLayer';

export type AstroEventKind =
  | 'solarEclipse'
  | 'lunarEclipse'
  | 'greenFlash'
  | 'supermoon'
  | 'blueMoon'
  | 'meteorShower'
  | 'aurora'
  | 'matariki' | 'conjunction' | 'noctilucent' | 'midnightSun' | 'polarNight';

export interface AstroEvent {
  kind: AstroEventKind;
  // 0-1: how dark the eclipse is; 1 for the other events.
  strength: number;
  // The conjunction's two planets (getConjunction); absent for `?egg=conjunction`.
  planets?: [PlanetSky, PlanetSky];
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
// Shooting stars per animation frame during a shower: 8x NightStars' normal 0.001.
export const METEOR_SHOWER_RATE = 0.008;

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

// Sky eggs (ROADMAP "Easter eggs and special events", Sky).

// Matariki: the NZ public holiday (a Friday near the Pleiades' rise before dawn), from the
// Te Kāhui o Matariki Public Holiday Act 2022, Schedule 1. Local dates.
export const MATARIKI_DATES: readonly string[] = [
  '2026-07-10', '2027-06-25', '2028-07-14', '2029-07-06', '2030-06-21',
  '2031-07-11', '2032-07-02', '2033-06-24', '2034-07-07', '2035-06-29',
];
export const MATARIKI_DAYS = 3; // the egg shows from 3 days before to 3 days after the holiday
export const PRE_DAWN_MS = 90 * MINUTE_MS;

const localDayNumber = (date: Date): number => Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
const isoDayNumber = (iso: string): number => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);

export const isMatarikiWeek = (date: Date): boolean =>
  MATARIKI_DATES.some((iso) => Math.abs(localDayNumber(date) - isoDayNumber(iso)) <= MATARIKI_DAYS);

// In the Matariki week, in the last 90 min before sunrise while the sky is still dark (sun below -3°).
export const isMatarikiTime = (date: Date, sunrise: Date | null, sunAltitude: number): boolean => {
  if (!sunrise || sunAltitude >= -3 || !isMatarikiWeek(date)) return false;
  const dt = sunrise.getTime() - date.getTime();
  return dt > 0 && dt <= PRE_DAWN_MS;
};

// Planet conjunction: two of Venus, Mars, Jupiter and Saturn closer than 2°, both above the
// horizon, at least 15° from the sun, with the sun below -4° (night or late twilight). The
// closest pair, or null. Planet positions from planets.ts (JPL approximate elements).
export const CONJUNCTION_DEG = 2;
const PLANET_MIN_ALTITUDE = 3;
const PLANET_MIN_ELONGATION = 15;
export const getConjunction = (date: Date, latitude: number, longitude: number, sunAltitude: number): [PlanetSky, PlanetSky] | null => {
  if (sunAltitude >= -4) return null;
  const sun = getGeocentricVector('sun', date);
  const vectors = PLANETS.map((name) => ({ name, v: getGeocentricVector(name, date) }));
  let best: { sep: number; pair: [PlanetSky, PlanetSky] } | null = null;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const [a, b] = [vectors[i], vectors[j]];
      const sep = separationDeg(a.v, b.v);
      if (sep >= CONJUNCTION_DEG || (best && sep >= best.sep)) continue;
      if (separationDeg(a.v, sun) < PLANET_MIN_ELONGATION) continue;
      const skyA = { name: a.name, ...toHorizontal(a.v, date, latitude, longitude) };
      const skyB = { name: b.name, ...toHorizontal(b.v, date, latitude, longitude) };
      if (skyA.altitude < PLANET_MIN_ALTITUDE || skyB.altitude < PLANET_MIN_ALTITUDE) continue;
      best = { sep, pair: [skyA, skyB] };
    }
  }
  return best?.pair ?? null;
};

// Noctilucent clouds: in June and July at latitude 50-65° N (December and January at 50-65° S),
// under a clear sky, 1-2 h after sunset or 1-2 h before sunrise.
export const isNoctilucentTime = (
  date: Date,
  latitude: number,
  sunset: Date | null,
  sunrise: Date | null,
  weatherType: WeatherType
): boolean => {
  if (weatherType !== 'clear' || Math.abs(latitude) < 50 || Math.abs(latitude) > 65) return false;
  const month = date.getMonth();
  if (!(latitude > 0 ? month === 5 || month === 6 : month === 11 || month === 0)) return false;
  const inWindow = (dt: number) => dt >= 60 * MINUTE_MS && dt <= 120 * MINUTE_MS;
  return (!!sunset && inWindow(date.getTime() - sunset.getTime())) || (!!sunrise && inWindow(sunrise.getTime() - date.getTime()));
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
  // Today's flat-horizon sun times (sunUtils.getSunTimes) for the sky eggs: Matariki and the
  // noctilucent clouds use sunrise and sunset; `polar` gives the midnight sun and polar night.
  sunTimes?: Pick<SunTimes, 'sunrise' | 'sunset' | 'polar'> | null;
}

const MOON_SHOWN: readonly TimeOfDay[] = ['night', 'astronomical-twilight', 'nautical-twilight'];
const KINDS: readonly AstroEventKind[] = [
  'solarEclipse', 'lunarEclipse', 'greenFlash', 'supermoon', 'blueMoon', 'meteorShower', 'aurora',
  'matariki', 'conjunction', 'noctilucent', 'midnightSun', 'polarNight',
];

// Reads the test override `?egg=<kind>` (e.g. `?egg=aurora`), or null.
export const parseEggOverride = (search: string): AstroEventKind | null => {
  const egg = new URLSearchParams(search).get('egg');
  return KINDS.find((k) => k.toLowerCase() === egg?.toLowerCase()) ?? null;
};

// At most one event, in this order: eclipses, green flash, supermoon, blue moon, planet
// conjunction, meteor shower, Matariki, noctilucent clouds, aurora, midnight sun, polar night.
// `forced` (the URL override) always wins.
export const getAstroEvent = (input: AstroInput, forced: AstroEventKind | null = null): AstroEvent | null => {
  if (forced) return { kind: forced, strength: 1 };
  const { date, latitude, longitude, sunAltitude, moonAltitude, timeOfDay, weatherType, sunset, sunTimes = null } = input;
  // On a polar day or night getSunTimes invents 06:00 and 18:00, so there is no sunrise or sunset.
  const polar = sunTimes?.polar ?? null;
  const daySunrise = sunTimes && !polar ? sunTimes.sunrise : null;
  const daySunset = sunTimes && !polar ? sunTimes.sunset : null;

  const solar = getSolarEclipseDepth(date, latitude, longitude, sunAltitude);
  if (solar > 0) return { kind: 'solarEclipse', strength: solar };
  const moonUp = moonAltitude > 0 && MOON_SHOWN.includes(timeOfDay);
  const lunar = moonUp ? getLunarEclipseDepth(date, moonAltitude) : 0;
  if (lunar > 0) return { kind: 'lunarEclipse', strength: lunar };
  if (isGreenFlash(date, sunset, weatherType, latitude, longitude)) return { kind: 'greenFlash', strength: 1 };
  if (moonUp && isSupermoon(date)) return { kind: 'supermoon', strength: 1 };
  if (moonUp && isBlueMoon(date)) return { kind: 'blueMoon', strength: 1 };
  const planets = getConjunction(date, latitude, longitude, sunAltitude);
  if (planets) return { kind: 'conjunction', strength: 1, planets };
  if (timeOfDay === 'night' && getMeteorShower(date)) return { kind: 'meteorShower', strength: 1 };
  if (isMatarikiTime(date, daySunrise, sunAltitude)) return { kind: 'matariki', strength: 1 };
  if (isNoctilucentTime(date, latitude, daySunset, daySunrise, weatherType)) return { kind: 'noctilucent', strength: 1 };
  if (isAuroraTime(latitude, timeOfDay)) return { kind: 'aurora', strength: 1 };
  if (polar === 'day') return { kind: 'midnightSun', strength: 1 };
  if (polar === 'night') return { kind: 'polarNight', strength: 1 };
  return null;
};
