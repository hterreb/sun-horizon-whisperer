import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import InfoPanel, { formatTerrainDelta } from '../src/components/InfoPanel';
import { type TimeOfDay, type SunTimes } from '../src/utils/sunUtils';
import { type WeatherType } from '../src/components/CloudLayer';
import { type WeatherData } from '../src/utils/weatherUtils';

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
    moonTimes: { rise: new Date(now.setHours(20, 0, 0, 0)), set: new Date(now.setHours(7, 0, 0, 0)), alwaysUp: false, alwaysDown: false },
    nextFullMoon: new Date(now.setHours(12, 0, 0, 0)),
    nextNewMoon: new Date(now.setHours(12, 0, 0, 0)),
    sunTimes,
    nextGoldenBlueHours: null,
    location: { latitude: 0, longitude: 0, loaded: true },
    manualPlaceName: null,
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
    onLocationChange: () => {},
    onUseMyLocation: () => {},
  };

  it('renders InfoPanel root', () => {
    render(<InfoPanel {...defaultProps} />);
    // Check for the heading with the time of day label (e.g., 'Midday')
    expect(screen.getByRole('heading', { name: /midday/i })).toBeInTheDocument();
    // Or check for 'Weather Mode' section
    expect(screen.getByText(/weather mode/i)).toBeInTheDocument();
  });

  it('stays above the scene (z-30) and fits within the dynamic viewport height on mobile (ROADMAP items 1 & 2)', () => {
    const { container } = render(<InfoPanel {...defaultProps} />);
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain('z-30');
    expect(panel.className).toContain('max-h-dvh');
  });

  it('shows a frost edge below -5°C, not otherwise (ROADMAP item 10)', () => {
    const weatherAt = (temperature: number): WeatherData => ({
      temperature,
      weatherType: 'snow',
      weatherDescription: 'Snow',
      lastUpdated: new Date(),
      isRealWeather: true,
      sunsetScoreToday: null,
      sunsetScoreTomorrow: null,
      cloudCoverPercent: null,
      windSpeedKmh: null,
      windDirectionDeg: null,
    });

    const { container, rerender } = render(<InfoPanel {...defaultProps} weatherData={weatherAt(-6)} />);
    let panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain('shadow-[inset_0_0_22px_4px_rgba(191,219,254,0.35)');

    rerender(<InfoPanel {...defaultProps} weatherData={weatherAt(-4)} />);
    panel = container.firstChild as HTMLElement;
    expect(panel.className).not.toContain('shadow-[inset_0_0_22px_4px_rgba(191,219,254,0.35)');
  });

  it('offers all 10 weather types in the manual picker (ROADMAP item 10)', () => {
    render(<InfoPanel {...defaultProps} useRealWeather={false} />);
    for (const label of ['Clear', 'Partly', 'Cloudy', 'Overcast', 'Fog', 'Drizzle', 'Rain', 'Storm', 'Snow', 'Hail']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
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

  describe('coordinates and weather update time (ROADMAP item 25)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('hides the coordinates once a place name is known, and shows them again in the "Change location" form', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({ json: () => Promise.resolve({ city: 'Test City', countryName: 'Testland' }) })
      );
      vi.stubGlobal('fetch', fetchMock);

      render(<InfoPanel {...defaultProps} location={{ latitude: 12.3456, longitude: -65.4321, loaded: true }} />);

      await screen.findByText('Test City, Testland');
      expect(screen.queryByText(/12\.3456/)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      expect(screen.getByLabelText(/latitude/i)).toHaveValue(12.3456);
      expect(screen.getByLabelText(/longitude/i)).toHaveValue(-65.4321);
    });

    it('shows the coordinates while the place name is still loading', () => {
      // A fetch that never resolves keeps the panel in the "loading" state.
      vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

      render(<InfoPanel {...defaultProps} location={{ latitude: 12.3456, longitude: -65.4321, loaded: true }} />);
      expect(screen.getByText(/loading location/i)).toBeInTheDocument();
      expect(screen.getByText(/12\.3456.*-65\.4321/)).toBeInTheDocument();
    });

    it('shows the coordinates when the reverse geocode fails', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));

      render(<InfoPanel {...defaultProps} location={{ latitude: 12.3456, longitude: -65.4321, loaded: true }} />);

      await screen.findByText('Unknown Location');
      expect(screen.getByText(/12\.3456.*-65\.4321/)).toBeInTheDocument();
    });

    it('removes the "Updated: HH:mm" line, and keeps the "Real weather unavailable" warning and the refresh button', () => {
      const weatherData: WeatherData = {
        temperature: 10,
        weatherType: 'clear',
        weatherDescription: 'Clear',
        lastUpdated: new Date(),
        isRealWeather: false,
        sunsetScoreToday: null,
        sunsetScoreTomorrow: null,
        cloudCoverPercent: null,
        windSpeedKmh: null,
        windDirectionDeg: null,
      };
      render(<InfoPanel {...defaultProps} weatherData={weatherData} />);

      expect(screen.queryByText(/updated:/i)).not.toBeInTheDocument();
      expect(screen.getByText(/real weather unavailable/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/refresh weather/i)).toBeInTheDocument();
    });
  });

  describe('manual location (A-4)', () => {
    it('opens a labeled, pre-filled form from "Change location" and closes on Cancel', () => {
      render(<InfoPanel {...defaultProps} location={{ latitude: 12.3456, longitude: -65.4321, loaded: true }} />);

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));

      const latField = screen.getByLabelText(/latitude/i) as HTMLInputElement;
      const lonField = screen.getByLabelText(/longitude/i) as HTMLInputElement;
      expect(latField).toHaveValue(12.3456);
      expect(lonField).toHaveValue(-65.4321);
      expect(latField).toHaveFocus();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByLabelText(/latitude/i)).not.toBeInTheDocument();
    });

    it('shows an inline error for an out-of-range latitude and does not submit', () => {
      const onLocationChange = vi.fn();
      render(<InfoPanel {...defaultProps} onLocationChange={onLocationChange} />);

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '123' } });
      fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '10' } });
      fireEvent.click(screen.getByRole('button', { name: /set location/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/latitude/i);
      expect(onLocationChange).not.toHaveBeenCalled();
    });

    it('shows an inline error for an out-of-range longitude and does not submit', () => {
      const onLocationChange = vi.fn();
      render(<InfoPanel {...defaultProps} onLocationChange={onLocationChange} />);

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '10' } });
      fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '200' } });
      fireEvent.click(screen.getByRole('button', { name: /set location/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/longitude/i);
      expect(onLocationChange).not.toHaveBeenCalled();
    });

    it('submits valid coordinates and closes the form', () => {
      const onLocationChange = vi.fn();
      render(<InfoPanel {...defaultProps} onLocationChange={onLocationChange} />);

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '48.1' } });
      fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '11.6' } });
      fireEvent.click(screen.getByRole('button', { name: /set location/i }));

      expect(onLocationChange).toHaveBeenCalledWith(48.1, 11.6);
      expect(screen.queryByLabelText(/latitude/i)).not.toBeInTheDocument();
    });

    it('calls onUseMyLocation and closes the form', () => {
      const onUseMyLocation = vi.fn();
      render(<InfoPanel {...defaultProps} onUseMyLocation={onUseMyLocation} />);

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.click(screen.getByRole('button', { name: /use my location/i }));

      expect(onUseMyLocation).toHaveBeenCalledTimes(1);
      expect(screen.queryByLabelText(/latitude/i)).not.toBeInTheDocument();
    });
  });

  describe('place-name search (ROADMAP 12)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('shows the searched place name instead of fetching a reverse-geocode guess', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      render(<InfoPanel {...defaultProps} manualPlaceName="Friedrichshafen, Germany" />);

      await screen.findByText('Friedrichshafen, Germany');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('ignores queries under 2 chars, debounces by 300ms, and selecting a result sets lat/lon/name', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  name: 'Friedrichshafen',
                  admin1: 'Baden-Württemberg',
                  country: 'Germany',
                  latitude: 47.65,
                  longitude: 9.48,
                },
              ],
            }),
        })
      );
      vi.stubGlobal('fetch', fetchMock);

      const onLocationChange = vi.fn();
      // A manual place name already set means mounting doesn't also kick off the
      // unrelated reverse-geocode fetch, which would otherwise share this mock.
      render(
        <InfoPanel
          {...defaultProps}
          manualPlaceName="Somewhere Else"
          onLocationChange={onLocationChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      const searchInput = screen.getByLabelText(/search for a place/i);

      fireEvent.change(searchInput, { target: { value: 'F' } });
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(fetchMock).not.toHaveBeenCalled();

      fireEvent.change(searchInput, { target: { value: 'Friedrichshafen' } });
      expect(fetchMock).not.toHaveBeenCalled();

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), { timeout: 2000 });

      const resultOption = await screen.findByRole('option', {
        name: 'Friedrichshafen, Baden-Württemberg, Germany',
      });
      fireEvent.click(resultOption);

      expect(onLocationChange).toHaveBeenCalledWith(47.65, 9.48, 'Friedrichshafen, Baden-Württemberg, Germany');
      // Selecting a result closes the form, like submitting or "Use my location" do.
      expect(screen.queryByLabelText(/search for a place/i)).not.toBeInTheDocument();
    });

    it('shows "No results" for an empty response and an error state for a failed request', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) })
        .mockRejectedValueOnce(new Error('network down'));
      vi.stubGlobal('fetch', fetchMock);

      // Same reasoning as above: suppress the unrelated reverse-geocode fetch on mount.
      render(<InfoPanel {...defaultProps} manualPlaceName="Somewhere Else" />);
      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      const searchInput = screen.getByLabelText(/search for a place/i);

      fireEvent.change(searchInput, { target: { value: 'Nowhereville' } });
      await waitFor(() => expect(screen.getByText(/no results/i)).toBeInTheDocument(), { timeout: 2000 });

      fireEvent.change(searchInput, { target: { value: 'Errorville' } });
      await waitFor(
        () => expect(screen.getByRole('alert')).toHaveTextContent(/could not search/i),
        { timeout: 2000 }
      );
    });
  });
});

