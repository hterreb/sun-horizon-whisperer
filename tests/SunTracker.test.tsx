import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import SunTracker from '../src/components/SunTracker';
import { vi } from 'vitest';
import { TAP_READY_MS } from '../src/hooks/useIdleHide';
import { DOUBLE_TAP_MS } from '../src/hooks/useDoubleTap';
import { SUN_TAP_GAP_MS } from '../src/utils/hiddenEggs';
import { loadManualLocation, saveManualLocation } from '../src/utils/manualLocation';
import { getSunPosition, getSunTimes } from '../src/utils/sunUtils';
import { getTerrainSunTimes, type HorizonProfile } from '../src/utils/horizonUtils';
import { isPlaneWeather } from '../src/utils/planes';
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

// A click on a body for a direct call of onSunTap or onMoonTap (item 158: they take the click).
const bodyClick = () => ({ nativeEvent: new MouseEvent('click'), currentTarget: document.body }) as unknown as React.MouseEvent<HTMLElement>;

// The fireworks breadcrumbs (ROADMAP item 80) and the live-planes tag (item 155).
vi.mock('@sentry/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  addBreadcrumb: vi.fn(),
  setTag: vi.fn(),
}));
import { addBreadcrumb, setTag } from '@sentry/react';

// Mock the toast function
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));
import { toast } from '@/hooks/use-toast';

// Satellite tracking (ROADMAP item 97): no CelesTrak data unless a test gives it.
vi.mock('../src/utils/satelliteData', () => ({ loadSatelliteData: vi.fn(async () => null), getNextSatelliteTry: vi.fn(() => null) }));
import { getNextSatelliteTry, loadSatelliteData, type GpRecord } from '../src/utils/satelliteData';
import issFixture from './fixtures/iss-omm-2026-10-05.json';
import { BADGES } from '../src/utils/collection';
import { FADE_OUT_MS, SHOW_MS } from '../src/components/BadgeUnlocked';
import { type EggCardKind } from '../src/utils/sceneInfo';

