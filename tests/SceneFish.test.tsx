import { render } from '@testing-library/react';
import SceneFish from '../src/components/SceneFish';
import SceneBoat from '../src/components/SceneBoat';

// ROADMAP item 85, FS1: two-tone silhouettes for the 13 day and the 5 night species.
const DAY = ['classic', 'minnow', 'perch', 'pike', 'carp', 'catfish', 'trout', 'ray', 'turtle', 'jellyfish', 'seahorse', 'whale', 'pufferfish'] as const;
const NIGHT = ['burbot', 'eel', 'lanternfish', 'anglerfish', 'squid'] as const;
type Kind = typeof DAY[number] | typeof NIGHT[number];

const draw = (kind: Kind, light?: 'moon' | 'own', glow = false) =>
  render(<SceneFish kind={kind} light={light} size={20} glow={glow} />).container.querySelector('svg') as SVGSVGElement;
const fills = (svg: SVGSVGElement) => [...svg.querySelectorAll('path, circle')].map(el => (el as SVGElement).style.fill);
const stops = (svg: SVGSVGElement) => [...svg.querySelectorAll('stop')].map(stop => (stop as SVGElement).style.stopColor);

describe('SceneFish (ROADMAP item 85, FS1)', () => {
  it('draws all 18 species as filled bodies with a gradient, no outline', () => {
    for (const kind of [...DAY, ...NIGHT]) {
      const svg = draw(kind, NIGHT.includes(kind as typeof NIGHT[number]) ? 'moon' : undefined);
      expect(svg.getAttribute('data-kind')).toBe(kind);
      expect(svg.getAttribute('width')).toBe('20');
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      const body = [...svg.querySelectorAll('path')].filter(path => path.style.fill.startsWith('url(#'));
      expect(body, kind).toHaveLength(1);
      expect(svg.querySelectorAll('stop').length, kind).toBeGreaterThanOrEqual(3);
      expect(svg.getAttribute('stroke'), kind).toBeNull();
    }
  });

  it('paints a day fish with a dark back over a pale belly, in its own tones', () => {
    for (const kind of DAY.filter(k => k !== 'jellyfish')) {
      const svg = draw(kind);
      expect(stops(svg), kind).toContain(`hsl(var(--scene-fish-${kind}-back))`);
      if (kind !== 'ray') expect(stops(svg), kind).toContain(`hsl(var(--scene-fish-${kind}-belly))`);
    }
    // The fins come first, in the back tone; the trout keeps its band.
    expect(fills(draw('classic'))[0]).toBe('hsl(var(--scene-fish-classic-back))');
    expect([...draw('trout').querySelectorAll('path')].some(path => path.style.stroke === 'hsl(var(--scene-fish-trout-band))')).toBe(true);
  });

  it('shades the ray from the middle, the seahorse sideways and the jellyfish into its tint', () => {
    expect(draw('ray').querySelector('radialGradient')).not.toBeNull();
    const seahorse = draw('seahorse').querySelector('linearGradient')!;
    expect([seahorse.getAttribute('x2'), seahorse.getAttribute('y2')]).toEqual(['1', '0']);
    expect(stops(draw('jellyfish'))).toEqual([
      'hsl(var(--scene-fish-jellyfish-belly))', 'hsl(var(--scene-fish-jellyfish))', 'hsl(var(--scene-fish-jellyfish))',
    ]);
  });

  it('keeps the night rules: the moon tone, or a dark body with its own lights (item 65)', () => {
    expect(fills(draw('burbot', 'moon'))[0]).toBe('hsl(var(--scene-fish-moon-back))');
    expect(fills(draw('classic', 'moon'))[0]).toBe('hsl(var(--scene-fish-moon-back))');
    expect(draw('burbot', 'moon').querySelectorAll('[data-testid="fish-light"]')).toHaveLength(0);
    const lanternfish = draw('lanternfish', 'own');
    expect(fills(lanternfish)[0]).toBe('hsl(var(--scene-fish-own-back))');
    expect(lanternfish.querySelectorAll('[data-testid="fish-light"]')).toHaveLength(5);
    expect(draw('anglerfish', 'own').querySelectorAll('[data-testid="fish-light"]')).toHaveLength(1);
    const squid = draw('squid', 'own');
    const squidLights = [...squid.querySelectorAll('[data-testid="fish-light"]')] as SVGElement[];
    expect(squidLights).toHaveLength(4);
    expect(squidLights[0].style.fill).toBe('hsl(var(--scene-fish-squid))');
    expect(stops(draw('jellyfish', 'own'))).toContain('hsl(var(--scene-fish-jellyfish-glow))');
  });

  it('draws a night species in the moon tone even without a light (the ?fish= override by day)', () => {
    expect(fills(draw('eel'))[0]).toBe('hsl(var(--scene-fish-moon-back))');
  });

  it('lights the gold E1 spot after sunset only when asked (item 62)', () => {
    expect(draw('perch', undefined, true).querySelectorAll('[data-testid="fish-glow"]')).toHaveLength(1);
    expect(draw('perch').querySelector('[data-testid="fish-glow"]')).toBeNull();
  });
});

