
import SunCalc from 'suncalc';
import { scanMoonEvents } from './lunarEphemeris';

export interface MoonPosition {
  azimuth: number;
  altitude: number;
  phase: number;
  illumination: number;
  visible: boolean;
}

export const getMoonPosition = (date: Date, latitude: number, longitude: number): MoonPosition => {
  const moonPosition = SunCalc.getMoonPosition(date, latitude, longitude);
  const moonIllumination = SunCalc.getMoonIllumination(date);
  
  // Convert from radians to degrees
  const altitudeDegrees = moonPosition.altitude * (180 / Math.PI);
  const azimuthDegrees = (moonPosition.azimuth * (180 / Math.PI) + 180) % 360;
  
  return {
    azimuth: azimuthDegrees,
    altitude: altitudeDegrees,
    phase: moonIllumination.phase,
    illumination: moonIllumination.fraction,
    visible: altitudeDegrees > -6 // Moon is visible when above -6 degrees
  };
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HORIZON_SCAN_STEP_MS = 15 * 60 * 1000;
const HORIZON_BISECT_TOLERANCE_MS = 10 * 1000;

// Finds the nearest altitude=0 crossing to `fromMs` (a coarse scan, then a bisection
// to within HORIZON_BISECT_TOLERANCE_MS), searching forward (direction=1) or backward
// (direction=-1) up to `maxMs` away. Returns null when no crossing exists in range -
// alwaysUp/alwaysDown stretches (ROADMAP item 26). Uses the same suncalc-based altitude
// (getMoonPosition) the arc/dot are drawn from, not the Meeus-precision threshold
// getMoonTimes uses (see lunarEphemeris.ts) - the two disagree by a fraction of a
// degree, which would put the arc's own endpoint visibly off 0°.
const findHorizonCrossingMs = (
  altitudeAt: (ms: number) => number,
  fromMs: number,
  direction: 1 | -1,
  maxMs: number
): number | null => {
  let prevMs = fromMs;
  let prevAlt = altitudeAt(prevMs);
  const limitMs = fromMs + direction * maxMs;

  for (
    let t = fromMs + direction * HORIZON_SCAN_STEP_MS;
    direction > 0 ? t <= limitMs : t >= limitMs;
    t += direction * HORIZON_SCAN_STEP_MS
  ) {
    const alt = altitudeAt(t);
    if ((prevAlt < 0) !== (alt < 0)) {
      let lo = Math.min(prevMs, t);
      let hi = Math.max(prevMs, t);
      const loNegative = altitudeAt(lo) < 0;
      while (hi - lo > HORIZON_BISECT_TOLERANCE_MS) {
        const mid = (lo + hi) / 2;
        if ((altitudeAt(mid) < 0) === loNegative) lo = mid; else hi = mid;
      }
      return Math.round((lo + hi) / 2);
    }
    prevMs = t;
    prevAlt = alt;
  }
  return null;
};

interface SkyPass {
  start: Date;
  end: Date;
}

// The moon's current pass (ROADMAP item 26): from the last horizon crossing before
// `date` to the next one after, when the moon is currently up; otherwise the next full
// pass (next rise, then the following set). Bounded to +-24h per search, so an
// alwaysUp/alwaysDown stretch (no crossing at all within that range) safely comes back
// null instead of searching forever.
const findMoonPass = (date: Date, latitude: number, longitude: number): SkyPass | null => {
  const altitudeAt = (ms: number) => getMoonPosition(new Date(ms), latitude, longitude).altitude;
  const dateMs = date.getTime();

  if (altitudeAt(dateMs) >= 0) {
    const startMs = findHorizonCrossingMs(altitudeAt, dateMs, -1, ONE_DAY_MS);
    const endMs = findHorizonCrossingMs(altitudeAt, dateMs, 1, ONE_DAY_MS);
    return startMs !== null && endMs !== null ? { start: new Date(startMs), end: new Date(endMs) } : null;
  }

  const startMs = findHorizonCrossingMs(altitudeAt, dateMs, 1, ONE_DAY_MS);
  if (startMs === null) return null;
  const endMs = findHorizonCrossingMs(altitudeAt, startMs, 1, ONE_DAY_MS);
  return endMs !== null ? { start: new Date(startMs), end: new Date(endMs) } : null;
};

// Samples `steps+1` points across [start, end], with one sample landing exactly on
// `date` itself (ROADMAP item 26) - so the sun/moon dot (computed straight from `date`)
// always lies exactly on the arc built from these points, not just close to it.
const samplePass = <T>(
  start: Date,
  end: Date,
  date: Date,
  steps: number,
  sampleAt: (t: Date) => T
): T[] => {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const dateMs = Math.min(Math.max(date.getTime(), startMs), endMs);
  const fraction = endMs > startMs ? (dateMs - startMs) / (endMs - startMs) : 0;
  const k = Math.min(steps, Math.max(0, Math.round(steps * fraction)));

  const points: T[] = [];
  for (let i = 0; i <= k; i++) {
    points.push(sampleAt(new Date(k === 0 ? startMs : startMs + (i / k) * (dateMs - startMs))));
  }
  const remaining = steps - k;
  for (let i = 1; i <= remaining; i++) {
    points.push(sampleAt(new Date(dateMs + (i / remaining) * (endMs - dateMs))));
  }
  return points;
};

// Samples the moon's altitude/azimuth across the moon's current pass - the last rise
// before `date` to the next set after it, or the next full pass if the moon is down
// right now (ROADMAP item 26; previously a fixed date - 12h .. date + 12h window, which
// cut passes longer than 24h - moon passes run up to ~17h at mid-latitudes). Pure and
// stateless: callers map each point to screen coordinates themselves, the same way they
// already map the moon's current position.
export const getMoonPathAround = (
  date: Date,
  latitude: number,
  longitude: number,
  steps = 48
): MoonPosition[] => {
  const pass = findMoonPass(date, latitude, longitude);
  const start = pass ? pass.start : new Date(date.getTime() - 12 * 60 * 60 * 1000);
  const end = pass ? pass.end : new Date(date.getTime() + 12 * 60 * 60 * 1000);
  return samplePass(start, end, date, steps, (t) => getMoonPosition(t, latitude, longitude));
};

export interface MoonTimes {
  rise: Date | null;
  set: Date | null;
  // The moon stays above (or below) the horizon for the entire local day; `rise` and
  // `set` are both null in this case.
  alwaysUp: boolean;
  alwaysDown: boolean;
}

// Moonrise/moonset via Jean Meeus, "Astronomical Algorithms" (see lunarEphemeris.ts) -
// suncalc's low-precision lunar theory can be several minutes off (see ROADMAP item 9),
// so this scans the day directly instead of delegating to SunCalc.getMoonTimes. Only
// searches within the given calendar day (local, midnight to midnight per `date`'s own
// getHours/setHours) and so can come back with just one of rise/set (e.g. the moon rose
// yesterday and sets today, or rises today and sets tomorrow). When that happens,
// search the next day for the missing event; if it still isn't there (e.g. the next day
// is alwaysUp/alwaysDown) leave it null so the caller can show "-" for it.
export const getMoonTimes = (date: Date, latitude: number, longitude: number): MoonTimes => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

  const scan = scanMoonEvents(dayStartMs, dayEndMs, latitude, longitude);

  if (scan.alwaysUp || scan.alwaysDown) {
    return { rise: null, set: null, alwaysUp: scan.alwaysUp, alwaysDown: scan.alwaysDown };
  }

  let rise = scan.rise;
  let set = scan.set;

  if (!rise || !set) {
    const nextScan = scanMoonEvents(dayEndMs, dayEndMs + 24 * 60 * 60 * 1000, latitude, longitude);
    if (!rise) rise = nextScan.rise;
    if (!set) set = nextScan.set;
  }

  return { rise, set, alwaysUp: false, alwaysDown: false };
};

