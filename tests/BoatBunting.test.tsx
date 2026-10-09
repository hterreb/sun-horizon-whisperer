import { render } from '@testing-library/react';
import BoatBunting from '../src/components/BoatBunting';

// National days: the pennant strings on the boats.
describe('BoatBunting', () => {
  it.each(['sailboat', 'ferry', 'fishing', 'rowboat', 'freighter'] as const)('hangs pennants on the %s, the colours in turn', (kind) => {
    const colors = ['red', 'white', 'blue'];
    const { container } = render(<svg><BoatBunting kind={kind} colors={colors} /></svg>);
    const pennants = [...container.querySelectorAll('[data-testid="bunting-pennant"]')];
    expect(pennants.length).toBeGreaterThanOrEqual(5);
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
});
