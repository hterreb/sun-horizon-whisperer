import { describe, it, expect } from 'vitest';
import { translate, type Translate } from '@/i18n';
import {
  getSceneInfo, resolveInfoText, directionText, durationText, distanceText,
  type SceneInfo, type SceneInfoContext, type SceneInfoTarget,
} from '@/utils/sceneInfo';
import { FISH_WEIGHTS, BIRD_WEIGHTS, type FishKind } from '@/utils/weatherEffectsUtils';
import { type HorizonProfile } from '@/utils/horizonUtils';
import { formatTime } from '@/utils/sunUtils';

// ROADMAP item 95: the info card's content per type, read in English and German.
const en: Translate = (key, vars) => translate('en', key, vars);
const de: Translate = (key, vars) => translate('de', key, vars);
const NOW = new Date('2026-10-05T12:00:00Z');
const at = (iso: string) => new Date(iso);

const ctx = (over: Partial<SceneInfoContext> = {}): SceneInfoContext => ({
  language: 'en',
  now: NOW,
  sunPosition: { azimuth: 200, altitude: 33.46 },
  sunTimes: { sunrise: at('2026-10-05T05:30:00Z'), sunset: at('2026-10-05T16:47:00Z') },
  terrainSunTimes: null,
  nextGoldenBlueHours: {
    part: 'evening', day: 'today',
    golden: { start: at('2026-10-05T15:55:00Z'), end: at('2026-10-05T16:47:00Z') },
    blue: null,
  },
  moonPosition: { azimuth: 90, altitude: 10, phase: 0.5, illumination: 0.995, visible: true },
  moonTimes: { rise: at('2026-10-05T17:00:00Z'), set: null, alwaysUp: false, alwaysDown: false },
  horizonProfile: null,
  weatherType: 'cloudy',
  cloudLayers: { low: 40, mid: 25, high: 70 },
  ...over,
});

// The card as text: the title, then each row as "label: value" or the value alone.
const read = (info: SceneInfo, t: Translate = en) => [
  t(info.title),
  ...info.lines.map(l => (l.label ? `${t(l.label)}: ${resolveInfoText(t, l.value)}` : resolveInfoText(t, l.value))),
];
const card = (target: SceneInfoTarget, over?: Partial<SceneInfoContext>, t?: Translate) => read(getSceneInfo(target, ctx(over)), t);