// Next new/full moon, via Jean Meeus, "Astronomical Algorithms" ch. 49 (Phases of
// the Moon) - suncalc's low-precision lunar theory can be hours off around a given
// full/new moon (its `phase`/`fraction` don't even always cross smoothly), so this
// computes the event directly instead of searching suncalc's output.

const normalizeDeg = (deg: number): number => {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
};

const toRadians = (deg: number): number => deg * (Math.PI / 180);

// Delta T (TT - UT) in seconds, via the Espenak-Meeus polynomial expressions.
// These two segments cover 1986-2050, which spans this app's practical date range
// with well under a minute of error - more than enough given events are only
// searched to the nearest minute.
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

// Meeus's `k`, the (fractional) number of synodic months since the 2000-01-06 new
// moon: k = 0 is that new moon, k = 0.5 the following full moon, etc. This is only
// an initial estimate for the search below, not the final answer.
const SYNODIC_MONTHS_PER_YEAR = 12.3685;

const approximateK = (date: Date): number => {
  const year = date.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const startOfNextYear = Date.UTC(year + 1, 0, 1);
  const fraction = (date.getTime() - startOfYear) / (startOfNextYear - startOfYear);
  const decimalYear = year + fraction;
  return (decimalYear - 2000) * SYNODIC_MONTHS_PER_YEAR;
};