// ROADMAP item 145 (Underwater Fish lookbook, option H): the colours mix with the water.
describe('SceneFish under water (ROADMAP item 145)', () => {
  type Props = Partial<React.ComponentProps<typeof SceneFish>>;
  const wet = (kind: Kind, props: Props) =>
    render(<SceneFish kind={kind} size={20} {...props} />).container.querySelector('svg') as SVGSVGElement;
  const strokes = (svg: SVGSVGElement) => [...svg.querySelectorAll('path')].map(el => (el as SVGElement).style.stroke).filter(Boolean);
  const all = (svg: SVGSVGElement) => [...fills(svg), ...strokes(svg), ...stops(svg)].filter(c => c && c !== 'none' && !c.startsWith('url('));
  const mix = (token: string, share: number) => `color-mix(in oklab, hsl(var(--scene-fish-${token})), var(--scene-fish-water) ${share}%)`;

  it('mixes each fill, line and stop with the water var, the eye and the trout band too', () => {
    const trout = wet('trout', { water: 25 });
    expect(fills(trout)[0]).toBe(mix('trout-back', 25));
    expect(stops(trout)).toContain(mix('trout-belly', 25));
    expect(strokes(trout)).toContain(mix('trout-band', 25));
    expect(fills(trout)).toContain(mix('eye', 25));
    for (const color of all(trout)) expect(color).toContain('var(--scene-fish-water) 25%');
    // The side tone mixes the two tones first, then the water.
    expect(fills(wet('classic', { water: 34 }))).toContain(
      'color-mix(in oklab, color-mix(in hsl, hsl(var(--scene-fish-classic-back)), hsl(var(--scene-fish-classic-belly))), var(--scene-fish-water) 34%)',
    );
  });

  it('keeps the gold E1 spot, the lights and the fish with their own light in their colours', () => {
    const spot = wet('perch', { water: 39, glow: true }).querySelector('[data-testid="fish-glow"]') as SVGElement;
    expect(spot.style.fill).toBe('hsl(var(--brand-gold-light))');
    const lanternfish = wet('lanternfish', { light: 'own', water: 25, boatTone: 'night' });
    expect(all(lanternfish).some(c => c.includes('color-mix(in oklab'))).toBe(false);
    expect(fills(lanternfish)[0]).toBe('hsl(var(--scene-fish-own-back))');
    expect(lanternfish.querySelectorAll('[data-testid="fish-light"]')).toHaveLength(5);
  });

  it('tints a moonlit fish without the night dimming', () => {
    const burbot = wet('burbot', { light: 'moon', water: 25, boatTone: 'night' });
    expect(fills(burbot)[0]).toBe(mix('moon-back', 25));
    expect(all(burbot).some(c => c.includes('black'))).toBe(false);
  });

  it('dims a day fish with the boat light in the colour mix, not with a filter', () => {
    const fin = (boatTone: Props['boatTone']) => fills(wet('classic', { water: 34, boatTone }))[0];
    expect(fin('day')).toBe(mix('classic-back', 34));
    const wetFin = mix('classic-back', 34);
    expect(fin('sun')).toBe(`color-mix(in srgb, ${wetFin}, black 8%)`);
    expect(fin('twilight')).toBe(
      `color-mix(in srgb, color-mix(in oklab, ${wetFin}, color-mix(in oklch longer hue, ${wetFin}, ${wetFin}) 15%), black 28%)`,
    );
    expect(fin('night')).toContain('longer hue');
    expect(fin('night')).toMatch(/\) 25%\), black 64%\)$/);
    expect(wet('classic', { water: 34, boatTone: 'twilight' }).getAttribute('style') ?? '').not.toContain('filter');
  });

  it('dims by the same numbers as the boats (SceneBoat TONE_FILTER)', () => {
    for (const tone of ['sun', 'twilight', 'night'] as const) {
      const boat = render(<SceneBoat kind="sailboat" tone={tone} lit={false} wake={false} />).container.querySelector('svg') as SVGSVGElement;
      const [, brightness, saturate] = /brightness\(([\d.]+)\) saturate\(([\d.]+)\)/.exec(boat.style.filter) ?? [];
      const fin = fills(wet('classic', { water: 34, boatTone: tone }))[0];
      expect(fin, tone).toContain(`black ${Math.round((1 - Number(brightness)) * 100)}%)`);
      // A mix cannot add colour: only a saturation below 1 is in the mix.
      if (Number(saturate) < 1) expect(fin, tone).toContain(`) ${Math.round(((1 - Number(saturate)) / 2) * 100)}%), black`);
      else expect(fin, tone).not.toContain('longer hue');
    }
  });
});
