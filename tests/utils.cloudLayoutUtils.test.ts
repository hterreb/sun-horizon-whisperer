import {
  getCloudCount,
  getCloudOpacity,
  getCloudLayout,
  getCloudMoonlight,
  getCloudDriftDurationSec,
  getCloudDriftDirection,
  getPrecipitationSlantPx,
  CLOUD_MAX_COUNT,
  CLOUD_OPACITY_MIN,
  CLOUD_OPACITY_MAX,
} from '../src/utils/cloudLayoutUtils';

describe('getCloudCount (ROADMAP item 10)', () => {
  it('is 0 at 0% cover', () => {
    expect(getCloudCount(0)).toBe(0);
  });

  it('is CLOUD_MAX_COUNT at 100% cover', () => {
    expect(getCloudCount(100)).toBe(CLOUD_MAX_COUNT);
  });

  it('is at least 1 once cover is above 0%', () => {
    expect(getCloudCount(1)).toBeGreaterThanOrEqual(1);
  });

  it('clamps out-of-range input', () => {
    expect(getCloudCount(-10)).toBe(0);
    expect(getCloudCount(150)).toBe(CLOUD_MAX_COUNT);
  });

  it('scales roughly linearly with cover', () => {
    expect(getCloudCount(50)).toBeLessThan(getCloudCount(100));
    expect(getCloudCount(25)).toBeLessThan(getCloudCount(50));
  });
});

describe('getCloudOpacity (ROADMAP item 10)', () => {
  it('is the minimum at 0% cover', () => {
    expect(getCloudOpacity(0)).toBeCloseTo(CLOUD_OPACITY_MIN);
  });

  it('is the maximum at 100% cover', () => {
    expect(getCloudOpacity(100)).toBeCloseTo(CLOUD_OPACITY_MAX);
  });

  it('stays within [min, max] for out-of-range input', () => {
    expect(getCloudOpacity(-20)).toBeCloseTo(CLOUD_OPACITY_MIN);
    expect(getCloudOpacity(200)).toBeCloseTo(CLOUD_OPACITY_MAX);
  });
});

describe('getCloudLayout (ROADMAP item 10)', () => {
  const date = new Date('2026-06-01T12:00:00Z');

  it('is empty at 0% cover', () => {
    expect(getCloudLayout(0, date, 47.65, 9.48)).toEqual([]);
  });

  it('returns a layout with getCloudCount(cover) clouds', () => {
    const layout = getCloudLayout(60, date, 47.65, 9.48);
    expect(layout.length).toBe(getCloudCount(60));
  });

  it('is stable: same day + same rounded location -> the same layout', () => {
    const a = getCloudLayout(60, date, 47.65, 9.48);
    const b = getCloudLayout(60, date, 47.65, 9.48);
    expect(a).toEqual(b);
  });

  it('differs for a different day', () => {
    const tomorrow = new Date('2026-06-02T12:00:00Z');
    const a = getCloudLayout(60, date, 47.65, 9.48);
    const b = getCloudLayout(60, tomorrow, 47.65, 9.48);
    expect(a).not.toEqual(b);
  });

  it('differs for a different location', () => {
    const a = getCloudLayout(60, date, 47.65, 9.48);
    const b = getCloudLayout(60, date, -33.9, 18.4);
    expect(a).not.toEqual(b);
  });

  it('every cloud has finite x/y/scale', () => {
    const layout = getCloudLayout(80, date, 0, 0);
    for (const cloud of layout) {
      expect(Number.isFinite(cloud.x)).toBe(true);
      expect(Number.isFinite(cloud.y)).toBe(true);
      expect(Number.isFinite(cloud.scale)).toBe(true);
    }
  });
});

describe('getCloudMoonlight (ROADMAP item 76, X2)', () => {
  const moon = { x: 50, y: 30, r: 20 }; // at (400, 180) px in an 800 × 600 scene

  it("centres the light on the moon in the cloud's own svg units", () => {
    // An unscaled cloud whose box starts at (360, 150): the moon sits at (40, 30) in it.
    const light = getCloudMoonlight({ id: 0, x: 45, y: 25, scale: 1 }, moon, 800, 600);
    expect(light?.cx).toBeCloseTo(40);
    expect(light?.cy).toBeCloseTo(30);
    expect(light?.r).toBeCloseTo(90); // 4.5 × the radius
  });

  it("accounts for the cloud's scale around its centre", () => {
    const light = getCloudMoonlight({ id: 0, x: 45, y: 25, scale: 0.5 }, moon, 800, 600);
    expect(light?.cx).toBeCloseTo(20);
    expect(light?.r).toBeCloseTo(180);
  });

  it('is null for a cloud the light does not reach', () => {
    expect(getCloudMoonlight({ id: 0, x: 5, y: 5, scale: 1 }, moon, 800, 600)).toBeNull();
  });
});

describe('getCloudDriftDurationSec (ROADMAP item 10)', () => {
  it('drifts slowest at no wind', () => {
    const calm = getCloudDriftDurationSec(0);
    const breezy = getCloudDriftDurationSec(20);
    expect(calm).toBeGreaterThan(breezy);
  });

  it('caps out at high wind speeds (stays calm even in a storm)', () => {
    const capped = getCloudDriftDurationSec(50);
    const overCap = getCloudDriftDurationSec(200);
    expect(overCap).toBeCloseTo(capped);
  });

  it('treats null/undefined wind as calm', () => {
    expect(getCloudDriftDurationSec(null)).toBeCloseTo(getCloudDriftDurationSec(0));
    expect(getCloudDriftDurationSec(undefined)).toBeCloseTo(getCloudDriftDurationSec(0));
  });

  it('never drifts faster than a gentle glide', () => {
    // Even fully capped, a full traverse still takes at least a minute - "slow and calm".
    expect(getCloudDriftDurationSec(1000)).toBeGreaterThan(60);
  });
});

describe('getCloudDriftDirection (ROADMAP item 10)', () => {
  it('wind from the east blows clouds westward (screen left)', () => {
    expect(getCloudDriftDirection(90)).toBe(-1);
  });

  it('wind from the west blows clouds eastward (screen right)', () => {
    expect(getCloudDriftDirection(270)).toBe(1);
  });

  it('defaults to +1 for missing/invalid direction', () => {
    expect(getCloudDriftDirection(null)).toBe(1);
    expect(getCloudDriftDirection(undefined)).toBe(1);
    expect(getCloudDriftDirection(NaN)).toBe(1);
  });
});

describe('getPrecipitationSlantPx (ROADMAP item 10)', () => {
  it('is 0 at no wind', () => {
    expect(getPrecipitationSlantPx(0, 90)).toBeCloseTo(0);
  });

  it('slants in the direction wind blows toward', () => {
    expect(getPrecipitationSlantPx(30, 90)).toBeLessThan(0);
    expect(getPrecipitationSlantPx(30, 270)).toBeGreaterThan(0);
  });

  it('caps the slant magnitude at high wind speed', () => {
    const capped = Math.abs(getPrecipitationSlantPx(40, 270));
    const overCap = Math.abs(getPrecipitationSlantPx(200, 270));
    expect(overCap).toBeCloseTo(capped);
  });
});
