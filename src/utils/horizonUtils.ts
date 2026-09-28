// Line of sight with terrain (ROADMAP item 13): a per-location horizon profile (real
// terrain elevation angle per azimuth, not a flat 0°) and the sunrise/sunset/moonrise/
// moonset times adjusted for it. Pure math only - no DOM, no localStorage, no network.
// Tile fetching/decoding and the profile cache live in terrainTiles.ts.

import { getSunPosition, getSunTimes } from './sunUtils';
import { getMoonEclipticGeocentric } from './lunarEphemeris';

export interface HorizonProfile {
  angles: number[]; // length 360; horizon elevation angle in degrees for azimuth i°
  observerElevation: number; // terrain height at the observer, m
  eyeHeight: number; // m above ground
}

// Returns the terrain elevation at (lat, lon) in metres, or null when no tile data
// covers that point.
export type ElevationSampler = (lat: number, lon: number) => number | null;

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS_M = 6_371_000;
const REFRACTION_K = 0.13; // terrestrial refraction coefficient for the sight line

// Elevation angle of a point `distanceM` away with height difference `heightDiffM`
// (already h_target - h_observer - eyeHeight), including the Earth-curvature drop and
// terrestrial refraction bending the sight line back down by a factor k.
export const elevationAngleDeg = (heightDiffM: number, distanceM: number): number => {
  const curvatureDropM = (distanceM ** 2 / (2 * EARTH_RADIUS_M)) * (1 - REFRACTION_K);
  return Math.atan((heightDiffM - curvatureDropM) / distanceM) * RAD2DEG;
};

// ponytail: starts at 200 m, not 50 m. Closer samples sit within a few z12 DEM pixels (~26 m)
// of the observer, so DEM noise and GPS error (a pixel beside a summit, a small knoll) block
// the horizon by several degrees. Lower this only with a finer DEM.
const NEAR_DISTANCE_M = 200;
const FAR_DISTANCE_M = 50_000;
const DISTANCE_SAMPLE_COUNT = 100;

// Log-spaced sample distances from 200 m to 50 km: dense close to the observer (where a
// nearby ridge dominates), sparse far away (where only very tall/distant terrain can
// still raise the horizon).
const logSpacedDistances = (): number[] => {
  const logMin = Math.log(NEAR_DISTANCE_M);
  const logMax = Math.log(FAR_DISTANCE_M);
  const distances: number[] = [];
  for (let i = 0; i < DISTANCE_SAMPLE_COUNT; i++) {
    const t = i / (DISTANCE_SAMPLE_COUNT - 1);
    distances.push(Math.exp(logMin + t * (logMax - logMin)));
  }
  return distances;
};

// Destination point `distanceM` along great-circle bearing `bearingDeg` (0 = North,
// clockwise - same convention as sunUtils.getSunPosition's azimuth) from (latDeg,
// lonDeg). Standard spherical "destination point given distance and bearing" formula.
const destinationPoint = (
  latDeg: number,
  lonDeg: number,
  bearingDeg: number,
  distanceM: number
): { lat: number; lon: number } => {
  const angularDistance = distanceM / EARTH_RADIUS_M;
  const bearingRad = bearingDeg * DEG2RAD;
  const lat1 = latDeg * DEG2RAD;
  const lon1 = lonDeg * DEG2RAD;

  const sinLat2 =
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad);
  const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));

  const y = Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1);
  const x = Math.cos(angularDistance) - Math.sin(lat1) * sinLat2;
  const lon2 = lon1 + Math.atan2(y, x);

  return {
    lat: lat2 * RAD2DEG,
    lon: (((lon2 * RAD2DEG + 180) % 360) + 360) % 360 - 180,
  };
};

// Builds the 360° horizon profile: for each azimuth, the maximum elevation angle over
// all sample distances (the terrain silhouette an observer actually sees). ~36,000
// samples total; pure trig plus one `sample()` call each, so this runs well under
// 200 ms regardless of how the sampler itself is implemented.
export const computeHorizonProfile = (
  lat: number,
  lon: number,
  eyeHeight: number,
  sample: ElevationSampler
): HorizonProfile => {
  const observerElevation = sample(lat, lon) ?? 0;
  const distances = logSpacedDistances();
  const angles: number[] = new Array(360);

  for (let az = 0; az < 360; az++) {
    let maxAngle = -Infinity;
    let sawData = false;

    for (const distanceM of distances) {
      const dest = destinationPoint(lat, lon, az, distanceM);
      const elevation = sample(dest.lat, dest.lon);
      if (elevation === null) continue;
      sawData = true;

      const heightDiffM = elevation - observerElevation - eyeHeight;
      const angle = elevationAngleDeg(heightDiffM, distanceM);
      if (angle > maxAngle) maxAngle = angle;
    }

    // No terrain data anywhere along this azimuth (e.g. a gap in the fetched tiles):
    // fall back to the pure-curvature dip of a flat horizon at the nearest sample
    // distance, rather than an arbitrary sentinel that would make the sun/moon search
    // treat the sky as wide open in that direction.
    angles[az] = sawData ? maxAngle : elevationAngleDeg(-eyeHeight, distances[0]);
  }

  return { angles, observerElevation, eyeHeight };
};

