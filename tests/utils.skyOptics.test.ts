import { describe, it, expect } from 'vitest';
import { OPTICS, OPTIC_KINDS, getOpticOverride, getSkyOptics, type OpticConditions, type OpticKind } from '@/utils/skyOptics';

// A calm, clear, cloudless noon: no optic.
const BASE: OpticConditions = {
  weatherType: 'clear',
  layers: { low: 0, mid: 0, high: 0 },
  visibilityM: 30_000,
  temperatureC: 15,
  rainMmH: null,
  timeOfDay: 'midday',
  sunAltitude: 40,
  moonAltitude: -20,
  moonIllumination: 0.5,
  rainbow: false,
};
const shows = (kind: OpticKind, change: Partial<OpticConditions>) => getSkyOptics({ ...BASE, ...change }).includes(kind);

describe('sky optics triggers (ROADMAP item 148)', () => {
  it('shows nothing on a clear day', () => {
    expect(getSkyOptics(BASE)).toEqual([]);
  });

  describe('crepuscular rays: sun −3° to 8°, low + mid 20–70 %, visibility < 20 km', () => {
    const rays: Partial<OpticConditions> = { sunAltitude: 2, layers: { low: 35, mid: 30, high: 10 }, visibilityM: 14_000 };
    it('inside the limits', () => {
      expect(shows('rays', rays)).toBe(true);
      expect(shows('rays', { ...rays, sunAltitude: -3 })).toBe(true);
      expect(shows('rays', { ...rays, sunAltitude: 8 })).toBe(true);
      expect(shows('rays', { ...rays, layers: { low: 10, mid: 10, high: 0 } })).toBe(true);
      expect(shows('rays', { ...rays, layers: { low: 40, mid: 30, high: 0 } })).toBe(true);
    });
    it('outside each limit', () => {
      expect(shows('rays', { ...rays, sunAltitude: -3.5 })).toBe(false);
      expect(shows('rays', { ...rays, sunAltitude: 8.5 })).toBe(false);
      expect(shows('rays', { ...rays, layers: { low: 10, mid: 9, high: 0 } })).toBe(false);
      expect(shows('rays', { ...rays, layers: { low: 41, mid: 30, high: 0 } })).toBe(false);
      expect(shows('rays', { ...rays, visibilityM: 20_000 })).toBe(false);
      // Manual weather has no visibility: no rays.
      expect(shows('rays', { ...rays, visibilityM: null })).toBe(false);
    });
  });

  describe('sun dogs: high ≥ 20 %, low + mid < 50 %, sun 0–30°', () => {
    const dogs: Partial<OpticConditions> = { sunAltitude: 10, layers: { low: 5, mid: 10, high: 40 } };
    it('inside the limits', () => {
      expect(shows('sunDogs', dogs)).toBe(true);
      expect(shows('sunDogs', { ...dogs, sunAltitude: 0 })).toBe(true);
      expect(shows('sunDogs', { ...dogs, sunAltitude: 30 })).toBe(true);
      expect(shows('sunDogs', { ...dogs, layers: { low: 25, mid: 24, high: 20 } })).toBe(true);
    });
    it('outside each limit', () => {
      expect(shows('sunDogs', { ...dogs, sunAltitude: -0.5 })).toBe(false);
      expect(shows('sunDogs', { ...dogs, sunAltitude: 30.5 })).toBe(false);
      expect(shows('sunDogs', { ...dogs, layers: { low: 5, mid: 10, high: 19 } })).toBe(false);
      expect(shows('sunDogs', { ...dogs, layers: { low: 25, mid: 25, high: 40 } })).toBe(false);
    });
  });

  describe('22° halo: high ≥ 50 %, low < 30 %, sun > 0°', () => {
    const halo: Partial<OpticConditions> = { sunAltitude: 24, layers: { low: 10, mid: 15, high: 75 } };
    it('inside the limits', () => {
      expect(shows('halo', halo)).toBe(true);
      expect(shows('halo', { ...halo, layers: { low: 29, mid: 80, high: 50 } })).toBe(true);
      expect(shows('halo', { ...halo, sunAltitude: 0.5 })).toBe(true);
    });
    it('outside each limit', () => {
      expect(shows('halo', { ...halo, sunAltitude: 0 })).toBe(false);
      expect(shows('halo', { ...halo, layers: { low: 10, mid: 15, high: 49 } })).toBe(false);
      expect(shows('halo', { ...halo, layers: { low: 30, mid: 15, high: 75 } })).toBe(false);
    });
  });

  describe('double rainbow: the rainbow shows and rain ≥ 1 mm/h', () => {
    const double: Partial<OpticConditions> = { weatherType: 'rain', rainMmH: 1.5, rainbow: true, sunAltitude: 12 };
    it('inside the limits', () => {
      expect(shows('doubleRainbow', double)).toBe(true);
      expect(shows('doubleRainbow', { ...double, rainMmH: 1 })).toBe(true);
    });
    it('outside each limit', () => {
      expect(shows('doubleRainbow', { ...double, rainMmH: 0.9 })).toBe(false);
      expect(shows('doubleRainbow', { ...double, rainMmH: null })).toBe(false);
      expect(shows('doubleRainbow', { ...double, rainbow: false })).toBe(false);
    });
  });

  describe('fog bow: fog or visibility 300–2000 m, low < 50 %, sun 0–40°', () => {
    const fog: Partial<OpticConditions> = { weatherType: 'fog', sunAltitude: 14, layers: { low: 30, mid: 0, high: 5 }, visibilityM: null };
    it('inside the limits', () => {
      expect(shows('fogBow', fog)).toBe(true);
      expect(shows('fogBow', { ...fog, sunAltitude: 0 })).toBe(true);
      expect(shows('fogBow', { ...fog, sunAltitude: 40 })).toBe(true);
      expect(shows('fogBow', { ...fog, weatherType: 'cloudy', visibilityM: 300 })).toBe(true);
      expect(shows('fogBow', { ...fog, weatherType: 'cloudy', visibilityM: 2000 })).toBe(true);
    });
    it('outside each limit', () => {
      expect(shows('fogBow', { ...fog, sunAltitude: -0.5 })).toBe(false);
      expect(shows('fogBow', { ...fog, sunAltitude: 40.5 })).toBe(false);
      expect(shows('fogBow', { ...fog, layers: { low: 50, mid: 0, high: 5 } })).toBe(false);
      expect(shows('fogBow', { ...fog, weatherType: 'cloudy', visibilityM: 299 })).toBe(false);
      expect(shows('fogBow', { ...fog, weatherType: 'cloudy', visibilityM: 2001 })).toBe(false);
      expect(shows('fogBow', { ...fog, weatherType: 'cloudy', visibilityM: null })).toBe(false);
    });
  });

  describe('moonbow: rain or drizzle at night, moon 0–42°, illumination > 80 %', () => {
    const moonbow: Partial<OpticConditions> = {
      weatherType: 'rain', timeOfDay: 'night', sunAltitude: -30, moonAltitude: 22, moonIllumination: 0.98,
    };
    it('inside the limits', () => {
      expect(shows('moonbow', moonbow)).toBe(true);
      expect(shows('moonbow', { ...moonbow, weatherType: 'drizzle' })).toBe(true);
      expect(shows('moonbow', { ...moonbow, timeOfDay: 'nautical-twilight' })).toBe(true);
      expect(shows('moonbow', { ...moonbow, moonAltitude: 0 })).toBe(true);
      expect(shows('moonbow', { ...moonbow, moonAltitude: 42 })).toBe(true);
    });
    it('outside each limit', () => {
      expect(shows('moonbow', { ...moonbow, weatherType: 'cloudy' })).toBe(false);
      expect(shows('moonbow', { ...moonbow, timeOfDay: 'civil-twilight' })).toBe(false);
      expect(shows('moonbow', { ...moonbow, moonAltitude: -0.5 })).toBe(false);
      expect(shows('moonbow', { ...moonbow, moonAltitude: 42.5 })).toBe(false);
      expect(shows('moonbow', { ...moonbow, moonIllumination: 0.8 })).toBe(false);
    });
  });

  describe('sun pillar: sun −2° to 6°, high ≥ 30 %, 2 m temperature < 0 °C', () => {
    const pillar: Partial<OpticConditions> = { sunAltitude: -1, layers: { low: 0, mid: 5, high: 45 }, temperatureC: -4 };
    it('inside the limits', () => {
      expect(shows('sunPillar', pillar)).toBe(true);
      expect(shows('sunPillar', { ...pillar, sunAltitude: -2 })).toBe(true);
      expect(shows('sunPillar', { ...pillar, sunAltitude: 6 })).toBe(true);
      expect(shows('sunPillar', { ...pillar, layers: { low: 0, mid: 5, high: 30 } })).toBe(true);
    });
    it('outside each limit', () => {
      expect(shows('sunPillar', { ...pillar, sunAltitude: -2.5 })).toBe(false);
      expect(shows('sunPillar', { ...pillar, sunAltitude: 6.5 })).toBe(false);
      expect(shows('sunPillar', { ...pillar, layers: { low: 0, mid: 5, high: 29 } })).toBe(false);
      expect(shows('sunPillar', { ...pillar, temperatureC: 0 })).toBe(false);
      expect(shows('sunPillar', { ...pillar, temperatureC: null })).toBe(false);
    });
  });

  describe('moon halo: night, moon > 0°, illumination ≥ 50 %, high ≥ 50 %, low < 30 %', () => {
    const halo: Partial<OpticConditions> = {
      timeOfDay: 'night', sunAltitude: -30, moonAltitude: 32, moonIllumination: 0.9, layers: { low: 5, mid: 10, high: 70 },
    };
    it('inside the limits', () => {
      expect(shows('moonHalo', halo)).toBe(true);
      expect(shows('moonHalo', { ...halo, moonIllumination: 0.5 })).toBe(true);
      expect(shows('moonHalo', { ...halo, layers: { low: 29, mid: 10, high: 50 } })).toBe(true);
      expect(shows('moonHalo', { ...halo, timeOfDay: 'astronomical-twilight' })).toBe(true);
    });
    it('outside each limit', () => {
      expect(shows('moonHalo', { ...halo, timeOfDay: 'civil-twilight' })).toBe(false);
      expect(shows('moonHalo', { ...halo, moonAltitude: 0 })).toBe(false);
      expect(shows('moonHalo', { ...halo, moonIllumination: 0.49 })).toBe(false);
      expect(shows('moonHalo', { ...halo, layers: { low: 5, mid: 10, high: 49 } })).toBe(false);
      expect(shows('moonHalo', { ...halo, layers: { low: 30, mid: 10, high: 70 } })).toBe(false);
    });
  });

  it('shows several at once, in the lookbook order', () => {
    // Thin high cloud at a low sun: sun dogs and the halo.
    expect(getSkyOptics({ ...BASE, sunAltitude: 20, layers: { low: 5, mid: 10, high: 70 } })).toEqual(['sunDogs', 'halo']);
  });
});

