import { render, screen } from '@testing-library/react';
import SceneBoat from '../src/components/SceneBoat';
import { BuntingContext } from '@/hooks/useBunting';

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
