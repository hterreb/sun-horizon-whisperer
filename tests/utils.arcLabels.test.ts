import { describe, it, expect } from 'vitest';
import { getSunArcLabels, getMoonArcLabels } from '../src/utils/arcLabels';
import { getSunTimes, getSunPosition } from '../src/utils/sunUtils';
import { getMoonTimes, getMoonPosition } from '../src/utils/moonUtils';

describe('getSunArcLabels (arc rise/zenith/set labels)', () => {
  const latitude = 51.5;
  const longitude = 0;

  it('rise/set match the panel\'s own SunCalc sunrise/sunset, zenith matches solar noon', () => {
    const date = new Date('2026-06-21T12:00:00Z');
    const times = getSunTimes(date, latitude, longitude);
    const labels = getSunArcLabels(date, latitude, longitude);

    expect(labels.rise?.time).toEqual(times.sunrise);
    expect(labels.set?.time).toEqual(times.sunset);
    expect(labels.zenith?.time).toEqual(times.solarNoon);
  });

  it('reports the sun\'s real azimuth/altitude at each label\'s time', () => {
    const date = new Date('2026-06-21T12:00:00Z');
    const labels = getSunArcLabels(date, latitude, longitude);

    expect(labels.rise).not.toBeNull();
    expect(labels.zenith).not.toBeNull();
    expect(labels.set).not.toBeNull();
    const rise = labels.rise!;
    const zenith = labels.zenith!;
    const set = labels.set!;

    expect(rise).toEqual(expect.objectContaining(getSunPosition(rise.time, latitude, longitude)));
    expect(set).toEqual(expect.objectContaining(getSunPosition(set.time, latitude, longitude)));
    // Zenith is the day's highest point - well above both horizon endpoints.
    expect(zenith.altitude).toBeGreaterThan(rise.altitude);
    expect(zenith.altitude).toBeGreaterThan(set.altitude);
  });

  it('is stable regardless of which moment during the pass is asked for', () => {
    const morning = getSunArcLabels(new Date('2026-06-21T05:00:00Z'), latitude, longitude);
    const evening = getSunArcLabels(new Date('2026-06-21T19:00:00Z'), latitude, longitude);
    expect(morning.rise?.time).toEqual(evening.rise?.time);
    expect(morning.set?.time).toEqual(evening.set?.time);
    expect(morning.zenith?.time).toEqual(evening.zenith?.time);
  });

  it('polar day: rise/set are null (the pass has no horizon crossing)', () => {
    // Polar day at lat 78 in June (see utils.sunUtils.test.ts).
    const date = new Date(2026, 5, 21, 12, 0, 0, 0);
    const labels = getSunArcLabels(date, 78, 15);

    expect(labels.rise).toBeNull();
    expect(labels.set).toBeNull();
  });

  it('polar night: rise/set are null (the pass has no horizon crossing)', () => {
    const date = new Date(2026, 11, 21, 12, 0, 0, 0);
    const labels = getSunArcLabels(date, 78, 15);

    expect(labels.rise).toBeNull();
    expect(labels.set).toBeNull();
  });
});

describe('getMoonArcLabels (arc rise/zenith/set labels)', () => {
  const latitude = 48;
  const longitude = 11;

  it('rise/set match the panel\'s own getMoonTimes rise/set', () => {
    // Same day/location as utils.moonUtils.test.ts: rise ~02:52 UTC, set ~20:23 UTC.
    const date = new Date('2026-06-15T12:00:00Z');
    const times = getMoonTimes(date, latitude, longitude);
    const labels = getMoonArcLabels(date, latitude, longitude);

    expect(labels.rise?.time).toEqual(times.rise);
    expect(labels.set?.time).toEqual(times.set);
  });

  it('zenith is within ~2 minutes of the true altitude maximum across the pass', () => {
    const date = new Date('2026-06-15T12:00:00Z');
    const times = getMoonTimes(date, latitude, longitude);
    const labels = getMoonArcLabels(date, latitude, longitude);
    expect(labels.zenith).not.toBeNull();

    // Brute-force the true maximum by sampling every minute across the pass.
    const startMs = (times.rise as Date).getTime();
    const endMs = (times.set as Date).getTime();
    let bestMs = startMs;
    let bestAltitude = -Infinity;
    for (let ms = startMs; ms <= endMs; ms += 60 * 1000) {
      const altitude = getMoonPosition(new Date(ms), latitude, longitude).altitude;
      if (altitude > bestAltitude) {
        bestAltitude = altitude;
        bestMs = ms;
      }
    }

    const diffMinutes = Math.abs((labels.zenith!.time.getTime() - bestMs) / 60000);
    expect(diffMinutes).toBeLessThanOrEqual(2);
    expect(labels.zenith!.altitude).toBeGreaterThanOrEqual(bestAltitude - 0.1);
  });

  it('reports the moon\'s real azimuth/altitude at rise/set', () => {
    const date = new Date('2026-06-15T12:00:00Z');
    const labels = getMoonArcLabels(date, latitude, longitude);

    expect(labels.rise).toEqual(
      expect.objectContaining({
        azimuth: getMoonPosition(labels.rise!.time, latitude, longitude).azimuth,
        altitude: getMoonPosition(labels.rise!.time, latitude, longitude).altitude,
      })
    );
  });

  it('alwaysUp stretch: rise/set are null (the pass has no horizon crossing)', () => {
    // Verified alwaysUp in utils.moonUtils.test.ts (lat 78, Jan 2026).
    const date = new Date(Date.UTC(2026, 0, 2));
    const labels = getMoonArcLabels(date, 78, 15);

    expect(labels.rise).toBeNull();
    expect(labels.set).toBeNull();
    // The moon still has a highest point during the fallback window.
    expect(labels.zenith).not.toBeNull();
  });
});
