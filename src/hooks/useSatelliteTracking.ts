import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getNextSatelliteTry, loadSatelliteData, type GpRecord } from '@/utils/satelliteData';
import { captureMessage } from '@/utils/monitoring';
import {
  CANDIDATE_STEP_MS,
  ISS_NORAD_ID,
  TWILIGHT_FADE,
  findNextPass,
  getCandidateSatellites,
  getPassReminderKey,
  getPassReminderText,
  getPassReminderTime,
  getSkySatellites,
  isNearEpoch,
  isPassReminderDue,
  toTrackedSatellites,
  type SatelliteLib,
  type SatellitePass,
  type SkySatellite,
  type TrackedSatellite,
} from '@/utils/satelliteUtils';
import { getNativeReminders, showReminderNotification } from '@/hooks/useSunsetReminder';
import { type Language } from '@/utils/language';

// The cache (satelliteData) decides when a fetch is due; the app asks it once an hour.
const DATA_CHECK_MS = 60 * 60 * 1000;
// The ISS pass for the reminder is searched again every 5 min.
const PASS_STEP_MS = 5 * 60 * 1000;
// Item 164: the real time for the status (the data's age, the wait) moves once a minute.
const CLOCK_STEP_MS = 60 * 1000;

// Item 164: the tracking's state, for the panel and the Sentry tag `satellites`. `loading` while
// satellite.js or the data loads. `error` when satellite.js does not load, no data comes, or the
// data is too old (isNearEpoch at the real time). A time preview far from the epoch is not an
// error: the scene then shows the decorative dots by design.
export type SatelliteStatus = 'loading' | 'ok' | 'error';

// The Sentry tag `satellites` (item 164): `off` (no status: the tracking is off), `loading`,
// `error`, or `ok-<n>` (n: the visible satellites in the hook's sky).
export const getSatellitesTag = (status: SatelliteStatus | null, visible: number): string =>
  status === 'ok' ? `ok-${visible}` : status ?? 'off';

export interface SatelliteTracking {
  lib: SatelliteLib | null;
  satellites: TrackedSatellite[];
  // The satellites the scene shows at `date` (visible now or fading into the shadow); null
  // when the tracking has no data for `date` (off, still loading, failed, or a time far
  // from the data's epoch): the scene then shows the free decorative dots.
  sky: SkySatellite[] | null;
  // The next ISS pass (or the one in progress), only while `wantIssPass`.
  issPass: SatellitePass | null;
  status: SatelliteStatus;
  // Item 164 (R-a): loads satellite.js again if it failed, and the data. loadSatelliteData asks
  // CelesTrak only when its wait (RETRY_MS after a failed try) is over; while it waits and the
  // data cannot be used, it asks our server at once (item 177).
  refresh: () => void;
  // True from a refresh until its answer.
  refreshing: boolean;
  // The time of the next try while a refresh can load nothing new (CelesTrak and, for data that
  // cannot be used, our server both wait); null when a refresh can try (no wait, or satellite.js
  // to load again).
  nextTryAt: number | null;
}

// Item 183: CelesTrak asks that an error answer goes to a person: the app reports it to Sentry.
const reportCelestrak = (problem: string): void => captureMessage(`CelesTrak: ${problem}`, 'warning');
const loadData = () => loadSatelliteData(Date.now(), fetch, reportCelestrak);

// satellite.js in its own chunk, only when the tracking is on; null when it does not load.
const importSatelliteLib = (): Promise<SatelliteLib | null> =>
  import('satellite.js').then(
    (module) => module,
    (error) => {
      console.error('Error loading satellite.js:', error);
      return null;
    },
  );

