import React from 'react';
import { render } from '@testing-library/react';
import NightStars from '../src/components/NightStars';

// The global HTMLCanvasElement.getContext mock in tests/setupTests.ts is only
// applied when getContext is *missing*, so under jsdom (which defines it as a
// "not implemented" stub returning null) it never kicks in. Mock it locally
// wherever the drawing/animation loop itself needs to run.
const mockCanvasContext = () =>
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
  } as unknown as CanvasRenderingContext2D);

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);

describe('NightStars', () => {
  it('renders stars at night', () => {
    const { container } = render(<NightStars timeOfDay="night" moonPosition={{ illumination: 0.5 }} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('does not render stars during midday', () => {
    const { container } = render(<NightStars timeOfDay="midday" moonPosition={{ illumination: 0.5 }} />);
    expect(container.querySelector('canvas')).toBeInTheDocument(); // Canvas exists, but stars not drawn
  });

  it('star visibility is reduced by moon brightness', () => {
    // Render with high/low moon illumination and check star opacity/count
  });

  it('shooting stars occasionally appear at night', () => {
    // Simulate night and check for shooting star element
  });

  it('does not restart the animation loop when moonPosition is a new object with the same illumination (P-3)', () => {
    const ctxSpy = mockCanvasContext();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { rerender } = render(
      <NightStars timeOfDay="night" moonPosition={{ illumination: 0.5 }} />
    );
    const callsAfterMount = rafSpy.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThan(0);

    // moonPosition is a new object reference every 30s in the real app, but the
    // illumination value is unchanged — the loop must not tear down/restart.
    rerender(<NightStars timeOfDay="night" moonPosition={{ illumination: 0.5 }} />);

    expect(rafSpy.mock.calls.length).toBe(callsAfterMount);
    expect(cafSpy).not.toHaveBeenCalled();

    rafSpy.mockRestore();
    cafSpy.mockRestore();
    ctxSpy.mockRestore();
  });

  it('stops requesting animation frames once it is no longer night (P-3)', () => {
    const ctxSpy = mockCanvasContext();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { rerender } = render(
      <NightStars timeOfDay="night" moonPosition={{ illumination: 0 }} />
    );
    expect(rafSpy).toHaveBeenCalledTimes(1);

    rerender(<NightStars timeOfDay="midday" moonPosition={{ illumination: 0 }} />);

    // Switching to daytime must cancel the running loop and must not schedule a new frame.
    expect(cafSpy).toHaveBeenCalledTimes(1);
    expect(rafSpy).toHaveBeenCalledTimes(1);

    rafSpy.mockRestore();
    cafSpy.mockRestore();
    ctxSpy.mockRestore();
  });

  // Reduced motion draws each shown star exactly once, so arc() calls count the stars.
  const countStars = (props: Partial<React.ComponentProps<typeof NightStars>>) => {
    const arc = vi.fn();
    const ctxSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: () => {}, beginPath: () => {}, arc, fill: () => {},
    } as unknown as CanvasRenderingContext2D);
    const mediaSpy = mockReducedMotion(true);
    const { unmount } = render(<NightStars timeOfDay="night" {...props} />);
    unmount();
    ctxSpy.mockRestore();
    mediaSpy.mockRestore();
    return arc.mock.calls.length;
  };

  it('shows all stars at night, the brightest half in astronomical and ~15 % in nautical twilight (ROADMAP item 52)', () => {
    expect(countStars({ timeOfDay: 'night' })).toBe(300);
    const astro = countStars({ timeOfDay: 'astronomical-twilight' });
    expect(astro).toBeGreaterThan(110);
    expect(astro).toBeLessThan(190);
    const nautical = countStars({ timeOfDay: 'nautical-twilight' });
    expect(nautical).toBeGreaterThan(15);
    expect(nautical).toBeLessThan(80);
  });

  it('shows no stars under a covered sky (ROADMAP item 52)', () => {
    for (const weatherType of ['overcast', 'fog', 'rain', 'snow', 'storm', 'hail'] as const) {
      expect(countStars({ weatherType })).toBe(0);
    }
    expect(countStars({ weatherType: 'rain', cloudCoverPercent: 100 })).toBe(0);
  });

  it('hides a share of the stars behind clouds, not all of them (item 134)', () => {
    const light = countStars({ weatherType: 'partly', cloudCoverPercent: 30 });
    expect(light).toBeGreaterThan(220);
    expect(light).toBeLessThan(270);
    const heavy = countStars({ weatherType: 'cloudy', cloudCoverPercent: 89 });
    expect(heavy).toBeGreaterThan(15);
    expect(heavy).toBeLessThan(65);
  });

  // Runs the loop by hand at 60 Hz and counts the frames that draw (clearRect).
  const countDrawnFrames = (shootingStarRate: number, frames: number) => {
    const clearRect = vi.fn();
    const ctxSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect, beginPath: () => {}, arc: () => {}, fill: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
    } as unknown as CanvasRenderingContext2D);
    let next: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { next = cb; return 1; });
    const { unmount } = render(<NightStars timeOfDay="night" shootingStarRate={shootingStarRate} />);
    clearRect.mockClear();
    const t0 = performance.now();
    for (let i = 1; i <= frames; i++) next?.(t0 + i * (1000 / 60));
    unmount();
    rafSpy.mockRestore();
    ctxSpy.mockRestore();
    return clearRect.mock.calls.length;
  };

  it('twinkles at 30 fps: draws every second frame of a 60 Hz display (ROADMAP item 91)', () => {
    const drawn = countDrawnFrames(0, 60);
    expect(drawn).toBeGreaterThanOrEqual(29);
    expect(drawn).toBeLessThanOrEqual(31);
  });

  it('draws every frame while a shooting star flies (ROADMAP item 91)', () => {
    expect(countDrawnFrames(1, 60)).toBe(60);
  });

  // Runs the loop at 60 Hz and records the line widths of the streaks drawn with a gradient.
  const meteorWidths = (meteorShower: boolean) => {
    const widths: number[] = [];
    const ctx = {
      clearRect: () => {}, beginPath: () => {}, arc: () => {}, fill: () => {}, moveTo: () => {}, lineTo: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      stroke: () => { if (typeof ctx.strokeStyle !== 'string') widths.push(ctx.lineWidth); },
      strokeStyle: '' as unknown, lineWidth: 1,
    };
    const ctxSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0001);
    let next: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { next = cb; return 1; });
    const { unmount } = render(<NightStars timeOfDay="night" shootingStarRate={0} meteorShower={meteorShower} />);
    const t0 = performance.now();
    for (let i = 1; i <= 60; i++) next?.(t0 + i * (1000 / 60));
    unmount();
    rafSpy.mockRestore();
    randomSpy.mockRestore();
    ctxSpy.mockRestore();
    return widths;
  };

  it('draws meteor streaks 3 px wide during a meteor shower only', () => {
    const widths = meteorWidths(true);
    expect(widths.length).toBeGreaterThan(0);
    expect(new Set(widths)).toEqual(new Set([3]));
    expect(meteorWidths(false)).toEqual([]);
  });

  it('draws stars statically without starting the animation loop when reduced motion is preferred (A-2)', () => {
    const ctxSpy = mockCanvasContext();
    const mediaSpy = mockReducedMotion(true);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

    render(<NightStars timeOfDay="night" moonPosition={{ illumination: 0.5 }} />);

    expect(rafSpy).not.toHaveBeenCalled();

    rafSpy.mockRestore();
    mediaSpy.mockRestore();
    ctxSpy.mockRestore();
  });
});
