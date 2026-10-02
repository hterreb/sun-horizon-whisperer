import { getWeatherEffects, canFlashLightning, LIGHTNING_MIN_GAP_MS, pickBoat, hasBoatWake, getBoatTone, pickFish, FISH_WEIGHTS, canSpawnFish, getRestStopMotion, pickNightFish, pickMoonlitDayFish, NIGHT_FISH_WEIGHTS, MAX_NIGHT_FISH, getWaterSpeedFactor, getWaterLimit, getStarCloudFactor, getTwilightStars, getSkyOvercastMix, getSunVisibility, getMoonCloudFactor, getMoonLook, BIRD_WEIGHTS, pickBird, isBirdInSeason } from '../src/utils/weatherEffectsUtils';

describe('getWeatherEffects (ROADMAP item 10)', () => {
  it('shows fog only for the fog type', () => {
    expect(getWeatherEffects({ type: 'fog', windKmh: 0, tempC: 15, sunAltitude: 20 }).showFog).toBe(true);
    expect(getWeatherEffects({ type: 'rain', windKmh: 0, tempC: 15, sunAltitude: 20 }).showFog).toBe(false);
  });

  it('shows lightning only for storm', () => {
    expect(getWeatherEffects({ type: 'storm', windKmh: 0, tempC: 15, sunAltitude: 20 }).showLightning).toBe(true);
    expect(getWeatherEffects({ type: 'rain', windKmh: 0, tempC: 15, sunAltitude: 20 }).showLightning).toBe(false);
  });

  it('maps precipitation types (drizzle, rain, storm -> rain, snow, hail)', () => {
    expect(getWeatherEffects({ type: 'drizzle', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('drizzle');
    expect(getWeatherEffects({ type: 'rain', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('rain');
    expect(getWeatherEffects({ type: 'storm', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('rain');
    expect(getWeatherEffects({ type: 'snow', windKmh: 0, tempC: -2, sunAltitude: 10 }).precipitation).toBe('snow');
    expect(getWeatherEffects({ type: 'hail', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('hail');
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 10, sunAltitude: 10 }).precipitation).toBe('none');
  });

  it('shows leaves and slows birds above 40 km/h wind, not at or below it', () => {
    const windy = getWeatherEffects({ type: 'clear', windKmh: 41, tempC: 15, sunAltitude: 20 });
    expect(windy.showLeaves).toBe(true);
    expect(windy.birdSpeedFactor).toBeLessThan(1);

    const calm = getWeatherEffects({ type: 'clear', windKmh: 40, tempC: 15, sunAltitude: 20 });
    expect(calm.showLeaves).toBe(false);
    expect(calm.birdSpeedFactor).toBe(1);
  });

  it('treats missing wind as calm', () => {
    const effects = getWeatherEffects({ type: 'clear', windKmh: null, tempC: 15, sunAltitude: 20 });
    expect(effects.showLeaves).toBe(false);
    expect(effects.birdSpeedFactor).toBe(1);
  });

  it('shows heat shimmer above 30°C while there is daylight', () => {
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 31, sunAltitude: 10 }).showHeatShimmer).toBe(true);
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 30, sunAltitude: 10 }).showHeatShimmer).toBe(false);
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 35, sunAltitude: -10 }).showHeatShimmer).toBe(false);
  });

  it('shows frost below -5°C', () => {
    expect(getWeatherEffects({ type: 'snow', windKmh: 0, tempC: -6, sunAltitude: 10 }).showFrost).toBe(true);
    expect(getWeatherEffects({ type: 'snow', windKmh: 0, tempC: -5, sunAltitude: 10 }).showFrost).toBe(false);
  });

  it('treats missing temperature as neither hot nor frosty', () => {
    const effects = getWeatherEffects({ type: 'clear', windKmh: 0, tempC: null, sunAltitude: 10 });
    expect(effects.showHeatShimmer).toBe(false);
    expect(effects.showFrost).toBe(false);
  });

  it('flags rain/drizzle as rainbow candidates only', () => {
    expect(getWeatherEffects({ type: 'rain', windKmh: 0, tempC: 15, sunAltitude: 10 }).showRainbowCandidate).toBe(true);
    expect(getWeatherEffects({ type: 'drizzle', windKmh: 0, tempC: 15, sunAltitude: 10 }).showRainbowCandidate).toBe(true);
    expect(getWeatherEffects({ type: 'storm', windKmh: 0, tempC: 15, sunAltitude: 10 }).showRainbowCandidate).toBe(false);
    expect(getWeatherEffects({ type: 'clear', windKmh: 0, tempC: 15, sunAltitude: 10 }).showRainbowCandidate).toBe(false);
  });
});

