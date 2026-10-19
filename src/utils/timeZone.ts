// The time zone of the shown place (ROADMAP item 169). Every function takes an IANA zone
// ("America/New_York"); `undefined` is the device's zone, so a place with no known zone
// keeps the device's clock.

export interface WallTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

// A name the browser knows ("America/New_York"); false for junk from storage or an API.
export const isValidTimeZone = (timeZone: unknown): timeZone is string => {
  if (typeof timeZone !== 'string' || timeZone === '') return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
};

// One formatter per zone: creating an Intl.DateTimeFormat on each call was the new cost of
// item 169 in the perf trace (0.34 ms/s on a 4x slower phone CPU with the panel open).
const formatters = new Map<string, Intl.DateTimeFormat>();
const formatterIn = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

// The clock fields of `date` in `timeZone`.
export const wallTime = (date: Date, timeZone?: string): WallTime => {
  if (!timeZone) {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() };
  }
  const parts = formatterIn(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
};

// Minutes that `timeZone` is ahead of UTC at `date` (Berlin in summer: 120, New York: -240).
export const zoneOffsetMinutes = (date: Date, timeZone?: string): number => {
  if (!timeZone) return 0 - date.getTimezoneOffset(); // 0 - 0 is +0, not -0
  const w = wallTime(date, timeZone);
  const minuteStart = Math.floor(date.getTime() / 60_000) * 60_000;
  return Math.round((Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute) - minuteStart) / 60_000);
};

// The moment a clock in `timeZone` shows this wall time. Two passes, so a time next to a
// daylight-saving change uses the offset of its own side.
export const fromWallTime = ({ year, month, day, hour, minute }: WallTime, timeZone?: string): Date => {
  if (!timeZone) return new Date(year, month - 1, day, hour, minute);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const first = asUtc - zoneOffsetMinutes(new Date(asUtc), timeZone) * 60_000;
  return new Date(asUtc - zoneOffsetMinutes(new Date(first), timeZone) * 60_000);
};

// Midnight at the start of `date`'s day in `timeZone`.
export const startOfDayIn = (date: Date, timeZone?: string): Date =>
  fromWallTime({ ...wallTime(date, timeZone), hour: 0, minute: 0 }, timeZone);

// Minutes the place's clock is ahead of the device's clock at `date` (negative: behind).
export const placeClockDifferenceMinutes = (date: Date, timeZone?: string): number =>
  zoneOffsetMinutes(date, timeZone) - zoneOffsetMinutes(date);
