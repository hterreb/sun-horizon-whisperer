// Time travel (ROADMAP item 44): the range a preview may reach (today ± 1 year) and
// the value format of the native <input type="datetime-local">.

// Play speed: 10 min of scene time per real second (one day in about 2.4 min).
export const PLAY_SPEED = 600;
// Clock tick during play, so the motion is smooth.
export const PLAY_TICK_MS = 100;

// Start of today one year back, to end of today one year ahead (local time).
export const getTimeTravelRange = (now: Date): { min: Date; max: Date } => {
  const min = new Date(now);
  min.setFullYear(min.getFullYear() - 1);
  min.setHours(0, 0, 0, 0);
  const max = new Date(now);
  max.setFullYear(max.getFullYear() + 1);
  max.setHours(23, 59, 59, 999);
  return { min, max };
};

// Limits a time offset so that `now + offset` stays inside getTimeTravelRange(now).
export const clampTimeOffset = (offsetMs: number, now: Date): number => {
  const { min, max } = getTimeTravelRange(now);
  const target = Math.min(max.getTime(), Math.max(min.getTime(), now.getTime() + offsetMs));
  return target - now.getTime();
};

// "2026-09-30T18:30", the local-time value of a datetime-local input.
export const toDateTimeLocalValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
