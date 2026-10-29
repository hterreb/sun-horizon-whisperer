// Turning points (ROADMAP item 186): the solstices and equinoxes for the Daylight card (C2),
// the countdown share card (C4), the horizon calendar in the scene (Y4), the polar countdown
// (M4) and the "Full circle" badge (X2). Pure math on suncalc, except the two saved choices at
// the end (the Y4 switch and the turning-point days of the badge).

import { getSeasonInstant } from './calendarEvents';
import { getTerrainSunTimes, type HorizonProfile } from './horizonUtils';
import { getSunPosition, getSunTimes } from './sunUtils';
import { startOfDayIn, wallTime } from './timeZone';
import { type MessageKey } from '@/i18n';

export type SeasonMonth = 2 | 5 | 8 | 11;
export type TurningPoint = 'midsummer' | 'midwinter' | 'springEquinox' | 'autumnEquinox';

// The name on its own ("Midwinter"), and after "days until" on the countdown card ("midwinter";
// in de "zur Wintersonnenwende", as the preposition takes the article).
export const TURNING_POINT_NAMES: Record<TurningPoint, MessageKey> = {
  midsummer: 'turning.midsummer', midwinter: 'turning.midwinter', springEquinox: 'turning.springEquinox', autumnEquinox: 'turning.autumnEquinox',
};
export const COUNTDOWN_NAMES: Record<TurningPoint, MessageKey> = {
  midsummer: 'countdown.midsummer', midwinter: 'countdown.midwinter', springEquinox: 'countdown.springEquinox', autumnEquinox: 'countdown.autumnEquinox',
};

const DAY_MS = 86_400_000;
const SEASON_MONTHS: readonly SeasonMonth[] = [2, 5, 8, 11];
// The sparkline of the Daylight card: 45 days back and ahead; the ridge line one sample a week.
export const SPARK_DAYS = 45;
const RIDGE_STEP_DAYS = 7;
// The horizon calendar: one dot a week, 26 weeks back and ahead.
const CALENDAR_WEEKS = 26;
// The polar circle is at 66.56°; with refraction a midnight sun starts at about 65.7°.
const POLAR_MIN_LATITUDE = 65;
const POLAR_SCAN_DAYS = 366;
// Each polar run is shorter than half a year, so this finds the start and end of a run.
const POLAR_RUN_MAX_DAYS = 200;

// In the south, June is midwinter and March is the autumn equinox.
export const turningPointOf = (month: SeasonMonth, latitude: number): TurningPoint => {
  const north = latitude >= 0;
  if (month === 5) return north ? 'midsummer' : 'midwinter';
  if (month === 11) return north ? 'midwinter' : 'midsummer';
  return (month === 2) === north ? 'springEquinox' : 'autumnEquinox';
};

// Days since 1970-01-01 of `date`'s day in `timeZone`.
const dayNumber = (date: Date, timeZone?: string): number => {
  const w = wallTime(date, timeZone);
  return Math.round(Date.UTC(w.year, w.month - 1, w.day) / DAY_MS);
};

// Noon of the day `k` days after `now`'s day: SunCalc then gives that day's sun times.
// ponytail: a fixed 24 h step, so after a clock change "noon" is 11:00 or 13:00; the sun
// times of the day stay the same.
const noonFrom = (now: Date, timeZone?: string) => {
  const base = startOfDayIn(now, timeZone).getTime() + DAY_MS / 2;
  return (k: number) => new Date(base + k * DAY_MS);
};

export interface NextTurningPoint {
  point: TurningPoint;
  month: SeasonMonth;
  at: Date;
  // Whole days from today's day to its day in the place's time zone; 0 on the day.
  days: number;
}

const upcoming = (now: Date, latitude: number, timeZone: string | undefined, months: readonly SeasonMonth[]): NextTurningPoint => {
  const today = dayNumber(now, timeZone);
  const year = wallTime(now, timeZone).year;
  for (const y of [year - 1, year, year + 1]) {
    for (const month of months) {
      const at = getSeasonInstant(y, month);
      const days = dayNumber(at, timeZone) - today;
      if (days >= 0) return { point: turningPointOf(month, latitude), month, at, days };
    }
  }
  throw new Error('No turning point within a year');
};

