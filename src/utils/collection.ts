// Collection badges (ROADMAP item 112): one badge for each kind of thing seen in the scene and
// for each easter egg, with the date it was first seen. Pure, except loadCollection and
// saveCollection, which use localStorage (try/catch-wrapped like manualLocation).

import { type MessageKey } from '@/i18n';
import { type SceneInfoTarget, getRarityTier } from './sceneInfo';
import { getBoatShare, getFishShare, getFlyerShare, type BirdKind, type BoatKind, type FishKind } from './weatherEffectsUtils';
import { type CloudType } from './skyCloudUtils';
import { type CalendarEvent } from './calendarEvents';
import { FESTIVALS, isFestivalEvent, isFestivalShown, type FestivalEgg } from './festivalEvents';
import { type AstroEventKind } from './astroEvents';
import { type NationalDay, type NationalDayKind } from './nationalDays';
import { type PlayfulEgg } from './playfulEggs';
import { type TimeOfDay } from './sunUtils';
import { getMoonPhaseIndex } from './moonUtils';
import { ridgeAt, type HorizonProfile } from './horizonUtils';

export type EggKind =
  | 'sunglasses' | 'ufo' | 'disco'
  | 'newYear' | 'friday13' | 'lunarNewYear' | 'solstice' | 'equinox' | 'halloweenPumpkin' | 'halloweenBats' | 'christmas' | 'santa'
  | 'solarEclipse' | 'lunarEclipse' | 'greenFlash' | 'supermoon' | 'blueMoon' | 'meteorShower' | 'aurora'
  | 'matariki' | 'conjunction' | 'noctilucent' | 'midnightSun' | 'polarNight'
  | NationalDayKind
  | 'aprilFools' | 'easter' | 'valentine' | 'stPatrick' | 'patientWatcher'
  | FestivalEgg; // item 118: cultural festivals
// Item 115: the states of the sun, the moon and the terrain.
export type SunState = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening';
export type MoonState =
  | 'new' | 'waxingCrescent' | 'firstQuarter' | 'waxingGibbous' | 'full' | 'waningGibbous' | 'thirdQuarter' | 'waningCrescent';
export type TerrainBand = 'hills' | 'lowMountains' | 'mountains' | 'highMountains' | 'alpine';
export type StateBase = 'sun' | 'moon' | 'terrain';
export type BadgeGroup = 'fish' | 'flyer' | 'boat' | 'sky' | 'cloud' | 'egg';
export type BadgeId =
  | `fish:${FishKind}` | `flyer:${BirdKind | 'bat'}` | `boat:${BoatKind}` | 'plane' | `cloud:${CloudType}`
  | 'sun' | 'moon' | 'terrain' | 'satellite' | `egg:${EggKind}`
  | `sun:${SunState}` | `moon:${MoonState}` | `terrain:${TerrainBand}`;
