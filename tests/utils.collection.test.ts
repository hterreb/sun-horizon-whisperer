import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BADGES, COLLECTION_STORAGE_KEY, addToCollection, badgeForAstroEvent, badgeForCalendarEvent, badgeForTarget,
  countCollected, isCollectionPaused, loadCollection, saveCollection, type BadgeId, type CalendarBadgeOptions,
} from '@/utils/collection';
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

  it('has 68 badges with unique ids, one for every fish, flyer, boat and cloud type', () => {
    const ids = BADGES.map(b => b.id);
    expect(ids).toHaveLength(68);
    expect(new Set(ids).size).toBe(68);
    for (const kind of [...FISH_WEIGHTS.map(([k]) => k), ...NIGHT_ONLY]) expect(ids).toContain(`fish:${kind}`);
    for (const kind of [...BIRD_WEIGHTS.map(([k]) => k), 'bat']) expect(ids).toContain(`flyer:${kind}`);
    for (const kind of ['sailboat', 'ferry', 'fishing', 'rowboat', 'freighter']) expect(ids).toContain(`boat:${kind}`);
    for (const type of ['Ci', 'Cs', 'Ac', 'As', 'Cu', 'Sc', 'St', 'Ns', 'Cb', 'Len', 'Mam']) expect(ids).toContain(`cloud:${type}`);
    expect(BADGES.filter(b => b.group === 'egg')).toHaveLength(18);
    expect(BADGES.find(b => b.id === 'plane')?.group).toBe('sky');
  });

  it('gives the rolled kinds their rarity tier, the rest none', () => {
    expect(tier('fish:seahorse')).toBe('rarity.rare');
    expect(tier('fish:shark')).toBe('rarity.veryRare');
    expect(tier('fish:squid')).toBe('rarity.uncommon'); // night only: the night share
    expect(tier('flyer:bat')).toBe('rarity.common');
    expect(tier('boat:sailboat')).toBe('rarity.common');
    expect(tier('cloud:Cb')).toBeNull();
    expect(tier('egg:ufo')).toBeNull();
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
    expect(badgeForCalendarEvent('friday-13', { ...shown, reducedMotion: true })).toBeNull();
    expect(badgeForCalendarEvent('lunar-new-year', { ...shown, reducedMotion: true })).toBeNull();
  });

  it('maps an astro event to its egg badge', () => {
    expect(badgeForAstroEvent('greenFlash')).toBe('egg:greenFlash');
  });

  it('pauses while a test link forces the scene', () => {
    expect(isCollectionPaused('?egg=ufo')).toBe(true);
    expect(isCollectionPaused('?egg=lenticular')).toBe(true);
    expect(isCollectionPaused('?fish=shark')).toBe(true);
    expect(isCollectionPaused('?hunt=1')).toBe(true);
    expect(isCollectionPaused('')).toBe(false);
    expect(isCollectionPaused('?lang=de')).toBe(false);
  });

  it('counts known badges only', () => {
    expect(countCollected({ sun: 'x', 'egg:ufo': 'y', ['fish:nemo' as BadgeId]: 'z' })).toBe(2);
  });
});