export const getNextTurningPoint = (now: Date, latitude: number, timeZone?: string): NextTurningPoint =>
  upcoming(now, latitude, timeZone, SEASON_MONTHS);

// Daylight in seconds, from sunrise to sunset; 24 h on a polar day, 0 on a polar night.
const flatDaylight = (noon: Date, latitude: number, longitude: number): number => {
  const times = getSunTimes(noon, latitude, longitude);
  if (times.polar) return times.polar === 'day' ? DAY_MS / 1000 : 0;
  return (times.sunset.getTime() - times.sunrise.getTime()) / 1000;
};

// Daylight behind the ridge (X1), from the terrain sunrise to the terrain sunset.
// ponytail: a day with no terrain crossing counts as the flat polar case (24 h or 0); a ridge
// that hides the sun all day then reads 0.
const ridgeDaylight = (noon: Date, latitude: number, longitude: number, profile: HorizonProfile): number => {
  const { sunrise, sunset } = getTerrainSunTimes(noon, latitude, longitude, profile);
  if (sunrise && sunset) return (sunset.getTime() - sunrise.getTime()) / 1000;
  return getSunTimes(noon, latitude, longitude).polar === 'day' ? DAY_MS / 1000 : 0;
};

export interface Daylight {
  seconds: number; // today, flat horizon
  change: number; // today minus yesterday, flat horizon, s
  polar: 'day' | 'night' | null;
  longest: number; // this year's longest day (midsummer), flat, s
  spark: number[]; // flat, from SPARK_DAYS days back to SPARK_DAYS ahead, one a day
  // Behind the ridge (X1): today's value and one sample a week (offset in days from today).
  ridge: { seconds: number; spark: { offset: number; seconds: number }[] } | null;
  // Until the next solstice the days get longer (midsummer next) or shorter.
  solstice: { days: number; longer: boolean };
}

export const getDaylight = (
  now: Date,
  latitude: number,
  longitude: number,
  timeZone?: string,
  profile: HorizonProfile | null = null
): Daylight => {
  const noon = noonFrom(now, timeZone);
  const spark: number[] = [];
  for (let k = -SPARK_DAYS; k <= SPARK_DAYS; k++) spark.push(flatDaylight(noon(k), latitude, longitude));
  const seconds = spark[SPARK_DAYS];
  const midsummer = getSeasonInstant(wallTime(now, timeZone).year, latitude >= 0 ? 5 : 11);
  const solstice = upcoming(now, latitude, timeZone, [5, 11]);
  let ridge: Daylight['ridge'] = null;
  if (profile) {
    const samples: { offset: number; seconds: number }[] = [];
    const first = -Math.floor(SPARK_DAYS / RIDGE_STEP_DAYS) * RIDGE_STEP_DAYS;
    for (let k = first; k <= SPARK_DAYS; k += RIDGE_STEP_DAYS) {
      samples.push({ offset: k, seconds: ridgeDaylight(noon(k), latitude, longitude, profile) });
    }
    ridge = { seconds: samples.find((s) => s.offset === 0)?.seconds ?? 0, spark: samples };
  }
  return {
    seconds,
    change: seconds - spark[SPARK_DAYS - 1],
    polar: getSunTimes(noon(0), latitude, longitude).polar,
    longest: flatDaylight(noonFrom(midsummer, timeZone)(0), latitude, longitude),
    spark,
    ridge,
    solstice: { days: solstice.days, longer: solstice.point === 'midsummer' },
  };
};

