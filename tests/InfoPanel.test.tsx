import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import InfoPanel, { formatTerrainDelta } from '../src/components/InfoPanel';
import { type TimeOfDay, type SunTimes, type NextGoldenBlueHours } from '../src/utils/sunUtils';
import { type WeatherType } from '../src/components/CloudLayer';
import { type WeatherData } from '../src/utils/weatherUtils';
import { PremiumContext, type PremiumValue } from '../src/hooks/usePremium';
import { LanguageContext } from '../src/hooks/useLanguage';
import { translate } from '../src/i18n';

vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  setTag: vi.fn(),
  captureMessage: vi.fn(),
}));
import { setTag } from '@sentry/react';

const premiumValue = (overrides: Partial<PremiumValue>): PremiumValue => ({
  isPremium: false,
  isBillingAvailable: true,
  isLocked: true,
  price: null,
  buy: async () => {},
  restore: async () => {},
  requirePremium: vi.fn(),
  isDialogOpen: false,
  setDialogOpen: () => {},
  ...overrides,
});

describe('InfoPanel', () => {
  // Item 130: the place name cache must not carry over between tests.
  beforeEach(() => localStorage.clear());
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

  it('shows Moon Information, collapsed, when the moon is below the horizon', () => {
    render(<InfoPanel {...defaultProps} moonPosition={{ ...defaultProps.moonPosition, altitude: -10, visible: false }} />);
    expect(screen.getByText('Moon Information')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand moon/i })).toBeInTheDocument();
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
      conditionKey: 'condition.slightSnow',
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

  it('shows the temperature in the chosen unit, and the toggle reports the new unit', () => {
    const weather: WeatherData = {
      temperature: -3,
      weatherType: 'snow',
      conditionKey: 'condition.slightSnow',
      lastUpdated: new Date(),
      isRealWeather: true,
      sunsetScoreToday: null,
      sunsetScoreTomorrow: null,
      cloudCoverPercent: null,
      windSpeedKmh: null,
      windDirectionDeg: null,
    };
    const onUnitChange = vi.fn();
    const { rerender } = render(
      <InfoPanel {...defaultProps} weatherData={weather} temperatureUnit="C" onTemperatureUnitChange={onUnitChange} />,
    );
    expect(screen.getByText('-3°C')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '°F' }));
    expect(onUnitChange).toHaveBeenCalledWith('F');

    rerender(<InfoPanel {...defaultProps} weatherData={weather} temperatureUnit="F" onTemperatureUnitChange={onUnitChange} />);
    expect(screen.getByText('27°F')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true');
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

  it('switches strong wind on in the manual picker (ROADMAP item 73)', () => {
    const onManualWindyChange = vi.fn();
    render(<InfoPanel {...defaultProps} useRealWeather={false} onManualWindyChange={onManualWindyChange} />);
    const windy = screen.getByRole('button', { name: 'Strong wind' });
    expect(windy).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(windy);
    expect(onManualWindyChange).toHaveBeenCalledWith(true);
  });

  // More tests for collapse/expand, weather options, etc.

  it('collapses and expands sections', () => {
    render(<InfoPanel {...defaultProps} />);
    // Simulate click to collapse/expand
    // fireEvent.click(screen.getByLabelText(/collapse info panel/i));
    // Check for expanded/collapsed state
  });

  it('follows the shared fullscreen fade: hidden takes no taps, focus wakes (A-3, item 132)', () => {
    const wake = vi.fn();
    const { container, rerender } = render(<InfoPanel {...defaultProps} controls={{ isVisible: false, isTappable: false, wake }} />);
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain('opacity-0');
    expect(panel.className).toContain('pointer-events-none');

    fireEvent.focus(panel);
    expect(wake).toHaveBeenCalled();

    rerender(<InfoPanel {...defaultProps} controls={{ isVisible: true, isTappable: true, wake }} />);
    expect(panel.className).toContain('opacity-100');
    expect(panel.className).not.toContain('pointer-events-none');
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
    // A keyboard focus (:focus-visible) opens it.
    const matches = civilButton.matches.bind(civilButton);
    civilButton.matches = (selector: string) => selector === ':focus-visible' || matches(selector);
    fireEvent.focus(civilButton);
    expect(civilButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('a tap on a twilight label opens its degrees, though the tap also focuses it (item 176)', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    render(<InfoPanel {...defaultProps} currentTime={noon} />);
    const civilButton = screen.getByRole('button', { name: /civil:/i });
    // A touch: focus (not :focus-visible), the pointer events of a touch, then the click.
    fireEvent.focus(civilButton);
    fireEvent.pointerEnter(civilButton, { pointerType: 'touch' });
    fireEvent.click(civilButton);
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

  it('shows the Share button in the Sunset row, but not at polar day (ROADMAP item 68)', () => {
    const { unmount } = render(<InfoPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Share this view' })).toBeInTheDocument();
    unmount();
    render(<InfoPanel {...defaultProps} sunTimes={{ ...sunTimes, polar: 'day' }} />);
    expect(screen.queryByRole('button', { name: 'Share this view' })).not.toBeInTheDocument();
  });

  it('shows "Sun does not rise" instead of a fake time during polar night (C-5)', () => {
    render(<InfoPanel {...defaultProps} sunTimes={{ ...sunTimes, polar: 'night' }} />);
    expect(screen.getAllByText(/sun does not rise/i).length).toBeGreaterThan(0);
  });

  it('rounds coordinates to 2 decimals before sending them to BigDataCloud (S-8)', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ city: 'Test City', countryName: 'Testland' }) })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<InfoPanel {...defaultProps} location={{ latitude: 51.50735, longitude: -0.12776, loaded: true }} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('latitude=51.51');
    expect(calledUrl).toContain('longitude=-0.13');

    vi.unstubAllGlobals();
  });

  describe('country code for the national days', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('passes the country code of the reverse-geocode answer up, with no second call', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ city: 'Roma', countryName: 'Italia', countryCode: 'IT' }) })
      );
      vi.stubGlobal('fetch', fetchMock);
      const onCountryChange = vi.fn();
      render(<InfoPanel {...defaultProps} onCountryChange={onCountryChange} />);
      await waitFor(() => expect(onCountryChange).toHaveBeenCalledWith('IT'));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('passes null when the answer has no code, or the calls fail in an unmapped time zone', async () => {
      const onCountryChange = vi.fn();
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ countryName: 'Testland' }) })));
      const { unmount } = render(<InfoPanel {...defaultProps} onCountryChange={onCountryChange} />);
      await waitFor(() => expect(onCountryChange).toHaveBeenCalledWith(null));
      unmount();
      localStorage.clear();
      onCountryChange.mockClear();
      const fetchMock = vi.fn(() => Promise.reject(new Error('network down')));
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<InfoPanel {...defaultProps} onCountryChange={onCountryChange} />);
      // Item 130: one retry after 2 s, then (item 137) Photon, then the device zone (UTC in the tests: no country).
      await waitFor(() => expect(onCountryChange).toHaveBeenCalledWith(null), { timeout: 3500 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('uses the device time zone\'s country when both calls fail and nothing is cached (item 130)', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) })));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const realFormat = Intl.DateTimeFormat;
      vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(((...args: ConstructorParameters<typeof Intl.DateTimeFormat>) => {
        const format = new realFormat(...args);
        return Object.assign(format, { resolvedOptions: () => ({ ...realFormat.prototype.resolvedOptions.call(format), timeZone: 'Europe/Berlin' }) });
      }) as unknown as typeof Intl.DateTimeFormat);
      const onCountryChange = vi.fn();
      render(<InfoPanel {...defaultProps} onCountryChange={onCountryChange} />);
      await waitFor(() => expect(onCountryChange).toHaveBeenCalledWith('DE'), { timeout: 3500 });
      expect(screen.getByText('Your location')).toBeInTheDocument();
      // Item 137: Photon failed too; both failures go to Sentry as tags.
      expect(setTag).toHaveBeenCalledWith('place', 'http-429');
      expect(setTag).toHaveBeenCalledWith('place-photon', 'http-429');
      vi.restoreAllMocks();
    });

    it('shows a fresh cached place at once, with no call (item 130)', async () => {
      localStorage.setItem('place-name', JSON.stringify({ key: '40.71,-74.01', language: 'en', savedAt: Date.now(), name: 'Cached City, Testland', countryCode: 'US' }));
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const onCountryChange = vi.fn();
      render(<InfoPanel {...defaultProps} location={{ latitude: 40.7128, longitude: -74.006, loaded: true }} onCountryChange={onCountryChange} />);
      await screen.findByText('Cached City, Testland');
      expect(onCountryChange).toHaveBeenCalledWith('US');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps a stale cached place when both calls fail, and saves a new answer (item 130)', async () => {
      const stale = { key: '40.71,-74.01', language: 'en', savedAt: Date.now() - 2 * 24 * 3600 * 1000, name: 'Old City, Testland', countryCode: 'US' };
      localStorage.setItem('place-name', JSON.stringify(stale));
      const fetchMock = vi.fn(() => Promise.reject(new Error('network down')));
      vi.stubGlobal('fetch', fetchMock);
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const onCountryChange = vi.fn();
      const location = { latitude: 40.7128, longitude: -74.006, loaded: true };
      const { unmount } = render(<InfoPanel {...defaultProps} location={location} onCountryChange={onCountryChange} />);
      await screen.findByText('Old City, Testland');
      // Two BigDataCloud calls and Photon (item 137), all failed.
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3), { timeout: 3500 });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.getByText('Old City, Testland')).toBeInTheDocument();
      expect(onCountryChange).not.toHaveBeenCalledWith(null);
      unmount();

      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ city: 'New City', countryName: 'Testland', countryCode: 'US' }) })));
      render(<InfoPanel {...defaultProps} location={location} onCountryChange={onCountryChange} />);
      await screen.findByText('New City, Testland');
      expect(JSON.parse(localStorage.getItem('place-name')!)).toMatchObject({ name: 'New City, Testland', countryCode: 'US' });
      vi.restoreAllMocks();
    });

    it('passes null for a searched place (no reverse-geocode call)', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const onCountryChange = vi.fn();
      render(<InfoPanel {...defaultProps} manualPlaceName="Roma, Italia" onCountryChange={onCountryChange} />);
      await waitFor(() => expect(onCountryChange).toHaveBeenCalledWith(null));
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Photon fallback and the Sentry status (item 137)', () => {
    const banned = { ok: false, status: 400, json: () => Promise.resolve({ status: 402 }) };
    const photon = (properties: Record<string, unknown>) =>
      ({ ok: true, json: () => Promise.resolve({ features: [{ properties }] }) });
    // BigDataCloud bans the IP; Photon answers with `properties`.
    const stubBanWithPhoton = (properties: Record<string, unknown>) => {
      const fetchMock = vi.fn((url: string) => Promise.resolve(new URL(String(url)).hostname === 'photon.komoot.io' ? photon(properties) : banned));
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    };
    const osmLink = () => screen.queryByRole('link', { name: '© OpenStreetMap contributors' });
    beforeEach(() => {
      vi.mocked(setTag).mockClear();
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('tags a BigDataCloud answer ok, country-only or cached, with no attribution', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ city: 'Roma', countryName: 'Italia', countryCode: 'IT' }) })));
      const { unmount } = render(<InfoPanel {...defaultProps} />);
      await screen.findByText('Roma, Italia');
      expect(setTag).toHaveBeenCalledWith('place', 'ok');
      expect(osmLink()).not.toBeInTheDocument();
      unmount();

      // Now cached: no call.
      vi.stubGlobal('fetch', vi.fn());
      const cached = render(<InfoPanel {...defaultProps} />);
      await screen.findByText('Roma, Italia');
      expect(setTag).toHaveBeenLastCalledWith('place-photon', undefined);
      expect(setTag).toHaveBeenCalledWith('place', 'cached');
      cached.unmount();

      localStorage.clear();
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ countryName: 'Italia', countryCode: 'IT' }) })));
      render(<InfoPanel {...defaultProps} />);
      await screen.findByText('Italia');
      expect(setTag).toHaveBeenCalledWith('place', 'country-only');
    });

    it('asks Photon when both BigDataCloud calls fail, shows its name with the OSM attribution, and caches it', async () => {
      const fetchMock = stubBanWithPhoton({ city: 'Ravensburg', state: 'Baden-Württemberg', country: 'Germany', countrycode: 'DE' });
      const onCountryChange = vi.fn();
      const { unmount } = render(<InfoPanel {...defaultProps} location={{ latitude: 47.7812, longitude: 9.6123, loaded: true }} onCountryChange={onCountryChange} />);
      await screen.findByText('Ravensburg, Germany', undefined, { timeout: 3500 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(String(fetchMock.mock.calls[2][0])).toBe('https://photon.komoot.io/reverse?lat=47.78&lon=9.61&lang=en');
      expect(onCountryChange).toHaveBeenLastCalledWith('DE');
      expect(osmLink()).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
      expect(screen.queryByText(/47\.7812/)).not.toBeInTheDocument();
      expect(setTag).toHaveBeenCalledWith('place', 'http-400-402');
      expect(setTag).toHaveBeenCalledWith('place-photon', 'ok');
      unmount();

      // The cached Photon name keeps its attribution, with no new call.
      fetchMock.mockClear();
      render(<InfoPanel {...defaultProps} location={{ latitude: 47.7812, longitude: 9.6123, loaded: true }} />);
      await screen.findByText('Ravensburg, Germany');
      expect(osmLink()).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps a cached town when Photon has only the country', async () => {
      const stale = { key: '0,0', language: 'en', savedAt: Date.now() - 2 * 24 * 3600 * 1000, name: 'Old City, Testland', countryCode: 'US', hasTown: true, source: 'bigdatacloud' };
      localStorage.setItem('place-name', JSON.stringify(stale));
      const fetchMock = stubBanWithPhoton({ country: 'Testland', countrycode: 'US' });
      render(<InfoPanel {...defaultProps} />);
      await screen.findByText('Old City, Testland');
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3), { timeout: 3500 });
      await waitFor(() => expect(setTag).toHaveBeenCalledWith('place-photon', 'country-only'));
      expect(screen.getByText('Old City, Testland')).toBeInTheDocument();
      expect(osmLink()).not.toBeInTheDocument();
    });
  });

  describe('coordinates and weather update time (ROADMAP item 25)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('hides the coordinates once a place name is known, and shows them again in the "Change location" form', async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({ city: 'Test City', countryName: 'Testland' }) })
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

      await screen.findByText('Your location', undefined, { timeout: 3500 });
      expect(screen.getByText(/12\.3456.*-65\.4321/)).toBeInTheDocument();
    });

    it('removes the "Updated: HH:mm" line, and keeps the "Real weather unavailable" warning and the refresh button', () => {
      const weatherData: WeatherData = {
        temperature: 10,
        weatherType: 'clear',
        conditionKey: 'condition.clearSky',
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
      // Item 165: no fallback temperature that reads as real.
      expect(screen.queryByText('10°C')).not.toBeInTheDocument();
      expect(screen.getByText('–')).toBeInTheDocument();
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
      // Item 165: the cursor starts in the place search, not in the latitude field.
      expect(screen.getByLabelText(/search for a place/i)).toHaveFocus();

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

    it('tells SunTracker the shown place name for Santa\'s card (lookbook S7), with no second lookup', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const onPlaceName = vi.fn();

      render(<InfoPanel {...defaultProps} manualPlaceName="Friedrichshafen, Germany" onPlaceName={onPlaceName} />);

      await waitFor(() => expect(onPlaceName).toHaveBeenLastCalledWith('Friedrichshafen, Germany'));
      expect(onPlaceName).toHaveBeenCalledWith(null);
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
                  country_code: 'DE',
                  timezone: 'Europe/Berlin',
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

      // Item 169: the place's time zone comes with it.
      expect(onLocationChange).toHaveBeenCalledWith(47.65, 9.48, 'Friedrichshafen, Baden-Württemberg, Germany', 'DE', 'Europe/Berlin');
      // Selecting a result closes the form, like submitting or "Use my location" do.
      expect(screen.queryByLabelText(/search for a place/i)).not.toBeInTheDocument();
    });

    it('Enter picks the first result of the typed text, and never submits the coordinates (ROADMAP 165)', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [{ name: 'Hamburg', country: 'Germany', country_code: 'DE', latitude: 53.55, longitude: 9.99 }] }),
      })));
      const onLocationChange = vi.fn();
      render(<InfoPanel {...defaultProps} manualPlaceName="Somewhere Else" onLocationChange={onLocationChange} />);

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      const searchInput = screen.getByLabelText(/search for a place/i);
      fireEvent.change(searchInput, { target: { value: 'Hamburg' } });
      await screen.findByRole('option', { name: 'Hamburg, Germany' });
      // Results of an older text: Enter does not pick them; it waits for the results of the new text.
      fireEvent.change(searchInput, { target: { value: 'Hamburg-Altona' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      expect(onLocationChange).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/search for a place/i)).toBeInTheDocument();
      // Text changed after Enter: no pick when those results come.
      fireEvent.change(searchInput, { target: { value: 'Hamburg-Alton' } });
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(onLocationChange).not.toHaveBeenCalled();

      // Enter before the results of this text: the first result is picked when they come.
      fireEvent.change(searchInput, { target: { value: 'Hamburg' } });
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      expect(onLocationChange).not.toHaveBeenCalled();
      await waitFor(() => expect(onLocationChange).toHaveBeenCalledWith(53.55, 9.99, 'Hamburg, Germany', 'DE', undefined), { timeout: 2000 });
      expect(onLocationChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByLabelText(/search for a place/i)).not.toBeInTheDocument();
    });

    it('Enter with the results of the typed text picks the first one at once (ROADMAP 165)', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [{ name: 'Hamburg', country: 'Germany', country_code: 'DE', latitude: 53.55, longitude: 9.99 }] }),
      })));
      const onLocationChange = vi.fn();
      render(<InfoPanel {...defaultProps} manualPlaceName="Somewhere Else" onLocationChange={onLocationChange} />);

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      const searchInput = screen.getByLabelText(/search for a place/i);
      fireEvent.change(searchInput, { target: { value: 'Hamburg' } });
      await screen.findByRole('option', { name: 'Hamburg, Germany' });
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      expect(onLocationChange).toHaveBeenCalledWith(53.55, 9.99, 'Hamburg, Germany', 'DE', undefined);
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
    // The trees' land cover, CC BY 4.0 (ROADMAP item 141).
    expect(screen.getByText(/© ESA WorldCover project 2021/)).toBeInTheDocument();
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
      conditionKey: 'condition.clearSky',
      lastUpdated: new Date(),
      isRealWeather: true,
      sunsetScoreToday: { score: 7, clouds: 'score.cloudsHigh', horizon: 'score.horizonClear' },
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

  describe('Premium gate (ROADMAP item 14)', () => {
    const weatherData: WeatherData = {
      temperature: 10,
      weatherType: 'clear',
      conditionKey: 'condition.clearSky',
      lastUpdated: new Date(),
      isRealWeather: true,
      sunsetScoreToday: { score: 7, clouds: 'score.cloudsHigh', horizon: 'score.horizonClear' },
      sunsetScoreTomorrow: null,
      cloudCoverPercent: null,
      windSpeedKmh: null,
      windDirectionDeg: null,
    };

    it('while locked, every gold-plus control goes through requirePremium and the score is hidden', () => {
      const value = premiumValue({});
      const onWeatherModeToggle = vi.fn();
      const onTimePlay = vi.fn();
      render(
        <PremiumContext.Provider value={value}>
          <InfoPanel {...defaultProps} weatherData={weatherData} terrainStatus="idle" onWeatherModeToggle={onWeatherModeToggle} onTimePlay={onTimePlay} />
        </PremiumContext.Provider>
      );
      expect(screen.queryByText('7/10')).not.toBeInTheDocument();
      // Item 170: "Change location" opens for everyone; setting a place by hand is gated.
      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.click(screen.getByRole('button', { name: /set location/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Manual' }));
      fireEvent.click(screen.getByRole('button', { name: /play time forward/i }));
      fireEvent.click(screen.getByRole('button', { name: /sunset score/i }));
      // Line of sight is off while locked (status idle), but the buttons stay to open the purchase.
      fireEvent.click(getSunLineOfSightButton());
      fireEvent.click(getMoonLineOfSightButton());
      expect(value.requirePremium).toHaveBeenCalledTimes(6);
      expect(onWeatherModeToggle).not.toHaveBeenCalled();
      expect(onTimePlay).not.toHaveBeenCalled();
    });

    it('while locked, "Use my location" stays free and a place set by hand goes through requirePremium (item 170)', () => {
      const value = premiumValue({});
      const onUseMyLocation = vi.fn();
      const onLocationChange = vi.fn();
      render(
        <PremiumContext.Provider value={value}>
          <InfoPanel {...defaultProps} onUseMyLocation={onUseMyLocation} onLocationChange={onLocationChange} />
        </PremiumContext.Provider>
      );
      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '48.1' } });
      fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '11.6' } });
      fireEvent.click(screen.getByRole('button', { name: /set location/i }));
      expect(value.requirePremium).toHaveBeenCalledTimes(1);
      expect(onLocationChange).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
      expect(onUseMyLocation).toHaveBeenCalledTimes(1);
      expect(value.requirePremium).toHaveBeenCalledTimes(1);
    });

    it('has a satellite tracking switch with the gold plus (item 97), gated while locked', () => {
      const value = premiumValue({});
      const onToggle = vi.fn();
      const { rerender } = render(
        <PremiumContext.Provider value={value}>
          <InfoPanel {...defaultProps} isSatelliteTrackingOn={false} onSatelliteTrackingToggle={onToggle} />
        </PremiumContext.Provider>
      );
      const toggle = screen.getByRole('switch', { name: 'Satellite tracking' });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(toggle.parentElement?.querySelector('[data-testid="premium-badge"]')).toBeInTheDocument();
      fireEvent.click(toggle);
      expect(value.requirePremium).toHaveBeenCalledWith(onToggle);
      // Unlocked (the web, or after the purchase): the switch shows the state and toggles.
      rerender(
        <PremiumContext.Provider value={premiumValue({ isPremium: true, isLocked: false, requirePremium: (action) => action?.() })}>
          <InfoPanel {...defaultProps} isSatelliteTrackingOn onSatelliteTrackingToggle={onToggle} />
        </PremiumContext.Provider>
      );
      fireEvent.click(screen.getByRole('switch', { name: 'Satellite tracking' }));
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('switch', { name: 'Satellite tracking' })).toHaveAttribute('aria-checked', 'true');
    });

    it('has an "ISS passes" toggle next to the satellite tracking switch (item 154), with the gold plus, gated while locked', () => {
      const value = premiumValue({});
      const onToggle = vi.fn();
      const onTrackingToggle = vi.fn();
      const { rerender } = render(
        <PremiumContext.Provider value={value}>
          <InfoPanel {...defaultProps} onSunsetReminderToggle={vi.fn()} onSatelliteTrackingToggle={onTrackingToggle} onIssReminderToggle={onToggle} />
        </PremiumContext.Provider>
      );
      const button = screen.getByRole('button', { name: 'ISS passes' });
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('title', 'ISS passes: remind me 10 minutes before a visible pass (while the app is open)');
      expect(button.querySelector('[data-testid="premium-badge"]')).toBeInTheDocument();
      // Next to the tracking switch, in its row; no longer after the sunset reminder.
      expect(button.nextElementSibling).toBe(screen.getByRole('switch', { name: 'Satellite tracking' }));
      expect(button.parentElement).toHaveTextContent('Satellite tracking');
      const sunsetReminder = screen.getByRole('button', { name: 'Remind me 15 minutes before sunset (while the app is open)' });
      expect(sunsetReminder.parentElement).not.toContainElement(button);
      fireEvent.click(button);
      expect(value.requirePremium).toHaveBeenCalledWith(onToggle);
      expect(onTrackingToggle).not.toHaveBeenCalled();
      rerender(
        <PremiumContext.Provider value={premiumValue({ isPremium: true, isLocked: false, requirePremium: (action) => action?.() })}>
          <InfoPanel {...defaultProps} onSatelliteTrackingToggle={onTrackingToggle} onIssReminderToggle={onToggle} isIssReminderOn />
        </PremiumContext.Provider>
      );
      fireEvent.click(screen.getByRole('button', { name: 'ISS passes' }));
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'ISS passes' })).toHaveAttribute('aria-pressed', 'true');
      // Without the Notification API there is no toggle.
      rerender(<InfoPanel {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'ISS passes' })).not.toBeInTheDocument();
    });

    it('after a Play purchase the gold plus is gone and the score shows', () => {
      render(
        <PremiumContext.Provider value={premiumValue({ isPremium: true, isLocked: false })}>
          <InfoPanel {...defaultProps} weatherData={weatherData} terrainStatus="ready" />
        </PremiumContext.Provider>
      );
      expect(screen.queryByTestId('premium-badge')).not.toBeInTheDocument();
      expect(screen.getByText('7/10')).toBeInTheDocument();
    });

    it('turns the live planes on through requirePremium, off at once (ROADMAP item 96)', () => {
      const locked = premiumValue({});
      const onLivePlanesToggle = vi.fn();
      const { unmount } = render(
        <PremiumContext.Provider value={locked}>
          <InfoPanel {...defaultProps} weatherData={weatherData} isLivePlanesOn={false} onLivePlanesToggle={onLivePlanesToggle} />
        </PremiumContext.Provider>
      );
      const toggle = screen.getByRole('switch', { name: /live planes/i });
      expect(toggle).toHaveAttribute('aria-checked', 'false'); // off by default
      expect(screen.getByText(/rounded to about 11 km, to adsb\.lol/)).toBeInTheDocument();
      fireEvent.click(toggle);
      expect(locked.requirePremium).toHaveBeenCalledTimes(1);
      expect(onLivePlanesToggle).not.toHaveBeenCalled();
      unmount();
      const open = premiumValue({ isPremium: true, isLocked: false, requirePremium: action => action?.() });
      render(
        <PremiumContext.Provider value={open}>
          <InfoPanel {...defaultProps} weatherData={weatherData} isLivePlanesOn onLivePlanesToggle={onLivePlanesToggle} />
        </PremiumContext.Provider>
      );
      fireEvent.click(screen.getByRole('switch', { name: /live planes/i }));
      expect(onLivePlanesToggle).toHaveBeenCalledWith(false);
    });

    it('shows the radar status under the switch while it is on (item 155)', () => {
      const line = () => screen.queryByTestId('live-planes-status')?.textContent ?? null;
      const ok = { status: 'ok' as const, nearby: 27, shown: 0, compassOff: true };
      const panel = (props: Partial<React.ComponentProps<typeof InfoPanel>>) => (
        <InfoPanel {...defaultProps} weatherData={weatherData} isLivePlanesOn onLivePlanesToggle={vi.fn()} {...props} />
      );
      const { rerender } = render(panel({ liveRadarStatus: { ...ok, status: 'loading' } }));
      expect(line()).toBe('Looking for planes…');
      rerender(panel({ liveRadarStatus: ok }));
      expect(line()).toBe('27 nearby · 0 in view · the compass shows all');
      // All shown, or compass mode on (or no compass): no hint.
      rerender(panel({ liveRadarStatus: { ...ok, nearby: 2, shown: 2 } }));
      expect(line()).toBe('2 nearby · 2 in view');
      rerender(panel({ liveRadarStatus: { ...ok, shown: 5, compassOff: false } }));
      expect(line()).toBe('27 nearby · 5 in view');
      rerender(panel({ liveRadarStatus: { ...ok, status: 'error' } }));
      expect(line()).toBe('Live radar unavailable');
      // No line while the switch is off, or while the radar does not run (no status).
      rerender(panel({ liveRadarStatus: ok, isLivePlanesOn: false }));
      expect(line()).toBeNull();
      rerender(panel({ liveRadarStatus: null }));
      expect(line()).toBeNull();
    });

    // Item 164: a red icon and a refresh when a feed does not come.
    it('live planes in error: a red icon, a red line and a refresh that turns while it loads (item 164)', () => {
      const onLivePlanesRefresh = vi.fn();
      const ok = { status: 'ok' as const, nearby: 27, shown: 0, compassOff: false };
      const panel = (props: Partial<React.ComponentProps<typeof InfoPanel>>) => (
        <InfoPanel {...defaultProps} weatherData={weatherData} isLivePlanesOn onLivePlanesToggle={vi.fn()} onLivePlanesRefresh={onLivePlanesRefresh} {...props} />
      );
      const icon = () => screen.queryByRole('img', { name: 'Live radar unavailable' });
      const refresh = () => screen.queryByRole('button', { name: 'Refresh live planes' });
      const { rerender } = render(panel({ liveRadarStatus: ok }));
      expect(icon()).toBeNull();
      expect(refresh()).toBeNull();
      rerender(panel({ liveRadarStatus: { ...ok, status: 'loading' } }));
      expect(icon()).toBeNull();
      expect(refresh()).toBeNull();
      expect(screen.getByTestId('live-planes-status')).not.toHaveClass('text-red-400');

      rerender(panel({ liveRadarStatus: { ...ok, status: 'error' } }));
      expect(icon()).toHaveClass('text-red-400');
      expect(screen.getByTestId('live-planes-status')).toHaveClass('text-red-400');
      // The icon is outside the label: the switch keeps its name.
      expect(screen.getByRole('switch', { name: /live planes/i })).not.toHaveAccessibleName(/unavailable/);
      expect(refresh()).toBeEnabled();
      expect(refresh()!.querySelector('svg')).not.toHaveClass('animate-spin');
      fireEvent.click(refresh()!);
      expect(onLivePlanesRefresh).toHaveBeenCalledTimes(1);
      rerender(panel({ liveRadarStatus: { ...ok, status: 'error', refreshing: true } }));
      expect(refresh()).toBeDisabled();
      expect(refresh()!.querySelector('svg')).toHaveClass('animate-spin');

      // Switch off: no icon, no button.
      rerender(panel({ liveRadarStatus: { ...ok, status: 'error' }, isLivePlanesOn: false }));
      expect(icon()).toBeNull();
      expect(refresh()).toBeNull();
    });

    it('satellite tracking in error: the red icon, the line and the refresh; the next try disables it (item 164)', () => {
      const onSatelliteRefresh = vi.fn();
      const error = { status: 'error' as const, refreshing: false, nextTryAt: null };
      const panel = (props: Partial<React.ComponentProps<typeof InfoPanel>>) => (
        <InfoPanel {...defaultProps} isSatelliteTrackingOn onSatelliteTrackingToggle={vi.fn()} onIssReminderToggle={vi.fn()} onSatelliteRefresh={onSatelliteRefresh} {...props} />
      );
      const icon = () => screen.queryByRole('img', { name: 'Satellite data unavailable' });
      const refresh = () => screen.queryByRole('button', { name: 'Refresh satellite data' });
      const line = () => screen.queryByTestId('satellite-status');
      const { rerender } = render(panel({ satelliteStatus: { ...error, status: 'ok' } }));
      expect(icon()).toBeNull();
      expect(refresh()).toBeNull();
      expect(line()).toBeNull();
      rerender(panel({ satelliteStatus: { ...error, status: 'loading' } }));
      expect(icon()).toBeNull();
      expect(line()).toBeNull();

      rerender(panel({ satelliteStatus: error }));
      expect(icon()).toHaveClass('text-red-400');
      expect(line()).toHaveTextContent(/^Satellite data unavailable$/);
      expect(line()).toHaveClass('text-red-400');
      // Next to the switch, after the ISS passes toggle.
      expect(refresh()!.nextElementSibling).toBe(screen.getByRole('switch', { name: 'Satellite tracking' }));
      fireEvent.click(refresh()!);
      expect(onSatelliteRefresh).toHaveBeenCalledTimes(1);
      rerender(panel({ satelliteStatus: { ...error, refreshing: true } }));
      expect(refresh()).toBeDisabled();
      expect(refresh()!.querySelector('svg')).toHaveClass('animate-spin');

      // R-a: CelesTrak's wait runs: the time of the next try, and no refresh.
      const nextTryAt = new Date(2026, 9, 19, 21, 40).getTime();
      rerender(panel({ satelliteStatus: { ...error, nextTryAt } }));
      expect(line()).toHaveTextContent('Satellite data unavailable · next try at 21:40');
      expect(refresh()).toBeDisabled();
      expect(refresh()!.querySelector('svg')).not.toHaveClass('animate-spin');

      rerender(panel({ satelliteStatus: error, isSatelliteTrackingOn: false }));
      expect(icon()).toBeNull();
      expect(refresh()).toBeNull();
      expect(line()).toBeNull();
    });

    it('a red dot on the expand button of the closed panel while a feed is in error (item 164, option 6)', () => {
      const panel = (props: Partial<React.ComponentProps<typeof InfoPanel>>) => (
        <InfoPanel
          {...defaultProps}
          isLivePlanesOn
          onLivePlanesToggle={vi.fn()}
          liveRadarStatus={{ status: 'ok', nearby: 2, shown: 1, compassOff: false }}
          isSatelliteTrackingOn
          onSatelliteTrackingToggle={vi.fn()}
          satelliteStatus={{ status: 'ok', refreshing: false, nextTryAt: null }}
          {...props}
        />
      );
      const dot = () => screen.queryByTestId('panel-error-dot');
      const { rerender } = render(panel({}));
      fireEvent.click(screen.getByRole('button', { name: 'Collapse info panel' }));
      expect(dot()).toBeNull();
      rerender(panel({ liveRadarStatus: { status: 'error', nearby: 0, shown: 0, compassOff: false } }));
      expect(screen.getByRole('button', { name: 'Expand info panel' })).toContainElement(dot());
      expect(dot()).toHaveClass('bg-red-400');
      rerender(panel({ satelliteStatus: { status: 'error', refreshing: false, nextTryAt: null } }));
      expect(dot()).not.toBeNull();
      // Only while the switch is on.
      rerender(panel({ satelliteStatus: { status: 'error', refreshing: false, nextTryAt: null }, isSatelliteTrackingOn: false }));
      expect(dot()).toBeNull();
      // The open panel shows the rows instead.
      rerender(panel({ liveRadarStatus: { status: 'error', nearby: 0, shown: 0, compassOff: false } }));
      expect(dot()).not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Expand info panel' }));
      expect(dot()).toBeNull();
    });
  });
  describe('collection button (ROADMAP item 112)', () => {
    it('calls onCollectionOpen from the Collection row', () => {
      const onCollectionOpen = vi.fn();
      render(<InfoPanel {...defaultProps} onCollectionOpen={onCollectionOpen} />);
      fireEvent.click(screen.getByRole('button', { name: 'Collection' }));
      expect(onCollectionOpen).toHaveBeenCalledTimes(1);
    });

    it('shows no Collection row without onCollectionOpen', () => {
      render(<InfoPanel {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'Collection' })).toBeNull();
    });
  });

  describe('data sources (ROADMAP item 153)', () => {
    it('opens a dialog with every data source, its licence and the privacy page, from a link after Feedback', () => {
      render(<InfoPanel {...defaultProps} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Data sources' }));
      const dialog = screen.getByRole('dialog', { name: 'Data sources' });
      const href = (name: string | RegExp) => within(dialog).getByRole('link', { name }).getAttribute('href');
      // Open-Meteo twice: the weather and the place search.
      expect(within(dialog).getAllByRole('link', { name: 'Open-Meteo' })[0]).toHaveAttribute('href', 'https://open-meteo.com/');
      expect(href('© OpenStreetMap contributors')).toBe('https://www.openstreetmap.org/copyright');
      expect(href('BigDataCloud')).toBe('https://www.bigdatacloud.com/');
      expect(href('Photon')).toBe('https://photon.komoot.io/');
      expect(href('adsb.lol')).toBe('https://adsb.lol/');
      expect(href('CelesTrak')).toBe('https://celestrak.org/');
      expect(href('Mapzen / AWS Terrain Tiles')).toBe('https://github.com/tilezen/joerd/blob/master/docs/attribution.md');
      expect(href(/^© ESA WorldCover project 2021/)).toBe('https://esa-worldcover.org/');
      expect(within(dialog).getAllByRole('link', { name: 'CC BY 4.0' })).toHaveLength(3);
      expect(within(dialog).getAllByRole('link', { name: 'ODbL' })).toHaveLength(2);
      expect(href('Privacy')).toBe('/privacy/');
      expect(dialog).toHaveTextContent('Radio:FluxFM Chillhop');
      // The panel's backdrop blur would hold a fixed overlay: the dialog is a child of <body>.
      expect(dialog.closest('[data-share-hide]')).toBeNull();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
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

describe('InfoPanel: the place\'s clock (ROADMAP item 169)', () => {
  const at = new Date('2026-10-19T12:00:00Z'); // the tests run with TZ=UTC
  const props = {
    sunPosition: { azimuth: 120, altitude: 10 },
    moonPosition: { azimuth: 300, altitude: -10, phase: 0.5, illumination: 1, visible: false },
    moonTimes: { rise: null, set: null, alwaysUp: false, alwaysDown: false },
    nextFullMoon: new Date('2026-10-26T12:00:00Z'),
    nextNewMoon: new Date('2026-11-09T12:00:00Z'),
    sunTimes: {
      sunrise: new Date('2026-10-19T11:12:00Z'),
      sunset: new Date('2026-10-19T22:11:00Z'),
      solarNoon: new Date('2026-10-19T16:41:00Z'),
      dawn: new Date('2026-10-19T10:45:00Z'),
      dusk: new Date('2026-10-19T22:38:00Z'),
      nauticalDawn: new Date('2026-10-19T10:14:00Z'),
      nauticalDusk: new Date('2026-10-19T23:09:00Z'),
      astronomicalDawn: new Date('2026-10-19T09:43:00Z'),
      astronomicalDusk: new Date('2026-10-19T23:40:00Z'),
      polar: null,
    } as SunTimes,
    nextGoldenBlueHours: null,
    location: { latitude: 40.71, longitude: -74.01, loaded: true },
    manualPlaceName: 'New York, United States',
    timeOfDay: 'morning' as TimeOfDay,
    currentTime: at,
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
  const renderIn = (timeZone: string | undefined, extra: { isPlaceZoneUnknown?: boolean } = {}) =>
    render(
      <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {}, t: (key, vars) => translate('en', key, vars), timeZone }}>
        <InfoPanel {...props} {...extra} />
      </LanguageContext.Provider>
    );

  it('shows the clock in the place\'s zone and how far it is from the device', () => {
    renderIn('America/New_York');
    expect(screen.getByTestId('clock-note')).toHaveTextContent('Local time · 4 h behind you');
    expect(screen.getByTitle('Set date and time')).toHaveTextContent('08:00:00');
    // Sunrise 11:12 UTC is 07:12 in New York.
    expect(screen.getByText('07:12')).toBeInTheDocument();
  });

  it('says half hours, and "ahead" for a place east of the device', () => {
    renderIn('Asia/Kolkata');
    expect(screen.getByTestId('clock-note')).toHaveTextContent('Local time · 5 h 30 min ahead of you');
  });

  it('shows no line in the device\'s zone, and "Times in your time zone" for a place with no known zone', () => {
    const { unmount } = renderIn(undefined);
    expect(screen.queryByTestId('clock-note')).not.toBeInTheDocument();
    unmount();
    renderIn(undefined, { isPlaceZoneUnknown: true });
    expect(screen.getByTestId('clock-note')).toHaveTextContent('Times in your time zone');
  });
});

describe('InfoPanel on a phone (ROADMAP item 173)', () => {
  const width = window.innerWidth;
  beforeEach(() => {
    window.innerWidth = 390;
  });
  afterEach(() => {
    window.innerWidth = width;
    vi.restoreAllMocks();
  });
  const sunTimes = {
    sunrise: new Date('2026-10-19T05:46:00Z'), sunset: new Date('2026-10-19T16:28:00Z'), solarNoon: new Date('2026-10-19T11:07:00Z'),
    dawn: new Date('2026-10-19T05:15:00Z'), dusk: new Date('2026-10-19T16:59:00Z'), nauticalDawn: new Date('2026-10-19T04:40:00Z'),
    nauticalDusk: new Date('2026-10-19T17:34:00Z'), astronomicalDawn: new Date('2026-10-19T04:06:00Z'), astronomicalDusk: new Date('2026-10-19T18:08:00Z'), polar: null,
  } as SunTimes;
  const props = {
    sunPosition: { azimuth: 180, altitude: 30 },
    moonPosition: { azimuth: 90, altitude: -10, phase: 0.5, illumination: 1, visible: false },
    moonTimes: { rise: null, set: null, alwaysUp: false, alwaysDown: false },
    nextFullMoon: new Date('2026-10-26T12:00:00Z'),
    nextNewMoon: new Date('2026-11-09T12:00:00Z'),
    sunTimes,
    nextGoldenBlueHours: null,
    location: { latitude: 47.78, longitude: 9.61, loaded: true },
    manualPlaceName: 'Ravensburg, Germany',
    timeOfDay: 'midday' as TimeOfDay,
    currentTime: new Date('2026-10-19T12:00:00Z'),
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

  it('a tap on the empty sky beside the open panel closes it and goes no further', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    render(<div data-share-root><div data-testid="sky" /><InfoPanel {...props} /></div>);
    fireEvent.click(screen.getByRole('button', { name: /expand info panel/i }));
    expect(screen.getByRole('button', { name: /collapse info panel/i })).toBeInTheDocument();

    const pastThePanel = vi.fn();
    document.addEventListener('click', pastThePanel);
    // A tap inside the panel does not close it.
    fireEvent.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('button', { name: /collapse info panel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('sky'));
    document.removeEventListener('click', pastThePanel);
    expect(screen.getByRole('button', { name: /expand info panel/i })).toBeInTheDocument();
    expect(pastThePanel).toHaveBeenCalledTimes(1); // only the tap inside the panel
  });

  it('Back closes the open search first, then the panel', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    render(<InfoPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /expand info panel/i }));
    fireEvent.click(screen.getByRole('button', { name: /change location/i }));
    expect(screen.getByLabelText(/search for a place/i)).toBeInTheDocument();

    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(screen.queryByLabelText(/search for a place/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse info panel/i })).toBeInTheDocument();

    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(screen.getByRole('button', { name: /expand info panel/i })).toBeInTheDocument();
  });
});
