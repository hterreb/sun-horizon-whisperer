type RiseSet = { sunrise: Date | null; sunset: Date | null } | null;

// Longest clock step that still counts as normal ticking. A longer step is a wake
// from sleep or a time jump, and must not start the fireworks (ROADMAP item 41).
export const MAX_CLOCK_STEP_MS = 5000;

// The next sunrise or sunset after `now`: the line-of-sight (terrain) time when there
// is one, else the flat-horizon time. Null when neither is still ahead.
export const getNextSunEvent = (now: Date, flatTimes: RiseSet, terrainTimes: RiseSet): Date | null => {
  const times = [terrainTimes?.sunrise ?? flatTimes?.sunrise, terrainTimes?.sunset ?? flatTimes?.sunset];
  const ahead = times.filter((t): t is Date => !!t && t.getTime() > now.getTime());
  return ahead.length ? new Date(Math.min(...ahead.map((t) => t.getTime()))) : null;
};

// True when the clock step from `prev` to `now` passes the next sunrise or sunset.
export const passesSunEvent = (prev: Date, now: Date, flatTimes: RiseSet, terrainTimes: RiseSet): boolean => {
  if (now.getTime() - prev.getTime() > MAX_CLOCK_STEP_MS) return false;
  const event = getNextSunEvent(prev, flatTimes, terrainTimes);
  return !!event && event.getTime() <= now.getTime();
};