export interface Badge {
  id: BadgeId;
  group: BadgeGroup;
  name: MessageKey;
  // The rarity tier of the spawn share; eggs are ultra rare (item 113); null for things that are not rolled.
  rarity: MessageKey | null;
  // Item 115: a state badge has the base badge it belongs to (the grid row).
  base?: StateBase;
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
// Item 115. The sun states in the order of the day (getTimeOfDay), the moon states in the
// order of getMoonPhaseIndex, the terrain bands from low to high.
export const SUN_STATES: [SunState, MessageKey][] = [
  ['dawn', 'badge.sunDawn'], ['morning', 'badge.sunMorning'], ['midday', 'badge.sunMidday'],
  ['afternoon', 'badge.sunAfternoon'], ['evening', 'badge.sunEvening'],
];
export const MOON_STATES: [MoonState, MessageKey][] = [
  ['new', 'moonPhase.new'], ['waxingCrescent', 'moonPhase.waxingCrescent'], ['firstQuarter', 'moonPhase.firstQuarter'],
  ['waxingGibbous', 'moonPhase.waxingGibbous'], ['full', 'moonPhase.full'], ['waningGibbous', 'moonPhase.waningGibbous'],
  ['thirdQuarter', 'moonPhase.thirdQuarter'], ['waningCrescent', 'moonPhase.waningCrescent'],
];
export const TERRAIN_BANDS: [TerrainBand, MessageKey][] = [
  ['hills', 'badge.terrainHills'], ['lowMountains', 'badge.terrainLowMountains'], ['mountains', 'badge.terrainMountains'],
  ['highMountains', 'badge.terrainHighMountains'], ['alpine', 'badge.terrainAlpine'],
];

const EGGS: [EggKind, MessageKey][] = [
  ['sunglasses', 'egg.sunglasses'], ['ufo', 'egg.ufo'], ['disco', 'egg.disco'],
  ['newYear', 'egg.newYear'], ['friday13', 'egg.friday13'], ['lunarNewYear', 'egg.lunarNewYear'],
  ['solstice', 'egg.solstice'], ['equinox', 'egg.equinox'], ['halloweenPumpkin', 'egg.halloweenPumpkin'],
  ['halloweenBats', 'egg.halloweenBats'], ['christmas', 'egg.christmas'], ['santa', 'egg.santa'],
  ['solarEclipse', 'egg.solarEclipse'], ['lunarEclipse', 'egg.lunarEclipse'], ['greenFlash', 'egg.greenFlash'],
  ['supermoon', 'egg.supermoon'], ['blueMoon', 'egg.blueMoon'], ['meteorShower', 'egg.meteorShower'], ['aurora', 'egg.aurora'],
  // Sky eggs.
  ['matariki', 'egg.matariki'], ['conjunction', 'egg.conjunction'], ['noctilucent', 'egg.noctilucent'],
  ['midnightSun', 'egg.midnightSun'], ['polarNight', 'egg.polarNight'],
  // National days (nationalDays.ts), one badge each.
  ['festaRepubblica', 'egg.festaRepubblica'], ['bastilleDay', 'egg.bastilleDay'], ['independenceDay', 'egg.independenceDay'],
  ['guyFawkes', 'egg.guyFawkes'], ['germanUnity', 'egg.germanUnity'], ['fiestaNacional', 'egg.fiestaNacional'],
  ['canadaDay', 'egg.canadaDay'], ['australiaDay', 'egg.australiaDay'], ['kingsDay', 'egg.kingsDay'],
  // Playful pack (ROADMAP item 117).
  ['aprilFools', 'egg.aprilFools'], ['easter', 'egg.easter'], ['valentine', 'egg.valentine'], ['stPatrick', 'egg.stPatrick'],
  ['patientWatcher', 'egg.patientWatcher'],
  // Item 118: cultural festivals.
  ['loyKrathong', 'egg.loyKrathong'], ['diwali', 'egg.diwali'], ['eidAlFitr', 'egg.eidAlFitr'], ['midAutumn', 'egg.midAutumn'],
  ['hanami', 'egg.hanami'], ['tanabata', 'egg.tanabata'], ['diaDeMuertos', 'egg.diaDeMuertos'], ['holi', 'egg.holi'],
  ['hanukkah', 'egg.hanukkah'], ['nowruz', 'egg.nowruz'], ['midsummer', 'egg.midsummer'], ['carnival', 'egg.carnival'],
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
  { id: 'satellite', group: 'sky', name: 'scene.satellite', rarity: null },
  // Item 115: each base badge, then its states (one grid row each).
  { id: 'sun', group: 'sky', name: 'scene.sun', rarity: null },
  ...SUN_STATES.map(([state, name]): Badge => ({ id: `sun:${state}`, group: 'sky', name, rarity: null, base: 'sun' })),
  { id: 'moon', group: 'sky', name: 'scene.moon', rarity: null },
  ...MOON_STATES.map(([state, name]): Badge => ({ id: `moon:${state}`, group: 'sky', name, rarity: null, base: 'moon' })),
  { id: 'terrain', group: 'sky', name: 'scene.terrain', rarity: null },
  ...TERRAIN_BANDS.map(([band, name]): Badge => ({ id: `terrain:${band}`, group: 'sky', name, rarity: null, base: 'terrain' })),
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

// Item 115: the height band of a ridge point (m above sea level). A limit belongs to the
// higher band (500 m is low mountains).
export const getTerrainBand = (heightM: number): TerrainBand => {
  if (heightM < 500) return 'hills';
  if (heightM < 1000) return 'lowMountains';
  if (heightM < 2000) return 'mountains';
  if (heightM < 3000) return 'highMountains';
  return 'alpine';
};

const SUN_STATE_IDS = new Set<string>(SUN_STATES.map(([state]) => state));

// The sun state of a time of day; null at night and in the twilights.
export const getSunState = (timeOfDay: TimeOfDay): SunState | null =>
  SUN_STATE_IDS.has(timeOfDay) ? timeOfDay as SunState : null;

export const getMoonState = (phase: number): MoonState => MOON_STATES[getMoonPhaseIndex(phase)][0];

export interface StateBadgeContext {
  timeOfDay: TimeOfDay;
  moonPhase: number;
  horizonProfile: HorizonProfile | null;
  isTimePreview: boolean;
}

// Item 115: the state badge that a tap collects with the base badge, or null. The sun and
// moon states depend on the time, so a time preview gives none; the ridge height does not.
export const stateBadgeForTarget = (target: SceneInfoTarget, ctx: StateBadgeContext): BadgeId | null => {
  switch (target.type) {
    case 'sun': {
      const state = ctx.isTimePreview ? null : getSunState(ctx.timeOfDay);
      return state ? `sun:${state}` : null;
    }
    case 'moon':
      return ctx.isTimePreview ? null : `moon:${getMoonState(ctx.moonPhase)}`;
    case 'terrain': {
      const ridge = ctx.horizonProfile ? ridgeAt(ctx.horizonProfile, target.azimuth) : null;
      return ridge ? `terrain:${getTerrainBand(ridge.height)}` : null;
    }
    default: return null;
  }
};

export interface CalendarBadgeOptions {
  isNight: boolean;
  moonUp: boolean;
  weatherType: string;
  reducedMotion: boolean;
  isTimePreview: boolean;
  // Item 118: the festival eggs show by time of day (isFestivalShown); without it they do not count.
  timeOfDay?: TimeOfDay;
}

// The calendar egg's badge when the scene really shows it (CalendarEggs' rules). New Year
// is null: SunTracker collects it where the fireworks start. Never in the time preview.
export const badgeForCalendarEvent = (event: CalendarEvent | null, o: CalendarBadgeOptions): BadgeId | null => {
  if (!event || o.isTimePreview) return null;
  // Item 118: Nowruz gives its own badge; SunTracker adds the equinox badge (NOWRUZ_ALSO).
  if (isFestivalEvent(event)) {
    return o.timeOfDay && isFestivalShown(event, { timeOfDay: o.timeOfDay, weatherType: o.weatherType, reducedMotion: o.reducedMotion })
      ? `egg:${FESTIVALS[event]}` : null;
  }
  switch (event) {
    case 'new-year': return null;
    case 'solstice-longest':
    case 'solstice-shortest': return 'egg:solstice';
    case 'equinox': return 'egg:equinox';
    case 'halloween-pumpkin': return o.moonUp ? 'egg:halloweenPumpkin' : null;
    case 'halloween-bats': return o.isNight && !o.reducedMotion ? 'egg:halloweenBats' : null;
    // Christmas: the lit boats report themselves (useBunting), like a bunting day.
    case 'christmas': return null;
    case 'friday-13': return 'egg:friday13';
    case 'lunar-new-year': return o.reducedMotion ? null : 'egg:lunarNewYear';
    // Playful pack (ROADMAP item 117): the scene reports when the egg really shows
    // (SunTracker.handleEggShown, badgeForPlayfulEgg).
    case 'easter':
    case 'april-fools':
    case 'valentine':
    case 'st-patrick': return null;
  }
};

// Item 118: Nowruz is the March equinox, so it also collects the equinox badge.
export const NOWRUZ_ALSO: BadgeId = 'egg:equinox';

// Christmas Eve: Santa's badge when he flies (`santaTime` from calendarEvents.isSantaTime). He
// flies also when it snows; reduced motion hides him. Never in the time preview.
export const badgeForSanta = (santaTime: boolean, o: Pick<CalendarBadgeOptions, 'reducedMotion' | 'isTimePreview'>): BadgeId | null =>
  santaTime && !o.reducedMotion && !o.isTimePreview ? 'egg:santa' : null;

// Playful pack (ROADMAP item 117): the badge of an egg that the scene shows, never in the time preview.
export const badgeForPlayfulEgg = (kind: PlayfulEgg | 'patientWatcher', isTimePreview: boolean): BadgeId | null =>
  isTimePreview ? null : `egg:${kind}`;

export const badgeForAstroEvent = (kind: AstroEventKind): BadgeId => `egg:${kind}`;

export interface NationalBadgeOptions {
  isDay: boolean; // the sun is up (dawn to evening)
  isNight: boolean; // dark sky: night or astronomical/nautical twilight
  reducedMotion: boolean;
  isTimePreview: boolean;
}

// National days: the badge when the scene really shows the egg (NationalEggs' rules). The jets
// fly by day and the fireworks burst at night; reduced motion hides both, but the Guy Fawkes
// bonfire glow stays. Bunting gives null here: a decorated boat reports itself (useBunting),
// as a bunting day without a boat on screen shows nothing. Never in the time preview.
export const badgeForNationalDay = (day: NationalDay | null, o: NationalBadgeOptions): BadgeId | null => {
  if (!day || o.isTimePreview) return null;
  switch (day.style) {
    case 'jets': return o.isDay && !o.reducedMotion ? `egg:${day.kind}` : null;
    case 'fireworks': return o.isNight && (!o.reducedMotion || day.bonfire) ? `egg:${day.kind}` : null;
    case 'bunting': return null;
  }
};

// Test links (?egg=, ?fish=, ?hunt=, ?country=) force a scene, so nothing counts while one is set.
export const isCollectionPaused = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.has('egg') || params.has('fish') || params.has('hunt') || params.has('country');
};

export const countCollected = (collection: Collection): number =>
  Object.keys(collection).filter(id => IDS.has(id)).length;
