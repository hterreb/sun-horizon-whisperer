import * as satellite from 'satellite.js';
import fixture from './fixtures/iss-omm-2026-10-05.json';
import {
  CANDIDATE_STEP_MS,
  EARTH_RADIUS_KM,
  FADE_MS,
  ISS_NORAD_ID,
  MAX_EPOCH_AGE_MS,
  NIGHT_GAP_FACTOR,
  SPAWN_GAP_MS,
  directionKey,
  findNextPass,
  getCandidateSatellites,
  getDotGapMs,
  getPassReminderText,
  getSatelliteCard,
  getSatelliteDetails,
  getSatelliteMagnitude,
  getSatelliteOpacity,
  getSkySatellites,
  isInEarthShadow,
  isPassReminderDue,
  isSatelliteVisible,
  isSatelliteWeather,
  makeDotPath,
  sunDirectionEcf,
  toTrackedSatellites,
  type SatellitePass,
} from '../src/utils/satelliteUtils';
import { getSunTimes } from '../src/utils/sunUtils';
import { type GpRecord } from '../src/utils/satelliteData';

const [iss] = toTrackedSatellites(satellite, [fixture.omm as unknown as GpRecord]);
const sydney = fixture.reference.observer;
const [refFull, refFromShadow, refMorning, refIntoShadow] = fixture.reference.passes;
const MIN = 60_000;

// 16-point compass names of heavens-above, as azimuth ranges.
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass16 = (azimuth: number) => COMPASS[Math.round(azimuth / 22.5) % 16];

describe('isInEarthShadow (ROADMAP item 97)', () => {
  const sun = { x: 1, y: 0, z: 0 };

  it('is lit on the sun side of the Earth', () => {
    expect(isInEarthShadow({ x: EARTH_RADIUS_KM + 400, y: 0, z: 0 }, sun)).toBe(false);
  });

  it('is in the shadow straight behind the Earth', () => {
    expect(isInEarthShadow({ x: -(EARTH_RADIUS_KM + 400), y: 0, z: 0 }, sun)).toBe(true);
  });

  it('is lit behind the Earth but outside the cylinder', () => {
    expect(isInEarthShadow({ x: -3000, y: EARTH_RADIUS_KM + 10, z: 0 }, sun)).toBe(false);
    expect(isInEarthShadow({ x: -3000, y: 0, z: -(EARTH_RADIUS_KM - 10) }, sun)).toBe(true);
  });

  it('is lit beside the Earth at the terminator', () => {
    expect(isInEarthShadow({ x: 0, y: EARTH_RADIUS_KM + 400, z: 0 }, sun)).toBe(false);
  });
});

describe('sunDirectionEcf', () => {
  it('points up from the observer for a sun in the zenith', () => {
    const d = sunDirectionEcf(0, 90, 0, 0);
    expect(d.x).toBeCloseTo(1);
    expect(d.y).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(0);
  });

  it('points north for a sun on the north horizon at the equator', () => {
    const d = sunDirectionEcf(0, 0, 0, 90);
    expect(d.z).toBeCloseTo(1);
  });

  it('points east for a sun on the east horizon at longitude 0', () => {
    const d = sunDirectionEcf(90, 0, 45, 0);
    expect(d.y).toBeCloseTo(1);
  });
});

describe('isSatelliteVisible (the visibility rule)', () => {
  const ok = { elevation: 30, sunAltitude: -10, sunlit: true };

  it('is visible above 10°, with the sun below -6° and the satellite in sunlight', () => {
    expect(isSatelliteVisible(ok)).toBe(true);
  });

  it('is not visible at or below 10° elevation', () => {
    expect(isSatelliteVisible({ ...ok, elevation: 10 })).toBe(false);
    expect(isSatelliteVisible({ ...ok, elevation: 9.9 })).toBe(false);
  });

  it('is not visible while the sun is at or above -6°', () => {
    expect(isSatelliteVisible({ ...ok, sunAltitude: -6 })).toBe(false);
    expect(isSatelliteVisible({ ...ok, sunAltitude: -5 })).toBe(false);
  });

  it('is not visible in the Earth\'s shadow', () => {
    expect(isSatelliteVisible({ ...ok, sunlit: false })).toBe(false);
  });
});

