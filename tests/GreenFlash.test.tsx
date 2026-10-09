import React from 'react';
import { render, screen } from '@testing-library/react';
import GreenFlash from '../src/components/GreenFlash';

describe('GreenFlash', () => {
  afterEach(() => vi.restoreAllMocks());

  it('glows once at the given point', () => {
    render(<GreenFlash x={120} y={400} />);
    const flash = screen.getByTestId('green-flash');
    expect(flash.className).toContain('animate-green-flash');
    expect(flash.style.left).toBe('120px');
    expect(flash.style.top).toBe('400px');
  });

  it('is 128x32 and sits above the sunset-time pill', () => {
    render(<GreenFlash x={120} y={400} />);
    const flash = screen.getByTestId('green-flash');
    expect(flash.style.width).toBe('128px');
    expect(flash.style.height).toBe('32px');
    // Bottom edge 36 px above the point: the set pill (22 px high, centred 22 px above
    // the horizon) ends 33 px above it.
    expect(flash.style.transform).toBe('translate(-50%, calc(-100% - 36px))');
    // Above the arc-label layer (z-9).
    expect(flash.className).toContain('z-20');
  });

  it('shows a still glow with reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, media: '', onchange: null, addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    } as unknown as MediaQueryList);
    render(<GreenFlash x={120} y={400} />);
    expect(screen.getByTestId('green-flash').className).not.toContain('animate-green-flash');
  });
});
