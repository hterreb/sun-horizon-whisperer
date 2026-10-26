import { act, configure, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import fixture from './fixtures/iss-omm-2026-10-05.json';
import { getSatellitesTag, useSatelliteTracking, useSatellitePassReminder } from '../src/hooks/useSatelliteTracking';
import { getNextSatelliteTry, loadSatelliteData, type GpRecord } from '../src/utils/satelliteData';
import { type SatellitePass } from '../src/utils/satelliteUtils';

vi.mock('../src/utils/satelliteData', () => ({ loadSatelliteData: vi.fn(), getNextSatelliteTry: vi.fn(() => null) }));

// The waits below cover the dynamic import of satellite.js, which takes over the default
// 1 s on a loaded machine, so the tests failed now and then (also on main). Only this file.
configure({ asyncUtilTimeout: 5000 });

const { latitude, longitude } = fixture.reference.observer;
const [refFull] = fixture.reference.passes;
const load = vi.mocked(loadSatelliteData);
const nextTry = vi.mocked(getNextSatelliteTry);

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

  // Item 164: the status for the panel and the Sentry tag. "Too old" is at the real time.
  describe('status and refresh (item 164)', () => {
    const scene = new Date(refFull.max);
    const render = () => renderHook(() => useSatelliteTracking(true, scene, latitude, longitude, -9, false));
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(scene);
      nextTry.mockReset();
      nextTry.mockReturnValue(null);
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.doUnmock('satellite.js');
      vi.restoreAllMocks();
    });

    it('is loading until satellite.js and the data come, then ok', async () => {
      let answer: (data: GpRecord[] | null) => void = () => {};
      load.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
      const { result } = render();
      await waitFor(() => expect(result.current.lib).not.toBeNull());
      expect(result.current.status).toBe('loading');
      await act(async () => answer([fixture.omm as unknown as GpRecord]));
      expect(result.current.status).toBe('ok');
      expect(result.current.nextTryAt).toBeNull();
    });

    it('is error without data, and ok after a refresh that brings data', async () => {
      load.mockResolvedValue(null);
      const { result } = render();
      await waitFor(() => expect(result.current.status).toBe('error'));
      let answer: (data: GpRecord[] | null) => void = () => {};
      load.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
      act(() => result.current.refresh());
      expect(load).toHaveBeenCalledTimes(2);
      expect(result.current.refreshing).toBe(true);
      expect(result.current.status).toBe('error');
      await act(async () => answer([fixture.omm as unknown as GpRecord]));
      expect(result.current.refreshing).toBe(false);
      expect(result.current.status).toBe('ok');
      expect(result.current.sky).toEqual([expect.objectContaining({ id: 25544 })]);
    });

    it('is error when the data is more than 3 days old at the real time', async () => {
      load.mockResolvedValue([fixture.omm as unknown as GpRecord]);
      vi.setSystemTime(Date.parse(fixture.omm.EPOCH + 'Z') + 3 * 24 * 3600_000 + 60_000);
      const { result } = render();
      await waitFor(() => expect(result.current.status).toBe('error'));
      // The scene's time is near the epoch, so the sky still shows the ISS.
      expect(result.current.sky).not.toBeNull();
    });

    it('is ok in a time preview far from the epoch: the decorative dots are by design', async () => {
      load.mockResolvedValue([fixture.omm as unknown as GpRecord]);
      const { result } = renderHook(() => useSatelliteTracking(true, new Date('2026-12-24T18:45:00Z'), latitude, longitude, -9, false));
      await waitFor(() => expect(result.current.status).toBe('ok'));
      expect(result.current.sky).toBeNull();
    });

    it('gives the cache\'s next try while the wait runs, and null after it', async () => {
      // The hook's clock (an interval) moves the real time once a minute.
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
      vi.setSystemTime(scene);
      const at = scene.getTime() + 90 * 60_000;
      nextTry.mockReturnValue(at);
      load.mockResolvedValue(null);
      const { result } = render();
      // waitFor polls with setInterval, which is fake here: let the import and the load settle.
      for (let i = 0; i < 5; i++) await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
      expect(result.current.status).toBe('error');
      expect(result.current.nextTryAt).toBe(at);
      act(() => { vi.advanceTimersByTime(89 * 60_000); });
      expect(result.current.nextTryAt).toBe(at);
      act(() => { vi.advanceTimersByTime(60_000); });
      expect(result.current.nextTryAt).toBeNull();
    });

    it('drops the next try when its time comes, not at the next minute step (item 176)', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
      vi.setSystemTime(scene);
      const at = scene.getTime() + 90 * 60_000 + 30_000; // between two minute steps
      nextTry.mockReturnValue(at);
      load.mockResolvedValue(null);
      const { result } = render();
      for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.nextTryAt).toBe(at);
      await act(async () => { await vi.advanceTimersByTimeAsync(90 * 60_000 + 29_000); });
      expect(result.current.nextTryAt).toBe(at);
      await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
      expect(result.current.nextTryAt).toBeNull();
    });

    // Item 177: the real loadSatelliteData with a blocked CelesTrak and our server's answer.
    it('is ok from the server data while CelesTrak fails; error only when the server fails too', async () => {
      const actual = await vi.importActual<typeof import('../src/utils/satelliteData')>('../src/utils/satelliteData');
      localStorage.clear();
      load.mockImplementation((...args) => actual.loadSatelliteData(...args));
      const iss = fixture.omm as unknown as GpRecord;
      let serverAnswer: GpRecord[] = [iss];
      const fetchMock = vi.fn(async (url: string) => (
        url === actual.ALL_GROUPS_URL ? new Response(JSON.stringify(serverAnswer), { status: 200 }) : new Response('blocked', { status: 403 })
      ));
      vi.stubGlobal('fetch', fetchMock);
      try {
        const { result } = render();
        await waitFor(() => expect(result.current.status).toBe('ok'));
        expect(result.current.satellites).toHaveLength(1);
        expect(fetchMock.mock.calls.filter((call) => call[0] === actual.ALL_GROUPS_URL)).toHaveLength(1);

        // The data is too old and both wait: error.
        localStorage.clear();
        serverAnswer = [];
        const failed = render();
        await waitFor(() => expect(failed.result.current.status).toBe('error'));
      } finally {
        vi.unstubAllGlobals();
        localStorage.clear();
      }
    });

    it('is error when satellite.js does not load; a refresh loads it again', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      // A lost chunk: the next import of satellite.js fails.
      vi.doMock('satellite.js', () => { throw new Error('chunk failed'); });
      load.mockResolvedValue([fixture.omm as unknown as GpRecord]);
      nextTry.mockReturnValue(scene.getTime() + 60 * 60_000);
      const { result } = render();
      await waitFor(() => expect(result.current.status).toBe('error'));
      expect(result.current.lib).toBeNull();
      // A refresh can load satellite.js: no wait then.
      expect(result.current.nextTryAt).toBeNull();
      vi.doUnmock('satellite.js');
      await act(async () => result.current.refresh());
      await waitFor(() => expect(result.current.lib).not.toBeNull());
      expect(result.current.status).toBe('ok');
      expect(result.current.refreshing).toBe(false);
    });
  });
});

describe('getSatellitesTag (item 164)', () => {
  it('is off without a status, then loading, error or ok-<visible>', () => {
    expect(getSatellitesTag(null, 3)).toBe('off');
    expect(getSatellitesTag('loading', 0)).toBe('loading');
    expect(getSatellitesTag('error', 0)).toBe('error');
    expect(getSatellitesTag('ok', 7)).toBe('ok-7');
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

  it('in the iOS app, gives the reminder to the system ahead of time (item 182)', async () => {
    const calls: unknown[][] = [];
    vi.stubGlobal('sunChaserReminders', {
      schedule: (...args: unknown[]) => calls.push(['schedule', ...args]),
      cancel: (...args: unknown[]) => calls.push(['cancel', ...args]),
    });
    vi.setSystemTime(new Date('2026-10-06T18:03:00Z'));
    const hook = renderHook(() => useSatellitePassReminder(pass, true, 'en'));
    expect(calls).toEqual([['schedule', 'satellite-pass', Date.parse('2026-10-06T18:04:00Z'), expect.stringMatching(/^ISS visible at /)]]);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(shown).toEqual([]);
    hook.unmount();
    expect(calls.at(-1)).toEqual(['cancel', 'satellite-pass']);
  });
});
