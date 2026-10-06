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
});
