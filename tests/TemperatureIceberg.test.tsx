import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TemperatureIceberg, { ICEBERG_RING } from '../src/components/TemperatureIceberg';

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

  it('a double tap opens its info card; the ring shows while the card is open (item 161)', () => {
    const onInfo = vi.fn();
    const { rerender } = render(<TemperatureIceberg temperature={-5} isVisible onInfo={onInfo} />);
    const iceberg = screen.getByTestId('temperature-iceberg');
    expect(iceberg.className).toContain('pointer-events-auto');
    expect(iceberg.getAttribute('aria-hidden')).toBe('true');
    const hit = iceberg.querySelector('[data-testid="scene-hit"]')!;
    fireEvent.click(hit, { clientX: 120, clientY: 600, detail: 1 });
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(hit, { clientX: 120, clientY: 600, detail: 2 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'iceberg' }, { x: 120, y: 600 }, ICEBERG_RING);
    rerender(<TemperatureIceberg temperature={-5} isVisible onInfo={onInfo} ringOn ringTier="ultraRare" />);
    expect(iceberg.querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-ultra-rare/80');
  });

  it('takes no taps without onInfo', () => {
    render(<TemperatureIceberg temperature={-5} isVisible />);
    expect(screen.getByTestId('temperature-iceberg').className).toContain('pointer-events-none');
  });
});