describe('InfoPanel: line of sight with terrain (ROADMAP item 13)', () => {
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
    moonTimes: {
      rise: new Date(now.setHours(20, 0, 0, 0)),
      set: new Date(now.setHours(7, 0, 0, 0)),
      alwaysUp: false,
      alwaysDown: false,
    },
    nextFullMoon: new Date(now.setHours(12, 0, 0, 0)),
    nextNewMoon: new Date(now.setHours(12, 0, 0, 0)),
    sunTimes,
    nextGoldenBlueHours: null,
    location: { latitude: 0, longitude: 0, loaded: true },
    manualPlaceName: null,
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
    onLocationChange: () => {},
    onUseMyLocation: () => {},
  };

  it('hides the terrain section when status is idle (feature disabled)', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="idle" />);
    expect(screen.queryByText(/line of sight/i)).not.toBeInTheDocument();
  });

  it('shows a loading note while the terrain profile is loading', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="loading" />);
    expect(screen.getByText(/loading terrain/i)).toBeInTheDocument();
  });

  it('shows a visible error message when the terrain profile fails to load', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="error" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/terrain unavailable/i);
  });

  it('shows the attribution and an eye-height input whenever the section is visible', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="loading" />);
    expect(screen.getByText(/Mapzen \/ AWS Terrain Tiles/)).toBeInTheDocument();
    expect(screen.getByLabelText(/eye height/i)).toBeInTheDocument();
  });

  it('calls onEyeHeightChange when the eye-height input changes', () => {
    const onEyeHeightChange = vi.fn();
    render(
      <InfoPanel
        {...defaultProps}
        terrainStatus="loading"
        eyeHeightMeters={1.7}
        onEyeHeightChange={onEyeHeightChange}
      />
    );
    fireEvent.change(screen.getByLabelText(/eye height/i), { target: { value: '12' } });
    expect(onEyeHeightChange).toHaveBeenCalledWith(12);
  });

  it('shows terrain-adjusted sunrise/sunset next to the astronomical times when ready', () => {
    render(
      <InfoPanel
        {...defaultProps}
        terrainStatus="ready"
        terrainSunTimes={{
          sunrise: new Date(sunTimes.sunrise.getTime() + 23 * 60000),
          sunset: new Date(sunTimes.sunset.getTime() - 23 * 60000),
        }}
      />
    );
    expect(screen.getByText(/behind terrain .* \(\+23 min\)/)).toBeInTheDocument();
    expect(screen.getByText(/behind terrain .* \(-23 min\)/)).toBeInTheDocument();
  });

  it('shows "sun stays behind terrain" when the sun never clears the terrain that day', () => {
    render(
      <InfoPanel {...defaultProps} terrainStatus="ready" terrainSunTimes={{ sunrise: null, sunset: null }} />
    );
    expect(screen.getAllByText(/sun stays behind terrain/i)).toHaveLength(2);
  });

  it('shows terrain-adjusted moonrise/moonset when ready and the moon is visible', () => {
    render(
      <InfoPanel
        {...defaultProps}
        terrainStatus="ready"
        terrainSunTimes={{ sunrise: sunTimes.sunrise, sunset: sunTimes.sunset }}
        terrainMoonTimes={{
          rise: new Date(defaultProps.moonTimes.rise.getTime() + 10 * 60000),
          set: null,
        }}
      />
    );
    expect(screen.getByText(/behind terrain .* \(\+10 min\)/)).toBeInTheDocument();
    expect(screen.getByText(/moon stays behind terrain/i)).toBeInTheDocument();
  });
});

describe('formatTerrainDelta (ROADMAP item 13)', () => {
  const astronomical = new Date(2026, 0, 1, 18, 0, 0);

  it('formats a later terrain time with a positive sign', () => {
    const terrain = new Date(astronomical.getTime() + 23 * 60000);
    const result = formatTerrainDelta('sun', terrain, astronomical);
    expect(result).toContain('behind terrain');
    expect(result).toContain('(+23 min)');
  });

  it('formats an earlier terrain time with a negative sign', () => {
    const terrain = new Date(astronomical.getTime() - 23 * 60000);
    expect(formatTerrainDelta('sun', terrain, astronomical)).toContain('(-23 min)');
  });

  it('falls back to the "stays behind terrain" message when the body never clears the terrain', () => {
    expect(formatTerrainDelta('sun', null, astronomical)).toBe('sun stays behind terrain');
    expect(formatTerrainDelta('moon', null, astronomical)).toBe('moon stays behind terrain');
  });

  it('falls back to an em dash when the astronomical time itself is unknown', () => {
    expect(formatTerrainDelta('moon', null, null)).toBe('—');
  });
});
