// Sky optics (ROADMAP item 148): the light effects of ice and water in the air beside the rainbow
// (item 121). Pure: which optics show for the weather and the sun and moon, their fixed tiers, their
// texts and the `?optic=` test link. SkyOpticsLayer draws them.

import { type MessageKey } from '@/i18n';
import { type WeatherType } from '@/components/CloudLayer';
import { type CloudLayers } from './skyCloudUtils';
import { type RarityTier } from './rarityTier';
import { type TimeOfDay } from './sunUtils';

export type OpticKind = 'rays' | 'sunDogs' | 'halo' | 'doubleRainbow' | 'fogBow' | 'moonbow' | 'sunPillar' | 'moonHalo';

// The lookbook order (2026-10-14), also the order of the badges after the rainbow. Each tier is
// fixed, as the rainbow's: an optic is not rolled, the weather makes it.
export const OPTICS: readonly { kind: OpticKind; name: MessageKey; fact: MessageKey; tier: RarityTier }[] = [
  { kind: 'rays', name: 'optic.rays', fact: 'opticFact.rays', tier: 'common' },
  { kind: 'sunDogs', name: 'optic.sunDogs', fact: 'opticFact.sunDogs', tier: 'frequent' },
  { kind: 'halo', name: 'optic.halo', fact: 'opticFact.halo', tier: 'uncommon' },
  { kind: 'doubleRainbow', name: 'optic.doubleRainbow', fact: 'opticFact.doubleRainbow', tier: 'rare' },
  { kind: 'fogBow', name: 'optic.fogBow', fact: 'opticFact.fogBow', tier: 'rare' },
  { kind: 'moonbow', name: 'optic.moonbow', fact: 'opticFact.moonbow', tier: 'veryRare' },
  { kind: 'sunPillar', name: 'optic.sunPillar', fact: 'opticFact.sunPillar', tier: 'rare' },
  { kind: 'moonHalo', name: 'optic.moonHalo', fact: 'opticFact.moonHalo', tier: 'rare' },
];
export const OPTIC_KINDS: readonly OpticKind[] = OPTICS.map((o) => o.kind);
export const getOptic = (kind: OpticKind) => OPTICS.find((o) => o.kind === kind)!;

// What the triggers read. The layers are the ones the scene draws (getCloudLayers); visibility
// and temperature are null when unknown (manual weather has no visibility).
export interface OpticConditions {
  weatherType: WeatherType;
  layers: CloudLayers;
  visibilityM: number | null;
  temperatureC: number | null;
  rainMmH: number | null; // getRainMmH: null without rain
  timeOfDay: TimeOfDay;
  sunAltitude: number;
  moonAltitude: number;
  moonIllumination: number; // 0–1
  rainbow: boolean; // the rainbow shows (getRainbowGeometry)
}

// The moonbow and the moon halo need a dark sky, as the moon's own rule in SunVisualization.
const DARK_SKY: readonly TimeOfDay[] = ['night', 'astronomical-twilight', 'nautical-twilight'];
const within = (value: number, low: number, high: number): boolean => value >= low && value <= high;

// The trigger table of item 148. A range "a to b" includes both ends.
const RULES: Record<OpticKind, (c: OpticConditions) => boolean> = {
  // Sun −3° to 8°, low + mid cloud 20–70 % (gaps), visibility < 20 km (haze shows the beams).
  rays: (c) => within(c.sunAltitude, -3, 8) && within(c.layers.low + c.layers.mid, 20, 70)
    && c.visibilityM !== null && c.visibilityM < 20_000,
  // High cloud ≥ 20 %, low + mid < 50 %, sun 0–30°.
  sunDogs: (c) => c.layers.high >= 20 && c.layers.low + c.layers.mid < 50 && within(c.sunAltitude, 0, 30),
  // High cloud ≥ 50 %, low < 30 %, sun > 0°.
  halo: (c) => c.layers.high >= 50 && c.layers.low < 30 && c.sunAltitude > 0,
  // The rainbow shows and precipitation ≥ 1 mm/h.
  doubleRainbow: (c) => c.rainbow && (c.rainMmH ?? 0) >= 1,
  // Fog or visibility 300–2000 m, low cloud < 50 %, sun 0–40°.
  fogBow: (c) => (c.weatherType === 'fog' || (c.visibilityM !== null && within(c.visibilityM, 300, 2000)))
    && c.layers.low < 50 && within(c.sunAltitude, 0, 40),
  // Rain or drizzle at night, moon 0–42°, illumination > 80 %.
  moonbow: (c) => (c.weatherType === 'rain' || c.weatherType === 'drizzle') && DARK_SKY.includes(c.timeOfDay)
    && within(c.moonAltitude, 0, 42) && c.moonIllumination > 0.8,
  // Sun −2° to 6°, high cloud ≥ 30 %, 2 m temperature < 0 °C.
  sunPillar: (c) => within(c.sunAltitude, -2, 6) && c.layers.high >= 30 && c.temperatureC !== null && c.temperatureC < 0,
  // The lookbook's proposal: night, moon > 0°, illumination ≥ 50 %, high cloud ≥ 50 %, low < 30 %.
  moonHalo: (c) => DARK_SKY.includes(c.timeOfDay) && c.moonAltitude > 0 && c.moonIllumination >= 0.5
    && c.layers.high >= 50 && c.layers.low < 30,
};

// The optics the weather shows now, in OPTIC_KINDS order.
export const getSkyOptics = (c: OpticConditions): OpticKind[] => OPTIC_KINDS.filter((kind) => RULES[kind](c));

// Test link: `?optic=<kind>` or a list (`?optic=halo,sunDogs`) shows those optics whatever the
// weather, as `?fish=` and `?boat=`; it pauses the collection (isCollectionPaused). Unknown kinds
// are left out; none left: null.
export const getOpticOverride = (search: string): OpticKind[] | null => {
  const asked = (new URLSearchParams(search).get('optic') ?? '').split(',').map((k) => k.trim());
  const kinds = OPTIC_KINDS.filter((kind) => asked.includes(kind));
  return kinds.length ? kinds : null;
};
