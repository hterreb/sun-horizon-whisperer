import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LightSky, { LIGHT_SKY_FADE_MS, SCENE_HANDOFF_MS } from '../src/components/LightSky';
import SunVisualization from '../src/components/SunVisualization';
import SceneHandoff from '../src/components/SceneHandoff';
import { useSceneHandoff } from '../src/hooks/useSceneHandoff';
import { getBackgroundGradient, getSunPosition, getSunTimes, getTimeOfDay } from '../src/utils/sunUtils';
import { getMoonPosition } from '../src/utils/moonUtils';
import { type WeatherType } from '../src/components/CloudLayer';

// Item 174: the light first sky and the full scene are two drawings of one sky. They share the
// mapping (utils/skyLook.ts); these tests keep them from drifting apart, since the full scene
// replaces the light sky with no jump.
const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const setSize = (width: number, height: number) => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { value: height, configurable: true });
};
afterEach(() => {
  cleanup();
  if (originalWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalWidth);
  if (originalHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalHeight);
});

const skyAt = (iso: string, latitude: number, longitude: number, weatherType: WeatherType = 'clear') => {
  const date = new Date(iso);
  const sunPosition = getSunPosition(date, latitude, longitude);
  const moonPosition = getMoonPosition(date, latitude, longitude);
  const timeOfDay = getTimeOfDay(date, getSunTimes(date, latitude, longitude), sunPosition.altitude);
  return {
    sunPosition, moonPosition, timeOfDay, weatherType, latitude, longitude, date,
    skyGradient: getBackgroundGradient(timeOfDay),
  };
};

const renderBoth = (sky: ReturnType<typeof skyAt>) => {
  render(
    <>
      <LightSky
        sunPosition={sky.sunPosition}
        moonPosition={sky.moonPosition}
        timeOfDay={sky.timeOfDay}
        skyGradient={sky.skyGradient}
        weatherType={sky.weatherType}
        latitude={sky.latitude}
      />
      <SunVisualization
        sunPosition={sky.sunPosition}
        moonPosition={sky.moonPosition}
        sunPath={[]}
        moonPath={[]}
        timeOfDay={sky.timeOfDay}
        skyGradient={sky.skyGradient}
        weatherType={sky.weatherType}
        latitude={sky.latitude}
        longitude={sky.longitude}
        date={sky.date}
      />
    </>,
  );
};

const place = (element: HTMLElement) => ({ left: element.style.left, top: element.style.top });

describe('LightSky (ROADMAP item 174)', () => {
  it.each([
    ['Ravensburg, 14:00 (a phone)', '2026-09-16T12:00:00Z', 47.78, 9.61, 375, 667],
    ['Ravensburg, 06:30 (the sun near the horizon)', '2026-09-16T04:30:00Z', 47.78, 9.61, 375, 667],
    ['Sydney, 02:00 UTC (the southern hemisphere)', '2026-09-16T02:00:00Z', -33.87, 151.2, 800, 600],
    ['Tromso, noon in the polar night', '2026-12-21T11:00:00Z', 69.65, 18.96, 1280, 720],
  ])('puts the sun where the full scene puts it: %s', (_name, iso, latitude, longitude, width, height) => {
    setSize(width, height);
    const sky = skyAt(iso, latitude, longitude);
    renderBoth(sky);
    const light = screen.queryByTestId('light-sky-sun');
    const full = screen.queryByTestId('sun-dot');
    // One sky, one rule for "the sun is shown": both draw it or neither does.
    expect(Boolean(light)).toBe(Boolean(full));
    if (light && full) expect(place(light)).toEqual(place(full));
  });

  it('puts the sun at a real, measured place (not at 0, 0)', () => {
    setSize(375, 667);
    renderBoth(skyAt('2026-09-16T12:00:00Z', 47.78, 9.61));
    const sun = screen.getByTestId('light-sky-sun');
    expect(parseFloat(sun.style.left)).toBeGreaterThan(30);
    expect(parseFloat(sun.style.top)).toBeGreaterThan(30);
    expect(parseFloat(sun.style.top)).toBeLessThan(667 * 0.65);
  });

  it('puts the moon where the full scene puts it, at night', () => {
    setSize(375, 667);
    // A night with the moon up: scan the hours of a few days for one.
    const night = ['night', 'astronomical-twilight', 'nautical-twilight'];
    let found = skyAt('2026-09-16T00:00:00Z', 47.78, 9.61);
    for (let hour = 0; hour < 72 && !(found.moonPosition.visible && night.includes(found.timeOfDay)); hour++) {
      found = skyAt(new Date(Date.UTC(2026, 8, 16, hour)).toISOString(), 47.78, 9.61);
    }
    expect(found.moonPosition.visible).toBe(true);
    expect(['night', 'astronomical-twilight', 'nautical-twilight']).toContain(found.timeOfDay);
    renderBoth(found);
    const light = screen.getByTestId('light-sky-moon');
    const full = screen.getByTestId('moon-disc');
    expect(place(light)).toEqual(place(full));
    expect(light.querySelector('svg')?.getAttribute('width')).toBe(full.querySelector('svg')?.getAttribute('width'));
    expect(light.querySelector('path')?.getAttribute('d')).toBe(full.querySelector('path')?.getAttribute('d'));
  });

  it('draws the same horizon and the same compass labels as the full scene', () => {
    setSize(375, 667);
    renderBoth(skyAt('2026-09-16T12:00:00Z', 47.78, 9.61));
    expect(screen.getByTestId('light-sky-sea').querySelector('path')?.getAttribute('d')).toBe(
      screen.getByTestId('sea').getAttribute('d'),
    );
    const pillsOf = (container: HTMLElement) =>
      Array.from(container.children).map((pill) => ({
        text: pill.textContent,
        left: (pill as HTMLElement).style.left,
        top: (pill as HTMLElement).style.top,
      }));
    expect(pillsOf(screen.getByTestId('light-sky-labels'))).toEqual(pillsOf(screen.getByTestId('cardinal-labels')));
    expect(within(screen.getByTestId('light-sky-labels')).getAllByText(/^[NESW]{1,2}$/).length).toBeGreaterThan(3);
  });

  it('draws no sun when the weather hides it, as the full scene does', () => {
    setSize(375, 667);
    renderBoth(skyAt('2026-09-16T12:00:00Z', 47.78, 9.61, 'fog'));
    expect(screen.queryByTestId('light-sky-sun')).toBeNull();
    expect(screen.queryByTestId('sun-dot')).toBeNull();
  });

  it('takes no taps and is hidden from assistive tech: the full scene brings both', () => {
    setSize(375, 667);
    renderBoth(skyAt('2026-09-16T12:00:00Z', 47.78, 9.61));
    const light = screen.getByTestId('light-sky');
    expect(light).toHaveAttribute('aria-hidden', 'true');
    expect(light.className).toContain('pointer-events-none');
    expect(light.querySelector('button, a, [role="button"]')).toBeNull();
  });
});

