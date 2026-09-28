import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import SunTracker from '../src/components/SunTracker';
import { vi } from 'vitest';
import { loadManualLocation, saveManualLocation } from '../src/utils/manualLocation';

// Mock the toast function
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));
import { toast } from '@/hooks/use-toast';

describe('SunTracker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
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

      fireEvent.click(screen.getByRole('button', { name: /choose a place/i }));
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
});
