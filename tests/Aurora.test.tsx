import React from 'react';
import { render, screen } from '@testing-library/react';
import Aurora from '../src/components/Aurora';

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches, media: '', onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  } as unknown as MediaQueryList);

describe('Aurora', () => {
  afterEach(() => vi.restoreAllMocks());

  it('draws drifting curtains', () => {
    render(<Aurora opacity={1} />);
    const bands = screen.getByTestId('aurora').children;
    expect(bands.length).toBe(3);
    expect(bands[0].className).toContain('animate-aurora-drift');
  });

  it('keeps the curtains still with reduced motion', () => {
    mockReducedMotion(true);
    render(<Aurora opacity={1} />);
    expect(screen.getByTestId('aurora').children[0].className).not.toContain('animate-aurora-drift');
  });

  it('draws nothing under a covered sky', () => {
    render(<Aurora opacity={0} />);
    expect(screen.queryByTestId('aurora')).toBeNull();
  });
});