// Julian Ephemeris Day (Terrestrial Time) of the new moon (k integer) or full moon
// (k + 0.5) nearest to that k, per Meeus ch. 49: mean phase plus periodic correction
// terms (the full new/full-moon table, plus the 14 planetary A1-A14 terms).
const jdeForK = (k: number, phaseType: 'new' | 'full'): number => {
  const T = k / 1236.85;
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const M = normalizeDeg(2.5534 + 29.10535669 * k - 0.0000218 * T ** 2 - 0.00000011 * T ** 3);
  const Mp = normalizeDeg(
    201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4
  );
  const F = normalizeDeg(
    160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4
  );
  const omega = normalizeDeg(124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3);

  const sin = (deg: number): number => Math.sin(toRadians(deg));

  const meanJde =
    2451550.09766 +
    29.530588861 * k +
    0.00015437 * T ** 2 -
    0.00000015 * T ** 3 +
    0.00000000073 * T ** 4;

  const leadingMpCoeff = phaseType === 'new' ? -0.4072 : -0.40614;

  const correction =
    leadingMpCoeff * sin(Mp) +
    0.17241 * E * sin(M) +
    0.01608 * sin(2 * Mp) +
    0.01039 * sin(2 * F) +
    0.00739 * E * sin(Mp - M) -
    0.00514 * E * sin(Mp + M) +
    0.00208 * E ** 2 * sin(2 * M) -
    0.00111 * sin(Mp - 2 * F) -
    0.00057 * sin(Mp + 2 * F) +
    0.00056 * E * sin(2 * Mp + M) -
    0.00042 * sin(3 * Mp) +
    0.00042 * E * sin(M + 2 * F) +
    0.00038 * E * sin(M - 2 * F) -
    0.00024 * E * sin(2 * Mp - M) -
    0.00017 * sin(omega) -
    0.00007 * sin(Mp + 2 * M) +
    0.00004 * sin(2 * Mp - 2 * F) +
    0.00004 * sin(3 * M) +
    0.00003 * sin(Mp + M - 2 * F) +
    0.00003 * sin(2 * Mp + 2 * F) -
    0.00003 * sin(Mp + M + 2 * F) +
    0.00003 * sin(Mp - M + 2 * F) -
    0.00002 * sin(Mp - M - 2 * F) -
    0.00002 * sin(3 * Mp + M) +
    0.00002 * sin(4 * Mp);

  const A1 = normalizeDeg(299.77 + 0.107408 * k - 0.009173 * T ** 2);
  const A2 = normalizeDeg(251.88 + 0.016321 * k);
  const A3 = normalizeDeg(251.83 + 26.651886 * k);
  const A4 = normalizeDeg(349.42 + 36.412478 * k);
  const A5 = normalizeDeg(84.66 + 18.206239 * k);
  const A6 = normalizeDeg(141.74 + 53.303771 * k);
  const A7 = normalizeDeg(207.14 + 2.453732 * k);
  const A8 = normalizeDeg(154.84 + 7.30686 * k);
  const A9 = normalizeDeg(34.52 + 27.261239 * k);
  const A10 = normalizeDeg(207.19 + 0.121824 * k);
  const A11 = normalizeDeg(291.34 + 1.844379 * k);
  const A12 = normalizeDeg(161.72 + 24.198154 * k);
  const A13 = normalizeDeg(239.56 + 25.513099 * k);
  const A14 = normalizeDeg(331.55 + 3.592518 * k);

  const planetary =
    0.000325 * sin(A1) +
    0.000165 * sin(A2) +
    0.000164 * sin(A3) +
    0.000126 * sin(A4) +
    0.00011 * sin(A5) +
    0.000062 * sin(A6) +
    0.00006 * sin(A7) +
    0.000056 * sin(A8) +
    0.000047 * sin(A9) +
    0.000042 * sin(A10) +
    0.00004 * sin(A11) +
    0.000037 * sin(A12) +
    0.000035 * sin(A13) +
    0.000023 * sin(A14);

  return meanJde + correction + planetary;
};

// Converts a JDE (Terrestrial Time) to a UTC Date by subtracting Delta T. Delta T
// changes by well under a second per month, so estimating it from the uncorrected
// (TT) instant, rather than iterating, introduces no meaningful error here.
const jdeToDate = (jde: number): Date => {
  const approxUnixMs = (jde - 2440587.5) * 86400000;
  const dtDays = deltaTSeconds(new Date(approxUnixMs)) / 86400;
  const jdUt = jde - dtDays;
  return new Date((jdUt - 2440587.5) * 86400000);
};

// Buffer of k-offsets searched around the initial estimate, wide enough to
// comfortably cover the ~29.53-day synodic month regardless of estimation error.
const K_SEARCH_OFFSETS = [-2, -1, 0, 1, 2, 3];

