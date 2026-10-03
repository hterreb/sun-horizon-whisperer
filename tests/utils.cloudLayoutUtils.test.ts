import {
  getCloudMoonlight,
  getCloudDriftDirection,
  getPrecipitationSlantPx,
} from '../src/utils/cloudLayoutUtils';

describe('getCloudMoonlight (ROADMAP items 76 and 84)', () => {
  const moon = { x: 400, y: 180, r: 20 }; // px

  it("centres the light on the moon in the cloud's own svg units", () => {
    // An unscaled cloud centred at (420, 180): the moon sits at (40, 30) in its 120 × 60 box.
    const light = getCloudMoonlight({ x: 420, y: 180, scale: 1 }, moon);
    expect(light?.cx).toBeCloseTo(40);
    expect(light?.cy).toBeCloseTo(30);
    expect(light?.r).toBeCloseTo(90); // 4.5 × the radius
  });

  it("accounts for the cloud's scale around its centre", () => {
    const light = getCloudMoonlight({ x: 420, y: 180, scale: 0.5 }, moon);
    expect(light?.cx).toBeCloseTo(20);
    expect(light?.r).toBeCloseTo(180);
  });

  it('is null for a cloud the light does not reach', () => {
    expect(getCloudMoonlight({ x: 100, y: 40, scale: 1 }, moon)).toBeNull();
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
