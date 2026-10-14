import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import SunVisualization from '../src/components/SunVisualization';
import LivePlanes from '../src/components/LivePlanes';
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

// Compass mode facing south by default: it shows every plane in the field of view, also a still
// one (item 110), and puts due south in the middle as the 360° view does.
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
      compassHeading={180}
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
      // 450 kt for 15.25 s is 3.5 km: at 50 km about 4° of azimuth, 36 px of the 800 px 90° view.
      expect(x0 - plane().x).toBeGreaterThan(28);
      expect(x0 - plane().x).toBeLessThan(44);
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

  it('hides an aircraft behind the terrain and below 5° (item 110)', () => {
    const ridge: HorizonProfile = { angles: Array(360).fill(12), observerElevation: 450, eyeHeight: 1.7 };
    renderScene({ horizonProfile: ridge });
    expect(screen.queryByTestId('live-plane')).toBeNull();
    // 300 km away at 10 km: below the horizon.
    renderScene({ livePlanes: feed([{ ...south, lat: PLACE.lat - 300 / KM_PER_DEG, hex: 'ffffff' }]) });
    expect(screen.queryAllByTestId('live-plane')).toHaveLength(0);
    // 120 km away at 10 km: 4.3° up, too near the horizon.
    renderScene({ livePlanes: feed([{ ...south, lat: PLACE.lat - 120 / KM_PER_DEG, hex: 'fffffe' }]) });
    expect(screen.queryAllByTestId('live-plane')).toHaveLength(0);
  });

  it('draws the contrail of the forecast above 8 km only', () => {
    const east = { ...south, speedKt: 450, track: 90 };
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    try {
      renderScene({ contrail: 'medium', livePlanes: feed([east, { ...east, hex: 'b1b2b3', altM: 7_000 }]) });
      act(() => { vi.advanceTimersByTime(10_000); });
      expect(screen.getAllByTestId('live-plane')).toHaveLength(2);
      expect(screen.getAllByTestId('live-plane-trail')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // Item 142: the trail is fixed in the sky.
  describe('contrails that stay in the sky (item 142)', () => {
    const east = { ...south, speedKt: 450, track: 90 };
    // The points of all trail paths, in drawing order, per sub-path ("M … L …").
    const subpaths = () => screen.queryAllByTestId('live-plane-trail').flatMap(trail =>
      [...trail.querySelectorAll('path')].flatMap(path => path.getAttribute('d')!.split('M').filter(Boolean).map(sub =>
        sub.split('L').map(pair => pair.split(' ').map(Number) as [number, number]))));
    // The trail's points, oldest first: the paths of the fade steps share their end points.
    const points = () => subpaths().flat().filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]);
    // The clock in ticks: one render per tick, as in the browser (one act would batch them all).
    const run = (ms: number) => {
      for (let i = 0; i < ms; i += 250) act(() => { vi.advanceTimersByTime(Math.min(250, ms - i)); });
    };
    const scene =(props: Partial<React.ComponentProps<typeof SunVisualization>> = {}) => (
      <SunVisualization
        sunPosition={{ azimuth: 200, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[]} moonPath={[]} timeOfDay="midday" weatherType="clear" latitude={PLACE.lat} longitude={PLACE.lon}
        contrail="medium" livePlanes={feed([east])} compassHeading={180}
        {...props}
      />
    );
    // The engine of a 15 px plane (50 km) that faces left: right of and below its middle.
    const ENGINE = { x: 0.04 * 15, y: 0.22 * 15 * 0.3 };

    it('draws no trail on the first frame; it grows from the plane\'s first place, and its points never move', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      try {
        renderScene({ contrail: 'medium', livePlanes: feed([east]) });
        const first = start(screen.getByTestId('live-plane'));
        expect(screen.getAllByTestId('live-plane-trail')).toHaveLength(1);
        expect(points()).toEqual([]);
        run(250);
        const [p0] = points();
        expect(p0[0]).toBeCloseTo(first.x + ENGINE.x, 0);
        expect(p0[1]).toBeCloseTo(first.y + ENGINE.y, 0);
        run(20_000);
        // The first point stays; the head is at the plane's engine now, left of the start.
        expect(points()[0]).toEqual(p0);
        const now = start(screen.getByTestId('live-plane'));
        const head = points()[points().length - 1];
        expect(head[0]).toBeCloseTo(now.x + ENGINE.x, 0);
        expect(head[1]).toBeCloseTo(now.y + ENGINE.y, 0);
        expect(now.x).toBeLessThan(first.x - 30);
        // A point every 5 s plus the head: 5 points, all on the plane's way.
        expect(points().length).toBeGreaterThanOrEqual(5);
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps each point at its sky place over a compass turn', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      try {
        const { rerender } = renderScene({ contrail: 'medium', livePlanes: feed([east]) });
        run(10_000);
        const before = points();
        rerender(scene({ compassHeading: 170 }));
        const after = points();
        expect(after).toHaveLength(before.length);
        // 10° in the 90° field of view of 800 px: every point 88.9 px to the right, none up or down.
        after.forEach(([x, y], i) => {
          expect(x - before[i][0]).toBeCloseTo(800 / 9, 0);
          expect(y).toBe(before[i][1]);
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps the trail when the plane goes behind a ridge, and lets it go after its life', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      try {
        const { rerender } = renderScene({ contrail: 'medium', livePlanes: feed([east]) });
        run(20_000);
        const trail = points();
        const ridge: HorizonProfile = { angles: Array(360).fill(12), observerElevation: 0, eyeHeight: 1.7 };
        rerender(scene({ horizonProfile: ridge }));
        run(1_000);
        expect(screen.queryByTestId('live-plane')).toBeNull();
        expect(points()).toEqual(trail);
        // Medium: 5 min. The older end fades first, then the trail goes.
        run(300_000 - 21_000 + 250);
        expect(points().length).toBeLessThan(trail.length);
        expect(points()[points().length - 1]).toEqual(trail[trail.length - 1]);
        run(20_000);
        expect(screen.queryAllByTestId('live-plane-trail')).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('when the radar is switched off, the planes go at once and their trails fade on their own clock', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      try {
        const { rerender } = renderScene({ contrail: 'medium', livePlanes: feed([east]) });
        run(20_000);
        const trail = points();
        rerender(scene({ livePlanes: null }));
        expect(screen.queryByTestId('live-plane')).toBeNull();
        expect(points()).toEqual(trail);
        run(200_000);
        expect(points()).toEqual(trail); // the points stay where they are
        run(101_000);
        expect(screen.queryByTestId('live-planes')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not join two points across the 360° edge', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      try {
        // 10 km north, 3° east of north, at 10 km, flying west at 450 kt: about 3 px/s across
        // the 800 px 360° view, over north (x = 0 and 800) in about 2 s.
        const north = {
          ...east, hex: 'e00000', track: 270,
          lat: PLACE.lat + (10 * Math.cos(3 * Math.PI / 180)) / KM_PER_DEG,
          lon: PLACE.lon + (10 * Math.sin(3 * Math.PI / 180)) / (KM_PER_DEG * Math.cos(PLACE.lat * Math.PI / 180)),
        };
        renderScene({ compassHeading: null, contrail: 'medium', livePlanes: feed([north]) });
        run(12_000);
        expect(screen.getAllByTestId('live-plane')).toHaveLength(1);
        const all = points();
        expect(all.some(([x]) => x < 20)).toBe(true); // the first point, east of north
        expect(all.some(([x]) => x > 760)).toBe(true); // the newer ones, west of north
        subpaths().forEach(sub => sub.slice(1).forEach(([x], i) => expect(Math.abs(x - sub[i][0])).toBeLessThan(400)));
      } finally {
        vi.useRealTimers();
      }
    });

    // Item 143 turns the body: the head sits at the tail as the body is drawn now.
    describe('the head at the turned tail (item 143)', () => {
      const DEG = Math.PI / 180;
      const transformOf = (testId: string) => screen.getByTestId(testId).style.transform;
      const headOf = (plane: LiveAircraft) => {
        renderScene({ contrail: 'medium', livePlanes: feed([plane]) });
        run(2_000);
        const p = start(screen.getByTestId('live-plane'));
        const angle = Number(transformOf('live-plane-body').match(/rotate\(([-\d.e]+)rad\)/)![1]);
        const under = transformOf('live-plane-under') === 'scaleY(1)';
        const side = Number((screen.getByTestId('live-plane-side').firstElementChild as HTMLElement).style.transform.match(/scaleY\(([-\d.]+)\)/)![1]);
        const w = Number(screen.getByTestId(under ? 'scene-plane-under' : 'scene-plane').getAttribute('width'));
        // The tail in the body's own frame, from its middle: the engine of the side view (mirrored
        // by the side), or the end of the fuselage from below; then turned by the body's angle.
        const [lx, ly] = under ? [(2 / 40 - 0.5) * w, 0] : [(0.46 - 0.5) * w, side * (0.72 - 0.5) * 0.3 * w];
        const expected = { x: p.x + lx * Math.cos(angle) - ly * Math.sin(angle), y: p.y + lx * Math.sin(angle) + ly * Math.cos(angle) };
        const head = points()[points().length - 1];
        return { angle, under, side, head, expected };
      };
      const expectAt = ({ head, expected }: ReturnType<typeof headOf>) => {
        expect(Math.abs(head[0] - expected.x)).toBeLessThan(0.15);
        expect(Math.abs(head[1] - expected.y)).toBeLessThan(0.15);
      };
      const withTimers = (test: () => void) => {
        vi.useFakeTimers();
        vi.setSystemTime(1_000);
        try { test(); } finally { vi.useRealTimers(); }
      };

      it('side view, climbing about 30° to the right', () => withTimers(() => {
        // 20 km south, flying north-north-west: west is right when facing south, and it comes nearer.
        const climber = { ...south, lat: PLACE.lat - 20 / KM_PER_DEG, speedKt: 450, track: 336 };
        const at = headOf(climber);
        expect(at.under).toBe(false);
        expect(at.side).toBe(1);
        expect(at.angle).toBeLessThan(-15 * DEG);
        expect(at.angle).toBeGreaterThan(-45 * DEG);
        expectAt(at);
      }));

      it('side view, a plane that moves left (mirrored)', () => withTimers(() => {
        const at = headOf(east);
        expect(at.under).toBe(false);
        expect(at.side).toBe(-1);
        expectAt(at);
        // Behind the plane: to the right of its middle.
        expect(at.head[0]).toBeGreaterThan(start(screen.getByTestId('live-plane')).x);
      }));

      it('underside view, a plane that climbs steeply: the end of the fuselage, below it', () => withTimers(() => {
        const towards = { ...south, lat: PLACE.lat - 15 / KM_PER_DEG, speedKt: 450, track: 2 };
        const at = headOf(towards);
        expect(at.under).toBe(true);
        expectAt(at);
        expect(at.head[1] - start(screen.getByTestId('live-plane')).y).toBeGreaterThan(5);
      }));
    });

    it('with reduced motion stores only the feed\'s points, one with each answer', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      try {
        const props = {
          observer: { lat: PLACE.lat, lon: PLACE.lon, elevationM: 1.7 },
          project: (altitude: number, azimuth: number) => ({ x: (azimuth - 135) * (800 / 90), y: 390 - altitude * 10 }),
          width: 800, compass: true, profile: null, lights: false, contrail: 'medium' as const, trailColour: 'white',
          reducedMotion: true,
        };
        const { rerender } = render(<LivePlanes state={feed([east])} {...props} />);
        act(() => { vi.advanceTimersByTime(14_000); });
        expect(points()).toEqual([]); // no tick moves the plane
        // The next answer, 15 s later (the plane 15 s on).
        rerender(<LivePlanes state={{ feed: { now: 1_000, aircraft: [east] }, receivedAt: 16_000 }} {...props} />);
        expect(subpaths()).toHaveLength(1);
        expect(points()).toHaveLength(2);
        act(() => { vi.advanceTimersByTime(10_000); });
        expect(points()).toHaveLength(2);
      } finally {
        vi.useRealTimers();
      }
    });
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
    // Item 116: a double tap opens the card.
    fireEvent.click(hit, { clientX: 10, clientY: 20, detail: 1 });
    expect(onSceneInfo).not.toHaveBeenCalled();
    fireEvent.click(hit, { clientX: 10, clientY: 20, detail: 2 });
    expect(onSceneInfo).toHaveBeenCalledWith(
      { type: 'livePlane', callsign: 'DLH4KL', airline: 'Lufthansa', aircraftType: 'A320', altM: 10_000, speedKt: 0 },
      { x: 10, y: 20 }, 'live-a1b2c3',
    );
  });

  it('in compass mode shows every visible aircraft in the field of view (item 110)', () => {
    // 20 still aircraft due south at 30-87 km, all at 10 km, and one due north (behind).
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...south, hex: (0xb00000 + i).toString(16), lat: PLACE.lat - (30 + i * 3) / KM_PER_DEG,
    }));
    const north = { ...south, hex: 'c00000', lat: PLACE.lat + 30 / KM_PER_DEG };
    renderScene({ livePlanes: feed([...many, north]) });
    expect(screen.getAllByTestId('live-plane')).toHaveLength(20);
  });

  it('reports the number of planes drawn when it changes, not on each tick; 0 when the radar goes off or the sky closes (item 155)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    try {
      const onLivePlanesShown = vi.fn();
      const north = { ...south, hex: 'c00000', lat: PLACE.lat + 30 / KM_PER_DEG };
      const three = feed([south, { ...south, hex: 'b00000', lat: PLACE.lat - 40 / KM_PER_DEG }, north]);
      const scene = (props: Partial<React.ComponentProps<typeof SunVisualization>>) => (
        <SunVisualization
          sunPosition={{ azimuth: 200, altitude: 30 }}
          moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
          sunPath={[]} moonPath={[]} timeOfDay="midday" weatherType="clear" latitude={PLACE.lat} longitude={PLACE.lon}
          livePlanes={three} compassHeading={180} onLivePlanesShown={onLivePlanesShown} {...props}
        />
      );
      const { rerender } = renderScene({ onLivePlanesShown, livePlanes: three });
      // Compass facing south: the two south planes; the north one is behind.
      expect(onLivePlanesShown).toHaveBeenLastCalledWith(2);
      const calls = onLivePlanesShown.mock.calls.length;
      act(() => { vi.advanceTimersByTime(2_000); });
      expect(onLivePlanesShown).toHaveBeenCalledTimes(calls);
      // The 360° view: still planes hang in the air, so none is drawn (item 110).
      rerender(scene({ compassHeading: null }));
      expect(onLivePlanesShown).toHaveBeenLastCalledWith(0);
      rerender(scene({}));
      expect(onLivePlanesShown).toHaveBeenLastCalledWith(2);
      rerender(scene({ livePlanes: null }));
      expect(onLivePlanesShown).toHaveBeenLastCalledWith(0);
      rerender(scene({}));
      rerender(scene({ weatherType: 'fog' })); // the layer goes away
      expect(onLivePlanesShown).toHaveBeenLastCalledWith(0);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('points the way it flies on the screen (item 143, option H)', () => {
    const body = () => screen.getByTestId('live-plane-body');
    const angle = () => Number(body().style.transform.match(/rotate\(([-\d.e]+)rad\)/)![1]);
    const scaleY = (el: Element) => Number((el as HTMLElement).style.transform.match(/scaleY\(([-\d.]+)\)/)![1]);
    const side = () => screen.getByTestId('live-plane-side');
    const under = () => screen.getByTestId('live-plane-under');
    // 50 km south, flying east: facing south, east is on the left, so it moves left, about level.
    const east = { ...south, speedKt: 450, track: 90 };
    // 15 km south, flying (almost) north towards the observer: it climbs steeply on the screen.
    const towards = { ...south, lat: PLACE.lat - 15 / KM_PER_DEG, speedKt: 450, track: 2 };
    const withTimers = (test: () => void) => {
      vi.useFakeTimers();
      vi.setSystemTime(1_000);
      try { test(); } finally { vi.useRealTimers(); }
    };

    it('mirrors a plane that moves left in the side view, so the fin stays up', () => withTimers(() => {
      renderScene({ livePlanes: feed([east]) });
      expect(Math.abs(angle() - Math.PI)).toBeLessThan(0.1);
      expect(scaleY(side())).toBe(1);
      expect(scaleY(side().firstElementChild!)).toBe(-1);
      expect(scaleY(under())).toBe(0);
    }));

    it('shows a steep plane from below, pointing up along its way, with no clamp', () => withTimers(() => {
      renderScene({ livePlanes: feed([towards]) });
      expect(scaleY(side())).toBe(0);
      expect(scaleY(under())).toBe(1);
      expect(angle()).toBeLessThan(-75 * Math.PI / 180);
      expect(angle()).toBeGreaterThan(-105 * Math.PI / 180);
    }));

    it('has no transition on its first frame; then it turns over 2 s and rolls in 2 × 0.75 s', () => withTimers(() => {
      renderScene({ livePlanes: feed([east]) });
      expect(body().style.transition).toBe('none');
      expect(side().style.transition).toBe('none');
      act(() => { vi.advanceTimersByTime(250); });
      expect(body().style.transition).toBe('transform 2s ease-in-out');
      expect(side().firstElementChild!.getAttribute('style')).toContain('transition: transform 2s ease-in-out');
      // The shown view opens after the hidden one has gone edge-on.
      expect(side().style.transition).toBe('transform 0.75s ease-out 0.75s');
      expect(under().style.transition).toBe('transform 0.75s ease-in');
    }));

    it('jumps to the new angle and view with reduced motion', () => withTimers(() => {
      const reduce = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
        matches: query.includes('reduce'), media: query, onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
      }));
      try {
        const { rerender } = renderScene({ livePlanes: feed([east]) });
        rerender(
          <SunVisualization
            sunPosition={{ azimuth: 200, altitude: 30 }}
            moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
            sunPath={[]} moonPath={[]} timeOfDay="midday" weatherType="clear" latitude={PLACE.lat} longitude={PLACE.lon}
            livePlanes={{ feed: { now: 2_000, aircraft: [east] }, receivedAt: 2_000 }} compassHeading={180}
          />,
        );
        expect([body(), side(), under()].map(el => el.style.transition)).toEqual(['none', 'none', 'none']);
      } finally {
        reduce.mockRestore();
      }
    }));

    it('keeps the last angle, side and view of a plane that stops; the tap area stays level', () => withTimers(() => {
      const onSceneInfo = vi.fn();
      const { rerender } = renderScene({ livePlanes: feed([east]), onSceneInfo });
      const before = angle();
      // The next answer: the same plane, now with no speed (compass mode shows a still plane).
      rerender(
        <SunVisualization
          sunPosition={{ azimuth: 200, altitude: 30 }}
          moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
          sunPath={[]} moonPath={[]} timeOfDay="midday" weatherType="clear" latitude={PLACE.lat} longitude={PLACE.lon}
          livePlanes={feed([{ ...east, speedKt: 0 }])} compassHeading={180} onSceneInfo={onSceneInfo}
        />,
      );
      expect(angle()).toBe(before);
      expect(scaleY(side().firstElementChild!)).toBe(-1);
      expect(scaleY(side())).toBe(1);
      const hit = screen.getByTestId('live-plane').querySelector<HTMLElement>('[data-plane-hit]')!;
      expect(body().contains(hit)).toBe(false);
      expect(hit.style.transform).toBe('');
    }));

    it('shows both wingtip lights from below at night, and one wing light in the side view', () => withTimers(() => {
      renderScene({ timeOfDay: 'night', livePlanes: feed([towards]) });
      expect(under().querySelectorAll('[data-testid="plane-tip-light"]')).toHaveLength(2);
      expect(under().querySelectorAll('[data-testid="plane-tip-strobe"]')).toHaveLength(2);
      expect(side().querySelectorAll('[data-testid="plane-wing-light"]')).toHaveLength(1);
    }));
  });

  it('in the normal view shows only the 2 nearest that visibly move (item 110)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    try {
      // Low and near, flying east at 450 kt: 2-4 px/s across the 800 px 360° view.
      const near = (hex: string, km: number, extra: Partial<LiveAircraft> = {}): LiveAircraft => ({
        ...south, hex, altM: 3_000, speedKt: 450, track: 90, lat: PLACE.lat - km / KM_PER_DEG, ...extra,
      });
      const still = near('d00000', 6, { speedKt: 0 }); // the nearest, but it hangs in the air
      const a = near('d00001', 8);
      const b = near('d00002', 10);
      const c = near('d00003', 12);
      const far = { ...south, hex: 'd00004', speedKt: 450, track: 90 }; // 50 km: under 1 px/s
      const onSceneInfo = vi.fn();
      renderScene({ compassHeading: null, onSceneInfo, livePlanes: feed([c, far, still, b, a]) });
      const shown = screen.getAllByTestId('live-plane');
      expect(shown).toHaveLength(2);
      const hexes = shown.map(plane => {
        const hit = plane.querySelector<HTMLElement>('[data-testid="scene-hit"]')!.parentElement!;
        fireEvent.click(hit, { detail: 1 });
        fireEvent.click(hit, { detail: 2 }); // item 116: a double tap
        return onSceneInfo.mock.lastCall![2];
      });
      expect(hexes.sort()).toEqual(['live-d00001', 'live-d00002']);
    } finally {
      vi.useRealTimers();
    }
  });
});
