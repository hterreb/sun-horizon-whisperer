import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

  // Item 123: a double tap on a band opens the aurora card.
  it('takes double taps on its bands with onInfo, and none without', () => {
    const onInfo = vi.fn();
    const { rerender } = render(<Aurora opacity={1} onInfo={onInfo} />);
    const band = screen.getAllByTestId('aurora-band')[1];
    expect(band.className).toContain('pointer-events-auto');
    fireEvent.click(band, { detail: 1 });
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(band, { detail: 2 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'aurora' }, expect.anything(), 'egg-aurora');
    rerender(<Aurora opacity={1} />);
    expect(screen.getAllByTestId('aurora-band')[1].className).not.toContain('pointer-events-auto');
  });
});
