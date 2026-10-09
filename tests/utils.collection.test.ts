import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BADGES, COLLECTION_STORAGE_KEY, addToCollection, badgeForAstroEvent, badgeForCalendarEvent, badgeForSanta, badgeForTarget,
  countCollected, getMoonState, getSunState, getTerrainBand, isCollectionPaused, loadCollection, saveCollection,
  stateBadgeForTarget, type BadgeId, type CalendarBadgeOptions, type StateBadgeContext,
} from '@/utils/collection';
import { type HorizonProfile } from '@/utils/horizonUtils';
import { badgeForNationalDay, type NationalBadgeOptions } from '@/utils/collection';
import { NATIONAL_DAYS, type NationalDayKind } from '@/utils/nationalDays';
import { FISH_WEIGHTS, BIRD_WEIGHTS, type FishKind } from '@/utils/weatherEffectsUtils';

// ROADMAP item 112: the collection badges.
const NIGHT_ONLY: FishKind[] = ['burbot', 'eel', 'lanternfish', 'anglerfish', 'squid'];
const tier = (id: BadgeId) => BADGES.find(b => b.id === id)?.rarity;
const shown: CalendarBadgeOptions = { isNight: true, moonUp: true, weatherType: 'clear', reducedMotion: false, isTimePreview: false };

