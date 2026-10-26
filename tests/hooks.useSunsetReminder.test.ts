import { existsSync } from 'node:fs';
import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { showReminderNotification, useSunsetReminder } from '../src/hooks/useSunsetReminder';

const SUNSET = new Date('2026-09-30T18:50:00+02:00');
const MIN = 60_000;

describe('useSunsetReminder (ROADMAP item 69)', () => {
  const shown: string[] = [];
  let lastOptions: NotificationOptions | null = null;
  class FakeNotification {
    static permission = 'granted';
    constructor(_title: string, options: NotificationOptions) {
      shown.push(options.body ?? '');
      lastOptions = options;
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

  // Without a badge, Android shows the Chrome logo in the status bar.
  it('gives the notification a Sun Chaser badge that exists in public/', async () => {
    await showReminderNotification('Test', 'test');
    expect(lastOptions?.badge).toBe('/notification-badge.png');
    expect(existsSync(`public${lastOptions?.badge}`)).toBe(true);
  });

  describe('in the iOS app (item 182)', () => {
    const calls: unknown[][] = [];
    beforeEach(() => {
      calls.length = 0;
      vi.stubGlobal('sunChaserReminders', {
        schedule: (...args: unknown[]) => calls.push(['schedule', ...args]),
        cancel: (...args: unknown[]) => calls.push(['cancel', ...args]),
      });
    });

    it('gives the reminder to the system ahead of time and shows none itself', async () => {
      vi.setSystemTime(SUNSET.getTime() - 30 * MIN);
      const hook = renderHook(() => useSunsetReminder(SUNSET, true));
      expect(calls).toEqual([['schedule', 'sunset-reminder-0', SUNSET.getTime() - 15 * MIN, expect.stringMatching(/^Sunset in 15 minutes, at /)]]);
      await vi.advanceTimersByTimeAsync(20 * MIN);
      expect(shown).toHaveLength(0);
      hook.unmount();
      expect(calls.at(-1)).toEqual(['cancel', 'sunset-reminder-0']);
    });

    it('with the place, also gives the reminders of the next 13 days, and cancels them all', () => {
      vi.setSystemTime(SUNSET.getTime() - 30 * MIN);
      const place = { latitude: 47.7816, longitude: 9.6123, profile: null };
      const hook = renderHook(() => useSunsetReminder(SUNSET, true, 'en', undefined, place));
      const scheduled = calls.filter((call) => call[0] === 'schedule');
      expect(scheduled.map((call) => call[1])).toEqual(Array.from({ length: 14 }, (_, i) => `sunset-reminder-${i}`));
      const times = scheduled.map((call) => call[2] as number);
      // SUNSET is a fixed test time; the later days are real sunsets, one day apart.
      times.slice(2).forEach((time, i) => expect(Math.abs(time - times[i + 1] - 24 * 60 * MIN)).toBeLessThan(5 * MIN));
      hook.unmount();
      expect(calls.filter((call) => call[0] === 'cancel')).toHaveLength(14);
    });

    it('cancels the reminder when it is turned off', () => {
      vi.setSystemTime(SUNSET.getTime() - 30 * MIN);
      const hook = renderHook(({ active }) => useSunsetReminder(SUNSET, active), { initialProps: { active: true } });
      hook.rerender({ active: false });
      expect(calls).toEqual([['schedule', 'sunset-reminder-0', expect.any(Number), expect.any(String)], ['cancel', 'sunset-reminder-0']]);
    });

    it('shows a reminder that has just passed itself, as in a browser', async () => {
      vi.setSystemTime(SUNSET.getTime() - 12 * MIN);
      renderHook(() => useSunsetReminder(SUNSET, true));
      await flush();
      expect(calls).toHaveLength(0);
      expect(shown).toHaveLength(1);
    });
  });
});
