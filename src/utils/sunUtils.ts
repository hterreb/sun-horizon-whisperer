import SunCalc from 'suncalc';

export interface SunPosition {
  azimuth: number;
  altitude: number;
}

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  dawn: Date; // morning civil twilight start
  dusk: Date; // evening civil twilight end
  nauticalDawn: Date;
  nauticalDusk: Date;
  astronomicalDawn: Date;
  astronomicalDusk: Date;
  // Set when SunCalc could not find a sunrise/sunset for this date/location (polar
  // day or night): 'day' if the sun never sets (altitude at solar noon > 0), 'night'
  // if it never rises. Null on ordinary days. The sunrise/sunset fields above still
  // hold the invented 06:00/18:00 fallback for internal time-of-day math.
  polar: 'day' | 'night' | null;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  loaded: boolean;
}

export type TimeOfDay = 
  | 'night' 
  | 'astronomical-twilight' 
  | 'nautical-twilight' 
  | 'civil-twilight' 
  | 'dawn' 
  | 'morning' 
  | 'midday' 
  | 'afternoon'
  | 'evening';

export const getSunPosition = (date: Date, latitude: number, longitude: number): SunPosition => {
  const position = SunCalc.getPosition(date, latitude, longitude);
  
  // Convert altitude from radians to degrees
  const altitudeDegrees = position.altitude * (180 / Math.PI);
  
  // Convert azimuth from radians to degrees (adjust so that North = 0°, East = 90°, etc.)
  const azimuthDegrees = (position.azimuth * (180 / Math.PI) + 180) % 360;
  
  return {
    azimuth: azimuthDegrees,
    altitude: altitudeDegrees
  };
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HORIZON_SCAN_STEP_MS = 15 * 60 * 1000;
const HORIZON_BISECT_TOLERANCE_MS = 10 * 1000;

// Finds the nearest altitude=0 crossing to `fromMs` (a coarse scan, then a bisection
// to within HORIZON_BISECT_TOLERANCE_MS), searching forward (direction=1) or backward
// (direction=-1) up to `maxMs` away. Returns null when no crossing exists in range -
// polar day/night (ROADMAP item 26).
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

// The sun's current pass (ROADMAP item 26): from the last horizon crossing before
// `date` to the next one after, when the sun is currently up; otherwise the next full
// pass (next rise, then the following set). Bounded to +-24h per search, so polar
// day/night (no crossing at all within that range) safely comes back null instead of
// searching forever. Exported for arcLabels.ts, which needs the same pass boundaries
// to match rise/set/zenith labels to the arc actually drawn.
export const findSunPass = (date: Date, latitude: number, longitude: number): SkyPass | null => {
  const altitudeAt = (ms: number) => getSunPosition(new Date(ms), latitude, longitude).altitude;
  const dateMs = date.getTime();

  if (altitudeAt(dateMs) >= 0) {
    const startMs = findHorizonCrossingMs(altitudeAt, dateMs, -1, ONE_DAY_MS);
    const endMs = findHorizonCrossingMs(altitudeAt, dateMs, 1, ONE_DAY_MS);
    return startMs !== null && endMs !== null ? { start: new Date(startMs), end: new Date(endMs) } : null;
  }

  const startMs = findHorizonCrossingMs(altitudeAt, dateMs, 1, ONE_DAY_MS);
  if (startMs === null) return null;
  // The rise is only bisected to +-half the tolerance, so it may sit just below 0 deg;
  // searching from it could find the same rise again (AUDIT C-14). Start past it.
  const endMs = findHorizonCrossingMs(altitudeAt, startMs + HORIZON_BISECT_TOLERANCE_MS, 1, ONE_DAY_MS);
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

// Samples the sun's altitude/azimuth across the sun's current pass - the last rise
// before `date` to the next set after it, or the next full pass if the sun is down
// right now (ROADMAP item 26; previously a fixed date - 12h .. date + 12h window, which
// cut passes longer than 24h). Same shape as moonUtils.getMoonPathAround; pure and
// stateless, callers map each point to screen coordinates themselves.
export const getSunPathAround = (
  date: Date,
  latitude: number,
  longitude: number,
  steps = 48
): SunPosition[] => {
  const pass = findSunPass(date, latitude, longitude);
  const start = pass ? pass.start : new Date(date.getTime() - 12 * 60 * 60 * 1000);
  const end = pass ? pass.end : new Date(date.getTime() + 12 * 60 * 60 * 1000);
  return samplePass(start, end, date, steps, (t) => getSunPosition(t, latitude, longitude));
};

const isValidDate = (date: Date | null | undefined): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const getSunTimes = (date: Date, latitude: number, longitude: number): SunTimes => {
  const times = SunCalc.getTimes(date, latitude, longitude);

  // Builds a fallback time from a copy of `date` so callers' Date objects are never mutated.
  const at = (h: number, m = 0): Date => {
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  };

  // For astronomical times, calculate approximate values if invalid
  const calculateApproximateAstronomicalTime = (baseTime: Date | null, isEarlyMorning: boolean): Date => {
    if (isValidDate(baseTime)) return baseTime;
    
    // If astronomical time is invalid, estimate based on nautical time
    const nauticalTime = isEarlyMorning ? times.nauticalDawn : times.nauticalDusk;
    if (isValidDate(nauticalTime)) {
      const offset = isEarlyMorning ? -60 : 60; // 1 hour before/after nautical
      return new Date(nauticalTime.getTime() + offset * 60 * 1000);
    }
    
    // Final fallback - estimate based on sunrise/sunset
    const sunTime = isEarlyMorning ? times.sunrise : times.sunset;
    if (isValidDate(sunTime)) {
      const offset = isEarlyMorning ? -90 : 90; // 1.5 hours before/after sun
      return new Date(sunTime.getTime() + offset * 60 * 1000);
    }
    
    // Ultimate fallback
    const fallback = new Date(date);
    fallback.setHours(isEarlyMorning ? 5 : 19, 0, 0, 0);
    return fallback;
  };
  
  // At polar day/night SunCalc can't find a sunrise/sunset event; the fallback times
  // below are invented for internal time-of-day math only. Record which case this is
  // so callers (e.g. InfoPanel) can show "sun does not rise/set" instead of the fake time.
  const sunriseSunsetInvalid = !isValidDate(times.sunrise) || !isValidDate(times.sunset);
  let polar: 'day' | 'night' | null = null;
  if (sunriseSunsetInvalid) {
    const noon = isValidDate(times.solarNoon) ? times.solarNoon : date;
    const noonAltitude = getSunPosition(noon, latitude, longitude).altitude;
    polar = noonAltitude > 0 ? 'day' : 'night';
  }

  return {
    sunrise: isValidDate(times.sunrise) ? times.sunrise : at(6, 0),
    sunset: isValidDate(times.sunset) ? times.sunset : at(18, 0),
    solarNoon: isValidDate(times.solarNoon) ? times.solarNoon : at(12, 0),
    polar,
    // Civil twilight: -6° to 0° (dawn to sunrise) / 0° to -6° (sunset to dusk)
    dawn: isValidDate(times.dawn) ? times.dawn : at(5, 30), // -6° (civil dawn)
    dusk: isValidDate(times.dusk) ? times.dusk : at(18, 30), // -6° (civil dusk)
    // Nautical twilight: -12° to -6° (nautical dawn to civil dawn) / -6° to -12° (civil dusk to nautical dusk)
    nauticalDawn: isValidDate(times.nauticalDawn) ? times.nauticalDawn : at(5, 0), // -12° (nautical dawn)
    nauticalDusk: isValidDate(times.nauticalDusk) ? times.nauticalDusk : at(19, 0), // -12° (nautical dusk)
    // Astronomical twilight: -18° to -12° (astronomical dawn to nautical dawn) / -12° to -18° (nautical dusk to astronomical dusk)
    astronomicalDawn: calculateApproximateAstronomicalTime(times.nightEnd, true), // -18° (astronomical dawn)
    astronomicalDusk: calculateApproximateAstronomicalTime(times.night, false), // -18° (astronomical dusk)
  };
};

export const formatTime = (date: Date | null): string => {
  if (!isValidDate(date)) return "Unknown";
  
  try {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  } catch (error) {
    console.error('Error formatting time:', error);
    return "Unknown";
  }
};

export const getTimeOfDay = (date: Date, sunTimes: SunTimes): TimeOfDay => {
  const now = date.getTime();

  if (now < sunTimes.astronomicalDawn.getTime()) return 'night';
  if (now < sunTimes.nauticalDawn.getTime()) return 'astronomical-twilight';
  if (now < sunTimes.dawn.getTime()) return 'nautical-twilight';
  if (now < sunTimes.sunrise.getTime()) return 'civil-twilight';
  if (now < sunTimes.sunrise.getTime() + 3600000) return 'dawn';
  
  const noon = sunTimes.solarNoon.getTime();
  const morning = (sunTimes.sunrise.getTime() + noon) / 2;
  const afternoon = (noon + sunTimes.sunset.getTime()) / 2;
  
  if (now < morning) return 'morning';
  if (now < afternoon) return 'midday';
  if (now < sunTimes.sunset.getTime() - 3600000) return 'afternoon';
  if (now < sunTimes.sunset.getTime()) return 'evening';
  if (now < sunTimes.dusk.getTime()) return 'civil-twilight';
  if (now < sunTimes.nauticalDusk.getTime()) return 'nautical-twilight';
  if (now < sunTimes.astronomicalDusk.getTime()) return 'astronomical-twilight';
  
  return 'night';
};

export const getTimeOfDayLabel = (timeOfDay: TimeOfDay): string => {
  switch(timeOfDay) {
    case 'night': return 'Night';
    case 'astronomical-twilight': return 'Astronomical Twilight';
    case 'nautical-twilight': return 'Nautical Twilight';
    case 'civil-twilight': return 'Civil Twilight';
    case 'dawn': return 'Dawn';
    case 'morning': return 'Morning';
    case 'midday': return 'Midday';
    case 'afternoon': return 'Afternoon';
    case 'evening': return 'Evening';
    default: return 'Unknown';
  }
};

// Brand hex values (ROADMAP item 15, direction D "Polished Classic"). These mirror
// the HSL custom properties in index.css (--brand-*, --scene-sky-*-*) - kept here as
// literal #rrggbb, not `hsl(var(--x))`, because mixGradientTowardOvercast below only
// rewrites literal hex inside the gradient string it walks (ROADMAP item 50); a CSS
// var reference would silently stop getting the weather grey mix.
const SUNSET = '#F97316'; // --brand-sunset
const PEACH = '#FEC6A1'; // --brand-peach
const SKY = '#0EA5E9'; // --brand-sky
const CYAN = '#33C3F0'; // --brand-cyan
const NIGHT = '#0F1016'; // --brand-night
const NIGHT_2 = '#1A1F2C'; // --scene-sky-night-2 / --scene-sky-dusk-3
const NIGHT_3 = '#221F26'; // --scene-sky-night-3
const TWILIGHT_CIVIL = '#403E43'; // unchanged legacy civil-twilight tone (not one of the 6 brand colors)
const TWILIGHT_CIVIL_2 = '#E5DEFF'; // ditto - tailwind's `dusk` color, kept for the civil-twilight bridge

// Each time-of-day's sky gradient, top to bottom (ROADMAP item 15 deliverable 2: the
// D style book's sky gradients get a third stop). The first two stops of every state
// are exactly the pre-item-15 2-stop gradient; the added third stop is simply the
// next state's own start color, so the gradient hints at what's coming (a glow at the
// horizon) instead of ending in a hard band. The 'night'/'midday'/'evening' entries
// match the --scene-sky-night-*/--scene-sky-day-*/--scene-sky-dusk-* bucket tokens in
// index.css/tailwind.config.ts exactly; 'dawn' matches --scene-sky-dawn-*.
const SKY_GRADIENT_STOPS: Record<TimeOfDay, [string, string, string]> = {
  'night': [NIGHT, NIGHT_2, NIGHT_3],
  'astronomical-twilight': [NIGHT_2, NIGHT_3, TWILIGHT_CIVIL],
  'nautical-twilight': [NIGHT_3, TWILIGHT_CIVIL, TWILIGHT_CIVIL_2],
  'civil-twilight': [TWILIGHT_CIVIL, TWILIGHT_CIVIL_2, SUNSET],
  'dawn': [SUNSET, PEACH, CYAN],
  'morning': [PEACH, CYAN, SKY],
  'midday': [SKY, CYAN, PEACH],
  'afternoon': [CYAN, PEACH, SUNSET],
  'evening': [PEACH, SUNSET, NIGHT_2],
};

export const getBackgroundGradient = (timeOfDay: TimeOfDay): string => {
  const [start, mid, end] = SKY_GRADIENT_STOPS[timeOfDay] ?? SKY_GRADIENT_STOPS.midday;
  return `linear-gradient(to bottom, ${start} 0%, ${mid} 62%, ${end} 100%)`;
};

// Clouds dim the sky (ROADMAP item 50): mixes every #rrggbb color in a CSS gradient
// string toward the overcast grey by `mix` (0 = unchanged, 1 = all grey). The grey is
// never lighter than the color it replaces, so a cloudy night stays dark instead of
// turning mid-grey. Pure and independent of WeatherType, so it is testable on its own.
const SKY_OVERCAST = [0x8a, 0x94, 0x9d]; // --scene-sky-overcast (#8A949D)
const SKY_OVERCAST_LIGHTNESS = (Math.max(...SKY_OVERCAST) + Math.min(...SKY_OVERCAST)) / 2;

export const mixGradientTowardOvercast = (gradient: string, mix: number): string => {
  if (mix <= 0) return gradient;
  const m = Math.min(1, mix);

  return gradient.replace(/#([0-9a-fA-F]{6})/g, (_match, hex: string) => {
    const num = parseInt(hex, 16);
    const rgb = [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
    // Scaling all channels scales the HSL lightness by the same factor.
    const scale = Math.min(1, (Math.max(...rgb) + Math.min(...rgb)) / 2 / SKY_OVERCAST_LIGHTNESS);
    const [r, g, b] = rgb.map((c, i) => Math.round(c * (1 - m) + SKY_OVERCAST[i] * scale * m));
    return `#${(((r << 16) | (g << 8) | b) >>> 0).toString(16).padStart(6, '0')}`;
  });
};

// The horizon line sits at 65 % of the scene height (SunVisualization's horizonY).
const HORIZON_FRACTION = 0.65;

const rgbToHsl = ([r, g, b]: number[]): [number, number, number] => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rn ? ((gn - bn) / d + 6) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s * 100, l * 100];
};