describe('canFlashLightning (ROADMAP item 10)', () => {
  it('allows the first flash (no previous flash yet)', () => {
    expect(canFlashLightning(null, 1000)).toBe(true);
  });

  it('blocks a flash before the minimum gap has passed', () => {
    expect(canFlashLightning(1000, 1000 + LIGHTNING_MIN_GAP_MS - 1)).toBe(false);
  });

  it('allows a flash once the minimum gap has passed', () => {
    expect(canFlashLightning(1000, 1000 + LIGHTNING_MIN_GAP_MS)).toBe(true);
  });
});

describe('pickBoat (ROADMAP item 36)', () => {
  const picks = (type: Parameters<typeof pickBoat>[0], windKmh: number | null) =>
    new Set(Array.from({ length: 100 }, (_, i) => pickBoat(type, windKmh, i / 100)));

  it('sends out every boat in fair, calm weather, the sailboat most often', () => {
    expect(picks('clear', 0)).toEqual(new Set(['sailboat', 'ferry', 'fishing', 'rowboat', 'freighter']));
    const sailboats = Array.from({ length: 100 }, (_, i) => pickBoat('partly', 0, i / 100)).filter(k => k === 'sailboat');
    expect(sailboats.length).toBe(44); // 35 of 80
  });

  it('keeps only the ferry and the freighter out in rain, drizzle, fog and snow', () => {
    for (const type of ['rain', 'drizzle', 'fog', 'snow'] as const) {
      expect(picks(type, 0)).toEqual(new Set(['ferry', 'freighter']));
    }
  });

  it('keeps the rowboat ashore above 40 km/h wind', () => {
    expect(picks('clear', 41).has('rowboat')).toBe(false);
    expect(picks('clear', 40).has('rowboat')).toBe(true);
  });
});

describe('pickBoat in a storm (ROADMAP item 73)', () => {
  it('sends out only the ferry and the freighter, never a sailboat', () => {
    const picks = new Set(Array.from({ length: 100 }, (_, i) => pickBoat('storm', 60, i / 100)));
    expect(picks).toEqual(new Set(['ferry', 'freighter']));
  });
});

describe('hasBoatWake (ROADMAP item 73, X2)', () => {
  it('gives the ferry and the freighter a wake in any wind', () => {
    expect(hasBoatWake('ferry', 0)).toBe(true);
    expect(hasBoatWake('freighter', null)).toBe(true);
  });

  it('gives the sailboat a wake only in strong wind (> 40 km/h)', () => {
    expect(hasBoatWake('sailboat', 40)).toBe(false);
    expect(hasBoatWake('sailboat', 41)).toBe(true);
  });

  it('never gives the rowboat or the fishing boat a wake', () => {
    expect(hasBoatWake('rowboat', 80)).toBe(false);
    expect(hasBoatWake('fishing', 80)).toBe(false);
  });
});

describe('getBoatTone (ROADMAP item 73, B3)', () => {
  it('maps the time of day to the light on the boats', () => {
    expect(getBoatTone('midday')).toBe('day');
    expect(getBoatTone('afternoon')).toBe('day');
    expect(getBoatTone('dawn')).toBe('sun');
    expect(getBoatTone('evening')).toBe('sun');
    expect(getBoatTone('civil-twilight')).toBe('twilight');
    expect(getBoatTone('nautical-twilight')).toBe('night');
    expect(getBoatTone('night')).toBe('night');
  });
});

