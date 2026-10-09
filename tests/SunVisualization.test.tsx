import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, within, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import SunVisualization, {
  getAzimuthScreenFraction,
  getCompassScreenFraction,
  getVisibleCardinalLabels,
  crossesHorizon,
  buildArcPath,
  shortestAzimuthDelta,
  horizonCrossingPoint,
  getRainbowGeometry,
  COMPASS_FOV_DEG,
  buildTerrainSegments,
  avoidCollapsedPanel,
  formatSunAltitude,
  getAzimuthAtFraction,
} from '../src/components/SunVisualization';
import type { HorizonProfile } from '../src/utils/horizonUtils';
import { getSunTimes, formatTime, getWaterColors } from '../src/utils/sunUtils';
import { getSunArcLabels, getMoonArcLabels } from '../src/utils/arcLabels';

describe('getAzimuthScreenFraction (C-3, static/non-compass mode)', () => {
  it('northern hemisphere: culmination (180°, South) stays centered', () => {
    expect(getAzimuthScreenFraction(180, 51)).toBeCloseTo(0.5);
  });

  it('southern hemisphere: culmination (0°/360°, North) is centered, not at the edge', () => {
    // Before the fix this mapped straight to 0/360 -> the screen edge, causing a
    // noon jump from the right edge to the left edge.
    expect(getAzimuthScreenFraction(0, -33)).toBeCloseTo(0.5);
    expect(getAzimuthScreenFraction(360, -33)).toBeCloseTo(0.5);
  });

  it('southern hemisphere: shifts other azimuths by 180° too', () => {
    expect(getAzimuthScreenFraction(90, -33)).toBeCloseTo(0.75);
    expect(getAzimuthScreenFraction(270, -33)).toBeCloseTo(0.25);
  });

});

describe('getCompassScreenFraction (ROADMAP item 19, field-of-view compass mapping)', () => {
  it('centers the current heading at fraction 0.5', () => {
    expect(getCompassScreenFraction(180, 180).fraction).toBeCloseTo(0.5);
    expect(getCompassScreenFraction(180, 180).visible).toBe(true);
  });

  it('places an azimuth half the FOV clockwise of the heading at the right edge', () => {
    const result = getCompassScreenFraction(225, 180); // +45°, half of the 90° default FOV
    expect(result.fraction).toBeCloseTo(1);
    expect(result.visible).toBe(true);
  });

  it('places an azimuth half the FOV counter-clockwise of the heading at the left edge', () => {
    const result = getCompassScreenFraction(135, 180); // -45°
    expect(result.fraction).toBeCloseTo(0);
    expect(result.visible).toBe(true);
  });

  it('is not visible once an azimuth sits outside the field of view', () => {
    expect(getCompassScreenFraction(280, 180).visible).toBe(false); // +100°, > 45° away
    expect(getCompassScreenFraction(80, 180).visible).toBe(false); // -100°
  });

  it('has no wrap jump across 0°/360° - the short way is always used', () => {
    // Heading close to North; an azimuth just the other side of the 0°/360° wrap is
    // a short distance away, not almost all the way around.
    const result = getCompassScreenFraction(355, 10);
    expect(result.visible).toBe(true);
    expect(result.fraction).toBeLessThan(0.5);
  });

  it('respects a custom field of view', () => {
    expect(getCompassScreenFraction(215, 180, 60).visible).toBe(false); // +35°, outside a 60° FOV (half = 30°)
    expect(getCompassScreenFraction(215, 180, 120).visible).toBe(true); // inside a 120° FOV (half = 60°)
  });

  it('COMPASS_FOV_DEG defaults to 90°, tunable on real devices', () => {
    expect(COMPASS_FOV_DEG).toBe(90);
  });
});

