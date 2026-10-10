import React from 'react';
import { act, render, screen } from '@testing-library/react';
import Fireworks, { planShow } from '../src/components/Fireworks';

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

describe('planShow (ROADMAP item 41)', () => {
  it('plans about 14 bursts, ending with a larger one, over a show of at least 10 s', () => {
    const plan = planShow();
    expect(plan).toHaveLength(14);
    expect(plan[plan.length - 1].big).toBe(true);
    // The first rocket launches 1 s before its burst; the last sparks fade for at least 2.5 s.
    const showSeconds = plan[plan.length - 1].burstAt + 2.5 - (plan[0].burstAt - 1);
    expect(showSeconds).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].burstAt - plan[i - 1].burstAt).toBeGreaterThanOrEqual(0.6);
    }
  });
});

describe('Fireworks', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the show running when the parent re-renders with the same trigger (item 41, R1)', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { rerender } = render(<Fireworks trigger={1000} />);
    expect(rafSpy).toHaveBeenCalledTimes(1);
    rerender(<Fireworks trigger={1000} />);
    expect(cafSpy).not.toHaveBeenCalled();
  });

  it('cancels the animation frame on unmount (P-4)', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 7);
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { unmount } = render(<Fireworks trigger={1000} />);
    unmount();

    expect(cafSpy).toHaveBeenCalledWith(7);
  });

  it('does not start without a trigger', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    render(<Fireworks trigger={0} />);
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('draws nothing when reduced motion is preferred (A-2)', () => {
    mockReducedMotion(true);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

    const { container } = render(<Fireworks trigger={1000} />);

    expect(container.querySelector('canvas')).toBeNull();
    expect(rafSpy).not.toHaveBeenCalled();
  });
});

describe('Fireworks palette (national days)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('bursts in the given colours', () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { frame = cb; return 1; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const strokes = new Set<string>();
    const ctx = {
      setTransform: () => {}, clearRect: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
      set strokeStyle(value: string) { strokes.add(value); },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const palette = ['hsl(211 100% 50%)', 'hsl(0 0% 100%)', 'hsl(4 85% 57%)'];
    render(<Fireworks trigger={1000} palette={palette} />);
    // 3 s of frames: the first rockets burst after 1 s.
    for (let t = 100; t <= 3000 && frame; t += 100) {
      const run: FrameRequestCallback = frame;
      frame = null;
      run(t);
    }
    const burstColours = [...strokes].filter((c) => c !== '#fff3d1');
    expect(burstColours.length).toBeGreaterThan(0);
    for (const colour of burstColours) expect(palette).toContain(colour);
  });
});

// Item 123: the canvas never takes taps; it reports when a show runs (EventSkyTaps takes the taps).
describe('Fireworks running', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports the start and the end of a show and stays pointer-events-none', () => {
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { frame = cb; return 1; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const ctx = { setTransform: () => {}, clearRect: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {} };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const onRunningChange = vi.fn();
    const { rerender } = render(<Fireworks trigger={0} onRunningChange={onRunningChange} />);
    const canvas = () => screen.getByTestId('fireworks');
    expect(onRunningChange).toHaveBeenLastCalledWith(false);
    rerender(<Fireworks trigger={1000} onRunningChange={onRunningChange} />);
    expect(onRunningChange).toHaveBeenLastCalledWith(true);
    expect(canvas().className).toContain('pointer-events-none');
    // Run the show to its end (14 s of frames).
    act(() => {
      for (let t = 100; t <= 14000 && frame; t += 100) {
        const run: FrameRequestCallback = frame;
        frame = null;
        run(t);
      }
    });
    expect(onRunningChange).toHaveBeenLastCalledWith(false);
    expect(canvas().className).toContain('pointer-events-none');
  });
});