describe('fish mix (ROADMAP item 62)', () => {
  it('has weights that sum to 100 and sends out every species', () => {
    expect(FISH_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)).toBe(100);
    const picks = Array.from({ length: 100 }, (_, i) => pickFish(i / 100));
    expect(new Set(picks)).toEqual(new Set(FISH_WEIGHTS.map(([kind]) => kind)));
    expect(picks.filter(k => k === 'classic').length).toBe(25);
    expect(picks.filter(k => k === 'whale').length).toBe(1);
  });

  it('allows at most five fish, but turtles and jellyfish never count (E4)', () => {
    const four = ['classic', 'perch', 'pike', 'carp'] as const;
    expect(canSpawnFish([...four], 'trout')).toBe(true);
    expect(canSpawnFish([...four, 'trout'], 'seahorse')).toBe(false);
    expect(canSpawnFish([...four, 'trout'], 'turtle')).toBe(true);
    expect(canSpawnFish([...four, 'trout'], 'jellyfish')).toBe(true);
    expect(canSpawnFish([...four, 'turtle', 'jellyfish', 'jellyfish'], 'trout')).toBe(true);
  });
});

describe('night fish mix (ROADMAP item 65)', () => {
  it('has weights that sum to 100 and sends out every night fish', () => {
    expect(NIGHT_FISH_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)).toBe(100);
    const picks = Array.from({ length: 100 }, (_, i) => pickNightFish(i / 100));
    expect(new Set(picks)).toEqual(new Set(['moonlit', 'burbot', 'eel', 'lanternfish', 'jellyfish', 'anglerfish', 'squid']));
    expect(picks.filter(k => k === 'lanternfish').length).toBe(30);
  });

  it('lights the lake fish by the moon, but not the minnow school (NF1)', () => {
    const picks = new Set(Array.from({ length: 100 }, (_, i) => pickMoonlitDayFish(i / 100)));
    expect(picks).toEqual(new Set(['classic', 'perch', 'pike', 'carp', 'catfish', 'trout']));
  });

  it('allows at most three fish at night, but jellyfish still come (NR1)', () => {
    const three = ['classic', 'lanternfish', 'burbot'] as const;
    expect(canSpawnFish(three.slice(0, 2), 'eel', MAX_NIGHT_FISH)).toBe(true);
    expect(canSpawnFish([...three], 'eel', MAX_NIGHT_FISH)).toBe(false);
    expect(canSpawnFish([...three], 'jellyfish', MAX_NIGHT_FISH)).toBe(true);
  });
});

describe('getWaterSpeedFactor (ROADMAP item 66)', () => {
  it('leaves phones alone and slows wider screens to a 430 px phone\'s pixels per second', () => {
    expect(getWaterSpeedFactor(390)).toBe(1);
    expect(getWaterSpeedFactor(430)).toBe(1);
    expect(getWaterSpeedFactor(1290)).toBeCloseTo(1 / 3, 10);
  });
});

describe('getWaterLimit (ROADMAP item 70)', () => {
  it('keeps the phone limits and grows them with the width on wide screens', () => {
    expect(getWaterLimit(5, 390)).toBe(5);
    expect(getWaterLimit(5, 1440)).toBe(17);
    expect(getWaterLimit(3, 1440)).toBe(10);
    expect(getWaterLimit(5, 1920)).toBe(22);
  });
});