describe('getVisibleCardinalLabels (ROADMAP item 8, C-8 style label visibility per hemisphere)', () => {
  it('northern hemisphere: N is at the left edge, S is centered', () => {
    const labels = getVisibleCardinalLabels(51);
    expect(labels.find((l) => l.label === 'N')?.fraction).toBeCloseTo(0);
    expect(labels.find((l) => l.label === 'S')?.fraction).toBeCloseTo(0.5);
  });

  it('southern hemisphere: N is centered instead (matches the culmination shift)', () => {
    const labels = getVisibleCardinalLabels(-33);
    expect(labels.find((l) => l.label === 'N')?.fraction).toBeCloseTo(0.5);
  });

  it('always returns all 8 labels with a finite fraction (the mapping wraps the full circle)', () => {
    const labels = getVisibleCardinalLabels(51);
    expect(labels.map((l) => l.label)).toEqual(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
    expect(labels.every((l) => Number.isFinite(l.fraction))).toBe(true);
  });

  it('compass mode (ROADMAP item 19): only labels within the field of view are returned', () => {
    // Heading due South (180°): only S (0°) and the two neighbors within ±45° remain.
    const labels = getVisibleCardinalLabels(51, 180);
    expect(labels.map((l) => l.label)).toEqual(['SE', 'S', 'SW']);
    expect(labels.find((l) => l.label === 'S')?.fraction).toBeCloseTo(0.5);
  });

  it('compass mode: labels pan together as the heading turns', () => {
    const labels = getVisibleCardinalLabels(51, 90); // facing East
    expect(labels.map((l) => l.label)).toEqual(['NE', 'E', 'SE']);
    expect(labels.find((l) => l.label === 'E')?.fraction).toBeCloseTo(0.5);
  });
});

describe('crossesHorizon (C-8)', () => {
  it('detects a sunrise-style crossing (negative to positive)', () => {
    expect(crossesHorizon(-0.4, 0.6)).toBe(true);
  });

  it('detects a sunset-style crossing (positive to negative)', () => {
    expect(crossesHorizon(0.6, -0.4)).toBe(true);
  });

  it('does not fire when both samples land on the same side, even near zero', () => {
    // Before the fix, only a rounded `=== 0.0` check counted; a close pair that never
    // rounds to exactly zero would silently miss the crossing.
    expect(crossesHorizon(0.3, 0.05)).toBe(false);
    expect(crossesHorizon(-0.3, -0.05)).toBe(false);
  });

  it('fires even when the sample never rounds to exactly 0.0', () => {
    // A 30s sample can easily skip straight past exact 0.0 in either direction.
    expect(crossesHorizon(-2.3, 3.1)).toBe(true);
  });
});


describe('buildArcPath (sun/moon arcs, ROADMAP item 17/26)', () => {
  const toXY = (p: { altitude: number; azimuth: number }) => ({ x: p.azimuth, y: -p.altitude });

  it('inserts an interpolated altitude-0 point at each horizon crossing, then skips the below-horizon points (ROADMAP item 26)', () => {
    // Chosen so every crossing lands on a whole number: each pair straddling the
    // horizon has matching altitude magnitudes on both sides, so the interpolation
    // fraction is exactly 0.5.
    const path = buildArcPath(
      [
        { altitude: -10, azimuth: 0 }, // below horizon - not drawn
        { altitude: 10, azimuth: 2 }, // crossing at az 1, alt 0
        { altitude: 20, azimuth: 3 },
        { altitude: -20, azimuth: 5 }, // crossing at az 4, alt 0
        { altitude: 20, azimuth: 7 }, // crossing at az 6, alt 0
      ],
      toXY
    );
    expect(path).toBe('M1,0 L2,-10 L3,-20 L4,0 M6,0 L7,-20');
  });

  it('is empty when the moon stays below the horizon', () => {
    expect(buildArcPath([{ altitude: -3, azimuth: 0 }], toXY)).toBe('');
  });

  it('starts a new segment when the x jumps by more than half the width (an azimuth wrap)', () => {
    // Two above-horizon points whose screen x jumps from near the right edge to near
    // the left edge (a 0°/360° wrap) - before the fix this drew one straight line
    // across the whole screen.
    const path = buildArcPath(
      [
        { altitude: 10, azimuth: 0 }, // x = 790
        { altitude: 10, azimuth: 1 }, // x = 10
      ],
      (p) => ({ x: p.azimuth === 0 ? 790 : 10, y: -p.altitude }),
      800
    );
    expect(path).toBe('M790,-10 M10,-10');
  });

  it('does not break on an ordinary sweep across the screen (no width given)', () => {
    // Without a width, the wrap check never trips - matches the pre-item-17 behavior
    // for callers that don't pass one.
    const path = buildArcPath(
      [
        { altitude: 10, azimuth: 0 },
        { altitude: 10, azimuth: 100 },
      ],
      (p) => ({ x: p.azimuth, y: -p.altitude })
    );
    expect(path).toBe('M0,-10 L100,-10');
  });

  it('treats a toXY returning null as a gap', () => {
    const path = buildArcPath(
      [
        { altitude: 10, azimuth: 0 },
        { altitude: 10, azimuth: 1 },
        { altitude: 10, azimuth: 2 },
      ],
      (p) => (p.azimuth === 1 ? null : { x: p.azimuth, y: -p.altitude })
    );
    expect(path).toBe('M0,-10 M2,-10');
  });

  it('a horizon crossing near the 0°/360° wrap interpolates the short way (ROADMAP item 26)', () => {
    const path = buildArcPath(
      [
        { altitude: -10, azimuth: 350 }, // below horizon - not drawn
        { altitude: 10, azimuth: 10 }, // crossing: due North (az 0), not az 180
      ],
      toXY
    );
    expect(path).toBe('M0,0 L10,-10');
  });
});

describe('shortestAzimuthDelta (ROADMAP item 26)', () => {
  it('returns a plain positive/negative delta well inside the circle', () => {
    expect(shortestAzimuthDelta(0, 90)).toBeCloseTo(90);
    expect(shortestAzimuthDelta(90, 0)).toBeCloseTo(-90);
  });

  it('takes the short way across the 0°/360° wrap instead of the long way around', () => {
    expect(shortestAzimuthDelta(350, 10)).toBeCloseTo(20);
    expect(shortestAzimuthDelta(10, 350)).toBeCloseTo(-20);
  });
});

describe('horizonCrossingPoint (ROADMAP item 26)', () => {
  it('linearly interpolates altitude to exactly 0 and azimuth to the matching fraction', () => {
    const point = horizonCrossingPoint({ altitude: -10, azimuth: 100 }, { altitude: 30, azimuth: 140 });
    expect(point.altitude).toBe(0);
    expect(point.azimuth).toBeCloseTo(110); // 1/4 of the way from 100 to 140
  });

  it('wraps the azimuth the short way across 0°/360°', () => {
    const point = horizonCrossingPoint({ altitude: -10, azimuth: 350 }, { altitude: 10, azimuth: 10 });
    expect(point.altitude).toBe(0);
    expect(point.azimuth).toBeCloseTo(0); // halfway from 350 to 370(=10), not from 350 to 10 the long way
  });
});

describe('getRainbowGeometry (ROADMAP item 10)', () => {
  it('is not visible when it is not raining/drizzling', () => {
    expect(getRainbowGeometry(false, 20, 90, 51).visible).toBe(false);
  });

  it('is not visible when the sun is below the horizon', () => {
    expect(getRainbowGeometry(true, -1, 90, 51).visible).toBe(false);
  });

  it('is not visible once the sun is at or above 42° altitude', () => {
    expect(getRainbowGeometry(true, 42, 90, 51).visible).toBe(false);
    expect(getRainbowGeometry(true, 50, 90, 51).visible).toBe(false);
  });

  it('is visible while raining/drizzling with the sun between 0° and 42°', () => {
    const geometry = getRainbowGeometry(true, 20, 90, 51);
    expect(geometry.visible).toBe(true);
    expect(geometry.apexHeightDeg).toBeCloseTo(22);
  });

  it('sits opposite the sun\'s azimuth, using the same mapping as the sun/moon', () => {
    const geometry = getRainbowGeometry(true, 10, 90, 51);
    expect(geometry.xFraction).toBeCloseTo(getAzimuthScreenFraction(270, 51));
  });

  it('compass mode: pans together with the heading and hides outside the field of view (ROADMAP item 19)', () => {
    // Sun azimuth 90° -> opposite is 270°; facing that same direction keeps it centered.
    const centered = getRainbowGeometry(true, 10, 90, 51, 270);
    expect(centered.visible).toBe(true);
    expect(centered.xFraction).toBeCloseTo(0.5);

    // Facing due North instead puts the rainbow (at 270°) outside the 90° FOV.
    const hidden = getRainbowGeometry(true, 10, 90, 51, 0);
    expect(hidden.visible).toBe(false);
  });
});

describe('SunVisualization (rendered): static cardinal direction labels (ROADMAP item 8)', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

  const setMockedContainerSize = (width: number, height: number) => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: height, configurable: true });
  };

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });

  it('renders all 8 cardinal labels on the horizon', () => {
    setMockedContainerSize(800, 600);
    render(
      <SunVisualization
        sunPosition={{ azimuth: 180, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[]}
        moonPath={[]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={51}
      />
    );

    const labelsContainer = screen.getByTestId('cardinal-labels');
    for (const label of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']) {
      expect(labelsContainer).toHaveTextContent(label);
    }
  });

  it('keeps the edge label (N at 0°) whole inside a 390 px screen (AUDIT A-8)', () => {
    setMockedContainerSize(390, 844);
    render(
      <SunVisualization
        sunPosition={{ azimuth: 180, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[]}
        moonPath={[]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={51}
      />
    );
    const north = screen.getByText('N').parentElement as HTMLElement;
    expect(parseFloat(north.style.left)).toBeGreaterThanOrEqual(18);
  });

  it('fades out together with the top-left buttons while idle in fullscreen (ROADMAP item 29)', () => {
    setMockedContainerSize(800, 600);
    const props = {
      sunPosition: { azimuth: 180, altitude: 30 },
      moonPosition: { azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false },
      sunPath: [],
      moonPath: [],
      timeOfDay: 'midday' as const,
      weatherType: 'clear' as const,
      latitude: 51,
    };

    const { rerender } = render(<SunVisualization {...props} isFullscreen={true} showCursor={false} />);
    expect(screen.getByTestId('cardinal-labels')).toHaveClass('opacity-0');

    rerender(<SunVisualization {...props} isFullscreen={true} showCursor={true} />);
    expect(screen.getByTestId('cardinal-labels')).toHaveClass('opacity-100');

    rerender(<SunVisualization {...props} isFullscreen={false} showCursor={false} />);
    expect(screen.getByTestId('cardinal-labels')).toHaveClass('opacity-100');
  });

  it('stays visible in compass mode even when idle in fullscreen (ROADMAP item 29)', () => {
    setMockedContainerSize(800, 600);
    render(
      <SunVisualization
        sunPosition={{ azimuth: 180, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[]}
        moonPath={[]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={51}
        compassHeading={90}
        isFullscreen={true}
        showCursor={false}
      />
    );
    expect(screen.getByTestId('cardinal-labels')).toHaveClass('opacity-100');
  });

  it('draws a sun arc by day and does not draw a moon arc when the moon is not shown (ROADMAP item 17)', () => {
    setMockedContainerSize(800, 600);
    const { container } = render(
      <SunVisualization
        sunPosition={{ azimuth: 180, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[
          { azimuth: 170, altitude: 20 },
          { azimuth: 180, altitude: 30 },
          { azimuth: 190, altitude: 20 },
        ]}
        moonPath={[
          { azimuth: 170, altitude: 20, phase: 0.5, illumination: 0.5, visible: true },
          { azimuth: 180, altitude: 30, phase: 0.5, illumination: 0.5, visible: true },
        ]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={51}
      />
    );

    const paths = container.querySelectorAll('path[stroke]');
    const strokes = Array.from(paths).map((p) => p.getAttribute('stroke'));
    expect(strokes).toContain('hsl(var(--brand-sunset))'); // the sun arc
    expect(strokes).not.toContain('hsl(var(--scene-moon))'); // no moon arc while it's midday
  });

  it('the sun dot lies on the sun arc path when sunPath includes the current position (ROADMAP item 26)', () => {
    setMockedContainerSize(800, 600);
    const { container } = render(
      <SunVisualization
        sunPosition={{ azimuth: 180, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[
          { azimuth: 170, altitude: 20 },
          { azimuth: 180, altitude: 30 },
          { azimuth: 190, altitude: 20 },
        ]}
        moonPath={[]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={51}
      />
    );

    const sunDot = screen.getByTestId('sun-dot');
    const dotLeft = parseFloat(sunDot.style.left);
    const dotTop = parseFloat(sunDot.style.top);

    const arcPath = container.querySelector('path[stroke="hsl(var(--brand-sunset))"]');
    const d = arcPath?.getAttribute('d') ?? '';
    const points = Array.from(d.matchAll(/[ML](-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)).map(
      (m) => [parseFloat(m[1]), parseFloat(m[2])]
    );

    const dotIsOnPath = points.some(([x, y]) => Math.abs(x - dotLeft) < 0.5 && Math.abs(y - dotTop) < 0.5);
    expect(dotIsOnPath).toBe(true);
  });

  it('shows an off-FOV hint arrow in compass mode when the sun is outside the field of view (ROADMAP item 19)', () => {
    setMockedContainerSize(800, 600);
    render(
      <SunVisualization
        sunPosition={{ azimuth: 90, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[]}
        moonPath={[]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={51}
        compassHeading={270} // facing the opposite direction from the sun
      />
    );

    expect(screen.getByTestId('compass-off-fov-hint')).toBeInTheDocument();
  });

  it('shows no off-FOV hint outside compass mode', () => {
    setMockedContainerSize(800, 600);
    render(
      <SunVisualization
        sunPosition={{ azimuth: 90, altitude: 30 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[]}
        moonPath={[]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={51}
      />
    );

    expect(screen.queryByTestId('compass-off-fov-hint')).not.toBeInTheDocument();
  });
});

describe('SunVisualization (rendered): arc rise/zenith/set labels', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

  const setMockedContainerSize = (width: number, height: number) => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: height, configurable: true });
  };

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });

  // A real summer day at a temperate latitude/longitude, so sunrise/zenith/sunset all
  // fall within the pass and match a known SunCalc result (verified against
  // utils.arcLabels.test.ts / utils.sunUtils.test.ts).
  const summerDay = new Date('2026-06-21T12:00:00Z');
  const latitude = 51.5;
  const longitude = 0;

  it("renders three sun labels by day, matching the panel's own sunrise/zenith/sunset times", () => {
    setMockedContainerSize(800, 600);
    render(
      <SunVisualization
        sunPosition={{ azimuth: 180, altitude: 60 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[
          { azimuth: 170, altitude: 20 },
          { azimuth: 180, altitude: 60 },
          { azimuth: 190, altitude: 20 },
        ]}
        moonPath={[]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={latitude}
        longitude={longitude}
        date={summerDay}
      />
    );

    const times = getSunTimes(summerDay, latitude, longitude);
    expect(screen.getByTestId('arc-label-sun-rise')).toHaveTextContent(formatTime(times.sunrise));
    expect(screen.getByTestId('arc-label-sun-zenith')).toHaveTextContent(formatTime(times.solarNoon));
    expect(screen.getByTestId('arc-label-sun-set')).toHaveTextContent(formatTime(times.sunset));
  });

  it('renders moon labels only when the moon arc is actually drawn', () => {
    setMockedContainerSize(800, 600);
    // The moon is up at this date/location (rise ~02:52 UTC, set ~20:23 UTC - see
    // utils.moonUtils.test.ts), so the arc is non-empty once `timeOfDay` says it's
    // being shown.
    const moonDate = new Date('2026-06-15T12:00:00Z');
    const moonProps = {
      sunPosition: { azimuth: 180, altitude: 60 },
      moonPosition: { azimuth: 180, altitude: 30, phase: 0.5, illumination: 0.5, visible: true },
      sunPath: [],
      moonPath: [
        { azimuth: 170, altitude: 20, phase: 0.5, illumination: 0.5, visible: true },
        { azimuth: 180, altitude: 30, phase: 0.5, illumination: 0.5, visible: true },
        { azimuth: 190, altitude: 20, phase: 0.5, illumination: 0.5, visible: true },
      ],
      weatherType: 'clear' as const,
      latitude: 48,
      longitude: 11,
      date: moonDate,
    };

    const { rerender } = render(<SunVisualization {...moonProps} timeOfDay="night" />);
    expect(screen.getByTestId('arc-label-moon-rise')).toBeInTheDocument();
    expect(screen.getByTestId('arc-label-moon-set')).toBeInTheDocument();

    // Same moon path/position, but `timeOfDay` now says the moon isn't shown - the
    // moon arc itself goes empty (moonAltitudeVisible gate), and so should its labels.
    rerender(<SunVisualization {...moonProps} timeOfDay="midday" />);
    expect(screen.queryByTestId('arc-label-moon-rise')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-moon-set')).not.toBeInTheDocument();
  });

  it('fades out together with the cardinal labels while idle in fullscreen (ROADMAP item 29)', () => {
    setMockedContainerSize(800, 600);
    const props = {
      sunPosition: { azimuth: 180, altitude: 60 },
      moonPosition: { azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false },
      sunPath: [
        { azimuth: 170, altitude: 20 },
        { azimuth: 180, altitude: 60 },
        { azimuth: 190, altitude: 20 },
      ],
      moonPath: [],
      timeOfDay: 'midday' as const,
      weatherType: 'clear' as const,
      latitude,
      longitude,
      date: summerDay,
    };

    const { rerender } = render(<SunVisualization {...props} isFullscreen={true} showCursor={false} />);
    expect(screen.getByTestId('arc-labels')).toHaveClass('opacity-0');

    rerender(<SunVisualization {...props} isFullscreen={true} showCursor={true} />);
    expect(screen.getByTestId('arc-labels')).toHaveClass('opacity-100');
  });

  it('drops a label outside the compass field of view instead of clamping it (ROADMAP item 19)', () => {
    setMockedContainerSize(800, 600);
    // Facing NE (45°): the sun's ~49° sunrise azimuth is inside the 90° FOV, but its
    // ~180° zenith and ~311° sunset azimuths are not (verified in utils.arcLabels.test.ts).
    render(
      <SunVisualization
        sunPosition={{ azimuth: 180, altitude: 60 }}
        moonPosition={{ azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false }}
        sunPath={[
          { azimuth: 170, altitude: 20 },
          { azimuth: 180, altitude: 60 },
          { azimuth: 190, altitude: 20 },
        ]}
        moonPath={[]}
        timeOfDay="midday"
        weatherType="clear"
        latitude={latitude}
        longitude={longitude}
        date={summerDay}
        compassHeading={45}
      />
    );

    expect(screen.getByTestId('arc-label-sun-rise')).toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-sun-zenith')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-sun-set')).not.toBeInTheDocument();
  });
});

describe('SunVisualization (rendered): line-of-sight labels on the sun arc (ROADMAP item 42)', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });

  const summerDay = new Date('2026-06-21T12:00:00Z');
  const latitude = 51.5;
  const longitude = 0;
  const times = getSunTimes(summerDay, latitude, longitude);
  const ridgeProfile: HorizonProfile = { angles: new Array(360).fill(5), observerElevation: 0, eyeHeight: 1.7 };
  // An hour inside the flat times: far enough that the pills do not overlap.
  const terrainSunTimes = {
    sunrise: new Date(times.sunrise.getTime() + 60 * 60_000),
    sunset: new Date(times.sunset.getTime() - 60 * 60_000),
  };

  const baseProps = {
    sunPosition: { azimuth: 180, altitude: 60 },
    moonPosition: { azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false },
    sunPath: [
      { azimuth: 170, altitude: 20 },
      { azimuth: 180, altitude: 60 },
      { azimuth: 190, altitude: 20 },
    ],
    moonPath: [],
    timeOfDay: 'midday' as const,
    weatherType: 'clear' as const,
    latitude,
    longitude,
    date: summerDay,
  };

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: 600, configurable: true });
  });

  it('renders the terrain rise and set labels with a profile and terrain times, next to the flat labels', () => {
    render(<SunVisualization {...baseProps} horizonProfile={ridgeProfile} terrainSunTimes={terrainSunTimes} />);

    const set = screen.getByTestId('arc-label-sun-terrain-set');
    expect(set).toHaveTextContent(formatTime(terrainSunTimes.sunset));
    expect(within(set).getByTestId('premium-badge')).toBeInTheDocument();
    expect(screen.getByTestId('arc-label-sun-terrain-rise')).toHaveTextContent(formatTime(terrainSunTimes.sunrise));
    expect(screen.getByTestId('arc-label-sun-set')).toHaveTextContent(formatTime(times.sunset));
    expect(screen.getByTestId('arc-label-sun-rise')).toHaveTextContent(formatTime(times.sunrise));
    // Sits above the flat set label: the ridge is higher than the flat horizon.
    expect(parseFloat(set.style.top)).toBeLessThan(parseFloat(screen.getByTestId('arc-label-sun-set').style.top));
  });

  it('renders no terrain labels without a profile or without terrain times', () => {
    const { rerender } = render(<SunVisualization {...baseProps} terrainSunTimes={terrainSunTimes} />);
    expect(screen.queryByTestId('arc-label-sun-terrain-rise')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-sun-terrain-set')).not.toBeInTheDocument();

    rerender(<SunVisualization {...baseProps} horizonProfile={ridgeProfile} />);
    expect(screen.queryByTestId('arc-label-sun-terrain-rise')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-sun-terrain-set')).not.toBeInTheDocument();
    expect(screen.getByTestId('arc-label-sun-set')).toBeInTheDocument();
  });

  it('renders no terrain label for a null time (the sun does not clear the terrain)', () => {
    render(
      <SunVisualization {...baseProps} horizonProfile={ridgeProfile} terrainSunTimes={{ sunrise: null, sunset: null }} />
    );
    expect(screen.queryByTestId('arc-label-sun-terrain-rise')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-sun-terrain-set')).not.toBeInTheDocument();
    expect(screen.getByTestId('arc-label-sun-set')).toBeInTheDocument();
  });

  it('renders only the terrain label when it shows the same minute as the flat label', () => {
    render(
      <SunVisualization
        {...baseProps}
        horizonProfile={ridgeProfile}
        terrainSunTimes={{ sunrise: times.sunrise, sunset: times.sunset }}
      />
    );
    expect(screen.getByTestId('arc-label-sun-terrain-set')).toHaveTextContent(formatTime(times.sunset));
    expect(screen.getByTestId('arc-label-sun-terrain-rise')).toHaveTextContent(formatTime(times.sunrise));
    expect(screen.queryByTestId('arc-label-sun-set')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-sun-rise')).not.toBeInTheDocument();
    expect(screen.getByTestId('arc-label-sun-zenith')).toBeInTheDocument();
  });

  it('drops a terrain label outside the compass field of view (ROADMAP item 19)', () => {
    render(
      <SunVisualization {...baseProps} horizonProfile={ridgeProfile} terrainSunTimes={terrainSunTimes} compassHeading={45} />
    );
    expect(screen.getByTestId('arc-label-sun-terrain-rise')).toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-sun-terrain-set')).not.toBeInTheDocument();
  });

  it('fades with the other arc labels while idle in fullscreen (ROADMAP item 29)', () => {
    render(
      <SunVisualization
        {...baseProps}
        horizonProfile={ridgeProfile}
        terrainSunTimes={terrainSunTimes}
        isFullscreen={true}
        showCursor={false}
      />
    );
    const labels = screen.getByTestId('arc-labels');
    expect(labels).toHaveClass('opacity-0');
    expect(within(labels).getByTestId('arc-label-sun-terrain-set')).toBeInTheDocument();
  });
});

describe('SunVisualization (rendered): line-of-sight labels on the moon arc (ROADMAP item 63)', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });

  // The moon is up at this date/location (see 'renders moon labels only when the moon arc
  // is actually drawn' above).
  const moonDate = new Date('2026-06-15T12:00:00Z');
  const flat = getMoonArcLabels(moonDate, 48, 11);
  const ridgeProfile: HorizonProfile = { angles: new Array(360).fill(5), observerElevation: 0, eyeHeight: 1.7 };
  // An hour inside the flat times: far enough that the pills do not overlap.
  const terrainMoonTimes = {
    rise: new Date(flat.rise!.time.getTime() + 60 * 60_000),
    set: new Date(flat.set!.time.getTime() - 60 * 60_000),
  };
  const moonProps = {
    sunPosition: { azimuth: 180, altitude: 60 },
    moonPosition: { azimuth: 180, altitude: 30, phase: 0.5, illumination: 0.5, visible: true },
    sunPath: [],
    moonPath: [
      { azimuth: 170, altitude: 20, phase: 0.5, illumination: 0.5, visible: true },
      { azimuth: 180, altitude: 30, phase: 0.5, illumination: 0.5, visible: true },
      { azimuth: 190, altitude: 20, phase: 0.5, illumination: 0.5, visible: true },
    ],
    timeOfDay: 'night' as const,
    weatherType: 'clear' as const,
    latitude: 48,
    longitude: 11,
    date: moonDate,
  };

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: 600, configurable: true });
  });

  it('renders the terrain moonrise and moonset labels next to the flat labels', () => {
    render(<SunVisualization {...moonProps} horizonProfile={ridgeProfile} terrainMoonTimes={terrainMoonTimes} />);

    const set = screen.getByTestId('arc-label-moon-terrain-set');
    expect(set).toHaveTextContent(formatTime(terrainMoonTimes.set));
    expect(within(set).getByTestId('premium-badge')).toBeInTheDocument();
    expect(screen.getByTestId('arc-label-moon-terrain-rise')).toHaveTextContent(formatTime(terrainMoonTimes.rise));
    expect(screen.getByTestId('arc-label-moon-set')).toHaveTextContent(formatTime(flat.set!.time));
    expect(screen.getByTestId('arc-label-moon-rise')).toHaveTextContent(formatTime(flat.rise!.time));
    // Sits above the flat set label: the ridge is higher than the flat horizon.
    expect(parseFloat(set.style.top)).toBeLessThan(parseFloat(screen.getByTestId('arc-label-moon-set').style.top));
  });

  it('renders no terrain moon labels without a profile, or while the moon arc is not drawn', () => {
    const { rerender } = render(<SunVisualization {...moonProps} terrainMoonTimes={terrainMoonTimes} />);
    expect(screen.queryByTestId('arc-label-moon-terrain-rise')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-moon-terrain-set')).not.toBeInTheDocument();

    rerender(
      <SunVisualization {...moonProps} timeOfDay="midday" horizonProfile={ridgeProfile} terrainMoonTimes={terrainMoonTimes} />
    );
    expect(screen.queryByTestId('arc-label-moon-terrain-rise')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-moon-terrain-set')).not.toBeInTheDocument();
  });

  it('renders only the terrain label when it shows the same minute as the flat label', () => {
    render(
      <SunVisualization
        {...moonProps}
        horizonProfile={ridgeProfile}
        terrainMoonTimes={{ rise: flat.rise!.time, set: null }}
      />
    );
    expect(screen.getByTestId('arc-label-moon-terrain-rise')).toHaveTextContent(formatTime(flat.rise!.time));
    expect(screen.queryByTestId('arc-label-moon-rise')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arc-label-moon-terrain-set')).not.toBeInTheDocument();
    expect(screen.getByTestId('arc-label-moon-set')).toBeInTheDocument();
  });

  it('steps a moon label up until it clears the sun labels, not just once', () => {
    // 13 June: the sun sets at 307°, the moon at 309° (19:17 and 17:55 UTC). A terrain
    // sunset 10 min early sits a few px above the flat horizon, so one step up is not enough.
    const date = new Date('2026-06-12T21:00:00Z');
    const sunSet = getSunArcLabels(date, 48, 11).set!.time;
    render(
      <SunVisualization
        {...moonProps}
        sunPath={moonProps.moonPath}
        date={date}
        horizonProfile={ridgeProfile}
        terrainSunTimes={{ sunrise: null, sunset: new Date(sunSet.getTime() - 10 * 60_000) }}
      />
    );
    const pills = screen.getAllByTestId(/^arc-label-/).map((el) => ({
      id: el.dataset.testid,
      x: parseFloat(el.style.left),
      y: parseFloat(el.style.top),
    }));
    expect(pills.map((p) => p.id)).toEqual(expect.arrayContaining(['arc-label-sun-terrain-set', 'arc-label-moon-set']));
    for (const a of pills) {
      for (const b of pills) {
        if (a !== b) expect(Math.abs(a.x - b.x) < 64 && Math.abs(a.y - b.y) < 22, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });
});

describe('buildTerrainSegments (ROADMAP item 13, line of sight with terrain)', () => {
  const flatProfile: HorizonProfile = { angles: new Array(360).fill(0), observerElevation: 0, eyeHeight: 1.7 };
  const ridgeProfile: HorizonProfile = { angles: new Array(360).fill(10), observerElevation: 0, eyeHeight: 1.7 };
  const valleyProfile: HorizonProfile = { angles: new Array(360).fill(-10), observerElevation: 0, eyeHeight: 1.7 };

  it('static mode samples the full 360° circle', () => {
    const segments = buildTerrainSegments(flatProfile, 800, 600, 51, null);
    const totalPoints = segments.reduce((sum, s) => sum + s.length, 0);
    expect(totalPoints).toBe(360);
  });

  it('compass FOV mode samples only the visible azimuth range, not the full circle', () => {
    const segments = buildTerrainSegments(flatProfile, 800, 600, 51, 180);
    const totalPoints = segments.reduce((sum, s) => sum + s.length, 0);
    expect(totalPoints).toBe(COMPASS_FOV_DEG + 1);
  });

  it('clamps a valley (angle below 0°) to the same y as the flat horizon line', () => {
    const flatSegments = buildTerrainSegments(flatProfile, 800, 600, 51, 180);
    const valleySegments = buildTerrainSegments(valleyProfile, 800, 600, 51, 180);
    expect(valleySegments[0].map((p) => p.y)).toEqual(flatSegments[0].map((p) => p.y));
  });

  it('places a ridge (positive angle) higher on screen (smaller y) than the flat horizon', () => {
    const flatSegments = buildTerrainSegments(flatProfile, 800, 600, 51, 180);
    const ridgeSegments = buildTerrainSegments(ridgeProfile, 800, 600, 51, 180);
    expect(ridgeSegments[0][0].y).toBeLessThan(flatSegments[0][0].y);
  });

  it('returns nothing for a zero-sized container', () => {
    expect(buildTerrainSegments(ridgeProfile, 0, 600, 51, null)).toEqual([]);
  });
});

describe('SunVisualization (rendered): terrain silhouette (ROADMAP item 13)', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

  const setMockedContainerSize = (width: number, height: number) => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: height, configurable: true });
  };

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });

  const ridgeProfile: HorizonProfile = { angles: new Array(360).fill(15), observerElevation: 500, eyeHeight: 1.7 };

  const baseProps = {
    sunPosition: { azimuth: 180, altitude: 30 },
    moonPosition: { azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false },
    sunPath: [],
    moonPath: [],
    timeOfDay: 'midday' as const,
    weatherType: 'clear' as const,
    latitude: 51,
  };

  it('draws the terrain silhouette when a profile is present', () => {
    setMockedContainerSize(800, 600);
    render(<SunVisualization {...baseProps} horizonProfile={ridgeProfile} />);
    expect(screen.getByTestId('terrain-silhouette')).toBeInTheDocument();
  });

  it('draws no terrain silhouette without a profile', () => {
    setMockedContainerSize(800, 600);
    render(<SunVisualization {...baseProps} />);
    expect(screen.queryByTestId('terrain-silhouette')).not.toBeInTheDocument();
  });

  it('draws the sun before the ridge in DOM order, so the ridge visually occludes it', () => {
    setMockedContainerSize(800, 600);
    render(<SunVisualization {...baseProps} horizonProfile={ridgeProfile} />);

    const sunDot = screen.getByTestId('sun-dot');
    const ridge = screen.getByTestId('terrain-silhouette');
    expect(sunDot.compareDocumentPosition(ridge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('colors the ridge per time of day (ROADMAP item 15 D polish), opaque so stars and the sun do not show through', () => {
    setMockedContainerSize(800, 600);

    const { unmount } = render(
      <SunVisualization {...baseProps} timeOfDay="night" horizonProfile={ridgeProfile} />
    );
    const nightFill = screen.getByTestId('terrain-silhouette').getAttribute('fill');
    unmount();

    render(<SunVisualization {...baseProps} timeOfDay="midday" horizonProfile={ridgeProfile} />);
    const dayFill = screen.getByTestId('terrain-silhouette').getAttribute('fill');

    expect(nightFill).toBe('hsl(var(--scene-ridge-night))');
    expect(dayFill).toBe('hsl(var(--scene-ridge-day))');
    expect(nightFill).not.toBe(dayFill);
    expect(screen.getByTestId('terrain-silhouette').getAttribute('fill-opacity')).toBeNull();
  });
});

describe('SunVisualization (rendered): sea visible at the horizon (ROADMAP item 27)', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

  const setMockedContainerSize = (width: number, height: number) => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: height, configurable: true });
  };

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });

  const ridgeProfile: HorizonProfile = { angles: new Array(360).fill(15), observerElevation: 500, eyeHeight: 1.7 };

  const baseProps = {
    sunPosition: { azimuth: 180, altitude: 30 },
    moonPosition: { azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false },
    sunPath: [],
    moonPath: [],
    timeOfDay: 'midday' as const,
    weatherType: 'clear' as const,
    latitude: 51,
  };

  it('draws the sea after the ridge in DOM order, so the wave crest sits on top of it', () => {
    setMockedContainerSize(800, 600);
    render(<SunVisualization {...baseProps} horizonProfile={ridgeProfile} />);

    const ridge = screen.getByTestId('terrain-silhouette');
    const sea = screen.getByTestId('sea');
    expect(ridge.compareDocumentPosition(sea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws the sea without an outline (ROADMAP item 32), day and night', () => {
    setMockedContainerSize(800, 600);

    for (const timeOfDay of ['midday', 'night'] as const) {
      const { unmount } = render(<SunVisualization {...baseProps} timeOfDay={timeOfDay} horizonProfile={ridgeProfile} />);
      expect(screen.getByTestId('sea').getAttribute('stroke')).toBeNull();
      unmount();
    }
  });

  it('takes the water colours from the sky gradient it is given (ROADMAP item 53)', () => {
    setMockedContainerSize(800, 600);
    const skyGradient = 'linear-gradient(to bottom, #403E43 0%, #E5DEFF 62%, #F97316 100%)';
    const { container } = render(<SunVisualization {...baseProps} skyGradient={skyGradient} />);
    const stops = [...container.querySelectorAll('#horizonGradient stop')].map((stop) => stop.getAttribute('stop-color'));
    const water = getWaterColors(skyGradient);
    expect(stops).toEqual([water.surface, water.deep]);
  });

  it('lays a horizon mist in rain, thicker with more rain (ROADMAP item 77, X4)', () => {
    const skyGradient = 'linear-gradient(to bottom, #403E43 0%, #E5DEFF 62%, #F97316 100%)';
    const mist = (props: object) =>
      render(<SunVisualization {...baseProps} skyGradient={skyGradient} {...props} />).container.querySelector<HTMLElement>('[data-testid="rain-mist"]');
    expect(Number(mist({ weatherType: 'rain', rainMmH: 0.2 })?.style.opacity)).toBeCloseTo(0.32, 2);
    expect(Number(mist({ weatherType: 'rain', rainMmH: 20 })?.style.opacity)).toBe(0.75);
    expect(Number(mist({ weatherType: 'storm' })?.style.opacity)).toBeCloseTo(0.68, 2); // 10 mm/h without an amount
    expect(mist({ weatherType: 'clear' })).toBeNull();
    expect(mist({ weatherType: 'snow' })).toBeNull();
  });

  it('draws the reflection bars under a visible sun, and none when clouds hide the sun (ROADMAP items 50, 53 rollback)', () => {
    setMockedContainerSize(800, 600);
    const { unmount } = render(<SunVisualization {...baseProps} />);
    const strip = screen.getByTestId('water-reflection');
    expect(strip.querySelectorAll('rect')).toHaveLength(7);
    unmount();

    render(<SunVisualization {...baseProps} weatherType="overcast" />);
    expect(screen.queryByTestId('water-reflection')).toBeNull();
  });

  it('draws the pool of moonlight at night, as bright as the moon is full (ROADMAP item 65)', () => {
    setMockedContainerSize(800, 600);
    const night = {
      ...baseProps,
      timeOfDay: 'night' as const,
      sunPosition: { azimuth: 0, altitude: -30 },
      moonPosition: { azimuth: 180, altitude: 30, phase: 0.5, illumination: 0.5, visible: true },
    };
    const { unmount } = render(<SunVisualization {...night} />);
    expect(screen.getByTestId('moon-pool').getAttribute('opacity')).toBe('0.5');
    unmount();

    render(<SunVisualization {...night} moonPosition={{ ...night.moonPosition, altitude: -5, visible: false }} />);
    expect(screen.queryByTestId('moon-pool')).toBeNull();
  });
});

