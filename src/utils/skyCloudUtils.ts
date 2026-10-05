// Clouds by type (ROADMAP item 84), ported from the Cloud Types lookbook. Pure helpers
// for SkyClouds: the types from the low, mid and high cover (C1), the layout and the
// glide of three bands (C3), the colours lit by the sun (C2) with soft fills (C4), the
// cloud shadows on the sea (X2), the rare lenticular and mammatus clouds (X1), and the
// place of a gliding cloud for the moon's silver lining (item 76, getCloudMoonlight in
// cloudLayoutUtils). No React, no Math.random.

import { type WeatherType } from '../components/CloudLayer';
import { type TimeOfDay } from './sunUtils';
import { CLOUD_SHAPES, type CloudType } from './cloudShapes';

export type { CloudType } from './cloudShapes';
export type CloudBand = 'high' | 'mid' | 'low';
export type Rgb = [number, number, number];

// The cover of each layer in %, as Open-Meteo reports it per hour.
export interface CloudLayers {
  low: number;
  mid: number;
  high: number;
}

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const HORIZON = 0.65; // SunVisualization's horizon line, as a fraction of the height

// ---------- C1: the types ----------

// Manual weather has no layer cover, so each type gets its own (the lookbook presets;
// the largest layer is the old default total cover). Hail is new: a thunderstorm deck.
export const DEFAULT_CLOUD_LAYERS: Record<WeatherType, CloudLayers> = {
  clear: { low: 0, mid: 0, high: 0 },
  partly: { low: 25, mid: 10, high: 20 },
  cloudy: { low: 55, mid: 35, high: 40 },
  overcast: { low: 90, mid: 50, high: 30 },
  fog: { low: 95, mid: 10, high: 10 },
  drizzle: { low: 80, mid: 30, high: 20 },
  rain: { low: 70, mid: 85, high: 50 },
  storm: { low: 80, mid: 70, high: 95 },
  snow: { low: 60, mid: 80, high: 30 },
  hail: { low: 90, mid: 70, high: 40 },
};

// The measured layers (live weather), else the weather type's own.
export const getCloudLayers = (weather: WeatherType, measured: CloudLayers | null | undefined): CloudLayers => {
  if (!measured) return DEFAULT_CLOUD_LAYERS[weather];
  const pct = (v: number) => (Number.isFinite(v) ? clamp(v, 0, 100) : 0);
  return { low: pct(measured.low), mid: pct(measured.mid), high: pct(measured.high) };
};

const FAIR: readonly WeatherType[] = ['clear', 'partly', 'cloudy'];
const isFair = (weather: WeatherType): boolean => FAIR.includes(weather);
const SHOWERS: readonly WeatherType[] = ['rain', 'storm', 'hail'];

// A closed nimbostratus deck: rain, storm, snow or hail with low or mid cover from 50 %.
export const isCloudDeck = (weather: WeatherType, { low, mid }: CloudLayers): boolean =>
  (SHOWERS.includes(weather) || weather === 'snow') && Math.max(low, mid) >= 50;
const isStratusDeck = (weather: WeatherType, layers: CloudLayers): boolean =>
  !isCloudDeck(weather, layers) && weather !== 'fog' && (layers.low >= 75 || (weather === 'drizzle' && layers.low >= 50));

export type LowClouds = 'deck' | 'showers' | 'fog' | 'stratus' | 'stratocumulus' | 'cumulus' | null;

export interface CloudTypeChoice {
  high: 'Ci' | 'Cs' | null; // cirrus wisps, or a cirrostratus veil from 60 %
  mid: 'Ac' | 'As' | null; // an altocumulus field, or an altostratus sheet from 70 %
  low: LowClouds;
  cumulus: boolean; // fair-weather cumulus among the stratocumulus
  anvil: boolean; // a cumulonimbus on the horizon (storm)
  shafts: boolean; // rain shafts under the deck
  highVisibility: number; // a closed deck below hides the layers above, as in nature
  midVisibility: number;
}

