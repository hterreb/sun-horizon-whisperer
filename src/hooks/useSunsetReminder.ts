import { useEffect, useRef } from 'react';
import { getLaterSunsets, getReminderKey, getReminderText, getReminderTime, isReminderDue } from '@/utils/sunsetReminder';
import { type HorizonProfile } from '@/utils/horizonUtils';
import { type Language } from '@/utils/language';

const CHECK_INTERVAL_MS = 60_000;

// 'unsupported' when the browser has no Notification API, else its permission.
export const getNotificationPermission = (): NotificationPermission | 'unsupported' =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

// Called from the toggle tap (a user gesture). True when notifications are allowed.
export const requestReminderPermission = async (): Promise<boolean> => {
  if (getNotificationPermission() === 'unsupported') return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
};

// Shows a reminder with the service worker (a tap opens or focuses the app, see
// public/sw-notification-click.js), else with a page notification. Also used by the ISS
// pass reminder (item 97).
export const showReminderNotification = async (body: string, tag: string) => {
  const title = 'Sun Chaser';
  // `badge` is the small monochrome icon in the Android status bar and notification
  // header. Without it, Chrome shows its own logo there.
  const options: NotificationOptions = { body, icon: '/icon-192.png', badge: '/notification-badge.png', tag };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Error showing a reminder:', error);
  }
};

// The iOS app (ios/README.md, ROADMAP item 182) gives a reminder to the system ahead of time,
// so it also comes while the app is in the background or closed. The page then shows none
// itself. Null in a browser.
export interface NativeReminders {
  schedule: (id: string, at: number, body: string) => void;
  cancel: (id: string) => void;
}
export const getNativeReminders = (): NativeReminders | null =>
  (window as Window & { sunChaserReminders?: NativeReminders }).sunChaserReminders ?? null;

// Sunset reminder (ROADMAP item 69): shows one notification SUNSET_REMINDER_MIN before
// `sunset`, only while `active` (toggle on, permission granted, live time). A timer is set
// to the reminder time. Background tabs slow down timers, so the hook also checks once a
// minute and when the page becomes visible again. The text is in `language`.
// In the iOS app, the reminders of `sunset` and of the next days at `place`
// (getLaterSunsets) go to iOS ahead of time, one id per day.
export const useSunsetReminder = (
  sunset: Date | null,
  active: boolean,
  language: Language = 'en',
  timeZone?: string,
  place?: { latitude: number; longitude: number; profile: HorizonProfile | null }
) => {
  const shownKeyRef = useRef<string | null>(null);
  const sunsetMs = sunset?.getTime() ?? null;
  const latitude = place?.latitude ?? null;
  const longitude = place?.longitude ?? null;
  const profile = place?.profile ?? null;

  useEffect(() => {
    if (!active || sunsetMs === null) return;
    const target = new Date(sunsetMs);
    // `active` means live time, so Date.now() is the app clock here.
    const reminderMs = getReminderTime(target)!.getTime();
    const native = getNativeReminders();
    const later = native && latitude !== null && longitude !== null ? getLaterSunsets(target, latitude, longitude, profile) : [];
    const ahead = native ? [target, ...later].filter((s) => getReminderTime(s)!.getTime() > Date.now()) : [];
    ahead.forEach((s, i) => native!.schedule(`sunset-reminder-${i}`, getReminderTime(s)!.getTime(), getReminderText(s, language, timeZone)));
    const cancelNative = () => ahead.forEach((_, i) => native!.cancel(`sunset-reminder-${i}`));
    if (native && reminderMs > Date.now()) return cancelNative;
    const check = () => {
      if (!isReminderDue(new Date(), target, shownKeyRef.current)) return;
      shownKeyRef.current = getReminderKey(target);
      void showReminderNotification(getReminderText(target, language, timeZone), 'sunset-reminder');
    };
    const timeout = setTimeout(check, Math.max(0, reminderMs - Date.now()));
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelNative();
    };
  }, [sunsetMs, active, language, timeZone, latitude, longitude, profile]);
};
