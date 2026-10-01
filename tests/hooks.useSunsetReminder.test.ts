import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useSunsetReminder } from '../src/hooks/useSunsetReminder';

const SUNSET = new Date('2026-09-30T18:50:00+02:00');
const MIN = 60_000;

describe('useSunsetReminder (ROADMAP item 69)', () => {
  const shown: string[] = [];
  class FakeNotification {
    static permission = 'granted';
    constructor(_title: string, options: NotificationOptions) {
      shown.push(options.body ?? '');
    }
    close() {}
  }

  beforeEach(() => {
    shown.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal('Notification', FakeNotification);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // The page notification comes after an awaited service worker lookup.
  const flush = () => vi.advanceTimersByTimeAsync(0);

  it('shows the reminder once at the reminder time', async () => {
    vi.setSystemTime(SUNSET.getTime() - 30 * MIN);
    renderHook(() => useSunsetReminder(SUNSET, true));
    await vi.advanceTimersByTimeAsync(15 * MIN - 1000);
    expect(shown).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(shown).toEqual([expect.stringMatching(/^Sunset in 15 minutes, at \d{2}:\d{2}$/)]);
    await vi.advanceTimersByTimeAsync(10 * MIN);
    expect(shown).toHaveLength(1);
  });

  it('shows a reminder that has passed by less than 5 minutes, not an older one', async () => {
    vi.setSystemTime(SUNSET.getTime() - 12 * MIN);
    const late = renderHook(() => useSunsetReminder(SUNSET, true));
    await flush();
    expect(shown).toHaveLength(1);
    late.unmount();

    shown.length = 0;
    vi.setSystemTime(SUNSET.getTime() - 9 * MIN);
    renderHook(() => useSunsetReminder(SUNSET, true));
    await flush();
    expect(shown).toHaveLength(0);
  });

  it('checks again when the page becomes visible', async () => {
    vi.setSystemTime(SUNSET.getTime() - 30 * MIN);
    renderHook(() => useSunsetReminder(SUNSET, true));
    // A throttled background tab: the clock moves on, but no timer has run yet.
    vi.setSystemTime(SUNSET.getTime() - 13 * MIN);
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(shown).toHaveLength(1);
  });

  it('shows nothing when inactive or without a sunset', async () => {
    vi.setSystemTime(SUNSET.getTime() - 16 * MIN);
    renderHook(() => useSunsetReminder(SUNSET, false));
    renderHook(() => useSunsetReminder(null, true));
    await vi.advanceTimersByTimeAsync(10 * MIN);
    expect(shown).toHaveLength(0);
  });
});