describe('collection (ROADMAP item 112)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('has 106 badges with unique ids, one for every fish, flyer, boat and cloud type', () => {
    const ids = BADGES.map(b => b.id);
    expect(ids).toHaveLength(106); // item 115: 69 + 5 sun + 5 terrain + 8 moon states; + 5 sky eggs + 9 national days + 5 playful eggs
    expect(new Set(ids).size).toBe(106);
    for (const kind of [...FISH_WEIGHTS.map(([k]) => k), ...NIGHT_ONLY]) expect(ids).toContain(`fish:${kind}`);
    for (const kind of [...BIRD_WEIGHTS.map(([k]) => k), 'bat']) expect(ids).toContain(`flyer:${kind}`);
    for (const kind of ['sailboat', 'ferry', 'fishing', 'rowboat', 'freighter']) expect(ids).toContain(`boat:${kind}`);
    for (const type of ['Ci', 'Cs', 'Ac', 'As', 'Cu', 'Sc', 'St', 'Ns', 'Cb', 'Len', 'Mam']) expect(ids).toContain(`cloud:${type}`);
    expect(BADGES.filter(b => b.group === 'egg')).toHaveLength(38);
    expect(BADGES.find(b => b.id === 'plane')?.group).toBe('sky');
  });

  it('gives the rolled kinds their rarity tier, the eggs ultra rare, the rest none', () => {
    expect(tier('fish:seahorse')).toBe('rarity.rare');
    expect(tier('fish:shark')).toBe('rarity.veryRare');
    expect(tier('fish:squid')).toBe('rarity.uncommon'); // night only: the night share
    expect(tier('flyer:bat')).toBe('rarity.frequent'); // item 113: 10-25 % is frequent
    expect(tier('boat:sailboat')).toBe('rarity.common');
    expect(tier('cloud:Cb')).toBeNull();
    expect(BADGES.filter(b => b.group === 'egg').every(b => b.rarity === 'rarity.ultraRare')).toBe(true); // item 113
  });

  it('adds a badge with its ISO date once; a second add keeps the first date', () => {
    const first = addToCollection({}, 'fish:perch', new Date('2026-10-09T10:00:00Z'));
    expect(first).toEqual({ 'fish:perch': '2026-10-09T10:00:00.000Z' });
    expect(addToCollection(first!, 'fish:perch', new Date('2026-10-10T10:00:00Z'))).toBeNull();
    expect(first!['fish:perch']).toBe('2026-10-09T10:00:00.000Z');
  });

  it('saves and loads the collection', () => {
    saveCollection({ sun: '2026-10-09T10:00:00.000Z' });
    expect(loadCollection()).toEqual({ sun: '2026-10-09T10:00:00.000Z' });
  });

  it('loads {} or drops bad entries for corrupt storage, without throwing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(loadCollection()).toEqual({});
    localStorage.setItem(COLLECTION_STORAGE_KEY, '{not json');
    expect(loadCollection()).toEqual({});
    localStorage.setItem(COLLECTION_STORAGE_KEY, '["sun"]');
    expect(loadCollection()).toEqual({});
    localStorage.setItem(COLLECTION_STORAGE_KEY, '42');
    expect(loadCollection()).toEqual({});
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify({ sun: '2026-10-09', 'fish:nemo': '2026-10-09', moon: 5 }));
    expect(loadCollection()).toEqual({ sun: '2026-10-09' });
  });

  it('survives a storage that throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadCollection()).toEqual({});
    expect(() => saveCollection({ sun: '2026-10-09' })).not.toThrow();
  });

  it('maps a tapped thing to its badge', () => {
    expect(badgeForTarget({ type: 'fish', kind: 'perch' })).toBe('fish:perch');
    expect(badgeForTarget({ type: 'bird', kind: 'bat' })).toBe('flyer:bat');
    expect(badgeForTarget({ type: 'boat', kind: 'ferry' })).toBe('boat:ferry');
    expect(badgeForTarget({ type: 'plane', contrail: 'short' })).toBe('plane');
    expect(badgeForTarget({ type: 'livePlane', callsign: null, airline: null, aircraftType: null, altM: 10_000, speedKt: 450 })).toBe('plane');
    expect(badgeForTarget({ type: 'cloud', cloudType: 'Len', band: 'mid' })).toBe('cloud:Len');
    expect(badgeForTarget({ type: 'satellite', id: 25544, name: 'ISS' })).toBe('satellite');
    expect(badgeForTarget({ type: 'terrain', azimuth: 90 })).toBe('terrain');
    // Item 113: an egg card adds no badge; the egg counts when it shows.
    expect(badgeForTarget({ type: 'egg', kind: 'ufo' })).toBeNull();
    expect(badgeForTarget({ type: 'egg', kind: 'ghost' })).toBeNull();
  });

  it('maps a calendar event to its badge only when the scene shows it', () => {
    expect(badgeForCalendarEvent('solstice-longest', shown)).toBe('egg:solstice');
    expect(badgeForCalendarEvent('solstice-shortest', shown)).toBe('egg:solstice');
    expect(badgeForCalendarEvent('equinox', { ...shown, reducedMotion: true })).toBe('egg:equinox');
    expect(badgeForCalendarEvent(null, shown)).toBeNull();
    expect(badgeForCalendarEvent('new-year', shown)).toBeNull();
    expect(badgeForCalendarEvent('equinox', { ...shown, isTimePreview: true })).toBeNull();
    expect(badgeForCalendarEvent('halloween-pumpkin', shown)).toBe('egg:halloweenPumpkin');
    expect(badgeForCalendarEvent('halloween-pumpkin', { ...shown, moonUp: false })).toBeNull();
    expect(badgeForCalendarEvent('halloween-bats', shown)).toBe('egg:halloweenBats');
    expect(badgeForCalendarEvent('halloween-bats', { ...shown, isNight: false })).toBeNull();
    expect(badgeForCalendarEvent('halloween-bats', { ...shown, reducedMotion: true })).toBeNull();
    expect(badgeForCalendarEvent('christmas', shown)).toBe('egg:christmas');
    expect(badgeForCalendarEvent('christmas', { ...shown, weatherType: 'snow' })).toBeNull();
    expect(badgeForCalendarEvent('friday-13', shown)).toBe('egg:friday13');
    expect(badgeForCalendarEvent('friday-13', { ...shown, reducedMotion: true })).toBe('egg:friday13');
    expect(badgeForCalendarEvent('lunar-new-year', { ...shown, reducedMotion: true })).toBeNull();
  });

  it('gives Santa his badge when he flies: also in snow, not with reduced motion or in a time preview', () => {
    const live = { reducedMotion: false, isTimePreview: false };
    expect(badgeForSanta(true, live)).toBe('egg:santa');
    expect(badgeForSanta(false, live)).toBeNull();
    expect(badgeForSanta(true, { ...live, reducedMotion: true })).toBeNull();
    expect(badgeForSanta(true, { ...live, isTimePreview: true })).toBeNull();
  });

  it('maps an astro event to its egg badge', () => {
    expect(badgeForAstroEvent('greenFlash')).toBe('egg:greenFlash');
    // Sky eggs: one ultra rare badge each.
    for (const kind of ['matariki', 'conjunction', 'noctilucent', 'midnightSun', 'polarNight'] as const) {
      expect(badgeForAstroEvent(kind)).toBe(`egg:${kind}`);
      expect(tier(`egg:${kind}`)).toBe('rarity.ultraRare');
    }
  });

  it('pauses while a test link forces the scene', () => {
    expect(isCollectionPaused('?egg=ufo')).toBe(true);
    expect(isCollectionPaused('?egg=lenticular')).toBe(true);
    expect(isCollectionPaused('?fish=shark')).toBe(true);
    expect(isCollectionPaused('?hunt=1')).toBe(true);
    expect(isCollectionPaused('?country=FR')).toBe(true);
    expect(isCollectionPaused('?egg=bastilleDay')).toBe(true);
    expect(isCollectionPaused('')).toBe(false);
    expect(isCollectionPaused('?lang=de')).toBe(false);
  });

  it('counts known badges only', () => {
    expect(countCollected({ sun: 'x', 'egg:ufo': 'y', ['fish:nemo' as BadgeId]: 'z' })).toBe(2);
  });
});

