import { describe, it, expect } from 'vitest';
import {
  AIRLINE_COUNT, MAX_COMPASS_PLANES, MAX_NORMAL_PLANES, MIN_ELEVATION_DEG, MIN_SCREEN_SPEED_PX_S, deadReckon, distanceAndBearing, getAircraftView, getAirlineName, getLiveContrail, getLivePlaneScale, pickNearestVisible, pickShownPlanes, slantDistanceM,
  isAircraftVisible, planeFeedUrl, getLivePlanesTag, smoothPlaneScale, STICKY_SCREEN_SPEED_PX_S, SWAP_NEARER_RATIO,
} from '@/utils/liveRadar';
import { PLANE_WIDTH_PX } from '@/utils/planes';
import { type LiveAircraft } from '@/utils/planeFeed';
import { type HorizonProfile } from '@/utils/horizonUtils';

// ROADMAP item 96: the live radar's geometry, checked against known places.
const RAVENSBURG = { lat: 47.781, lon: 9.612 };
const aircraft = (over: Partial<LiveAircraft> = {}): LiveAircraft => ({
  hex: 'abc123', callsign: 'DLH4KL', type: 'A320', altM: 10000, speedKt: 0, track: 0, lat: 47.3769, lon: 8.5417, ageSec: 0, ...over,
});
const flatProfile = (angle: number): HorizonProfile => ({ angles: Array(360).fill(angle), observerElevation: 450, eyeHeight: 1.7 });

describe('distanceAndBearing (known places)', () => {
  it.each([
    { name: 'Zurich', to: { lat: 47.3769, lon: 8.5417 }, km: 92.0, bearing: 241.2 },
    { name: 'Munich', to: { lat: 48.1372, lon: 11.5756 }, km: 151.5, bearing: 74.1 },
    { name: 'Friedrichshafen', to: { lat: 47.6542, lon: 9.479 }, km: 17.3, bearing: 215.3 },
  ])('Ravensburg to $name', ({ to, km, bearing }) => {
    const result = distanceAndBearing(RAVENSBURG, to);
    expect(result.distanceM / 1000).toBeCloseTo(km, 1);
    expect(result.bearing).toBeCloseTo(bearing, 1);
  });

  it('gives due north, east, south and west', () => {
    expect(distanceAndBearing({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }).bearing).toBeCloseTo(0, 6);
    expect(distanceAndBearing({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }).bearing).toBeCloseTo(90, 6);
    expect(distanceAndBearing({ lat: 0, lon: 0 }, { lat: -1, lon: 0 }).bearing).toBeCloseTo(180, 6);
    expect(distanceAndBearing({ lat: 0, lon: 0 }, { lat: 0, lon: -1 }).bearing).toBeCloseTo(270, 6);
  });
});

describe('deadReckon', () => {
  it('moves on with the ground speed and the track: 480 kt east for 60 s at the equator is 8 nm', () => {
    const moved = deadReckon({ lat: 0, lon: 0, speedKt: 480, track: 90 }, 60);
    expect(moved.lat).toBeCloseTo(0, 9);
    expect(moved.lon).toBeCloseTo(0.13324, 5);
  });

  it('keeps the distance on another track and stays put at speed 0', () => {
    const start = { lat: 47.8, lon: 9.6 };
    const moved = deadReckon({ ...start, speedKt: 450, track: 216 }, 15);
    const { distanceM, bearing } = distanceAndBearing(start, moved);
    expect(distanceM).toBeCloseTo(450 * 0.514444 * 15, 0);
    expect(bearing).toBeCloseTo(216, 1);
    const still = deadReckon({ ...start, speedKt: 0, track: 0 }, 60);
    expect(still.lat).toBeCloseTo(start.lat, 9);
    expect(still.lon).toBeCloseTo(start.lon, 9);
  });
});

