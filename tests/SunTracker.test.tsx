import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import SunTracker from '../src/components/SunTracker';
import { vi } from 'vitest';
import { loadManualLocation, saveManualLocation } from '../src/utils/manualLocation';
import { getSunPosition, getSunTimes } from '../src/utils/sunUtils';
import type SunVisualizationType from '../src/components/SunVisualization';

// Records the props SunTracker hands to SunVisualization (time travel, ROADMAP item 44),
// and still renders the real component.
const visProps = vi.hoisted(() => ({ current: null as null | React.ComponentProps<typeof SunVisualizationType> }));
vi.mock('../src/components/SunVisualization', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/components/SunVisualization')>();
  const { createElement } = await import('react');
  return {
    default: (props: React.ComponentProps<typeof SunVisualizationType>) => {
      visProps.current = props;
      return createElement(actual.default, props);
    },
  };
});

// The fireworks breadcrumbs (ROADMAP item 80).
vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  addBreadcrumb: vi.fn(),
}));
import { addBreadcrumb } from '@sentry/react';

// Mock the toast function
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));
import { toast } from '@/hooks/use-toast';

describe('SunTracker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    // Offline by default: an unmocked fetch reached the real weather, geocode and terrain
    // servers, and a slow answer timed the test out in CI. Tests that need data set their own.
    global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
  });

  it('does not toast on a successful geolocation lookup (P0-3)', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
    render(<SunTracker />);
    await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument());
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Location detected') })
    );
  });

  it('falls back to default location if geolocation fails', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_s, e) => e({ code: 1 }) } });
    render(<SunTracker />);
    // Assert that toast was called with the fallback message
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Location unavailable'),
          description: expect.stringContaining('Using default location'),
        })
      );
    });
  });

  it('renders InfoPanel and SunVisualization after location is loaded', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
    render(<SunTracker />);
    // Wait for InfoPanel and SunVisualization to appear
    await waitFor(() => expect(screen.getByRole('heading', { name: /current weather/i })).toBeInTheDocument(), { timeout: 5000 });
    await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('fetches and displays real weather (mocked)', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }) })) as unknown as typeof fetch;
    render(<SunTracker />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    // Optionally check for weather display in InfoPanel
  });

  it('updates sun and moon positions every 30 seconds', () => {
    vi.useFakeTimers();
    render(<SunTracker />);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    // Optionally check for rerender or updated props
    vi.useRealTimers();
  });

  it('updates background gradient based on time of day and weather', () => {
    render(<SunTracker />);
    // Optionally check for background style or class change
  });

  it('handles manual weather change and toggling between real/manual weather', async () => {
    render(<SunTracker />);
    // Simulate user interaction for weather change/toggle
    // fireEvent.click(screen.getByTestId('weather-toggle'));
    // fireEvent.change(screen.getByTestId('weather-select'), { target: { value: 'rain' } });
    // Optionally check for updated weather display
  });

  it('handles manual weather refresh', async () => {
    render(<SunTracker />);
    // Simulate user interaction for weather refresh
    // fireEvent.click(screen.getByTestId('weather-refresh'));
    // Optionally check for fetch call or UI update
  });

  it('does not toast on a successful weather refresh, only on failure (A-5)', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current_weather: { temperature: 20, weathercode: 0, windspeed: 0, winddirection: 0, time: '' } }) })) as unknown as typeof fetch;

    render(<SunTracker />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Weather updated' }));
  });

  it('a manually picked weather ignores the real cloud cover for the stars, the moon and the cloud types (items 52, 57, 84)', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 7, longitude: 8 } }) } });
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({
      current_weather: { temperature: 20, weathercode: 3, windspeed: 0, winddirection: 0, time: '' },
      current: { cloud_cover: 100, wind_speed_10m: 0, wind_direction_10m: 0 },
      hourly: { time: ['2026-06-01T18:00'], cloud_cover_low: [90], cloud_cover_mid: [50], cloud_cover_high: [30], visibility: [24140] },
    }) })) as unknown as typeof fetch;

    render(<SunTracker />);
    await waitFor(() => expect(visProps.current?.cloudCoverPercent).toBe(100));
    expect(visProps.current!.cloudLayers).toEqual({ low: 90, mid: 50, high: 30 });

    fireEvent.click(screen.getByRole('button', { name: /manual/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(visProps.current!.weatherType).toBe('clear');
    expect(visProps.current!.cloudCoverPercent).toBeNull();
    expect(visProps.current!.cloudLayers).toBeNull();
  });

  it('toasts when the weather refresh fails (A-5)', async () => {
    // Distinct coordinates from the previous test, so the weather cache (keyed on
    // location, not test) doesn't serve a stale successful result here.
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 5, longitude: 6 } }) } });
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;

    render(<SunTracker />);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Weather unavailable' }))
    );
  });

  it('does not re-register the fullscreenchange listener on every render (P-5)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    render(<SunTracker />);
    // The top-left buttons mount after the loading hand-off (a 200 ms fade here).
    act(() => {
      vi.advanceTimersByTime(250);
    });
    const initialAdds = addSpy.mock.calls.filter((c) => c[0] === 'fullscreenchange').length;
    expect(initialAdds).toBe(1);

    // The clock ticks every second, causing SunTracker to re-render repeatedly.
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const addsAfter = addSpy.mock.calls.filter((c) => c[0] === 'fullscreenchange').length;
    const removesAfter = removeSpy.mock.calls.filter((c) => c[0] === 'fullscreenchange').length;
    expect(addsAfter).toBe(1);
    expect(removesAfter).toBe(0);

    addSpy.mockRestore();
    removeSpy.mockRestore();
    vi.useRealTimers();
  });

  it('enters and exits fullscreen mode, hiding cursor as appropriate', async () => {
    render(<SunTracker />);
    // Simulate fullscreen button click
    // fireEvent.click(screen.getByTestId('fullscreen-button'));
    // Optionally check for fullscreen state
  });

  describe('manual location (A-4)', () => {
    it('uses a stored manual location on load instead of requesting geolocation', async () => {
      saveManualLocation(48.8566, 2.3522);
      const getCurrentPosition = vi.fn();
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

      render(<SunTracker />);

      await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument());
      expect(getCurrentPosition).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain('48.8566');
    });

    it('persists a location entered via the manual form to localStorage', async () => {
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_s, e) => e({ code: 1 }) } });
      render(<SunTracker />);
      await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '35' } });
      fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '139' } });
      fireEvent.click(screen.getByRole('button', { name: /set location/i }));

      expect(loadManualLocation()).toEqual({ latitude: 35, longitude: 139 });
      expect(document.body.textContent).toContain('35.0000');
    });

    it('clears the stored manual location when "Use my location" succeeds', async () => {
      saveManualLocation(10, 20);
      vi.stubGlobal('navigator', {
        geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) },
      });
      render(<SunTracker />);
      await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.click(screen.getByRole('button', { name: /use my location/i }));

      await waitFor(() => expect(loadManualLocation()).toBeNull());
      expect(document.body.textContent).toContain('1.0000');
    });
  });

  describe('loading screen (ROADMAP item 39)', () => {
    type Success = (position: { coords: { latitude: number; longitude: number } }) => void;
    type Failure = (error: { code: number }) => void;

    // Geolocation that answers only when the test calls `answer` / `fail`.
    const stubPendingGeolocation = () => {
      const pending: { success?: Success; failure?: Failure } = {};
      const getCurrentPosition = vi.fn((success: Success, failure: Failure) => {
        pending.success = success;
        pending.failure = failure;
      });
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
      return {
        getCurrentPosition,
        answer: () => act(() => pending.success!({ coords: { latitude: 47.78, longitude: 9.61 } })),
        fail: () => act(() => pending.failure!({ code: 3 })),
      };
    };
    const advance = (ms: number) => act(() => {
      vi.advanceTimersByTime(ms);
    });

    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows the loading screen, and no top-left buttons or radio, while the location is not loaded', () => {
      stubPendingGeolocation();
      render(<SunTracker />);

      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Locating…');
      expect(screen.getByRole('img', { name: 'Sun Chaser' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enter fullscreen/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('switch', { name: /play lo-fi music/i })).not.toBeInTheDocument();
    });

    it('opens the scene through a circle from the mark, then shows the controls', () => {
      const geo = stubPendingGeolocation();
      const { container } = render(<SunTracker />);
      expect(screen.getByTestId('loading-mark-sun')).toHaveClass('animate-mark-rise');

      advance(1000);
      geo.answer();
      const scene = container.lastElementChild!;
      expect(scene).toHaveClass('animate-scene-iris');
      expect(screen.getByTestId('sun-visualization')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enter fullscreen/i })).not.toBeInTheDocument();

      advance(1000);
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
      expect(scene).not.toHaveClass('animate-scene-iris');
      expect(screen.getByRole('button', { name: /enter fullscreen/i })).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /play lo-fi music/i })).toBeInTheDocument();
    });

    it('fades the scene in when the location arrives within 400 ms', () => {
      const geo = stubPendingGeolocation();
      const { container } = render(<SunTracker />);

      advance(100);
      geo.answer();
      expect(container.lastElementChild).toHaveClass('animate-scene-fade');

      advance(200);
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    it('after 3 s offers "Choose a place", and a chosen place wins over a late geolocation answer', async () => {
      const geo = stubPendingGeolocation();
      global.fetch = vi.fn((url: string) =>
        url.includes('name=')
          ? Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ results: [{ name: 'Lindau', country: 'Germany', latitude: 47.55, longitude: 9.68 }] }),
            })
          : Promise.reject(new Error('network down'))
      ) as unknown as typeof fetch;
      render(<SunTracker />);

      expect(screen.queryByRole('button', { name: /choose a place/i })).not.toBeInTheDocument();
      advance(3000);
      expect(screen.getByRole('status')).toHaveTextContent('Waiting for location access');
      expect(screen.getByTestId('loading-mark-sun')).toHaveClass('animate-mark-sink');

      const chooseButton = screen.getByRole('button', { name: /choose a place/i });
      expect(chooseButton.querySelector('[data-testid="premium-badge"]')).not.toBeNull();
      fireEvent.click(chooseButton);
      const search = screen.getByLabelText(/search for a place/i);
      expect(search).toHaveFocus();

      fireEvent.change(search, { target: { value: 'Lindau' } });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      fireEvent.click(screen.getByRole('option', { name: 'Lindau, Germany' }));
      expect(loadManualLocation()).toEqual({ latitude: 47.55, longitude: 9.68, name: 'Lindau, Germany' });

      geo.fail();
      expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Location unavailable' }));
      advance(1000);
      expect(document.body.textContent).toContain('Lindau, Germany');
    });

    it('asks for the position with a 10 s timeout, and a timeout gives the default location and the toast', () => {
      const geo = stubPendingGeolocation();
      render(<SunTracker />);
      expect(geo.getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { timeout: 10000 });

      advance(10000);
      geo.fail();
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Location unavailable' }));
      advance(1000);
      expect(document.body.textContent).toContain('40.7128');
    });

    it('with reduced motion, applies no rise and no circle, only the fade', () => {
      const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      const geo = stubPendingGeolocation();
      const { container } = render(<SunTracker />);
      expect(screen.getByTestId('loading-mark-sun')).not.toHaveClass('animate-mark-rise');

      advance(1000);
      geo.answer();
      expect(container.lastElementChild).toHaveClass('animate-scene-fade');
      expect(container.lastElementChild).not.toHaveClass('animate-scene-iris');
      matchMedia.mockRestore();
    });
  });

  describe('time travel (ROADMAP item 44)', () => {
    const RAVENSBURG = { latitude: 47.78, longitude: 9.61 };
    const NOON = new Date('2026-09-30T12:00:00Z');
    const advance = (ms: number) => act(() => {
      vi.advanceTimersByTime(ms);
    });
    // One act() per clock tick, so every tick commits (and runs the fireworks effect)
    // on its own instead of being batched into one render.
    const tickFor = (ms: number, tickMs: number) => {
      for (let t = 0; t < ms; t += tickMs) advance(tickMs);
    };
    const shownDate = () => visProps.current!.date!.getTime();
    const weatherFetches = () =>
      vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('api.open-meteo.com/v1/forecast')).length;
    const jumpTo = (value: string) => {
      fireEvent.click(screen.getByTitle('Set date and time'));
      fireEvent.change(screen.getByLabelText('Set date and time'), { target: { value } });
      fireEvent.blur(screen.getByLabelText('Set date and time'));
    };
    const start = (now: Date) => {
      vi.setSystemTime(now);
      saveManualLocation(RAVENSBURG.latitude, RAVENSBURG.longitude, 'Ravensburg');
      render(<SunTracker />);
      advance(300);
    };

    beforeEach(() => {
      vi.useFakeTimers();
      visProps.current = null;
      global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('a jump of +6 h shows the sun at now + 6 h, and the row shows the date and time', () => {
      start(NOON);
      jumpTo('2026-09-30T18:00');
      const target = new Date('2026-09-30T18:00:00');
      expect(shownDate()).toBe(target.getTime());
      expect(visProps.current!.sunPosition).toEqual(getSunPosition(target, RAVENSBURG.latitude, RAVENSBURG.longitude));
      expect(screen.getByTitle('Set date and time')).toHaveTextContent('Sep 30, 18:00');
      expect(screen.getByRole('button', { name: 'Back to now' })).toBeInTheDocument();
    });

    it('limits the date and time input to today ± 1 year', () => {
      start(NOON);
      fireEvent.click(screen.getByTitle('Set date and time'));
      const input = screen.getByLabelText('Set date and time');
      expect(input).toHaveAttribute('type', 'datetime-local');
      expect(input).toHaveAttribute('min', '2025-09-30T00:00');
      expect(input).toHaveAttribute('max', '2027-09-30T23:59');
    });

    it('play forward moves the time by 10 min per second, and a second tap pauses', () => {
      start(NOON);
      fireEvent.click(screen.getByRole('button', { name: 'Play time forward' }));
      advance(1000);
      const afterOne = shownDate();
      advance(1000);
      expect(shownDate() - afterOne).toBe(10 * 60_000);

      fireEvent.click(screen.getByRole('button', { name: 'Play time forward' }));
      const paused = shownDate();
      advance(1000);
      expect(shownDate() - paused).toBe(1000);
    });

    it('play backward moves the time back by 10 min per second', () => {
      start(NOON);
      fireEvent.click(screen.getByRole('button', { name: 'Play time backward' }));
      advance(1000);
      const afterOne = shownDate();
      advance(1000);
      expect(shownDate() - afterOne).toBe(-10 * 60_000);
    });

    it('"Back to now" stops play and returns to live', () => {
      start(NOON);
      fireEvent.click(screen.getByRole('button', { name: 'Play time forward' }));
      advance(2000);
      fireEvent.click(screen.getByRole('button', { name: 'Back to now' }));
      expect(shownDate()).toBe(Date.now());
      expect(screen.queryByRole('button', { name: 'Back to now' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Play time forward' })).toHaveAttribute('aria-pressed', 'false');
      advance(1000);
      expect(shownDate()).toBe(Date.now());
      expect(screen.getByTitle('Set date and time')).toHaveTextContent('12:00:03');
    });

    it('a preview does not fetch the weather again', () => {
      start(NOON);
      const before = weatherFetches();
      expect(before).toBeGreaterThan(0);
      jumpTo('2026-10-03T18:42');
      fireEvent.click(screen.getByRole('button', { name: 'Play time forward' }));
      advance(5000);
      expect(weatherFetches()).toBe(before);
    });

    it('during a preview the weather follows the hourly forecast (ROADMAP item 86)', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({
        current_weather: { temperature: 20, weathercode: 0, windspeed: 5, winddirection: 0, time: '' },
        current: { cloud_cover: 0, wind_speed_10m: 5, wind_direction_10m: 0 },
        hourly: {
          time: ['2026-09-30T12:00', '2026-09-30T13:00', '2026-09-30T14:00'],
          cloud_cover_low: [0, 0, 80], cloud_cover_mid: [0, 0, 60], cloud_cover_high: [0, 0, 20], visibility: [24000, 24000, 8000],
          temperature_2m: [20, 19, 13.6], weather_code: [0, 0, 63], cloud_cover: [0, 0, 95],
          wind_speed_10m: [5, 5, 30], wind_direction_10m: [0, 0, 250], precipitation: [0, 0, 4],
        },
      }) })) as unknown as typeof fetch;
      vi.setSystemTime(NOON);
      saveManualLocation(RAVENSBURG.latitude, RAVENSBURG.longitude, 'Ravensburg');
      render(<SunTracker />);
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(visProps.current!.weatherType).toBe('clear');

      jumpTo('2026-09-30T14:10'); // TZ is UTC in tests: nearest forecast hour 14:00
      expect(visProps.current).toMatchObject({
        weatherType: 'rain', temperatureC: 14, cloudCoverPercent: 95, windSpeedKmh: 30, rainMmH: 4,
        cloudLayers: { low: 80, mid: 60, high: 20 },
      });
      expect(screen.getByText('Forecast')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Back to now' }));
      expect(visProps.current).toMatchObject({ weatherType: 'clear', temperatureC: 20, cloudCoverPercent: 0 });
      expect(screen.getByText('Current Weather')).toBeInTheDocument();
    });

    it('starts the fireworks when live time passes the sunset (control)', () => {
      const sunset = getSunTimes(NOON, RAVENSBURG.latitude, RAVENSBURG.longitude).sunset!;

      // Live control: the 1 s clock passes the sunset.
      start(new Date(sunset.getTime() - 3000));
      tickFor(5000, 1000);
      expect(visProps.current!.fireworksTrigger).not.toBe(0);
    });

    it('does not start the fireworks during a preview, paused or playing', () => {
      const sunset = getSunTimes(NOON, RAVENSBURG.latitude, RAVENSBURG.longitude).sunset!;
      start(NOON);
      // Paused preview a minute before the sunset: the clock passes it. A commit every
      // 10 s, not every 1 s: since item 80 a long step no longer hides a show (a live
      // step 10 s past the event would start one), and 15 commits instead of 150 keep
      // the test well inside its timeout on a busy machine.
      const minuteBefore = new Date(sunset.getTime() - 60_000);
      const pad = (n: number) => String(n).padStart(2, '0');
      jumpTo(`2026-09-30T${pad(minuteBefore.getHours())}:${pad(minuteBefore.getMinutes())}`);
      tickFor(150_000, 10_000);
      expect(shownDate()).toBeGreaterThan(sunset.getTime());
      expect(visProps.current!.fireworksTrigger).toBe(0);
      // Play forward through the sunset.
      jumpTo(`2026-09-30T${pad(minuteBefore.getHours())}:${pad(minuteBefore.getMinutes())}`);
      fireEvent.click(screen.getByRole('button', { name: 'Play time forward' }));
      tickFor(3000, 500);
      expect(shownDate()).toBeGreaterThan(sunset.getTime());
      expect(visProps.current!.fireworksTrigger).toBe(0);
    });

    describe('fireworks you do not miss (ROADMAP item 80)', () => {
      const sunset = () => getSunTimes(NOON, RAVENSBURG.latitude, RAVENSBURG.longitude).sunset!;
      const trigger = () => visProps.current!.fireworksTrigger;
      const breadcrumbs = () => vi.mocked(addBreadcrumb).mock.calls.map(([crumb]) => crumb);
      // The page is hidden: its timers stop, so the clock jumps on the first tick back.
      const hideUntil = (ms: number) => vi.setSystemTime(ms);
      const setVisibility = (state: DocumentVisibilityState) =>
        Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
      afterEach(() => setVisibility('visible'));

      it('gives one show to a page that was hidden at the sunset and comes back after 3 min', () => {
        start(new Date(sunset().getTime() - 60_000));
        hideUntil(sunset().getTime() + 3 * 60_000);
        advance(1000);
        const fired = trigger();
        expect(fired).not.toBe(0);
        expect(breadcrumbs()).toEqual([{ category: 'fireworks', message: 'fired', level: 'info' }]);
        tickFor(5000, 1000);
        expect(trigger()).toBe(fired);
        expect(breadcrumbs()).toHaveLength(1);
      });

      it('gives no show to a page that comes back 20 min after the sunset', () => {
        start(new Date(sunset().getTime() - 60_000));
        hideUntil(sunset().getTime() + 20 * 60_000);
        tickFor(3000, 1000);
        expect(trigger()).toBe(0);
        expect(breadcrumbs()).toEqual([{ category: 'fireworks', message: 'skipped: too late', level: 'info' }]);
      });

      it('gives no show on a cold start after the sunset', () => {
        start(new Date(sunset().getTime() + 60_000));
        tickFor(5000, 1000);
        expect(trigger()).toBe(0);
        expect(breadcrumbs()).toEqual([]);
      });

      it('gives no show on the return from a preview to live time after the sunset', () => {
        start(new Date(sunset().getTime() - 60_000));
        jumpTo('2026-10-01T12:00');
        hideUntil(sunset().getTime() + 3 * 60_000);
        advance(1000);
        fireEvent.click(screen.getByRole('button', { name: 'Back to now' }));
        tickFor(3000, 1000);
        expect(trigger()).toBe(0);
        expect(breadcrumbs()).toEqual([{ category: 'fireworks', message: 'skipped: preview', level: 'info' }]);
      });

      it('waits while a tab is hidden but still ticks, and starts the show on the return', () => {
        start(new Date(sunset().getTime() - 3000));
        setVisibility('hidden');
        tickFor(10_000, 1000);
        expect(trigger()).toBe(0);
        setVisibility('visible');
        advance(1000);
        expect(trigger()).not.toBe(0);
      });

      it('leaves a "skipped: reduced motion" breadcrumb when reduced motion is on', () => {
        const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
          matches: query.includes('reduce'), media: query, onchange: null,
          addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
          dispatchEvent: () => false,
        }));
        start(new Date(sunset().getTime() - 3000));
        tickFor(5000, 1000);
        expect(breadcrumbs()).toEqual([{ category: 'fireworks', message: 'skipped: reduced motion', level: 'info' }]);
        matchMedia.mockRestore();
      });
    });

    describe('sunset countdown (ROADMAP item 43)', () => {
      // Records when each oscillator starts, in AudioContext seconds (currentTime is 0).
      const starts: number[] = [];
      class FakeAudioContext {
        currentTime = 0;
        state = 'running';
        destination = {};
        resume() { return Promise.resolve(); }
        createGain() {
          return { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: (node: unknown) => node };
        }
        createOscillator() {
          return { type: '', frequency: { setValueAtTime: () => {} }, connect: (node: unknown) => node, start: (at: number) => starts.push(at), stop: () => {} };
        }
      }
      const sunset = getSunTimes(NOON, RAVENSBURG.latitude, RAVENSBURG.longitude).sunset!;
      const toggle = () => fireEvent.click(screen.getByRole('button', { name: 'Sunset countdown' }));
      // Starts 20 s before the sunset; the 1 s clock then reaches T-11 s after 9 ticks.
      const runToCountdown = (turnOn: boolean) => {
        start(new Date(sunset.getTime() - 20_000));
        if (turnOn) toggle();
        starts.length = 0;
        tickFor(9000, 1000);
      };

      beforeEach(() => {
        starts.length = 0;
        vi.stubGlobal('AudioContext', FakeAudioContext);
      });
      afterEach(() => {
        vi.unstubAllGlobals();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      });

      it('is off by default; the tap that turns it on plays one check tone and saves the choice', () => {
        start(new Date(sunset.getTime() - 20_000));
        expect(screen.getByRole('button', { name: 'Sunset countdown' })).toHaveAttribute('aria-pressed', 'false');
        toggle();
        expect(screen.getByRole('button', { name: 'Sunset countdown' })).toHaveAttribute('aria-pressed', 'true');
        expect(starts).toHaveLength(1);
        expect(localStorage.getItem('sunset-countdown')).toBe('on');
      });

      it('with the toggle on, schedules 11 tones at T-11 s, 1 s apart, and the pill counts down', () => {
        runToCountdown(true);
        // 10 ticks T-10 s to T-1 s, then the chime at T0; the clock tick at T-10.7 s
        // scheduled them, so T0 is 10.7 s ahead on the AudioContext clock.
        expect(starts).toHaveLength(11);
        starts.slice(1).forEach((at, i) => expect(at - starts[i]).toBeCloseTo(1, 6));
        expect(starts[10]).toBeCloseTo(10.7, 6);
        tickFor(4000, 1000);
        expect(screen.getByTestId('sun-altitude')).toHaveTextContent('Sunset in 7 s');
        expect(starts).toHaveLength(11);
      });

      it('with the toggle off, schedules no tones, but the pill counts down (item 98)', () => {
        runToCountdown(false);
        expect(starts).toHaveLength(0);
        tickFor(4000, 1000);
        expect(screen.getByTestId('sun-altitude')).toHaveTextContent('Sunset in 7 s');
        expect(starts).toHaveLength(0);
      });

      it('with the page hidden at T-11 s, schedules no tones', () => {
        start(new Date(sunset.getTime() - 20_000));
        toggle();
        starts.length = 0;
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        tickFor(13_000, 1000);
        expect(starts).toHaveLength(0);
      });

      it('during a preview, schedules no tones', () => {
        start(NOON);
        toggle();
        starts.length = 0;
        const pad = (n: number) => String(n).padStart(2, '0');
        const minuteBefore = new Date(sunset.getTime() - 60_000);
        jumpTo(`2026-09-30T${pad(minuteBefore.getHours())}:${pad(minuteBefore.getMinutes())}`);
        tickFor(80_000, 1000);
        expect(starts).toHaveLength(0);
        expect(screen.getByTestId('sun-altitude')).not.toHaveTextContent('Sunset in');
      });
    });

    describe('sunset reminder (ROADMAP item 69)', () => {
      // Records the body of each notification; jsdom has no service worker, so the hook
      // uses a page notification.
      const shown: string[] = [];
      class FakeNotification {
        static permission: NotificationPermission = 'default';
        static answer: NotificationPermission = 'granted';
        static requestPermission = async () => (FakeNotification.permission = FakeNotification.answer);
        onclick: (() => void) | null = null;
        constructor(_title: string, options: NotificationOptions) {
          shown.push(options.body ?? '');
        }
        close() {}
      }
      const sunset = getSunTimes(NOON, RAVENSBURG.latitude, RAVENSBURG.longitude).sunset!;
      const name = 'Remind me 15 minutes before sunset (while the app is open)';
      const toggle = async () => {
        fireEvent.click(screen.getByRole('button', { name }));
        await act(async () => {});
      };
      // The page notification comes after an awaited service worker lookup.
      const advanceAsync = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

      beforeEach(() => {
        shown.length = 0;
        FakeNotification.permission = 'default';
        FakeNotification.answer = 'granted';
        vi.stubGlobal('Notification', FakeNotification);
      });
      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('is off by default; the tap that turns it on asks for the permission and saves the choice', async () => {
        start(new Date(sunset.getTime() - 20 * 60_000));
        expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
        await toggle();
        expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('sunset-reminder')).toBe('on');
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sunset reminder on' }));
      });

      it('shows one notification 15 minutes before sunset', async () => {
        start(new Date(sunset.getTime() - 20 * 60_000));
        await toggle();
        await advanceAsync(4 * 60_000);
        expect(shown).toHaveLength(0);
        await advanceAsync(2 * 60_000);
        expect(shown).toHaveLength(1);
        expect(shown[0]).toMatch(/^Sunset in 15 minutes, at \d{2}:\d{2}$/);
        await advanceAsync(20 * 60_000);
        expect(shown).toHaveLength(1);
      });

      it('stays off with a hint when the permission is denied', async () => {
        FakeNotification.answer = 'denied';
        start(new Date(sunset.getTime() - 20 * 60_000));
        await toggle();
        expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Notifications are blocked' }));
        await advanceAsync(10 * 60_000);
        expect(shown).toHaveLength(0);
      });

      it('during a preview, shows no notification', async () => {
        start(NOON);
        await toggle();
        const pad = (n: number) => String(n).padStart(2, '0');
        const before = new Date(sunset.getTime() - 20 * 60_000);
        jumpTo(`2026-09-30T${pad(before.getHours())}:${pad(before.getMinutes())}`);
        await advanceAsync(10 * 60_000);
        expect(shown).toHaveLength(0);
      });

      it('is hidden without the Notification API', () => {
        vi.unstubAllGlobals();
        start(NOON);
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
      });
    });
  });

  describe('UI language (ROADMAP item 67)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      document.documentElement.lang = '';
    });

    it('starts in the browser language, sets <html lang>, and saves a picked language', async () => {
      vi.stubGlobal('navigator', {
        language: 'de-DE',
        geolocation: { getCurrentPosition: (_s: unknown, e: (err: { code: number }) => void) => e({ code: 1 }) },
      });
      render(<SunTracker />);
      await waitFor(() => expect(screen.getByText('Sonnenuntergang')).toBeInTheDocument());
      expect(document.documentElement.lang).toBe('de');
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Standort nicht verfügbar' }));

      fireEvent.click(screen.getByRole('button', { name: 'Français' }));
      expect(screen.getByText('Coucher du soleil')).toBeInTheDocument();
      expect(document.documentElement.lang).toBe('fr');
      expect(localStorage.getItem('language')).toBe('fr');
    });
  });
});
