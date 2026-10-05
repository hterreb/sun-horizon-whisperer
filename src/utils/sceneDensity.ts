// Busy and quiet phases (ROADMAP item 93, S3). The share of the scene limits (fish, boats,
// birds) that the spawn loop fills: a curve over the day, with a slow seeded lull on top.
import { type SunTimes } from './sunUtils';
import { hashSeed, mulberry32 } from './skyCloudUtils';

export const DENSITY_RUSH = 1; // the hour around sunrise and around sunset: feeding time, the birds fly to their roost
export const DENSITY_DAY = 0.7;
export const DENSITY_NIGHT = 0.5;
export const LULL_MAX = 0.4; // the lull takes away 0-40 %
export const LULL_STEP_MIN = 10;

const RUSH_HALF_MS = 30 * 60_000;

// The curve without the lull.
export const getDensityCurve = (date: Date, sunTimes: SunTimes): number => {
  if (sunTimes.polar) return sunTimes.polar === 'day' ? DENSITY_DAY : DENSITY_NIGHT;
  const t = date.getTime();
  const { sunrise, sunset } = sunTimes;
  if (Math.abs(t - sunrise.getTime()) <= RUSH_HALF_MS || Math.abs(t - sunset.getTime()) <= RUSH_HALF_MS) return DENSITY_RUSH;
  return t > sunrise.getTime() && t < sunset.getTime() ? DENSITY_DAY : DENSITY_NIGHT;
};

// The share (0-1) of LULL_MAX that the lull takes away: a seeded value at each 10-minute
// step of the local day, with straight lines between them, so it changes slowly.
export const getLull = (date: Date, seed: string): number => {
  const steps = (date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60) / LULL_STEP_MIN;
  const k = Math.floor(steps);
  const base = hashSeed(`${seed}|lull`);
  const at = (i: number) => mulberry32(base + i)();
  return at(k) + (at(k + 1) - at(k)) * (steps - k);
};

// The density factor, 0.3-1. `seed` is getDaySeed (the day and the rounded place, as the clouds).
export const getSceneDensity = (date: Date, sunTimes: SunTimes, seed: string): number =>
  getDensityCurve(date, sunTimes) * (1 - LULL_MAX * getLull(date, seed));