describe('getAircraftView', () => {
  const observer = { ...RAVENSBURG, elevationM: 450 };

  it('gives the bearing and the elevation angle with the Earth curvature and refraction', () => {
    const at = deadReckon({ ...RAVENSBURG, speedKt: 0, track: 0 }, 0);
    // 50 km due east of the observer at 10 km: 10.62° up.
    const east = { lat: at.lat, lon: RAVENSBURG.lon + 50_000 / (6_371_000 * Math.cos(RAVENSBURG.lat * Math.PI / 180)) * 180 / Math.PI };
    const view = getAircraftView(observer, aircraft({ ...east, altM: 10_000 }), 0);
    expect(view.azimuth).toBeCloseTo(90, 0);
    expect(view.distanceM / 1000).toBeCloseTo(50, 0);
    expect(view.elevation).toBeCloseTo(10.62, 1);
    // Over Zurich (92 km, 241°) at 10 km: low in the south-west.
    const zurich = getAircraftView(observer, aircraft(), 0);
    expect(zurich.azimuth).toBeCloseTo(241.2, 1);
    expect(zurich.elevation).toBeGreaterThan(5);
    expect(zurich.elevation).toBeLessThan(6);
  });

  it('dead-reckons the position age and the time since the data', () => {
    const ac = aircraft({ lat: 47.781, lon: 9.4, speedKt: 480, track: 90, ageSec: 5 });
    const now = getAircraftView(observer, ac, 0);
    const later = getAircraftView(observer, ac, 15);
    // Flying east toward the observer from the west: it gets closer.
    expect(later.distanceM).toBeLessThan(now.distanceM);
    expect(now.distanceM - later.distanceM).toBeCloseTo(480 * 0.514444 * 15, -1);
  });
});

describe('isAircraftVisible', () => {
  it('hides an aircraft below 5° (too near the horizon, item 110) or behind the terrain', () => {
    expect(MIN_ELEVATION_DEG).toBe(5);
    expect(isAircraftVisible({ azimuth: 10, elevation: 4.9, distanceM: 1 }, null)).toBe(false);
    expect(isAircraftVisible({ azimuth: 10, elevation: 5, distanceM: 1 }, null)).toBe(true);
    expect(isAircraftVisible({ azimuth: 10, elevation: 7, distanceM: 1 }, flatProfile(8))).toBe(false);
    expect(isAircraftVisible({ azimuth: 10, elevation: 9, distanceM: 1 }, flatProfile(8))).toBe(true);
  });
});

describe('pickNearestVisible', () => {
  const item = (distanceKm: number, elevation: number, altM = 10_000, azimuth = 180) =>
    ({ ac: { altM }, view: { azimuth, elevation, distanceM: distanceKm * 1000 }, id: `${distanceKm}-${altM}` });

  it('sorts all the visible ones by slant distance, nearest first; `max` cuts the list', () => {
    const items = Array.from({ length: 20 }, (_, i) => item(100 - i * 4, 6));
    const picked = pickNearestVisible(items, 450, null);
    expect(picked).toHaveLength(20);
    expect(picked.map(p => p.view.distanceM / 1000).slice(0, 3)).toEqual([24, 28, 32]);
    expect(pickNearestVisible(items, 450, null, 12)).toHaveLength(12);
  });

  it('measures the slant distance with the height: a high plane overhead is farther than a low one beside it', () => {
    expect(slantDistanceM({ azimuth: 0, elevation: 80, distanceM: 2_000 }, 11_450, 450)).toBeCloseTo(Math.hypot(2_000, 11_000));
    const picked = pickNearestVisible([item(2, 80, 11_450), item(8, 30, 3_000)], 450, null, 1);
    expect(picked[0].id).toBe('8-3000');
  });

  it('picks only among the visible ones: one below 5° or behind the terrain leaves its place to the next', () => {
    const ridge: HorizonProfile = { ...flatProfile(0), angles: Array.from({ length: 360 }, (_, az) => (az === 90 ? 20 : 0)) };
    const items = [item(10, 4), item(12, 15, 10_000, 90), ...Array.from({ length: 12 }, (_, i) => item(20 + i, 6))];
    const picked = pickNearestVisible(items, 450, ridge);
    expect(picked.map(p => p.view.distanceM / 1000)).toEqual(Array.from({ length: 12 }, (_, i) => 20 + i));
  });
});

