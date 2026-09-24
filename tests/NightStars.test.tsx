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
});