export const getCloudTypes = (weather: WeatherType, layers: CloudLayers): CloudTypeChoice => {
  const { low: L, mid: M, high: H } = layers;
  const fog = weather === 'fog';
  const deck = isCloudDeck(weather, layers);
  const stratus = isStratusDeck(weather, layers);
  const hide = deck ? 0.85 : stratus ? clamp((L - 60) / 40, 0.3, 0.85) : 0;
  const highVisibility = (1 - hide) * (M >= 70 ? 0.5 : 1) * (fog ? 0.15 : 1);
  const midVisibility = (1 - hide) * (fog ? 0.15 : 1);
  let low: LowClouds = null;
  if (deck) low = 'deck';
  else if (SHOWERS.includes(weather)) low = 'showers';
  else if (fog) low = 'fog';
  else if (stratus) low = 'stratus';
  else if (L >= 45) low = 'stratocumulus';
  else if (L >= 5) low = isFair(weather) ? 'cumulus' : 'stratocumulus';
  return {
    high: H >= 5 && highVisibility > 0.05 ? (H >= 60 ? 'Cs' : 'Ci') : null,
    mid: M >= 5 && midVisibility > 0.05 ? (M >= 70 ? 'As' : 'Ac') : null,
    low,
    cumulus: low === 'stratocumulus' && L >= 45 && isFair(weather),
    anvil: weather === 'storm',
    shafts: deck && weather !== 'snow',
    highVisibility,
    midVisibility,
  };
};

// ---------- X1: the rare lenticular and mammatus clouds ----------

