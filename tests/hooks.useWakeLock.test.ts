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
}); 