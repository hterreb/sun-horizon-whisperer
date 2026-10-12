import { render, screen } from '@testing-library/react';
import SceneBoat from '../src/components/SceneBoat';
import { BuntingContext } from '@/hooks/useBunting';
import { type BoatKind } from '@/utils/weatherEffectsUtils';

describe('SceneBoat reflection follows the wind (ROADMAP item 79, X2)', () => {
  const reflection = (seaWindKmh?: number) => {
    const { unmount } = render(<SceneBoat kind="sailboat" tone="day" lit={false} wake={false} seaWindKmh={seaWindKmh} />);
    const el = screen.getByTestId('boat-reflection');
    const style = { opacity: el.style.opacity, height: el.style.height, css: el.getAttribute('style') ?? '' };
    unmount();
    return style;
  };

  it('is sharp in calm water and today\'s 28 % in light air or without a reading', () => {
    expect(reflection(0)).toMatchObject({ opacity: '0.42', height: '70%' });
    expect(reflection(12)).toMatchObject({ opacity: '0.28', height: '55%' });
    expect(reflection()).toMatchObject({ opacity: '0.28', height: '55%' });
  });

  it('gets fainter and striped in strong wind', () => {
    const calm = reflection(12);
    const strong = reflection(50);
    expect(Number(strong.opacity)).toBeLessThan(Number(calm.opacity));
    expect(calm.css).not.toContain('repeating-linear-gradient');
    expect(strong.css).toContain('repeating-linear-gradient');
  });
});

describe('SceneBoat: the new boats (ROADMAP item 146)', () => {
  const lights = (kind: BoatKind) => {
    const { container, unmount } = render(<SceneBoat kind={kind} tone="night" lit wake={false} />);
    const n = container.querySelectorAll('[data-testid="boat-light"]').length;
    unmount();
    return n;
  };

  it.each(['kayak', 'paddleSteamer', 'cruiseLiner', 'tallShip'] as const)('draws the %s on the 64 x 37 grid, in soft light', (kind) => {
    const { container } = render(<SceneBoat kind={kind} tone="day" lit={false} wake />);
    const boat = screen.getByTestId('scene-boat');
    expect(boat.getAttribute('data-kind')).toBe(kind);
    expect(boat.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 64 37');
    expect(boat.querySelector('path[fill^="url(#"]')).not.toBeNull();
    expect(screen.getByTestId('boat-wake')).toBeTruthy();
    expect(container.querySelector('[data-testid="boat-light"]')).toBeNull(); // no lights by day
  });

  it('has no lights on the kayak, gold windows and a mast light on the paddle steamer and the cruise liner, mast lights on the tall ship', () => {
    expect(lights('kayak')).toBe(0);
    expect(lights('paddleSteamer')).toBe(1 + 9); // the foremast and 9 windows
    expect(lights('cruiseLiner')).toBe(1 + 44); // the mast and 4 rows of windows
    expect(lights('tallShip')).toBe(3); // one on each masthead
  });

  it('gives the tall ship a light wake: fainter and shorter than the paddle steamer\'s', () => {
    const wakeOf = (kind: BoatKind) => {
      const { unmount } = render(<SceneBoat kind={kind} tone="day" lit={false} wake />);
      const wake = screen.getByTestId('boat-wake');
      const first = wake.querySelector('path')!.getAttribute('d')!;
      const out = { look: wake.getAttribute('data-wake'), opacity: wake.getAttribute('opacity'), length: Number(first.match(/h-([\d.]+)/)![1]) };
      unmount();
      return out;
    };
    const steamer = wakeOf('paddleSteamer');
    const tallShip = wakeOf('tallShip');
    expect(steamer).toEqual({ look: 'full', opacity: null, length: 34 });
    expect(tallShip.look).toBe('light');
    expect(Number(tallShip.opacity)).toBe(0.5);
    expect(tallShip.length).toBeCloseTo(34 * 0.6);
  });
});

describe('SceneBoat bunting on a national day', () => {
  it('has no bunting without a provider (the collection grid)', () => {
    render(<SceneBoat kind="sailboat" tone="day" lit={false} wake={false} />);
    expect(screen.queryByTestId('boat-bunting')).toBeNull();
  });

  it('hangs the flag colours', () => {
    render(
      <BuntingContext.Provider value={{ colors: ['hsl(var(--national-de-black))', 'hsl(var(--national-de-red))'] }}>
        <SceneBoat kind="ferry" tone="day" lit={false} wake={false} />
      </BuntingContext.Provider>
    );
    expect(screen.getByTestId('boat-bunting')).toBeTruthy();
    expect(screen.getAllByTestId('bunting-pennant')[1].getAttribute('fill')).toBe('hsl(var(--national-de-red))');
  });
  });

  it('hangs papel picado (square flags) on Día de los Muertos (item 118)', () => {
    render(
      <BuntingContext.Provider value={{ colors: ['hsl(var(--scene-festival-pastel-1))'], shape: 'picado' }}>
        <SceneBoat kind="sailboat" tone="day" lit={false} wake={false} />
      </BuntingContext.Provider>
    );
    expect(screen.getByTestId('boat-bunting').querySelectorAll('rect').length).toBeGreaterThan(2);
  });

  it('lights up on Christmas above the dimming filter, glowing at night', () => {
    const { rerender } = render(
      <BuntingContext.Provider value={{ colors: ['hsl(var(--scene-xmas-bulb-1))'], shape: 'lights' }}>
        <SceneBoat kind="fishing" tone="night" lit wake={false} />
      </BuntingContext.Provider>
    );
    const lights = screen.getByTestId('boat-bunting');
    expect(lights.getAttribute('data-shape')).toBe('lights');
    // Not in the boat's own svg, which the night filter dims.
    expect((lights.ownerSVGElement as SVGSVGElement).style.filter).toBe('');
    expect(screen.getByTestId('christmas-star')).toBeTruthy();
    expect(lights.innerHTML).toMatch(/drop-shadow/);
    rerender(
      <BuntingContext.Provider value={{ colors: ['hsl(var(--scene-xmas-bulb-1))'], shape: 'lights' }}>
        <SceneBoat kind="fishing" tone="day" lit={false} wake={false} />
      </BuntingContext.Provider>
    );
    expect(screen.getByTestId('boat-bunting').innerHTML).not.toMatch(/drop-shadow/);
});
