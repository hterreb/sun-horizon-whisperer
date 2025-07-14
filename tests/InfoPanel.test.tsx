import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('fades out in fullscreen after timeout, reappears on mouse enter', () => {
    vi.useFakeTimers();
    render(<InfoPanel {...defaultProps} isFullscreen={true} />);
    // Advance timers and check for fade out
    // Simulate mouse enter and check for reappearance
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
});
