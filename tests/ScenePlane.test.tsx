import { render } from '@testing-library/react';
import ScenePlane, { PLANE_ASPECT } from '../src/components/ScenePlane';

// ROADMAP item 96: the airliner far up, a silhouette by day and only its lights at night.
describe('ScenePlane', () => {
  it('draws the silhouette by day, at its width and aspect', () => {
    const { container } = render(<ScenePlane width={18} />);
    const svg = container.querySelector('[data-testid="scene-plane"]')!;
    expect(svg.getAttribute('width')).toBe('18');
    expect(Number(svg.getAttribute('height'))).toBeCloseTo(18 * PLANE_ASPECT);
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(svg.querySelector('[data-testid="plane-strobe"]')).toBeNull();
  });

  it('shows only the lights at night: the strobe once every 2 s and one steady wing light', () => {
    const { container } = render(<ScenePlane width={18} lights="green" />);
    expect(container.querySelectorAll('path')).toHaveLength(0);
    expect(container.querySelector<SVGElement>('[data-testid="plane-strobe"]')!.style.animation).toBe('planeStrobe 2s linear infinite');
    const wing = container.querySelector('[data-testid="plane-wing-light"]')!;
    expect(wing.getAttribute('fill')).toBe('hsl(var(--scene-plane-green))');
    expect((wing as SVGElement).style.animation).toBe('');
  });

  // Item 143: the live radar's view from below, for a steep way across the screen.
  it('draws the underside by day in a square box: fuselage, both wings, tailplane, engines', () => {
    const { container } = render(<ScenePlane width={18} view="under" />);
    const svg = container.querySelector('[data-testid="scene-plane-under"]')!;
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('18');
    expect(svg.getAttribute('viewBox')).toBe('0 0 40 40');
    expect(svg.querySelectorAll('path')).toHaveLength(7);
    expect(container.querySelector('[data-testid="scene-plane"]')).toBeNull();
  });

  it('shows from below at night the red and green wingtip lights, red on the right of the nose, and two strobes', () => {
    const { container } = render(<ScenePlane width={18} lights="green" view="under" strobeOn />);
    expect(container.querySelectorAll('path')).toHaveLength(0);
    const tips = [...container.querySelectorAll<SVGElement>('[data-testid="plane-tip-light"]')];
    const at = (colour: string) => {
      const tip = tips.find(t => t.getAttribute('fill') === `hsl(var(--scene-plane-${colour}))`)!;
      return { x: Number(tip.getAttribute('cx')), y: Number(tip.getAttribute('cy')) };
    };
    // The art's nose points right (+x) from the centre (20, 20). Turned so the nose points up
    // (rotate -90°, y down), a point (x, y) goes to (20 + (y - 20), 20 - (x - 20)).
    const noseUp = ({ x, y }: { x: number; y: number }) => ({ x: 20 + (y - 20), y: 20 - (x - 20) });
    expect(noseUp(at('red')).x).toBeGreaterThan(30); // the left wing, seen from below: on the right
    expect(noseUp(at('green')).x).toBeLessThan(10);
    const strobes = container.querySelectorAll<SVGElement>('[data-testid="plane-tip-strobe"]');
    expect(strobes).toHaveLength(2);
    expect([...strobes].map(s => s.style.opacity)).toEqual(['1', '1']);
    expect([...strobes].map(s => s.getAttribute('cy')).sort()).toEqual([String(at('red').y), String(at('green').y)].sort());
  });
});
