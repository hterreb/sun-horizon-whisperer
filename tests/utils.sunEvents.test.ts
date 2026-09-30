import { getNextSunEvent, passesSunEvent } from '../src/utils/sunEvents';

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

describe('passesSunEvent (ROADMAP item 41)', () => {
  it('starts the show when a 1 s tick passes the sunset', () => {
    expect(passesSunEvent(at('19:05:48.600'), at('19:05:49.600'), flat, null)).toBe(true);
    expect(passesSunEvent(at('19:05:48'), at('19:05:49'), flat, null)).toBe(true);
  });

  it('does not start the show before or after the event', () => {
    expect(passesSunEvent(at('19:05:40'), at('19:05:41'), flat, null)).toBe(false);
    expect(passesSunEvent(at('19:05:50'), at('19:05:51'), flat, null)).toBe(false);
  });

  it('uses the terrain sunset, not the flat one, when there is one', () => {
    expect(passesSunEvent(at('18:49:59'), at('18:50:00'), flat, terrain)).toBe(true);
    expect(passesSunEvent(at('19:05:49'), at('19:05:50'), flat, terrain)).toBe(false);
  });

  it('does not start the show on a clock step longer than 5 s (wake from sleep, time jump)', () => {
    expect(passesSunEvent(at('19:05:40'), at('19:05:46'), { ...flat, sunset: at('19:05:45') }, null)).toBe(false);
    expect(passesSunEvent(at('19:00:00'), at('19:10:00'), flat, null)).toBe(false);
    expect(passesSunEvent(at('19:05:45'), at('19:05:50'), flat, null)).toBe(true);
  });
});