describe('SunVisualization source (ROADMAP item 15, scene colour refactor)', () => {
  it('has no raw hex/rgb color literal outside of comments - scene colors are tokens', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/components/SunVisualization.tsx'),
      'utf-8'
    );
    // Strip //-comments (all the hex this file mentions - e.g. explaining which
    // token mirrors which old hex - live in comments) before scanning code lines.
    const codeOnly = source
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');

    expect(codeOnly).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(codeOnly).not.toMatch(/rgba?\(/);
  });
});

describe('avoidCollapsedPanel (AUDIT C-15, ROADMAP item 38)', () => {
  it('moves a label under the collapsed panel to just below it, keeping x', () => {
    // 390 px wide: panel box x >= 90, y 0-112. Moon zenith label seen at y ~89.
    expect(avoidCollapsedPanel({ x: 250, y: 89 }, 390)).toEqual({ x: 250, y: 127 });
  });
  it('leaves labels left of or below the panel alone', () => {
    expect(avoidCollapsedPanel({ x: 40, y: 89 }, 390)).toEqual({ x: 40, y: 89 });
    expect(avoidCollapsedPanel({ x: 250, y: 400 }, 390)).toEqual({ x: 250, y: 400 });
  });
  it('uses the lower panel position below 364 px width', () => {
    expect(avoidCollapsedPanel({ x: 200, y: 89 }, 360)).toEqual({ x: 200, y: 89 });
    expect(avoidCollapsedPanel({ x: 200, y: 200 }, 360)).toEqual({ x: 200, y: 287 });
  });
});

