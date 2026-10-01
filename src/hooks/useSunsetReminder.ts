import { useEffect, useRef } from 'react';
import { getReminderKey, getReminderText, getReminderTime, isReminderDue } from '@/utils/sunsetReminder';
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

// Shows the reminder with the service worker (a tap opens or focuses the app, see
// public/sw-notification-click.js), else with a page notification.
const showSunsetReminder = async (sunset: Date, language: Language) => {
  const title = 'Sun Chaser';
  const options: NotificationOptions = { body: getReminderText(sunset, language), icon: '/icon-192.png', tag: 'sunset-reminder' };
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
    console.error('Error showing sunset reminder:', error);
  }
};

// Sunset reminder (ROADMAP item 69): shows one notification SUNSET_REMINDER_MIN before
// `sunset`, only while `active` (toggle on, permission granted, live time). A timer is set
// to the reminder time. Background tabs slow down timers, so the hook also checks once a
// minute and when the page becomes visible again. The text is in `language`.
export const useSunsetReminder = (sunset: Date | null, active: boolean, language: Language = 'en') => {
  const shownKeyRef = useRef<string | null>(null);
  const sunsetMs = sunset?.getTime() ?? null;

  useEffect(() => {
    if (!active || sunsetMs === null) return;
    const target = new Date(sunsetMs);
    // `active` means live time, so Date.now() is the app clock here.
    const check = () => {
      if (!isReminderDue(new Date(), target, shownKeyRef.current)) return;
      shownKeyRef.current = getReminderKey(target);
      void showSunsetReminder(target, language);
    };
    const reminderMs = getReminderTime(target)!.getTime();
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
    };
  }, [sunsetMs, active, language]);
};
