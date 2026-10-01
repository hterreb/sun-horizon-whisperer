import { formatTime } from '@/utils/sunUtils';

// Sunset reminder (ROADMAP item 69): a system notification a fixed time before the next
// sunset, while the app is open. No server and no Web Push.
export const SUNSET_REMINDER_MIN = 15;
const MINUTE_MS = 60_000;
// A reminder that a throttled background timer shows late still counts for this long.
export const REMINDER_LATE_MS = 5 * MINUTE_MS;

// The reminder time for `sunset` (the line-of-sight sunset when there is one, else the
// flat sunset; see getCountdownTarget). Null when there is no sunset (polar day or night).
export const getReminderTime = (sunset: Date | null): Date | null =>
  sunset && new Date(sunset.getTime() - SUNSET_REMINDER_MIN * MINUTE_MS);

// One key per sunset day, so a line-of-sight time that comes in after the flat one does
// not show a second reminder for the same sunset.
export const getReminderKey = (sunset: Date): string => sunset.toDateString();

// True when the reminder for `sunset` is due at `now`: the reminder time has passed by
// less than REMINDER_LATE_MS and the reminder for that sunset is not shown yet.
export const isReminderDue = (now: Date, sunset: Date | null, shownKey: string | null): boolean => {
  const reminderTime = getReminderTime(sunset);
  if (!sunset || !reminderTime || shownKey === getReminderKey(sunset)) return false;
  const lateMs = now.getTime() - reminderTime.getTime();
  return lateMs >= 0 && lateMs < REMINDER_LATE_MS;
};

export const getReminderText = (sunset: Date): string =>
  `Sunset in ${SUNSET_REMINDER_MIN} minutes, at ${formatTime(sunset)}`;
