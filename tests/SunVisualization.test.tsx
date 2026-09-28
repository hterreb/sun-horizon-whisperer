import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import SunVisualization, {
  getAzimuthScreenFraction,
  getCompassScreenFraction,
  getVisibleCardinalLabels,
  crossesHorizon,
  buildArcPath,
  getRainbowGeometry,
  COMPASS_FOV_DEG,
  buildTerrainSegments,
} from '../src/components/SunVisualization';
import type { HorizonProfile } from '../src/utils/horizonUtils';

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


describe('buildArcPath (sun/moon arcs, ROADMAP item 17)', () => {
  const toXY = (p: { altitude: number; azimuth: number }) => ({ x: p.azimuth, y: -p.altitude });

  it('skips below-horizon points and starts a new segment after the gap', () => {
    const path = buildArcPath(
      [
        { altitude: -5, azimuth: 0 },
        { altitude: 10, azimuth: 1 },
        { altitude: 20, azimuth: 2 },
        { altitude: -1, azimuth: 3 },
        { altitude: 5, azimuth: 4 },
      ],
      toXY
    );
    expect(path).toBe('M1,-10 L2,-20 M4,-5');
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
});
