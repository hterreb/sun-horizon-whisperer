// Info cards (ROADMAP item 95): what the card shows for each thing in the scene. Pure: it
// returns dictionary keys and values already formatted for the language; the card
// (SceneInfoCard) translates them. No React, no DOM. Item 107 (field guide look): also the
// kicker (type name and icon), the Latin name, the fact and the rarity tier.

import { formatNumber, type MessageKey, type Translate } from '@/i18n';
import { type Language } from './language';
import { formatTime, type NextGoldenBlueHours, type SunPosition, type SunTimes, type TimeOfDay } from './sunUtils';
import { getMoonPhaseLabel, type MoonPosition, type MoonTimes } from './moonUtils';
import { getMoonEclipticGeocentric } from './lunarEphemeris';
import { isSupermoon } from './astroEvents';
import { horizonAngleAt, ridgeAt, type HorizonProfile } from './horizonUtils';
import { getCloudLayers, type CloudBand, type CloudLayers, type CloudType } from './skyCloudUtils';
import {
  getBatShare, getBoatShare, getFishShare, getFlyerShare, isNightWater, type BirdKind, type BoatKind, type FishKind,
} from './weatherEffectsUtils';
import { type RarityTier } from './rarityTier';
import { type WeatherType } from '@/components/CloudLayer';
import { type SatelliteCard } from './satelliteUtils';
import { type ContrailKind } from './planes';
import { type LiveRoute, type RouteAirport } from './planeFeed';
import { UFO_CHANCE } from './hiddenEggs';
import { SANTA_DAYS_PER_YEAR, getEventDaysPerYear, type CalendarEvent } from './calendarEvents';
import { NATIONAL_DAY_DAYS_PER_YEAR, type NationalDayKind } from './nationalDays';

// Item 113: the easter eggs and special events that are one thing in the scene and take taps.
// Not the collection's EggKind (item 112), which has one badge per egg or event.
export type EggCardKind = 'ufo' | 'ghost' | 'dragon' | 'santa' | 'blackCat' | 'halloweenBat' | 'pumpkinMoon'
  | NationalDayKind;

export type SceneInfoTarget =
  | { type: 'fish'; kind: FishKind }
  | { type: 'bird'; kind: BirdKind | 'bat' }
  | { type: 'boat'; kind: BoatKind }
  | { type: 'plane'; contrail: ContrailKind }
  | { type: 'livePlane'; callsign: string | null; airline: string | null; aircraftType: string | null; altM: number; speedKt: number }
  | { type: 'cloud'; cloudType: CloudType; band: CloudBand }
  | { type: 'sun' }
  | { type: 'moon' }
  | { type: 'terrain'; azimuth: number }
  | { type: 'satellite'; id: number; name: string }
  | { type: 'egg'; kind: EggCardKind };

// A text from the dictionary; a var can be another dictionary text.
export interface InfoText {
  key: MessageKey;
  vars?: Record<string, string | number | InfoText>;
}
// One row: an optional label on the left, the value (a dictionary text or a formatted value).
// The rarity row has its tier, for the card's tier meter.
export interface InfoLine {
  label?: MessageKey;
  value: InfoText | string;
  tier?: RarityTier;
}
// The kicker's icon; SceneInfoCard has the drawing and the colour for each.
export type SceneIconId =
  | 'water' | 'visitor' | 'bird' | 'bat' | 'boat' | 'plane' | 'cloud' | 'sun' | 'moon' | 'terrain' | 'satellite'
  | 'egg' | 'event';
export interface SceneInfo {
  kicker: MessageKey; // the type name over the title
  icon: SceneIconId;
  title: MessageKey;
  latin?: string; // the scientific name; not translated
  lines: InfoLine[];
  fact?: { label: MessageKey; text: MessageKey }; // the "Field note" at the end
  tier: RarityTier | null; // null: no rarity row
}

