import { render } from '@testing-library/react';
import BoatBunting from '../src/components/BoatBunting';

// National days: the pennant strings on the boats.
describe('BoatBunting', () => {
  it.each(['sailboat', 'ferry', 'fishing', 'rowboat', 'freighter'] as const)('hangs pennants on the %s, the colours in turn', (kind) => {
    const colors = ['red', 'white', 'blue'];
    const { container } = render(<svg><BoatBunting kind={kind} colors={colors} /></svg>);
    const pennants = [...container.querySelectorAll('[data-testid="bunting-pennant"]')];
    expect(pennants.length).toBeGreaterThanOrEqual(2);
    pennants.forEach((p, i) => expect(p.getAttribute('fill')).toBe(colors[i % 3]));
    // Every pennant stays on the boat's 64 x 37 grid.
    for (const p of pennants) {
      const numbers = (p.getAttribute('d') ?? '').match(/-?[\d.]+/g)!.map(Number);
      for (const n of numbers) expect(n).toBeGreaterThanOrEqual(0);
      for (const n of numbers) expect(n).toBeLessThanOrEqual(64);
    }
  });

  it('is static: no animation', () => {
    const { container } = render(<svg><BoatBunting kind="sailboat" colors={['orange']} /></svg>);
    expect(container.innerHTML).not.toMatch(/animat/);
  });

  describe('Christmas lights', () => {
    afterEach(() => vi.restoreAllMocks());
    const reducedMotion = (matches: boolean) =>
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches, media: '', onchange: null, addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
      } as unknown as MediaQueryList);

    it.each(['sailboat', 'ferry', 'fishing', 'rowboat', 'freighter'] as const)('hangs warm bulbs and a gold star on the %s', (kind) => {
      const colors = ['amber', 'gold'];
      const { container } = render(<svg><BoatBunting kind={kind} colors={colors} shape="lights" /></svg>);
      const bulbs = [...container.querySelectorAll('[data-testid="christmas-bulb"]')];
      expect(bulbs.length).toBeGreaterThanOrEqual(5);
      bulbs.forEach((b, i) => expect(b.getAttribute('fill')).toBe(colors[i % 2]));
      expect(container.querySelectorAll('[data-testid="christmas-star"]')).toHaveLength(1);
      expect(container.querySelector('[data-testid="bunting-pennant"]')).toBeNull();
    });

    it('puts the star above the line\'s top end (the masthead)', () => {
      const { container } = render(<svg><BoatBunting kind="sailboat" colors={['amber']} shape="lights" /></svg>);
      const ys = (container.querySelector('[data-testid="christmas-star"]')!.getAttribute('d') ?? '').match(/-?[\d.]+/g)!.map(Number).filter((_, i) => i % 2);
      expect(Math.max(...ys)).toBeLessThan(3.5); // the sailboat's masthead is at y 3.5
    });

    it('is static by day; at night it glows and twinkles slowly (6 s)', () => {
      const { container, rerender } = render(<svg><BoatBunting kind="ferry" colors={['amber']} shape="lights" /></svg>);
      expect(container.innerHTML).not.toMatch(/animation|drop-shadow/);
      rerender(<svg><BoatBunting kind="ferry" colors={['amber']} shape="lights" lit /></svg>);
      expect(container.innerHTML).toMatch(/drop-shadow/);
      const bulb = container.querySelector('[data-testid="christmas-bulb"]') as SVGElement;
      expect(bulb.style.animation).toMatch(/xmas-twinkle 6s/);
    });

    it('does not twinkle with reduced motion, but still glows', () => {
      reducedMotion(true);
      const { container } = render(<svg><BoatBunting kind="ferry" colors={['amber']} shape="lights" lit /></svg>);
      expect(container.innerHTML).toMatch(/drop-shadow/);
      expect(container.innerHTML).not.toMatch(/animation|keyframes/);
    });
  });
});
