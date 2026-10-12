import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTreeCover } from '../src/hooks/useTreeCover';
import { loadTreeCover } from '../src/utils/landCover';
import type { HorizonProfile } from '../src/utils/horizonUtils';

vi.mock('../src/utils/landCover', () => ({ loadTreeCover: vi.fn() }));

const makeProfile = (): HorizonProfile => ({
  angles: new Array(360).fill(2),
  observerElevation: 400,
  eyeHeight: 1.7,
  ridgeDistances: new Array(360).fill(3000),
  ridgeHeights: new Array(360).fill(700),
});

const COVER = '1'.repeat(360);

describe('useTreeCover (ROADMAP item 141)', () => {
  beforeEach(() => {
    vi.mocked(loadTreeCover).mockReset();
  });

  it('loads nothing without a profile or while the profile is not ready', async () => {
    const { result, rerender } = renderHook(({ profile, ready }) => useTreeCover(profile, ready, 47.78, 9.61), {
      initialProps: { profile: null as HorizonProfile | null, ready: false },
    });
    rerender({ profile: makeProfile(), ready: false });
    await Promise.resolve();
    expect(result.current).toBeNull();
    expect(loadTreeCover).not.toHaveBeenCalled();
  });

  it('loads the cover and the tree code once the profile is ready', async () => {
    vi.mocked(loadTreeCover).mockResolvedValue(COVER);
    const profile = makeProfile();
    const { result } = renderHook(() => useTreeCover(profile, true, 47.78, 9.61));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(loadTreeCover).toHaveBeenCalledWith(47.78, 9.61, profile, expect.any(AbortSignal));
    expect(result.current?.cover).toBe(COVER);
    expect(typeof result.current?.lib.buildTreePath).toBe('function');
  });

  it('shows no trees of the last profile on a new one', async () => {
    vi.mocked(loadTreeCover).mockResolvedValueOnce(COVER).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ profile }) => useTreeCover(profile, true, 47.78, 9.61), {
      initialProps: { profile: makeProfile() },
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    rerender({ profile: makeProfile() });
    expect(result.current).toBeNull();
  });

  it('logs a failed load and shows no trees', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(loadTreeCover).mockRejectedValue(new Error('token fetch failed'));
    const { result } = renderHook(() => useTreeCover(makeProfile(), true, 47.78, 9.61));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Error loading tree cover:', expect.any(Error)));
    expect(result.current).toBeNull();
    error.mockRestore();
  });

  it('aborts the load on unmount', async () => {
    vi.mocked(loadTreeCover).mockReturnValue(new Promise(() => {}));
    const { unmount } = renderHook(() => useTreeCover(makeProfile(), true, 47.78, 9.61));
    await waitFor(() => expect(loadTreeCover).toHaveBeenCalled());
    const signal = vi.mocked(loadTreeCover).mock.calls[0][3] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
