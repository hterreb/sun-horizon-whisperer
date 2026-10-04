import {
  BAND_SPEED_PX_S,
  CLOUD_EGG_DAYS,
  DEFAULT_CLOUD_LAYERS,
  cloudEggRoll,
  getCloudCentre,
  getCloudColors,
  getCloudFill,
  getCloudLayers,
  getCloudLight,
  getCloudShadowBox,
  getCloudShadowLook,
  getCloudSpeed,
  getCloudTypes,
  getCloudVeil,
  getGliderOffset,
  getGliderStartProgress,
  getLightAngle,
  getSkyClouds,
  getSkyColorAt,
  getTimeOfDayAltitude,
  isCloudEggDay,
  isCloudEggForced,
  type CloudGlider,
  type Rgb,
  type SkyLayoutInput,
} from '../src/utils/skyCloudUtils';
import { getCloudMoonlight } from '../src/utils/cloudLayoutUtils';
import type { WeatherType } from '../src/components/CloudLayer';

const layout = (input: Partial<SkyLayoutInput> & { weather: WeatherType }): CloudGlider[] =>
  getSkyClouds({
    layers: DEFAULT_CLOUD_LAYERS[input.weather], width: 390, height: 844, seed: 'Sat Oct 03 2026|47.8|9.6',
    egg: false, direction: 1, ...input,
  });
const typesIn = (gliders: CloudGlider[]) => new Set(gliders.flatMap(g => g.clouds.map(c => c.type)));
// Hue (0-360), saturation and lightness (0-1) of an RGB colour.
const hsl = ([r, g, b]: Rgb) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const h = max === rn ? ((gn - bn) / d + 6) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return { h: h * 60, s: d / (1 - Math.abs(2 * l - 1)), l };
};