describe('sceneInfo (ROADMAP item 95)', () => {
  it('gives a fish its species, one fact and day or night fish', () => {
    expect(card({ type: 'fish', kind: 'lanternfish' })).toEqual(['Lanternfish', 'Lanternfish make their own light.', 'Night fish']);
    expect(card({ type: 'fish', kind: 'perch' })[2]).toBe('Day fish');
    expect(card({ type: 'fish', kind: 'jellyfish' })[2]).toBe('Day and night');
    expect(card({ type: 'fish', kind: 'shark' })[2]).toBe('Day and night');
  });

  it('has a name and a fact for every fish, day and night (items 62, 65, 85)', () => {
    const kinds: FishKind[] = [...FISH_WEIGHTS.map(([k]) => k), 'burbot', 'eel', 'lanternfish', 'anglerfish', 'squid'];
    for (const kind of kinds) {
      const [name, fact] = card({ type: 'fish', kind });
      expect(name, kind).not.toMatch(/^fish\./);
      expect(fact, kind).toMatch(/\.$/);
    }
  });

  it('gives a bird its species, one fact and its season (item 74)', () => {
    expect(card({ type: 'bird', kind: 'geese' })).toEqual(['Geese', 'Geese fly in a V to save energy.', 'Season: Spring and autumn, on migration']);
    expect(card({ type: 'bird', kind: 'stork' })[2]).toBe('Season: Spring and summer');
    expect(card({ type: 'bird', kind: 'starlings' })[2]).toBe('Season: Autumn');
    expect(card({ type: 'bird', kind: 'gull' })[2]).toBe('Season: All year');
    expect(card({ type: 'bird', kind: 'bat' })[2]).toBe('Season: At dusk');
    for (const [kind] of BIRD_WEIGHTS) expect(card({ type: 'bird', kind })[1], kind).toMatch(/\.$/);
  });

  it('gives a boat its type and one fact', () => {
    expect(card({ type: 'boat', kind: 'fishing' })).toEqual(['Fishing boat', 'Gulls often follow fishing boats for scraps.']);
    expect(card({ type: 'boat', kind: 'freighter' }, {}, de)[0]).toBe('Frachter');
  });

  it("gives a cloud its type, its layer and the forecast cover of that layer (item 84)", () => {
    expect(card({ type: 'cloud', cloudType: 'Ci', band: 'high' })).toEqual(['Cirrus', 'Layer: High', 'Cover: 70%']);
    const german = card({ type: 'cloud', cloudType: 'Cu', band: 'low' }, { language: 'de' }, de);
    expect(german.slice(0, 2)).toEqual(['Cumulus', 'Schicht: Tief']);
    expect(german[2]).toMatch(/^Bedeckung: 40\s%$/); // Intl puts a no-break space before the % in German
    // Without a forecast: the weather type's own cover.
    expect(card({ type: 'cloud', cloudType: 'Ns', band: 'low' }, { weatherType: 'rain', cloudLayers: null })[2]).toMatch(/^Cover: \d+%$/);
  });

  it('gives the sun its altitude, direction, next event with a countdown and the golden hour', () => {
    const [title, altitude, direction, next, golden] = card({ type: 'sun' });
    expect(title).toBe('Sun');
    expect(altitude).toBe('Altitude: +33.5°');
    expect(direction).toBe('Direction: S (200°)');
    expect(next).toBe('Sunset in 4 h 47 min');
    expect(golden).toMatch(/^Golden hour: \d\d:\d\d–\d\d:\d\d$/);
  });

  it('counts down to the line-of-sight sunset when there is one, and says "now, until" in the golden hour', () => {
    const lines = card({ type: 'sun' }, {
      now: at('2026-10-05T16:00:00Z'),
      terrainSunTimes: { sunrise: null, sunset: at('2026-10-05T16:20:00Z') },
    });
    expect(lines[3]).toBe('Sunset in 20 min');
    expect(lines[4]).toMatch(/^Golden hour: now, until \d\d:\d\d$/);
  });

  it('counts down to the sunrise at night and leaves the row out when no event is ahead', () => {
    const night = { now: at('2026-10-05T03:00:00Z') };
    expect(card({ type: 'sun' }, night)[3]).toBe('Sunrise in 2 h 30 min');
    expect(card({ type: 'sun' }, { now: at('2026-10-05T20:00:00Z') })).toHaveLength(4);
  });

  it('gives the moon its phase, lit part, rise and set, and distance', () => {
    const [title, phase, lit, rise, set, distance] = card({ type: 'moon' });
    expect(title).toBe('Moon');
    expect(phase).toBe('Phase: Full Moon');
    expect(lit).toBe('Lit: 100%');
    expect(rise).toMatch(/^Moonrise: \d\d:\d\d$/);
    expect(set).toBe('Moonset: —');
    expect(distance).toMatch(/^Distance: \d{3},\d00 km$/);
  });

  it('adds the supermoon row at a close full moon', () => {
    // 2026-12-24 is a full moon at about 357 000 km (a supermoon).
    expect(card({ type: 'moon' }, { now: at('2026-12-24T01:00:00Z') })).toContain('Supermoon: the full moon is close to Earth');
    expect(card({ type: 'moon' })).not.toContain('Supermoon: the full moon is close to Earth');
  });

  it('gives the terrain its direction, horizon angle, and the ridge distance and height (item 13)', () => {
    const profile: HorizonProfile = {
      angles: new Array(360).fill(1.25),
      observerElevation: 400,
      eyeHeight: 1.7,
      ridgeDistances: new Array(360).fill(4230),
      ridgeHeights: new Array(360).fill(1234),
    };
    expect(card({ type: 'terrain', azimuth: 225.4 }, { horizonProfile: profile })).toEqual([
      'Terrain', 'Direction: SW (225°)', 'Horizon angle: +1.3°', 'Ridge distance: 4.2 km', 'Ridge height: 1,234 m a.s.l.',
    ]);
    // An old profile without ridge data: the direction and the angle only.
    expect(card({ type: 'terrain', azimuth: 10 }, { horizonProfile: { ...profile, ridgeDistances: undefined } })).toHaveLength(3);
  });

  it('gives a tracked satellite its name, height, speed, time to the shadow and next pass (item 97)', () => {
    const pass = {
      start: at('2026-10-05T12:30:00Z'), end: at('2026-10-05T12:35:00Z'), startAzimuth: 270, startElevation: 10,
      endAzimuth: 135, endElevation: 10, maxElevation: 54, maxAt: at('2026-10-05T12:32:00Z'), inProgress: false,
    };
    const satellite = { details: { heightKm: 418.4, speedKmS: 7.66, sunlit: true, shadowInMs: 3 * 60_000 }, nextPass: pass };
    expect(card({ type: 'satellite', id: 25544, name: 'ISS (ZARYA)' }, { satellite })).toEqual([
      'Satellite', 'ISS (ZARYA)', 'Altitude: 418 km', 'Speed: 7.7 km/s', "Into Earth's shadow: in 3 min",
      `Next pass: ${formatTime(pass.start, 'en')}`,
    ]);
    // In the shadow now, and the next pass on another day.
    const tomorrow = { ...pass, start: at('2026-10-07T12:30:00Z') };
    const shadowed = card({ type: 'satellite', id: 1, name: 'SL-8 R/B' }, {
      language: 'de',
      satellite: { details: { ...satellite.details, sunlit: false, shadowInMs: null }, nextPass: tomorrow },
    }, de);
    expect(shadowed).toContain('In den Erdschatten: jetzt');
    expect(shadowed[shadowed.length - 1]).toBe(`Nächster Überflug: ${new Intl.DateTimeFormat('de', { weekday: 'short' }).format(tomorrow.start)} ${formatTime(tomorrow.start, 'de')}`);
    // Without the values (no data yet): the name and dashes.
    expect(card({ type: 'satellite', id: 1, name: 'X' })).toEqual(['Satellite', 'X', "Into Earth's shadow: —", 'Next pass: —']);
  });
});

describe('sceneInfo formatting', () => {
  it('names the 8-point direction with the whole degrees', () => {
    expect(resolveInfoText(en, directionText(359.7))).toBe('N (0°)');
    expect(resolveInfoText(de, directionText(90))).toBe('O (90°)');
  });

  it('writes a duration in h and min, and a distance in m or km', () => {
    expect(resolveInfoText(en, durationText(133 * 60_000))).toBe('2 h 13 min');
    expect(resolveInfoText(en, durationText(45 * 60_000))).toBe('45 min');
    expect(resolveInfoText(en, distanceText(850, 'en'))).toBe('850 m');
    expect(resolveInfoText(de, distanceText(12_345, 'de'))).toBe('12,3 km');
  });
});