describe('sun and altitude pill (ROADMAP items 46, 48)', () => {
  const baseProps = {
    sunPosition: { azimuth: 180, altitude: 30 },
    moonPosition: { azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false },
    sunPath: [],
    moonPath: [],
    timeOfDay: 'midday' as const,
    weatherType: 'clear' as const,
    latitude: 51,
  };

  it('draws the line sun with rays, coloured per altitude band (item 46 rollback)', () => {
    render(<SunVisualization {...baseProps} sunPosition={{ azimuth: 270, altitude: 2.4 }} timeOfDay="evening" />);
    const sunDot = screen.getByTestId('sun-dot');
    expect(sunDot.querySelector('svg.lucide-sun')).not.toBeNull();
    expect(sunDot.className).toContain('text-orange-400');
  });

  it('mixes the line sun toward grey in drizzle, and not in clear weather (ROADMAP item 59)', () => {
    const { unmount } = render(<SunVisualization {...baseProps} weatherType="drizzle" />);
    expect(screen.getByTestId('sun-dot').querySelector('svg')?.getAttribute('style')).toContain('color-mix');
    unmount();
    render(<SunVisualization {...baseProps} />);
    expect(screen.getByTestId('sun-dot').querySelector('svg')?.getAttribute('style') ?? '').not.toContain('color-mix');
  });

  it('shows a faint pale sun in a white light patch when overcast (ROADMAP item 72)', () => {
    render(<SunVisualization {...baseProps} weatherType="overcast" />);
    const sunDot = screen.getByTestId('sun-dot');
    const sun = sunDot.querySelector('svg') as SVGElement;
    // The opacity must not sit on the button: its animate-glow animation would override it.
    expect(sunDot.className).toContain('animate-glow');
    expect(sunDot.style.opacity).toBe('');
    expect(sun.style.opacity).toBe('0.3');
    expect(sun.getAttribute('style')).toContain('color-mix');
    expect((sunDot.previousElementSibling as HTMLElement).style.background).toContain('--scene-glow-white');
  });

  it('never shows "-0.0°"', () => {
    expect(formatSunAltitude(-0.04)).toBe('0.0°');
    expect(formatSunAltitude(0.04)).toBe('0.0°');
    expect(formatSunAltitude(-3.1)).toBe('-3.1°');
    expect(formatSunAltitude(12.34)).toBe('+12.3°');
  });

  it('hides the altitude pill at night and keeps it in twilight', () => {
    const { unmount } = render(<SunVisualization {...baseProps} sunPosition={{ azimuth: 330, altitude: -37.1 }} timeOfDay="night" />);
    expect(screen.queryByTestId('sun-altitude')).not.toBeInTheDocument();
    unmount();
    render(<SunVisualization {...baseProps} sunPosition={{ azimuth: 290, altitude: -8 }} timeOfDay="nautical-twilight" />);
    expect(screen.getByTestId('sun-altitude')).toHaveTextContent('-8.0°');
  });

  it('shows the sunset countdown in the altitude pill, with the gold plus for line of sight (ROADMAP item 43)', () => {
    const { rerender } = render(<SunVisualization {...baseProps} sunsetCountdown={{ seconds: 7, lineOfSight: false }} />);
    const pill = () => screen.getByTestId('sun-altitude');
    expect(pill()).toHaveTextContent('Sunset in 7 s');
    expect(within(pill()).queryByTestId('premium-badge')).not.toBeInTheDocument();
    rerender(<SunVisualization {...baseProps} sunsetCountdown={{ seconds: 3, lineOfSight: true }} />);
    expect(pill()).toHaveTextContent('Sunset in 3 s');
    expect(within(pill()).getByTestId('premium-badge')).toBeInTheDocument();
  });

  it('with the countdown sound off, the pill is a button with a muted bell that turns the sound on (item 108)', () => {
    const onSoundOn = vi.fn();
    const { rerender } = render(<SunVisualization {...baseProps} sunsetCountdown={{ seconds: 7, lineOfSight: false }} onCountdownSoundOn={onSoundOn} />);
    const button = screen.getByRole('button', { name: 'Turn on the countdown sound' });
    expect(button).toHaveTextContent('Sunset in 7 s');
    fireEvent.click(button);
    expect(onSoundOn).toHaveBeenCalledTimes(1);
    rerender(<SunVisualization {...baseProps} sunsetCountdown={{ seconds: 7, lineOfSight: false }} />);
    expect(screen.queryByRole('button', { name: 'Turn on the countdown sound' })).not.toBeInTheDocument();
    expect(screen.getByTestId('sun-altitude')).toHaveTextContent('Sunset in 7 s');
  });
});

