import { describe, it, expect } from 'vitest';
import { translate, type Translate } from '@/i18n';
import {
  getSceneInfo, resolveInfoText, directionText, durationText, distanceText, rarityTier, getRarityTier,
  type SceneInfo, type SceneInfoContext, type SceneInfoTarget,
} from '@/utils/sceneInfo';
import { FISH_WEIGHTS, BIRD_WEIGHTS, type BoatKind, type FishKind } from '@/utils/weatherEffectsUtils';
import { type CloudType } from '@/utils/skyCloudUtils';
import { type HorizonProfile } from '@/utils/horizonUtils';
import { formatTime, type SunTimes } from '@/utils/sunUtils';

// ROADMAP item 95: the info card's content per type, read in English and German.
const en: Translate = (key, vars) => translate('en', key, vars);
const de: Translate = (key, vars) => translate('de', key, vars);
const NOW = new Date('2026-10-05T12:00:00Z');
const at = (iso: string) => new Date(iso);

// The scene's day: 1 h 40 min of twilight before sunrise and after sunset (bats), 11 h 17 min
// of day (birds): the bats have 200 of 877 flying minutes, 22.8 %.
const SCENE_SUN_TIMES: SunTimes = {
  astronomicalDawn: at('2026-10-05T03:50:00Z'), nauticalDawn: at('2026-10-05T04:25:00Z'), dawn: at('2026-10-05T05:00:00Z'),
  sunrise: at('2026-10-05T05:30:00Z'), solarNoon: at('2026-10-05T11:08:30Z'), sunset: at('2026-10-05T16:47:00Z'),
  dusk: at('2026-10-05T17:17:00Z'), nauticalDusk: at('2026-10-05T17:52:00Z'), astronomicalDusk: at('2026-10-05T18:27:00Z'),
  polar: null,
};

