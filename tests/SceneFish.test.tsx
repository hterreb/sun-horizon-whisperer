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

// The end and control points of an SVG path (M, L, H, V, C and Z, absolute and relative): a
// curve stays inside its control points, so their box is the shape's box or a little more.
const pathPoints = (d: string): [number, number][] => {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g)!;
  const sizes: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, Z: 0 };
  const points: [number, number][] = [];
  let [i, cmd, x, y, startX, startY] = [0, '', 0, 0, 0, 0];
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const upper = cmd.toUpperCase();
    const [bx, by] = cmd === upper ? [0, 0] : [x, y];
    if (upper === 'Z') { [x, y] = [startX, startY]; continue; }
    const args = tokens.slice(i, i + sizes[upper]).map(Number);
    i += sizes[upper];
    if (upper === 'H') x = bx + args[0];
    else if (upper === 'V') y = by + args[0];
    else {
      for (let k = 0; k < args.length; k += 2) points.push([bx + args[k], by + args[k + 1]]);
      [x, y] = [bx + args[args.length - 2], by + args[args.length - 1]];
    }
    points.push([x, y]);
    if (upper === 'M') { [startX, startY] = [x, y]; cmd = cmd === 'M' ? 'L' : 'l'; }
  }
  return points;
};
const boxOf = (d: string) => {
  const points = pathPoints(d);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), top: Math.min(...ys) };
};