const hsl = ([h, s, l]: [number, number, number]) => `hsl(${h.toFixed(1)}, ${Math.min(100, s).toFixed(1)}%, ${l.toFixed(1)}%)`;

// The water follows the sky (ROADMAP item 53): takes the sky gradient string (after
// item 50's weather mix) and returns the water's surface and deep colours. Surface:
// the sky colour at the horizon line, 15 % darker (and at least 5 points of lightness,
// so a dark night sea still reads against the night sky) and more saturated. Deep:
// a dark version of the sky's top colour. A storm (item 51) darkens both by 40 % and
// greys them a little.
export const getWaterColors = (skyGradient: string, storm = false): { surface: string; deep: string } => {
  const stops = [...skyGradient.matchAll(/#([0-9a-fA-F]{6})\s+([\d.]+)%/g)].map(([, hex, at]) => {
    const num = parseInt(hex, 16);
    return { rgb: [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff], at: Number(at) / 100 };
  });
  if (stops.length === 0) throw new Error(`getWaterColors: no #rrggbb stops in "${skyGradient}"`);

  const next = stops.findIndex((stop) => stop.at >= HORIZON_FRACTION);
  const b = stops[next === -1 ? stops.length - 1 : next];
  const a = stops[Math.max(0, next - 1)];
  const t = b.at > a.at ? Math.min(1, Math.max(0, (HORIZON_FRACTION - a.at) / (b.at - a.at))) : 0;
  const horizon = rgbToHsl(a.rgb.map((c, i) => c + (b.rgb[i] - c) * t));
  const top = rgbToHsl(stops[0].rgb);

  const dim = storm ? 0.6 : 1;
  const grey = storm ? 0.7 : 1;
  return {
    surface: hsl([horizon[0], horizon[1] * 1.3 * grey, Math.max(0, Math.min(horizon[2] * 0.85, horizon[2] - 5)) * dim]),
    deep: hsl([top[0], top[1] * grey, top[2] * 0.45 * dim]),
  };
};

