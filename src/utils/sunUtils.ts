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

export const getBackgroundGradient = (timeOfDay: TimeOfDay): string => {
  switch(timeOfDay) {
    case 'night':
      return 'linear-gradient(to bottom, #0F1016 0%, #1A1F2C 100%)';
    case 'astronomical-twilight':
      return 'linear-gradient(to bottom, #1A1F2C 0%, #221F26 100%)';
    case 'nautical-twilight':
      return 'linear-gradient(to bottom, #221F26 0%, #403E43 100%)';
    case 'civil-twilight':
      return 'linear-gradient(to bottom, #403E43 0%, #E5DEFF 100%)';
    case 'dawn':
      return 'linear-gradient(180deg, #F97316 0%, #FEC6A1 100%)';
    case 'morning':
      return 'linear-gradient(to bottom, #FEC6A1 0%, #33C3F0 100%)';
    case 'midday':
      return 'linear-gradient(to bottom, #0EA5E9 0%, #33C3F0 100%)';
    case 'afternoon':
      return 'linear-gradient(to bottom, #33C3F0 0%, #FEC6A1 100%)';
    case 'evening':
      return 'linear-gradient(180deg, #FEC6A1 0%, #F97316 100%)';
    default:
      return 'linear-gradient(to bottom, #0EA5E9 0%, #33C3F0 100%)';
  }
};

// Shifts every #rrggbb color in a CSS gradient string by the same amount per channel
// (negative = darker, positive = brighter), clamped to [0, 255]. Used to tint the sky
// gradient for weather (ROADMAP item 10) without hardcoding a second gradient per
// weather type. Pure and independent of WeatherType, so it's testable on its own.
export const shiftGradientBrightness = (gradient: string, deltaPerChannel: number): string => {
  if (deltaPerChannel === 0) return gradient;

  return gradient.replace(/#([0-9a-fA-F]{6})/g, (_match, hex: string) => {
    const num = parseInt(hex, 16);
    const clamp = (channel: number): number => Math.max(0, Math.min(255, channel));
    const r = clamp(((num >> 16) & 0xff) + deltaPerChannel);
    const g = clamp(((num >> 8) & 0xff) + deltaPerChannel);
    const b = clamp((num & 0xff) + deltaPerChannel);
    return `#${(((r << 16) | (g << 8) | b) >>> 0).toString(16).padStart(6, '0')}`;
  });
};

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
