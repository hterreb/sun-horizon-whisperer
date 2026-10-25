import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { preloadMonitoring } from '@/utils/monitoring';
import InfoPanel from '../src/components/InfoPanel';
import { type SunTimes, type TimeOfDay } from '../src/utils/sunUtils';
import { type WeatherType } from '../src/components/CloudLayer';

// Item 174: everything below the info panel's header is its own chunk. The closed panel and
// its header stay in the first bundle.
const SRC = path.resolve(__dirname, '../src');
const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : [],
  );

describe('the info panel body chunk (ROADMAP item 174)', () => {
  it('is imported only through a dynamic import, so the first bundle does not hold it', () => {
    const staticImport = /^\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+['"][^'"]*InfoPanelBody['"]/m;
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.endsWith('InfoPanelBody.tsx'))
      .filter((file) => staticImport.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
    const panel = fs.readFileSync(path.join(SRC, 'components/InfoPanel.tsx'), 'utf8');
    expect(panel).toMatch(/import\('\.\/InfoPanelBody'\)/);
    expect(panel).toMatch(/lazy\(preloadPanelBody\)/);
  });

  it('keeps the header (time of day, place, toggle) outside the chunk', () => {
    const body = fs.readFileSync(path.join(SRC, 'components/InfoPanelBody.tsx'), 'utf8');
    expect(body).not.toContain('panel.expand');
    expect(body).not.toContain('location.loading');
  });
});

describe('InfoPanel body on a phone (ROADMAP item 174)', () => {
  const width = window.innerWidth;
  beforeAll(preloadMonitoring);
  afterEach(() => {
    window.innerWidth = width;
  });
  const sunTimes = {
    sunrise: new Date('2026-10-19T05:46:00Z'), sunset: new Date('2026-10-19T16:28:00Z'), solarNoon: new Date('2026-10-19T11:07:00Z'),
    dawn: new Date('2026-10-19T05:15:00Z'), dusk: new Date('2026-10-19T16:59:00Z'), nauticalDawn: new Date('2026-10-19T04:40:00Z'),
    nauticalDusk: new Date('2026-10-19T17:34:00Z'), astronomicalDawn: new Date('2026-10-19T04:06:00Z'), astronomicalDusk: new Date('2026-10-19T18:08:00Z'), polar: null,
  } as SunTimes;
  const props = {
    sunPosition: { azimuth: 180, altitude: 30 },
    moonPosition: { azimuth: 90, altitude: -10, phase: 0.5, illumination: 1, visible: false },
    moonTimes: { rise: null, set: null, alwaysUp: false, alwaysDown: false },
    nextFullMoon: new Date('2026-10-26T12:00:00Z'),
    nextNewMoon: new Date('2026-11-09T12:00:00Z'),
    sunTimes,
    nextGoldenBlueHours: null,
    location: { latitude: 47.78, longitude: 9.61, loaded: true },
    manualPlaceName: 'Ravensburg, Germany',
    timeOfDay: 'midday' as TimeOfDay,
    currentTime: new Date('2026-10-19T12:00:00Z'),
    weatherType: 'clear' as WeatherType,
    weatherData: null,
    isLoadingWeather: false,
    useRealWeather: true,
    onWeatherChange: () => {},
    onWeatherModeToggle: () => {},
    onWeatherRefresh: () => {},
    onLocationChange: () => {},
    onUseMyLocation: () => {},
  };

  it('draws only the header while closed, and the body after the first open', async () => {
    window.innerWidth = 390;
    render(<InfoPanel {...props} />);
    expect(screen.getByRole('heading', { name: /midday/i })).toBeInTheDocument();
    expect(screen.queryByText(/weather mode/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-body-loading')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Expand info panel'));
    expect(await screen.findByText(/weather mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse info panel')).toBeInTheDocument();
  });

  it('keeps a card the user opened when the panel is closed and opened again', async () => {
    window.innerWidth = 390;
    render(<InfoPanel {...props} />);
    fireEvent.click(screen.getByLabelText('Expand info panel'));
    await screen.findByText(/weather mode/i);
    const before = screen.getAllByRole('button', { expanded: false }).length;
    const toggle = screen.getAllByRole('button', { expanded: false })[0];
    fireEvent.click(toggle);
    const opened = screen.getAllByRole('button', { expanded: false }).length;
    expect(opened).toBe(before - 1);
    fireEvent.click(screen.getByLabelText('Collapse info panel'));
    fireEvent.click(screen.getByLabelText('Expand info panel'));
    await screen.findByText(/weather mode/i);
    expect(screen.getAllByRole('button', { expanded: false }).length).toBe(opened);
  });
});
