import React from 'react';
import { render } from '@testing-library/react';
import TemperatureIceberg from '../src/components/TemperatureIceberg';

describe('TemperatureIceberg', () => {
  it('uses an arbitrary-value Tailwind z-index class (C-12)', () => {
    const { container } = render(<TemperatureIceberg temperature={-5} isVisible={true} />);
    const iceberg = container.querySelector('.z-\\[6\\]');
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
});