describe('sky optic tiers (ROADMAP item 148)', () => {
  it('has the 8 optics with their fixed tiers', () => {
    expect(OPTIC_KINDS).toEqual(['rays', 'sunDogs', 'halo', 'doubleRainbow', 'fogBow', 'moonbow', 'sunPillar', 'moonHalo']);
    expect(Object.fromEntries(OPTICS.map((o) => [o.kind, o.tier]))).toEqual({
      rays: 'common', sunDogs: 'frequent', halo: 'uncommon', doubleRainbow: 'rare',
      fogBow: 'rare', moonbow: 'veryRare', sunPillar: 'rare', moonHalo: 'rare',
    });
  });
});

describe('getOpticOverride (?optic=)', () => {
  it('reads one kind or a comma list, in the lookbook order', () => {
    expect(getOpticOverride('?optic=halo')).toEqual(['halo']);
    expect(getOpticOverride('?optic=moonHalo,%20rays')).toEqual(['rays', 'moonHalo']);
  });

  it('drops unknown kinds and gives null without a known one', () => {
    expect(getOpticOverride('?optic=halo,ufo')).toEqual(['halo']);
    expect(getOpticOverride('?optic=ufo')).toBeNull();
    expect(getOpticOverride('?optic=')).toBeNull();
    expect(getOpticOverride('?fish=perch')).toBeNull();
    expect(getOpticOverride('')).toBeNull();
  });
});
