
import SunCalc from 'suncalc';

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

// Samples the moon's altitude/azimuth across the given calendar day (local time, per
// `date`'s own getHours/getDate), for drawing the day's arc in the sky. Pure and
// stateless: callers map each point to screen coordinates themselves, the same way
// they already map the moon's current position.
export const getMoonPathForDay = (
  date: Date,
  latitude: number,
  longitude: number,
  steps = 48
): MoonPosition[] => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const points: MoonPosition[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = new Date(dayStart.getTime() + (i / steps) * 24 * 60 * 60 * 1000);
    points.push(getMoonPosition(t, latitude, longitude));
  }
  return points;
};

export interface MoonTimes {
  rise: Date | null;
  set: Date | null;
  // The moon stays above (or below) the horizon for the entire local day; `rise` and
  // `set` are both null in this case.
  alwaysUp: boolean;
  alwaysDown: boolean;
}

// Wraps SunCalc.getMoonTimes, which only searches within the given calendar day and so
// can come back with just one of rise/set (e.g. the moon rose yesterday and sets
// today, or rises today and sets tomorrow). When that happens, search the next day for
// the missing event; if it still isn't there (e.g. the next day is alwaysUp/alwaysDown)
// leave it null so the caller can show "-" for it.
export const getMoonTimes = (date: Date, latitude: number, longitude: number): MoonTimes => {
  const times = SunCalc.getMoonTimes(new Date(date), latitude, longitude);

  if (times.alwaysUp || times.alwaysDown) {
    return { rise: null, set: null, alwaysUp: !!times.alwaysUp, alwaysDown: !!times.alwaysDown };
  }

  let rise = times.rise ?? null;
  let set = times.set ?? null;

  if (!rise || !set) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextTimes = SunCalc.getMoonTimes(nextDay, latitude, longitude);
    if (!rise) rise = nextTimes.rise ?? null;
    if (!set) set = nextTimes.set ?? null;
  }

  return { rise, set, alwaysUp: false, alwaysDown: false };
};

const moonPhaseAt = (date: Date): number => SunCalc.getMoonIllumination(date).phase;

// Signed distance from `phase` to `target`, wrapped into (-0.5, 0.5]. Positive means
// `phase` is ahead of `target` in the lunar cycle. Used to catch the moment the phase
// advances past `target` (0 = new moon, 0.5 = full moon) while scanning forward in time.
const phaseDistanceTo = (phase: number, target: number): number => {
  let diff = (phase - target) % 1;
  if (diff <= -0.5) diff += 1;
  if (diff > 0.5) diff -= 1;
  return diff;
};

const PHASE_SEARCH_STEP_MS = 3 * 60 * 60 * 1000; // 3 hours: safely smaller than the ~0.085/day phase drift
const PHASE_SEARCH_MAX_STEPS = Math.ceil((45 * 24 * 60 * 60 * 1000) / PHASE_SEARCH_STEP_MS); // covers slightly more than a synodic month

// Searches forward from `date` for the next moment the moon's phase equals `target`
// (0 = new moon, 0.5 = full moon). Coarse steps find the bracket the crossing falls in,
// then bisection refines it to within about a minute.
const findNextPhase = (date: Date, target: number): Date => {
  let prevTime = date.getTime();
  let prevDiff = phaseDistanceTo(moonPhaseAt(new Date(prevTime)), target);

  for (let i = 1; i <= PHASE_SEARCH_MAX_STEPS; i++) {
    const currentTime = date.getTime() + i * PHASE_SEARCH_STEP_MS;
    const currentDiff = phaseDistanceTo(moonPhaseAt(new Date(currentTime)), target);

    if (prevDiff < 0 && currentDiff >= 0) {
      let lo = prevTime;
      let hi = currentTime;
      while (hi - lo > 60 * 1000) {
        const mid = Math.floor((lo + hi) / 2);
        const midDiff = phaseDistanceTo(moonPhaseAt(new Date(mid)), target);
        if (midDiff < 0) lo = mid;
        else hi = mid;
      }
      return new Date(hi);
    }

    prevTime = currentTime;
    prevDiff = currentDiff;
  }

  // Should be unreachable (a full cycle is ~29.5 days, well within the search window),
  // but never return an invalid/undefined date.
  return new Date(date.getTime() + PHASE_SEARCH_MAX_STEPS * PHASE_SEARCH_STEP_MS);
};

export const getNextFullMoon = (date: Date): Date => findNextPhase(date, 0.5);
export const getNextNewMoon = (date: Date): Date => findNextPhase(date, 0);

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
