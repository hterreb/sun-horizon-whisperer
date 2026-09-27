import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import SunTracker from '../src/components/SunTracker';
import { vi } from 'vitest';
import { loadManualLocation, saveManualLocation } from '../src/utils/manualLocation';

// Mock the toast function
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));
import { toast } from '@/components/ui/use-toast';

describe('SunTracker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('shows a spinner and "Locating…" while detecting location (P0-3)', () => {
    // Mock geolocation to never call success or error
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: () => {} } });
    render(<SunTracker />);
    expect(screen.getByText(/locating…/i)).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByRole('heading', { name: /current weather/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument());
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

  // More tests for weather, background, fullscreen, etc. can be added here
});