describe('bird mix and seasons (ROADMAP item 74)', () => {
  const picks = (month: number, latitude: number, evening: boolean) =>
    new Set(Array.from({ length: 100 }, (_, i) => pickBird(i / 100, month, latitude, evening)));

  it('has weights that sum to 100; in October before sunset all but the storks fly', () => {
    expect(BIRD_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)).toBe(100);
    expect(picks(10, 47.8, true)).toEqual(new Set(['gull', 'heron', 'swan', 'geese', 'cormorant', 'kestrel', 'starlings']));
  });

  it('sends the starling flocks only in the hour before sunset (C2)', () => {
    expect(picks(10, 47.8, false).has('starlings')).toBe(false);
  });

  it('flies each bird in its months, half a year later south of the equator (C1)', () => {
    expect(isBirdInSeason('stork', 5, 47.8)).toBe(true);
    expect(isBirdInSeason('stork', 10, 47.8)).toBe(false);
    expect(isBirdInSeason('geese', 10, 47.8)).toBe(true);
    expect(isBirdInSeason('geese', 7, 47.8)).toBe(false);
    expect(isBirdInSeason('stork', 11, -33.9)).toBe(true);
    expect(isBirdInSeason('stork', 5, -33.9)).toBe(false);
    expect(isBirdInSeason('gull', 1, 47.8)).toBe(true);
    const july = picks(7, 47.8, true);
    expect(july.has('stork')).toBe(true);
    expect(july.has('geese') || july.has('starlings')).toBe(false);
  });
});

describe('getRestStopMotion (ROADMAP item 62, P8)', () => {
  // A near pike: 2 %/s over 110 % of the width, stopped 50 % along, for 6 s.
  const { duration, easing } = getRestStopMotion(110, 2, 50, 6);
  const points = [...easing.matchAll(/([\d.]+) ([\d.]+)%/g)].map(([, p, t]) => [Number(t) / 100 * duration, Number(p)]);

  it('takes the cruise time plus the stop: 3 s to slow, the hold, 3 s to speed up', () => {
    // 110 % at 2 %/s is 55 s. Each 3 s ramp covers 3 % instead of 6 %, so it costs 1.5 s.
    expect(duration).toBeCloseTo(55 + 1.5 + 6 + 1.5, 5);
  });

  it('starts at 0, ends at 1 and never moves backward', () => {
    expect(easing.startsWith('linear(0.0000 0.00%')).toBe(true);
    expect(easing.endsWith('1.0000 100.00%)')).toBe(true);
    points.slice(1).forEach(([t, p], i) => {
      expect(t).toBeGreaterThanOrEqual(points[i][0]);
      expect(p).toBeGreaterThanOrEqual(points[i][1]);
    });
  });

  it('holds still at the stop point for the hold time', () => {
    const still = points.filter(([, p]) => Math.abs(p - 50 / 110) < 1e-4);
    expect(still.length).toBe(2);
    expect(still[1][0] - still[0][0]).toBeCloseTo(6, 1);
  });
});

describe('getStarCloudFactor (ROADMAP item 52)', () => {
  it('dims the stars by the measured cloud cover', () => {
    expect(getStarCloudFactor('clear', 0)).toBe(1);
    expect(getStarCloudFactor('partly', 25)).toBe(0.75);
    expect(getStarCloudFactor('overcast', 100)).toBe(0);
  });

  it('falls back to the weather type without a cover value', () => {
    expect(getStarCloudFactor('clear', null)).toBe(1);
    expect(getStarCloudFactor('partly', null)).toBe(0.8);
    expect(getStarCloudFactor('cloudy', undefined)).toBe(0.4);
    for (const type of ['overcast', 'fog', 'drizzle', 'rain', 'snow', 'storm', 'hail'] as const) {
      expect(getStarCloudFactor(type, null)).toBe(0);
    }
  });
});

describe('getTwilightStars (ROADMAP item 52)', () => {
  it('shows all stars at night, the brightest half in astronomical and 15 % in nautical twilight', () => {
    expect(getTwilightStars('night')).toEqual({ share: 1, opacity: 1 });
    expect(getTwilightStars('astronomical-twilight')).toEqual({ share: 0.5, opacity: 0.7 });
    expect(getTwilightStars('nautical-twilight')).toEqual({ share: 0.15, opacity: 0.4 });
  });

  it('shows no stars from civil twilight on', () => {
    for (const t of ['civil-twilight', 'dawn', 'midday', 'evening'] as const) {
      expect(getTwilightStars(t).share).toBe(0);
    }
  });
});