describe('SunVisualization sunglasses egg', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: 600, configurable: true });
  });

  const props = {
    sunPosition: { azimuth: 180, altitude: 40 },
    moonPosition: { azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false },
    sunPath: [],
    moonPath: [],
    timeOfDay: 'midday' as const,
    weatherType: 'clear' as const,
    latitude: 51,
  };

  it('the sun is a button that reports taps', () => {
    const onSunTap = vi.fn();
    render(<SunVisualization {...props} onSunTap={onSunTap} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sun' }));
    expect(onSunTap).toHaveBeenCalledTimes(1);
  });

  it('shows the sunglasses only when on', () => {
    const { rerender } = render(<SunVisualization {...props} />);
    expect(screen.queryByTestId('sun-sunglasses')).toBeNull();
    rerender(<SunVisualization {...props} sunglasses />);
    expect(screen.getByTestId('sun-sunglasses')).toBeInTheDocument();
  });
});

describe('SunVisualization info cards (ROADMAP item 95)', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: 600, configurable: true });
  });

  const profile: HorizonProfile = { angles: Array.from({ length: 360 }, (_, i) => (i === 100 ? 9 : 3)), observerElevation: 0, eyeHeight: 1.7 };
  const props = {
    sunPosition: { azimuth: 180, altitude: 40 },
    moonPosition: { azimuth: 120, altitude: 30, phase: 0.5, illumination: 1, visible: true },
    sunPath: [],
    moonPath: [],
    timeOfDay: 'night' as const,
    weatherType: 'clear' as const,
    latitude: 51,
    horizonProfile: profile,
  };

  it('maps a screen fraction back to the azimuth, in both hemispheres and in compass mode', () => {
    expect(getAzimuthAtFraction(getAzimuthScreenFraction(250, 51), 51)).toBeCloseTo(250);
    expect(getAzimuthAtFraction(getAzimuthScreenFraction(250, -33), -33)).toBeCloseTo(250);
    expect(getAzimuthAtFraction(getCompassScreenFraction(10, 350).fraction, 51, 350)).toBeCloseTo(10);
  });

  it('opens the sun card on a double tap; the egg counts each tap (item 116)', () => {
    const onSunTap = vi.fn();
    const onSceneInfo = vi.fn();
    render(<SunVisualization {...props} timeOfDay="midday" onSunTap={onSunTap} onSceneInfo={onSceneInfo} />);
    const sun = screen.getByRole('button', { name: 'Sun' });
    expect(sun.className).toContain('touch-manipulation');
    fireEvent.click(sun, { detail: 1, clientX: 400, clientY: 100 });
    expect(onSunTap).toHaveBeenCalledTimes(1);
    expect(onSceneInfo).not.toHaveBeenCalled();
    expect(sun.querySelector('[data-testid="scene-info-ring"]')).not.toBeNull();
    fireEvent.click(sun, { detail: 2, clientX: 400, clientY: 100 });
    expect(onSunTap).toHaveBeenCalledTimes(2);
    expect(onSceneInfo).toHaveBeenCalledWith({ type: 'sun' }, { x: 400, y: 100 }, 'sun');
  });

  it('counts 7 single sun taps for the egg and opens no card; a keyboard click opens it at once (item 116)', () => {
    vi.useFakeTimers();
    try {
      const onSunTap = vi.fn();
      const onSceneInfo = vi.fn();
      render(<SunVisualization {...props} timeOfDay="midday" onSunTap={onSunTap} onSceneInfo={onSceneInfo} />);
      const sun = screen.getByRole('button', { name: 'Sun' });
      for (let i = 0; i < 7; i++) {
        fireEvent.click(sun, { detail: 1, clientX: 400, clientY: 100 });
        act(() => { vi.advanceTimersByTime(500); });
      }
      expect(onSunTap).toHaveBeenCalledTimes(7);
      expect(onSceneInfo).not.toHaveBeenCalled();
      fireEvent.click(sun, { detail: 0 }); // Enter or Space
      expect(onSunTap).toHaveBeenCalledTimes(8);
      expect(onSceneInfo).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('the moon reports each tap for the disco egg, beside its card', () => {
    const onMoonTap = vi.fn();
    const onSceneInfo = vi.fn();
    render(<SunVisualization {...props} onMoonTap={onMoonTap} onSceneInfo={onSceneInfo} />);
    fireEvent.click(screen.getByRole('button', { name: 'Moon' }), { detail: 0 }); // keyboard click opens the card at once (item 116)
    expect(onMoonTap).toHaveBeenCalledTimes(1);
    expect(onSceneInfo).toHaveBeenCalledWith({ type: 'moon' }, expect.anything(), 'moon');
  });

  it('the moon is no tap target while it is not shown', () => {
    render(<SunVisualization {...props} moonPosition={{ ...props.moonPosition, visible: false }} />);
    expect(screen.queryByRole('button', { name: 'Moon' })).toBeNull();
  });

  it('makes the moon a button of at least 44 px that opens its card, also from the keyboard', () => {
    const onSceneInfo = vi.fn();
    render(<SunVisualization {...props} onSceneInfo={onSceneInfo} />);
    const moon = screen.getByRole('button', { name: 'Moon' });
    expect(moon.className).toContain('min-w-11');
    expect(moon.className).toContain('min-h-11');
    fireEvent.click(moon); // a keyboard click: no point, so the centre of the button; it opens at once
    expect(onSceneInfo).toHaveBeenCalledWith({ type: 'moon' }, expect.objectContaining({ x: expect.any(Number) }), 'moon');
    // Item 116: a pointer opens the card only on a double tap.
    onSceneInfo.mockClear();
    expect(moon.className).toContain('touch-manipulation');
    fireEvent.click(moon, { detail: 1, clientX: 300, clientY: 150 });
    expect(onSceneInfo).not.toHaveBeenCalled();
    expect(moon.querySelector('[data-testid="scene-info-ring"]')).not.toBeNull();
    fireEvent.click(moon, { detail: 2, clientX: 300, clientY: 150 });
    expect(onSceneInfo).toHaveBeenCalledWith({ type: 'moon' }, { x: 300, y: 150 }, 'moon');
  });

  it('lets taps through to the UFO behind it; the sun and the moon still take taps (item 113 follow-up)', () => {
    render(<SunVisualization {...props} timeOfDay="midday" />);
    expect(screen.getByTestId('sun-visualization').className).toContain('pointer-events-none');
    expect(screen.getByRole('button', { name: 'Sun' }).className).toContain('pointer-events-auto');
    cleanup();
    render(<SunVisualization {...props} />);
    expect(screen.getByRole('button', { name: 'Moon' }).className).toContain('pointer-events-auto');
  });

  it('makes the terrain a button: a tap reads the azimuth under it, Enter picks the highest ridge', () => {
    const onSceneInfo = vi.fn();
    render(<SunVisualization {...props} onSceneInfo={onSceneInfo} />);
    const terrain = screen.getByRole('button', { name: 'Terrain' });
    expect(terrain.getAttribute('tabindex')).toBe('0');
    expect(terrain.getAttribute('class')).toContain('touch-manipulation');
    fireEvent.click(terrain, { clientX: 400, clientY: 380, detail: 1 }); // the middle of 800 px: 180°
    expect(onSceneInfo).not.toHaveBeenCalled(); // item 116: a double tap opens the card
    fireEvent.click(terrain, { clientX: 400, clientY: 380, detail: 2 });
    expect(onSceneInfo.mock.calls[0][0]).toEqual({ type: 'terrain', azimuth: 180 });
    expect(onSceneInfo.mock.calls[0][1]).toEqual({ x: 400, y: 380 });
    fireEvent.keyDown(terrain, { key: 'Enter' }); // the keyboard opens at once
    expect(onSceneInfo).toHaveBeenCalledTimes(2);
    expect(onSceneInfo.mock.calls[1][0].azimuth).toBeCloseTo(100);
  });
});

describe('SunVisualization (rendered): the moon behind clouds (ROADMAP item 76)', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: 600, configurable: true });
  });

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });

  const nightProps = {
    sunPosition: { azimuth: 0, altitude: -40 },
    moonPosition: { azimuth: 180, altitude: 30, phase: 0.6, illumination: 0.5, visible: true },
    sunPath: [],
    moonPath: [],
    timeOfDay: 'night' as const,
    latitude: 48,
    longitude: 11,
    date: new Date('2026-06-15T23:00:00Z'),
  };
  const bright = 0.5 * 0.8 + 0.2;

  it('keeps a quarter of the disc and adds a corona in manual rain (no cover value)', () => {
    render(<SunVisualization {...nightProps} weatherType="rain" cloudCoverPercent={null} />);
    expect(Number(screen.getByTestId('moon-disc').style.opacity)).toBeCloseTo(bright * 0.25);
    expect(screen.getByTestId('moon-corona')).toBeInTheDocument();
  });

  it('shows the full disc and no corona on a clear night', () => {
    render(<SunVisualization {...nightProps} weatherType="clear" cloudCoverPercent={0} />);
    expect(Number(screen.getByTestId('moon-disc').style.opacity)).toBeCloseTo(bright);
    expect(screen.queryByTestId('moon-corona')).toBeNull();
  });

  it('keeps the moon button at a new moon, so its badge can be collected (item 115)', () => {
    render(<SunVisualization {...nightProps} moonPosition={{ ...nightProps.moonPosition, phase: 0, illumination: 0 }} weatherType="clear" cloudCoverPercent={0} />);
    const moon = screen.getByRole('button', { name: 'Moon' });
    expect(moon.className).toContain('pointer-events-auto');
    expect(Number(moon.style.opacity)).toBeCloseTo(0.2);
  });

  it('shows only the corona in fog and nothing in a storm', () => {
    const { rerender } = render(<SunVisualization {...nightProps} weatherType="fog" cloudCoverPercent={null} />);
    expect(screen.queryByTestId('moon-disc')).toBeNull();
    expect(screen.getByTestId('moon-corona')).toBeInTheDocument();
    rerender(<SunVisualization {...nightProps} weatherType="storm" cloudCoverPercent={null} />);
    expect(screen.queryByTestId('moon-disc')).toBeNull();
    expect(screen.queryByTestId('moon-corona')).toBeNull();
  });
});

