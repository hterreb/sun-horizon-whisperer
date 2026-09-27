import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { useCompassHeading } from '../src/hooks/useCompassHeading';

// Dispatches a device-orientation-ish event on window with the given extra fields
// (alpha/absolute/webkitCompassHeading), the same shape a real DeviceOrientationEvent
// carries.
const dispatchOrientationEvent = (
  type: 'deviceorientationabsolute' | 'deviceorientation',
  fields: Record<string, unknown>
) => {
  const event = Object.assign(new Event(type), fields);
  window.dispatchEvent(event);
};

describe('useCompassHeading', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'DeviceOrientationEvent');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'DeviceOrientationEvent', originalDescriptor);
    } else {
      Reflect.deleteProperty(window, 'DeviceOrientationEvent');
    }
    vi.useRealTimers();
  });

  it('is unsupported when the device has no DeviceOrientationEvent at all', () => {
    Reflect.deleteProperty(window, 'DeviceOrientationEvent');
    const { result } = renderHook(() => useCompassHeading());
    expect(result.current.status).toBe('unsupported');
  });

  it('Android-style: no permission gate, becomes active on the first absolute event', async () => {
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: function DeviceOrientationEvent() {},
      configurable: true,
    });
    const { result } = renderHook(() => useCompassHeading());
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.enable();
    });
    expect(result.current.status).toBe('requesting');

    act(() => {
      dispatchOrientationEvent('deviceorientationabsolute', { alpha: 90, absolute: true });
    });

    expect(result.current.status).toBe('active');
    expect(result.current.heading).toBeCloseTo(270); // 360 - alpha
  });

  it('iOS path: requests permission and, once granted, reads webkitCompassHeading', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: Object.assign(function DeviceOrientationEvent() {}, { requestPermission }),
      configurable: true,
    });
    const { result } = renderHook(() => useCompassHeading());

    await act(async () => {
      await result.current.enable();
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);

    act(() => {
      // iOS never fires deviceorientationabsolute; webkitCompassHeading rides on the
      // plain deviceorientation event instead.
      dispatchOrientationEvent('deviceorientation', { alpha: 12, absolute: false, webkitCompassHeading: 123 });
    });

    expect(result.current.status).toBe('active');
    expect(result.current.heading).toBeCloseTo(123);
  });

  it('permission denied -> unavailable, and no listener is left attached', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied');
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: Object.assign(function DeviceOrientationEvent() {}, { requestPermission }),
      configurable: true,
    });
    const { result } = renderHook(() => useCompassHeading());

    await act(async () => {
      await result.current.enable();
    });
    expect(result.current.status).toBe('unavailable');

    act(() => {
      dispatchOrientationEvent('deviceorientation', { alpha: 12, absolute: false, webkitCompassHeading: 123 });
    });
    // Denied permission means no subscription was ever made - status stays unavailable.
    expect(result.current.status).toBe('unavailable');
    expect(result.current.heading).toBeNull();
  });

  it('no event within ~2s falls back to unavailable', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: function DeviceOrientationEvent() {},
      configurable: true,
    });
    const { result } = renderHook(() => useCompassHeading());

    await act(async () => {
      await result.current.enable();
    });
    expect(result.current.status).toBe('requesting');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.status).toBe('unavailable');
  });

  it('disable() stops listening and returns to idle (not unavailable)', async () => {
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: function DeviceOrientationEvent() {},
      configurable: true,
    });
    const { result } = renderHook(() => useCompassHeading());

    await act(async () => {
      await result.current.enable();
    });
    act(() => {
      dispatchOrientationEvent('deviceorientationabsolute', { alpha: 0, absolute: true });
    });
    expect(result.current.status).toBe('active');

    act(() => {
      result.current.disable();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.heading).toBeNull();

    // A further event should be ignored - the listener was removed.
    act(() => {
      dispatchOrientationEvent('deviceorientationabsolute', { alpha: 10, absolute: true });
    });
    expect(result.current.status).toBe('idle');
  });
});
