import React from 'react';
import { render, act } from '@testing-library/react';
import Fireworks from '../src/components/Fireworks';

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
});
