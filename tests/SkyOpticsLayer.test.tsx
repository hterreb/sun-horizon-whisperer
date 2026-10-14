import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import SkyOpticsLayer, { OPTIC_FADE_MS, OPTIC_PX_PER_DEG } from '@/components/SkyOpticsLayer';
import { OPTIC_KINDS, type OpticKind } from '@/utils/skyOptics';

const reducedMotion = vi.hoisted(() => ({ on: false }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => reducedMotion.on }));

// A phone at a low sun in the south-west with the full moon rising in the east.
const W = 390, H = 844, HORIZON = H * 0.65;
const base = {
  containerWidth: W,
  containerHeight: H,
  sun: { x: 250.4, y: 400.6 },
  moon: { x: 100, y: 300 },
  antisolar: { visible: true, xFraction: 0.2, apexHeightDeg: 30 },
  antilunar: { visible: true, xFraction: 0.7, apexHeightDeg: 20 },
};
const optic = (kind: OpticKind) => document.querySelector<SVGSVGElement>(`[data-testid="sky-optic"][data-optic="${kind}"]`);
const hits = (kind: OpticKind) => [...document.querySelectorAll(`[data-optic-hit="${kind}"] [data-testid="optic-hit"]`)];

describe('SkyOpticsLayer (ROADMAP item 148)', () => {
  afterEach(() => {
    reducedMotion.on = false;
    vi.useRealTimers();
  });

  it('draws nothing without optics', () => {
    const { container } = render(<SkyOpticsLayer {...base} optics={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it.each(OPTIC_KINDS)('draws %s as a static svg above the horizon that fades in', (kind) => {
    render(<SkyOpticsLayer {...base} optics={[kind]} />);
    const svg = optic(kind)!;
    expect(svg).not.toBeNull();
    expect(Number(svg.getAttribute('height'))).toBeCloseTo(HORIZON);
    expect(svg.getAttribute('class')).toContain('animate-optic-in');
    expect(svg.querySelector('feGaussianBlur')).not.toBeNull();
    // Static: no SMIL animation in the drawing.
    expect(svg.querySelector('animate, animateTransform, animateMotion')).toBeNull();
  });

  it('puts the halo and the sun dogs 22° from the sun on the closer scale (5 px per degree), in whole pixels', () => {
    render(<SkyOpticsLayer {...base} optics={['halo', 'sunDogs', 'moonHalo']} onInfo={vi.fn()} />);
    expect(OPTIC_PX_PER_DEG).toBe(5);
    const ring = hits('halo')[0];
    expect([ring.getAttribute('cx'), ring.getAttribute('cy'), ring.getAttribute('r')]).toEqual(['250', '401', String(22 * 5 + 2)]);
    expect(hits('sunDogs').map((h) => h.getAttribute('cx'))).toEqual([String(250 - 110), String(250 + 110)]);
    const moonRing = hits('moonHalo')[0];
    expect([moonRing.getAttribute('cx'), moonRing.getAttribute('cy')]).toEqual(['100', '300']);
  });

  it('draws the bows on the rainbow scale: the second bow at 51° and the fog bow at 39°', () => {
    render(<SkyOpticsLayer {...base} optics={['doubleRainbow', 'fogBow', 'moonbow']} />);
    const radii = (kind: OpticKind) => [...optic(kind)!.querySelectorAll('circle')].map((c) => Number(c.getAttribute('r')));
    const scale = (deg: number) => Math.round((deg / 42) * HORIZON * 0.95);
    // The second bow: 6 bands from the 51° radius inward (apex 30° + 9°), spectrum reversed.
    expect(radii('doubleRainbow')).toEqual(expect.arrayContaining([scale(39), scale(39) - 9 * 5]));
    expect(optic('doubleRainbow')!.querySelectorAll('circle[stroke="#7c3aed"]')[0].getAttribute('r')).toBe(String(scale(39)));
    expect(radii('fogBow')).toContain(scale(27));
    // The bows sit on the horizon, opposite the sun or the moon, and fade out toward their feet.
    expect(optic('fogBow')!.querySelector('circle')!.getAttribute('cx')).toBe(String(Math.round(0.2 * W)));
    expect(optic('moonbow')!.querySelector('circle')!.getAttribute('cx')).toBe(String(Math.round(0.7 * W)));
    for (const kind of ['doubleRainbow', 'fogBow', 'moonbow'] as const) expect(optic(kind)!.querySelector('mask')).not.toBeNull();
  });

  it('draws no sun optic without the sun on the screen and no bow without its geometry', () => {
    render(
      <SkyOpticsLayer
        {...base}
        sun={null}
        moon={null}
        antisolar={{ visible: false, xFraction: 0, apexHeightDeg: 0 }}
        antilunar={{ visible: false, xFraction: 0, apexHeightDeg: 0 }}
        optics={OPTIC_KINDS}
      />,
    );
    expect(document.querySelectorAll('[data-testid="sky-optic"]')).toHaveLength(0);
  });

  it('takes taps only on thin hit paths, and has none without onInfo', () => {
    const { rerender } = render(<SkyOpticsLayer {...base} optics={OPTIC_KINDS} />);
    expect(document.querySelectorAll('[data-testid="optic-hit"]')).toHaveLength(0);
    expect(screen.getByTestId('sky-optics-layer').className).toContain('pointer-events-none');
    rerender(<SkyOpticsLayer {...base} optics={OPTIC_KINDS} onInfo={vi.fn()} />);
    for (const kind of OPTIC_KINDS) {
      const kindHits = hits(kind);
      expect(kindHits.length, kind).toBeGreaterThan(0);
      for (const hit of kindHits) {
        expect(['stroke', 'fill']).toContain((hit as SVGElement).style.pointerEvents);
        expect(hit.hasAttribute('data-scene-hit')).toBe(true);
        expect(hit.getAttribute('class')).toContain('touch-manipulation');
      }
    }
    // Rings and bows take taps on their band, not on the sky inside.
    expect(hits('halo')[0].getAttribute('fill')).toBe('none');
    expect((hits('halo')[0] as SVGElement).style.pointerEvents).toBe('stroke');
    // The bows' hit paths stop above the horizon, as the rainbow's.
    expect(Number(document.querySelector('[data-optic-hit="fogBow"]')!.getAttribute('height'))).toBeLessThan(HORIZON);
    // The drawings take no taps.
    expect(optic('halo')!.querySelector('[data-scene-hit]')).toBeNull();
  });

  it.each(OPTIC_KINDS)('opens the %s card on a double tap, not on one tap', (kind) => {
    const onInfo = vi.fn();
    render(<SkyOpticsLayer {...base} optics={[kind]} onInfo={onInfo} />);
    const hit = hits(kind)[0];
    fireEvent.click(hit, { clientX: 10, clientY: 20 });
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(hit, { clientX: 10, clientY: 20 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'optic', kind }, { x: 10, y: 20 }, `optic:${kind}`);
  });

  it('outlines the hit path in the tier colour while its card is open', () => {
    const { rerender } = render(<SkyOpticsLayer {...base} optics={['halo', 'rays', 'sunDogs', 'moonbow']} onInfo={vi.fn()} />);
    expect(screen.queryAllByTestId('scene-info-ring')).toHaveLength(0);
    const ringsOf = (ring: string) => {
      rerender(<SkyOpticsLayer {...base} optics={['halo', 'rays', 'sunDogs', 'moonbow']} onInfo={vi.fn()} infoRing={ring} />);
      return screen.getAllByTestId('scene-info-ring');
    };
    expect(ringsOf('optic:halo').map((r) => r.getAttribute('class'))).toEqual(['stroke-tier-uncommon/80', 'stroke-tier-uncommon/80']);
    expect(ringsOf('optic:rays')).toHaveLength(7);
    expect(ringsOf('optic:rays')[0].getAttribute('class')).toBe('stroke-tier-common/80');
    expect(ringsOf('optic:sunDogs')[0].getAttribute('class')).toBe('stroke-tier-frequent/80');
    expect(ringsOf('optic:moonbow')[0].getAttribute('class')).toBe('stroke-tier-very-rare/80');
  });

  it('fades an optic out over 5 s when it ends, without a hit path, then removes it', () => {
    vi.useFakeTimers();
    const { rerender } = render(<SkyOpticsLayer {...base} optics={['halo', 'sunDogs']} onInfo={vi.fn()} />);
    rerender(<SkyOpticsLayer {...base} optics={['sunDogs']} onInfo={vi.fn()} />);
    expect(OPTIC_FADE_MS).toBe(5000);
    expect(optic('halo')!.getAttribute('class')).toContain('animate-optic-out');
    expect(hits('halo')).toHaveLength(0);
    expect(optic('sunDogs')!.getAttribute('class')).toContain('animate-optic-in');
    act(() => {
      vi.advanceTimersByTime(OPTIC_FADE_MS - 1);
    });
    expect(optic('halo')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(optic('halo')).toBeNull();
    expect(optic('sunDogs')).not.toBeNull();
  });

  it('with reduced motion: no fade, and an ended optic goes at once', () => {
    reducedMotion.on = true;
    const { rerender } = render(<SkyOpticsLayer {...base} optics={['halo']} />);
    expect(optic('halo')!.getAttribute('class')).not.toContain('animate-optic');
    rerender(<SkyOpticsLayer {...base} optics={[]} />);
    expect(optic('halo')).toBeNull();
  });
});
