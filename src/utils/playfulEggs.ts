// Playful easter eggs (ROADMAP item 117): April Fools, the empty tomb on Easter morning,
// the Valentine's heart cloud, the St Patrick's pot of gold and the patient-watcher badge.
// Pure trigger logic; SunTracker and SunVisualization own the state and the timers.

import { type SunTimes } from './sunUtils';
import type { CalendarEvent } from './calendarEvents';
import { getEasterSunday } from './easterDate';

export type PlayfulEgg = 'aprilFools' | 'easter' | 'valentine' | 'stPatrick';

// Easter Sunday: the shared helper in easterDate.ts (also used for Carnival).
export { getEasterSunday };

export const isEasterSunday = (date: Date): boolean =>
  getEasterSunday(date.getFullYear()).toDateString() === date.toDateString();

// The empty tomb shows on Easter Sunday from the sunrise until 12:00 local time. The sunrise
// must be on the same day. At polar day it shows from 00:00; at polar night it does not show.
export const isEasterMorning = (date: Date, sunTimes: Pick<SunTimes, 'sunrise' | 'polar'> | null): boolean => {
  if (!isEasterSunday(date) || date.getHours() >= 12 || !sunTimes) return false;
  if (sunTimes.polar === 'day') return true;
  if (sunTimes.polar === 'night') return false;
  return sunTimes.sunrise.toDateString() === date.toDateString() && date.getTime() >= sunTimes.sunrise.getTime();
};

// Test override: `?egg=aprilFools|easter|valentine|stPatrick` sets that day.
const PLAYFUL: readonly PlayfulEgg[] = ['aprilFools', 'easter', 'valentine', 'stPatrick'];
export const PLAYFUL_EVENT: Record<PlayfulEgg, CalendarEvent> = {
  aprilFools: 'april-fools',
  easter: 'easter',
  valentine: 'valentine',
  stPatrick: 'st-patrick',
};
export const getPlayfulOverride = (search: string): PlayfulEgg | null => {
  const egg = new URLSearchParams(search).get('egg');
  return PLAYFUL.find(kind => kind === egg) ?? null;
};

// April Fools: the sun and the moon swap their drawn places for one minute, once per page
// view. A slow cross-fade, no jump: both fade out, swap, fade in; at the end the same way back.
export const APRIL_FOOLS_DELAY_MS = 10_000; // the normal scene first
export const APRIL_FOOLS_FADE_MS = 3_000;
export const APRIL_FOOLS_HOLD_MS = 60_000;
export type AprilFoolsPhase = 'wait' | 'fadeOut' | 'swapped' | 'fadeBack' | 'return' | 'done';
const PHASES: [AprilFoolsPhase, number][] = [
  ['wait', APRIL_FOOLS_DELAY_MS],
  ['fadeOut', APRIL_FOOLS_FADE_MS],
  ['swapped', APRIL_FOOLS_HOLD_MS],
  ['fadeBack', APRIL_FOOLS_FADE_MS],
  ['return', APRIL_FOOLS_FADE_MS],
];

// The phase at `elapsedMs` after the start, and the time left in it (Infinity when done).
export const getAprilFoolsPhase = (elapsedMs: number): { phase: AprilFoolsPhase; leftMs: number } => {
  let end = 0;
  for (const [phase, ms] of PHASES) {
    end += ms;
    if (elapsedMs < end) return { phase, leftMs: end - elapsedMs };
  }
  return { phase: 'done', leftMs: Infinity };
};

// St Patrick's Day: the pot of gold sits at one end of the rainbow, on the horizon line. The
// rainbow is a circle at (xFraction × width, horizonY) with the outer radius below
// (WeatherEffects). The right end when it is on the screen, else the left end, else null.
export const POT_EDGE_PX = 16;
export const getPotOfGoldX = (
  rainbow: { visible: boolean; xFraction: number; apexHeightDeg: number },
  width: number,
  horizonY: number,
): number | null => {
  if (!rainbow.visible || width <= 0) return null;
  const radius = (rainbow.apexHeightDeg / 42) * horizonY * 0.95;
  if (radius <= 0) return null;
  const cx = rainbow.xFraction * width;
  const onScreen = (x: number) => x >= POT_EDGE_PX && x <= width - POT_EDGE_PX;
  if (onScreen(cx + radius)) return cx + radius;
  if (onScreen(cx - radius)) return cx - radius;
  return null;
};

// Patient watcher: the app is open and visible without a break from 2 min before the sunset
// to 10 min after it. A hidden page, or a gap between two checks longer than the max gap (a
// frozen page), starts the watch again.
export const PATIENT_BEFORE_MS = 2 * 60_000;
export const PATIENT_AFTER_MS = 10 * 60_000;
export const PATIENT_MAX_GAP_MS = 90_000;
export interface PatientWatch {
  since: number | null; // visible without a break since this time (ms)
  last: number | null; // the last check (ms)
}
export const NO_PATIENT_WATCH: PatientWatch = { since: null, last: null };

export const advancePatientWatch = (
  watch: PatientWatch,
  nowMs: number,
  visible: boolean,
  sunsetMs: number | null,
): { watch: PatientWatch; earned: boolean } => {
  if (!visible || sunsetMs === null) return { watch: NO_PATIENT_WATCH, earned: false };
  const unbroken = watch.since !== null && watch.last !== null && nowMs >= watch.last && nowMs - watch.last <= PATIENT_MAX_GAP_MS;
  const since = unbroken ? watch.since as number : nowMs;
  const earned = since <= sunsetMs - PATIENT_BEFORE_MS && nowMs >= sunsetMs + PATIENT_AFTER_MS;
  return { watch: { since, last: nowMs }, earned };
};