// What the sun, moon, cloud and terrain cards read; SunTracker has all of it.
export interface SceneInfoContext {
  language: Language;
  now: Date;
  // Day or night fish pool (item 105).
  timeOfDay: TimeOfDay;
  // The day's sun and twilight times of the scene (CloudLayer's time of day), for the bats'
  // share of the flying time (item 107). Null before the place is known.
  sceneSunTimes: SunTimes | null;
  sunPosition: SunPosition;
  // The sunrise and sunset of the pass the arc draws, and the line-of-sight times.
  sunTimes: { sunrise: Date | null; sunset: Date | null } | null;
  terrainSunTimes: { sunrise: Date | null; sunset: Date | null } | null;
  nextGoldenBlueHours: NextGoldenBlueHours | null;
  moonPosition: MoonPosition;
  moonTimes: MoonTimes;
  horizonProfile: HorizonProfile | null;
  weatherType: WeatherType;
  cloudLayers: CloudLayers | null;
  // The tracked satellite's card values (item 97), for a satellite card only.
  satellite?: SatelliteCard | null;
  // The live plane's route (item 111), once the proxy has answered; null leaves it out.
  route?: LiveRoute | null;
}

// Item 107: the Latin name where the kind is one species. Group names (fish, ray, sea turtle,
// jellyfish, seahorse, whale, pufferfish, lanternfish, anglerfish, shark, dolphins) have none.
// The catfish of a European lake is the wels; the glowing squid is the firefly squid.
const FISH: Record<FishKind, { name: MessageKey; fact: MessageKey; latin?: string }> = {
  classic: { name: 'fish.classic', fact: 'fishFact.classic' },
  minnow: { name: 'fish.minnow', fact: 'fishFact.minnow', latin: 'Phoxinus phoxinus' },
  perch: { name: 'fish.perch', fact: 'fishFact.perch', latin: 'Perca fluviatilis' },
  pike: { name: 'fish.pike', fact: 'fishFact.pike', latin: 'Esox lucius' },
  carp: { name: 'fish.carp', fact: 'fishFact.carp', latin: 'Cyprinus carpio' },
  catfish: { name: 'fish.catfish', fact: 'fishFact.catfish', latin: 'Silurus glanis' },
  trout: { name: 'fish.trout', fact: 'fishFact.trout', latin: 'Salmo trutta' },
  ray: { name: 'fish.ray', fact: 'fishFact.ray' },
  turtle: { name: 'fish.turtle', fact: 'fishFact.turtle' },
  jellyfish: { name: 'fish.jellyfish', fact: 'fishFact.jellyfish' },
  seahorse: { name: 'fish.seahorse', fact: 'fishFact.seahorse' },
  whale: { name: 'fish.whale', fact: 'fishFact.whale' },
  pufferfish: { name: 'fish.pufferfish', fact: 'fishFact.pufferfish' },
  burbot: { name: 'fish.burbot', fact: 'fishFact.burbot', latin: 'Lota lota' },
  eel: { name: 'fish.eel', fact: 'fishFact.eel', latin: 'Anguilla anguilla' },
  lanternfish: { name: 'fish.lanternfish', fact: 'fishFact.lanternfish' },
  anglerfish: { name: 'fish.anglerfish', fact: 'fishFact.anglerfish' },
  squid: { name: 'fish.squid', fact: 'fishFact.squid', latin: 'Watasenia scintillans' },
  shark: { name: 'fish.shark', fact: 'fishFact.shark' },
  dolphins: { name: 'fish.dolphins', fact: 'fishFact.dolphins' },
};
// Item 65: these swim only at night. The jellyfish and the sea visitors (item 85) come day
// and night; all other fish are day fish (at night only in the moonlight).
const NIGHT_ONLY: FishKind[] = ['burbot', 'eel', 'lanternfish', 'anglerfish', 'squid'];
const DAY_AND_NIGHT: FishKind[] = ['jellyfish', 'shark', 'dolphins'];

// Item 74's seasons (BIRD_MONTHS in weatherEffectsUtils), as words, so they hold in both
// hemispheres. The bats fly at dusk all year.
// Item 107: the Latin name of the common species at Lake Constance (item 74). Gulls, geese and
// bats are several common species there, so they have none.
const BIRDS: Record<BirdKind | 'bat', { name: MessageKey; fact: MessageKey; season: MessageKey; latin?: string }> = {
  gull: { name: 'bird.gull', fact: 'birdFact.gull', season: 'info.allYear' },
  heron: { name: 'bird.heron', fact: 'birdFact.heron', season: 'info.allYear', latin: 'Ardea cinerea' },
  stork: { name: 'bird.stork', fact: 'birdFact.stork', season: 'info.springSummer', latin: 'Ciconia ciconia' },
  swan: { name: 'bird.swan', fact: 'birdFact.swan', season: 'info.allYear', latin: 'Cygnus olor' },
  geese: { name: 'bird.geese', fact: 'birdFact.geese', season: 'info.migration' },
  cormorant: { name: 'bird.cormorant', fact: 'birdFact.cormorant', season: 'info.allYear', latin: 'Phalacrocorax carbo' },
  kestrel: { name: 'bird.kestrel', fact: 'birdFact.kestrel', season: 'info.allYear', latin: 'Falco tinnunculus' },
  starlings: { name: 'bird.starlings', fact: 'birdFact.starlings', season: 'info.autumn', latin: 'Sturnus vulgaris' },
  bat: { name: 'bird.bat', fact: 'birdFact.bat', season: 'info.dusk' },
};

