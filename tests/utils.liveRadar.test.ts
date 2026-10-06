import { describe, it, expect } from 'vitest';
import {
  AIRLINE_COUNT, MAX_LIVE_PLANES, deadReckon, distanceAndBearing, getAircraftView, getAirlineName, getLiveContrail, getLivePlaneWidth, pickNearestVisible, slantDistanceM,
  isAircraftVisible, planeFeedUrl,
} from '@/utils/liveRadar';
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
  it('hides an aircraft below 1° or behind the terrain', () => {
    expect(isAircraftVisible({ azimuth: 10, elevation: 0.9, distanceM: 1 }, null)).toBe(false);
    expect(isAircraftVisible({ azimuth: 10, elevation: 1, distanceM: 1 }, null)).toBe(true);
    expect(isAircraftVisible({ azimuth: 10, elevation: 4, distanceM: 1 }, flatProfile(5))).toBe(false);
    expect(isAircraftVisible({ azimuth: 10, elevation: 6, distanceM: 1 }, flatProfile(5))).toBe(true);
  });
});

describe('pickNearestVisible (Lutz, 2026-10-06: the 12 nearest)', () => {
  const item = (distanceKm: number, elevation: number, altM = 10_000, azimuth = 180) =>
    ({ ac: { altM }, view: { azimuth, elevation, distanceM: distanceKm * 1000 }, id: `${distanceKm}-${altM}` });

  it('keeps the 12 nearest by slant distance', () => {
    expect(MAX_LIVE_PLANES).toBe(12);
    const items = Array.from({ length: 20 }, (_, i) => item(100 - i * 4, 5));
    const picked = pickNearestVisible(items, 450, null);
    expect(picked).toHaveLength(12);
    expect(picked.map(p => p.view.distanceM / 1000)).toEqual([24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68]);
  });

  it('measures the slant distance with the height: a high plane overhead is farther than a low one beside it', () => {
    expect(slantDistanceM({ azimuth: 0, elevation: 80, distanceM: 2_000 }, 11_450, 450)).toBeCloseTo(Math.hypot(2_000, 11_000));
    const picked = pickNearestVisible([item(2, 80, 11_450), item(8, 30, 3_000)], 450, null, 1);
    expect(picked[0].id).toBe('8-3000');
  });

  it('picks only among the visible ones: one below 1° or behind the terrain leaves its place to the next', () => {
    const ridge: HorizonProfile = { ...flatProfile(0), angles: Array.from({ length: 360 }, (_, az) => (az === 90 ? 20 : 0)) };
    const items = [item(10, 0.5), item(12, 15, 10_000, 90), ...Array.from({ length: 12 }, (_, i) => item(20 + i, 5))];
    const picked = pickNearestVisible(items, 450, ridge);
    expect(picked).toHaveLength(12);
    expect(picked.map(p => p.view.distanceM / 1000)).toEqual(Array.from({ length: 12 }, (_, i) => 20 + i));
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

  it('draws nearer planes bigger', () => {
    expect(getLivePlaneWidth(10_000)).toBe(18);
    expect(getLivePlaneWidth(100_000)).toBe(11);
  });

  it('sends only the place rounded to 0.1° to the proxy', () => {
    expect(planeFeedUrl(47.78123, 9.61234)).toBe('/api/planes?lat=47.8&lon=9.6');
    expect(planeFeedUrl(-33.86, -0.04)).toBe('/api/planes?lat=-33.9&lon=0.0');
  });
});
