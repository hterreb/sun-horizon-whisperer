// Info cards (ROADMAP item 95): what the card shows for each thing in the scene. Pure: it
// returns dictionary keys and values already formatted for the language; the card
// (SceneInfoCard) translates them. No React, no DOM.

import { formatNumber, type MessageKey, type Translate } from '@/i18n';
import { type Language } from './language';
import { formatTime, type NextGoldenBlueHours, type SunPosition } from './sunUtils';
import { getMoonPhaseLabel, type MoonPosition, type MoonTimes } from './moonUtils';
import { getMoonEclipticGeocentric } from './lunarEphemeris';
import { isSupermoon } from './astroEvents';
import { horizonAngleAt, ridgeAt, type HorizonProfile } from './horizonUtils';
import { getCloudLayers, type CloudBand, type CloudLayers, type CloudType } from './skyCloudUtils';
import { type BirdKind, type BoatKind, type FishKind } from './weatherEffectsUtils';
import { type WeatherType } from '@/components/CloudLayer';
import { type SatelliteCard } from './satelliteUtils';
import { type ContrailKind } from './planes';

export type SceneInfoTarget =
  | { type: 'fish'; kind: FishKind }
  | { type: 'bird'; kind: BirdKind | 'bat' }
  | { type: 'boat'; kind: BoatKind }
  | { type: 'plane'; contrail: ContrailKind }
  | { type: 'cloud'; cloudType: CloudType; band: CloudBand }
  | { type: 'sun' }
  | { type: 'moon' }
  | { type: 'terrain'; azimuth: number }
  | { type: 'satellite'; id: number; name: string };

// A text from the dictionary; a var can be another dictionary text.
export interface InfoText {
  key: MessageKey;
  vars?: Record<string, string | number | InfoText>;
}
// One row: an optional label on the left, the value (a dictionary text or a formatted value).
export interface InfoLine {
  label?: MessageKey;
  value: InfoText | string;
}
export interface SceneInfo {
  title: MessageKey;
  lines: InfoLine[];
}

// What the sun, moon, cloud and terrain cards read; SunTracker has all of it.
export interface SceneInfoContext {
  language: Language;
  now: Date;
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
}

const FISH: Record<FishKind, { name: MessageKey; fact: MessageKey }> = {
  classic: { name: 'fish.classic', fact: 'fishFact.classic' },
  minnow: { name: 'fish.minnow', fact: 'fishFact.minnow' },
  perch: { name: 'fish.perch', fact: 'fishFact.perch' },
  pike: { name: 'fish.pike', fact: 'fishFact.pike' },
  carp: { name: 'fish.carp', fact: 'fishFact.carp' },
  catfish: { name: 'fish.catfish', fact: 'fishFact.catfish' },
  trout: { name: 'fish.trout', fact: 'fishFact.trout' },
  ray: { name: 'fish.ray', fact: 'fishFact.ray' },
  turtle: { name: 'fish.turtle', fact: 'fishFact.turtle' },
  jellyfish: { name: 'fish.jellyfish', fact: 'fishFact.jellyfish' },
  seahorse: { name: 'fish.seahorse', fact: 'fishFact.seahorse' },
  whale: { name: 'fish.whale', fact: 'fishFact.whale' },
  pufferfish: { name: 'fish.pufferfish', fact: 'fishFact.pufferfish' },
  burbot: { name: 'fish.burbot', fact: 'fishFact.burbot' },
  eel: { name: 'fish.eel', fact: 'fishFact.eel' },
  lanternfish: { name: 'fish.lanternfish', fact: 'fishFact.lanternfish' },
  anglerfish: { name: 'fish.anglerfish', fact: 'fishFact.anglerfish' },
  squid: { name: 'fish.squid', fact: 'fishFact.squid' },
  shark: { name: 'fish.shark', fact: 'fishFact.shark' },
  dolphins: { name: 'fish.dolphins', fact: 'fishFact.dolphins' },
};
// Item 65: these swim only at night. The jellyfish and the sea visitors (item 85) come day
// and night; all other fish are day fish (at night only in the moonlight).
const NIGHT_ONLY: FishKind[] = ['burbot', 'eel', 'lanternfish', 'anglerfish', 'squid'];
const DAY_AND_NIGHT: FishKind[] = ['jellyfish', 'shark', 'dolphins'];

// Item 74's seasons (BIRD_MONTHS in weatherEffectsUtils), as words, so they hold in both
// hemispheres. The bats fly at dusk all year.
const BIRDS: Record<BirdKind | 'bat', { name: MessageKey; fact: MessageKey; season: MessageKey }> = {
  gull: { name: 'bird.gull', fact: 'birdFact.gull', season: 'info.allYear' },
  heron: { name: 'bird.heron', fact: 'birdFact.heron', season: 'info.allYear' },
  stork: { name: 'bird.stork', fact: 'birdFact.stork', season: 'info.springSummer' },
  swan: { name: 'bird.swan', fact: 'birdFact.swan', season: 'info.allYear' },
  geese: { name: 'bird.geese', fact: 'birdFact.geese', season: 'info.migration' },
  cormorant: { name: 'bird.cormorant', fact: 'birdFact.cormorant', season: 'info.allYear' },
  kestrel: { name: 'bird.kestrel', fact: 'birdFact.kestrel', season: 'info.allYear' },
  starlings: { name: 'bird.starlings', fact: 'birdFact.starlings', season: 'info.autumn' },
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
const LAYERS: Record<CloudBand, MessageKey> = { low: 'info.layerLow', mid: 'info.layerMid', high: 'info.layerHigh' };

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
      return { title: fish.name, lines: [{ value: { key: fish.fact } }, { value: { key: when } }] };
    }
    case 'bird': {
      const bird = BIRDS[target.kind];
      return { title: bird.name, lines: [{ value: { key: bird.fact } }, { label: 'info.season', value: { key: bird.season } }] };
    }
    case 'boat': {
      const boat = BOATS[target.kind];
      return { title: boat.name, lines: [{ value: { key: boat.fact } }] };
    }
    case 'plane':
      return {
        title: 'plane.airliner',
        lines: [
          { value: { key: 'planeFact.airliner' } },
          { label: 'info.altitude', value: { key: 'info.cruiseAltitude' } },
          { label: 'info.contrail', value: { key: CONTRAILS[target.contrail] } },
        ],
      };
    case 'cloud': {
      const cover = getCloudLayers(ctx.weatherType, ctx.cloudLayers)[target.band];
      return {
        title: CLOUDS[target.cloudType],
        lines: [
          { label: 'info.layer', value: { key: LAYERS[target.band] } },
          { label: 'info.cover', value: percent(cover / 100, language) },
        ],
      };
    }
    case 'sun': {
      const next = nextSunEvent(ctx);
      return {
        title: 'scene.sun',
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
        title: 'scene.moon',
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
        title: 'scene.terrain',
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
      return { title: 'scene.satellite', lines: satelliteLines(target.name, ctx) };
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
