import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEverTrue } from '@/hooks/useEverTrue';

describe('useEverTrue (ROADMAP item 174)', () => {
  it('is false until the condition is true, then stays true', () => {
    const { result, rerender } = renderHook(({ on }) => useEverTrue(on), { initialProps: { on: false } });
    expect(result.current).toBe(false);
    rerender({ on: true });
    expect(result.current).toBe(true);
    rerender({ on: false });
    expect(result.current).toBe(true);
  });

  it('is true at once when the condition is true at the first render', () => {
    const { result } = renderHook(() => useEverTrue(true));
    expect(result.current).toBe(true);
  });
});
