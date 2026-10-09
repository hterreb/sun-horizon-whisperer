import { render, screen } from '@testing-library/react';
import SceneBoat from '../src/components/SceneBoat';

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

describe('SceneBoat bunting (ROADMAP item 117, Día de los Muertos)', () => {
  it('hangs papel picado on the boats with a mast, not on the rowboat, and only when asked', () => {
    const { rerender } = render(<SceneBoat kind="sailboat" tone="day" lit={false} wake={false} />);
    expect(screen.queryByTestId('boat-bunting')).toBeNull();
    for (const kind of ['sailboat', 'ferry', 'fishing', 'freighter'] as const) {
      rerender(<SceneBoat kind={kind} tone="day" lit={false} wake={false} bunting />);
      expect(screen.getByTestId('boat-bunting').querySelectorAll('rect').length, kind).toBeGreaterThan(2);
    }
    rerender(<SceneBoat kind="rowboat" tone="day" lit={false} wake={false} bunting />);
    expect(screen.queryByTestId('boat-bunting')).toBeNull();
  });
});
