// Collection badges (ROADMAP item 112): one badge for each kind of thing seen in the scene and
// for each easter egg, with the date it was first seen. Pure, except loadCollection and
// saveCollection, which use localStorage (try/catch-wrapped like manualLocation).

import { type MessageKey } from '@/i18n';
import { type SceneInfoTarget, getRarityTier } from './sceneInfo';
import { getBoatShare, getFishShare, getFlyerShare, type BirdKind, type BoatKind, type FishKind } from './weatherEffectsUtils';
import { type CloudType } from './skyCloudUtils';
import { type CalendarEvent } from './calendarEvents';
import { type AstroEventKind } from './astroEvents';

export type EggKind =
  | 'sunglasses' | 'ufo' | 'disco'
  | 'newYear' | 'friday13' | 'lunarNewYear' | 'solstice' | 'equinox' | 'halloweenPumpkin' | 'halloweenBats' | 'christmas' | 'santa'
  | 'solarEclipse' | 'lunarEclipse' | 'greenFlash' | 'supermoon' | 'blueMoon' | 'meteorShower' | 'aurora';
export type BadgeGroup = 'fish' | 'flyer' | 'boat' | 'sky' | 'cloud' | 'egg';
export type BadgeId =
  | `fish:${FishKind}` | `flyer:${BirdKind | 'bat'}` | `boat:${BoatKind}` | 'plane' | `cloud:${CloudType}`
  | 'sun' | 'moon' | 'terrain' | 'satellite' | `egg:${EggKind}`;
export interface Badge {
  id: BadgeId;
  group: BadgeGroup;
  name: MessageKey;
  // The rarity tier of the spawn share; eggs are ultra rare (item 113); null for things that are not rolled.
  rarity: MessageKey | null;
}

// The first-seen time (ISO) of each badge found.
export type Collection = Partial<Record<BadgeId, string>>;
export const COLLECTION_STORAGE_KEY = 'collection';

// Literal keys, so tests/i18n.test.ts finds them in src/.
const FISH: [FishKind, MessageKey][] = [
  ['classic', 'fish.classic'], ['minnow', 'fish.minnow'], ['perch', 'fish.perch'], ['pike', 'fish.pike'],
  ['carp', 'fish.carp'], ['catfish', 'fish.catfish'], ['trout', 'fish.trout'], ['ray', 'fish.ray'],
  ['turtle', 'fish.turtle'], ['jellyfish', 'fish.jellyfish'], ['seahorse', 'fish.seahorse'], ['whale', 'fish.whale'],
  ['pufferfish', 'fish.pufferfish'], ['burbot', 'fish.burbot'], ['eel', 'fish.eel'], ['lanternfish', 'fish.lanternfish'],
  ['anglerfish', 'fish.anglerfish'], ['squid', 'fish.squid'], ['shark', 'fish.shark'], ['dolphins', 'fish.dolphins'],
];
const FLYERS: [BirdKind | 'bat', MessageKey][] = [
  ['gull', 'bird.gull'], ['heron', 'bird.heron'], ['stork', 'bird.stork'], ['swan', 'bird.swan'], ['geese', 'bird.geese'],
  ['cormorant', 'bird.cormorant'], ['kestrel', 'bird.kestrel'], ['starlings', 'bird.starlings'], ['bat', 'bird.bat'],
];
const BOATS: [BoatKind, MessageKey][] = [
  ['sailboat', 'boat.sailboat'], ['ferry', 'boat.ferry'], ['fishing', 'boat.fishing'], ['rowboat', 'boat.rowboat'],
  ['freighter', 'boat.freighter'],
];
const CLOUDS: [CloudType, MessageKey][] = [
  ['Ci', 'cloud.Ci'], ['Cs', 'cloud.Cs'], ['Ac', 'cloud.Ac'], ['As', 'cloud.As'], ['Cu', 'cloud.Cu'], ['Sc', 'cloud.Sc'],
  ['St', 'cloud.St'], ['Ns', 'cloud.Ns'], ['Cb', 'cloud.Cb'], ['Len', 'cloud.Len'], ['Mam', 'cloud.Mam'],
];
const EGGS: [EggKind, MessageKey][] = [
  ['sunglasses', 'egg.sunglasses'], ['ufo', 'egg.ufo'], ['disco', 'egg.disco'],
  ['newYear', 'egg.newYear'], ['friday13', 'egg.friday13'], ['lunarNewYear', 'egg.lunarNewYear'],
  ['solstice', 'egg.solstice'], ['equinox', 'egg.equinox'], ['halloweenPumpkin', 'egg.halloweenPumpkin'],
  ['halloweenBats', 'egg.halloweenBats'], ['christmas', 'egg.christmas'], ['santa', 'egg.santa'],
  ['solarEclipse', 'egg.solarEclipse'], ['lunarEclipse', 'egg.lunarEclipse'], ['greenFlash', 'egg.greenFlash'],
  ['supermoon', 'egg.supermoon'], ['blueMoon', 'egg.blueMoon'], ['meteorShower', 'egg.meteorShower'], ['aurora', 'egg.aurora'],
];