const ctx = (over: Partial<SceneInfoContext> = {}): SceneInfoContext => ({
  language: 'en',
  now: NOW,
  timeOfDay: 'midday',
  sceneSunTimes: SCENE_SUN_TIMES,
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

// The card as text: the title, the fact (item 107: a field note at the end of the card), then
// each row as "label: value" or the value alone.
const read = (info: SceneInfo, t: Translate = en) => [
  t(info.title),
  ...(info.fact ? [t(info.fact.text)] : []),
  ...info.lines.map(l => (l.label ? `${t(l.label)}: ${resolveInfoText(t, l.value)}` : resolveInfoText(t, l.value))),
];
const card = (target: SceneInfoTarget, over?: Partial<SceneInfoContext>, t?: Translate) => read(getSceneInfo(target, ctx(over)), t);

describe('sceneInfo (ROADMAP item 95)', () => {
  it('gives fish, birds and boats their rarity tier and spawn share from the weights (item 105)', () => {
    const rarity = (target: SceneInfoTarget, over?: Partial<SceneInfoContext>, t?: Translate) =>
      card(target, over, t).find(row => /^(Rarity|Seltenheit):/.test(row));
    expect(rarity({ type: 'fish', kind: 'shark' })).toBe('Rarity: Very rare · 0.5 %');
    expect(rarity({ type: 'fish', kind: 'shark' }, { timeOfDay: 'night' })).toBe('Rarity: Very rare · 0.5 %');
    expect(rarity({ type: 'fish', kind: 'classic' })).toBe('Rarity: Common · 24 %');
    expect(rarity({ type: 'fish', kind: 'ray' })).toBe('Rarity: Rare · 2 %');
    expect(rarity({ type: 'fish', kind: 'jellyfish' }, { timeOfDay: 'night' })).toBe('Rarity: Uncommon · 8 %');
    // A day fish at night is a moonlit fish: 24 % of the night spawns, perch 14 of 72 of those.
    expect(rarity({ type: 'fish', kind: 'perch' }, { timeOfDay: 'nautical-twilight' })).toBe('Rarity: Uncommon · 4.7 %');
    // A night fish that swims on at dawn keeps its night share.
    expect(rarity({ type: 'fish', kind: 'squid' })).toBe('Rarity: Uncommon · 5 %');
    expect(rarity({ type: 'fish', kind: 'shark' }, { language: 'de' }, de)).toBe('Seltenheit: Sehr selten · 0,5 %');
    // Item 107: the bats have 22.8 % of the flying time; the birds share the other 77.2 %.
    expect(rarity({ type: 'bird', kind: 'gull' })).toBe('Rarity: Common · 29.3 %');
    expect(rarity({ type: 'bird', kind: 'bat' })).toBe('Rarity: Common · 22.8 %');
    expect(rarity({ type: 'bird', kind: 'stork' })).toBe('Rarity: Uncommon · 6.2 %');
    expect(rarity({ type: 'boat', kind: 'freighter' })).toBe('Rarity: Uncommon · 6.3 %');
    const boats: BoatKind[] = ['sailboat', 'ferry', 'fishing', 'rowboat', 'freighter'];
    for (const kind of boats) expect(rarity({ type: 'boat', kind }), kind).toMatch(/^Rarity: .+ · [\d.]+ %$/);
  });

  it('has no rarity row on the cloud, sun, moon, plane and terrain cards (item 105)', () => {
    const targets: SceneInfoTarget[] = [
      { type: 'cloud', cloudType: 'Cu', band: 'low' }, { type: 'sun' }, { type: 'moon' },
      { type: 'plane', contrail: 'none' }, { type: 'terrain', azimuth: 90 },
    ];
    for (const target of targets) expect(card(target).some(row => row.startsWith('Rarity')), target.type).toBe(false);
  });

  it('gives a fish its species, one fact and day or night fish', () => {
    expect(card({ type: 'fish', kind: 'lanternfish' }, { timeOfDay: 'night' })).toEqual([
      'Lanternfish', 'Lanternfish make their own light.', 'Night fish', 'Rarity: Common · 30 %',
    ]);
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
    expect(card({ type: 'bird', kind: 'geese' })).toEqual([
      'Geese', 'Geese fly in a V to save energy.', 'Season: Spring and autumn, on migration', 'Rarity: Uncommon · 7.7 %',
    ]);
    expect(card({ type: 'bird', kind: 'stork' })[2]).toBe('Season: Spring and summer');
    expect(card({ type: 'bird', kind: 'starlings' })[2]).toBe('Season: Autumn');
    expect(card({ type: 'bird', kind: 'gull' })[2]).toBe('Season: All year');
    expect(card({ type: 'bird', kind: 'bat' })[2]).toBe('Season: At dusk');
    for (const [kind] of BIRD_WEIGHTS) expect(card({ type: 'bird', kind })[1], kind).toMatch(/\.$/);
  });

  it('leaves out the flyers\' rarity row without the day\'s sun times (item 107)', () => {
    const info = getSceneInfo({ type: 'bird', kind: 'bat' }, ctx({ sceneSunTimes: null }));
    expect(info.tier).toBeNull();
    expect(read(info).some(row => row.startsWith('Rarity'))).toBe(false);
  });

  it('gives a boat its type and one fact', () => {
    expect(card({ type: 'boat', kind: 'fishing' })).toEqual([
      'Fishing boat', 'Gulls often follow fishing boats for scraps.', 'Rarity: Common · 18.8 %',
    ]);
    expect(card({ type: 'boat', kind: 'freighter' }, {}, de)[0]).toBe('Frachter');
  });

  it('gives a plane its type, one fact, the altitude band and its contrail (item 96)', () => {
    expect(card({ type: 'plane', contrail: 'persistent' })).toEqual([
      'Airliner', 'A contrail is the water vapour of the engines, frozen to ice.',
      'Altitude: 9–12 km (cruise)', 'Contrail: Lasting (it spreads to a cloud)',
    ]);
    expect(card({ type: 'plane', contrail: 'none' })[3]).toBe('Contrail: None');
    expect(card({ type: 'plane', contrail: 'short' }, {}, de)).toEqual([
      'Verkehrsflugzeug', 'Ein Kondensstreifen ist der Wasserdampf der Triebwerke, zu Eis gefroren.',
      'Höhe: 9–12 km (Reiseflug)', 'Kondensstreifen: Kurz (trockene Luft)',
    ]);
  });

  it('gives a live plane its callsign, airline, type, altitude and speed (item 96)', () => {
    const target: SceneInfoTarget = { type: 'livePlane', callsign: 'DLH4KL', airline: 'Lufthansa', aircraftType: 'A320', altM: 11_674, speedKt: 477 };
    expect(card(target)).toEqual([
      'Live plane', 'Callsign: DLH4KL', 'Airline: Lufthansa', 'Aircraft type: A320', 'Altitude: 11.7 km', 'Speed: 883 km/h',
    ]);
    expect(card({ ...target, callsign: null, airline: null, aircraftType: null })[1]).toBe('Callsign: —');
    expect(card(target, { language: 'de' }, de)[4]).toBe('Höhe: 11,7 km');
  });

  it('adds the route once the proxy has it, with the places when they are short (item 111)', () => {
    const target: SceneInfoTarget = { type: 'livePlane', callsign: 'ELY326', airline: 'El Al', aircraftType: 'B738', altM: 11_000, speedKt: 450 };
    const route = { from: { code: 'CDG', name: 'Paris' }, to: { code: 'TLV', name: 'Tel Aviv' } };
    expect(card(target, { route }).at(-1)).toBe('Route: Paris (CDG) → Tel Aviv (TLV)');
    expect(card(target, { route }, de).at(-1)).toBe('Route: Paris (CDG) → Tel Aviv (TLV)');
    const long = { ...route, to: { code: 'CFU', name: 'Kerkyra Island' } };
    expect(card(target, { route: long }).at(-1)).toBe('Route: CDG → CFU');
    expect(card(target, { route: { ...route, from: { code: 'LFPG', name: null } } }).at(-1)).toBe('Route: LFPG → TLV');
    expect(card(target, { route: null })).toHaveLength(6);
  });

  it("gives a cloud its type, its layer and the forecast cover of that layer (item 84)", () => {
    expect(card({ type: 'cloud', cloudType: 'Ci', band: 'high' })).toEqual([
      'Cirrus', 'Cirrus clouds are made only of ice crystals.', 'Layer: High', 'Cover: 70%',
    ]);
    const german = card({ type: 'cloud', cloudType: 'Cu', band: 'low' }, { language: 'de' }, de);
    expect(german.slice(0, 3)).toEqual(['Cumulus', 'Ein Cumulus wächst auf einer Säule warmer Luft, die vom Boden aufsteigt.', 'Schicht: Tief']);
    expect(german[3]).toMatch(/^Bedeckung: 40\s%$/); // Intl puts a no-break space before the % in German
    // Without a forecast: the weather type's own cover.
    expect(card({ type: 'cloud', cloudType: 'Ns', band: 'low' }, { weatherType: 'rain', cloudLayers: null })[3]).toMatch(/^Cover: \d+%$/);
  });

  it('gives every cloud type one fact (item 106)', () => {
    const types: CloudType[] = ['Ci', 'Cs', 'Ac', 'As', 'Cu', 'Sc', 'St', 'Ns', 'Cb', 'Len', 'Mam'];
    for (const cloudType of types) {
      const [, fact] = card({ type: 'cloud', cloudType, band: 'mid' });
      expect(fact, cloudType).toMatch(/^[A-Z].*\.$/);
      expect(fact, cloudType).not.toMatch(/^cloudFact\./);
    }
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

describe('sceneInfo: field guide data (ROADMAP item 107)', () => {
  const info = (target: SceneInfoTarget, over?: Partial<SceneInfoContext>) => getSceneInfo(target, ctx(over));

  it('gives each type its kicker and icon', () => {
    const kicker = (target: SceneInfoTarget) => { const i = info(target); return [en(i.kicker), i.icon]; };
    expect(kicker({ type: 'fish', kind: 'perch' })).toEqual(['Water life', 'water']);
    expect(kicker({ type: 'fish', kind: 'shark' })).toEqual(['Sea visitor', 'visitor']);
    expect(kicker({ type: 'bird', kind: 'stork' })).toEqual(['Bird', 'bird']);
    expect(kicker({ type: 'bird', kind: 'bat' })).toEqual(['Flying mammal', 'bat']);
    expect(kicker({ type: 'boat', kind: 'ferry' })).toEqual(['Watercraft', 'boat']);
    expect(kicker({ type: 'plane', contrail: 'none' })).toEqual(['Aircraft', 'plane']);
    expect(kicker({ type: 'cloud', cloudType: 'Cu', band: 'low' })).toEqual(['Cloud', 'cloud']);
    expect(kicker({ type: 'sun' })).toEqual(['Sky', 'sun']);
    expect(kicker({ type: 'moon' })).toEqual(['Sky', 'moon']);
    expect(kicker({ type: 'terrain', azimuth: 0 })).toEqual(['Horizon', 'terrain']);
    expect(kicker({ type: 'satellite', id: 1, name: 'X' })).toEqual(['Orbit', 'satellite']);
  });

  it('gives a Latin name to the real species only', () => {
    expect(info({ type: 'fish', kind: 'pike' }).latin).toBe('Esox lucius');
    expect(info({ type: 'fish', kind: 'eel' }).latin).toBe('Anguilla anguilla');
    expect(info({ type: 'bird', kind: 'stork' }).latin).toBe('Ciconia ciconia');
    expect(info({ type: 'bird', kind: 'starlings' }).latin).toBe('Sturnus vulgaris');
    for (const target of [
      { type: 'fish', kind: 'classic' }, { type: 'fish', kind: 'shark' }, { type: 'bird', kind: 'gull' },
      { type: 'bird', kind: 'bat' }, { type: 'boat', kind: 'sailboat' }, { type: 'sun' }, { type: 'moon' },
      { type: 'cloud', cloudType: 'Mam', band: 'low' },
    ] as SceneInfoTarget[]) expect(info(target).latin, JSON.stringify(target)).toBeUndefined();
    // A binomial: genus with a capital letter, species in lower case.
    const kinds: FishKind[] = [...FISH_WEIGHTS.map(([k]) => k), 'burbot', 'eel', 'lanternfish', 'anglerfish', 'squid'];
    for (const kind of kinds) {
      const latin = info({ type: 'fish', kind }).latin;
      if (latin) expect(latin, kind).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
    }
  });

  it('gives a cloud its WMO Latin name', () => {
    expect(info({ type: 'cloud', cloudType: 'Cu', band: 'low' }).latin).toBe('Cumulus');
    expect(info({ type: 'cloud', cloudType: 'Len', band: 'mid' }).latin).toBe('Altocumulus lenticularis');
  });

  it('puts the fact in a field note (a cloud fact for clouds), not in the rows', () => {
    const fish = info({ type: 'fish', kind: 'perch' });
    expect(fish.fact).toEqual({ label: 'info.fieldNote', text: 'fishFact.perch' });
    expect(fish.lines.some(l => typeof l.value === 'object' && l.value.key === 'fishFact.perch')).toBe(false);
    expect(info({ type: 'cloud', cloudType: 'Ci', band: 'high' }).fact).toEqual({ label: 'info.cloudFact', text: 'cloudFact.Ci' });
    expect(info({ type: 'plane', contrail: 'none' }).fact?.text).toBe('planeFact.airliner');
    expect(info({ type: 'sun' }).fact).toBeUndefined();
  });

  it('gives fish, birds and boats their rarity tier, the others none', () => {
    expect(info({ type: 'fish', kind: 'shark' }).tier).toBe('veryRare');
    expect(info({ type: 'fish', kind: 'ray' }).tier).toBe('rare');
    expect(info({ type: 'boat', kind: 'freighter' }).tier).toBe('uncommon');
    expect(info({ type: 'bird', kind: 'gull' }).tier).toBe('common');
    const rarityRow = info({ type: 'fish', kind: 'shark' }).lines.find(l => l.label === 'info.rarity');
    expect(rarityRow?.tier).toBe('veryRare');
    for (const target of [
      { type: 'sun' }, { type: 'moon' }, { type: 'cloud', cloudType: 'Cu', band: 'low' }, { type: 'terrain', azimuth: 0 },
      { type: 'plane', contrail: 'none' }, { type: 'satellite', id: 1, name: 'X' },
      { type: 'livePlane', callsign: null, airline: null, aircraftType: null, altM: 0, speedKt: 0 },
    ] as SceneInfoTarget[]) expect(info(target).tier, target.type).toBeNull();
  });

  it('maps a share to its tier at the thresholds', () => {
    expect(rarityTier(10)).toBe('common');
    expect(rarityTier(9.99)).toBe('uncommon');
    expect(rarityTier(3)).toBe('uncommon');
    expect(rarityTier(1)).toBe('rare');
    expect(rarityTier(0.5)).toBe('veryRare');
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

  it('gives the rarity tier of a share at the tier boundaries (item 112)', () => {
    expect(getRarityTier(10)).toBe('rarity.common');
    expect(getRarityTier(9.9)).toBe('rarity.uncommon');
    expect(getRarityTier(3)).toBe('rarity.uncommon');
    expect(getRarityTier(2.9)).toBe('rarity.rare');
    expect(getRarityTier(1)).toBe('rarity.rare');
    expect(getRarityTier(0.9)).toBe('rarity.veryRare');
    expect(getRarityTier(0)).toBe('rarity.veryRare');
  });
});
