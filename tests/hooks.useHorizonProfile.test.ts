import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHorizonProfile } from '../src/hooks/useHorizonProfile';
import { loadHorizonProfile } from '../src/utils/terrainTiles';
import type { HorizonProfile } from '../src/utils/horizonUtils';

vi.mock('../src/utils/terrainTiles', () => ({
  loadHorizonProfile: vi.fn(),
  TERRAIN_ATTRIBUTION: 'Terrain: Mapzen / AWS Terrain Tiles',
}));

const fakeProfile: HorizonProfile = {
  angles: new Array(360).fill(0),
  observerElevation: 500,
  eyeHeight: 1.7,
};

describe('useHorizonProfile (ROADMAP item 13)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(loadHorizonProfile).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is idle and never loads while disabled', () => {
    const { result } = renderHook(() => useHorizonProfile(47, 9, 1.7, false));
    expect(result.current.status).toBe('idle');
    expect(result.current.profile).toBeNull();
    expect(loadHorizonProfile).not.toHaveBeenCalled();
  });

  it('goes loading -> ready after the debounce and a resolved load', async () => {
    let resolveLoad: (value: HorizonProfile) => void = () => {};
    vi.mocked(loadHorizonProfile).mockImplementation(
      () => new Promise((resolve) => { resolveLoad = resolve; })
    );

    const { result } = renderHook(() => useHorizonProfile(47, 9, 1.7, true));
    expect(result.current.status).toBe('loading');
    expect(loadHorizonProfile).not.toHaveBeenCalled(); // still debouncing

    act(() => { vi.advanceTimersByTime(500); });
    expect(loadHorizonProfile).toHaveBeenCalledTimes(1);
    expect(loadHorizonProfile).toHaveBeenCalledWith(47, 9, 1.7, expect.any(Object));

    await act(async () => {
      resolveLoad(fakeProfile);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.profile).toEqual(fakeProfile);
  });

  it('sets status to error, and keeps profile null, when the load rejects', async () => {
    vi.mocked(loadHorizonProfile).mockRejectedValue(new Error('tile fetch failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useHorizonProfile(47, 9, 1.7, true));

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.profile).toBeNull();
    errorSpy.mockRestore();
  });

  it('debounces eye-height changes: typing does not refetch on every keystroke', () => {
    vi.mocked(loadHorizonProfile).mockImplementation(() => new Promise(() => {}));
    const { rerender } = renderHook(
      ({ eyeHeight }) => useHorizonProfile(47, 9, eyeHeight, true),
      { initialProps: { eyeHeight: 1 } }
    );

    act(() => { vi.advanceTimersByTime(200); });
    rerender({ eyeHeight: 1.5 });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ eyeHeight: 1.7 }); // final value, settles after this
    act(() => { vi.advanceTimersByTime(500); });

    expect(loadHorizonProfile).toHaveBeenCalledTimes(1);
    expect(loadHorizonProfile).toHaveBeenCalledWith(47, 9, 1.7, expect.any(Object));
  });

  it('aborts an in-flight load when an input changes before it resolves', () => {
    const signals: AbortSignal[] = [];
    vi.mocked(loadHorizonProfile).mockImplementation((_lat, _lon, _eh, signal) => {
      if (signal) signals.push(signal);
      return new Promise(() => {});
    });

    const { rerender } = renderHook(
      ({ lat }) => useHorizonProfile(lat, 9, 1.7, true),
      { initialProps: { lat: 47 } }
    );
    act(() => { vi.advanceTimersByTime(500); });
    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    rerender({ lat: 48 });
    expect(signals[0].aborted).toBe(true);
  });

  it('aborts any in-flight load and goes idle when disabled mid-load', () => {
    const signals: AbortSignal[] = [];
    vi.mocked(loadHorizonProfile).mockImplementation((_lat, _lon, _eh, signal) => {
      if (signal) signals.push(signal);
      return new Promise(() => {});
    });

    const { result, rerender } = renderHook(
      ({ enabled }) => useHorizonProfile(47, 9, 1.7, enabled),
      { initialProps: { enabled: true } }
    );
    act(() => { vi.advanceTimersByTime(500); });
    expect(signals).toHaveLength(1);

    rerender({ enabled: false });
    expect(signals[0].aborted).toBe(true);
    expect(result.current.status).toBe('idle');
    expect(result.current.profile).toBeNull();
  });

  it('aborts the pending load on unmount', () => {
    const signals: AbortSignal[] = [];
    vi.mocked(loadHorizonProfile).mockImplementation((_lat, _lon, _eh, signal) => {
      if (signal) signals.push(signal);
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useHorizonProfile(47, 9, 1.7, true));
    act(() => { vi.advanceTimersByTime(500); });
    expect(signals).toHaveLength(1);

    unmount();
    expect(signals[0].aborted).toBe(true);
  });
});