const findNextMeeusPhase = (date: Date, phaseType: 'new' | 'full'): Date => {
  const kBase = Math.floor(approximateK(date));
  const inputMs = date.getTime();

  let best: Date | null = null;
  for (const offset of K_SEARCH_OFFSETS) {
    const k = phaseType === 'new' ? kBase + offset : kBase + offset + 0.5;
    const candidate = jdeToDate(jdeForK(k, phaseType));
    if (candidate.getTime() > inputMs && (!best || candidate.getTime() < best.getTime())) {
      best = candidate;
    }
  }

  // Should be unreachable: the search window comfortably covers a synodic month
  // around any estimate, but never return an invalid/undefined date.
  if (best) return best;
  const fallbackK = phaseType === 'new' ? kBase + 4 : kBase + 4.5;
  return jdeToDate(jdeForK(fallbackK, phaseType));
};

export const getNextFullMoon = (date: Date): Date => findNextMeeusPhase(date, 'full');
export const getNextNewMoon = (date: Date): Date => findNextMeeusPhase(date, 'new');

// Single source of the 8-phase thresholds. `getMoonPhaseLabel` below looks up its
// result by this same index, so nothing else in the app can disagree on which of the
// 8 phases a given `phase` falls into.
export const getMoonPhaseIndex = (phase: number): number => {
  if (phase < 0.03) return 0; // New Moon
  if (phase < 0.22) return 1; // Waxing Crescent
  if (phase < 0.28) return 2; // First Quarter
  if (phase < 0.47) return 3; // Waxing Gibbous
  if (phase < 0.53) return 4; // Full Moon
  if (phase < 0.72) return 5; // Waning Gibbous
  if (phase < 0.78) return 6; // Third Quarter
  if (phase < 0.97) return 7; // Waning Crescent
  return 0; // New Moon
};

const MOON_PHASE_LABELS = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Third Quarter',
  'Waning Crescent',
];

export const getMoonPhaseLabel = (phase: number): string => MOON_PHASE_LABELS[getMoonPhaseIndex(phase)];

// Number of sample points per side of the lit-region outline; enough for a smooth
// crescent/gibbous curve at the sizes the moon is drawn on screen.
const MOON_PHASE_SEGMENTS = 32;

// Builds the SVG path ("d" attribute) for the moon's currently-lit region: a polygon
// inscribed in a circle of the given `radius`, centered on (0,0). `fraction` is the
// illuminated fraction (0-1, SunCalc's `illumination.fraction`); `phase` is SunCalc's
// 0-1 phase (< 0.5 = waxing, growing on the lit side; >= 0.5 = waning, shrinking).
//
// Geometrically, the boundary of the lit region is the limb (half of the outer circle,
// on the lit side) and the terminator (half of an ellipse with the same height as the
// circle but a variable x-radius `rx`). At fraction 0 or 1 the terminator coincides
// with the limb (no crescent, or a full circle); at 0.5 it is a straight line (exactly
// half the disc). This construction makes the enclosed area exactly `fraction` of the
// circle's area (each horizontal slice is bounded by two half-ellipses of the same
// height, so the areas integrate out exactly), which is asserted in the tests.
//
// A waxing moon is lit on the right in the northern hemisphere and on the left in the
// southern hemisphere (`latitude < 0`); waning is the mirror image of that.
export const getMoonPhasePath = (
  fraction: number,
  phase: number,
  latitude: number,
  radius: number
): string => {
  const k = Math.max(0, Math.min(1, fraction));
  const waxing = phase < 0.5;
  const mirrored = latitude < 0;
  const litSide = waxing !== mirrored ? 1 : -1; // +1 = right, -1 = left

  // k <= 0.5: terminator bulges toward the lit side (a crescent between the two curves).
  // k > 0.5: terminator bulges toward the opposite side (a gibbous shape spanning the center).
  const onLitSide = k <= 0.5;
  const rx = onLitSide ? radius * (1 - 2 * k) : radius * (2 * k - 1);
  const terminatorSide = onLitSide ? litSide : -litSide;

  const curve = (side: number, curveRadius: number, ascending: boolean): string[] => {
    const points: string[] = [];
    for (let i = 0; i <= MOON_PHASE_SEGMENTS; i++) {
      const step = ascending ? i : MOON_PHASE_SEGMENTS - i;
      const y = -radius + (2 * radius * step) / MOON_PHASE_SEGMENTS;
      const t = Math.max(-1, Math.min(1, y / radius));
      const x = side * curveRadius * Math.sqrt(1 - t * t);
      points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
    }
    return points;
  };

  const points = [
    ...curve(terminatorSide, rx, true),
    ...curve(litSide, radius, false),
  ];

  return `M${points[0]} L${points.slice(1).join(' L')} Z`;
};
