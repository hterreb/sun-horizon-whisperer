import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import fixture from './fixtures/iss-omm-2026-10-05.json';
import { useSatelliteTracking, useSatellitePassReminder } from '../src/hooks/useSatelliteTracking';
import { loadSatelliteData, type GpRecord } from '../src/utils/satelliteData';
import { type SatellitePass } from '../src/utils/satelliteUtils';

vi.mock('../src/utils/satelliteData', () => ({ loadSatelliteData: vi.fn() }));

const { latitude, longitude } = fixture.reference.observer;
const [refFull] = fixture.reference.passes;
const load = vi.mocked(loadSatelliteData);

describe('useSatelliteTracking (ROADMAP item 97)', () => {
  beforeEach(() => {
    load.mockReset();
    load.mockResolvedValue([fixture.omm as unknown as GpRecord]);
  });

  it('loads nothing and tracks nothing while off', () => {
    const { result } = renderHook(() => useSatelliteTracking(false, new Date(refFull.max), latitude, longitude, -9, false));
    expect(load).not.toHaveBeenCalled();
    expect(result.current.sky).toBeNull();
    expect(result.current.lib).toBeNull();
  });

  it('loads satellite.js and the data when on, then shows the ISS in the sky', async () => {
    const { result } = renderHook(() => useSatelliteTracking(true, new Date(refFull.max), latitude, longitude, -9, false));
    await waitFor(() => expect(result.current.sky).not.toBeNull());
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.sky).toEqual([expect.objectContaining({ id: 25544, visible: true })]);
    expect(result.current.issPass).toBeNull();
  });

  it('computes no sky in daylight, and none far from the data\'s epoch', async () => {
    const day = renderHook(() => useSatelliteTracking(true, new Date(refFull.max), latitude, longitude, 10, false));
    await waitFor(() => expect(day.result.current.sky).toEqual([]));
    const later = renderHook(() => useSatelliteTracking(true, new Date('2026-12-24T18:45:00Z'), latitude, longitude, -9, false));
    await waitFor(() => expect(later.result.current.satellites).toHaveLength(1));
    expect(later.result.current.sky).toBeNull();
  });

  it('gives the next ISS pass for the reminder when asked', async () => {
    const { result } = renderHook(() => useSatelliteTracking(true, new Date('2026-10-06T18:35:00Z'), latitude, longitude, -9, true));
    await waitFor(() => expect(result.current.issPass).not.toBeNull());
    expect(Math.abs(result.current.issPass!.start.getTime() - Date.parse(refFull.start))).toBeLessThanOrEqual(60_000);
  });

  it('loads the data for the ISS reminder alone, without a sky (tracking off)', async () => {
    const { result } = renderHook(() => useSatelliteTracking(false, new Date('2026-10-06T18:35:00Z'), latitude, longitude, -9, true));
    await waitFor(() => expect(result.current.issPass).not.toBeNull());
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.current.sky).toBeNull();
  });

  it('stays without satellites when the data cannot be loaded', async () => {
    load.mockResolvedValue(null);
    const { result } = renderHook(() => useSatelliteTracking(true, new Date(refFull.max), latitude, longitude, -9, false));
    await waitFor(() => expect(result.current.lib).not.toBeNull());
    expect(result.current.sky).toBeNull();
  });
});

describe('useSatellitePassReminder', () => {
  const shown: string[] = [];
  class FakeNotification {
    static permission = 'granted';
    constructor(_title: string, options: NotificationOptions) {
      shown.push(options.body ?? '');
    }
    close() {}
  }
  const pass: SatellitePass = {
    start: new Date('2026-10-06T18:14:00Z'), end: new Date('2026-10-06T18:19:00Z'),
    startAzimuth: 270, startElevation: 10, endAzimuth: 135, endElevation: 10,
    maxElevation: 54, maxAt: new Date('2026-10-06T18:16:30Z'), inProgress: false,
  };

  beforeEach(() => {
    shown.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal('Notification', FakeNotification);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows one notification 10 min before the pass', async () => {
    vi.setSystemTime(new Date('2026-10-06T18:03:00Z'));
    renderHook(() => useSatellitePassReminder(pass, true, 'en'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(shown).toEqual([]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatch(/^ISS visible at .*, from W to SE, up to 54°$/);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(shown).toHaveLength(1);
  });

  it('shows nothing while not active', async () => {
    vi.setSystemTime(new Date('2026-10-06T18:05:00Z'));
    renderHook(() => useSatellitePassReminder(pass, false, 'en'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(shown).toEqual([]);
  });
});