describe('getSkyOvercastMix (ROADMAP item 50)', () => {
  it('mixes the sky toward grey per weather type without a cloud cover', () => {
    // Rain and drizzle follow the amount since item 77 (X5), see below.
    const expected = {
      clear: 0, partly: 0.1, cloudy: 0.25, snow: 0.45,
      overcast: 0.6, fog: 0.6, storm: 0.75, hail: 0.75,
    } as const;
    for (const [type, mix] of Object.entries(expected)) {
      expect(getSkyOvercastMix(type as keyof typeof expected, null)).toBe(mix);
      expect(getSkyOvercastMix(type as keyof typeof expected, undefined)).toBe(mix);
    }
  });

  it('scales the mix by a measured cloud cover, clamped to 0-100 %', () => {
    expect(getSkyOvercastMix('overcast', 100)).toBe(0.6);
    expect(getSkyOvercastMix('overcast', 50)).toBeCloseTo(0.3);
    expect(getSkyOvercastMix('cloudy', 0)).toBe(0);
    expect(getSkyOvercastMix('storm', 150)).toBe(0.75);
    expect(getSkyOvercastMix('clear', 100)).toBe(0);
  });
});

describe('getSkyOvercastMix: darker with more rain (ROADMAP item 77, X5)', () => {
  it('greys rain and drizzle from 0.4 + 0.35t, times the cover', () => {
    expect(getSkyOvercastMix('drizzle', null, 0.2)).toBeCloseTo(0.446, 3);
    expect(getSkyOvercastMix('rain', null, 4)).toBeCloseTo(0.644, 3);
    expect(getSkyOvercastMix('rain', null, 20)).toBeCloseTo(0.75, 3);
    expect(getSkyOvercastMix('rain', 50, 20)).toBeCloseTo(0.375, 3);
  });

  it("uses the type's middle value without an amount (manual weather)", () => {
    expect(getSkyOvercastMix('rain', null)).toBeCloseTo(getSkyOvercastMix('rain', null, 4), 6);
    expect(getSkyOvercastMix('drizzle', null, 0)).toBeCloseTo(getSkyOvercastMix('drizzle', null, 0.4), 6);
  });

  it('leaves the storm and the other types as they were', () => {
    expect(getSkyOvercastMix('storm', null, 20)).toBe(0.75);
    expect(getSkyOvercastMix('snow', null, 20)).toBe(0.45);
  });
});

describe('getSunVisibility (ROADMAP item 50)', () => {
  it('shows the full sun for clear and partly', () => {
    expect(getSunVisibility('clear')).toEqual({ disc: 1, halo: 1, haloScale: 1, pale: 0 });
    expect(getSunVisibility('partly')).toEqual({ disc: 1, halo: 1, haloScale: 1, pale: 0 });
  });

  it('dims the disc to 80 % and the halo to 60 % when cloudy', () => {
    expect(getSunVisibility('cloudy')).toEqual({ disc: 0.8, halo: 0.6, haloScale: 1, pale: 0 });
  });

  it('shows a pale disc (50 % toward the grey) with a small halo for drizzle and snow (item 59)', () => {
    for (const t of ['drizzle', 'snow'] as const) {
      const v = getSunVisibility(t);
      expect(v.disc).toBeGreaterThan(0);
      expect(v.pale).toBe(0.5);
      expect(v.halo).toBeGreaterThan(0);
      expect(v.haloScale).toBeLessThan(1);
    }
  });

  it('shows a faint pale disc in a soft light patch for overcast (item 72)', () => {
    expect(getSunVisibility('overcast')).toEqual({ disc: 0.3, halo: 0.6, haloScale: 1.2, pale: 0.6 });
  });

  it('shows no disc, only a soft light patch, for fog and rain', () => {
    for (const t of ['fog', 'rain'] as const) {
      const v = getSunVisibility(t);
      expect(v.disc).toBe(0);
      expect(v.halo).toBeGreaterThan(0);
      expect(v.halo).toBeLessThan(1);
    }
  });

  it('hides the sun completely for storm and hail', () => {
    expect(getSunVisibility('storm')).toEqual({ disc: 0, halo: 0, haloScale: 0, pale: 0 });
    expect(getSunVisibility('hail')).toEqual({ disc: 0, halo: 0, haloScale: 0, pale: 0 });
  });

  it('keeps the full disc colour outside drizzle, snow and overcast', () => {
    for (const t of ['clear', 'partly', 'cloudy', 'fog', 'rain', 'storm', 'hail'] as const) {
      expect(getSunVisibility(t).pale).toBe(0);
    }
  });
});