describe('pickShownPlanes (item 110, SUN-CHASER-13)', () => {
  // Nearest first, as pickNearestVisible gives them.
  const plane = (id: string, screenSpeedPxS: number, inView = true, slantM = 10_000) => ({ ac: { hex: id }, id, screenSpeedPxS, inView, slantM });

  it('in the normal view shows the 2 nearest that visibly move: a plane that hangs in the air leaves its place to the next', () => {
    expect(MAX_NORMAL_PLANES).toBe(2);
    expect(MIN_SCREEN_SPEED_PX_S).toBe(1);
    const nearest = [plane('still', 0.2), plane('a', 1.5), plane('slow', 0.99), plane('b', 1), plane('c', 4)];
    expect(pickShownPlanes(nearest, false).map(p => p.id)).toEqual(['a', 'b']);
    expect(pickShownPlanes([plane('still', 0), plane('slow', 0.5)], false)).toEqual([]);
  });

  it('in compass mode shows every plane in the field of view, moving or not, up to 40', () => {
    expect(MAX_COMPASS_PLANES).toBe(40);
    const nearest = [plane('still', 0), plane('behind', 3, false), ...Array.from({ length: 14 }, (_, i) => plane(`p${i}`, 0.3))];
    const shown = pickShownPlanes(nearest, true);
    expect(shown).toHaveLength(15);
    expect(shown.map(p => p.id)).not.toContain('behind');
    expect(pickShownPlanes(Array.from({ length: 60 }, (_, i) => plane(`p${i}`, 0)), true)).toHaveLength(40);
  });

  it('does not show a plane outside the field of view in the normal view either', () => {
    expect(pickShownPlanes([plane('off', 5, false), plane('on', 5)], false).map(p => p.id)).toEqual(['on']);
  });
});