// One day in CLOUD_EGG_DAYS per place, seeded by the local day and the place (like the
// green flash), so the egg stays all day. Fair weather shows lenticular lenses over the
// ridge, a storm shows mammatus pouches under the deck.
export const CLOUD_EGG_DAYS = 30;
export const cloudEggRoll = (date: Date, latitude: number, longitude: number): number => {
  const key = `clouds|${date.getFullYear()}-${date.getMonth()}-${date.getDate()}|${latitude.toFixed(1)}|${longitude.toFixed(1)}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0) % CLOUD_EGG_DAYS;
};
export const isCloudEggDay = (date: Date, latitude: number, longitude: number): boolean =>
  cloudEggRoll(date, latitude, longitude) === 0;
// Test override: `?egg=lenticular` or `?egg=mammatus` makes today an egg day. The weather
// still picks which one shows (fair weather or a storm).
export const isCloudEggForced = (search: string): boolean => {
  const egg = new URLSearchParams(search).get('egg')?.toLowerCase();
  return egg === 'lenticular' || egg === 'mammatus';
};

// ---------- C1 + C3: the layout ----------

// C3: phone px/s at the top of the sky; half of it at the horizon. The sailboat glides
// at 5.2 px/s, so no cloud is faster than half its pace. Wide screens keep the px/s.
export const BAND_SPEED_PX_S: Record<CloudBand, number> = { high: 0.35, mid: 0.7, low: 2.4 };
const TYPE_BAND: Record<CloudType, CloudBand> = {
  Ci: 'high', Cs: 'high', Ac: 'mid', As: 'mid', Len: 'mid', Cu: 'low', Sc: 'low', St: 'low', Ns: 'low', Cb: 'low', Mam: 'low',
};
// The type sets how dense a cloud is; the cover sets how many there are.
const TYPE_DENSITY: Record<CloudType, number> = {
  Ci: 0.62, Cs: 0.4, Ac: 0.85, As: 0.6, Len: 0.92, Cu: 0.95, Sc: 0.92, St: 0.9, Ns: 0.97, Cb: 0.95, Mam: 0.95,
};

// 0 high in the sky (10 % of the height), 1 low (58 %): far clouds near the horizon.
export const getCloudDepth = (y: number, height: number): number => clamp((y / height - 0.1) / 0.48, 0, 1);
export const getCloudSpeed = (band: CloudBand, depth: number, height: number): number =>
  BAND_SPEED_PX_S[band] * (1 - 0.5 * depth) * getSceneScale(height);
// Short (landscape) screens draw the scene smaller, as the lookbook's small cards did.
export const getSceneScale = (height: number): number => clamp(height / 480, 0.45, 1);

export interface SkyCloud {
  type: CloudType;
  variant: number;
  band: CloudBand;
  x: number; // the box's left edge in px, from the glider's offset
  y: number; // the box's centre line in px
  scale: number; // 1 = the 120 × 60 px box
  opacity: number;
  depth: number;
  tint: number; // C3: the share of the sky colour (paler toward the horizon)
  shafts: boolean;
  shadow: boolean; // X2: throws a shadow on the sea
}

// One cloud, or a row of tiles (a sheet or a deck) that glides as one. The glider moves
// from `from` to `to` px (translateX) in `durationSec`, linear, again and again; the
// negative `delaySec` sets where it starts. A still glider has from === to.
export interface CloudGlider {
  id: string;
  z: number;
  clouds: SkyCloud[];
  from: number;
  to: number;
  durationSec: number;
  delaySec: number;
  speed: number; // px/s, 0 when still
}

export interface SkyLayoutInput {
  weather: WeatherType;
  layers: CloudLayers;
  width: number;
  height: number;
  seed: string; // the day and the place, so the sky stays the same all day
  egg: boolean; // an X1 day
  direction: 1 | -1; // downwind: 1 drifts to the right
}

// The layout seed: the day and the place, rounded to 0.1°, so the sky stays the same all day.
// The scene density (item 93) uses it too.
export const getDaySeed = (date: Date, latitude: number, longitude: number): string =>
  `${date.toDateString()}|${Math.round(latitude * 10) / 10}|${Math.round(longitude * 10) / 10}`;

// FNV-1a and mulberry32, as the old cloud layout (item 10).
export const hashSeed = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};
export const mulberry32 = (seed: number) => {
  let a = seed;
  return (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface Single {
  type: CloudType; v: number; cx: number; cy: number; S: number; z: number;
  op?: number; far?: boolean; fixed?: boolean; shafts?: boolean;
}
interface Row {
  type: CloudType; vs: number[]; cy: number; S: number; z: number; phase: number;
  op?: number; noShafts?: boolean;
}

const glideTrack = (direction: 1 | -1, from: number, to: number) => (direction === 1 ? { from, to } : { from: to, to: from });

export const getSkyClouds = ({ weather: wx, layers, width: w, height: h, seed, egg, direction }: SkyLayoutInput): CloudGlider[] => {
  if (w <= 0 || h <= 0) return [];
  const k = getSceneScale(h);
  const fw = clamp(w / k / 430, 0.8, 3.4); // counts per 430 px of width, like the boats
  const H0 = h * HORIZON;
  const { low: L, mid: M, high: H } = layers;
  const types = getCloudTypes(wx, layers);
  const mammatus = egg && wx === 'storm' && types.low === 'deck';
  const singles: Single[] = [];
  const rows: Row[] = [];
  const mk = (type: CloudType, v: number, cx: number, cy: number, S: number, extra: Partial<Single> = {}) =>
    singles.push({ type, v, cx, cy, S, z: 3, ...extra });
  const row = (type: CloudType, vs: number[], cy: number, S: number, extra: Partial<Row> = {}) =>
    rows.push({ type, vs, cy, S: S * k, z: 3, phase: 0.5, ...extra });
  const at = (a: number, b: number, r: () => number) => (a + (b - a) * r()) * h;
  const across = (r: () => number) => (-0.05 + 1.1 * r()) * w;

  if (types.high) {
    const r = mulberry32(hashSeed(`${seed}|hi`));
    if (types.high === 'Ci') {
      const n = Math.max(1, Math.round((0.8 + H / 18) * fw));
      for (let i = 0; i < n; i++) mk('Ci', r() < 0.55 ? 0 : 1, across(r), at(0.06, 0.26, r), (1.1 + 0.6 * r()) * k, { op: types.highVisibility, z: 0 });
    } else {
      row('Cs', [0], 0.1 * h, 2.2, { op: types.highVisibility, z: 0 });
      mk('Ci', 1, (0.1 + 0.5 * r()) * w, at(0.14, 0.24, r), 1.4 * k, { op: types.highVisibility, z: 0.1 });
    }
  }
  if (types.mid) {
    const r = mulberry32(hashSeed(`${seed}|mid`));
    if (types.mid === 'As') row('As', [0], 0.2 * h, 2.1, { op: types.midVisibility, z: 1 });
    const n = types.mid === 'As' ? Math.round(fw * 0.8) : Math.max(1, Math.round((M / 14) * fw));
    for (let i = 0; i < n; i++) mk('Ac', Math.floor(r() * 3), across(r), at(0.16, 0.38, r), (0.8 + 0.4 * r()) * k, { op: types.midVisibility, z: 1.5 });
  }

  const r = mulberry32(hashSeed(`${seed}|lo`));
  const lowN = (base: number) => Math.max(1, Math.round(base * fw));
  const cumulus = (n: number, towering = 0, shafts = false) => {
    for (let i = 0; i < n; i++) {
      const v = r() < towering ? 2 : r() < 0.55 ? 0 : 1;
      mk('Cu', v, across(r), at(0.24, 0.56, r), (0.85 + 0.45 * r()) * k * (v === 2 ? 1.25 : 1), { shafts: shafts && v === 2 });
    }
  };
  const stratocumulus = (n: number) => {
    for (let i = 0; i < n; i++) mk('Sc', r() < 0.5 ? 0 : 1, across(r), at(0.26, 0.56, r), (1.1 + 0.5 * r()) * k);
  };
  if (types.anvil) mk('Cb', 0, 0.3 * w, H0 - 28 * 2.4 * k, 2.4 * k, { far: true, fixed: true, z: 2 });
  switch (types.low) {
    case 'deck': {
      // The ragged base at 30 % of the height (storm 34 %), like item 51's deck; a second
      // row closes the sky above it.
      const S = 3;
      const Sk = S * k;
      const cy = Math.max(-10 + 42 * Sk, (wx === 'storm' ? 0.34 : 0.3) * h - 6 * Sk);
      if (cy - 42 * Sk > -10) row('Ns', [2, 0], -10 + 42 * Sk, S, { noShafts: true, z: 4.9 });
      row('Ns', wx === 'storm' ? [2, 1] : [0, 1], cy, S, { noShafts: !types.shafts || mammatus, z: 5 });
      if (mammatus) row('Mam', [0], cy + 10 * Sk, S, { z: 4.8 });
      break;
    }
    case 'showers':
      cumulus(lowN(0.9), 0.7, true);
      break;
    case 'fog':
      row('St', [1], 0.5 * h, 2.2, { op: 0.75 });
      break;
    case 'stratus': {
      // Overlapping stratus rows from the top down to 20 % (low cover 70 %) to 50 % (100 %).
      const S = 2.4;
      const bandH = 24 * S * k;
      const until = (0.2 + 0.3 * clamp((L - 70) / 30, 0, 1)) * h;
      for (let i = 0, y = 0.3 * bandH; y < until; i++, y += 0.62 * bandH) {
        row('St', i % 2 ? [1, 0] : [0, 1], y, S, { z: 3.08 - i * 0.01, phase: i % 2 ? 0 : 0.5 });
      }
      stratocumulus(lowN(0.9));
      break;
    }
    case 'stratocumulus':
      stratocumulus(lowN(L >= 45 ? L / 12 : 1 + L / 14));
      if (types.cumulus) cumulus(lowN(0.7));
      break;
    case 'cumulus':
      cumulus(lowN(0.6 + L / 10), wx === 'cloudy' && L >= 30 ? 0.2 : 0);
      break;
    default:
      break;
  }
  // X1 lenticular: smooth lenses that stand still over the ridge on a fair day.
  if (egg && isFair(wx)) {
    const S1 = 1.5 * k;
    const S2 = 1.0 * k;
    mk('Len', 0, 0.47 * w, H0 - 26 * k - 0.05 * h - 17.5 * S1, S1, { fixed: true, z: 2.5 });
    mk('Len', 0, 0.3 * w, H0 - 20 * k - 0.04 * h - 17.5 * S2, S2, { fixed: true, z: 2.4 });
  }

  const gliders: CloudGlider[] = [];
  const shadows = isFair(wx);
  singles.forEach((c, i) => {
    const band = TYPE_BAND[c.type];
    const depth = getCloudDepth(c.cy, h);
    const still = !!(c.far || c.fixed);
    // C3: overhead clouds are big; toward the horizon smaller, paler and sky-tinted.
    const S = still ? c.S : c.S * (1.2 - 0.55 * depth);
    const fade = still ? 1 : 1 - 0.4 * depth;
    const width = 120 * S;
    const left = c.cx - width / 2;
    const speed = still ? 0 : getCloudSpeed(band, depth, h);
    const track = w + width + 20;
    const { from, to } = glideTrack(direction, -width - 10, w + 10);
    const progress = still ? 0 : ((((left - from) * direction) / track) % 1 + 1) % 1;
    const durationSec = still ? 0 : track / speed;
    gliders.push({
      id: `c${i}`,
      z: c.z === 3 ? 3 + (1 - depth) * 0.9 : c.z,
      clouds: [{
        type: c.type, variant: c.v, band, x: 0, y: c.cy, scale: S,
        opacity: TYPE_DENSITY[c.type] * (c.op ?? 1) * fade,
        depth, tint: c.far ? 0.35 : still ? 0 : 0.4 * depth,
        shafts: c.type === 'Cu' ? !!c.shafts : !!CLOUD_SHAPES[c.type][c.v].shafts,
        shadow: shadows && !still && (c.type === 'Cu' || c.type === 'Sc'),
      }],
      from: still ? left : from,
      to: still ? left : to,
      durationSec,
      delaySec: -progress * durationSec,
      speed,
    });
  });
  rows.forEach((rw, i) => {
    const band = TYPE_BAND[rw.type];
    const depth = getCloudDepth(rw.cy, h);
    const tw = 120 * rw.S;
    const track = w + tw + 20;
    const n = Math.max(2, Math.ceil(track / (tw * 0.62)));
    const step = track / n;
    const period = rw.vs.length * step; // the row repeats after its variants
    const speed = getCloudSpeed(band, depth, h);
    const clouds: SkyCloud[] = [];
    for (let j = -rw.vs.length; j < n; j++) {
      const v = rw.vs[((j % rw.vs.length) + rw.vs.length) % rw.vs.length];
      clouds.push({
        type: rw.type, variant: v, band, x: -tw - 10 + (j + rw.phase) * step, y: rw.cy, scale: rw.S,
        opacity: TYPE_DENSITY[rw.type] * (rw.op ?? 1), depth, tint: 0,
        shafts: !rw.noShafts && !!CLOUD_SHAPES[rw.type][v].shafts, shadow: false,
      });
    }
    const { from, to } = glideTrack(direction, 0, period);
    gliders.push({ id: `r${i}`, z: rw.z, clouds, from, to, durationSec: period / speed, delaySec: 0, speed });
  });
  return gliders.sort((a, b) => a.z - b.z);
};

// Where a glider is at a progress (0-1) through its loop, in px.
export const getGliderOffset = (glider: Pick<CloudGlider, 'from' | 'to'>, progress: number): number =>
  glider.from + (glider.to - glider.from) * progress;
// The progress at the start (the negative delay).
export const getGliderStartProgress = ({ durationSec, delaySec }: Pick<CloudGlider, 'durationSec' | 'delaySec'>): number =>
  durationSec > 0 ? (((-delaySec / durationSec) % 1) + 1) % 1 : 0;
// A cloud's centre in px at a progress.
export const getCloudCentre = (glider: CloudGlider, cloud: SkyCloud, progress: number): { x: number; y: number } => ({
  x: getGliderOffset(glider, progress) + cloud.x + 60 * cloud.scale,
  y: cloud.y,
});

// ---------- C2 + C4: the colours ----------

type LightKey = 'day' | 'golden' | 'sunset' | 'civil' | 'night';
export type CloudLight = Record<LightKey, number>;
// The five palettes sit at these sun altitudes; in between they blend.
const LIGHT_AT: [LightKey, number][] = [['day', 12], ['golden', 5], ['sunset', 0], ['civil', -4], ['night', -12]];

// The share of each palette at a sun altitude (the shares sum to 1).
export const getCloudLight = (sunAltitude: number): CloudLight => {
  const light: CloudLight = { day: 0, golden: 0, sunset: 0, civil: 0, night: 0 };
  if (sunAltitude >= LIGHT_AT[0][1]) light.day = 1;
  else if (sunAltitude <= LIGHT_AT[LIGHT_AT.length - 1][1]) light.night = 1;
  else {
    const i = LIGHT_AT.findIndex(([, alt]) => sunAltitude >= alt);
    const [hiKey, hiAlt] = LIGHT_AT[i - 1];
    const [loKey, loAlt] = LIGHT_AT[i];
    const t = (hiAlt - sunAltitude) / (hiAlt - loAlt);
    light[hiKey] = 1 - t;
    light[loKey] = t;
  }
  return light;
};

// Without the sun's altitude (callers that pass none), each time of day stands for one.
const TIME_OF_DAY_ALTITUDE: Record<TimeOfDay, number> = {
  night: -20, 'astronomical-twilight': -15, 'nautical-twilight': -9, 'civil-twilight': -4,
  dawn: 5, morning: 25, midday: 45, afternoon: 25, evening: 5,
};
export const getTimeOfDayAltitude = (timeOfDay: TimeOfDay): number => TIME_OF_DAY_ALTITUDE[timeOfDay];

// C2: [lit side, shade side] in HSL per palette and band. By day white tops and soft
// grey-blue bases; in the golden hour gold and peach; at sunset pink bases; in civil
// twilight purple low clouds while the high clouds keep their colour longest.
type Hsl = [number, number, number];
const PALETTE: Record<LightKey, Record<CloudBand, [Hsl, Hsl]>> = {
  day: { low: [[0, 0, 100], [212, 22, 80]], mid: [[0, 0, 100], [208, 28, 86]], high: [[0, 0, 100], [200, 50, 92]] },
  golden: { low: [[28, 100, 82], [15, 38, 70]], mid: [[33, 100, 84], [20, 50, 76]], high: [[42, 100, 86], [28, 80, 80]] },
  sunset: { low: [[345, 70, 72], [255, 18, 50]], mid: [[10, 90, 70], [320, 35, 55]], high: [[28, 100, 70], [355, 75, 68]] },
  civil: { low: [[275, 22, 42], [250, 20, 26]], mid: [[330, 50, 58], [275, 22, 36]], high: [[15, 90, 70], [335, 60, 60]] },
  night: { low: [[222, 18, 26], [226, 22, 13]], mid: [[222, 16, 28], [226, 20, 15]], high: [[220, 14, 32], [226, 18, 17]] },
};
// Wet weather mutes the colours toward a grey: [share of grey, darkness].
const WEATHER_TONE: Record<WeatherType, [number, number]> = {
  clear: [0, 0], partly: [0, 0], cloudy: [0.12, 0.05], snow: [0.55, 0.08], fog: [0.7, 0], drizzle: [0.7, 0.25],
  overcast: [0.75, 0.3], rain: [0.85, 0.5], hail: [0.85, 0.5], storm: [0.9, 0.72],
};
const BAND_ALPHA: Record<CloudBand, number> = { high: 0.7, mid: 0.85, low: 0.93 };

const hslToRgb = ([h, s, l]: Hsl): Rgb => {
  const a = (Math.min(100, s) / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return 255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
};
const lightness = ([r, g, b]: Rgb): number => ((Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255) * 100;
export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t) as Rgb;
export const rgba = (c: Rgb, alpha: number): string =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${clamp(alpha, 0, 1).toFixed(3)})`;

const paletteRgb = (band: CloudBand, side: 0 | 1, light: CloudLight): Rgb =>
  LIGHT_AT.reduce<Rgb>((sum, [key]) => {
    if (!light[key]) return sum;
    const c = hslToRgb(PALETTE[key][band][side]);
    return [sum[0] + c[0] * light[key], sum[1] + c[1] * light[key], sum[2] + c[2] * light[key]];
  }, [0, 0, 0]);
const tone = (c: Rgb, weather: WeatherType): Rgb => {
  const [grey, dark] = WEATHER_TONE[weather];
  return grey ? mixRgb(c, hslToRgb([215, 8, lightness(c) * (1 - 0.85 * dark)]), grey) : c;
};

// The lit and the shade colour of a cloud. A far cumulonimbus and mammatus catch the low
// sun on their lit side even in a storm.
export const getCloudColors = (type: CloudType, band: CloudBand, weather: WeatherType, light: CloudLight): { lit: Rgb; shade: Rgb } => {
  const glow = type === 'Cb' || type === 'Mam';
  return {
    lit: tone(paletteRgb(type === 'Cb' ? 'high' : band, 0, light), glow ? 'cloudy' : weather),
    shade: tone(paletteRgb(type === 'Cb' ? 'low' : band, 1, light), weather),
  };
};

// The overcast veil over the top of the sky (item 10), now in the low clouds' lit colour.
const VEIL_STRENGTH: Record<WeatherType, number> = {
  clear: 0, partly: 0.2, cloudy: 0.3, snow: 0.3, drizzle: 0.45, fog: 0.5, overcast: 0.6, rain: 0.7, hail: 0.75, storm: 0.8,
};
export const getCloudVeil = (weather: WeatherType, light: CloudLight): { color: string; opacity: number } | null =>
  VEIL_STRENGTH[weather] > 0
    ? { color: rgba(getCloudColors('St', 'low', weather, light).lit, 0.85), opacity: VEIL_STRENGTH[weather] }
    : null;

export interface CloudFill {
  // C2: the gradient from the shade side to the lit side, in the box's units.
  x1: number; y1: number; x2: number; y2: number;
  stops: [string, string, string];
  // C4: a vertical shade by day and night ...
  shade: { top: number; bottom: number; to: string } | null;
  // ... and a warm glow on the sun side from the golden hour to civil twilight.
  glow: { cx: number; cy: number; r: number; from: string; to: string } | null;
  shafts: [string, string];
}

// D1 (item 88): a sheet or a deck is lit as one, so its tiles show no seams. One gradient
// across the screen, toward the light seen from the screen's middle, in a tile's units
// (`left`: the tile's left edge on screen, px). The tiles are solid; the row carries
// their opacity (getRowOpacity), so the overlaps are not denser.
export interface CloudSpan { x1: number; y1: number; x2: number; y2: number; r: number }
export const getRowSpan = (left: number, scale: number, width: number, angleDeg: number | null): CloudSpan => {
  const t = ((angleDeg ?? -90) * Math.PI) / 180;
  const ux = Math.cos(t);
  const uy = Math.sin(t);
  const half = (width / 2) * Math.abs(ux) + 30 * scale * Math.abs(uy) + 4 * scale;
  const round = (n: number) => Math.round(n * 2) / 2; // half-unit steps, like the lining
  return {
    x1: round((width / 2 - ux * half - left) / scale), y1: round(30 - (uy * half) / scale),
    x2: round((width / 2 + ux * half - left) / scale), y2: round(30 + (uy * half) / scale),
    r: round((1.2 * half) / scale),
  };
};
export const getRowOpacity = (cloud: Pick<SkyCloud, 'band' | 'opacity'>): number => cloud.opacity * BAND_ALPHA[cloud.band];

// The fill of one cloud. `angleDeg` is the direction from the cloud to the light (0 = to
// the right, 90 = down), or null for light from above. `sky` is the sky colour at the
// cloud's height, for the C3 tint. `span`: a tile of a row (D1), solid and lit as one.
export const getCloudFill = (
  cloud: Pick<SkyCloud, 'type' | 'variant' | 'band' | 'tint'>,
  weather: WeatherType,
  light: CloudLight,
  angleDeg: number | null,
  sky: Rgb | null,
  span: CloudSpan | null = null,
): CloudFill => {
  let { lit, shade } = getCloudColors(cloud.type, cloud.band, weather, light);
  if (sky && cloud.tint > 0) {
    lit = mixRgb(lit, sky, cloud.tint);
    shade = mixRgb(shade, sky, cloud.tint);
  }
  const a = span ? 1 : BAND_ALPHA[cloud.band];
  const t = ((angleDeg ?? -90) * Math.PI) / 180;
  const ux = Math.cos(t);
  const uy = Math.sin(t);
  const half = 60 * Math.abs(ux) + 30 * Math.abs(uy) + 4;
  const round = (n: number) => Math.round(n * 10) / 10;
  const x2 = round(60 + ux * half);
  const y2 = round(30 + uy * half);
  const shape = CLOUD_SHAPES[cloud.type][cloud.variant];
  const cool = light.day + light.night;
  const warm = 1 - cool;
  const box = span ?? { x1: round(60 - ux * half), y1: round(30 - uy * half), x2, y2, r: round(half * 1.2) };
  return {
    x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2,
    stops: [rgba(shade, a), rgba(mixRgb(shade, lit, 0.5), a), rgba(lit, a)],
    shade: cool > 0.02 ? { top: shape.top, bottom: shape.bottom, to: rgba(mixRgb(shade, [30, 40, 60], 0.25), 0.45 * cool) } : null,
    glow: warm > 0.02 ? { cx: box.x2, cy: box.y2, r: box.r, from: rgba(lit, 0.6 * warm), to: rgba(lit, 0) } : null,
    shafts: [rgba(shade, 0.5), rgba(shade, 0)],
  };
};

// The direction from a cloud to the light, in whole 10° steps (so a gliding cloud
// changes its fill only now and then), or null for light from above.
export const getLightAngle = (cloud: { x: number; y: number }, source: { x: number; y: number } | null): number | null => {
  if (!source) return null;
  const dx = source.x - cloud.x;
  const dy = source.y - cloud.y;
  if (dx === 0 && dy === 0) return null;
  return (Math.round((Math.atan2(dy, dx) * 180) / Math.PI / 10) * 10 + 360) % 360;
};

// The sky colour at a height (a fraction of the scene) from SunTracker's sky gradient.
export const getSkyColorAt = (skyGradient: string, fraction: number): Rgb | null => {
  const stops = [...skyGradient.matchAll(/#([0-9a-fA-F]{6})\s+([\d.]+)%/g)].map(([, hex, at]) => {
    const num = parseInt(hex, 16);
    return { rgb: [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff] as Rgb, at: Number(at) / 100 };
  });
  if (stops.length === 0) return null;
  const next = stops.findIndex(s => s.at >= fraction);
  if (next <= 0) return stops[next === -1 ? stops.length - 1 : 0].rgb;
  const a = stops[next - 1];
  const b = stops[next];
  return mixRgb(a.rgb, b.rgb, b.at > a.at ? (fraction - a.at) / (b.at - a.at) : 0);
};

// ---------- X2: cloud shadows on the sea ----------

// By day a dark patch at 0.5, in the golden hour a longer, fainter one at 0.28 (the
// shadow moves away from the sun by `shift` × its distance to the sun); none from sunset.
export const getCloudShadowLook = (weather: WeatherType, light: CloudLight): { alpha: number; shift: number } | null => {
  const sun = light.day + light.golden;
  const alpha = 0.5 * light.day + 0.28 * light.golden;
  if (!isFair(weather) || alpha < 0.02) return null;
  return { alpha, shift: (0.12 * light.day + 0.3 * light.golden) / sun };
};
// Where the shadow of a cloud at this depth lies on the sea: far clouds near the horizon,
// near ones toward the bottom, flatter with distance. In px.
export const getCloudShadowBox = (cloud: Pick<SkyCloud, 'depth' | 'scale'>, height: number): { y: number; height: number } => {
  const H0 = height * HORIZON;
  const flat = 0.45 + 0.55 * (1 - cloud.depth);
  return { y: H0 + 6 * getSceneScale(height) + (1 - cloud.depth) * (height - H0) * 0.8, height: 16 * flat * cloud.scale };
};