// The grid order. A fish's tier is its day share; getFishShare falls back to the night share
// for the night-only fish.
// ponytail: a badge has one fixed tier, so the bats' share (by the hours of the day since
// item 107) is a typical mid-latitude value; pass the real sun times if badges should vary.
const BADGE_BAT_SHARE = 20;

export const BADGES: readonly Badge[] = [
  ...FISH.map(([kind, name]): Badge => ({ id: `fish:${kind}`, group: 'fish', name, rarity: getRarityTier(getFishShare(kind, false)) })),
  ...FLYERS.map(([kind, name]): Badge => ({ id: `flyer:${kind}`, group: 'flyer', name, rarity: getRarityTier(getFlyerShare(kind, BADGE_BAT_SHARE)) })),
  ...BOATS.map(([kind, name]): Badge => ({ id: `boat:${kind}`, group: 'boat', name, rarity: getRarityTier(getBoatShare(kind)) })),
  { id: 'plane', group: 'sky', name: 'plane.airliner', rarity: null },
  { id: 'sun', group: 'sky', name: 'scene.sun', rarity: null },
  { id: 'moon', group: 'sky', name: 'scene.moon', rarity: null },
  { id: 'terrain', group: 'sky', name: 'scene.terrain', rarity: null },
  { id: 'satellite', group: 'sky', name: 'scene.satellite', rarity: null },
  ...CLOUDS.map(([type, name]): Badge => ({ id: `cloud:${type}`, group: 'cloud', name, rarity: null })),
  ...EGGS.map(([kind, name]): Badge => ({ id: `egg:${kind}`, group: 'egg', name, rarity: 'rarity.ultraRare' })),
];
const IDS = new Set<string>(BADGES.map(b => b.id));

export const loadCollection = (): Collection => {
  try {
    const raw = localStorage.getItem(COLLECTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([id, seen]) => IDS.has(id) && typeof seen === 'string'),
    ) as Collection;
  } catch (error) {
    console.error('Error reading collection:', error);
    return {};
  }
};

export const saveCollection = (collection: Collection): void => {
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
  } catch (error) {
    console.error('Error saving collection:', error);
  }
};

// A new collection with the badge, or null when it is already there (the first date stays).
export const addToCollection = (collection: Collection, id: BadgeId, now: Date): Collection | null =>
  collection[id] ? null : { ...collection, [id]: now.toISOString() };

// Item 113: an egg card gives no badge. The egg's badge counts when the egg shows (the rules
// below and SunTracker), so a tap in a time preview or on the ghost (no badge) adds nothing.
export const badgeForTarget = (target: SceneInfoTarget): BadgeId | null => {
  switch (target.type) {
    case 'fish': return `fish:${target.kind}`;
    case 'bird': return `flyer:${target.kind}`;
    case 'boat': return `boat:${target.kind}`;
    case 'plane':
    case 'livePlane': return 'plane';
    case 'cloud': return `cloud:${target.cloudType}`;
    case 'sun':
    case 'moon':
    case 'terrain':
    case 'satellite': return target.type;
    case 'egg': return null;
  }
};

export interface CalendarBadgeOptions {
  isNight: boolean;
  moonUp: boolean;
  weatherType: string;
  reducedMotion: boolean;
  isTimePreview: boolean;
}

// The calendar egg's badge when the scene really shows it (CalendarEggs' rules). New Year
// is null: SunTracker collects it where the fireworks start. Never in the time preview.
export const badgeForCalendarEvent = (event: CalendarEvent | null, o: CalendarBadgeOptions): BadgeId | null => {
  if (!event || o.isTimePreview) return null;
  switch (event) {
    case 'new-year': return null;
    case 'solstice-longest':
    case 'solstice-shortest': return 'egg:solstice';
    case 'equinox': return 'egg:equinox';
    case 'halloween-pumpkin': return o.moonUp ? 'egg:halloweenPumpkin' : null;
    case 'halloween-bats': return o.isNight && !o.reducedMotion ? 'egg:halloweenBats' : null;
    case 'christmas': return o.weatherType !== 'snow' && !o.reducedMotion ? 'egg:christmas' : null;
    case 'friday-13': return o.reducedMotion ? null : 'egg:friday13';
    case 'lunar-new-year': return o.reducedMotion ? null : 'egg:lunarNewYear';
  }
};

// Christmas Eve: Santa's badge when he flies (`santaTime` from calendarEvents.isSantaTime). He
// flies also when it snows; reduced motion hides him. Never in the time preview.
export const badgeForSanta = (santaTime: boolean, o: Pick<CalendarBadgeOptions, 'reducedMotion' | 'isTimePreview'>): BadgeId | null =>
  santaTime && !o.reducedMotion && !o.isTimePreview ? 'egg:santa' : null;

export const badgeForAstroEvent = (kind: AstroEventKind): BadgeId => `egg:${kind}`;

// Test links (?egg=, ?fish=, ?hunt=) force a scene, so nothing counts while one is set.
export const isCollectionPaused = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.has('egg') || params.has('fish') || params.has('hunt');
};

export const countCollected = (collection: Collection): number =>
  Object.keys(collection).filter(id => IDS.has(id)).length;