// ROADMAP item 144 (Whale lookbook D, E, G, I): the sperm whale, its calf, its rise and its night glow.
describe('SceneFish whale (ROADMAP item 144)', () => {
  const whale = (props: Partial<React.ComponentProps<typeof SceneFish>> = {}) =>
    render(<SceneFish kind="whale" size={56} {...props} />).container.querySelector('svg') as SVGSVGElement;
  const surface = { delay: 12, under: 0.7, glint: 'hsl(var(--scene-glow-white) / 0.75)' };
  const bodies = (svg: SVGSVGElement) => [...svg.querySelectorAll('path')].filter(path => path.style.fill.startsWith('url(#'));

  it('draws a sperm whale: a long body (at least 3 : 1), flat flukes and a pale jaw (D)', () => {
    const svg = whale();
    const body = boxOf(bodies(svg)[0].getAttribute('d')!);
    expect(body.width / body.height).toBeGreaterThanOrEqual(3);
    // The flukes come first: wider than tall, no upright fish tail.
    const flukes = boxOf(svg.querySelector('path')!.getAttribute('d')!);
    expect(flukes.width).toBeGreaterThan(flukes.height);
    // The fins in the back tone, the body, then the jaw in the belly tone and the eye.
    expect(fills(svg)).toEqual([
      'hsl(var(--scene-fish-whale-back))', 'hsl(var(--scene-fish-whale-back))', expect.stringMatching(/^url\(#/),
      'hsl(var(--scene-fish-whale-belly))', 'hsl(var(--scene-fish-eye))',
    ]);
    // By day no extras: no keyframes, no sparkle.
    expect(svg.querySelector('style')).toBeNull();
    expect(svg.querySelector('[data-testid="whale-outline"], [data-testid="whale-spark"], [data-testid="whale-calf"]')).toBeNull();
  });

  it('draws the calf as a copy at 46 %, just above the back of its mother (E)', () => {
    const svg = whale({ calf: true });
    const calf = svg.querySelector('[data-testid="whale-calf"]')!;
    expect(calf.getAttribute('transform')).toBe('translate(8.4 .2) scale(.46)');
    expect(bodies(svg)).toHaveLength(2);
    expect(calf.contains(bodies(svg)[0])).toBe(true); // first, so behind its mother
    // The calf's lowest point (14.9 × 0.46 + 0.2) stays above the mother's back (9.1).
    expect(boxOf(bodies(svg)[1].getAttribute('d')!).top).toBeGreaterThan(14.9 * 0.46 + 0.2);
  });

  it('rises once on one clock: the part above its water surface crisp, the part under it hazy (G)', () => {
    const svg = whale({ surface });
    expect(svg.style.overflow).toBe('visible'); // the spout reaches above the box
    const timing = '17.5s linear 12s 1 both';
    const under = svg.querySelector('g[clip-path*="under"]')!;
    const above = svg.querySelector('g[clip-path*="above"]')!;
    expect(under.getAttribute('opacity')).toBe('0.7');
    expect(above.getAttribute('opacity')).toBeNull();
    for (const part of [under, above]) {
      expect((part.firstElementChild as SVGElement).style.animation).toBe(`scene-whale-rise ${timing}`);
      expect(bodies(part as unknown as SVGSVGElement)).toHaveLength(1);
    }
    // The water surface at grid y 7: the clips meet there.
    expect(svg.querySelector('clipPath[id$="above"] rect')!.getAttribute('height')).toBe('19');
    expect(svg.querySelector('clipPath[id$="under"] rect')!.getAttribute('y')).toBe('7');
    const glint = svg.querySelector<SVGElement>('[data-testid="whale-glint"]')!;
    expect(glint.style.animation).toBe(`scene-whale-glint ${timing}`);
    expect(glint.style.stroke).toBe(surface.glint);
    expect(svg.querySelector<SVGElement>('[data-testid="whale-spout"]')!.style.animation).toBe(`scene-whale-spout ${timing}`);
    // Only the whale rises.
    expect(render(<SceneFish kind="carp" size={26} surface={surface} />).container.querySelector('style')).toBeNull();
  });

  it('rises slowly, at most 2.3 px/s on a phone, and the spout grows over 3 s (G)', () => {
    const css = whale({ surface }).querySelector('style')!.textContent!;
    const block = (name: string) => css.slice(css.indexOf(`@keyframes ${name} `), css.indexOf('} }', css.indexOf(`@keyframes ${name} `)) + 3);
    const at = (pct: string) => (parseFloat(pct) / 100) * 17.5;
    const poses = [...block('scene-whale-rise').matchAll(/([\d.]+)% \{ transform: translate\(0px, (-?[\d.]+)px\).*?rotate\((-?[\d.]+)deg\)/g)]
      .map(([, pct, dy, tilt]) => ({ sec: at(pct), dy: Number(dy), tilt: (Number(tilt) * Math.PI) / 180 }));
    expect(poses[0]).toEqual({ sec: 0, dy: 0, tilt: 0 });
    expect(poses[poses.length - 1]).toEqual({ sec: 17.5, dy: 0, tilt: 0 });
    expect(Math.min(...poses.map(p => p.dy))).toBe(-3.4);
    expect(Math.max(...poses.map(p => Math.abs(p.tilt)))).toBeLessThanOrEqual((4 * Math.PI) / 180 + 1e-4);
    // The front of the head (21.4, 9.2) moves fastest: the rise plus the tilt about (12, 12.5).
    // A near whale is 56 px wide: 56 / 24 px per grid unit.
    const head = poses.map(p => ({ sec: p.sec, y: p.dy + 12.5 + 9.4 * Math.sin(p.tilt) - 3.3 * Math.cos(p.tilt) }));
    for (let k = 1; k < head.length; k++) {
      const dt = head[k].sec - head[k - 1].sec;
      if (dt > 0) expect((Math.abs(head[k].y - head[k - 1].y) / dt) * (56 / 24)).toBeLessThanOrEqual(2.3);
    }
    const spout = [...block('scene-whale-spout').matchAll(/([\d.]+)% \{ opacity: ([\d.]+);/g)].map(([, pct, opacity]) => ({ sec: at(pct), opacity: Number(opacity) }));
    const shows = spout.filter(f => f.opacity > 0);
    const full = spout.find(f => f.opacity === 0.5)!;
    expect(full.sec - (shows[0].sec - 0.25)).toBeCloseTo(3, 1); // the first step after the start is 0.25 s in
    expect(spout.find(f => f.sec > full.sec && f.opacity === 0)!.sec - full.sec).toBeCloseTo(2, 2);
    // Up when it blows: the spout starts after the rise and is gone before the sink.
    const top = poses.filter(p => p.dy === -3.4);
    expect(shows[0].sec).toBeGreaterThan(top[0].sec);
    expect(shows[shows.length - 1].sec).toBeLessThan(top[top.length - 1].sec);
  });

  it('glows at night: a faint cyan outline and five sparks that fade in and out behind the flukes (I)', () => {
    const svg = whale({ light: 'own' });
    expect(stops(svg)).toContain('hsl(var(--scene-fish-own-back))');
    const outline = svg.querySelector<SVGElement>('[data-testid="whale-outline"]')!;
    expect(outline.style.stroke).toBe('hsl(var(--scene-fish-jellyfish-glow))');
    expect(outline.querySelectorAll('path')).toHaveLength(4); // the flukes, the fin, the body and the jaw
    const sparks = [...svg.querySelectorAll<SVGElement>('[data-testid="whale-spark"]')];
    expect(sparks).toHaveLength(5);
    sparks.forEach(spark => {
      expect(Number(spark.getAttribute('cx'))).toBeLessThan(0.2); // behind the flukes
      expect(spark.style.animation).toMatch(/^scene-whale-spark 2\.5s ease-in-out -?[\d.]+s infinite alternate both$/);
    });
    // The calf glows too.
    expect(whale({ light: 'own', calf: true }).querySelector('[data-testid="whale-calf"] [data-testid="whale-outline"]')).not.toBeNull();
  });
});
