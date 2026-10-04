import { render } from '@testing-library/react';
import SceneFish from '../src/components/SceneFish';

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