// The year's daylight for the countdown card (C4): flat one a day from Jan 1 of `now`'s year,
// behind the ridge one a week (X1), and today's index.
export const getYearDaylight = (
  now: Date,
  latitude: number,
  longitude: number,
  timeZone?: string,
  profile: HorizonProfile | null = null
): { flat: number[]; ridge: { index: number; seconds: number }[] | null; today: number } => {
  const { year } = wallTime(now, timeZone);
  const noon = noonFrom(now, timeZone);
  const today = dayNumber(now, timeZone);
  const start = Math.round(Date.UTC(year, 0, 1) / DAY_MS) - today;
  const length = Math.round((Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS);
  const flat: number[] = [];
  for (let i = 0; i < length; i++) flat.push(flatDaylight(noon(start + i), latitude, longitude));
  let ridge: { index: number; seconds: number }[] | null = null;
  if (profile) {
    ridge = [];
    for (let i = 0; i < length; i += RIDGE_STEP_DAYS) ridge.push({ index: i, seconds: ridgeDaylight(noon(start + i), latitude, longitude, profile) });
  }
  return { flat, ridge, today: -start };
};

// The sunset azimuth (0-360°, 0 = North) of a day, or null on a polar day or night.
const sunsetAzimuth = (noon: Date, latitude: number, longitude: number): number | null => {
  const times = getSunTimes(noon, latitude, longitude);
  return times.polar ? null : getSunPosition(times.sunset, latitude, longitude).azimuth;
};

export interface HorizonCalendar {
  // The sunset points of this year's June solstice, September equinox and December solstice.
  marks: { point: TurningPoint; azimuth: number }[];
  // One a week, 26 weeks back and ahead (not today).
  dots: { azimuth: number; ahead: boolean }[];
  today: number | null;
}

export const getHorizonCalendar = (now: Date, latitude: number, longitude: number, timeZone?: string): HorizonCalendar => {
  const noon = noonFrom(now, timeZone);
  const today = dayNumber(now, timeZone);
  const { year } = wallTime(now, timeZone);
  const marks: HorizonCalendar['marks'] = [];
  for (const month of [5, 8, 11] as const) {
    const azimuth = sunsetAzimuth(noon(dayNumber(getSeasonInstant(year, month), timeZone) - today), latitude, longitude);
    if (azimuth !== null) marks.push({ point: turningPointOf(month, latitude), azimuth });
  }
  const dots: HorizonCalendar['dots'] = [];
  for (let week = -CALENDAR_WEEKS; week <= CALENDAR_WEEKS; week++) {
    if (week === 0) continue;
    const azimuth = sunsetAzimuth(noon(week * 7), latitude, longitude);
    if (azimuth !== null) dots.push({ azimuth, ahead: week > 0 });
  }
  return { marks, dots, today: sunsetAzimuth(noon(0), latitude, longitude) };
};

export type PolarEvent = 'lastSunset' | 'sunBack' | 'midnightSunStart' | 'midnightSunEnd';

export interface PolarCountdown {
  // The next change; `at` is its sunset or sunrise, null for the start of the midnight sun.
  next: { event: PolarEvent; days: number; at: Date | null };
  // The first and the last polar day of each run (noon), and its length in days.
  night: { first: Date; last: Date; days: number } | null;
  day: { first: Date; last: Date; days: number } | null;
}

// M4: only at a place with a polar night or a midnight sun in the next 366 days; else null.
export const getPolarCountdown = (now: Date, latitude: number, longitude: number, timeZone?: string): PolarCountdown | null => {
  if (Math.abs(latitude) < POLAR_MIN_LATITUDE) return null;
  const noon = noonFrom(now, timeZone);
  const polarOn = (k: number) => getSunTimes(noon(k), latitude, longitude).polar;
  const runs: { kind: 'day' | 'night'; start: number; end: number }[] = [];
  for (let k = 0; k <= POLAR_SCAN_DAYS; k++) {
    const kind = polarOn(k);
    if (!kind) continue;
    const last = runs[runs.length - 1];
    if (last && last.kind === kind && last.end === k - 1) last.end = k;
    else runs.push({ kind, start: k, end: k });
  }
  if (runs.length === 0) return null;
  // A run that holds today started earlier; the last run can go on after the scan.
  const first = runs[0];
  if (first.start === 0) {
    for (let n = 0; n < POLAR_RUN_MAX_DAYS && polarOn(first.start - 1) === first.kind; n++) first.start--;
  }
  const tail = runs[runs.length - 1];
  if (tail.end === POLAR_SCAN_DAYS) {
    for (let n = 0; n < POLAR_RUN_MAX_DAYS && polarOn(tail.end + 1) === tail.kind; n++) tail.end++;
  }

  const window = (run: (typeof runs)[number] | undefined) =>
    run ? { first: noon(run.start), last: noon(run.end), days: run.end - run.start + 1 } : null;
  const night = runs.find((run) => run.kind === 'night');
  const day = runs.find((run) => run.kind === 'day');
  const events: PolarCountdown['next'][] = [];
  const times = (k: number) => getSunTimes(noon(k), latitude, longitude);
  if (night) {
    events.push(night.start <= 0
      ? { event: 'sunBack', days: night.end + 1, at: times(night.end + 1).sunrise }
      : { event: 'lastSunset', days: night.start - 1, at: times(night.start - 1).sunset });
  }
  if (day) {
    events.push(day.start <= 0
      ? { event: 'midnightSunEnd', days: day.end + 1, at: times(day.end + 1).sunset }
      : { event: 'midnightSunStart', days: day.start, at: null });
  }
  events.sort((a, b) => a.days - b.days);
  return { next: events[0], night: window(night), day: window(day) };
};

// --- Saved choices -------------------------------------------------------------------

// Y4: the switch in the Daylight card, off at the start.
const HORIZON_CALENDAR_KEY = 'horizon-calendar';

export const loadHorizonCalendar = (): boolean => {
  try {
    return localStorage.getItem(HORIZON_CALENDAR_KEY) === 'on';
  } catch {
    return false;
  }
};

export const saveHorizonCalendar = (on: boolean): void => {
  try {
    localStorage.setItem(HORIZON_CALENDAR_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the switch is off again on the next start.
  }
};

// X2: the last day ("2026-12-21", device clock) the app was open on each turning point.
export type TurningPointDays = Partial<Record<SeasonMonth, string>>;
const TURNING_POINT_DAYS_KEY = 'turning-point-days';
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const isoDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// The turning point on `date`'s day by the device clock, as the season eggs (calendarEvents).
export const getTurningPointMonth = (date: Date): SeasonMonth | null =>
  SEASON_MONTHS.find((month) => month === date.getMonth()
    && getSeasonInstant(date.getFullYear(), month).toDateString() === date.toDateString()) ?? null;

export const loadTurningPointDays = (): TurningPointDays => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(TURNING_POINT_DAYS_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([month, day]) => SEASON_MONTHS.includes(Number(month) as SeasonMonth) && typeof day === 'string' && ISO_DAY.test(day)),
    ) as TurningPointDays;
  } catch {
    return {};
  }
};

export const saveTurningPointDays = (days: TurningPointDays): void => {
  try {
    localStorage.setItem(TURNING_POINT_DAYS_KEY, JSON.stringify(days));
  } catch {
    // Storage blocked: this day does not count.
  }
};

// The days with `date` added, or null when `date` is no turning point or is already saved.
export const addTurningPointDay = (days: TurningPointDays, date: Date): TurningPointDays | null => {
  const month = getTurningPointMonth(date);
  if (month === null || days[month] === isoDay(date)) return null;
  return { ...days, [month]: isoDay(date) };
};

// All four turning points, and the four days within 365 days.
export const isFullCircle = (days: TurningPointDays): boolean => {
  const times = SEASON_MONTHS.map((month) => days[month]).map((day) => (day ? Date.parse(day) : NaN));
  if (times.some(Number.isNaN)) return false;
  return Math.max(...times) - Math.min(...times) <= 365 * DAY_MS;
};