// No reflection below the horizon (ROADMAP item 58): the sun or moon glitter strip's
// opacity factor by that body's altitude. Full above +2°, fading out to 0 at 0°.
export const getReflectionFade = (altitude: number): number => Math.min(1, Math.max(0, altitude / 2));

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface GoldenHourTimes {
  // Sunrise to the sun climbing past +6° (SunCalc's `goldenHourEnd`).
  morning: TimeWindow | null;
  // The sun dropping back below +6° (SunCalc's `goldenHour`) to sunset.
  evening: TimeWindow | null;
}

export interface BlueHourTimes {
  // Civil dawn (-6°, SunCalc's `dawn`) to the sun climbing past -4°.
  morning: TimeWindow | null;
  // The sun dropping below -4° to civil dusk (-6°, SunCalc's `dusk`).
  evening: TimeWindow | null;
}

// SunCalc.getTimes only reports fixed altitude events out of the box (see its
// `times` table). Blue hour's -4° edge isn't one of them, so we register it as a
// custom time via SunCalc.addTime. That call pushes onto SunCalc's *global*
// times table, so it must run exactly once no matter how many times this module
// is evaluated (e.g. hot reload) - the guard below ensures that.
const BLUE_HOUR_DAWN_END = 'blueHourDawnEnd'; // morning: sun climbing past -4°
const BLUE_HOUR_DUSK_START = 'blueHourDuskStart'; // evening: sun dropping past -4°
let blueHourAngleRegistered = false;
const registerBlueHourAngle = (): void => {
  if (blueHourAngleRegistered) return;
  SunCalc.addTime(-4, BLUE_HOUR_DAWN_END, BLUE_HOUR_DUSK_START);
  blueHourAngleRegistered = true;
};
registerBlueHourAngle();

