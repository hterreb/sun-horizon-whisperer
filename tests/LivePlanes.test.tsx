import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import SunVisualization from '../src/components/SunVisualization';
import { type LivePlanesState } from '../src/hooks/useLivePlanes';
import { type LiveAircraft } from '../src/utils/planeFeed';
import type { HorizonProfile } from '../src/utils/horizonUtils';

// ROADMAP item 96 (Premium): the live radar with a stubbed feed, in the real scene mapping.
// An 800 x 600 scene: the horizon at 65 % (390 px), the sun arc's scale up to 30 px.
const WIDTH = 800;
const HEIGHT = 600;
const PLACE = { lat: 47.781, lon: 9.612 };
const KM_PER_DEG = (6_371_000 * Math.PI) / 180 / 1000;
// 50 km due south at 10 km (speed 0, so the place does not move): azimuth 180°. Without a
// terrain profile the eye is 1.7 m above sea level: 11.12° up (curvature and refraction).
const south: LiveAircraft = {
  hex: 'a1b2c3', callsign: 'DLH4KL', type: 'A320', altM: 10_000, speedKt: 0, track: 0,
  lat: PLACE.lat - 50 / KM_PER_DEG, lon: PLACE.lon, ageSec: 0,
};
const feed = (aircraft: LiveAircraft[]): LivePlanesState => ({ feed: { now: 1_000, aircraft }, receivedAt: 1_000 });
const elevation = Math.atan((10_000 - 1.7 - (50_000 ** 2 / (2 * 6_371_000)) * 0.87) / 50_000);
const expectedY = 390 - Math.sin(elevation) * 360;

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
afterEach(() => {
  if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
});

const renderScene = (props: Partial<React.ComponentProps<typeof SunVisualization>> = {}) => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: WIDTH, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: HEIGHT, configurable: true });
  return render(
    <SunVisualization
      sunPosition={{ azimuth: 200, altitude: 30 }}
      moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
      sunPath={[]}
      moonPath={[]}
      timeOfDay="midday"
      weatherType="clear"
      latitude={PLACE.lat}
      longitude={PLACE.lon}
      livePlanes={feed([south])}
      {...props}
    />,
  );
};
const start = (plane: HTMLElement) => {
  const [, x, y] = plane.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/)!;
  return { x: Number(x), y: Number(y) };
};

describe('LivePlanes (ROADMAP item 96)', () => {
  it('puts an aircraft at its direction (x) and elevation angle (y)', () => {
    renderScene();
    const plane = screen.getByTestId('live-plane');
    expect(start(plane).x).toBeCloseTo(WIDTH * 0.5, 0); // due south: the middle of the 360° view
    expect(start(plane).y).toBeCloseTo(expectedY, 0);
  });

  it('moves each aircraft on with its speed and track, 4 times per second in steps under a pixel', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    try {
      const east = { ...south, speedKt: 450, track: 90 };
      renderScene({ livePlanes: feed([east]) });
      const plane = () => start(screen.getByTestId('live-plane'));
      const x0 = plane().x;
      act(() => { vi.advanceTimersByTime(250); });
      const x1 = plane().x;
      // South of the observer and flying east: facing south, east is on the left.
      expect(x1).toBeLessThan(x0);
      expect(x0 - x1).toBeLessThan(1);
      act(() => { vi.advanceTimersByTime(15_000); });
      // 450 kt for 15.25 s is 3.5 km: at 50 km about 4° of azimuth, 9 px of the 800 px 360° view.
      expect(x0 - plane().x).toBeGreaterThan(7);
      expect(x0 - plane().x).toBeLessThan(11);
      expect(screen.getByTestId('live-plane').getAnimations?.().length ?? 0).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('flashes the strobe at night from the same clock: one tick in every 2 s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    try {
      renderScene({ timeOfDay: 'night' });
      const shown: boolean[] = [];
      for (let i = 0; i < 8; i++) {
        act(() => { vi.advanceTimersByTime(250); });
        shown.push(screen.getByTestId('plane-strobe').style.opacity === '1');
      }
      expect(shown.filter(Boolean)).toHaveLength(1);
      expect(screen.getByTestId('plane-strobe').style.animation).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('follows the compass field of view', () => {
    const { rerender } = renderScene({ compassHeading: 180 });
    expect(start(screen.getByTestId('live-plane')).x).toBeCloseTo(WIDTH * 0.5, 0);
    rerender(
      <SunVisualization
        sunPosition={{ azimuth: 200, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[]} moonPath={[]} timeOfDay="midday" weatherType="clear" latitude={PLACE.lat} longitude={PLACE.lon}
        livePlanes={feed([south])} compassHeading={157.5}
      />,
    );
    // 22.5° right of the heading in a 90° field of view: three quarters across.
    expect(start(screen.getByTestId('live-plane')).x).toBeCloseTo(WIDTH * 0.75, 0);
  });

  it('hides an aircraft behind the terrain and below 1°', () => {
    const ridge: HorizonProfile = { angles: Array(360).fill(12), observerElevation: 450, eyeHeight: 1.7 };
    renderScene({ horizonProfile: ridge });
    expect(screen.queryByTestId('live-plane')).toBeNull();
    // 300 km away at 10 km: below the horizon.
    renderScene({ livePlanes: feed([{ ...south, lat: PLACE.lat - 300 / KM_PER_DEG, hex: 'ffffff' }]) });
    expect(screen.queryAllByTestId('live-plane')).toHaveLength(0);
  });

  it('draws the contrail of the forecast above 8 km only, along its way across the screen', () => {
    const east = { ...south, speedKt: 450, track: 90 };
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    renderScene({ contrail: 'medium', livePlanes: feed([east, { ...east, hex: 'b1b2b3', altM: 7_000 }]) });
    vi.useRealTimers();
    const trails = screen.getAllByTestId('live-plane-trail');
    expect(trails).toHaveLength(1);
    // Flying east, south of the observer: facing south, east is on the left, so it moves left
    // and its trail points right, behind it.
    expect(Math.abs(parseFloat(trails[0].style.transform.slice(7)))).toBeGreaterThan(3);
  });

  it('shows no live plane in fog, and only the lights at night', () => {
    const { unmount } = renderScene({ weatherType: 'fog' });
    expect(screen.queryByTestId('live-plane')).toBeNull();
    unmount();
    renderScene({ timeOfDay: 'night' });
    expect(screen.getByTestId('plane-strobe')).toBeTruthy();
  });

  it('opens the card with the callsign, the airline, the type, the altitude and the speed', () => {
    const onSceneInfo = vi.fn();
    renderScene({ onSceneInfo });
    const hit = screen.getByTestId('live-plane').querySelector<HTMLElement>('[data-testid="scene-hit"]')!.parentElement!;
    fireEvent.click(hit, { clientX: 10, clientY: 20 });
    expect(onSceneInfo).toHaveBeenCalledWith(
      { type: 'livePlane', callsign: 'DLH4KL', airline: 'Lufthansa', aircraftType: 'A320', altM: 10_000, speedKt: 0 },
      { x: 10, y: 20 }, 'live-a1b2c3',
    );
  });
});