const BOATS: Record<BoatKind, { name: MessageKey; fact: MessageKey }> = {
  sailboat: { name: 'boat.sailboat', fact: 'boatFact.sailboat' },
  ferry: { name: 'boat.ferry', fact: 'boatFact.ferry' },
  fishing: { name: 'boat.fishing', fact: 'boatFact.fishing' },
  rowboat: { name: 'boat.rowboat', fact: 'boatFact.rowboat' },
  freighter: { name: 'boat.freighter', fact: 'boatFact.freighter' },
};

// Item 96: the contrail that the plane leaves in the upper air of the forecast.
const CONTRAILS: Record<ContrailKind, MessageKey> = {
  none: 'contrail.none', short: 'contrail.short', medium: 'contrail.medium', persistent: 'contrail.persistent',
};

const CLOUDS: Record<CloudType, MessageKey> = {
  Ci: 'cloud.Ci', Cs: 'cloud.Cs', Ac: 'cloud.Ac', As: 'cloud.As', Cu: 'cloud.Cu', Sc: 'cloud.Sc',
  St: 'cloud.St', Ns: 'cloud.Ns', Cb: 'cloud.Cb', Len: 'cloud.Len', Mam: 'cloud.Mam',
};
// Item 106: one fact per cloud type.
const CLOUD_FACTS: Record<CloudType, MessageKey> = {
  Ci: 'cloudFact.Ci', Cs: 'cloudFact.Cs', Ac: 'cloudFact.Ac', As: 'cloudFact.As', Cu: 'cloudFact.Cu', Sc: 'cloudFact.Sc',
  St: 'cloudFact.St', Ns: 'cloudFact.Ns', Cb: 'cloudFact.Cb', Len: 'cloudFact.Len', Mam: 'cloudFact.Mam',
};
// Item 107: the WMO Latin name. The card shows it only when the title differs (in English most
// titles are the Latin genus). Mammatus is a feature, not a genus or species, so it has none.
const CLOUD_LATIN: Partial<Record<CloudType, string>> = {
  Ci: 'Cirrus', Cs: 'Cirrostratus', Ac: 'Altocumulus', As: 'Altostratus', Cu: 'Cumulus', Sc: 'Stratocumulus',
  St: 'Stratus', Ns: 'Nimbostratus', Cb: 'Cumulonimbus', Len: 'Altocumulus lenticularis',
};
const LAYERS: Record<CloudBand, MessageKey> = { low: 'info.layerLow', mid: 'info.layerMid', high: 'info.layerHigh' };