describe('state badges (ROADMAP item 115)', () => {
  // A ridge 1000 m high at 90°, 499 m elsewhere.
  const ridgeHeights = Array.from({ length: 360 }, (_, i) => (i === 90 ? 1000 : 499));
  const profile: HorizonProfile = {
    angles: new Array(360).fill(1), observerElevation: 400, eyeHeight: 1.7,
    ridgeDistances: new Array(360).fill(5000), ridgeHeights,
  };
  const ctx: StateBadgeContext = { timeOfDay: 'midday', moonPhase: 0.5, horizonProfile: profile, isTimePreview: false };

  it('keeps the base badges and adds 5 sun, 8 moon and 5 terrain states after their base', () => {
    const ids = BADGES.map(b => b.id);
    for (const base of ['sun', 'moon', 'terrain'] as const) {
      const states = BADGES.filter(b => b.base === base).map(b => b.id);
      expect(states).toHaveLength(base === 'moon' ? 8 : 5);
      expect(ids.slice(ids.indexOf(base) + 1, ids.indexOf(base) + 1 + states.length)).toEqual(states);
    }
    expect(BADGES.filter(b => b.base).every(b => b.group === 'sky' && b.rarity === null)).toBe(true);
  });

  it('gives the height band at the limits 500 / 1000 / 2000 / 3000 m', () => {
    expect(getTerrainBand(0)).toBe('hills');
    expect(getTerrainBand(499.9)).toBe('hills');
    expect(getTerrainBand(500)).toBe('lowMountains');
    expect(getTerrainBand(999)).toBe('lowMountains');
    expect(getTerrainBand(1000)).toBe('mountains');
    expect(getTerrainBand(1999)).toBe('mountains');
    expect(getTerrainBand(2000)).toBe('highMountains');
    expect(getTerrainBand(2999)).toBe('highMountains');
    expect(getTerrainBand(3000)).toBe('alpine');
    expect(getTerrainBand(4808)).toBe('alpine');
  });

  it('gives a sun state for each daytime time of day, none at night or in the twilights', () => {
    expect(['dawn', 'morning', 'midday', 'afternoon', 'evening'].map(t => getSunState(t as StateBadgeContext['timeOfDay'])))
      .toEqual(['dawn', 'morning', 'midday', 'afternoon', 'evening']);
    for (const t of ['night', 'astronomical-twilight', 'nautical-twilight', 'civil-twilight'] as const) expect(getSunState(t)).toBeNull();
  });

  it('gives a moon state for each of the 8 phases', () => {
    expect([0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 0.99].map(getMoonState)).toEqual([
      'new', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'full', 'waningGibbous', 'thirdQuarter', 'waningCrescent', 'new',
    ]);
  });

  it('maps a tap on the sun, the moon or the terrain to its state badge', () => {
    expect(stateBadgeForTarget({ type: 'sun' }, ctx)).toBe('sun:midday');
    expect(stateBadgeForTarget({ type: 'sun' }, { ...ctx, timeOfDay: 'civil-twilight' })).toBeNull();
    expect(stateBadgeForTarget({ type: 'moon' }, ctx)).toBe('moon:full');
    expect(stateBadgeForTarget({ type: 'moon' }, { ...ctx, moonPhase: 0 })).toBe('moon:new');
    expect(stateBadgeForTarget({ type: 'terrain', azimuth: 90 }, ctx)).toBe('terrain:mountains');
    expect(stateBadgeForTarget({ type: 'terrain', azimuth: 200 }, ctx)).toBe('terrain:hills');
    expect(stateBadgeForTarget({ type: 'terrain', azimuth: 90 }, { ...ctx, horizonProfile: null })).toBeNull();
    expect(stateBadgeForTarget({ type: 'fish', kind: 'perch' }, ctx)).toBeNull();
  });

  it('gives no sun or moon state in a time preview; the ridge height still counts', () => {
    const preview = { ...ctx, isTimePreview: true };
    expect(stateBadgeForTarget({ type: 'sun' }, preview)).toBeNull();
    expect(stateBadgeForTarget({ type: 'moon' }, preview)).toBeNull();
    expect(stateBadgeForTarget({ type: 'terrain', azimuth: 90 }, preview)).toBe('terrain:mountains');
  });

  it('one tap gives the base and the state badge; a second tap adds nothing', () => {
    const now = new Date('2026-10-09T11:00:00Z');
    const target = { type: 'sun' } as const;
    let c = addToCollection({}, badgeForTarget(target)!, now)!;
    c = addToCollection(c, stateBadgeForTarget(target, ctx)!, now)!;
    expect(Object.keys(c)).toEqual(['sun', 'sun:midday']);
    expect(addToCollection(c, 'sun', now)).toBeNull();
    expect(addToCollection(c, 'sun:midday', now)).toBeNull();
  });

  it('loads an old save (item 112 ids only) as it is', () => {
    const old = { sun: '2026-10-01T10:00:00.000Z', moon: '2026-10-02T22:00:00.000Z', terrain: '2026-10-03T12:00:00.000Z', 'fish:perch': '2026-10-04T12:00:00.000Z' };
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(old));
    expect(loadCollection()).toEqual(old);
    expect(countCollected(loadCollection())).toBe(4);
    saveCollection({ ...old, 'terrain:alpine': '2026-10-09T12:00:00.000Z' });
    expect(loadCollection()['terrain:alpine']).toBe('2026-10-09T12:00:00.000Z');
  });
});