interface ExtendedSunCalcTimes extends SunCalc.GetTimesResult {
  [BLUE_HOUR_DAWN_END]: Date;
  [BLUE_HOUR_DUSK_START]: Date;
}

const buildWindow = (start: Date, end: Date): TimeWindow | null => {
  if (!isValidDate(start) || !isValidDate(end)) return null;
  return { start, end };
};

export const getGoldenHourTimes = (date: Date, latitude: number, longitude: number): GoldenHourTimes => {
  const times = SunCalc.getTimes(date, latitude, longitude);

  return {
    morning: buildWindow(times.sunrise, times.goldenHourEnd),
    evening: buildWindow(times.goldenHour, times.sunset)
  };
};

export const getBlueHourTimes = (date: Date, latitude: number, longitude: number): BlueHourTimes => {
  const times = SunCalc.getTimes(date, latitude, longitude) as ExtendedSunCalcTimes;

  return {
    morning: buildWindow(times.dawn, times[BLUE_HOUR_DAWN_END]),
    evening: buildWindow(times[BLUE_HOUR_DUSK_START], times.dusk)
  };
};

export interface NextGoldenBlueHours {
  part: 'morning' | 'evening';
  day: 'today' | 'tomorrow';
  golden: TimeWindow | null;
  blue: TimeWindow | null;
}

