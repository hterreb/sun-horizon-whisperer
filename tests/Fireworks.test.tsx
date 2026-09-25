import React from 'react';
import { render, act } from '@testing-library/react';
import Fireworks from '../src/components/Fireworks';

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

describe('Fireworks', () => {
  it('clears pending trigger timeouts on unmount (P-4)', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    const { unmount } = render(<Fireworks trigger={true} />);
    unmount();

    // 8 fireworks are scheduled via setTimeout when triggered; all must be cleared.
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(8);

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('cancels the animation frame on unmount instead of leaking a stale id (P-4)', () => {
    vi.useFakeTimers();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const { unmount } = render(<Fireworks trigger={true} />);
    // Let the first scheduled firework land so `fireworks.length > 0` and the rAF loop starts.
    act(() => {
      vi.advanceTimersByTime(300);
    });

    unmount();

    expect(cafSpy).toHaveBeenCalled();

    rafSpy.mockRestore();
    cafSpy.mockRestore();
    vi.useRealTimers();
  });

  it('does not spawn firework bursts when reduced motion is preferred (A-2)', () => {
    const mediaSpy = mockReducedMotion(true);
    vi.useFakeTimers();

    const { container } = render(<Fireworks trigger={true} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(container.querySelectorAll('div.rounded-full').length).toBe(0);

    mediaSpy.mockRestore();
    vi.useRealTimers();
  });
});
