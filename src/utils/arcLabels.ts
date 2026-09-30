// Rise/zenith/set labels for the sun and moon arcs drawn in SunVisualization. Pure
// time/position math only - no screen mapping here, that lives in SunVisualization.tsx
// alongside its other azimuth->screen helpers (getVisibleCardinalLabels etc).
//
// The arc itself (sunPath/moonPath) is a plain SkyPosition[] with no timestamps, so it
// can't be searched directly for "the SunCalc sunrise nearest the arc's start". Instead,
// this recomputes the same pass boundaries the arc's own points are sampled from
// (findSunPass/findMoonPass, exported from sunUtils/moonUtils for this purpose) and
// looks up the panel's own SunCalc/getMoonTimes events against them - so a label always
// shows the same time as the panel, even though the arc's geometric 0° endpoint is a
// few minutes off from that apparent-horizon event (see SunVisualization.tsx's arc
// comments).
import { getSunPosition, getSunTimes, findSunPass } from './sunUtils';
import { getMoonPosition, getMoonTimes, findMoonPass } from './moonUtils';

export interface ArcLabelPoint {
  time: Date;
  azimuth: number;
  altitude: number;
}

export interface ArcLabels {
  rise: ArcLabelPoint | null;
  zenith: ArcLabelPoint | null;
  set: ArcLabelPoint | null;
}

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

const toPoint = (time: Date, position: { azimuth: number; altitude: number }): ArcLabelPoint => ({
  time,
  azimuth: position.azimuth,
  altitude: position.altitude,
});

// The pass's day plus the day either side, as noon-anchored Dates (noon avoids any
// midnight/DST edge ambiguity in which calendar day a search lands on) - "the pass's
// day and its neighbours" from the spec, wide enough that a pass spanning midnight
// still finds the adjoining day's event.
const candidateDays = (start: Date, end: Date): Date[] => {
  const days = new Map<number, Date>();
  for (const bound of [start, end]) {
    for (const offset of [-1, 0, 1]) {
      const d = new Date(bound);
      d.setDate(d.getDate() + offset);
      d.setHours(12, 0, 0, 0);
      days.set(d.getTime(), d);
    }
  }
  return Array.from(days.values());
};

// Picks whichever candidate Date sits closest in time to `target`, ignoring nulls
// (an invalid/missing event on a neighbouring day).
const closestTo = (target: Date, candidates: (Date | null)[]): Date | null => {
  let best: Date | null = null;
  let bestDiffMs = Infinity;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const diffMs = Math.abs(candidate.getTime() - target.getTime());
    if (diffMs < bestDiffMs) {
      bestDiffMs = diffMs;
      best = candidate;
    }
  }
  return best;
};

// Sun rise/zenith/set labels for the pass being drawn around `date` (ROADMAP item 26's
// findSunPass) - rise/set are the panel's own SunCalc sunrise/sunset closest to that
// pass's start/end, null when the pass has no rise/set (polar day/night, where the pass
// falls back to the +-24h search bound instead of a horizon crossing). Zenith is the
// solar noon that falls inside the pass (or its fallback window), still shown at polar
// day/night since the sun still has a highest point even when it doesn't set.
export const getSunArcLabels = (date: Date, latitude: number, longitude: number): ArcLabels => {
  const pass = findSunPass(date, latitude, longitude);
  const start = pass ? pass.start : new Date(date.getTime() - HALF_DAY_MS);
  const end = pass ? pass.end : new Date(date.getTime() + HALF_DAY_MS);

  const dayTimes = candidateDays(start, end).map((day) => getSunTimes(day, latitude, longitude));
  const ordinaryDayTimes = dayTimes.filter((times) => times.polar === null);

  const rise = pass ? closestTo(start, ordinaryDayTimes.map((times) => times.sunrise)) : null;
  const set = pass ? closestTo(end, ordinaryDayTimes.map((times) => times.sunset)) : null;
  const zenithTime = dayTimes
    .map((times) => times.solarNoon)
    .find((noon) => noon.getTime() >= start.getTime() && noon.getTime() <= end.getTime()) ?? null;

  return {
    rise: rise ? toPoint(rise, getSunPosition(rise, latitude, longitude)) : null,
    zenith: zenithTime ? toPoint(zenithTime, getSunPosition(zenithTime, latitude, longitude)) : null,
    set: set ? toPoint(set, getSunPosition(set, latitude, longitude)) : null,
  };
};