describe('SunTracker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
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

  it('a denied location keeps the loading screen with "Choose a place", no toast and no default place (item 170)', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_s, e) => e({ code: 1 }) } });
    render(<SunTracker />);
    expect(screen.getByRole('status')).toHaveTextContent('No location: choose a place');
    // Free for the first place: no gold plus on the button.
    const choose = screen.getByRole('button', { name: /choose a place/i });
    expect(choose.querySelector('[data-testid="premium-badge"]')).toBeNull();
    expect(screen.queryByTestId('sun-visualization')).not.toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it('a location allowed later moves the scene there without a reload (item 170)', async () => {
    let granted = false;
    const status = Object.assign(new EventTarget(), { state: 'denied' as PermissionState });
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (s: (p: unknown) => void, e?: (err: { code: number }) => void) =>
          granted ? s({ coords: { latitude: 47.78, longitude: 9.61 } }) : e?.({ code: 1 }),
      },
      permissions: { query: vi.fn(async () => status) },
    });
    render(<SunTracker />);
    expect(screen.getByRole('status')).toHaveTextContent('No location: choose a place');
    await act(async () => {});

    granted = true;
    status.state = 'granted';
    act(() => { status.dispatchEvent(new Event('change')); });
    await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument());
    expect(document.body.textContent).toContain('47.7800');
  });

  it('"Use my location" while location is blocked says where to allow it (item 170)', async () => {
    saveManualLocation(10, 20);
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_s: unknown, e: (err: { code: number }) => void) => e({ code: 1 }) } });
    render(<SunTracker />);
    await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /change location/i }));
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining("browser's site settings") }));
  });

  it('renders InfoPanel and SunVisualization after location is loaded', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
    render(<SunTracker />);
    // Wait for InfoPanel and SunVisualization to appear
    await waitFor(() => expect(screen.getByRole('heading', { name: /current weather/i })).toBeInTheDocument(), { timeout: 5000 });
    await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('fetches and displays real weather (mocked)', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current: { temperature_2m: 20, weather_code: 0 } }) })) as unknown as typeof fetch;
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

  it('gives the page the top colour of the scene sky, and removes it on unmount (ROADMAP item 151)', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
    const skyTop = () => document.documentElement.style.getPropertyValue('--sky-top');
    visProps.current = null;
    const { unmount } = render(<SunTracker />);
    await waitFor(() => expect(visProps.current).toBeTruthy());
    // The first stop of the gradient the scene draws (after the weather's grey mix).
    const sceneTop = visProps.current!.skyGradient!.match(/#[0-9a-f]{6}/i)![0];
    expect(skyTop()).toBe(sceneTop);
    unmount();
    expect(skyTop()).toBe('');
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
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current: { temperature_2m: 20, weather_code: 0 } }) })) as unknown as typeof fetch;

    render(<SunTracker />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Weather updated' }));
  });

  it('a manually picked weather ignores the real cloud cover for the stars, the moon and the cloud types (items 52, 57, 84)', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 7, longitude: 8 } }) } });
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({
      current: { temperature_2m: 20, weather_code: 3, cloud_cover: 100, wind_speed_10m: 0, wind_direction_10m: 0 },
      hourly: { time: ['2026-06-01T18:00'], cloud_cover_low: [90], cloud_cover_mid: [50], cloud_cover_high: [30], visibility: [24140] },
    }) })) as unknown as typeof fetch;

    render(<SunTracker />);
    // The star cover: the total, with its high-layer share at half weight (getStarCover).
    await waitFor(() => expect(visProps.current?.cloudCoverPercent).toBeCloseTo(100 * 95.75 / 96.5));
    expect(visProps.current!.cloudLayers).toEqual({ low: 90, mid: 50, high: 30 });

    fireEvent.click(screen.getByRole('button', { name: /manual/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(visProps.current!.weatherType).toBe('clear');
    expect(visProps.current!.cloudCoverPercent).toBeNull();
    expect(visProps.current!.cloudLayers).toBeNull();
  });

  it('a fog code in clear air under cirrus still shows the stars, the satellites and the planes', async () => {
    // Ravensburg, 2026-10-14 22:30: code 45, 16.8 km visibility, a full cirrus deck only.
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 13, longitude: 14 } }) } });
    const hour = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString().slice(0, 16);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({
      current: { temperature_2m: 12, weather_code: 45, cloud_cover: 100, visibility: 16800, wind_speed_10m: 3, wind_direction_10m: 32 },
      hourly: { time: [hour], cloud_cover_low: [0], cloud_cover_mid: [0], cloud_cover_high: [100], visibility: [16800] },
    }) })) as unknown as typeof fetch;

    render(<SunTracker />);
    await waitFor(() => expect(visProps.current?.weatherType).toBe('overcast'));
    expect(visProps.current!.cloudCoverPercent).toBe(50);
    expect(isPlaneWeather('overcast', visProps.current!.cloudLayers ?? null)).toBe(true);
  });

  it('passes the visibility of the hour for the sky optics; manual weather has none (item 148)', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 11, longitude: 12 } }) } });
    const hour = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
    const hourly = (offset: number) => new Date(hour.getTime() + offset * 3_600_000).toISOString().slice(0, 16);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({
      current: { temperature_2m: 20, weather_code: 45, cloud_cover: 40, wind_speed_10m: 0, wind_direction_10m: 0 },
      hourly: { time: [hourly(0), hourly(1)], cloud_cover_low: [30, 30], cloud_cover_mid: [0, 0], cloud_cover_high: [5, 5], visibility: [900, 900] },
    }) })) as unknown as typeof fetch;

    render(<SunTracker />);
    await waitFor(() => expect(visProps.current?.visibilityM).toBe(900));

    fireEvent.click(screen.getByRole('button', { name: /manual/i }));
    expect(visProps.current!.visibilityM).toBeNull();
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

  it('enters and exits fullscreen mode, hiding cursor as appropriate (ROADMAP item 89)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
    const advance = (ms: number) => act(() => {
      vi.advanceTimersByTime(ms);
    });
    const setFullscreenElement = (element: Element | null) => act(() => {
      Object.defineProperty(document, 'fullscreenElement', { value: element, configurable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    // jsdom has no PointerEvent: a MouseEvent named pointermove, with its pointerType.
    const pointerMove = (target: EventTarget, pointerType: string) => act(() => {
      const event = new MouseEvent('pointermove', { bubbles: true });
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      target.dispatchEvent(event);
    });
    const { container } = render(<SunTracker />);
    // The top-left buttons (with the fullscreen listener) mount after the 200 ms fade.
    advance(250);
    const scene = container.lastElementChild!;

    try {
      setFullscreenElement(document.documentElement);
      advance(2000);
      pointerMove(document, 'mouse');
      advance(2999);
      expect(scene).not.toHaveClass('cursor-none');
      advance(1);
      expect(scene).toHaveClass('cursor-none');

      // Item 124: a tap on a scene hit area (a double tap on a fish) does not wake.
      const hit = document.createElement('span');
      hit.setAttribute('data-scene-hit', 'true');
      const inner = hit.appendChild(document.createElement('span'));
      scene.appendChild(hit);
      fireEvent.touchStart(inner);
      fireEvent.click(inner);
      fireEvent.touchStart(inner);
      fireEvent.click(inner);
      expect(scene).toHaveClass('cursor-none');
      // Item 133: the compatibility mouse events of a tap do not wake.
      fireEvent.mouseMove(inner);
      pointerMove(inner, 'touch');
      expect(scene).toHaveClass('cursor-none');
      hit.remove();

      // Item 132: the hidden buttons take no taps; after a wake only once a double tap is over.
      const column = screen.getByRole('button', { name: 'Exit fullscreen' }).parentElement!;
      expect(column).toHaveClass('pointer-events-none');
      // Item 136: a touch alone does not wake; a tap (click) on the empty sky does.
      fireEvent.touchStart(scene);
      expect(scene).toHaveClass('cursor-none');
      fireEvent.click(scene);
      expect(scene).not.toHaveClass('cursor-none');
      expect(column).toHaveClass('pointer-events-none');
      advance(TAP_READY_MS);
      expect(column).not.toHaveClass('pointer-events-none');
      advance(9999 - TAP_READY_MS);
      expect(scene).not.toHaveClass('cursor-none');
      advance(1);
      expect(scene).toHaveClass('cursor-none');

      setFullscreenElement(null);
      expect(scene).not.toHaveClass('cursor-none');
    } finally {
      delete (document as { fullscreenElement?: Element | null }).fullscreenElement;
      vi.useRealTimers();
    }
  });

  describe('a tap on the empty sky hides or shows the controls (ROADMAP item 136)', () => {
    const advance = (ms: number) => act(() => {
      vi.advanceTimersByTime(ms);
    });
    const setFullscreenElement = (element: Element | null) => act(() => {
      Object.defineProperty(document, 'fullscreenElement', { value: element, configurable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    // A phone tap: pointerdown (SceneInfoCard closes on it), then the click.
    const tap = (el: Element) => {
      fireEvent.pointerDown(el);
      fireEvent.click(el);
    };
    const column = () => screen.getByRole('button', { name: /fullscreen/i }).parentElement!;
    const shown = () => column().classList.contains('opacity-100');
    const start = (displayMode: string | null = null, time = '2026-09-30T11:00:00Z') => {
      vi.useFakeTimers();
      // Midday: the sun shows (a tap on it opens a card).
      vi.setSystemTime(new Date(time));
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
      vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: query === displayMode,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      const { container } = render(<SunTracker />);
      // The top-left buttons mount after the 200 ms fade.
      advance(250);
      return container.querySelector('[data-share-root]')!;
    };

    afterEach(() => {
      delete (document as { fullscreenElement?: Element | null }).fullscreenElement;
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('in fullscreen: a sky tap hides at once and for good, the next shows for 10 s', () => {
      const scene = start();
      setFullscreenElement(document.documentElement);
      advance(1000);
      expect(shown()).toBe(true);

      tap(scene);
      expect(shown()).toBe(false);
      expect(column()).toHaveClass('pointer-events-none');
      advance(60_000);
      expect(shown()).toBe(false);

      tap(scene);
      expect(shown()).toBe(true);
      expect(column()).toHaveClass('pointer-events-none');
      advance(TAP_READY_MS);
      expect(column()).not.toHaveClass('pointer-events-none');
      advance(10_000 - TAP_READY_MS - 1);
      expect(shown()).toBe(true);
      advance(1);
      expect(shown()).toBe(false);

      // A mouse move still wakes (item 133).
      act(() => {
        const event = new MouseEvent('pointermove', { bubbles: true });
        Object.defineProperty(event, 'pointerType', { value: 'mouse' });
        document.dispatchEvent(event);
      });
      expect(shown()).toBe(true);
    });

    it('two sky taps 200 ms apart toggle once: a double tap on the sky does not flicker', () => {
      const scene = start();
      setFullscreenElement(document.documentElement);
      tap(scene);
      advance(200);
      tap(scene);
      expect(shown()).toBe(false);
      advance(400);
      tap(scene);
      expect(shown()).toBe(true);
    });

    it('a double tap on a scene thing, a tap on a control or outside the scene does not toggle', () => {
      const scene = start();
      setFullscreenElement(document.documentElement);
      const hit = scene.appendChild(document.createElement('span'));
      hit.setAttribute('data-scene-hit', 'true');
      const fish = hit.appendChild(document.createElement('span'));
      tap(fish);
      advance(100);
      tap(fish);
      expect(shown()).toBe(true);
      advance(1000);
      tap(screen.getByRole('button', { name: 'Exit fullscreen' }));
      expect(shown()).toBe(true);
      tap(document.body);
      expect(shown()).toBe(true);
    });

    it('a tap that closes an info card only closes it', () => {
      const scene = start();
      setFullscreenElement(document.documentElement);
      const sun = screen.getByRole('button', { name: 'Sun' });
      fireEvent.click(sun, { detail: 1 });
      fireEvent.click(sun, { detail: 2 });
      expect(screen.getByTestId('scene-info-card')).toBeInTheDocument();
      advance(1000);

      tap(scene);
      expect(screen.queryByTestId('scene-info-card')).toBeNull();
      expect(shown()).toBe(true);
      tap(scene);
      expect(shown()).toBe(false);
    });

    it('in the installed app: shown at start, a sky tap hides, the next shows for 10 s', () => {
      const scene = start('(display-mode: fullscreen)');
      advance(60_000);
      expect(shown()).toBe(true);

      tap(scene);
      advance(60_000);
      expect(shown()).toBe(false);
      tap(scene);
      expect(shown()).toBe(true);
      advance(10_000);
      expect(shown()).toBe(false);
    });

    it('in a browser tab: a sky tap does nothing, the controls always show', () => {
      const scene = start();
      tap(scene);
      advance(60_000);
      expect(shown()).toBe(true);
      expect(column()).not.toHaveClass('pointer-events-none');
    });

    describe('item 147: a tap on a scene thing (T1) or on a hidden control (T2)', () => {
      // The sun is a scene thing: a double tap (detail 1, then 2) or a keyboard click (detail 0)
      // opens its card.
      const sunTap = (detail: number, init: MouseEventInit = {}) => {
        const sun = screen.getByRole('button', { name: 'Sun' });
        fireEvent.pointerDown(sun, init);
        fireEvent.click(sun, { detail, ...init });
      };
      const card = () => screen.queryByTestId('scene-info-card');

      it('a single tap on a scene thing toggles after DOUBLE_TAP_MS', () => {
        const scene = start();
        setFullscreenElement(document.documentElement);
        const hit = scene.appendChild(document.createElement('span'));
        hit.setAttribute('data-scene-hit', 'true');
        const cloud = hit.appendChild(document.createElement('span'));

        tap(cloud);
        advance(DOUBLE_TAP_MS - 1);
        expect(shown()).toBe(true);
        advance(1);
        expect(shown()).toBe(false);
        advance(60_000);
        expect(shown()).toBe(false);

        tap(cloud);
        advance(DOUBLE_TAP_MS - 1);
        expect(shown()).toBe(false);
        advance(1);
        expect(shown()).toBe(true);
      });

      it('a double tap on a scene thing opens its card and does not toggle, shown or hidden', () => {
        const scene = start();
        setFullscreenElement(document.documentElement);
        sunTap(1);
        advance(200);
        sunTap(2);
        expect(card()).toBeInTheDocument();
        advance(1000);
        expect(shown()).toBe(true);

        tap(scene); // closes the card only
        tap(scene);
        expect(shown()).toBe(false);
        advance(1000);
        sunTap(1);
        advance(200);
        sunTap(2);
        expect(card()).toBeInTheDocument();
        advance(1000);
        expect(shown()).toBe(false);
      });

      it('a keyboard click on a scene thing opens its card and does not toggle', () => {
        start();
        setFullscreenElement(document.documentElement);
        sunTap(0);
        expect(card()).toBeInTheDocument();
        advance(1000);
        expect(shown()).toBe(true);
      });

      // A tap point in the box of the top-left column.
      const IN_BOX = { clientX: 30, clientY: 30 };
      // Hides the controls with a sky tap. jsdom draws nothing: the top-left column gets its box
      // (16 px from the corner, 56 × 160).
      const hideWithBox = (scene: Element) => {
        tap(scene);
        expect(shown()).toBe(false);
        advance(1000);
        vi.spyOn(column(), 'getBoundingClientRect').mockReturnValue(
          { left: 16, top: 16, right: 72, bottom: 176, width: 56, height: 160, x: 16, y: 16, toJSON: () => ({}) } as DOMRect,
        );
      };

      it('while hidden, a tap on the empty sky in the box of a hidden control shows the controls at once; a toast on top keeps its tap', () => {
        const scene = start();
        setFullscreenElement(document.documentElement);
        expect(document.querySelectorAll('[data-idle-control]')).toHaveLength(3);
        hideWithBox(scene);
        fireEvent.pointerDown(scene, IN_BOX);
        fireEvent.click(scene, IN_BOX);
        expect(shown()).toBe(true);

        // A toast on top of the hidden box (a badge, `data-share-hide`) keeps its tap.
        advance(1000);
        tap(scene);
        expect(shown()).toBe(false);
        advance(1000);
        const toast = scene.appendChild(document.createElement('button'));
        toast.setAttribute('data-share-hide', '');
        const onToast = vi.fn();
        toast.addEventListener('click', onToast);
        fireEvent.pointerDown(toast);
        fireEvent.click(toast, IN_BOX);
        expect(onToast).toHaveBeenCalledTimes(1);
        expect(shown()).toBe(false);
      });

      // Item 157: the sun is under the column. While hidden, its taps reach it (as before item 147).
      it('item 157: while hidden, a double tap on the sun in the box of a hidden control opens its card; the controls stay hidden', () => {
        const scene = start();
        setFullscreenElement(document.documentElement);
        hideWithBox(scene);
        sunTap(1, IN_BOX);
        expect(shown()).toBe(false);
        advance(200);
        sunTap(2, IN_BOX);
        expect(card()).toBeInTheDocument();
        advance(1000);
        expect(shown()).toBe(false);
      });

      it('item 157: while hidden, a single tap on the sun in the box shows the controls after DOUBLE_TAP_MS; shown, the same tap hides them', () => {
        const scene = start();
        setFullscreenElement(document.documentElement);
        hideWithBox(scene);
        sunTap(1, IN_BOX);
        advance(DOUBLE_TAP_MS - 1);
        expect(shown()).toBe(false);
        advance(1);
        expect(shown()).toBe(true);
        expect(card()).toBeNull();

        // Shown, the box is not special: after a pause (a new tap sequence, item 158) a tap there
        // on the sun toggles after DOUBLE_TAP_MS.
        advance(SUN_TAP_GAP_MS + 1);
        sunTap(1, IN_BOX);
        advance(DOUBLE_TAP_MS);
        expect(shown()).toBe(false);
        expect(card()).toBeNull();
      });
    });

    describe('item 163: use of a shown control is a wake', () => {
      // The scroll area of the info panel (a scroll does not bubble) and the radio.
      const panelScroll = () => document.querySelector('[data-idle-control] [data-radix-scroll-area-viewport]')!;
      const radio = () => screen.getByRole('switch', { name: 'Play lo-fi music' });
      // Enters fullscreen, hides the controls with a sky tap and shows them with the next one:
      // the hide timer is now WAKE_HIDE_MS.
      const showForTenSeconds = (scene: Element) => {
        setFullscreenElement(document.documentElement);
        tap(scene);
        advance(1000);
        tap(scene);
        expect(shown()).toBe(true);
        advance(TAP_READY_MS);
      };

      it('in fullscreen, a scroll in the panel each 2 s for 20 s keeps the controls; they hide 10 s after the last scroll', () => {
        const scene = start();
        // Before the first hide, a wake starts ENTER_HIDE_MS again (item 89).
        setFullscreenElement(document.documentElement);
        advance(2000);
        fireEvent.scroll(panelScroll());
        advance(2999);
        expect(shown()).toBe(true);
        advance(1);
        expect(shown()).toBe(false);

        advance(1000);
        tap(scene);
        advance(TAP_READY_MS);
        for (let i = 0; i < 10; i++) {
          advance(2000);
          fireEvent.scroll(panelScroll());
          expect(shown()).toBe(true);
        }
        expect(column()).not.toHaveClass('pointer-events-none');
        advance(9999);
        expect(shown()).toBe(true);
        advance(1);
        expect(shown()).toBe(false);
      });

      it('a pointerdown on the radio, a wheel and a key in the panel start the timer again; the controls keep their taps', () => {
        const scene = start();
        showForTenSeconds(scene);
        advance(8000);
        fireEvent.pointerDown(radio());
        expect(column()).not.toHaveClass('pointer-events-none');
        advance(8000);
        fireEvent.wheel(panelScroll());
        advance(8000);
        fireEvent.keyDown(panelScroll(), { key: 'ArrowDown' });
        expect(column()).not.toHaveClass('pointer-events-none');
        advance(9999);
        expect(shown()).toBe(true);
        advance(1);
        expect(shown()).toBe(false);
      });

      it('a scroll storm in the panel renders nothing again', () => {
        const scene = start();
        showForTenSeconds(scene);
        const props = visProps.current;
        for (let i = 0; i < 100; i++) fireEvent.scroll(panelScroll());
        expect(visProps.current).toBe(props);
      });

      it('hidden controls do not come back on a scroll, a wheel, a key or a pointerdown in them; use of the scene is no wake', () => {
        const scene = start();
        showForTenSeconds(scene);
        // A scroll that runs on after a sky tap hid the controls (a fling) does not show them.
        tap(scene);
        expect(shown()).toBe(false);
        fireEvent.scroll(panelScroll());
        fireEvent.wheel(panelScroll());
        fireEvent.keyDown(panelScroll(), { key: 'ArrowDown' });
        fireEvent.pointerDown(radio());
        advance(60_000);
        expect(shown()).toBe(false);

        tap(scene);
        expect(shown()).toBe(true);
        advance(8000);
        fireEvent.pointerDown(scene);
        fireEvent.scroll(document);
        fireEvent.keyDown(document.body, { key: 'ArrowDown' });
        advance(2000);
        expect(shown()).toBe(false);
      });
    });

    describe('item 158: one tap on the sun or the moon toggles, two open the card, seven start the egg', () => {
      // The installed app: the controls show until a tap (no 3 s hide after the start).
      const APP = '(display-mode: fullscreen)';
      const BODIES = [
        { name: 'Sun', time: '2026-09-30T11:00:00Z', egg: 'sun-sunglasses' },
        { name: 'Moon', time: '2026-09-30T03:00:00Z', egg: 'disco-sky' }, // the moon at 66°, the sun at −41°
      ];
      // A pointer tap: the pointerdown (SceneInfoCard closes on it), then the click (detail 1).
      const press = (el: Element) => {
        fireEvent.pointerDown(el);
        fireEvent.click(el, { detail: 1 });
      };
      const card = () => screen.queryByTestId('scene-info-card');
      // Taps `el` `count` times, `gapMs` apart, then waits 1 s. Returns how often the controls
      // changed (checked every 50 ms) and the card after each tap.
      const tapRun = (el: () => Element, count: number, gapMs: number) => {
        let changes = 0;
        let last = shown();
        const note = () => {
          if (shown() !== last) changes += 1;
          last = shown();
        };
        const cards: (HTMLElement | null)[] = [];
        for (let i = 0; i < count; i++) {
          for (let t = 0; i > 0 && t < gapMs; t += 50) {
            advance(50);
            note();
          }
          press(el());
          note();
          cards.push(card());
        }
        for (let t = 0; t < 1000; t += 50) {
          advance(50);
          note();
        }
        return { changes, cards };
      };

      afterEach(() => {
        window.history.pushState({}, '', '/');
      });

      it.each(BODIES)('7 fast taps on the $name: the card of tap 2 stays as it is, tap 7 starts the egg, the controls do not change', ({ name, time, egg }) => {
        start(APP, time);
        const body = () => screen.getByRole('button', { name });
        expect(shown()).toBe(true);
        const { changes, cards } = tapRun(body, 7, 200);
        expect(cards[0]).toBeNull();
        expect(cards[1]).not.toBeNull();
        // Taps 3 to 7: the same card, not closed and opened again.
        for (const later of cards.slice(2)) expect(later).toBe(cards[1]);
        expect(screen.getByTestId(egg)).toBeInTheDocument();
        expect(changes).toBe(0);
        expect(shown()).toBe(true);
      });

      it.each(BODIES)('7 slow taps on the $name: tap 1 toggles, taps 2 to 6 do nothing, tap 7 starts the egg', ({ name, time, egg }) => {
        start(APP, time);
        const body = () => screen.getByRole('button', { name });
        const { changes, cards } = tapRun(body, 7, 600);
        expect(cards.every(c => c === null)).toBe(true);
        expect(screen.getByTestId(egg)).toBeInTheDocument();
        expect(changes).toBe(1);
        expect(shown()).toBe(false);
      });

      it.each(BODIES)('1 tap on the $name toggles after DOUBLE_TAP_MS; 2 fast taps open the card and do not toggle', ({ name, time }) => {
        start(APP, time);
        const body = () => screen.getByRole('button', { name });
        press(body());
        advance(DOUBLE_TAP_MS - 1);
        expect(shown()).toBe(true);
        advance(1);
        expect(shown()).toBe(false);
        expect(card()).toBeNull();

        advance(SUN_TAP_GAP_MS + 1);
        const { changes, cards } = tapRun(body, 2, 200);
        expect(cards[1]).toBeInTheDocument();
        expect(changes).toBe(0);
      });

      it('5 fast taps on a scene thing with a card (a fish) do not toggle: the tap that closes the card stops the toggle of the tap before', () => {
        // Every fish a perch; Math.random at 0.1 passes every spawn chance (as in the info card tests).
        window.history.pushState({}, '', '/?fish=perch');
        start(APP);
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        advance(10_000);
        const fish = () => [...screen.getAllByTestId('scene-hit')]
          .find(hit => hit.closest('[aria-hidden="true"]')?.querySelector('[data-testid="scene-fish"]'))!;
        const { changes, cards } = tapRun(fish, 5, 200);
        // Tap 2 opens the card, tap 3 closes it, tap 4 opens it again, tap 5 closes it.
        expect(cards.map(c => c !== null)).toEqual([false, true, false, true, false]);
        expect(changes).toBe(0);
        expect(shown()).toBe(true);
      });
    });
  });

  describe('screen on (ROADMAP item 90)', () => {
    const renderWithWakeLock = async (displayMode: string | null) => {
      const request = vi.fn(async () => ({ addEventListener: vi.fn(), release: vi.fn(async () => {}) }));
      vi.stubGlobal('navigator', {
        geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) },
        wakeLock: { request },
      });
      const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        matches: query === displayMode,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      try {
        render(<SunTracker />);
        await act(async () => {});
      } finally {
        matchMedia.mockRestore();
      }
      return request;
    };

    it('keeps the screen on in the installed app, where the Fullscreen API is not used', async () => {
      const request = await renderWithWakeLock('(display-mode: fullscreen)');
      expect(request).toHaveBeenCalledWith('screen');
    });

    it('does not keep the screen on in a browser tab outside fullscreen', async () => {
      const request = await renderWithWakeLock(null);
      expect(request).not.toHaveBeenCalled();
    });
  });

  describe('radio at night (ROADMAP item 139)', () => {
    const radioSwitch = (time: string) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(time));
      saveManualLocation(47.78, 9.61, 'Ravensburg');
      render(<SunTracker />);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      return screen.getByRole('switch', { name: 'Play lo-fi music' });
    };
    afterEach(() => {
      vi.useRealTimers();
    });

    it('a dark sky dims the radio switch and the volume slider', () => {
      // 00:00 in Ravensburg: night.
      expect(radioSwitch('2026-10-11T22:00:00Z')).toHaveClass('data-[state=unchecked]:bg-white/15');
      expect(screen.getByRole('slider', { name: 'Volume' }).closest('.touch-none')).toHaveClass('[&_[role=slider]]:bg-[#adadaf]');
    });

    it('by day they keep their look', () => {
      // 13:00 in Ravensburg: midday.
      expect(radioSwitch('2026-09-30T11:00:00Z')).not.toHaveClass('data-[state=unchecked]:bg-white/15');
      expect(screen.getByRole('slider', { name: 'Volume' }).closest('.touch-none')).not.toHaveClass('[&_[role=slider]]:bg-[#adadaf]');
    });
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
      vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (s) => s({ coords: { latitude: 1, longitude: 2 } }) } });
      render(<SunTracker />);
      await waitFor(() => expect(screen.getByTestId('sun-visualization')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '35' } });
      fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '139' } });
      fireEvent.click(screen.getByRole('button', { name: /set location/i }));

      expect(loadManualLocation()).toEqual({ latitude: 35, longitude: 139 });
      expect(document.body.textContent).toContain('35.0000');
      // Item 170: typed coordinates with no place name are "Chosen point", not "Your location".
      expect(await screen.findByText('Chosen point', undefined, { timeout: 5000 })).toBeInTheDocument();
    });

    it('a searched place keeps its time zone: the panel uses its clock and says how far it is (item 169)', async () => {
      saveManualLocation(40.71, -74.01, 'New York, United States', 'US', 'America/New_York');
      render(<SunTracker />);
      // The tests run with TZ=UTC; New York is 4 or 5 h behind.
      expect(await screen.findByTestId('clock-note')).toHaveTextContent(/^Local time · [45] h behind you$/);
      const newYorkNow = () => new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York' });
      const shown = screen.getByTitle('Set date and time').textContent ?? '';
      // The minute can turn between the render and this line.
      expect([newYorkNow(), new Date(Date.now() - 60_000).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York' })])
        .toContain(shown.slice(0, 5));
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
      // Item 170: the first place is free.
      expect(chooseButton.querySelector('[data-testid="premium-badge"]')).toBeNull();
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

    it('asks for the position with a 10 s timeout, and a timeout asks for a place, with no toast (item 170)', () => {
      const geo = stubPendingGeolocation();
      render(<SunTracker />);
      expect(geo.getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { timeout: 10000 });

      advance(10000);
      geo.fail();
      expect(toast).not.toHaveBeenCalled();
      advance(1000);
      expect(screen.getByRole('status')).toHaveTextContent('Location not found: choose a place');
      expect(screen.getByRole('button', { name: /choose a place/i })).toBeInTheDocument();
      expect(document.body.textContent).not.toContain('40.7128');
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

    it('after a fast return (last visible 2 min ago), fades the scene in instead of the circle (ROADMAP item 90)', () => {
      sessionStorage.setItem('last-visible', String(Date.now() - 2 * 60 * 1000));
      const geo = stubPendingGeolocation();
      const { container } = render(<SunTracker />);

      advance(1000);
      geo.answer();
      expect(container.lastElementChild).toHaveClass('animate-scene-fade');
      expect(container.lastElementChild).not.toHaveClass('animate-scene-iris');
    });

    it('saves the time the app was last visible on visibilitychange and pagehide (ROADMAP item 90)', () => {
      stubPendingGeolocation();
      render(<SunTracker />);
      expect(sessionStorage.getItem('last-visible')).toBeNull();

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(sessionStorage.getItem('last-visible')).toBe(String(Date.now()));

      advance(5000);
      act(() => {
        window.dispatchEvent(new Event('pagehide'));
      });
      expect(sessionStorage.getItem('last-visible')).toBe(String(Date.now()));
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
        current: { temperature_2m: 20, weather_code: 0, cloud_cover: 0, wind_speed_10m: 5, wind_direction_10m: 0 },
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
        weatherType: 'rain', temperatureC: 14, windSpeedKmh: 30, rainMmH: 4,
        cloudLayers: { low: 80, mid: 60, high: 20 },
      });
      // The star cover (getStarCover): the hour's total of 95 %, its high-layer share at half weight.
      expect(visProps.current!.cloudCoverPercent).toBeCloseTo(95 * 92.8 / 93.6);
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
      const param = () => ({ value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} });
      class FakeAudioContext {
        currentTime = 0;
        state = 'running';
        destination = {};
        resume() { return Promise.resolve(); }
        createGain() {
          return { gain: param(), connect: (node: unknown) => node };
        }
        // The countdown's master bus (item 152).
        createDynamicsCompressor() {
          return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect: (node: unknown) => node };
        }
        // The low-pass of the S3 pad (item 152).
        createBiquadFilter() {
          return { type: '', frequency: param(), connect: (node: unknown) => node };
        }
        createOscillator() {
          return { type: '', frequency: param(), connect: (node: unknown) => node, start: (at: number) => starts.push(at), stop: () => {} };
        }
      }
      const sunset = getSunTimes(NOON, RAVENSBURG.latitude, RAVENSBURG.longitude).sunset!;
      const toggle = () => fireEvent.click(screen.getByRole('button', { name: 'Sunset countdown' }));
      const radio = () => fireEvent.click(screen.getByRole('switch', { name: 'Play lo-fi music' }));
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

      it('is off by default; the tap that turns it on plays one check pluck and saves the choice', () => {
        start(new Date(sunset.getTime() - 20_000));
        expect(screen.getByRole('button', { name: 'Sunset countdown' })).toHaveAttribute('aria-pressed', 'false');
        toggle();
        expect(screen.getByRole('button', { name: 'Sunset countdown' })).toHaveAttribute('aria-pressed', 'true');
        // One S3 pluck: two voices (A5 and its third harmonic).
        expect(starts).toHaveLength(2);
        expect(localStorage.getItem('sunset-countdown')).toBe('on');
        // Item 176: and says what comes.
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sunset countdown', description: expect.stringContaining('last 10 seconds') }));
      });

      it('starting the radio turns it on without a check tone, also after the user turned it off (item 152, B2)', () => {
        const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
        const pause = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
        start(new Date(sunset.getTime() - 20_000));
        const bell = () => screen.getByRole('button', { name: 'Sunset countdown' });
        expect(bell()).toHaveAttribute('aria-pressed', 'false');
        radio();
        expect(bell()).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('sunset-countdown')).toBe('on');
        expect(starts).toHaveLength(0);

        toggle();
        expect(bell()).toHaveAttribute('aria-pressed', 'false');
        radio();
        expect(bell()).toHaveAttribute('aria-pressed', 'false');
        radio();
        expect(bell()).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('sunset-countdown')).toBe('on');

        // The countdown then plays over the radio.
        starts.length = 0;
        tickFor(9000, 1000);
        expect(starts).toHaveLength(31);
        play.mockRestore();
        pause.mockRestore();
      });

      it('with the toggle on, schedules the S3 sound at T-11 s and the pill counts down (item 152)', () => {
        runToCountdown(true);
        // The clock tick at T-10.7 s scheduled it, so T0 is 10.7 s ahead on the AudioContext
        // clock: the 3 pad voices at T-10 s, 10 plucks of 2 voices 1 s apart from T-10 s to
        // T-1 s, then the 8 voices of the bowl at T0.
        expect(starts).toHaveLength(31);
        starts.slice(0, 3).forEach((at) => expect(at).toBeCloseTo(0.7, 6));
        const plucks = starts.slice(3, 23).filter((_, i) => i % 2 === 0);
        plucks.forEach((at, i) => expect(at).toBeCloseTo(0.7 + i, 6));
        starts.slice(23).forEach((at) => expect(at).toBeCloseTo(10.7, 6));
        tickFor(4000, 1000);
        expect(screen.getByTestId('sun-altitude')).toHaveTextContent('Sunset in 7 s');
        expect(starts).toHaveLength(31);
      });

      it('with the toggle off, schedules no tones, but the pill counts down (item 98)', () => {
        runToCountdown(false);
        expect(starts).toHaveLength(0);
        tickFor(4000, 1000);
        expect(screen.getByTestId('sun-altitude')).toHaveTextContent('Sunset in 7 s');
        expect(starts).toHaveLength(0);
      });

      it('with the toggle off, a tap on the pill turns the sound on, like the bell (item 108)', () => {
        runToCountdown(false);
        tickFor(4000, 1000);
        fireEvent.click(screen.getByRole('button', { name: 'Turn on the countdown sound' }));
        expect(screen.getByRole('button', { name: 'Sunset countdown' })).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('sunset-countdown')).toBe('on');
        // The check pluck of primeCountdownAudio (two voices).
        expect(starts).toHaveLength(2);
        expect(screen.queryByRole('button', { name: 'Turn on the countdown sound' })).not.toBeInTheDocument();
        expect(screen.getByTestId('sun-altitude')).toHaveTextContent('Sunset in 7 s');
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

    describe('today\'s sunset stays the target until it is over (ROADMAP item 156)', () => {
      // SUN-CHASER-25: Ravensburg on 2026-10-15. The sun is at 0° (geometric) at 16:29:42
      // UTC; over a flat 0° horizon the line-of-sight sunset is at 16:34:49 UTC.
      const profile: HorizonProfile = {
        angles: new Array(360).fill(0), observerElevation: 450, eyeHeight: 1.7,
        ridgeDistances: new Array(360).fill(null), ridgeHeights: new Array(360).fill(null),
      };
      const lineOfSightSunset = (day: string) =>
        getTerrainSunTimes(new Date(`${day}T12:00:00Z`), RAVENSBURG.latitude, RAVENSBURG.longitude, profile).sunset!;

      it('counts down and starts the fireworks at the line-of-sight sunset after the geometric set', async () => {
        const sunset = lineOfSightSunset('2026-10-15');
        // The profile comes from the terrain cache (default eye height 1.7 m), with no fetch.
        localStorage.setItem('terrain_horizon_profile_v2_47.780_9.610_1.7', JSON.stringify({ profile, timestamp: 0 }));
        // Open 6 min before the sunset, before the geometric set.
        start(new Date(sunset.getTime() - 361_000));
        await act(() => vi.advanceTimersByTimeAsync(1000)); // the profile loads after a 500 ms debounce
        expect(visProps.current!.terrainSunTimes?.sunset).toEqual(sunset);
        // To T-19.7 s: past the geometric set and the minute tick after it.
        tickFor(340_000, 20_000);
        expect(visProps.current!.terrainSunTimes?.sunset).toEqual(sunset);
        tickFor(13_000, 1000);
        expect(screen.getByTestId('sun-altitude')).toHaveTextContent('Sunset in 7 s');
        expect(visProps.current!.fireworksTrigger).toBe(0);
        tickFor(10_000, 1000);
        expect(visProps.current!.fireworksTrigger).not.toBe(0);
        // Only after the sunset does the next minute tick move the times to the next day.
        tickFor(60_000, 10_000);
        expect(visProps.current!.terrainSunTimes?.sunset).toEqual(lineOfSightSunset('2026-10-16'));
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

    it('a searched place\'s name follows a language switch, at the same place (item 176)', async () => {
      saveManualLocation(64.15, -21.94, 'Reykjavik, Capital Region, Iceland', 'IS', 'Atlantic/Reykjavik');
      global.fetch = vi.fn((url: string) => String(url).includes('geocoding-api') && String(url).includes('language=de')
        ? Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [
          { name: 'Reykjavík', admin1: 'Hauptstadtregion', country: 'Island', latitude: 64.146, longitude: -21.942 },
        ] }) })
        : Promise.reject(new Error('offline'))) as unknown as typeof fetch;
      render(<SunTracker />);
      await screen.findByText('Reykjavik, Capital Region, Iceland');
      fireEvent.click(screen.getByRole('button', { name: 'Deutsch' }));
      expect(await screen.findByText('Reykjavík, Hauptstadtregion, Island')).toBeInTheDocument();
      expect(loadManualLocation()).toEqual({ latitude: 64.15, longitude: -21.94, name: 'Reykjavík, Hauptstadtregion, Island', countryCode: 'IS', timeZone: 'Atlantic/Reykjavik' });
    });

    it('starts in the browser language, sets <html lang>, and saves a picked language', async () => {
      vi.stubGlobal('navigator', {
        language: 'de-DE',
        geolocation: { getCurrentPosition: (s: (p: unknown) => void) => s({ coords: { latitude: 1, longitude: 2 } }) },
      });
      render(<SunTracker />);
      await waitFor(() => expect(screen.getByText('Sonnenuntergang')).toBeInTheDocument());
      expect(document.documentElement.lang).toBe('de');

      fireEvent.click(screen.getByRole('button', { name: 'Français' }));
      expect(await screen.findByText('Coucher du soleil')).toBeInTheDocument();
      expect(document.documentElement.lang).toBe('fr');
      expect(localStorage.getItem('language')).toBe('fr');
    });
  });

  describe('info cards (ROADMAP item 95)', () => {
    const RAVENSBURG = { latitude: 47.78, longitude: 9.61 };
    const NOON = new Date('2026-09-30T11:00:00Z');
    const advance = (ms: number) => act(() => {
      vi.advanceTimersByTime(ms);
    });
    // Every fish a perch; Math.random at 0.1 passes every spawn chance.
    const start = () => {
      window.history.pushState({}, '', '/?fish=perch');
      vi.setSystemTime(NOON);
      saveManualLocation(RAVENSBURG.latitude, RAVENSBURG.longitude, 'Ravensburg');
      render(<SunTracker />);
      advance(300);
    };
    const card = () => screen.queryByTestId('scene-info-card');
    // Item 116: a pointer tap (detail 1); two of them in 350 ms are a double tap.
    const tap = (el: Element, init: MouseEventInit = {}) => fireEvent.click(el, { ...init, detail: 1 });
    const doubleTap = (el: Element, init: MouseEventInit = {}) => {
      tap(el, init);
      fireEvent.click(el, { ...init, detail: 2 });
    };

    beforeEach(() => {
      vi.useFakeTimers();
      global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      window.history.pushState({}, '', '/');
    });

    it('a tap on a fish opens its card with a ring on the fish; a tap outside closes it', () => {
      start();
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      for (let t = 0; t < 10; t++) advance(1000);
      const fishHit = [...screen.getAllByTestId('scene-hit')]
        .find(hit => hit.closest('[aria-hidden="true"]')!.querySelector('[data-testid="scene-fish"]'))!;
      doubleTap(fishHit, { clientX: 150, clientY: 650 });
      expect(screen.getByRole('dialog', { name: 'Perch' })).toHaveTextContent('Its dark stripes hide the perch among water plants.');
      expect(fishHit.querySelector('[data-testid="scene-info-ring"]')).not.toBeNull();
      // Item 107: the card and the ring have the tier colour. Item 113: a perch (14 % of the day
      // fish) is frequent.
      expect(card()!.className).toContain('border-tier-frequent/50');
      expect(fishHit.querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-frequent/80');
      // The fish swims on: its wrapper keeps the crossing animation.
      expect(fishHit.closest<HTMLElement>('[aria-hidden="true"]')!.style.animation).toContain('moveAcrossX');

      fireEvent.pointerDown(document.body);
      expect(card()).toBeNull();
      expect(screen.queryByTestId('scene-info-ring')).toBeNull();
    });

    it('the sun still counts 7 taps for the sunglasses; a double tap opens its card (item 116)', () => {
      start();
      const sun = screen.getByRole('button', { name: 'Sun' });
      doubleTap(sun);
      const sunCard = screen.getByRole('dialog', { name: 'Sun' });
      expect(sunCard).toHaveTextContent(/Sunset in \d+ h \d+ min/);
      expect(screen.queryByTestId('sun-sunglasses')).toBeNull();
      // Item 158: taps 3 to 7 of the sequence (real taps with the pointerdown, 500 ms apart) only
      // count: the card stays as it is.
      for (let i = 0; i < 5; i++) {
        fireEvent.pointerDown(sun);
        tap(sun);
        advance(500);
      }
      expect(screen.getByTestId('sun-sunglasses')).toBeInTheDocument();
      expect(card()).toBe(sunCard);
    });

    it('one tap opens no card and collects no badge and shows no ring; a double tap opens and collects (item 116)', () => {
      // No test link (`?fish=` pauses the collection, item 112).
      vi.setSystemTime(NOON);
      saveManualLocation(RAVENSBURG.latitude, RAVENSBURG.longitude, 'Ravensburg');
      render(<SunTracker />);
      advance(300);
      const sun = screen.getByRole('button', { name: 'Sun' });
      tap(sun);
      expect(card()).toBeNull();
      expect(localStorage.getItem('collection')).toBeNull();
      expect(sun.querySelector('[data-testid="scene-info-ring"]')).toBeNull();
      // After a pause: a new tap sequence (item 158; within SUN_TAP_GAP_MS these are taps 2 and 3).
      advance(SUN_TAP_GAP_MS + 100);
      doubleTap(sun);
      expect(screen.getByRole('dialog', { name: 'Sun' })).toBeInTheDocument();
      expect(Object.keys(JSON.parse(localStorage.getItem('collection')!))).toEqual(['sun:midday']); // item 138: no base badge
    });

    it('a keyboard click on the sun (Enter, Space) opens its card at once (item 116)', () => {
      start();
      fireEvent.click(screen.getByRole('button', { name: 'Sun' }), { detail: 0 });
      expect(screen.getByRole('dialog', { name: 'Sun' })).toBeInTheDocument();
    });

    it('a tap on the UFO opens its easter egg card with the ultra rare ring (item 113)', () => {
      window.history.pushState({}, '', '/?egg=ufo');
      vi.setSystemTime(NOON);
      saveManualLocation(RAVENSBURG.latitude, RAVENSBURG.longitude, 'Ravensburg');
      render(<SunTracker />);
      advance(300);
      const ufo = screen.getByTestId('ufo');
      doubleTap(ufo.querySelector('[data-testid="scene-hit"]')!, { clientX: 100, clientY: 130 });
      const dialog = screen.getByRole('dialog', { name: 'UFO' });
      expect(dialog).toHaveTextContent('Easter egg');
      expect(dialog).toHaveTextContent('Ultra rare · 0.5 % per night');
      expect(card()!.className).toContain('border-tier-ultra-rare/50');
      expect(ufo.querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-ultra-rare/80');
    });

    it('puts the event tap areas first in the scene, with no z-index, so the scene things take their own taps (item 123)', () => {
      window.history.pushState({}, '', '/?egg=ufo');
      vi.setSystemTime(NOON);
      saveManualLocation(RAVENSBURG.latitude, RAVENSBURG.longitude, 'Ravensburg');
      render(<SunTracker />);
      advance(300);
      const layer = screen.getByTestId('event-sky-taps');
      expect(layer.parentElement!.hasAttribute('data-share-root')).toBe(true);
      expect(layer.parentElement!.firstElementChild).toBe(layer);
      expect(layer.className).not.toMatch(/\bz-/);
      expect(layer.style.zIndex).toBe('');
      for (const thing of [screen.getByTestId('ufo'), screen.getByTestId('sun-visualization'), screen.getAllByTestId('scene-hit')[0]]) {
        expect(layer.compareDocumentPosition(thing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    it('closes the card after 15 s', () => {
      start();
      doubleTap(screen.getByRole('button', { name: 'Sun' }));
      expect(card()).not.toBeNull();
      advance(15_000);
      expect(card()).toBeNull();
    });
  });
  describe('collection badges (ROADMAP items 112, 114)', () => {
    const unlocked = () => screen.queryByTestId('badge-unlocked');
    // The fade-out timer starts after the card re-renders, so two steps.
    const closeCard = () => {
      act(() => {
        vi.advanceTimersByTime(SHOW_MS);
      });
      act(() => {
        vi.advanceTimersByTime(FADE_OUT_MS);
      });
    };
    const tapSeahorse = () => act(() => {
      visProps.current!.onSceneInfo!({ type: 'fish', kind: 'seahorse' }, { x: 100, y: 600 }, 'ring');
    });
    const tapCumulus = () => act(() => {
      visProps.current!.onSceneInfo!({ type: 'cloud', cloudType: 'Cu', band: 'low' }, { x: 100, y: 200 }, 'ring');
    });
    // A saved place loads at once, and a fresh `visProps` cannot hold the props of an earlier
    // test's app: the tap reached no scene now and then in CI.
    beforeEach(() => {
      visProps.current = null;
      saveManualLocation(47.78, 9.61, 'Ravensburg');
    });
    afterEach(() => {
      window.history.pushState({}, '', '/');
    });

    it('a tap on a fish collects its badge with one "Badge unlocked" card, no toast; a second tap adds nothing', () => {
      vi.useFakeTimers();
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      tapSeahorse();
      expect(JSON.parse(localStorage.getItem('collection')!)).toEqual({ 'fish:seahorse': expect.any(String) });
      expect(unlocked()).toHaveTextContent('Badge unlocked: Seahorse, Rare');
      expect(unlocked()).toHaveTextContent(`1 / ${BADGES.length}`);
      expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Seahorse') }));
      closeCard();
      expect(unlocked()).toBeNull();
      tapSeahorse();
      expect(unlocked()).toBeNull();
      vi.useRealTimers();
    });

    it('a double tap on a sky optic opens its card and collects its badge (item 148)', () => {
      vi.useFakeTimers();
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      act(() => {
        visProps.current!.onSceneInfo!({ type: 'optic', kind: 'halo' }, { x: 200, y: 300 }, 'optic:halo');
      });
      expect(screen.getByRole('dialog', { name: '22° halo' })).toHaveTextContent('Uncommon');
      expect(visProps.current!.infoRing).toBe('optic:halo');
      expect(JSON.parse(localStorage.getItem('collection')!)).toEqual({ 'optic:halo': expect.any(String) });
      expect(unlocked()).toHaveTextContent('Badge unlocked: 22° halo, Uncommon');
      vi.useRealTimers();
    });

    it('a double tap on a decorative plane opens its card and shows no "Badge unlocked" (item 178)', () => {
      vi.useFakeTimers();
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      act(() => {
        visProps.current!.onSceneInfo!({ type: 'plane', contrail: 'short' }, { x: 200, y: 300 }, 'plane');
      });
      expect(screen.getByRole('dialog', { name: 'Airliner' })).toBeInTheDocument();
      expect(unlocked()).toBeNull();
      expect(localStorage.getItem('collection')).toBeNull();
      vi.useRealTimers();
    });

    it('two new badges show one after the other, not stacked', () => {
      vi.useFakeTimers();
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      tapSeahorse();
      tapCumulus();
      expect(screen.getAllByTestId('badge-unlocked')).toHaveLength(1);
      expect(unlocked()).toHaveTextContent('Seahorse');
      closeCard();
      expect(screen.getAllByTestId('badge-unlocked')).toHaveLength(1);
      expect(unlocked()).toHaveTextContent('Badge unlocked: Cumulus');
      expect(unlocked()).toHaveTextContent(`2 / ${BADGES.length}`);
      closeCard();
      expect(unlocked()).toBeNull();
      vi.useRealTimers();
    });

    it('a tap on the card opens the collection view', () => {
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      tapSeahorse();
      fireEvent.click(screen.getByRole('button', { name: 'Show in the collection' }));
      expect(screen.getByRole('dialog', { name: 'Collection' })).toHaveTextContent('Seahorse');
      expect(unlocked()).toBeNull();
    });

    it('a tap on a decorative satellite dot opens its card and collects no badge', () => {
      vi.useFakeTimers();
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      act(() => {
        visProps.current!.onSceneInfo!({ type: 'satelliteDot' }, { x: 200, y: 200 }, 'satellite-dot-1');
      });
      expect(screen.getByText(/This dot stands for the satellites/)).toBeInTheDocument();
      expect(localStorage.getItem('collection')).toBeNull();
      expect(screen.queryAllByTestId('badge-unlocked')).toHaveLength(0);
    });

    it('a sun tap at midday collects only "sun:midday", with one card (items 115, 138)', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-09-30T11:00:00Z')); // 13:00 in Ravensburg: midday
        render(<SunTracker />);
        expect(visProps.current).toBeTruthy();
        act(() => {
          visProps.current!.onSceneInfo!({ type: 'sun' }, { x: 200, y: 200 }, 'sun');
        });
        expect(Object.keys(JSON.parse(localStorage.getItem('collection')!))).toEqual(['sun:midday']);
        expect(screen.getAllByTestId('badge-unlocked')).toHaveLength(1);
        expect(unlocked()).toHaveTextContent('Badge unlocked: Midday sun');
        expect(unlocked()).toHaveTextContent(`1 / ${BADGES.length}`);
        closeCard();
        expect(unlocked()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('a moon, terrain or satellite tap collects only its state badge (item 138)', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-09-30T11:00:00Z'));
        render(<SunTracker />);
        expect(visProps.current).toBeTruthy();
        act(() => {
          visProps.current!.onSceneInfo!({ type: 'moon' }, { x: 200, y: 200 }, 'moon');
        });
        act(() => {
          visProps.current!.onSceneInfo!({ type: 'satellite', id: 25544, name: 'ISS (ZARYA)' }, { x: 200, y: 200 }, 'sat');
        });
        // No ridge data in this test: the terrain tap has no band, so it collects nothing.
        act(() => {
          visProps.current!.onSceneInfo!({ type: 'terrain', azimuth: 90 }, { x: 200, y: 500 }, 'terrain');
        });
        const ids = Object.keys(JSON.parse(localStorage.getItem('collection')!));
        expect(ids).toHaveLength(2);
        expect(ids[0]).toMatch(/^moon:/);
        expect(ids[1]).toBe('satellite:iss');
        expect(unlocked()).toHaveTextContent(`1 / ${BADGES.length}`);
        closeCard();
        expect(unlocked()).toHaveTextContent('Badge unlocked: International Space Station');
        expect(unlocked()).toHaveTextContent(`2 / ${BADGES.length}`);
        closeCard();
        expect(unlocked()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('a sun tap in the twilight collects nothing (item 138)', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-09-30T17:35:00Z')); // 19:35 in Ravensburg: after sunset, in the twilight
        render(<SunTracker />);
        expect(visProps.current).toBeTruthy();
        act(() => {
          visProps.current!.onSceneInfo!({ type: 'sun' }, { x: 200, y: 200 }, 'sun');
        });
        expect(localStorage.getItem('collection')).toBeNull();
        expect(unlocked()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('collects nothing with a test link (?egg=ufo)', () => {
      window.history.pushState({}, '', '/?egg=ufo');
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      tapSeahorse();
      // Seven sun taps: the sunglasses, which would count without the link.
      act(() => {
        for (let i = 0; i < 7; i++) visProps.current!.onSunTap!(bodyClick());
      });
      expect(visProps.current!.sunglasses).toBe(true);
      expect(localStorage.getItem('collection')).toBeNull();
      expect(unlocked()).toBeNull();
    });

    it('on Christmas Eve after sunset, Santa flies without the snow and his badge counts on a double tap (item 123)', () => {
      vi.useFakeTimers();
      // 21:00 UTC: about 5.5 h after sunset in Ravensburg (the tests run in UTC).
      vi.setSystemTime(new Date('2026-12-24T21:00:00Z'));
      try {
        render(<SunTracker />);
        expect(visProps.current).toMatchObject({ calendarEvent: null, santa: true });
        // Item 123: flying is not enough; the double tap on Santa (CalendarEggs' useDoubleTap) collects.
        expect(localStorage.getItem('collection')).toBeNull();
        act(() => visProps.current!.onSceneInfo!({ type: 'egg', kind: 'santa' }, { x: 100, y: 100 }, 'egg-santa'));
        expect(JSON.parse(localStorage.getItem('collection')!)).toHaveProperty('egg:santa');
        expect(JSON.parse(localStorage.getItem('collection')!)).not.toHaveProperty('egg:christmas');
        expect(unlocked()).toHaveTextContent('Badge unlocked: Santa Claus'); // item 114
      } finally {
        vi.useRealTimers();
      }
    });

    it('an egg that shows does not count; a double tap on it counts once; an egg that does not show counts nothing (item 123)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-13T12:00:00Z')); // Friday the 13th
      try {
        render(<SunTracker />);
        expect(visProps.current).toMatchObject({ calendarEvent: 'friday-13' });
        expect(localStorage.getItem('collection')).toBeNull();
        const tapEgg = (kind: EggCardKind) => act(() => visProps.current!.onSceneInfo!({ type: 'egg', kind }, { x: 100, y: 100 }, `egg-${kind}`));
        tapEgg('dragon');
        tapEgg('fireworks');
        expect(localStorage.getItem('collection')).toBeNull();
        tapEgg('blackCat');
        tapEgg('blackCat');
        expect(Object.keys(JSON.parse(localStorage.getItem('collection')!))).toEqual(['egg:friday13']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('a double tap on the midnight ghost counts its badge at 00:00 only', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-12T00:00:30Z')); // TZ is UTC in the tests
      try {
        const { unmount } = render(<SunTracker />);
        const tapGhost = () => act(() => visProps.current!.onSceneInfo!({ type: 'egg', kind: 'ghost' }, { x: 100, y: 100 }, 'egg-ghost'));
        tapGhost();
        expect(Object.keys(JSON.parse(localStorage.getItem('collection')!))).toEqual(['egg:ghost']);
        unmount();
        localStorage.removeItem('collection');
        vi.setSystemTime(new Date('2026-11-12T00:01:00Z'));
        render(<SunTracker />);
        tapGhost();
        expect(JSON.parse(localStorage.getItem('collection') ?? '{}')).not.toHaveProperty('egg:ghost');
      } finally {
        vi.useRealTimers();
      }
    });

    it('a double tap on the iceberg counts its badge below 0 °C; a warm day shows none (item 161)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-12-10T11:00:00Z'));
      global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current: { temperature_2m: -5, weather_code: 0 } }) })) as unknown as typeof fetch;
      try {
        const { unmount } = render(<SunTracker />);
        await act(() => vi.advanceTimersByTimeAsync(300));
        const hit = screen.getByTestId('temperature-iceberg').querySelector('[data-testid="scene-hit"]')!;
        fireEvent.click(hit, { detail: 1 });
        fireEvent.click(hit, { detail: 2 });
        expect(screen.getByRole('dialog', { name: 'Iceberg' })).toHaveTextContent('Easter egg');
        expect(Object.keys(JSON.parse(localStorage.getItem('collection')!))).toEqual(['egg:iceberg']);
        unmount();
        localStorage.clear();
        global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ current: { temperature_2m: 20, weather_code: 0 } }) })) as unknown as typeof fetch;
        render(<SunTracker />);
        await act(() => vi.advanceTimersByTimeAsync(300));
        expect(screen.queryByTestId('temperature-iceberg')).toBeNull();
        act(() => visProps.current!.onSceneInfo!({ type: 'egg', kind: 'iceberg' }, { x: 100, y: 100 }, 'egg-iceberg'));
        expect(JSON.parse(localStorage.getItem('collection') ?? '{}')).not.toHaveProperty('egg:iceberg');
      } finally {
        vi.useRealTimers();
      }
    });

    it('the March equinox day is the equinox until noon, then Nowruz, each with its own badge (item 138)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2027-03-20T10:00:00Z')); // 11:00 in Ravensburg
      try {
        const { unmount } = render(<SunTracker />);
        expect(visProps.current).toMatchObject({ calendarEvent: 'equinox' });
        act(() => visProps.current!.onSceneInfo!({ type: 'egg', kind: 'equinox' }, { x: 100, y: 100 }, 'egg-season'));
        expect(Object.keys(JSON.parse(localStorage.getItem('collection')!))).toEqual(['egg:equinox']);
        unmount();
        vi.setSystemTime(new Date('2027-03-20T12:00:00Z')); // 13:00
        render(<SunTracker />);
        expect(visProps.current).toMatchObject({ calendarEvent: 'nowruz' });
        act(() => visProps.current!.onSceneInfo!({ type: 'egg', kind: 'nowruz' }, { x: 100, y: 100 }, 'egg-season'));
        expect(Object.keys(JSON.parse(localStorage.getItem('collection')!))).toEqual(['egg:equinox', 'egg:nowruz']);
        expect(screen.getAllByTestId('badge-unlocked')).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('the April Fools sun counts on a double tap on the sun once the scene reported it (item 123)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2027-04-01T10:00:00Z'));
      try {
        render(<SunTracker />);
        const tapSun = () => act(() => visProps.current!.onSceneInfo!({ type: 'sun' }, { x: 200, y: 200 }, 'sun'));
        tapSun();
        expect(JSON.parse(localStorage.getItem('collection')!)).not.toHaveProperty('egg:aprilFools');
        act(() => visProps.current!.onEggShown!('aprilFools'));
        expect(JSON.parse(localStorage.getItem('collection')!)).not.toHaveProperty('egg:aprilFools');
        tapSun();
        expect(JSON.parse(localStorage.getItem('collection')!)).toHaveProperty('egg:aprilFools');
      } finally {
        vi.useRealTimers();
      }
    });

    it('?egg=santa forces Santa without the snow, and collects nothing', () => {
      window.history.pushState({}, '', '/?egg=santa');
      render(<SunTracker />);
      expect(visProps.current).toMatchObject({ santa: true });
      expect(visProps.current!.calendarEvent).not.toBe('christmas');
      expect(localStorage.getItem('collection')).toBeNull();
    });

    it('7 quick moon taps start the disco and collect its badge; fewer or slow taps do not', () => {
      let now = 1_000_000;
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      const tapMoon = (gapMs: number) => act(() => {
        now += gapMs;
        visProps.current!.onMoonTap!(bodyClick());
      });
      // Six quick taps, then a pause longer than 1.5 s: the count starts again.
      for (let i = 0; i < 6; i++) tapMoon(1000);
      tapMoon(1501);
      expect(screen.queryByTestId('disco-sky')).toBeNull();
      // Six more quick taps make 7 in a row.
      for (let i = 0; i < 6; i++) tapMoon(1500);
      expect(screen.getByTestId('disco-sky')).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem('collection')!)).toEqual({ 'egg:disco': expect.any(String) });
      vi.restoreAllMocks();
    });

    // Item 140: the winter solstice day is midwinter: its own badge, and the longest-night pill after sunset.
    it('on the winter solstice day the pill opens midwinter, its badge counts on a double tap, and the night starts at sunset', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-12-21T11:00:00Z'));
      try {
        render(<SunTracker />);
        expect(visProps.current).toMatchObject({ calendarEvent: 'solstice-shortest', longestNight: false });
        const tapEgg = (kind: EggCardKind) => act(() => visProps.current!.onSceneInfo!({ type: 'egg', kind }, { x: 100, y: 100 }, 'egg-season'));
        tapEgg('solstice');
        expect(localStorage.getItem('collection')).toBeNull();
        tapEgg('midwinter');
        expect(Object.keys(JSON.parse(localStorage.getItem('collection')!))).toEqual(['egg:midwinter']);
        expect(unlocked()).toHaveTextContent('Badge unlocked: Midwinter');
        // 20:00 UTC: after the Ravensburg sunset (about 15:30 UTC).
        act(() => vi.setSystemTime(new Date('2026-12-21T20:00:00Z')));
        act(() => vi.advanceTimersByTime(31_000));
        expect(visProps.current).toMatchObject({ calendarEvent: 'solstice-shortest', longestNight: true });
      } finally {
        vi.useRealTimers();
      }
    });

    it('?egg=midwinter forces the winter solstice day (item 140), and collects nothing', () => {
      window.history.pushState({}, '', '/?egg=midwinter');
      render(<SunTracker />);
      expect(visProps.current).toMatchObject({ calendarEvent: 'solstice-shortest' });
      act(() => visProps.current!.onSceneInfo!({ type: 'egg', kind: 'midwinter' }, { x: 100, y: 100 }, 'egg-season'));
      expect(localStorage.getItem('collection')).toBeNull();
    });

    it('?egg=<festival> forces that festival (item 118), and collects nothing', () => {
      window.history.pushState({}, '', '/?egg=loyKrathong');
      render(<SunTracker />);
      expect(visProps.current).toMatchObject({ calendarEvent: 'loy-krathong' });
      expect(localStorage.getItem('collection')).toBeNull();
    });

    it('the InfoPanel button opens the collection; the close button closes it', () => {
      render(<SunTracker />);
      expect(visProps.current).toBeTruthy();
      tapSeahorse();
      fireEvent.click(screen.getByRole('button', { name: 'Collection' }));
      const view = screen.getByRole('dialog', { name: 'Collection' });
      expect(view).toHaveTextContent('Seahorse');
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog', { name: 'Collection' })).toBeNull();
    });
  });
  describe('satellites (ROADMAP item 97)', () => {
    const SYDNEY = issFixture.reference.observer;
    // The top of a known ISS pass (heavens-above, see the fixture).
    const PASS_TOP = new Date(issFixture.reference.passes[0].max);
    const flush = () => act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    beforeEach(async () => {
      // Loaded once here, so the app's dynamic import() resolves at once under fake timers.
      await import('satellite.js');
      vi.useFakeTimers();
      vi.setSystemTime(PASS_TOP);
      global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
      saveManualLocation(SYDNEY.latitude, SYDNEY.longitude, 'Sydney');
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      vi.mocked(loadSatelliteData).mockReset();
      vi.mocked(loadSatelliteData).mockResolvedValue(null);
    });

    it('tracks by default: the ISS crosses the sky and has a card', async () => {
      vi.mocked(loadSatelliteData).mockResolvedValue([issFixture.omm as unknown as GpRecord]);
      // jsdom lays nothing out: give the scene a phone size, so the ISS gets a place on it.
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(390);
      vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(844);
      render(<SunTracker />);
      for (let i = 0; i < 3; i++) await flush();
      expect(visProps.current?.satellites).toEqual([expect.objectContaining({ id: 25544, visible: true })]);
      fireEvent.click(screen.getByRole('button', { name: 'ISS (ZARYA)' }));
      const dialog = screen.getByRole('dialog', { name: 'Satellite' });
      expect(dialog).toHaveTextContent('ISS (ZARYA)');
      expect(dialog).toHaveTextContent(/Altitude\s*4\d\d km/);
      expect(dialog).toHaveTextContent(/Speed\s*7\.\d km\/s/);
      expect(dialog).toHaveTextContent('Next pass');
    });

    it('the switch turns the tracking off and saves it; then the decorative dots come back', async () => {
      render(<SunTracker />);
      await flush();
      const toggle = screen.getByRole('switch', { name: 'Satellite tracking' });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      fireEvent.click(toggle);
      expect(localStorage.getItem('satellite-tracking')).toBe('off');
      expect(screen.getByRole('switch', { name: 'Satellite tracking' })).toHaveAttribute('aria-checked', 'false');
      expect(visProps.current?.satellites).toBeNull();
      expect(loadSatelliteData).toHaveBeenCalledTimes(1);
    });

    describe('ISS passes (Lutz, 2026-10-06)', () => {
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
      const name = 'ISS passes';
      // 12 min before the evening pass of 7 Oct (09:46:27 UTC, NW, up to 23°).
      const BEFORE_PASS = new Date('2026-10-07T09:34:30Z');

      beforeEach(() => {
        shown.length = 0;
        FakeNotification.permission = 'default';
        FakeNotification.answer = 'granted';
        vi.stubGlobal('Notification', FakeNotification);
        vi.setSystemTime(BEFORE_PASS);
        vi.mocked(loadSatelliteData).mockResolvedValue([issFixture.omm as unknown as GpRecord]);
      });
      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('is off by default; on, it reminds 10 min before a visible ISS pass, also with the tracking off', async () => {
        localStorage.setItem('satellite-tracking', 'off');
        render(<SunTracker />);
        await flush();
        const button = screen.getByRole('button', { name });
        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(button.querySelector('[data-testid="premium-badge"]')).toBeInTheDocument();
        expect(loadSatelliteData).not.toHaveBeenCalled();
        fireEvent.click(button);
        for (let i = 0; i < 3; i++) await flush();
        expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
        expect(localStorage.getItem('iss-pass-reminder')).toBe('on');
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'ISS pass reminder on' }));
        expect(loadSatelliteData).toHaveBeenCalled();
        // No satellites in the sky with the tracking off.
        expect(visProps.current?.satellites).toBeNull();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3 * 60_000);
        });
        expect(shown).toHaveLength(1);
        expect(shown[0]).toMatch(/^ISS visible at \d{2}:\d{2}, from NW to NW, up to 23°$/);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(10 * 60_000);
        });
        expect(shown).toHaveLength(1);
        // 13 min of 1 s ticks re-render SunTracker 780 times: slow on the CI runner.
      }, 30_000);

      it('stays off with a hint when the permission is denied', async () => {
        FakeNotification.answer = 'denied';
        render(<SunTracker />);
        await flush();
        fireEvent.click(screen.getByRole('button', { name }));
        await flush();
        expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
        expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Notifications are blocked' }));
      });
    });
  });

  describe('live planes (ROADMAP item 96)', () => {
    const radarCalls = () => vi.mocked(global.fetch).mock.calls.filter(([url]) => String(url).startsWith('/api/planes'));
    beforeEach(() => {
      saveManualLocation(47.781, 9.612, 'Ravensburg');
      global.fetch = vi.fn(async (url: RequestInfo | URL) => (String(url).startsWith('/api/planes')
        ? new Response(JSON.stringify({ now: 1, aircraft: [] }), { status: 200 })
        : Promise.reject(new Error('offline')))) as unknown as typeof fetch;
    });

    it('is off by default; the switch saves its setting as live-planes, and the next start keeps it', async () => {
      const first = render(<SunTracker />);
      const toggle = await screen.findByRole('switch', { name: 'Live planes' });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(radarCalls()).toHaveLength(0);
      fireEvent.click(toggle);
      expect(localStorage.getItem('live-planes')).toBe('on');
      await waitFor(() => expect(radarCalls()[0]?.[0]).toBe('/api/planes?lat=47.8&lon=9.6'));
      first.unmount();

      render(<SunTracker />);
      const again = await screen.findByRole('switch', { name: 'Live planes' });
      expect(again).toHaveAttribute('aria-checked', 'true');
      fireEvent.click(again);
      expect(localStorage.getItem('live-planes')).toBe('off');
      expect(screen.getByRole('switch', { name: 'Live planes' })).toHaveAttribute('aria-checked', 'false');
    });

    // Item 155: the status line under the switch and the Sentry tag `live-planes`.
    it('shows the status under the switch and sets the live-planes tag: off, ok-<shown>/<nearby>, error', async () => {
      const ac = (hex: string) => ({ hex, callsign: null, type: null, altM: 10_000, speedKt: 400, track: 90, lat: 47.5, lon: 9.6, ageSec: 0 });
      const tags = () => vi.mocked(setTag).mock.calls.filter(([name]) => name === 'live-planes').map(([, value]) => value);
      const first = render(<SunTracker />);
      const toggle = await screen.findByRole('switch', { name: 'Live planes' });
      expect(tags()).toEqual(['off']);
      expect(screen.queryByTestId('live-planes-status')).toBeNull();
      global.fetch = vi.fn(async (url: RequestInfo | URL) => (String(url).startsWith('/api/planes')
        ? new Response(JSON.stringify({ now: 1, aircraft: [ac('a1'), ac('a2')] }), { status: 200 })
        : Promise.reject(new Error('offline')))) as unknown as typeof fetch;
      fireEvent.click(toggle);
      // In jsdom the scene has no size, so no live plane is drawn.
      await waitFor(() => expect(screen.getByTestId('live-planes-status').textContent).toMatch(/^2 nearby · 0 in view/));
      expect(tags()).toEqual(['off', 'loading', 'ok-0/2']);
      fireEvent.click(toggle);
      expect(screen.queryByTestId('live-planes-status')).toBeNull();
      expect(tags().at(-1)).toBe('off');
      first.unmount();

      global.fetch = vi.fn(async (url: RequestInfo | URL) => (String(url).startsWith('/api/planes')
        ? new Response('', { status: 502 })
        : Promise.reject(new Error('offline')))) as unknown as typeof fetch;
      render(<SunTracker />);
      fireEvent.click(await screen.findByRole('switch', { name: 'Live planes' }));
      await waitFor(() => expect(screen.getByTestId('live-planes-status')).toHaveTextContent('Live radar unavailable'));
      expect(tags().at(-1)).toBe('error');
    });

    // Item 164: a red icon and a refresh when the feed does not come.
    it('in error: a red icon and a refresh that asks at once; with an answer the icon goes (item 164)', async () => {
      const failing = vi.fn(async (url: RequestInfo | URL) => (String(url).startsWith('/api/planes')
        ? new Response('', { status: 502 })
        : Promise.reject(new Error('offline')))) as unknown as typeof fetch;
      global.fetch = failing;
      render(<SunTracker />);
      fireEvent.click(await screen.findByRole('switch', { name: 'Live planes' }));
      const icon = await screen.findByRole('img', { name: 'Live radar unavailable' });
      expect(icon).toHaveClass('text-red-400');
      global.fetch = vi.fn(async (url: RequestInfo | URL) => (String(url).startsWith('/api/planes')
        ? new Response(JSON.stringify({ now: 1, aircraft: [] }), { status: 200 })
        : Promise.reject(new Error('offline')))) as unknown as typeof fetch;
      fireEvent.click(screen.getByRole('button', { name: 'Refresh live planes' }));
      // At once, not at the next 15 s poll.
      expect(radarCalls()).toHaveLength(1);
      await waitFor(() => expect(screen.queryByRole('img', { name: 'Live radar unavailable' })).toBeNull());
      expect(screen.getByTestId('live-planes-status')).toHaveTextContent('0 nearby · 0 in view');
      expect(screen.queryByRole('button', { name: 'Refresh live planes' })).toBeNull();
    });

    describe('satellite tracking status (item 164)', () => {
      const SYDNEY = issFixture.reference.observer;
      const PASS_TOP = new Date(issFixture.reference.passes[0].max);
      const tags = () => vi.mocked(setTag).mock.calls.filter(([name]) => name === 'satellites').map(([, value]) => value);
      const flush = () => act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      beforeEach(async () => {
        await import('satellite.js');
        vi.useFakeTimers();
        vi.setSystemTime(PASS_TOP);
        global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
        saveManualLocation(SYDNEY.latitude, SYDNEY.longitude, 'Sydney');
      });
      afterEach(() => {
        vi.useRealTimers();
        vi.mocked(loadSatelliteData).mockReset();
        vi.mocked(loadSatelliteData).mockResolvedValue(null);
        vi.mocked(getNextSatelliteTry).mockReset();
        vi.mocked(getNextSatelliteTry).mockReturnValue(null);
      });

      it('sets the satellites tag, shows the red icon without data, and a refresh brings the ISS', async () => {
        vi.mocked(loadSatelliteData).mockResolvedValue(null);
        // CelesTrak's wait runs: the line gives the next try, and the refresh waits.
        vi.mocked(getNextSatelliteTry).mockReturnValue(PASS_TOP.getTime() + 90 * 60_000);
        render(<SunTracker />);
        for (let i = 0; i < 3; i++) await flush();
        expect(tags().at(-1)).toBe('error');
        expect(screen.getByRole('img', { name: 'Satellite data unavailable' })).toHaveClass('text-red-400');
        expect(screen.getByTestId('satellite-status')).toHaveTextContent(/^Satellite data unavailable · next try at \d{2}:\d{2}$/);
        expect(screen.getByRole('button', { name: 'Refresh satellite data' })).toBeDisabled();

        // The wait is over: the refresh asks again and brings the ISS.
        vi.mocked(getNextSatelliteTry).mockReturnValue(null);
        const toggle = screen.getByRole('switch', { name: 'Satellite tracking' });
        fireEvent.click(toggle);
        expect(tags().at(-1)).toBe('off');
        fireEvent.click(toggle);
        for (let i = 0; i < 2; i++) await flush();
        expect(tags().at(-1)).toBe('error');
        vi.mocked(loadSatelliteData).mockResolvedValue([issFixture.omm as unknown as GpRecord]);
        const calls = vi.mocked(loadSatelliteData).mock.calls.length;
        fireEvent.click(screen.getByRole('button', { name: 'Refresh satellite data' }));
        expect(loadSatelliteData).toHaveBeenCalledTimes(calls + 1);
        for (let i = 0; i < 2; i++) await flush();
        expect(screen.queryByRole('img', { name: 'Satellite data unavailable' })).toBeNull();
        expect(screen.queryByTestId('satellite-status')).toBeNull();
        expect(tags().at(-1)).toBe('ok-1');
        // Set only when it changes.
        expect(tags().filter((tag, i, all) => tag === all[i - 1])).toEqual([]);
      });
    });

    it('starts off when the storage cannot be read', async () => {
      localStorage.setItem('live-planes', 'on');
      const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
      try {
        render(<SunTracker />);
        expect(await screen.findByRole('switch', { name: 'Live planes' })).toHaveAttribute('aria-checked', 'false');
      } finally {
        getItem.mockRestore();
      }
    });
  });
  it('says so when the compass gives no heading after a tap (item 176)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('DeviceOrientationEvent', function DeviceOrientationEvent() {});
    saveManualLocation(47.78, 9.61, 'Ravensburg');
    render(<SunTracker />);
    act(() => { vi.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByRole('button', { name: /enable compass/i }));
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Compass not available' }));
    act(() => { vi.advanceTimersByTime(2100); });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Compass not available' }));
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('weather after a failure or a place change (ROADMAP item 165)', () => {
    const forecastUrls = () =>
      vi.mocked(fetch).mock.calls.map(([url]) => String(url)).filter((url) => url.includes('api.open-meteo.com/v1/forecast'));
    const weatherToasts = () => vi.mocked(toast).mock.calls.filter(([arg]) => arg.title === 'Weather unavailable');

    afterEach(() => {
      vi.useRealTimers();
    });

    it('tries a failed weather answer again after 1, 2 and 5 min, then only at the 30-minute refresh', async () => {
      vi.useFakeTimers();
      saveManualLocation(47.78, 9.61, 'Ravensburg');
      render(<SunTracker />);
      await act(async () => { await vi.advanceTimersByTimeAsync(300); });
      expect(forecastUrls()).toHaveLength(1);
      expect(weatherToasts()).toHaveLength(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(59_000); });
      expect(forecastUrls()).toHaveLength(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
      expect(forecastUrls()).toHaveLength(2);
      expect(weatherToasts()).toHaveLength(1);

      // Then after 2 and 5 more minutes, and no more until the 30-minute refresh.
      await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
      expect(forecastUrls()).toHaveLength(3);
      await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
      expect(forecastUrls()).toHaveLength(4);
      await act(async () => { await vi.advanceTimersByTimeAsync(1_300_000); });
      expect(forecastUrls()).toHaveLength(4);
      await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
      expect(forecastUrls()).toHaveLength(5);
      // The failed 30-minute refresh starts no new series of retries.
      await act(async () => { await vi.advanceTimersByTimeAsync(600_000); });
      expect(forecastUrls()).toHaveLength(5);
      expect(weatherToasts()).toHaveLength(2);
    // 40 min of 1 s clock ticks with the whole SunTracker: about 5 s on a laptop under load.
    }, 30_000);

    it('drops the previous place\'s weather when it arrives after the new place\'s weather', async () => {
      let answerRavensburg: (response: unknown) => void = () => {};
      const answer = (temperature: number) => ({ ok: true, json: () => Promise.resolve({ current: { temperature_2m: temperature, weather_code: 0 } }) });
      global.fetch = vi.fn((url: string) => {
        if (!String(url).includes('api.open-meteo.com/v1/forecast')) return Promise.reject(new Error('offline'));
        if (String(url).includes('latitude=47.78')) return new Promise((resolve) => { answerRavensburg = resolve; });
        return Promise.resolve(answer(30));
      }) as unknown as typeof fetch;
      saveManualLocation(47.78, 9.61, 'Ravensburg');
      render(<SunTracker />);
      await waitFor(() => expect(forecastUrls()).toHaveLength(1));

      fireEvent.click(screen.getByRole('button', { name: /change location/i }));
      fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: '53.55' } });
      fireEvent.change(screen.getByLabelText(/longitude/i), { target: { value: '9.99' } });
      fireEvent.click(screen.getByRole('button', { name: /set location/i }));
      await screen.findByText('86°F');

      await act(async () => { answerRavensburg(answer(-5)); });
      expect(screen.getByText('86°F')).toBeInTheDocument();
      expect(screen.queryByText('23°F')).not.toBeInTheDocument();
    });
  });
});