describe('brightness from the distance', () => {
  it('makes a nearer satellite brighter', () => {
    expect(getSatelliteMagnitude(1, 500)).toBeLessThan(getSatelliteMagnitude(1, 1500));
  });

  it('makes the ISS brighter than another satellite at the same distance', () => {
    expect(getSatelliteMagnitude(ISS_NORAD_ID, 800)).toBeLessThan(getSatelliteMagnitude(1, 800));
    expect(getSatelliteOpacity(getSatelliteMagnitude(ISS_NORAD_ID, 800))).toBe(1);
    expect(getSatelliteOpacity(getSatelliteMagnitude(1, 800))).toBeLessThan(1);
  });

  it('keeps a faint satellite at the least opacity', () => {
    expect(getSatelliteOpacity(8)).toBe(0.25);
  });
});

describe('findNextPass against heavens-above (ISS, Sydney, elements of 5 Oct 2026)', () => {
  const near = (actual: Date, expected: string) =>
    expect(Math.abs(actual.getTime() - Date.parse(expected))).toBeLessThanOrEqual(MIN);

  it('finds the full pass of 6 Oct 18:43 UTC within 1 min and 2°', () => {
    const pass = findNextPass(satellite, iss.satrec, new Date('2026-10-06T18:00:00Z'), sydney)!;
    expect(pass).not.toBeNull();
    near(pass.start, refFull.start);
    near(pass.maxAt, refFull.max);
    near(pass.end, refFull.end);
    expect(Math.abs(pass.maxElevation - refFull.maxElevation)).toBeLessThanOrEqual(2);
    expect(compass16(pass.startAzimuth)).toBe(refFull.startDir);
    expect(compass16(pass.endAzimuth)).toBe(refFull.endDir);
    expect(pass.inProgress).toBe(false);
  });

  it('starts a pass where the ISS comes out of the Earth\'s shadow (7 Oct 17:59 UTC, at 41°)', () => {
    const pass = findNextPass(satellite, iss.satrec, new Date('2026-10-07T17:30:00Z'), sydney)!;
    near(pass.start, refFromShadow.start);
    near(pass.end, refFromShadow.end);
    expect(Math.abs(pass.startElevation - refFromShadow.startElevation)).toBeLessThanOrEqual(2);
    expect(Math.abs(pass.maxElevation - refFromShadow.maxElevation)).toBeLessThanOrEqual(2);
  });

  it('ends a pass where the ISS enters the Earth\'s shadow (7 Oct 09:47 UTC, at 23°)', () => {
    const pass = findNextPass(satellite, iss.satrec, new Date('2026-10-07T09:30:00Z'), sydney)!;
    near(pass.start, refIntoShadow.start);
    near(pass.end, refIntoShadow.end);
    expect(Math.abs(pass.endElevation - refIntoShadow.endElevation)).toBeLessThanOrEqual(2);
    expect(compass16(pass.endAzimuth)).toBe(refIntoShadow.endDir);
  });

  it('finds the earlier pass first, and reports a pass in progress', () => {
    const first = findNextPass(satellite, iss.satrec, new Date('2026-10-06T16:00:00Z'), sydney)!;
    near(first.start, refMorning.start);
    near(first.end, refMorning.end);
    const during = findNextPass(satellite, iss.satrec, new Date('2026-10-06T18:45:00Z'), sydney)!;
    expect(during.inProgress).toBe(true);
    near(during.end, refFull.end);
  });

  it('returns null when there is no pass in the search window', () => {
    // 6 Oct 08:00-14:00 UTC is daytime in Sydney.
    expect(findNextPass(satellite, iss.satrec, new Date('2026-10-06T08:00:00Z'), sydney, 6)).toBeNull();
  });
});

