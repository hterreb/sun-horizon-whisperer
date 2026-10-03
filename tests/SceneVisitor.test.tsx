import { render } from '@testing-library/react';
import SceneVisitor from '../src/components/SceneVisitor';

// ROADMAP item 85: SH1 shark, DO1 rolling dolphins, X4 V-wake.
describe('SceneVisitor (ROADMAP item 85)', () => {
  const draw = (props: React.ComponentProps<typeof SceneVisitor>) =>
    render(<SceneVisitor {...props} />).container.querySelector('[data-testid="scene-visitor"]') as SVGSVGElement;
  const finFill = (svg: SVGSVGElement) => (svg.querySelector('g[clip-path*="above"] path') as SVGElement).style.fill;

  it('shows only the shark\'s dorsal fin above the water, and the faint body below (SH1)', () => {
    const shark = draw({ kind: 'shark', tone: 'day', width: 48 });
    const above = shark.querySelector('clipPath[id$="above"] rect')!;
    expect([above.getAttribute('x'), above.getAttribute('width')]).toEqual(['17', '14']);
    const below = shark.querySelector('g[clip-path*="below"] > g')!;
    expect(below.getAttribute('opacity')).toBe('0.3');
    expect(below.getAttribute('filter')).toMatch(/^url\(#.*soft\)$/);
    expect(shark.querySelectorAll('[data-testid="visitor-wake"]')).toHaveLength(1);
  });

  it('lifts the svg so the waterline is the top of the swimmer\'s box', () => {
    // The shark's waterline is 12.6 grid units below the top of the view (10.6 + 2).
    expect(draw({ kind: 'shark', tone: 'day', width: 48 }).style.marginTop).toBe('-12.6px');
    expect(parseFloat(draw({ kind: 'shark', tone: 'day', width: 24 }).style.marginTop)).toBeCloseTo(-6.3, 5);
  });

  it('colours the visitors by day, at dusk and by the moon', () => {
    expect(finFill(draw({ kind: 'shark', tone: 'day', width: 48 }))).toBe('hsl(var(--scene-fish-shark))');
    expect(finFill(draw({ kind: 'shark', tone: 'dusk', width: 48 }))).toBe('hsl(var(--scene-fish-shark-dusk))');
    expect(finFill(draw({ kind: 'dolphins', tone: 'day', width: 82, rolls: [0, 1.5] }))).toBe('hsl(var(--scene-fish-dolphin))');
    expect(finFill(draw({ kind: 'dolphins', tone: 'moon', width: 82, rolls: [0, 1.5] }))).toBe('hsl(var(--scene-fish-visitor-moon))');
  });

  it('rolls each dolphin through the surface in turn, with a wake while its back is up (DO1, X4)', () => {
    const pod = draw({ kind: 'dolphins', tone: 'day', width: 116, rolls: [0.2, 1.9, 3.3] });
    expect(pod.getAttribute('viewBox')).toBe('0 -2 116 34'); // three dolphins, 34 units apart
    const dolphins = [...pod.querySelectorAll('[data-testid="visitor-dolphin"]')];
    expect(dolphins).toHaveLength(3);
    dolphins.forEach((dolphin, i) => {
      const animations = [...dolphin.querySelectorAll('g')].map(g => g.style.animation).filter(Boolean);
      // The body above, its shadow below and the glint with the wake: one roll clock each.
      expect(animations).toEqual([
        `scene-dolphin-roll 11s linear ${[0.2, 1.9, 3.3][i]}s infinite both`,
        `scene-dolphin-roll 11s linear ${[0.2, 1.9, 3.3][i]}s infinite both`,
        `scene-dolphin-glint 11s linear ${[0.2, 1.9, 3.3][i]}s infinite both`,
      ]);
      expect(dolphin.querySelectorAll('[data-testid="visitor-wake"]')).toHaveLength(1);
    });
  });

  it('rolls in 4.5 s of each 11 s, 9 units up and back down, never out of the water (DO1)', () => {
    const css = draw({ kind: 'dolphins', tone: 'day', width: 82, rolls: [0, 1.5] }).querySelector('style')!.textContent!;
    const roll = css.slice(css.indexOf('scene-dolphin-roll'), css.indexOf('scene-dolphin-glint'));
    expect(roll).toContain('0.00% { transform: translate(0px, 9.00px)');
    expect(roll).toContain('20.45% { transform: translate(0px, 0.00px)'); // the top of the arc, half way
    expect(roll).toContain('40.91% { transform: translate(0px, 9.00px)');
    expect(roll).toContain('100% { transform: translate(0px, 9.00px)');
    // At the top of the arc the dolphin is where it is drawn: the back and the fin above the
    // waterline, the belly (down to y 18) below it. No pose lifts it higher, so no leap.
    const lifts = [...roll.matchAll(/translate\(0px, (-?[\d.]+)px\)/g)].map(m => parseFloat(m[1]));
    expect(Math.min(...lifts)).toBe(0);
    const tilts = [...roll.matchAll(/rotate\((-?[\d.]+)deg\)/g)].map(m => Math.abs(parseFloat(m[1])));
    expect(Math.max(...tilts)).toBeLessThanOrEqual(12);
  });
});