// Linear interpolation between the two nearest whole-degree azimuth samples, wrapping
// 359° -> 0°.
export const horizonAngleAt = (profile: HorizonProfile, azimuthDeg: number): number => {
  const az = ((azimuthDeg % 360) + 360) % 360;
  const i0 = Math.floor(az);
  const i1 = (i0 + 1) % 360;
  const frac = az - i0;
  const a0 = profile.angles[i0];
  const a1 = profile.angles[i1];
  return a0 + (a1 - a0) * frac;
};

// Bennett (1982) atmospheric refraction, evaluated at the apparent altitude the body
// sits at when it touches the horizon - here, the terrain horizon's own angle, since
// that's the apparent altitude at the crossing we're solving for. Reduces to the
// classic ~34' at a flat 0° horizon. Clamped so the formula (only valid near/above the
// horizon) doesn't blow up for a pathologically low terrain angle.
const bennettRefractionDeg = (apparentAltitudeDeg: number): number => {
  const h = Math.max(apparentAltitudeDeg, -1);
  const argDeg = h + 7.31 / (h + 4.4);
  const refractionArcmin = 1 / Math.tan(argDeg * DEG2RAD);
  return refractionArcmin / 60;
};

const SUN_SEMIDIAMETER_DEG = 0.2667;
const SEARCH_STEP_MS = 2 * 60 * 1000;
const BISECT_TOLERANCE_MS = 5 * 1000;

type AltitudeExcessFn = (t: Date) => number;

