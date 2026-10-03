import { getNextSunEvent, watchSunEvent, NO_SUN_EVENT_WATCH, CATCH_UP_MS, getCountdownTarget } from '../src/utils/sunEvents';

const at = (hms: string) => new Date(`2026-09-30T${hms}+02:00`);
const flat = { sunrise: at('07:22:00'), sunset: at('19:05:49') };
const terrain = { sunrise: at('07:40:00'), sunset: at('18:50:00') };

describe('getNextSunEvent (ROADMAP item 41)', () => {
  it('gives the terrain time when there is one', () => {
    expect(getNextSunEvent(at('12:00:00'), flat, terrain)).toEqual(terrain.sunset);
    expect(getNextSunEvent(at('03:00:00'), flat, terrain)).toEqual(terrain.sunrise);
  });

  it('gives the flat time without a terrain profile, or when the terrain has none', () => {
    expect(getNextSunEvent(at('12:00:00'), flat, null)).toEqual(flat.sunset);
    expect(getNextSunEvent(at('12:00:00'), flat, { sunrise: terrain.sunrise, sunset: null })).toEqual(flat.sunset);
  });

  it('gives null when no event is still ahead', () => {
    expect(getNextSunEvent(at('22:00:00'), flat, null)).toBeNull();
    expect(getNextSunEvent(at('12:00:00'), null, null)).toBeNull();
  });
});

describe('watchSunEvent (ROADMAP items 41 and 80)', () => {
  // Runs the ticks in order and gives each outcome. A tick is a time, or [time, 'preview'].
  const run = (ticks: (string | [string, 'preview'])[], terrainTimes: typeof terrain | null = null) => {
    let watch = NO_SUN_EVENT_WATCH;
    return ticks.map((tick) => {
      const [hms, mode] = typeof tick === 'string' ? [tick, 'live'] : tick;
      const result = watchSunEvent(watch, at(hms), mode === 'preview', flat, terrainTimes);
      watch = result.watch;
      return result.outcome;
    });
  };

  it('starts the show when a 1 s tick passes the sunset, and only once', () => {
    expect(run(['19:05:48', '19:05:49', '19:05:50', '19:05:51'])).toEqual([null, 'fired', null, null]);
    expect(run(['19:05:48.600', '19:05:49.600'])).toEqual([null, 'fired']);
  });

  it('does not start the show before the event', () => {
    expect(run(['19:05:40', '19:05:41', '19:05:42'])).toEqual([null, null, null]);
  });

  it('uses the terrain sunset, not the flat one, when there is one', () => {
    expect(run(['18:49:59', '18:50:00', '19:05:48', '19:05:50'], terrain)).toEqual([null, 'fired', null, null]);
  });

  it('catches up a page that was hidden at the event and comes back within 15 min', () => {
    // Timers stop while the page is hidden: the next tick comes 3 min after the sunset.
    expect(run(['19:00:00', '19:08:49', '19:08:50'])).toEqual([null, 'fired', null]);
    expect(run(['15:00:00', '19:05:49'])).toEqual([null, 'fired']);
    // The last tick that still catches up, 15 min after the event.
    const lastCatchUp = new Date(flat.sunset.getTime() + CATCH_UP_MS);
    let watch = watchSunEvent(NO_SUN_EVENT_WATCH, at('19:00:00'), false, flat, null).watch;
    expect(watchSunEvent(watch, lastCatchUp, false, flat, null).outcome).toBe('fired');
    watch = watchSunEvent(NO_SUN_EVENT_WATCH, at('19:00:00'), false, flat, null).watch;
    expect(watchSunEvent(watch, new Date(lastCatchUp.getTime() + 1000), false, flat, null).outcome).toBe('too late');
  });

  it('gives no show when the page comes back more than 15 min after the event', () => {
    expect(run(['19:00:00', '19:25:49', '19:25:50'])).toEqual([null, 'too late', null]);
  });

  it('gives no show on a cold start after the event', () => {
    expect(run(['19:06:00', '19:06:01', '19:10:00'])).toEqual([null, null, null]);
  });

  it('gives no show during a preview, nor on the return to live after the event', () => {
    // Preview ticks across the (preview) sunset.
    expect(run([['19:05:48', 'preview'], ['19:05:49', 'preview'], ['19:05:50', 'preview']])).toEqual([null, null, null]);
    // Live before the sunset, a preview while it passes, live again 3 min after it.
    expect(run(['19:00:00', ['12:00:00', 'preview'], ['12:00:01', 'preview'], '19:08:49', '19:08:50'])).toEqual([null, null, null, 'preview', null]);
    // A preview before the sunset does not count as the page being open before it.
    expect(run([['19:00:00', 'preview'], '19:08:49'])).toEqual([null, null]);
  });

  it('starts the show again on the next event after a preview, once back in live time before it', () => {
    expect(run(['19:00:00', ['12:00:00', 'preview'], '19:05:00', '19:05:49'])).toEqual([null, null, null, 'fired']);
  });

  it('keeps sunrise shows', () => {
    expect(run(['07:21:59', '07:22:00', '07:22:01'])).toEqual([null, 'fired', null]);
  });
});

describe('getCountdownTarget (ROADMAP item 43)', () => {
  it('gives the terrain sunset when there is one and line of sight is enabled', () => {
    expect(getCountdownTarget(at('12:00:00'), flat, terrain, true)).toEqual({ time: terrain.sunset, lineOfSight: true });
  });

  it('gives the flat sunset without line of sight, or without a terrain sunset', () => {
    expect(getCountdownTarget(at('12:00:00'), flat, terrain, false)).toEqual({ time: flat.sunset, lineOfSight: false });
    expect(getCountdownTarget(at('12:00:00'), flat, null, true)).toEqual({ time: flat.sunset, lineOfSight: false });
    expect(getCountdownTarget(at('12:00:00'), flat, { sunrise: terrain.sunrise, sunset: null }, true)).toEqual({ time: flat.sunset, lineOfSight: false });
  });

  it('never targets the sunrise, and gives null once the sunset has passed', () => {
    expect(getCountdownTarget(at('03:00:00'), flat, terrain, true)!.time).toEqual(terrain.sunset);
    expect(getCountdownTarget(at('18:55:00'), flat, terrain, true)).toBeNull();
    expect(getCountdownTarget(at('22:00:00'), flat, null, false)).toBeNull();
  });
});