describe('getSkySatellites', () => {
  it('shows the ISS at the top of the pass, high in the north-west', () => {
    const [sky] = getSkySatellites(satellite, [iss], new Date(refFull.max), sydney);
    expect(sky.id).toBe(ISS_NORAD_ID);
    expect(sky.visible).toBe(true);
    expect(Math.abs(sky.elevation - refFull.maxElevation)).toBeLessThanOrEqual(2);
    expect(compass16(sky.azimuth)).toBe(refFull.maxDir);
  });

  it('keeps a satellite for FADE_MS after it stops being visible, so it can fade out', () => {
    const end = Date.parse(refFull.end);
    const [fading] = getSkySatellites(satellite, [iss], new Date(end + 3000), sydney);
    expect(fading.visible).toBe(false);
    expect(getSkySatellites(satellite, [iss], new Date(end + FADE_MS + 2000), sydney)).toEqual([]);
  });

  it('computes nothing while the sun is above -6°', () => {
    expect(getSkySatellites(satellite, [iss], new Date('2026-10-06T02:00:00Z'), sydney)).toEqual([]);
  });

  it('leaves out positions far from the data\'s epoch (time travel)', () => {
    const late = new Date(iss.epochMs + MAX_EPOCH_AGE_MS + 3_600_000);
    expect(getSkySatellites(satellite, [iss], late, sydney)).toEqual([]);
  });
});

describe('getSatelliteDetails', () => {
  it('gives the ISS height and speed', () => {
    const details = getSatelliteDetails(satellite, iss.satrec, new Date(refFull.start), sydney)!;
    expect(details.heightKm).toBeGreaterThan(400);
    expect(details.heightKm).toBeLessThan(440);
    expect(details.speedKmS).toBeGreaterThan(7.5);
    expect(details.speedKmS).toBeLessThan(7.8);
  });

  it('gives the time until the ISS enters the shadow, to the second', () => {
    // Just after the ISS comes out of the shadow (6 Oct 17:10 UTC): lit for most of the orbit.
    const now = new Date('2026-10-06T17:11:00Z');
    const details = getSatelliteDetails(satellite, iss.satrec, now, sydney)!;
    expect(details.sunlit).toBe(true);
    expect(details.shadowInMs).toBeGreaterThan(20 * MIN);
    expect(details.shadowInMs).toBeLessThan(92 * MIN); // one orbit
    const at = (ms: number) => getSatelliteDetails(satellite, iss.satrec, new Date(now.getTime() + details.shadowInMs! + ms), sydney)!;
    expect(at(-3000).sunlit).toBe(true);
    expect(at(3000).sunlit).toBe(false);
  });

  it('gives no shadow time while the ISS is in the shadow', () => {
    // A minute before the 7 Oct pass starts, the ISS is still in the Earth's shadow.
    const details = getSatelliteDetails(satellite, iss.satrec, new Date(Date.parse(refFromShadow.start) - MIN), sydney)!;
    expect(details.sunlit).toBe(false);
    expect(details.shadowInMs).toBeNull();
  });
});

describe('getCandidateSatellites', () => {
  it('keeps a satellite that rises within the next 30 s, and drops one far below the horizon', () => {
    // The ISS rises above the horizon about 2 min before it reaches 10° (09:46:27 UTC).
    const rise = Date.parse(refIntoShadow.start) - 3 * MIN;
    expect(getCandidateSatellites(satellite, [iss], new Date(rise - CANDIDATE_STEP_MS), sydney)).toHaveLength(1);
    expect(getCandidateSatellites(satellite, [iss], new Date(Date.parse(refIntoShadow.start) - 30 * MIN), sydney)).toHaveLength(0);
  });
});

describe('getSatelliteCard', () => {
  it('gives the pass after the one in progress as the next pass', () => {
    const card = getSatelliteCard(satellite, iss, new Date('2026-10-06T18:45:00Z'), sydney);
    expect(card.details?.heightKm).toBeGreaterThan(400);
    expect(card.nextPass!.start.getTime()).toBeGreaterThan(Date.parse(refFull.end));
    expect(card.nextPass!.inProgress).toBe(false);
  });
});