// Line-of-sight rise/set labels for the sun arc (ROADMAP item 42): the sun's position at
// each terrain time from getTerrainSunTimes (computed once in SunTracker), i.e. the point
// where the arc meets the terrain silhouette. A null time (the sun does not clear the
// terrain that day) gives a null label. No zenith: the terrain does not move it.
export const getTerrainArcLabels = (
  terrainSunTimes: { sunrise: Date | null; sunset: Date | null },
  latitude: number,
  longitude: number
): ArcLabels => {
  const { sunrise, sunset } = terrainSunTimes;
  return {
    rise: sunrise ? toPoint(sunrise, getSunPosition(sunrise, latitude, longitude)) : null,
    zenith: null,
    set: sunset ? toPoint(sunset, getSunPosition(sunset, latitude, longitude)) : null,
  };
};

// Golden-section search for the time of maximum altitude in [loMs, hiMs] (a unimodal
// rise-then-set climb over one pass) - refines the moon's zenith to well under a minute,
// far tighter than the arc's own ~30 min sampling step.
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;
const ZENITH_SEARCH_TOLERANCE_MS = 30 * 1000;

const goldenSectionMaxMs = (altitudeAtMs: (ms: number) => number, loMs: number, hiMs: number): number => {
  let a = loMs;
  let b = hiMs;
  let c = b - GOLDEN_RATIO * (b - a);
  let d = a + GOLDEN_RATIO * (b - a);
  let fc = altitudeAtMs(c);
  let fd = altitudeAtMs(d);

  while (b - a > ZENITH_SEARCH_TOLERANCE_MS) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - GOLDEN_RATIO * (b - a);
      fc = altitudeAtMs(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + GOLDEN_RATIO * (b - a);
      fd = altitudeAtMs(d);
    }
  }
  return Math.round((a + b) / 2);
};

// Moon rise/zenith/set labels for the pass being drawn around `date` (ROADMAP item 26's
// findMoonPass) - rise/set are the panel's own getMoonTimes rise/set closest to that
// pass's start/end, null when the pass has no rise/set (an alwaysUp/alwaysDown stretch).
// Zenith is the pass's true maximum-altitude instant, found by golden-section search
// rather than reused from the coarser arc samples.
export const getMoonArcLabels = (date: Date, latitude: number, longitude: number): ArcLabels => {
  const pass = findMoonPass(date, latitude, longitude);
  const start = pass ? pass.start : new Date(date.getTime() - HALF_DAY_MS);
  const end = pass ? pass.end : new Date(date.getTime() + HALF_DAY_MS);

  const dayMoonTimes = candidateDays(start, end).map((day) => getMoonTimes(day, latitude, longitude));
  const rise = pass ? closestTo(start, dayMoonTimes.map((times) => times.rise)) : null;
  const set = pass ? closestTo(end, dayMoonTimes.map((times) => times.set)) : null;

  const zenithMs = goldenSectionMaxMs(
    (ms) => getMoonPosition(new Date(ms), latitude, longitude).altitude,
    start.getTime(),
    end.getTime()
  );
  const zenithTime = new Date(zenithMs);

  return {
    rise: rise ? toPoint(rise, getMoonPosition(rise, latitude, longitude)) : null,
    zenith: toPoint(zenithTime, getMoonPosition(zenithTime, latitude, longitude)),
    set: set ? toPoint(set, getMoonPosition(set, latitude, longitude)) : null,
  };
};