describe('getMoonCloudFactor (ROADMAP item 57)', () => {
  it('shows the full moon under a clear sky', () => {
    expect(getMoonCloudFactor('clear', 0)).toBe(1);
    expect(getMoonCloudFactor('clear', null)).toBe(1);
  });

  it('hides the moon at 100 % cover in rain, snow, drizzle and hail', () => {
    for (const type of ['rain', 'snow', 'drizzle', 'hail'] as const) {
      expect(getMoonCloudFactor(type, 100)).toBe(0);
      expect(getMoonCloudFactor(type, null)).toBe(0);
    }
  });

  it('always hides the moon in storm and fog', () => {
    for (const type of ['storm', 'fog'] as const) {
      expect(getMoonCloudFactor(type, 0)).toBe(0);
      expect(getMoonCloudFactor(type, 50)).toBe(0);
      expect(getMoonCloudFactor(type, null)).toBe(0);
    }
  });

  it('keeps a faint patch (at least 15 %) for partial cover, cloudy and overcast', () => {
    expect(getMoonCloudFactor('rain', 95)).toBeCloseTo(0.15);
    expect(getMoonCloudFactor('partly', 25)).toBe(0.75);
    expect(getMoonCloudFactor('overcast', 100)).toBe(0.15);
    expect(getMoonCloudFactor('overcast', null)).toBe(0.15);
    expect(getMoonCloudFactor('cloudy', null)).toBe(0.4);
    expect(getMoonCloudFactor('cloudy', 100)).toBe(0.15);
  });
});

describe('getMoonLook (ROADMAP item 76, MV4)', () => {
  it('keeps at least a quarter of the disc in every weather but storm and fog, live and manual', () => {
    for (const type of ['overcast', 'drizzle', 'rain', 'snow', 'hail'] as const) {
      expect(getMoonLook(type, null).disc).toBe(0.25); // manual: no cover value
      expect(getMoonLook(type, 97).disc).toBe(0.25); // the reported night: rain at 97 %
    }
    expect(getMoonLook('cloudy', null).disc).toBe(0.4);
    expect(getMoonLook('partly', 25).disc).toBe(0.75);
    expect(getMoonLook('clear', 0).disc).toBe(1);
  });

  it('adds a corona of 3.5 radii while the item-57 factor is below 0.5', () => {
    expect(getMoonLook('rain', 97)).toEqual({ disc: 0.25, corona: 1, coronaRadius: 3.5 });
    expect(getMoonLook('cloudy', null).corona).toBe(1);
    expect(getMoonLook('partly', 25).corona).toBe(0);
    expect(getMoonLook('clear', null).corona).toBe(0);
  });

  it('shows only a larger, fainter corona in fog, and nothing in a storm', () => {
    expect(getMoonLook('fog', null)).toEqual({ disc: 0, corona: 0.5, coronaRadius: 5 });
    expect(getMoonLook('storm', 50)).toEqual({ disc: 0, corona: 0, coronaRadius: 0 });
  });
});
