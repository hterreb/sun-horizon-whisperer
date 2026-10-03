type RiseSet = { sunrise: Date | null; sunset: Date | null } | null;

// A page that was open at a sun event, but hidden (timers stopped), still gets the
// show at its first live tick up to 15 min after the event (ROADMAP item 80).
export const CATCH_UP_MS = 15 * 60_000;

// The next sunrise or sunset after `now`: the line-of-sight (terrain) time when there
// is one, else the flat-horizon time. Null when neither is still ahead.
export const getNextSunEvent = (now: Date, flatTimes: RiseSet, terrainTimes: RiseSet): Date | null => {
  const times = [terrainTimes?.sunrise ?? flatTimes?.sunrise, terrainTimes?.sunset ?? flatTimes?.sunset];
  const ahead = times.filter((t): t is Date => !!t && t.getTime() > now.getTime());
  return ahead.length ? new Date(Math.min(...ahead.map((t) => t.getTime()))) : null;
};

// What the fireworks clock keeps between ticks (ROADMAP item 80).
export interface SunEventWatch {
  armed: number | null; // the next sun event (ms), seen at the last live tick
  celebrated: number | null; // the last sun event (ms) that got a show
  previewed: boolean; // a time preview was on after `armed` was set
}
export const NO_SUN_EVENT_WATCH: SunEventWatch = { armed: null, celebrated: null, previewed: false };
// 'fired': start a show. 'preview' and 'too late': the armed event passed without a show.
export type SunEventOutcome = 'fired' | 'preview' | 'too late' | null;

// One clock tick for the sunrise and sunset fireworks (ROADMAP items 41 and 80). A live
// tick arms the next event. The first live tick after an armed event starts one show,
// if it comes at most CATCH_UP_MS after the event. So a cold start after the event gives
// no show (nothing was armed), and a preview tick only marks the watch: the return to
// live after the event gives no show either.
export const watchSunEvent = (
  watch: SunEventWatch, now: Date, preview: boolean, flatTimes: RiseSet, terrainTimes: RiseSet
): { watch: SunEventWatch; outcome: SunEventOutcome } => {
  if (preview) return { watch: { ...watch, previewed: true }, outcome: null };
  const event = watch.armed;
  let outcome: SunEventOutcome = null;
  if (event !== null && event <= now.getTime() && event !== watch.celebrated) {
    if (watch.previewed) outcome = 'preview';
    else outcome = now.getTime() - event <= CATCH_UP_MS ? 'fired' : 'too late';
  }
  return {
    watch: {
      armed: getNextSunEvent(now, flatTimes, terrainTimes)?.getTime() ?? null,
      celebrated: outcome === 'fired' ? event : watch.celebrated,
      previewed: false,
    },
    outcome,
  };
};

// Sunset countdown target (ROADMAP item 43): the next sunset. With line of sight on
// (premium; everyone while PREMIUM_ENFORCED is false) it is the line-of-sight sunset
// when the terrain profile has one, else the flat sunset. Null when it is not ahead.
export const getCountdownTarget = (
  now: Date,
  flatTimes: RiseSet,
  terrainTimes: RiseSet,
  lineOfSight: boolean
): { time: Date; lineOfSight: boolean } | null => {
  const sunsetOnly = (times: RiseSet): RiseSet => times && { sunrise: null, sunset: times.sunset };
  const terrain = lineOfSight ? sunsetOnly(terrainTimes) : null;
  const time = getNextSunEvent(now, sunsetOnly(flatTimes), terrain);
  return time && { time, lineOfSight: !!terrain?.sunset };
};
