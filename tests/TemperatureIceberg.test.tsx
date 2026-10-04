import React from 'react';
import { render } from '@testing-library/react';
import TemperatureIceberg from '../src/components/TemperatureIceberg';

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);

describe('TemperatureIceberg', () => {
  // C-12: v3 had no z-6 and needed z-[6]; v4 generates z-6 (AUDIT D-6).
  it('uses a z-index class that Tailwind generates (C-12)', () => {
    const { container } = render(<TemperatureIceberg temperature={-5} isVisible={true} />);
    const iceberg = container.querySelector('.z-6');
    expect(iceberg).toBeInTheDocument();
  });

  it('creates the float interval only once per visibility, even as direction changes (P-4)', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    render(<TemperatureIceberg temperature={-5} isVisible={true} />);

    // Iceberg starts at x=-10 moving +0.02/tick; advancing well past the x=85
    // bounce (direction flip) would previously tear down and recreate the interval.
    vi.advanceTimersByTime(100 * 5000);

    const floatIntervalCalls = setIntervalSpy.mock.calls.filter(call => call[1] === 100);
    expect(floatIntervalCalls.length).toBe(1);

    setIntervalSpy.mockRestore();
    vi.useRealTimers();
  });

  it('stays static (no floating interval) when reduced motion is preferred (A-2)', () => {
    const mediaSpy = mockReducedMotion(true);
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    render(<TemperatureIceberg temperature={-5} isVisible={true} />);

    const floatIntervalCalls = setIntervalSpy.mock.calls.filter(call => call[1] === 100);
    expect(floatIntervalCalls.length).toBe(0);

    setIntervalSpy.mockRestore();
    mediaSpy.mockRestore();
    vi.useRealTimers();
  });
});