describe('cloud types from the layer cover (ROADMAP item 84, C1)', () => {
  it("uses each weather type's own layers in manual weather, and the measured ones in live weather", () => {
    expect(getCloudLayers('partly', null)).toEqual({ low: 25, mid: 10, high: 20 });
    expect(getCloudLayers('storm', undefined)).toEqual({ low: 80, mid: 70, high: 95 });
    expect(getCloudLayers('clear', null)).toEqual({ low: 0, mid: 0, high: 0 });
    expect(getCloudLayers('partly', { low: 120, mid: -5, high: 40 })).toEqual({ low: 100, mid: 0, high: 40 });
  });

  it('picks the types of the manual weather defaults', () => {
    const pick = (weather: WeatherType) => {
      const { high, mid, low, cumulus, anvil, shafts } = getCloudTypes(weather, getCloudLayers(weather, null));
      return { high, mid, low, cumulus, anvil, shafts };
    };
    expect(pick('clear')).toEqual({ high: null, mid: null, low: null, cumulus: false, anvil: false, shafts: false });
    expect(pick('partly')).toEqual({ high: 'Ci', mid: 'Ac', low: 'cumulus', cumulus: false, anvil: false, shafts: false });
    expect(pick('cloudy')).toEqual({ high: 'Ci', mid: 'Ac', low: 'stratocumulus', cumulus: true, anvil: false, shafts: false });
    expect(pick('overcast')).toMatchObject({ high: 'Ci', mid: 'Ac', low: 'stratus' });
    expect(pick('drizzle')).toMatchObject({ high: 'Ci', mid: 'Ac', low: 'stratus' });
    expect(pick('fog')).toMatchObject({ high: 'Ci', mid: 'Ac', low: 'fog' });
    expect(pick('rain')).toEqual({ high: 'Ci', mid: 'As', low: 'deck', cumulus: false, anvil: false, shafts: true });
    expect(pick('storm')).toEqual({ high: 'Cs', mid: 'As', low: 'deck', cumulus: false, anvil: true, shafts: true });
    expect(pick('snow')).toMatchObject({ mid: 'As', low: 'deck', shafts: false });
    expect(pick('hail')).toMatchObject({ low: 'deck', shafts: true });
  });

  it('switches the types at the lookbook thresholds', () => {
    const at = (weather: WeatherType, low: number, mid: number, high: number) => getCloudTypes(weather, { low, mid, high });
    expect(at('partly', 0, 0, 59).high).toBe('Ci');
    expect(at('partly', 0, 0, 60).high).toBe('Cs');
    expect(at('partly', 0, 0, 4).high).toBeNull();
    expect(at('partly', 0, 69, 0).mid).toBe('Ac');
    expect(at('partly', 0, 70, 0).mid).toBe('As');
    expect(at('partly', 44, 0, 0).low).toBe('cumulus');
    expect(at('partly', 45, 0, 0)).toMatchObject({ low: 'stratocumulus', cumulus: true });
    expect(at('partly', 75, 0, 0).low).toBe('stratus');
    expect(at('partly', 4, 0, 0).low).toBeNull();
    // Fair weather has cumulus; grey weather stratocumulus.
    expect(at('overcast', 20, 0, 0).low).toBe('stratocumulus');
    // Rain without a deck: showers (towering cumulus with a shaft).
    expect(at('rain', 20, 30, 0).low).toBe('showers');
    expect(at('rain', 50, 0, 0).low).toBe('deck');
    expect(at('rain', 0, 50, 0).low).toBe('deck');
    // Drizzle closes to stratus from low 50 %, other weather from 75 %.
    expect(at('drizzle', 50, 0, 0).low).toBe('stratus');
    expect(at('cloudy', 50, 0, 0).low).toBe('stratocumulus');
  });

  it('hides the layers above a closed deck, as in nature', () => {
    const open = getCloudTypes('cloudy', { low: 30, mid: 40, high: 40 });
    const deck = getCloudTypes('rain', { low: 90, mid: 40, high: 40 });
    expect(open.highVisibility).toBe(1);
    expect(deck.highVisibility).toBeCloseTo(0.15);
    expect(deck.midVisibility).toBeCloseTo(0.15);
    // A deck under a mid sheet hides the high clouds altogether.
    expect(getCloudTypes('rain', { low: 90, mid: 90, high: 40 }).high).toBe('Ci');
    expect(getCloudTypes('rain', { low: 90, mid: 90, high: 40 }).highVisibility).toBeCloseTo(0.075);
  });

  it('lays out the chosen types', () => {
    expect(typesIn(layout({ weather: 'partly' }))).toEqual(new Set(['Ci', 'Ac', 'Cu']));
    expect(typesIn(layout({ weather: 'storm' }))).toEqual(new Set(['Cs', 'Ci', 'As', 'Ac', 'Cb', 'Ns']));
    expect(typesIn(layout({ weather: 'fog' }))).toEqual(new Set(['Ci', 'Ac', 'St']));
    expect(typesIn(layout({ weather: 'overcast' }))).toEqual(new Set(['Ci', 'Ac', 'St', 'Sc']));
    expect(layout({ weather: 'clear' })).toEqual([]);
    // Live layers win over the type's own: a clear day with a high veil.
    expect(typesIn(layout({ weather: 'clear', layers: { low: 0, mid: 0, high: 80 } }))).toEqual(new Set(['Cs', 'Ci']));
  });

  it('draws rain shafts under the deck, none in snow', () => {
    const shafts = (weather: WeatherType) => layout({ weather }).some(g => g.clouds.some(c => c.type === 'Ns' && c.shafts));
    expect(shafts('rain')).toBe(true);
    expect(shafts('storm')).toBe(true);
    expect(shafts('snow')).toBe(false);
  });

  it('keeps the sky the same all day, and sets more clouds on a wider screen', () => {
    expect(layout({ weather: 'cloudy' })).toEqual(layout({ weather: 'cloudy' }));
    expect(layout({ weather: 'cloudy', seed: 'Sun Oct 04 2026|47.8|9.6' })).not.toEqual(layout({ weather: 'cloudy' }));
    expect(layout({ weather: 'cloudy', width: 1440 }).length).toBeGreaterThan(layout({ weather: 'cloudy' }).length * 2);
  });
});