// National days (utils/nationalDays): the country comes from InfoPanel's reverse-geocode answer.
describe('SunTracker national days', () => {
  // Item 116: two pointer taps on the first boat's tap wrapper.
  const doubleTapBoat = () => {
    const boat = screen.getAllByTestId('boat-bunting')[0].closest('[aria-hidden="true"]')!;
    fireEvent.click(boat, { detail: 1 });
    fireEvent.click(boat, { detail: 2 });
  };
  const BERLIN = { latitude: 52.52, longitude: 13.4 };
  const answer = (countryCode: string) => {
    global.fetch = vi.fn((url: string) => String(url).includes('bigdatacloud')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve({ city: 'Berlin', countryName: 'Germany', countryCode }) })
      : Promise.reject(new Error('offline'))) as unknown as typeof fetch;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T10:00:00Z')); // German Unity Day, noon in Berlin
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: BERLIN } as GeolocationPosition) } });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('dresses the boats with bunting in the detected country, and the badge counts on a double tap on a boat (item 123)', async () => {
    answer('DE');
    render(<SunTracker />);
    await waitFor(() => expect(screen.getAllByTestId('boat-bunting').length).toBeGreaterThan(0));
    expect(JSON.parse(localStorage.getItem('collection') ?? '{}')).not.toHaveProperty('egg:germanUnity');
    doubleTapBoat();
    expect(JSON.parse(localStorage.getItem('collection') ?? '{}')).toHaveProperty('egg:germanUnity');
    expect(screen.getByTestId('scene-info-card')).toHaveTextContent('Flag bunting');
  });

  it('shows no national egg in another country', async () => {
    answer('AT');
    render(<SunTracker />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('bigdatacloud')));
    await waitFor(() => expect(screen.getAllByTestId('scene-boat').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('boat-bunting')).toBeNull();
  });

  it('shows no national egg when the country is unknown (no answer)', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    render(<SunTracker />);
    await waitFor(() => expect(screen.getAllByTestId('scene-boat').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('boat-bunting')).toBeNull();
  });

  it('uses the searched place\'s country code, with no reverse-geocode call (item 130)', async () => {
    localStorage.setItem('manual-location', JSON.stringify({ ...BERLIN, name: 'Berlin, Germany', countryCode: 'DE' }));
    global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    render(<SunTracker />);
    await waitFor(() => expect(screen.getAllByTestId('boat-bunting').length).toBeGreaterThan(0));
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('bigdatacloud'));
  });

  it('?country=DE sets the country and counts no badge', async () => {
    window.history.pushState({}, '', '/?country=DE');
    global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    render(<SunTracker />);
    await waitFor(() => expect(screen.getAllByTestId('boat-bunting').length).toBeGreaterThan(0));
    expect(localStorage.getItem('collection')).toBeNull();
  });

  it('lights up the boats on Christmas Day, and the badge counts on a double tap on a boat (item 123)', async () => {
    vi.setSystemTime(new Date('2026-12-25T12:00:00Z'));
    answer('DE');
    render(<SunTracker />);
    await waitFor(() => expect(screen.getAllByTestId('christmas-bulb').length).toBeGreaterThan(0));
    expect(screen.getAllByTestId('boat-bunting')[0].getAttribute('data-shape')).toBe('lights');
    expect(JSON.parse(localStorage.getItem('collection') ?? '{}')).not.toHaveProperty('egg:christmas');
    doubleTapBoat();
    expect(JSON.parse(localStorage.getItem('collection') ?? '{}')).toHaveProperty('egg:christmas');
    expect(screen.getByTestId('scene-info-card')).toHaveTextContent('Christmas lights');
  });

  it('a new egg badge wins the tap: the boat badge comes on the next double tap (item 138)', async () => {
    vi.setSystemTime(new Date('2026-12-25T12:00:00Z'));
    answer('DE');
    render(<SunTracker />);
    await waitFor(() => expect(screen.getAllByTestId('christmas-bulb').length).toBeGreaterThan(0));
    const collected = () => Object.keys(JSON.parse(localStorage.getItem('collection') ?? '{}'));
    doubleTapBoat();
    expect(collected()).toEqual(['egg:christmas']);
    expect(screen.getAllByTestId('badge-unlocked')).toHaveLength(1);
    doubleTapBoat();
    expect(collected()).toHaveLength(2);
    expect(collected()[1]).toMatch(/^boat:/);
  });

  it('?egg=festaRepubblica flies the jets on any day and counts no badge', async () => {
    window.history.pushState({}, '', '/?egg=festaRepubblica');
    global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    render(<SunTracker />);
    await waitFor(() => expect(screen.getByTestId('national-jets')).toBeInTheDocument());
    expect(localStorage.getItem('collection')).toBeNull();
  });

});