// Satellite tracking (ROADMAP item 97, Premium): loads satellite.js with a dynamic import()
// and the CelesTrak data only when `showSky` (the tracking switch) or `wantIssPass` (the
// "ISS passes" switch) is on. With `showSky` it gives the sky once per second of `date`
// (the app clock, so time travel moves the satellites too). Nothing is computed while the
// sun is above the twilight band around -6°.
export const useSatelliteTracking = (
  showSky: boolean,
  date: Date,
  latitude: number,
  longitude: number,
  sunAltitude: number,
  wantIssPass: boolean,
): SatelliteTracking => {
  const [lib, setLib] = useState<SatelliteLib | null>(null);
  const [libFailed, setLibFailed] = useState(false);
  // undefined until the first answer of loadSatelliteData; null: no data.
  const [records, setRecords] = useState<GpRecord[] | null | undefined>(undefined);
  // The cache's next CelesTrak try after the last answer (getNextSatelliteTry).
  const [dataNextTry, setDataNextTry] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // The real time (Date.now() is impure in render): set with each answer and once a minute.
  const [now, setNow] = useState(0);
  const enabled = showSky || wantIssPass;

  useEffect(() => {
    if (!enabled || lib) return;
    let cancelled = false;
    importSatelliteLib().then((module) => {
      if (cancelled) return;
      setLib(module);
      setLibFailed(!module);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, lib]);

  // One answer of the cache: the records, its next try and the time.
  const takeData = useCallback((data: GpRecord[] | null) => {
    const time = Date.now();
    setRecords(data);
    setDataNextTry(getNextSatelliteTry(time));
    setNow(time);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      loadData().then((data) => !cancelled && takeData(data));
    };
    load();
    const timer = setInterval(load, DATA_CHECK_MS);
    const clock = setInterval(() => setNow(Date.now()), CLOCK_STEP_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [enabled, takeData]);

  // Item 176: the clock steps once a minute, so "next try at 14:14" showed until 14:15. A
  // timer at the next try sets the time, and the panel drops the past time at once.
  useEffect(() => {
    if (!enabled || dataNextTry === null) return;
    const wait = dataNextTry - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), wait + 50);
    return () => clearTimeout(timer);
  }, [enabled, dataNextTry]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    const libTry = libFailed
      ? importSatelliteLib().then((module) => {
        setLib(module);
        setLibFailed(!module);
      })
      : Promise.resolve();
    const dataTry = loadData().then(takeData);
    void Promise.all([libTry, dataTry]).finally(() => setRefreshing(false));
  }, [libFailed, takeData]);

  const satellites = useMemo(() => (lib && records ? toTrackedSatellites(lib, records) : []), [lib, records]);
  const observer = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);

  const second = Math.floor(date.getTime() / 1000);
  const hasData = showSky && satellites.length > 0 && isNearEpoch(satellites[0], date);
  // `sunAltitude` comes in 30 s steps; the margin keeps the computation on for the whole
  // twilight fade (getSkySatellites checks the sun each second).
  const isDark = sunAltitude < TWILIGHT_FADE[1] + 0.2;
  // All satellites every 30 s, then each second only the ones that can be in the sky.
  const candidateStep = Math.floor(date.getTime() / CANDIDATE_STEP_MS);
  const candidates = useMemo(
    () => (hasData && isDark && lib ? getCandidateSatellites(lib, satellites, new Date(candidateStep * CANDIDATE_STEP_MS), observer) : []),
    [hasData, isDark, lib, satellites, candidateStep, observer],
  );
  const sky = useMemo(
    () => (!hasData ? null : !lib || !isDark ? [] : getSkySatellites(lib, candidates, new Date(second * 1000), observer)),
    [hasData, isDark, lib, candidates, second, observer],
  );

  const passStep = Math.floor(date.getTime() / PASS_STEP_MS);
  const iss = satellites.find((sat) => sat.id === ISS_NORAD_ID);
  const issPass = useMemo(
    () => (enabled && wantIssPass && lib && iss ? findNextPass(lib, iss.satrec, new Date(passStep * PASS_STEP_MS), observer) : null),
    [enabled, wantIssPass, lib, iss, passStep, observer],
  );

  const tooOld = satellites.length > 0 && !isNearEpoch(satellites[0], new Date(now));
  const status: SatelliteStatus = libFailed || records === null || (lib && records && (satellites.length === 0 || tooOld))
    ? 'error'
    : lib && records ? 'ok' : 'loading';
  const nextTryAt = !libFailed && dataNextTry !== null && dataNextTry > now ? dataNextTry : null;

  return { lib, satellites, sky, issPass, status, refresh, refreshing, nextTryAt };
};

const REMINDER_CHECK_MS = 30_000;

// The ISS pass reminder (ROADMAP item 97): item 69's notification PASS_REMINDER_MIN before
// the pass, once per pass, only while `active` (live time, notifications allowed).
export const useSatellitePassReminder = (pass: SatellitePass | null, active: boolean, language: Language, timeZone?: string) => {
  const shownKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!active || !pass) return;
    // The iOS app schedules the reminder with the system (item 182, see getNativeReminders).
    const native = getNativeReminders();
    const reminderMs = getPassReminderTime(pass).getTime();
    if (native && !pass.inProgress && reminderMs > Date.now()) {
      native.schedule('satellite-pass', reminderMs, getPassReminderText(pass, language, timeZone));
      return () => native.cancel('satellite-pass');
    }
    const check = () => {
      if (!isPassReminderDue(new Date(), pass, shownKeyRef.current)) return;
      shownKeyRef.current = getPassReminderKey(pass);
      void showReminderNotification(getPassReminderText(pass, language, timeZone), 'satellite-pass');
    };
    check();
    const timer = setInterval(check, REMINDER_CHECK_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pass, active, language, timeZone]);
};