describe('national-day badges', () => {
  const day = (kind: NationalDayKind) => NATIONAL_DAYS.find(d => d.kind === kind)!;
  const night: NationalBadgeOptions = { isDay: false, isNight: true, reducedMotion: false, isTimePreview: false };
  const noon: NationalBadgeOptions = { ...night, isDay: true, isNight: false };

  it('has one ultra rare egg badge per national day', () => {
    for (const d of NATIONAL_DAYS) {
      expect(BADGES.find(b => b.id === `egg:${d.kind}`)?.rarity).toBe('rarity.ultraRare');
    }
  });

  it('counts the jets by day only, and not with reduced motion', () => {
    expect(badgeForNationalDay(day('festaRepubblica'), noon)).toBe('egg:festaRepubblica');
    expect(badgeForNationalDay(day('festaRepubblica'), night)).toBeNull();
    expect(badgeForNationalDay(day('festaRepubblica'), { ...noon, reducedMotion: true })).toBeNull();
  });

  it('counts the fireworks at night only, and not with reduced motion except the Guy Fawkes bonfire', () => {
    expect(badgeForNationalDay(day('bastilleDay'), night)).toBe('egg:bastilleDay');
    expect(badgeForNationalDay(day('independenceDay'), noon)).toBeNull();
    expect(badgeForNationalDay(day('independenceDay'), { ...night, reducedMotion: true })).toBeNull();
    expect(badgeForNationalDay(day('guyFawkes'), { ...night, reducedMotion: true })).toBe('egg:guyFawkes');
  });

  it('leaves bunting to the boats, and counts nothing without a day or in the time preview', () => {
    expect(badgeForNationalDay(day('germanUnity'), noon)).toBeNull();
    expect(badgeForNationalDay(null, noon)).toBeNull();
    expect(badgeForNationalDay(day('bastilleDay'), { ...night, isTimePreview: true })).toBeNull();
  });
});