describe('SunVisualization (rendered): waves by wind strength (ROADMAP item 79)', () => {
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: 600, configurable: true });
  });

  afterEach(() => {
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });

  const waveProps = {
    sunPosition: { azimuth: 180, altitude: 30 },
    moonPosition: { azimuth: 0, altitude: -10, phase: 0.5, illumination: 0.5, visible: false },
    sunPath: [],
    moonPath: [],
    timeOfDay: 'midday' as const,
    weatherType: 'clear' as const,
    latitude: 51,
  };

  it('draws the sea canvas over the sea fill and under the reflection bars', () => {
    render(<SunVisualization {...waveProps} windSpeedKmh={20} />);
    const sea = screen.getByTestId('sea');
    const canvas = screen.getByTestId('sea-canvas');
    const reflection = screen.getByTestId('water-reflection');
    expect(sea.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(canvas.compareDocumentPosition(reflection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('lays out the reflection bars by the wind: 10 in calm water, 7 in light air or without a reading, pieces in strong wind', () => {
    const bars = (windSpeedKmh: number | null) => {
      const { unmount } = render(<SunVisualization {...waveProps} windSpeedKmh={windSpeedKmh} />);
      const count = screen.getByTestId('water-reflection').querySelectorAll('rect').length;
      unmount();
      return count;
    };
    expect(bars(0)).toBe(10);
    expect(bars(12)).toBe(7);
    expect(bars(null)).toBe(7);
    expect(bars(70)).toBe(36);
  });
});