// The InfoPanel used to show all 4 golden/blue hour windows at once (ROADMAP item
// 11); item 20 narrows that to the single upcoming pair, from the same part of the
// day. Follows the "which window is still ahead" pattern of getRelevantTwilightTimes:
// before the morning golden hour ends, today's morning pair is still ahead; before
// the evening blue hour ends, today's evening pair is still ahead; otherwise the next
// pair is tomorrow morning's. At polar day/night a window is null (see
// getGoldenHourTimes/getBlueHourTimes) and simply falls through to the next check.
export const getNextGoldenBlueHours = (
  now: Date,
  latitude: number,
  longitude: number
): NextGoldenBlueHours => {
  const todayGolden = getGoldenHourTimes(now, latitude, longitude);
  const todayBlue = getBlueHourTimes(now, latitude, longitude);
  const nowMs = now.getTime();

  if (todayGolden.morning !== null && nowMs < todayGolden.morning.end.getTime()) {
    return { part: 'morning', day: 'today', golden: todayGolden.morning, blue: todayBlue.morning };
  }

  if (todayBlue.evening !== null && nowMs < todayBlue.evening.end.getTime()) {
    return { part: 'evening', day: 'today', golden: todayGolden.evening, blue: todayBlue.evening };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowGolden = getGoldenHourTimes(tomorrow, latitude, longitude);
  const tomorrowBlue = getBlueHourTimes(tomorrow, latitude, longitude);
  return { part: 'morning', day: 'tomorrow', golden: tomorrowGolden.morning, blue: tomorrowBlue.morning };
};

export interface RelevantTwilightTimes {
  type: 'dawn' | 'dusk';
  civil: Date;
  nautical: Date;
  astronomical: Date;
}

export const getRelevantTwilightTimes = (
  currentTime: Date,
  sunTimes: SunTimes,
  latitude: number,
  longitude: number
): RelevantTwilightTimes => {
  const now = currentTime.getTime();
  const isNightTime = now < sunTimes.astronomicalDawn.getTime() || now > sunTimes.astronomicalDusk.getTime();

  if (isNightTime) {
    // If we're past today's astronomical dusk, today's dawn times are already in the
    // past - the "upcoming dawn" is tomorrow's, so recompute for date + 1 day.
    if (now > sunTimes.astronomicalDusk.getTime()) {
      const tomorrow = new Date(currentTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = getSunTimes(tomorrow, latitude, longitude);
      return {
        type: 'dawn',
        civil: tomorrowTimes.dawn,
        nautical: tomorrowTimes.nauticalDawn,
        astronomical: tomorrowTimes.astronomicalDawn
      };
    }

    // Before today's astronomical dawn, today's dawn times are still upcoming.
    return {
      type: 'dawn',
      civil: sunTimes.dawn,
      nautical: sunTimes.nauticalDawn,
      astronomical: sunTimes.astronomicalDawn
    };
  } else {
    // During day, show upcoming dusk times
    return {
      type: 'dusk',
      civil: sunTimes.dusk,
      nautical: sunTimes.nauticalDusk,
      astronomical: sunTimes.astronomicalDusk
    };
  }
};
