import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useIsMobile } from '../src/hooks/use-mobile';

describe('useIsMobile', () => {
  it('returns true for small screens', () => {
    window.innerWidth = 400;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
  it('returns false for large screens', () => {
    window.innerWidth = 1200;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
}); 