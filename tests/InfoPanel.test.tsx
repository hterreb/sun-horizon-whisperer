import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import InfoPanel from '../src/components/InfoPanel';
import { type TimeOfDay, type SunTimes } from '../src/utils/sunUtils';
import { type WeatherType } from '../src/components/CloudLayer';

describe('InfoPanel', () => {
  const now = new Date();
  const sunTimes: SunTimes = {
    sunrise: new Date(now.setHours(6, 0, 0, 0)),
    sunset: new Date(now.setHours(18, 0, 0, 0)),
    solarNoon: new Date(now.setHours(12, 0, 0, 0)),
    dawn: new Date(now.setHours(5, 30, 0, 0)),
    dusk: new Date(now.setHours(18, 30, 0, 0)),
    nauticalDawn: new Date(now.setHours(5, 0, 0, 0)),
    nauticalDusk: new Date(now.setHours(19, 0, 0, 0)),
    astronomicalDawn: new Date(now.setHours(4, 30, 0, 0)),
    astronomicalDusk: new Date(now.setHours(19, 30, 0, 0)),
    polar: null,
  };
  const defaultProps = {
    sunPosition: { azimuth: 0, altitude: 0 },
    moonPosition: { azimuth: 0, altitude: 0, phase: 0, illumination: 0, visible: true },
    sunTimes,
    location: { latitude: 0, longitude: 0, loaded: true },
    timeOfDay: 'midday' as TimeOfDay,
    currentTime: new Date(),
    weatherType: 'clear' as WeatherType,
    weatherData: null,
    isLoadingWeather: false,
    useRealWeather: true,
    isFullscreen: false,
    onWeatherChange: () => {},
    onWeatherModeToggle: () => {},
    onWeatherRefresh: () => {},
  };

  it('renders InfoPanel root', () => {
    render(<InfoPanel {...defaultProps} />);
    // Check for the heading with the time of day label (e.g., 'Midday')
    expect(screen.getByRole('heading', { name: /midday/i })).toBeInTheDocument();
    // Or check for 'Weather Mode' section
    expect(screen.getByText(/weather mode/i)).toBeInTheDocument();
  });

  // More tests for collapse/expand, weather options, etc.

  it('collapses and expands sections', () => {
    render(<InfoPanel {...defaultProps} />);
    // Simulate click to collapse/expand
    // fireEvent.click(screen.getByLabelText(/collapse info panel/i));
    // Check for expanded/collapsed state
  });

  it('fades out in fullscreen after timeout, reappears on mouse enter, focus, and touch (A-3)', () => {
    vi.useFakeTimers();
    const { container } = render(<InfoPanel {...defaultProps} isFullscreen={true} />);
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain('opacity-100');

    act(() => { vi.advanceTimersByTime(10000); });
    expect(panel.className).toContain('opacity-0');

    fireEvent.focus(panel);
    expect(panel.className).toContain('opacity-100');

    act(() => { vi.advanceTimersByTime(10000); });
    expect(panel.className).toContain('opacity-0');

    fireEvent.touchStart(panel);
    expect(panel.className).toContain('opacity-100');

    vi.useRealTimers();
  });

  it('weather options and icons are displayed and selectable', () => {
    render(<InfoPanel {...defaultProps} />);
    // fireEvent.click(screen.getByText(/rain/i));
    // Check for selection
  });

  it('twilight and sun position labels are correct for all time-of-day transitions', () => {
    // Render with different timeOfDay values and check labels
  });

  it('twilight labels are keyboard-operable buttons that expose their expanded state (A-1)', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0); // between sunrise (6:00) and sunset (18:00): "upcoming dusk" branch
    render(<InfoPanel {...defaultProps} currentTime={noon} />);

    const civilButton = screen.getByRole('button', { name: /civil:/i });
    expect(civilButton).toHaveAttribute('aria-expanded', 'false');

    // Keyboard-operable: a real <button>, not a non-focusable <span>.
    expect(civilButton.tagName).toBe('BUTTON');

    fireEvent.click(civilButton);
    expect(civilButton).toHaveAttribute('aria-expanded', 'true');
    expect(civilButton).toHaveAttribute('aria-describedby', 'twilight-degree-civil');
    expect(document.getElementById('twilight-degree-civil')).toHaveTextContent(/Sunset.*Civil/);

    // Also shows on focus, not just click/hover.
    fireEvent.click(civilButton); // collapse again
    expect(civilButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.focus(civilButton);
    expect(civilButton).toHaveAttribute('aria-expanded', 'true');
  });

  it("keeps the user's manual choice for a section across a time-of-day change, instead of re-applying the auto default (C-11)", () => {
    const { rerender } = render(<InfoPanel {...defaultProps} timeOfDay={'night' as TimeOfDay} />);
    // At night, the moon section auto-expands.
    expect(screen.getByLabelText(/collapse moon info/i)).toBeInTheDocument();

    // User manually collapses it.
    fireEvent.click(screen.getByLabelText(/collapse moon info/i));
    expect(screen.getByLabelText(/expand moon info/i)).toBeInTheDocument();

    // A time-of-day change within the "night" grouping re-runs the auto-collapse
    // effect; it must not re-expand the section the user just collapsed.
    rerender(<InfoPanel {...defaultProps} timeOfDay={'astronomical-twilight' as TimeOfDay} />);
    expect(screen.getByLabelText(/expand moon info/i)).toBeInTheDocument();
  });

  it('shows "Sun does not set" instead of a fake time during polar day (C-5)', () => {
    render(<InfoPanel {...defaultProps} sunTimes={{ ...sunTimes, polar: 'day' }} />);
    expect(screen.getAllByText(/sun does not set/i).length).toBeGreaterThan(0);
  });

  it('shows "Sun does not rise" instead of a fake time during polar night (C-5)', () => {
    render(<InfoPanel {...defaultProps} sunTimes={{ ...sunTimes, polar: 'night' }} />);
    expect(screen.getAllByText(/sun does not rise/i).length).toBeGreaterThan(0);
  });

  it('rounds coordinates to 2 decimals before sending them to BigDataCloud (S-8)', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ city: 'Test City', countryName: 'Testland' }) })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<InfoPanel {...defaultProps} location={{ latitude: 51.50735, longitude: -0.12776, loaded: true }} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('latitude=51.51');
    expect(calledUrl).toContain('longitude=-0.13');

    vi.unstubAllGlobals();
  });
});