// Bisects [loMs, hiMs] (a step known to change sign) down to < BISECT_TOLERANCE_MS.
const bisectCrossingMs = (
  loMs: number,
  hiMs: number,
  loValue: number,
  fn: AltitudeExcessFn
): number => {
  let lo = loMs;
  let hi = hiMs;
  const loPositive = loValue >= 0;

  while (hi - lo > BISECT_TOLERANCE_MS) {
    const mid = (lo + hi) / 2;
    const midPositive = fn(new Date(mid)) >= 0;
    if (midPositive === loPositive) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.round((lo + hi) / 2);
};

// Scans [startMs, endMs] in SEARCH_STEP_MS steps for every crossing of the given
// direction ('up' = negative-to-positive, 'down' = positive-to-negative), bisecting
// each one. Returns them in chronological order.
const scanCrossingsMs = (
  startMs: number,
  endMs: number,
  fn: AltitudeExcessFn,
  direction: 'up' | 'down'
): number[] => {
  const crossings: number[] = [];
  let t = startMs;
  let v = fn(new Date(t));

  while (t < endMs) {
    const nextT = Math.min(t + SEARCH_STEP_MS, endMs);
    const nextV = fn(new Date(nextT));

    const isMatch = direction === 'up' ? v < 0 && nextV >= 0 : v >= 0 && nextV < 0;
    if (isMatch) crossings.push(bisectCrossingMs(t, nextT, v, fn));

    t = nextT;
    v = nextV;
  }

  return crossings;
};

// Sun's upper-limb apparent altitude minus the terrain horizon angle at the sun's
// current azimuth: geometric altitude + refraction (evaluated at the horizon angle) +
// semidiameter, relative to that horizon. Positive while the upper limb is above the
// terrain silhouette.
const sunLimbExcessDeg = (
  t: Date,
  latitude: number,
  longitude: number,
  profile: HorizonProfile
): number => {
  const position = getSunPosition(t, latitude, longitude);
  const horizon = horizonAngleAt(profile, position.azimuth);
  const refraction = bennettRefractionDeg(horizon);
  return position.altitude + refraction + SUN_SEMIDIAMETER_DEG - horizon;
};

// Sunrise/sunset adjusted for the real terrain horizon instead of a flat 0° one. Finds
// the sun's upper limb crossing the terrain silhouette at its own azimuth (see
// sunLimbExcessDeg), by bisection over a 2-minute-step scan of the local day (previous
// solar midnight -> solar noon for sunrise, solar noon -> next solar midnight for
// sunset). Sunrise is the first upward crossing; sunset is the last downward crossing
// (matching the flat-horizon convention: once up, the day's "the" sunset is the final
// one). Null when the sun never clears (or never dips below) the terrain that day.
export const getTerrainSunTimes = (
  date: Date,
  lat: number,
  lon: number,
  profile: HorizonProfile
): { sunrise: Date | null; sunset: Date | null } => {
  const solarNoonMs = getSunTimes(date, lat, lon).solarNoon.getTime();
  const prevMidnightMs = solarNoonMs - 12 * 60 * 60 * 1000;
  const nextMidnightMs = solarNoonMs + 12 * 60 * 60 * 1000;
  const fn: AltitudeExcessFn = (t) => sunLimbExcessDeg(t, lat, lon, profile);

  const risings = scanCrossingsMs(prevMidnightMs, solarNoonMs, fn, 'up');
  const settings = scanCrossingsMs(solarNoonMs, nextMidnightMs, fn, 'down');

  return {
    sunrise: risings.length > 0 ? new Date(risings[0]) : null,
    sunset: settings.length > 0 ? new Date(settings[settings.length - 1]) : null,
  };
};

const MOON_EQUATORIAL_RADIUS_KM = 6378.14;

// --- Duplicated (small parts) from lunarEphemeris.ts ---
// moonAltitudeExcessDeg there is fixed to a flat 0° horizon and isn't exported; this
// module needs the same topocentric altitude/azimuth against a *variable* horizon
// angle, so it recomputes them from the exported geocentric ecliptic position. Follows
// the same "duplicate the small formula rather than import" convention lunarEphemeris.ts
// itself uses for deltaTSeconds (see its top-of-file comment).
const sinDeg = (deg: number): number => Math.sin(deg * DEG2RAD);
const cosDeg = (deg: number): number => Math.cos(deg * DEG2RAD);
const tanDeg = (deg: number): number => Math.tan(deg * DEG2RAD);
const atan2Deg = (y: number, x: number): number => Math.atan2(y, x) * RAD2DEG;
const asinDeg = (x: number): number => Math.asin(Math.max(-1, Math.min(1, x))) * RAD2DEG;
const normalizeDeg = (deg: number): number => {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
};

const deltaTSeconds = (date: Date): number => {
  const year = date.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const startOfNextYear = Date.UTC(year + 1, 0, 1);
  const fraction = (date.getTime() - startOfYear) / (startOfNextYear - startOfYear);
  const y = year + fraction;
  const t = y - 2000;

  if (y < 2005) {
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
};

const dateToJdUt = (date: Date): number => date.getTime() / 86400000 + 2440587.5;
const dateToJde = (date: Date): number => dateToJdUt(date) + deltaTSeconds(date) / 86400;
const jdToT = (jd: number): number => (jd - 2451545) / 36525;

// Meeus ch. 22 low-precision nutation series plus the mean obliquity polynomial.
const nutationAndObliquityFromT = (T: number): { deltaPsiDeg: number; obliquityDeg: number } => {
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T ** 2 + T ** 3 / 450000;
  const lSun = 280.4665 + 36000.7698 * T;
  const lMoon = 218.3165 + 481267.8813 * T;

  const deltaPsiArcsec =
    -17.2 * sinDeg(omega) - 1.32 * sinDeg(2 * lSun) - 0.23 * sinDeg(2 * lMoon) + 0.21 * sinDeg(2 * omega);

  const meanObliquityDeg =
    23 + 26 / 60 + 21.448 / 3600 - (46.815 * T + 0.00059 * T ** 2 - 0.001813 * T ** 3) / 3600;

  return { deltaPsiDeg: deltaPsiArcsec / 3600, obliquityDeg: meanObliquityDeg };
};

// Topocentric-ish altitude/azimuth of the Moon plus its horizontal parallax, from the
// exported geocentric ecliptic position (lunarEphemeris.getMoonEclipticGeocentric).
// Azimuth uses the same South-based-then-+180 construction as suncalc/sunUtils, so it
// matches the app's 0 = North, clockwise convention.
const moonAltitudeAzimuth = (
  date: Date,
  latitude: number,
  longitude: number
): { altitudeDeg: number; azimuthDeg: number; horizontalParallaxDeg: number } => {
  const T = jdToT(dateToJde(date));
  const { lambdaDeg, betaDeg, distanceKm } = getMoonEclipticGeocentric(date);
  const { deltaPsiDeg, obliquityDeg } = nutationAndObliquityFromT(T);

  const lambdaApparentDeg = lambdaDeg + deltaPsiDeg;
  const raDeg = normalizeDeg(
    atan2Deg(
      sinDeg(lambdaApparentDeg) * cosDeg(obliquityDeg) - tanDeg(betaDeg) * sinDeg(obliquityDeg),
      cosDeg(lambdaApparentDeg)
    )
  );
  const decDeg = asinDeg(
    sinDeg(betaDeg) * cosDeg(obliquityDeg) + cosDeg(betaDeg) * sinDeg(obliquityDeg) * sinDeg(lambdaApparentDeg)
  );

  const jdUt = dateToJdUt(date);
  const Tut = jdToT(jdUt);
  const theta0 =
    280.46061837 +
    360.98564736629 * (jdUt - 2451545.0) +
    0.000387933 * Tut ** 2 -
    Tut ** 3 / 38710000;
  const gastDeg = theta0 + deltaPsiDeg * cosDeg(obliquityDeg);

  const localSiderealDeg = gastDeg + longitude;
  const hourAngleDeg = localSiderealDeg - raDeg;

  const altitudeDeg = asinDeg(
    sinDeg(latitude) * sinDeg(decDeg) + cosDeg(latitude) * cosDeg(decDeg) * cosDeg(hourAngleDeg)
  );
  const azimuthFromSouthDeg = atan2Deg(
    sinDeg(hourAngleDeg),
    cosDeg(hourAngleDeg) * sinDeg(latitude) - tanDeg(decDeg) * cosDeg(latitude)
  );
  const azimuthDeg = normalizeDeg(azimuthFromSouthDeg + 180);

  const horizontalParallaxDeg = asinDeg(MOON_EQUATORIAL_RADIUS_KM / distanceKm);

  return { altitudeDeg, azimuthDeg, horizontalParallaxDeg };
};

// Moon's geocentric altitude minus the terrain-horizon rise/set threshold at its own
// azimuth: generalizes lunarEphemeris's fixed standardAltitudeDeg (0.7275*parallax -
// 34') by replacing the fixed 34' refraction with Bennett's formula evaluated at the
// terrain horizon angle, and by adding that horizon angle itself to the threshold.
// Positive while the Moon is up by that definition.
const moonLimbExcessDeg = (
  t: Date,
  latitude: number,
  longitude: number,
  profile: HorizonProfile
): number => {
  const { altitudeDeg, azimuthDeg, horizontalParallaxDeg } = moonAltitudeAzimuth(t, latitude, longitude);
  const horizon = horizonAngleAt(profile, azimuthDeg);
  const refraction = bennettRefractionDeg(horizon);
  const thresholdDeg = horizon + 0.7275 * horizontalParallaxDeg - refraction;
  return altitudeDeg - thresholdDeg;
};

const dayBoundsMs = (date: Date): { startMs: number; endMs: number } => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const startMs = dayStart.getTime();
  return { startMs, endMs: startMs + 24 * 60 * 60 * 1000 };
};

// Moonrise/moonset adjusted for the real terrain horizon, within the given calendar
// day (local time), like moonUtils.getMoonTimes: if an event isn't found in today's
// window it's looked for in tomorrow's, so a moon that rose yesterday and sets today
// (or vice versa) still reports the event that does fall in range.
export const getTerrainMoonTimes = (
  date: Date,
  lat: number,
  lon: number,
  profile: HorizonProfile
): { rise: Date | null; set: Date | null } => {
  const fn: AltitudeExcessFn = (t) => moonLimbExcessDeg(t, lat, lon, profile);
  const { startMs, endMs } = dayBoundsMs(date);

  let riseMs = scanCrossingsMs(startMs, endMs, fn, 'up')[0] ?? null;
  let setMs = scanCrossingsMs(startMs, endMs, fn, 'down')[0] ?? null;

  if (riseMs === null || setMs === null) {
    const nextEndMs = endMs + 24 * 60 * 60 * 1000;
    if (riseMs === null) riseMs = scanCrossingsMs(endMs, nextEndMs, fn, 'up')[0] ?? null;
    if (setMs === null) setMs = scanCrossingsMs(endMs, nextEndMs, fn, 'down')[0] ?? null;
  }

  return {
    rise: riseMs !== null ? new Date(riseMs) : null,
    set: setMs !== null ? new Date(setMs) : null,
  };
};