describe('the hand-over from the light sky to the full scene (ROADMAP item 174)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const Probe: React.FC = () => {
    const { stage, onShown } = useSceneHandoff();
    return (
      <>
        <p data-testid="stage">{stage}</p>
        <button onClick={onShown}>shown</button>
      </>
    );
  };

  it('waits for the scene, fades it in over the light sky, then fades the light sky out and removes it', () => {
    render(<Probe />);
    expect(screen.getByTestId('stage')).toHaveTextContent('light');
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByTestId('stage')).toHaveTextContent('light'); // no timer without the scene
    act(() => { screen.getByText('shown').click(); });
    expect(screen.getByTestId('stage')).toHaveTextContent('handoff');
    act(() => { vi.advanceTimersByTime(SCENE_HANDOFF_MS - 1); });
    expect(screen.getByTestId('stage')).toHaveTextContent('handoff'); // the light sky stays opaque
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByTestId('stage')).toHaveTextContent('leaving');
    act(() => { vi.advanceTimersByTime(LIGHT_SKY_FADE_MS + 50); });
    expect(screen.getByTestId('stage')).toHaveTextContent('full');
  });

  it('the scene wrapper reports once that the scene is in and fades it in', () => {
    const onShown = vi.fn();
    render(<SceneHandoff onShown={onShown}><p>scene</p></SceneHandoff>);
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(screen.getByText('scene').parentElement?.className).toContain('animate-scene-handoff');
  });

  it('the light sky stays opaque while it waits and fades out only when it leaves', () => {
    setSize(375, 667);
    const sky = skyAt('2026-09-16T12:00:00Z', 47.78, 9.61);
    const props = {
      sunPosition: sky.sunPosition, moonPosition: sky.moonPosition, timeOfDay: sky.timeOfDay,
      skyGradient: sky.skyGradient, weatherType: sky.weatherType, latitude: sky.latitude,
    };
    const { rerender } = render(<LightSky {...props} />);
    expect(screen.getByTestId('light-sky').style.opacity).toBe('1');
    rerender(<LightSky {...props} leaving />);
    expect(screen.getByTestId('light-sky').style.opacity).toBe('0');
    expect(screen.getByTestId('light-sky').style.transition).toContain(`${LIGHT_SKY_FADE_MS}ms`);
  });
});

describe('what the first bundle holds (ROADMAP item 174)', () => {
  const SRC = path.resolve(__dirname, '../src');
  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? sourceFiles(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : [],
    );
  // The modules a file imports as values (an `import type`, or one whose names are all `type`, is erased).
  const valueImports = (file: string): string[] => {
    const source = fs.readFileSync(file, 'utf8');
    return Array.from(source.matchAll(/^import\s+(type\s+)?([^;]*?)\s+from\s+['"]([^'"]+)['"]/gm))
      .filter(([, typeOnly, clause]) => {
        if (typeOnly) return false;
        const named = clause.match(/\{([^}]*)\}/)?.[1];
        const hasDefault = /^\w+/.test(clause.trim());
        return hasDefault || !named || named.split(',').some((part) => part.trim() && !part.trim().startsWith('type '));
      })
      .map(([, , , specifier]) => specifier);
  };

  it('loads the full scene only through a dynamic import, so the light sky is all the first bundle draws', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.endsWith('/SunVisualization.tsx'))
      .filter((file) => valueImports(file).some((specifier) => /\/SunVisualization$/.test(specifier)));
    expect(offenders).toEqual([]);
    const tracker = fs.readFileSync(path.join(SRC, 'components/SunTracker.tsx'), 'utf8');
    expect(tracker).toMatch(/import\('\.\/SunVisualization'\)/);
    expect(tracker).toMatch(/lazy\(loadScene\)/);
  });

  it('keeps the light sky to the small shared mapping: no scene, cloud, sea, rain or terrain code', () => {
    const imports = valueImports(path.join(SRC, 'components/LightSky.tsx'));
    for (const heavy of ['SunVisualization', 'CloudLayer', 'SeaCanvas', 'SkyClouds', 'RainCanvas', 'WeatherEffects', 'treeSilhouettes', 'horizonUtils', 'skyCloudUtils']) {
      expect(imports.filter((specifier) => specifier.includes(heavy))).toEqual([]);
    }
    expect(imports).toContain('@/utils/skyLook');
  });
});