// Item 113: the egg cards. A hidden egg is an "Easter egg", a calendar egg a "Special event".
// The chance comes from the code: the UFO's roll per night (hiddenEggs), or the days a year of
// the calendar event (calendarEvents). Santa flies on one of the 3 Christmas days (Dec 24), so
// he has his own days a year. The ghost shows every night at 00:00, so it has no chance: its
// card shows the tier alone.
type EggChance = { perNight: number } | { event: CalendarEvent } | { daysPerYear: number } | null;
const EGGS: Record<EggCardKind, { name: MessageKey; fact: MessageKey; hidden: boolean; chance: EggChance; latin?: string }> = {
  ufo: { name: 'egg.ufo', fact: 'eggFact.ufo', hidden: true, chance: { perNight: UFO_CHANCE } },
  ghost: { name: 'egg.ghost', fact: 'eggFact.ghost', hidden: true, chance: null },
  dragon: { name: 'egg.dragon', fact: 'eggFact.dragon', hidden: false, chance: { event: 'lunar-new-year' } },
  santa: { name: 'egg.santa', fact: 'eggFact.santa', hidden: false, chance: { daysPerYear: SANTA_DAYS_PER_YEAR } },
  blackCat: { name: 'egg.blackCat', fact: 'eggFact.blackCat', hidden: false, chance: { event: 'friday-13' }, latin: 'Felis catus' },
  halloweenBat: { name: 'egg.halloweenBat', fact: 'eggFact.halloweenBat', hidden: false, chance: { event: 'halloween-bats' } },
  pumpkinMoon: { name: 'egg.halloweenPumpkin', fact: 'eggFact.pumpkinMoon', hidden: false, chance: { event: 'halloween-pumpkin' } },
  // National days (nationalDays.ts): one day a year in one country.
  festaRepubblica: { name: 'egg.festaRepubblica', fact: 'eggFact.festaRepubblica', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
  bastilleDay: { name: 'egg.bastilleDay', fact: 'eggFact.bastilleDay', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
  independenceDay: { name: 'egg.independenceDay', fact: 'eggFact.independenceDay', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
  guyFawkes: { name: 'egg.guyFawkes', fact: 'eggFact.guyFawkes', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
  germanUnity: { name: 'egg.germanUnity', fact: 'eggFact.germanUnity', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
  fiestaNacional: { name: 'egg.fiestaNacional', fact: 'eggFact.fiestaNacional', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
  canadaDay: { name: 'egg.canadaDay', fact: 'eggFact.canadaDay', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
  australiaDay: { name: 'egg.australiaDay', fact: 'eggFact.australiaDay', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
  kingsDay: { name: 'egg.kingsDay', fact: 'eggFact.kingsDay', hidden: false, chance: { daysPerYear: NATIONAL_DAY_DAYS_PER_YEAR } },
};

const DIRECTIONS: MessageKey[] = [
  'direction.n', 'direction.ne', 'direction.e', 'direction.se',
  'direction.s', 'direction.sw', 'direction.w', 'direction.nw',
];

// "SW (225°)": the 8-point direction and the whole degrees.
export const directionText = (azimuth: number): InfoText => {
  const az = ((Math.round(azimuth) % 360) + 360) % 360;
  return { key: 'info.directionValue', vars: { dir: { key: DIRECTIONS[Math.round(az / 45) % 8] }, deg: az } };
};

// "+12.3°" / "-0.4°" in the language's number format; "0.0°", never "-0.0°".
const signedDegrees = (value: number, language: Language): string => {
  const rounded = Math.round(value * 10) / 10;
  const text = `${formatNumber(language, Math.abs(rounded), 1)}°`;
  return rounded === 0 ? text : `${rounded > 0 ? '+' : '-'}${text}`;
};

const percent = (fraction: number, language: Language): string =>
  new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(fraction);

// Item 105: the rarity tier of a spawn share (percent): the first tier whose minimum it reaches.
// Item 113: "frequent" between common and uncommon. "Ultra rare" is not here: only the easter
// eggs have it.
export const RARITY_TIERS: [minShare: number, tier: RarityTier][] = [
  [25, 'common'], [10, 'frequent'], [3, 'uncommon'], [1, 'rare'], [0, 'veryRare'],
];
export const RARITY_NAMES: Record<RarityTier, MessageKey> = {
  common: 'rarity.common', frequent: 'rarity.frequent', uncommon: 'rarity.uncommon',
  rare: 'rarity.rare', veryRare: 'rarity.veryRare', ultraRare: 'rarity.ultraRare',
};

export const rarityTier = (share: number): RarityTier => RARITY_TIERS.find(([min]) => share >= min)?.[1] ?? 'veryRare';

// Item 112: the tier's name key, for the collection badges.
export const getRarityTier = (share: number): MessageKey => RARITY_NAMES[rarityTier(share)];

// "Very rare · 0.5 %": the tier and the share, with at most one decimal ("<0.1" below that).
const rarityLine = (share: number, language: Language): InfoLine & { tier: RarityTier } => {
  const tier = rarityTier(share);
  const rounded = Math.round(share * 10) / 10;
  const value = rounded < 0.1 ? `<${formatNumber(language, 0.1, 1)}`
    : formatNumber(language, rounded, Number.isInteger(rounded) ? 0 : 1);
  return { label: 'info.rarity', value: { key: 'info.rarityValue', vars: { tier: { key: RARITY_NAMES[tier] }, share: value } }, tier };
};

// "0.5 % per night", "1 day a year", "1.6 days a year", "1 day in 5 years"; null: no chance.
const eggChanceText = (chance: EggChance, language: Language): InfoText | null => {
  if (!chance) return null;
  const oneDecimal = (value: number) => {
    const rounded = Math.round(value * 10) / 10;
    return formatNumber(language, rounded, Number.isInteger(rounded) ? 0 : 1);
  };
  if ('perNight' in chance) return { key: 'eggChance.perNight', vars: { share: oneDecimal(chance.perNight * 100) } };
  const days = 'daysPerYear' in chance ? chance.daysPerYear : getEventDaysPerYear(chance.event);
  if (days <= 0) return null;
  const years = Math.round(1 / days);
  if (days < 1 && years >= 2) return { key: 'eggChance.oneDayInYears', vars: { years } };
  return Math.round(days * 10) === 10 ? { key: 'eggChance.dayAYear' } : { key: 'eggChance.daysAYear', vars: { days: oneDecimal(days) } };
};

// "Ultra rare · 0.5 % per night", or "Ultra rare" alone.
const eggRarityLine = (chance: EggChance, language: Language): InfoLine => {
  const tier: InfoText = { key: RARITY_NAMES.ultraRare };
  const text = eggChanceText(chance, language);
  return { label: 'info.rarity', value: text ? { key: 'info.rarityChance', vars: { tier, chance: text } } : tier, tier: 'ultraRare' };
};

const fieldNote = (text: MessageKey) => ({ label: 'info.fieldNote' as const, text });

// "2 h 13 min", or "45 min" under an hour.
export const durationText = (ms: number): InfoText => {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  return minutes < 60
    ? { key: 'common.minutes', vars: { value: minutes } }
    : { key: 'info.hoursMinutes', vars: { hours: Math.floor(minutes / 60), minutes: minutes % 60 } };
};

// "850 m" under 1 km, else "4.2 km".
export const distanceText = (metres: number, language: Language): InfoText =>
  metres < 1000
    ? { key: 'info.metres', vars: { value: formatNumber(language, Math.round(metres), 0) } }
    : { key: 'info.km', vars: { value: formatNumber(language, metres / 1000, 1) } };

// The next sunrise or sunset still ahead (line of sight when there is one), with the time to go.
const nextSunEvent = ({ now, sunTimes, terrainSunTimes }: SceneInfoContext): InfoLine | null => {
  const events = [
    { key: 'info.sunriseIn' as const, time: terrainSunTimes?.sunrise ?? sunTimes?.sunrise ?? null },
    { key: 'info.sunsetIn' as const, time: terrainSunTimes?.sunset ?? sunTimes?.sunset ?? null },
  ].filter((e): e is { key: 'info.sunriseIn' | 'info.sunsetIn'; time: Date } => !!e.time && e.time.getTime() > now.getTime());
  if (events.length === 0) return null;
  const next = events.reduce((a, b) => (b.time.getTime() < a.time.getTime() ? b : a));
  return { value: { key: next.key, vars: { time: durationText(next.time.getTime() - now.getTime()) } } };
};

// "05:43" today, else "Wed 05:43".
const dayTime = (time: Date, now: Date, language: Language): string =>
  time.toDateString() === now.toDateString()
    ? formatTime(time, language)
    : `${new Intl.DateTimeFormat(language, { weekday: 'short' }).format(time)} ${formatTime(time, language)}`;

// "Paris (CDG) → Tel Aviv (TLV)" when both places are short, else "CDG → TLV".
const ROUTE_NAME_MAX = 12;
const routeText = ({ from, to }: LiveRoute): string => {
  const named = [from, to].every(a => a.name && a.name.length <= ROUTE_NAME_MAX);
  const airport = (a: RouteAirport) => (named ? `${a.name} (${a.code})` : a.code);
  return `${airport(from)} → ${airport(to)}`;
};

// The satellite card (item 97): the name, the height, the speed, the time until it enters the
// Earth's shadow ("now" when it is in the shadow) and the next pass.
const satelliteLines = (name: string, ctx: SceneInfoContext): InfoLine[] => {
  const { language, now } = ctx;
  const details = ctx.satellite?.details ?? null;
  const pass = ctx.satellite?.nextPass ?? null;
  const shadow: InfoText | string = !details ? '—'
    : !details.sunlit ? { key: 'info.now' }
    : details.shadowInMs === null ? '—'
    : { key: 'info.inTime', vars: { time: durationText(details.shadowInMs) } };
  return [
    { value: name },
    ...(details ? [
      { label: 'info.altitude' as const, value: { key: 'info.km' as const, vars: { value: formatNumber(language, Math.round(details.heightKm), 0) } } },
      { label: 'info.speed' as const, value: { key: 'info.kmPerSecond' as const, vars: { value: formatNumber(language, details.speedKmS, 1) } } },
    ] : []),
    { label: 'info.toShadow', value: shadow },
    { label: 'info.nextPass', value: pass ? dayTime(pass.start, now, language) : '—' },
  ];
};

const goldenHour = ({ now, nextGoldenBlueHours, language }: SceneInfoContext): InfoText | string => {
  const window = nextGoldenBlueHours?.golden;
  if (!window) return '—';
  if (now.getTime() >= window.start.getTime()) return { key: 'golden.nowUntil', vars: { time: formatTime(window.end, language) } };
  return { key: 'info.timeRange', vars: { start: formatTime(window.start, language), end: formatTime(window.end, language) } };
};

export const getSceneInfo = (target: SceneInfoTarget, ctx: SceneInfoContext): SceneInfo => {
  const { language } = ctx;
  switch (target.type) {
    case 'fish': {
      const fish = FISH[target.kind];
      const when: MessageKey = NIGHT_ONLY.includes(target.kind) ? 'info.nightFish'
        : DAY_AND_NIGHT.includes(target.kind) ? 'info.dayAndNight' : 'info.dayFish';
      const rarity = rarityLine(getFishShare(target.kind, isNightWater(ctx.timeOfDay)), language);
      const visitor = target.kind === 'shark' || target.kind === 'dolphins';
      return {
        kicker: visitor ? 'infoKind.seaVisitor' : 'infoKind.water',
        icon: visitor ? 'visitor' : 'water',
        title: fish.name,
        latin: fish.latin,
        lines: [{ value: { key: when } }, rarity],
        fact: fieldNote(fish.fact),
        tier: rarity.tier,
      };
    }
    case 'bird': {
      const bird = BIRDS[target.kind];
      const bat = target.kind === 'bat';
      // Without the day's sun times there is no bat share, so no flyer has a rarity row.
      const rarity = ctx.sceneSunTimes
        ? rarityLine(getFlyerShare(target.kind, getBatShare(ctx.sceneSunTimes)), language) : null;
      return {
        kicker: bat ? 'infoKind.bat' : 'infoKind.bird',
        icon: bat ? 'bat' : 'bird',
        title: bird.name,
        latin: bird.latin,
        lines: [{ label: 'info.season', value: { key: bird.season } }, ...(rarity ? [rarity] : [])],
        fact: fieldNote(bird.fact),
        tier: rarity?.tier ?? null,
      };
    }
    case 'boat': {
      const boat = BOATS[target.kind];
      const rarity = rarityLine(getBoatShare(target.kind), language);
      return {
        kicker: 'infoKind.boat', icon: 'boat', title: boat.name, lines: [rarity], fact: fieldNote(boat.fact), tier: rarity.tier,
      };
    }
    case 'plane':
      return {
        kicker: 'infoKind.plane',
        icon: 'plane',
        title: 'plane.airliner',
        lines: [
          { label: 'info.altitude', value: { key: 'info.cruiseAltitude' } },
          { label: 'info.contrail', value: { key: CONTRAILS[target.contrail] } },
        ],
        fact: fieldNote('planeFact.airliner'),
        tier: null,
      };
    case 'livePlane':
      // Item 96 (Premium): an aircraft of the live feed. The feed has no airline: it comes from
      // the callsign (liveRadar). The route comes later, from its own request (item 111).
      return {
        kicker: 'infoKind.plane',
        icon: 'plane',
        title: 'plane.live',
        tier: null,
        lines: [
          { label: 'info.callsign', value: target.callsign ?? '—' },
          { label: 'info.airline', value: target.airline ?? '—' },
          { label: 'info.aircraftType', value: target.aircraftType ?? '—' },
          { label: 'info.altitude', value: { key: 'info.km', vars: { value: formatNumber(language, target.altM / 1000, 1) } } },
          { label: 'info.speed', value: { key: 'info.kmh', vars: { value: formatNumber(language, Math.round(target.speedKt * 1.852), 0) } } },
          ...(ctx.route ? [{ label: 'info.route' as const, value: routeText(ctx.route) }] : []),
        ],
      };
    case 'cloud': {
      const cover = getCloudLayers(ctx.weatherType, ctx.cloudLayers)[target.band];
      return {
        kicker: 'infoKind.cloud',
        icon: 'cloud',
        title: CLOUDS[target.cloudType],
        latin: CLOUD_LATIN[target.cloudType],
        lines: [
          { label: 'info.layer', value: { key: LAYERS[target.band] } },
          { label: 'info.cover', value: percent(cover / 100, language) },
        ],
        fact: { label: 'info.cloudFact', text: CLOUD_FACTS[target.cloudType] },
        tier: null,
      };
    }
    case 'sun': {
      const next = nextSunEvent(ctx);
      return {
        kicker: 'infoKind.sky',
        icon: 'sun',
        title: 'scene.sun',
        tier: null,
        lines: [
          { label: 'info.altitude', value: signedDegrees(ctx.sunPosition.altitude, language) },
          { label: 'info.direction', value: directionText(ctx.sunPosition.azimuth) },
          ...(next ? [next] : []),
          { label: 'info.goldenHour', value: goldenHour(ctx) },
        ],
      };
    }
    case 'moon': {
      const { moonPosition, moonTimes, now } = ctx;
      const distanceKm = getMoonEclipticGeocentric(now).distanceKm;
      const riseSet = (time: Date | null): InfoText | string =>
        time ? formatTime(time, language) : moonTimes.alwaysUp ? { key: 'moon.upAllDay' } : moonTimes.alwaysDown ? { key: 'moon.downAllDay' } : '—';
      return {
        kicker: 'infoKind.sky',
        icon: 'moon',
        title: 'scene.moon',
        tier: null,
        lines: [
          { label: 'info.phase', value: { key: getMoonPhaseLabel(moonPosition.phase) } },
          { label: 'info.lit', value: percent(moonPosition.illumination, language) },
          { label: 'moon.rise', value: riseSet(moonTimes.rise) },
          { label: 'moon.set', value: riseSet(moonTimes.set) },
          { label: 'info.distance', value: { key: 'info.km', vars: { value: formatNumber(language, Math.round(distanceKm / 100) * 100, 0) } } },
          ...(isSupermoon(now) ? [{ value: { key: 'info.supermoon' as const } }] : []),
        ],
      };
    }
    case 'terrain': {
      const profile = ctx.horizonProfile;
      const ridge = profile ? ridgeAt(profile, target.azimuth) : null;
      return {
        kicker: 'infoKind.horizon',
        icon: 'terrain',
        title: 'scene.terrain',
        tier: null,
        lines: [
          { label: 'info.direction', value: directionText(target.azimuth) },
          ...(profile ? [{ label: 'info.horizonAngle' as const, value: signedDegrees(horizonAngleAt(profile, target.azimuth), language) }] : []),
          ...(ridge ? [
            { label: 'info.ridgeDistance' as const, value: distanceText(ridge.distance, language) },
            { label: 'info.ridgeHeight' as const, value: { key: 'info.metresAsl' as const, vars: { value: formatNumber(language, ridge.height, 0) } } },
          ] : []),
        ],
      };
    }
    case 'satellite':
      return { kicker: 'infoKind.orbit', icon: 'satellite', title: 'scene.satellite', lines: satelliteLines(target.name, ctx), tier: null };
    case 'egg': {
      const egg = EGGS[target.kind];
      return {
        kicker: egg.hidden ? 'infoKind.easterEgg' : 'infoKind.specialEvent',
        icon: egg.hidden ? 'egg' : 'event',
        title: egg.name,
        latin: egg.latin,
        lines: [eggRarityLine(egg.chance, language)],
        fact: fieldNote(egg.fact),
        tier: 'ultraRare',
      };
    }
  }
};

// Translates a card text, with its nested texts.
export const resolveInfoText = (t: Translate, text: InfoText | string): string => {
  if (typeof text === 'string') return text;
  const vars = text.vars && Object.fromEntries(
    Object.entries(text.vars).map(([name, value]) => [name, typeof value === 'object' ? resolveInfoText(t, value) : value]),
  );
  return t(text.key, vars);
};
