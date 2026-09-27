import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import SunVisualization, {
  getAzimuthScreenFraction,
  getVisibleCardinalLabels,
  crossesHorizon,
  buildArcPath,
} from '../src/components/SunVisualization';

describe('getAzimuthScreenFraction (C-3)', () => {
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

  it('applies a compass-mode azimuthOffset on top of the hemisphere shift (ROADMAP item 8)', () => {
    expect(getAzimuthScreenFraction(180, 51, 0)).toBeCloseTo(getAzimuthScreenFraction(180, 51));
    expect(getAzimuthScreenFraction(180, 51, 90)).toBeCloseTo(0.75);
    // Wraps correctly past 360/0.
    expect(getAzimuthScreenFraction(350, 51, 20)).toBeCloseTo((350 + 20 - 360) / 360);
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

  it('shifts together with a compass-mode azimuthOffset', () => {
    const withOffset = getVisibleCardinalLabels(51, 90);
    expect(withOffset.find((l) => l.label === 'N')?.fraction).toBeCloseTo(0.25);
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


describe('buildArcPath (moon arc)', () => {
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
});