describe('pass reminder', () => {
  const pass: SatellitePass = {
    start: new Date('2026-10-06T18:14:00Z'), end: new Date('2026-10-06T18:19:00Z'),
    startAzimuth: 270, startElevation: 10, endAzimuth: 135, endElevation: 10,
    maxElevation: 54.4, maxAt: new Date('2026-10-06T18:16:30Z'), inProgress: false,
  };

  it('is due from 10 min before the pass until it starts, once', () => {
    expect(isPassReminderDue(new Date('2026-10-06T18:03:59Z'), pass, null)).toBe(false);
    expect(isPassReminderDue(new Date('2026-10-06T18:04:00Z'), pass, null)).toBe(true);
    expect(isPassReminderDue(new Date('2026-10-06T18:13:59Z'), pass, null)).toBe(true);
    expect(isPassReminderDue(new Date('2026-10-06T18:14:00Z'), pass, null)).toBe(false);
    expect(isPassReminderDue(new Date('2026-10-06T18:05:00Z'), pass, String(Math.round(pass.start.getTime() / MIN)))).toBe(false);
  });

  it('is never due for a pass in progress or no pass', () => {
    expect(isPassReminderDue(new Date('2026-10-06T18:05:00Z'), { ...pass, inProgress: true }, null)).toBe(false);
    expect(isPassReminderDue(new Date('2026-10-06T18:05:00Z'), null, null)).toBe(false);
  });

  it('says when, from where to where, and how high', () => {
    const text = getPassReminderText(pass, 'en');
    expect(text).toContain('ISS visible at');
    expect(text).toContain('from W to SE');
    expect(text).toContain('up to 54°');
  });

  it('names the 8-point direction', () => {
    expect(directionKey(0)).toBe('direction.n');
    expect(directionKey(350)).toBe('direction.n');
    expect(directionKey(225)).toBe('direction.sw');
  });
});

describe('decorative dots (free part)', () => {
  const lat = 47.78, lon = 9.61;
  const times = getSunTimes(new Date('2026-10-06T12:00:00+02:00'), lat, lon);

  it('come only when the sun is below -6°', () => {
    expect(getDotGapMs(new Date(times.dusk.getTime() + MIN), -5.9, times)).toBeNull();
    expect(getDotGapMs(new Date(times.dusk.getTime() + MIN), -6.1, times)).toEqual(SPAWN_GAP_MS);
  });

  it('come every 2-4 min in the 2 h after dusk and before dawn, fewer at midnight', () => {
    expect(getDotGapMs(new Date(times.dusk.getTime() + 110 * MIN), -15, times)).toEqual(SPAWN_GAP_MS);
    expect(getDotGapMs(new Date(times.dawn.getTime() - 60 * MIN), -15, times)).toEqual(SPAWN_GAP_MS);
    const midnight = new Date('2026-10-07T01:00:00+02:00');
    expect(getDotGapMs(midnight, -40, times)).toEqual([SPAWN_GAP_MS[0] * NIGHT_GAP_FACTOR, SPAWN_GAP_MS[1] * NIGHT_GAP_FACTOR]);
  });

  it('show in a clear or partly cloudy sky only', () => {
    expect(isSatelliteWeather('clear')).toBe(true);
    expect(isSatelliteWeather('partly')).toBe(true);
    expect(isSatelliteWeather('cloudy')).toBe(false);
  });

  it('cross in a straight line at 0.1-0.3 % of the width per second', () => {
    const slow = makeDotPath([0.1, 0.2, 0.8, 0, 0.9]);
    expect(slow.x0).toBeLessThan(slow.x1);
    expect(slow.durationMs).toBeCloseTo((104 / 0.1) * 1000);
    expect(slow.fadeAt).toBe(1);
    const fast = makeDotPath([0.9, 0.2, 0.8, 1, 0.1]);
    expect(fast.x0).toBeGreaterThan(fast.x1);
    expect(fast.durationMs).toBeCloseTo((104 / 0.3) * 1000);
    expect(fast.fadeAt).toBeGreaterThan(0.3);
    expect(fast.fadeAt).toBeLessThan(0.75);
  });
});
