import SunCalc from 'suncalc';
import { format } from 'date-fns';

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
  | 'evening' 
  | 'dusk';

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
  
  // Create fallback dates for invalid times
  const fallbackDate = new Date(date);
  fallbackDate.setHours(12, 0, 0, 0); // noon as fallback
  
  return {
    sunrise: isValidDate(times.sunrise) ? times.sunrise : fallbackDate,
    sunset: isValidDate(times.sunset) ? times.sunset : fallbackDate,
    solarNoon: isValidDate(times.solarNoon) ? times.solarNoon : fallbackDate,
    dawn: isValidDate(times.dawn) ? times.dawn : fallbackDate,
    dusk: isValidDate(times.dusk) ? times.dusk : fallbackDate,
    nauticalDawn: isValidDate(times.nauticalDawn) ? times.nauticalDawn : fallbackDate,
    nauticalDusk: isValidDate(times.nauticalDusk) ? times.nauticalDusk : fallbackDate,
    astronomicalDawn: isValidDate(times.astronomicalDawn) ? times.astronomicalDawn : fallbackDate,
    astronomicalDusk: isValidDate(times.astronomicalDusk) ? times.astronomicalDusk : fallbackDate,
  };
};

export const formatTime = (date: Date | null): string => {
  if (!isValidDate(date)) return "Unknown";
  
  try {
    return format(date, 'h:mm a');
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
    case 'dusk': return 'Dusk';
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
    case 'dusk':
      return 'linear-gradient(to bottom, #ea384c 0%, #E5DEFF 100%)';
    default:
      return 'linear-gradient(to bottom, #0EA5E9 0%, #33C3F0 100%)';
  }
};

export const getHorizonSvg = (timeOfDay: TimeOfDay): string => {
  if (timeOfDay === 'night' || 
      timeOfDay === 'astronomical-twilight' || 
      timeOfDay === 'nautical-twilight') {
    return '/mountain-night.svg';
  }
  
  return '/mountain-day.svg';
};
