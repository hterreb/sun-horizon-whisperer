import {
  getPrecipitationMmH, getRainMmH, getRainIntensity, getRainLook, getRainMistOpacity, getRainSkyMix, getRainAngleDeg,
  getRainWaterY, placeRainDrop, stepRainDrops, MAX_RAIN_DROPS, getRainSoundGain, type RainDrop, type RainScene,
} from '../src/utils/rainUtils';

// A small seeded random, so the drop tests are repeatable.
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe('rain amount (ROADMAP item 77, X1)', () => {
  it('turns the amount per interval into mm/h', () => {
    expect(getPrecipitationMmH(0.5, 900, 63)).toBe(2);
    expect(getPrecipitationMmH(1, 3600, 61)).toBe(1);
    expect(getPrecipitationMmH(0.25, undefined, 61)).toBe(1); // Open-Meteo's interval is 900 s
  });

  it('takes the amount from the weather code without a measured one', () => {
    expect([51, 53, 55].map(code => getPrecipitationMmH(0, 900, code))).toEqual([0.2, 0.4, 0.8]);
    expect([61, 63, 65].map(code => getPrecipitationMmH(null, 900, code))).toEqual([1.5, 4, 10]);
    expect([80, 81, 82].map(code => getPrecipitationMmH(undefined, undefined, code))).toEqual([2, 6, 20]);
    expect([95, 96, 99].map(code => getPrecipitationMmH(0, 900, code))).toEqual([10, 10, 10]);
    expect(getPrecipitationMmH(0, 900, 0)).toBeNull();
  });

  it("draws drizzle, rain and storm with the amount, or the type's middle value", () => {
    expect(getRainMmH('rain', 7)).toBe(7);
    expect(getRainMmH('drizzle', null)).toBe(0.4);
    expect(getRainMmH('rain', 0)).toBe(4);
    expect(getRainMmH('storm', undefined)).toBe(10);
    for (const type of ['clear', 'cloudy', 'overcast', 'fog', 'snow', 'hail'] as const) expect(getRainMmH(type, 5)).toBeNull();
  });

  it('gives the spec table per 430 px of width', () => {
    const rows = [0.2, 1, 4, 10, 20].map(mmH => {
      const look = getRainLook(mmH, 430);
      return [+look.t.toFixed(2), look.drops, Math.round(look.nearLengthPx), Math.round(look.opacity * 100), +look.fallSec.toFixed(1),
        +getRainSkyMix(mmH).toFixed(2), +getRainMistOpacity(mmH).toFixed(2)];
    });
    expect(rows).toEqual([
      [0.13, 102, 8, 33, 2.8, 0.45, 0.32],
      [0.43, 199, 14, 44, 2.4, 0.55, 0.47],
      [0.7, 283, 19, 54, 2, 0.64, 0.6],
      [0.87, 338, 22, 60, 1.8, 0.7, 0.68],
      [1, 380, 24, 65, 1.6, 0.75, 0.75],
    ]);
  });

  it('clamps t and caps the drops on wide screens', () => {
    expect(getRainIntensity(0.01)).toBe(0);
    expect(getRainIntensity(50)).toBe(1);
    expect(getRainLook(4, 860).drops).toBe(566);
    expect(getRainLook(20, 1920).drops).toBe(MAX_RAIN_DROPS);
  });
});

describe('rain angle (ROADMAP item 77, X2)', () => {
  it('falls straight without wind and tilts 0.6° per km/h, at most 35°', () => {
    expect(getRainAngleDeg(0, 270, false)).toBe(0);
    expect(getRainAngleDeg(null, null, false)).toBe(0);
    expect(getRainAngleDeg(50, 270, false)).toBeCloseTo(30);
    expect(getRainAngleDeg(80, 270, false)).toBe(35);
  });

  it('tilts drizzle 1.4 × as much, at most 45°', () => {
    expect(getRainAngleDeg(30, 270, true)).toBeCloseTo(25.2);
    expect(getRainAngleDeg(60, 270, true)).toBe(45);
  });

  it('falls away from the side the wind comes from', () => {
    expect(getRainAngleDeg(50, 270, false)).toBeGreaterThan(0); // from the west: leans right
    expect(getRainAngleDeg(50, 90, false)).toBeLessThan(0); // from the east: leans left
  });
});

describe('rain drops (ROADMAP item 77, R6)', () => {
  const scene: RainScene = { width: 390, height: 844, horizonY: 844 * 0.65, tan: Math.tan((30 * Math.PI) / 180) };
  const make = (n: number, toWater: boolean, random: () => number): RainDrop[] =>
    Array.from({ length: n }, (_, i) => {
      const z = i / n;
      const drop = { x: 0, y: 0, z, top: 0, end: toWater ? getRainWaterY(z, scene) : scene.height + 40 };
      placeRainDrop(drop, scene, random, true);
      return drop;
    });

  it('ends a drop on the water at its depth: the horizon far, the bottom near', () => {
    expect(getRainWaterY(0, scene)).toBe(scene.horizonY);
    expect(getRainWaterY(1, scene)).toBe(scene.height);
  });

  it('keeps the number of drops: a drop past its end starts again at the top', () => {
    const random = seeded(7);
    const drops = make(200, true, random);
    let splashes = 0;
    for (let frame = 0; frame < 600; frame++) {
      splashes += stepRainDrops(drops, 1 / 60, scene, 2, random).length;
      expect(drops.length).toBe(200);
    }
    // 10 s of rain: every drop fell more than once, and each landing left a splash.
    expect(splashes).toBeGreaterThan(400);
    for (const drop of drops) {
      expect(drop.y).toBeGreaterThanOrEqual(-30);
      expect(drop.y).toBeLessThan(drop.end);
    }
  });

  it('spreads the drops over their paths in the first frame, so the rain starts full', () => {
    const drops = make(400, true, seeded(3));
    const inSky = drops.filter(drop => drop.y > 0 && drop.y < scene.horizonY).length;
    expect(inSky).toBeGreaterThan(250);
  });

  it('leaves no splash for drops that fall below the screen', () => {
    const random = seeded(11);
    const drops = make(50, false, random);
    for (let frame = 0; frame < 300; frame++) expect(stepRainDrops(drops, 1 / 60, scene, 2, random)).toEqual([]);
  });
});

describe('getRainSoundGain (ROADMAP item 119)', () => {
  it('is 0 without rain or with the rain sound off', () => {
    expect(getRainSoundGain(null, true, true, 1)).toBe(0);
    expect(getRainSoundGain(4, false, true, 1)).toBe(0);
  });

  it('is 0.25 of the slider with the radio and 0.6 alone, at a storm', () => {
    expect(getRainSoundGain(20, true, true, 0.8)).toBeCloseTo(0.2);
    expect(getRainSoundGain(20, true, false, 0.8)).toBeCloseTo(0.48);
  });

  it('grows with the rain from 0.6x toward 1x', () => {
    const drizzle = getRainSoundGain(0.1, true, false, 1);
    expect(drizzle).toBeCloseTo(0.36);
    expect(getRainSoundGain(4, true, false, 1)).toBeGreaterThan(drizzle);
  });

  it('is 0 with the slider at 0', () => {
    expect(getRainSoundGain(4, true, true, 0)).toBe(0);
  });
});