// Item 159, S1 of the plane lookbook: a sticky pick in the normal view.
describe('pickShownPlanes: the sticky pick (item 159, S1)', () => {
  const plane = (id: string, km: number, screenSpeedPxS = 2, inView = true) => ({ ac: { hex: id }, id, screenSpeedPxS, inView, slantM: km * 1000 });
  const ids = (shown: { id: string }[]) => shown.map(p => p.id);

  it('keeps a shown plane while it is visible and in view, also when a new one is a little nearer', () => {
    const nearest = [plane('a', 10), plane('c', 11), plane('b', 12)];
    expect(ids(pickShownPlanes(nearest, false))).toEqual(['a', 'c']);
    expect(ids(pickShownPlanes(nearest, false, new Set(['a', 'b'])))).toEqual(['a', 'b']);
    // b is out of view now, or no longer visible (not in the list): c takes its place.
    expect(ids(pickShownPlanes([plane('a', 10), plane('c', 11), plane('b', 12, 2, false)], false, new Set(['a', 'b'])))).toEqual(['a', 'c']);
    expect(ids(pickShownPlanes([plane('a', 10), plane('c', 11)], false, new Set(['a', 'b'])))).toEqual(['a', 'c']);
  });

  it('lets a new plane take the place of the farthest shown one only when it is 25 % nearer', () => {
    expect(SWAP_NEARER_RATIO).toBe(0.75);
    const shownBefore = new Set(['a', 'b']);
    expect(ids(pickShownPlanes([plane('c', 15.001), plane('b', 16), plane('a', 20)], false, shownBefore))).toEqual(['b', 'a']);
    expect(ids(pickShownPlanes([plane('c', 15), plane('b', 16), plane('a', 20)], false, shownBefore))).toEqual(['c', 'b']);
    // Two new ones, both much nearer: both come in.
    expect(ids(pickShownPlanes([plane('c', 5), plane('d', 6), plane('b', 16), plane('a', 20)], false, shownBefore))).toEqual(['c', 'd']);
  });

  it('keeps a shown plane down to 0.6 px/s; a new one still needs 1 px/s', () => {
    expect(STICKY_SCREEN_SPEED_PX_S).toBe(0.6);
    expect(ids(pickShownPlanes([plane('a', 10, 0.6), plane('b', 12, 0.7)], false, new Set(['a'])))).toEqual(['a']);
    expect(ids(pickShownPlanes([plane('a', 10, 0.59), plane('b', 12, 1)], false, new Set(['a'])))).toEqual(['b']);
  });

  it('keeps at most 2 after the compass view, the nearest; the compass view itself shows all in view', () => {
    const nearest = [plane('a', 10, 0.8), plane('b', 11, 0.8), plane('c', 12, 0.8), plane('d', 13, 0.1)];
    expect(ids(pickShownPlanes(nearest, false, new Set(['a', 'b', 'c', 'd'])))).toEqual(['a', 'b']);
    expect(ids(pickShownPlanes(nearest, true, new Set(['d'])))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('the card and the look', () => {
  it('applies the contrail rule above 8 km only', () => {
    expect(getLiveContrail(10_500, 'persistent')).toBe('persistent');
    expect(getLiveContrail(7_900, 'persistent')).toBe('none');
  });

  it('names the airline from the callsign prefix, from a small table', () => {
    expect(getAirlineName('DLH4KL')).toBe('Lufthansa');
    expect(getAirlineName('EZY45QJ')).toBe('easyJet');
    expect(getAirlineName('SWR47W')).toBe('Swiss');
    expect(getAirlineName('DEIAB')).toBeNull(); // a registration
    expect(getAirlineName('XYZ123')).toBeNull();
    expect(getAirlineName(null)).toBeNull();
    expect(AIRLINE_COUNT).toBeGreaterThanOrEqual(40);
    expect(AIRLINE_COUNT).toBeLessThanOrEqual(70);
  });

  // Item 159, Z3 of the plane lookbook: (25 km / slant)^0.8, 0.4-1.8 × the 18 px silhouette.
  it('draws a plane bigger by its slant distance, near true perspective', () => {
    expect(getLivePlaneScale(25_000)).toBe(1);
    expect(getLivePlaneScale(50_000)).toBeCloseTo(0.5 ** 0.8, 6);
    expect(getLivePlaneScale(10_000)).toBe(1.8);
    expect(getLivePlaneScale(150_000)).toBe(0.4);
    // The lookbook's pass: 7.8 px at 71 km, 24.1 px at the closest point, 17.4 km.
    expect(PLANE_WIDTH_PX * getLivePlaneScale(71_200)).toBeCloseTo(7.8, 1);
    expect(PLANE_WIDTH_PX * getLivePlaneScale(17_400)).toBeCloseTo(24.1, 1);
    expect(getLivePlaneScale(20_000)).toBeGreaterThan(getLivePlaneScale(21_000));
  });

  it('smooths the scale with a 1 s time constant, with no overshoot', () => {
    expect(smoothPlaneScale(1, 1.8, 0)).toBe(1);
    expect(smoothPlaneScale(1, 1.8, 0.25)).toBeCloseTo(1 + 0.8 * (1 - Math.exp(-0.25)), 6);
    expect(smoothPlaneScale(1, 1.8, 1)).toBeCloseTo(1 + 0.8 * (1 - Math.exp(-1)), 6);
    expect(smoothPlaneScale(1.8, 1, 60)).toBeCloseTo(1, 6);
    expect(smoothPlaneScale(1, 1.8, -5)).toBe(1); // a clock that goes back: no change
  });

  it('sends only the place rounded to 0.1° to the proxy', () => {
    expect(planeFeedUrl(47.78123, 9.61234)).toBe('/api/planes?lat=47.8&lon=9.6');
    expect(planeFeedUrl(-33.86, -0.04)).toBe('/api/planes?lat=-33.9&lon=0.0');
  });
});

// Item 155: the Sentry tag `live-planes`, so a feedback event tells if the radar ran and found planes.
describe('getLivePlanesTag', () => {
  it('is off without a status, the status while loading or after a failure, else ok-<shown>/<nearby>', () => {
    expect(getLivePlanesTag(null, 0, 0)).toBe('off');
    expect(getLivePlanesTag('loading', 0, 0)).toBe('loading');
    expect(getLivePlanesTag('error', 1, 27)).toBe('error');
    expect(getLivePlanesTag('ok', 0, 27)).toBe('ok-0/27');
    expect(getLivePlanesTag('ok', 2, 27)).toBe('ok-2/27');
  });
});
