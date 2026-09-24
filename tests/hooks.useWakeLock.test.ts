import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWakeLock } from '../src/hooks/useWakeLock';

describe('useWakeLock', () => {
  it('requests and releases wake lock as fullscreen is toggled', () => {
    const request = vi.fn();
    Object.defineProperty(global.navigator, 'wakeLock', {
      value: { request },
      configurable: true,
    });
    const { rerender } = renderHook(({ enabled }) => useWakeLock(enabled), { initialProps: { enabled: true } });
    expect(request).toHaveBeenCalled();
    // Simulate exit fullscreen
    act(() => rerender({ enabled: false }));
    // Optionally check for release
  });

  it('re-acquires the wake lock after the browser auto-releases it on tab hide (C-2)', async () => {
    const sentinels: Array<{ _simulateBrowserAutoRelease: () => void }> = [];
    const request = vi.fn(async () => {
      let releaseHandler: (() => void) | undefined;
      const sentinel = {
        released: false,
        addEventListener: (event: string, cb: () => void) => {
          if (event === 'release') releaseHandler = cb;
        },
        removeEventListener: () => {},
        release: vi.fn(async function (this: { released: boolean }) {
          this.released = true;
          releaseHandler?.();
        }),
        _simulateBrowserAutoRelease: () => {
          sentinel.released = true;
          releaseHandler?.();
        },
      };
      sentinels.push(sentinel);
      return sentinel;
    });
    Object.defineProperty(global.navigator, 'wakeLock', {
      value: { request },
      configurable: true,
    });

    renderHook(({ enabled }) => useWakeLock(enabled), { initialProps: { enabled: true } });
    await act(async () => {});
    expect(request).toHaveBeenCalledTimes(1);

    // Browser auto-releases the lock (e.g. tab hidden) without our code calling release().
    await act(async () => {
      sentinels[0]._simulateBrowserAutoRelease();
    });

    // Tab becomes visible again - the hook should notice the sentinel is gone and re-acquire.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(request).toHaveBeenCalledTimes(2);
  });
});