describe('cloud colours lit by the sun (ROADMAP item 84, C2)', () => {
  it('blends five palettes by the sun altitude', () => {
    expect(getCloudLight(45)).toEqual({ day: 1, golden: 0, sunset: 0, civil: 0, night: 0 });
    expect(getCloudLight(5)).toEqual({ day: 0, golden: 1, sunset: 0, civil: 0, night: 0 });
    expect(getCloudLight(0)).toEqual({ day: 0, golden: 0, sunset: 1, civil: 0, night: 0 });
    expect(getCloudLight(-4)).toEqual({ day: 0, golden: 0, sunset: 0, civil: 1, night: 0 });
    expect(getCloudLight(-30)).toEqual({ day: 0, golden: 0, sunset: 0, civil: 0, night: 1 });
    expect(getCloudLight(2.5)).toEqual({ day: 0, golden: 0.5, sunset: 0.5, civil: 0, night: 0 });
    expect(getCloudLight(getTimeOfDayAltitude('civil-twilight')).civil).toBe(1);
    expect(getCloudLight(getTimeOfDayAltitude('midday')).day).toBe(1);
  });

  it('gives each time of day its own look: white by day, gold, pink at sunset', () => {
    const day = getCloudColors('Cu', 'low', 'partly', getCloudLight(45));
    expect(day.lit.map(Math.round)).toEqual([255, 255, 255]);
    const golden = hsl(getCloudColors('Cu', 'low', 'partly', getCloudLight(5)).lit);
    expect(golden.h).toBeGreaterThan(20);
    expect(golden.h).toBeLessThan(40); // peach-gold
    const sunset = hsl(getCloudColors('Cu', 'low', 'partly', getCloudLight(0)).lit);
    expect(sunset.h).toBeGreaterThan(330); // pink
  });

  it('turns the low clouds purple in civil twilight, while the high clouds keep their colour (the item-84 bug)', () => {
    const civil = getCloudLight(-4);
    const low = hsl(getCloudColors('Sc', 'low', 'cloudy', civil).lit);
    const high = hsl(getCloudColors('Ci', 'high', 'cloudy', civil).lit);
    expect(low.h).toBeGreaterThan(260);
    expect(low.h).toBeLessThan(300); // purple
    expect(low.l).toBeLessThan(0.5); // not day white
    expect(high.h).toBeLessThan(30); // still orange-pink
    expect(high.l).toBeGreaterThan(low.l);
    // The veil over an overcast sky follows: no day grey in civil twilight.
    expect(getCloudVeil('overcast', civil)?.color).not.toBe(getCloudVeil('overcast', getCloudLight(45))?.color);
  });

  it('mutes wet weather toward grey and has no veil in clear weather', () => {
    const light = getCloudLight(5);
    expect(hsl(getCloudColors('Ns', 'low', 'rain', light).lit).s).toBeLessThan(hsl(getCloudColors('Cu', 'low', 'partly', light).lit).s);
    expect(getCloudVeil('clear', light)).toBeNull();
    expect(getCloudVeil('storm', light)?.opacity).toBe(0.8);
  });

  it('turns the lit side toward the light, in 10° steps', () => {
    expect(getLightAngle({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(0);
    expect(getLightAngle({ x: 0, y: 0 }, { x: 0, y: 100 })).toBe(90);
    expect(getLightAngle({ x: 0, y: 0 }, { x: -100, y: 2 })).toBe(180);
    expect(getLightAngle({ x: 0, y: 0 }, { x: 100, y: 12 })).toBe(10);
    expect(getLightAngle({ x: 0, y: 0 }, null)).toBeNull();
    const toTheRight = getCloudFill({ type: 'Cu', variant: 0, band: 'low', tint: 0 }, 'partly', getCloudLight(5), 0, null);
    expect(toTheRight.x2).toBeGreaterThan(toTheRight.x1);
    const fromAbove = getCloudFill({ type: 'Cu', variant: 0, band: 'low', tint: 0 }, 'partly', getCloudLight(45), null, null);
    expect(fromAbove.y2).toBeLessThan(fromAbove.y1);
    // C4: a vertical shade by day, a warm glow in the golden hour.
    expect(fromAbove.shade).not.toBeNull();
    expect(fromAbove.glow).toBeNull();
    expect(toTheRight.glow).not.toBeNull();
  });

  it('reads the sky colour at a height from the sky gradient', () => {
    const sky = 'linear-gradient(to bottom, #000000 0%, #ff0000 62%, #ffffff 100%)';
    expect(getSkyColorAt(sky, 0)).toEqual([0, 0, 0]);
    expect(getSkyColorAt(sky, 0.31)?.map(Math.round)).toEqual([128, 0, 0]);
    expect(getSkyColorAt(sky, 1)).toEqual([255, 255, 255]);
    expect(getSkyColorAt('none', 0.5)).toBeNull();
  });
});

describe('three bands at their own pace (ROADMAP item 84, C3)', () => {
  it('glides high 0.35, mid 0.7 and low 2.4 px/s at the top, half that at the horizon', () => {
    expect(getCloudSpeed('high', 0, 844)).toBeCloseTo(0.35);
    expect(getCloudSpeed('mid', 0, 844)).toBeCloseTo(0.7);
    expect(getCloudSpeed('low', 0, 844)).toBeCloseTo(2.4);
    expect(getCloudSpeed('low', 1, 844)).toBeCloseTo(1.2);
    // Short screens draw the scene smaller and slower.
    expect(getCloudSpeed('low', 0, 360)).toBeCloseTo(1.8);
  });

  it('moves every cloud in px/s, the same on a phone and a wide screen, at most half the sailboat pace', () => {
    for (const weather of ['partly', 'cloudy', 'overcast', 'rain', 'storm', 'fog'] as WeatherType[]) {
      for (const width of [390, 1440]) {
        for (const g of layout({ weather, width, height: 844 })) {
          if (g.durationSec === 0) continue; // the anvil and the lenses stand still
          const pxPerSec = Math.abs(g.to - g.from) / g.durationSec;
          const band = g.clouds[0].band;
          expect(pxPerSec).toBeCloseTo(g.speed, 6);
          expect(pxPerSec).toBeLessThanOrEqual(BAND_SPEED_PX_S[band] + 1e-9);
          expect(pxPerSec).toBeGreaterThanOrEqual(BAND_SPEED_PX_S[band] / 2 - 1e-9);
          expect(pxPerSec).toBeLessThanOrEqual(5.2 / 2);
        }
      }
    }
    const lowSpeeds = (width: number) => layout({ weather: 'storm', width }).filter(g => g.clouds[0].type === 'Ns').map(g => g.speed);
    expect(lowSpeeds(1440)).toEqual(lowSpeeds(390));
  });

  it('drifts downwind, and starts each cloud where the layout put it', () => {
    const right = layout({ weather: 'partly' });
    const left = layout({ weather: 'partly', direction: -1 });
    for (const g of right.filter(g => g.speed > 0)) expect(g.to).toBeGreaterThan(g.from);
    for (const g of left.filter(g => g.speed > 0)) expect(g.to).toBeLessThan(g.from);
    // The same cloud starts at the same place either way.
    right.forEach((g, i) => {
      expect(getGliderOffset(g, getGliderStartProgress(g))).toBeCloseTo(getGliderOffset(left[i], getGliderStartProgress(left[i])), 6);
    });
  });

  it('makes far clouds smaller and paler than near ones', () => {
    const cumulus = layout({ weather: 'partly', width: 1440 }).map(g => g.clouds[0]).filter(c => c.type === 'Cu');
    const far = cumulus.reduce((a, b) => (b.depth > a.depth ? b : a));
    const near = cumulus.reduce((a, b) => (b.depth < a.depth ? b : a));
    expect(far.opacity).toBeLessThan(near.opacity);
    expect(far.tint).toBeGreaterThan(near.tint);
  });
});

describe('rare lenticular and mammatus clouds (ROADMAP item 84, X1)', () => {
  it('comes on about one day in 30 per place, and stays all day', () => {
    let eggs = 0;
    let days = 0;
    for (const [lat, lon] of [[47.78, 9.61], [52.52, 13.4], [40.7, -74], [-33.9, 18.4], [35.7, 139.7]]) {
      for (let d = 0; d < 365; d++) {
        days++;
        if (isCloudEggDay(new Date(2026, 0, 1 + d, 9), lat, lon)) eggs++;
      }
    }
    expect(CLOUD_EGG_DAYS).toBe(30);
    expect(eggs / days).toBeGreaterThan(0.02);
    expect(eggs / days).toBeLessThan(0.05);
    expect(cloudEggRoll(new Date(2026, 9, 3, 7), 47.78, 9.61)).toBe(cloudEggRoll(new Date(2026, 9, 3, 22), 47.78, 9.61));
  });

  it('can be forced with ?egg=lenticular or ?egg=mammatus', () => {
    expect(isCloudEggForced('?egg=lenticular')).toBe(true);
    expect(isCloudEggForced('?egg=Mammatus')).toBe(true);
    expect(isCloudEggForced('?egg=ufo')).toBe(false);
    expect(isCloudEggForced('')).toBe(false);
  });

  it('stands two lenses still over the ridge on a fair day, and hangs pouches under a storm deck', () => {
    const lenses = layout({ weather: 'partly', egg: true }).filter(g => g.clouds[0].type === 'Len');
    expect(lenses).toHaveLength(2);
    for (const g of lenses) {
      expect(g.speed).toBe(0);
      expect(g.from).toBe(g.to);
      expect(g.clouds[0].y).toBeLessThan(844 * 0.65); // above the horizon
    }
    const storm = layout({ weather: 'storm', egg: true });
    expect(typesIn(storm).has('Mam')).toBe(true);
    // After the storm: no rain shafts under the deck.
    expect(storm.some(g => g.clouds.some(c => c.type === 'Ns' && c.shafts))).toBe(false);
    // Not on other days, and not in other weather.
    expect(typesIn(layout({ weather: 'partly' })).has('Len')).toBe(false);
    expect(typesIn(layout({ weather: 'storm' })).has('Mam')).toBe(false);
    expect(typesIn(layout({ weather: 'rain', egg: true })).has('Mam')).toBe(false);
    expect(typesIn(layout({ weather: 'rain', egg: true })).has('Len')).toBe(false);
  });
});

describe('cloud shadows on the sea (ROADMAP item 84, X2)', () => {
  it('shows dark patches by day, longer and fainter in the golden hour, none from sunset or in grey weather', () => {
    expect(getCloudShadowLook('partly', getCloudLight(45))).toEqual({ alpha: 0.5, shift: 0.12 });
    expect(getCloudShadowLook('cloudy', getCloudLight(5))).toEqual({ alpha: 0.28, shift: 0.3 });
    expect(getCloudShadowLook('partly', getCloudLight(0))).toBeNull();
    expect(getCloudShadowLook('partly', getCloudLight(-20))).toBeNull();
    expect(getCloudShadowLook('overcast', getCloudLight(45))).toBeNull();
  });

  it('lays the shadow of a far cloud near the horizon and of a near cloud toward the bottom', () => {
    const near = getCloudShadowBox({ depth: 0, scale: 1 }, 844);
    const far = getCloudShadowBox({ depth: 1, scale: 1 }, 844);
    expect(far.y).toBeGreaterThan(844 * 0.65);
    expect(near.y).toBeGreaterThan(far.y);
    expect(near.y).toBeLessThan(844);
    expect(far.height).toBeLessThan(near.height);
    // Only the cumulus and stratocumulus throw one.
    const partly = layout({ weather: 'partly' }).map(g => g.clouds[0]);
    expect(partly.filter(c => c.shadow).every(c => c.type === 'Cu' || c.type === 'Sc')).toBe(true);
    expect(partly.some(c => c.shadow)).toBe(true);
  });
});

describe('the silver lining follows a gliding cloud (ROADMAP items 76 and 84)', () => {
  it('moves the moon light across the cloud as the cloud glides, and lets go of it', () => {
    const glider = layout({ weather: 'cloudy' }).find(g => g.clouds.length === 1 && g.clouds[0].band === 'low')!;
    const cloud = glider.clouds[0];
    const start = getGliderStartProgress(glider);
    const here = getCloudCentre(glider, cloud, start);
    const moon = { ...here, r: 20 };
    const lit = getCloudMoonlight({ ...here, scale: cloud.scale }, moon);
    expect(lit?.cx).toBeCloseTo(60);
    expect(lit?.cy).toBeCloseTo(30);
    // 40 s later the cloud has moved on, downwind, by its speed: the light sits further left on it.
    const later = start + (40 * glider.speed) / Math.abs(glider.to - glider.from);
    const there = getCloudCentre(glider, cloud, later);
    expect(there.x - here.x).toBeCloseTo(40 * glider.speed, 6);
    const moved = getCloudMoonlight({ ...there, scale: cloud.scale }, moon);
    expect(moved?.cx).toBeCloseTo(60 - (40 * glider.speed) / cloud.scale);
    // Far on, the light no longer reaches it.
    const gone = getCloudCentre(glider, cloud, start + 600 / Math.abs(glider.to - glider.from));
    expect(getCloudMoonlight({ ...gone, scale: cloud.scale }, moon)).toBeNull();
  });
});
