import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import InfoPanel, { formatTerrainDelta } from '../src/components/InfoPanel';
import { type TimeOfDay, type SunTimes, type NextGoldenBlueHours } from '../src/utils/sunUtils';
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

  it('shows the sunrise and sunset of the pass the arc draws, not today\'s past ones (AUDIT C-17)', () => {
    const tomorrowAt = (h: number, m: number) => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(h, m, 0, 0);
      return d;
    };
    render(<InfoPanel {...defaultProps} passSunTimes={{ sunrise: tomorrowAt(7, 18), sunset: tomorrowAt(19, 7) }} />);
    expect(screen.getByText('07:18')).toBeInTheDocument();
    expect(screen.getByText('19:07')).toBeInTheDocument();
    expect(screen.queryByText('06:00')).not.toBeInTheDocument();
  });

  it('stays above the scene (z-30) and fits within the dynamic viewport height on mobile (ROADMAP items 1 & 2)', () => {
    const { container } = render(<InfoPanel {...defaultProps} />);
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain('z-30');
    expect(panel.className).toContain('max-h-dvh');
  });

  it('shows the frost edge and crystals below -5°C, not otherwise (ROADMAP items 10 & 49)', () => {
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
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain('shadow-[inset_0_0_6px_3px');
    expect(screen.getByTestId('panel-frost')).toBeInTheDocument();

    rerender(<InfoPanel {...defaultProps} weatherData={weatherAt(-4)} />);
    expect(panel.className).not.toContain('shadow-[inset_0_0_6px_3px');
    expect(screen.queryByTestId('panel-frost')).not.toBeInTheDocument();
  });

  it('shows "Change location" only while the panel is expanded (ROADMAP item 47)', () => {
    render(<InfoPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /change location/i })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/collapse info panel/i));
    expect(screen.queryByRole('button', { name: /change location/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /midday/i })).toBeInTheDocument();
  });

  describe('initial collapsed state by window width (ROADMAP item 55)', () => {
    const initialWidth = window.innerWidth;
    const setWidth = (width: number) =>
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
    afterEach(() => setWidth(initialWidth));

    it('starts collapsed at 390 px', () => {
      setWidth(390);
      render(<InfoPanel {...defaultProps} />);
      expect(screen.getByLabelText('Expand info panel')).toBeInTheDocument();
    });

    it('starts expanded at 1280 px', () => {
      setWidth(1280);
      render(<InfoPanel {...defaultProps} />);
      expect(screen.getByLabelText('Collapse info panel')).toBeInTheDocument();
    });
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

  describe('time travel in the Current Time row (ROADMAP item 44)', () => {
    const at1842 = new Date(2026, 9, 3, 18, 42, 7);

    it('shows the live clock with seconds, the play controls and the gold plus', () => {
      render(<InfoPanel {...defaultProps} currentTime={at1842} />);
      expect(screen.getByTitle('Set date and time')).toHaveTextContent('18:42:07');
      expect(screen.getByRole('button', { name: 'Play time backward' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Play time forward' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Current Time').querySelector('[data-testid="premium-badge"]')).toBeInTheDocument();
    });

    it('in a preview, shows the date and time, labelled "Time" (not "Current Time")', () => {
      render(<InfoPanel {...defaultProps} currentTime={at1842} isTimePreview />);
      expect(screen.getByTitle('Set date and time')).toHaveTextContent('Oct 3, 18:42');
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.queryByText('Current Time')).not.toBeInTheDocument();
    });

    it('hands a tap on play to onTimePlay, and marks the playing direction', () => {
      const onTimePlay = vi.fn();
      render(<InfoPanel {...defaultProps} timePlayDirection={1} onTimePlay={onTimePlay} />);
      expect(screen.getByRole('button', { name: 'Play time forward' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Play time backward' }));
      fireEvent.click(screen.getByRole('button', { name: 'Play time forward' }));
      expect(onTimePlay.mock.calls).toEqual([[-1], [1]]);
    });

    it('a tap on the time opens a datetime-local input that jumps to the chosen time', () => {
      const onTimeJump = vi.fn();
      render(<InfoPanel {...defaultProps} currentTime={at1842} onTimeJump={onTimeJump} />);
      fireEvent.click(screen.getByTitle('Set date and time'));
      const input = screen.getByLabelText('Set date and time');
      expect(input).toHaveAttribute('type', 'datetime-local');
      expect(input).toHaveValue('2026-10-03T18:42');
      fireEvent.change(input, { target: { value: '2026-12-24T17:00' } });
      expect(onTimeJump).toHaveBeenCalledWith(new Date(2026, 11, 24, 17, 0));
      fireEvent.blur(input);
      expect(screen.queryByLabelText('Set date and time')).not.toBeInTheDocument();
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

describe('InfoPanel: Golden & Blue Hour after Moon Information, collapsed by default (ROADMAP item 24)', () => {
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
  const nextGoldenBlueHours: NextGoldenBlueHours = {
    part: 'evening',
    day: 'today',
    golden: { start: new Date(now.setHours(17, 0, 0, 0)), end: new Date(now.setHours(18, 0, 0, 0)) },
    blue: { start: new Date(now.setHours(18, 0, 0, 0)), end: new Date(now.setHours(18, 30, 0, 0)) },
  };
  const defaultProps = {
    sunPosition: { azimuth: 0, altitude: 0 },
    moonPosition: { azimuth: 0, altitude: 0, phase: 0, illumination: 0, visible: true },
    moonTimes: { rise: new Date(now.setHours(20, 0, 0, 0)), set: new Date(now.setHours(7, 0, 0, 0)), alwaysUp: false, alwaysDown: false },
    nextFullMoon: new Date(now.setHours(12, 0, 0, 0)),
    nextNewMoon: new Date(now.setHours(12, 0, 0, 0)),
    sunTimes,
    nextGoldenBlueHours,
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

  it('renders the section after Moon Information and before the twilight times, collapsed at start', () => {
    const { container } = render(<InfoPanel {...defaultProps} />);

    const text = container.textContent ?? '';
    const moonIndex = text.indexOf('Moon Information');
    const goldenBlueIndex = text.indexOf('Golden & Blue Hour');
    // "Upcoming Dawn/Dusk Times" - whichever applies at this currentTime/sunTimes.
    const twilightIndex = text.indexOf('Upcoming');
    expect(moonIndex).toBeGreaterThan(-1);
    expect(goldenBlueIndex).toBeGreaterThan(moonIndex);
    expect(twilightIndex).toBeGreaterThan(goldenBlueIndex);

    // The heading stays visible while collapsed, with no part-of-day tag line (ROADMAP
    // item 33); the part of the day and the windows below it are hidden via the same
    // max-h-0/opacity-0 CSS transition as the Moon Information and Twilight sections
    // use, not by unmounting.
    expect(screen.getByRole('heading', { name: 'Golden & Blue Hour' })).toBeInTheDocument();
    expect(screen.getByLabelText(/expand golden & blue hour/i)).toHaveAttribute('aria-expanded', 'false');
    const collapsibleBody = screen.getByText(/golden hour:/i).closest('.transition-all');
    expect(collapsibleBody?.className).toContain('max-h-0');
    expect(screen.getByText('This evening').closest('.transition-all')).toBe(collapsibleBody);
  });

  it('expands on click, showing the golden and blue hour windows', () => {
    render(<InfoPanel {...defaultProps} />);

    fireEvent.click(screen.getByLabelText(/expand golden & blue hour/i));

    expect(screen.getByLabelText(/collapse golden & blue hour/i)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/golden hour:/i)).toBeInTheDocument();
    expect(screen.getByText(/blue hour:/i)).toBeInTheDocument();
  });

  it('is not part of the time-of-day auto-collapse effect: a time-of-day change leaves it as the user set it', () => {
    const { rerender } = render(<InfoPanel {...defaultProps} timeOfDay={'night' as TimeOfDay} />);
    fireEvent.click(screen.getByLabelText(/expand golden & blue hour/i));
    expect(screen.getByLabelText(/collapse golden & blue hour/i)).toBeInTheDocument();

    rerender(<InfoPanel {...defaultProps} timeOfDay={'astronomical-twilight' as TimeOfDay} />);
    expect(screen.getByLabelText(/collapse golden & blue hour/i)).toBeInTheDocument();
  });
});

describe('InfoPanel: line of sight as an icon at the sun and moon rows (ROADMAP item 30)', () => {
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

  // Sun rows (Sunrise/Sunset) sit before the moon rows (Moon Information), so the
  // first "Show line of sight" button is always the sun one, and the second (when
  // present) the moon one.
  const getSunLineOfSightButton = () => screen.getAllByRole('button', { name: /show line of sight/i })[0];
  const getMoonLineOfSightButton = () => screen.getAllByRole('button', { name: /show line of sight/i })[1];

  it('shows no Line of Sight section, and no icon buttons, when status is idle (feature disabled)', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="idle" />);
    expect(screen.queryByText(/line of sight/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show line of sight/i })).not.toBeInTheDocument();
  });

  it('shows a Mountain icon button at the sun rows, and one at the moon rows, closed by default', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="ready" />);
    const buttons = screen.getAllByRole('button', { name: /show line of sight/i });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-expanded', 'false');
    }
    expect(screen.queryByText(/loading terrain/i)).not.toBeInTheDocument();
  });

  it('opens the sun details on click, independently of the moon details', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="loading" />);

    fireEvent.click(getSunLineOfSightButton());
    expect(getSunLineOfSightButton()).toHaveAttribute('aria-expanded', 'true');
    expect(getMoonLineOfSightButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/loading terrain/i)).toBeInTheDocument();
  });

  it('opens the moon details on click, independently of the sun details', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="error" />);

    fireEvent.click(getMoonLineOfSightButton());
    expect(getMoonLineOfSightButton()).toHaveAttribute('aria-expanded', 'true');
    expect(getSunLineOfSightButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('alert')).toHaveTextContent(/terrain unavailable/i);
  });

  it('shows the attribution and an eye-height input once the sun details are opened', () => {
    render(<InfoPanel {...defaultProps} terrainStatus="loading" />);
    fireEvent.click(getSunLineOfSightButton());
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
    fireEvent.click(getSunLineOfSightButton());
    fireEvent.change(screen.getByLabelText(/eye height/i), { target: { value: '12' } });
    expect(onEyeHeightChange).toHaveBeenCalledWith(12);
  });

  it('shows short terrain-adjusted sunrise/sunset values, with "behind terrain" once as a note', () => {
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
    fireEvent.click(getSunLineOfSightButton());

    expect(screen.getByText(/\(\+23 min\)/)).toBeInTheDocument();
    expect(screen.getByText(/\(-23 min\)/)).toBeInTheDocument();
    // The values themselves are short, and don't each repeat "behind terrain".
    expect(screen.queryByText(/behind terrain .*\+23 min/)).not.toBeInTheDocument();
    expect(screen.getByText(/^behind terrain$/i)).toBeInTheDocument();
  });

  it('shows "sun stays behind terrain" when the sun never clears the terrain that day', () => {
    render(
      <InfoPanel {...defaultProps} terrainStatus="ready" terrainSunTimes={{ sunrise: null, sunset: null }} />
    );
    fireEvent.click(getSunLineOfSightButton());
    expect(screen.getAllByText(/sun stays behind terrain/i)).toHaveLength(2);
  });

  it('shows terrain-adjusted moonrise/moonset when ready and the moon is visible', () => {
    render(
      <InfoPanel
        {...defaultProps}
        terrainStatus="ready"
        terrainMoonTimes={{
          rise: new Date(defaultProps.moonTimes.rise.getTime() + 10 * 60000),
          set: null,
        }}
      />
    );
    fireEvent.click(getMoonLineOfSightButton());

    expect(screen.getByText(/\(\+10 min\)/)).toBeInTheDocument();
    expect(screen.getByText(/moon stays behind terrain/i)).toBeInTheDocument();
  });

  it('marks the premium features with a gold plus (ROADMAP item 35): change location, manual weather, sunset score, line of sight', () => {
    const weatherData: WeatherData = {
      temperature: 10,
      weatherType: 'clear',
      weatherDescription: 'Clear',
      lastUpdated: new Date(),
      isRealWeather: true,
      sunsetScoreToday: { score: 7, reason: 'High cloud' },
      sunsetScoreTomorrow: null,
      cloudCoverPercent: null,
      windSpeedKmh: null,
      windDirectionDeg: null,
    };
    render(<InfoPanel {...defaultProps} weatherData={weatherData} terrainStatus="ready" />);

    const hasBadge = (el: HTMLElement) => el.querySelector('[data-testid="premium-badge"]') !== null;
    expect(hasBadge(screen.getByRole('button', { name: /change location/i }))).toBe(true);
    expect(hasBadge(screen.getByRole('button', { name: 'Manual' }))).toBe(true);
    expect(hasBadge(screen.getByText('Sunset score'))).toBe(true);
    expect(hasBadge(getSunLineOfSightButton())).toBe(true);
    expect(hasBadge(getMoonLineOfSightButton())).toBe(true);
  });
});

describe('formatTerrainDelta (ROADMAP items 13 & 30)', () => {
  const astronomical = new Date(2026, 0, 1, 18, 0, 0);

  it('formats a later terrain time with a positive sign, as a short value', () => {
    const terrain = new Date(astronomical.getTime() + 23 * 60000);
    const result = formatTerrainDelta('sun', terrain, astronomical);
    expect(result).not.toContain('behind terrain');
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
