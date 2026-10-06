import { useEffect, useMemo, useRef, useState } from 'react';
import { loadSatelliteData, type GpRecord } from '@/utils/satelliteData';
import {
  CANDIDATE_STEP_MS,
  ISS_NORAD_ID,
  SUN_MAX_ALTITUDE,
  findNextPass,
  getCandidateSatellites,
  getPassReminderKey,
  getPassReminderText,
  getSkySatellites,
  isNearEpoch,
  isPassReminderDue,
  toTrackedSatellites,
  type SatelliteLib,
  type SatellitePass,
  type SkySatellite,
  type TrackedSatellite,
} from '@/utils/satelliteUtils';
import { showReminderNotification } from '@/hooks/useSunsetReminder';
import { type Language } from '@/utils/language';

// The cache (satelliteData) decides when a fetch is due; the app asks it once an hour.
const DATA_CHECK_MS = 60 * 60 * 1000;
// The ISS pass for the reminder is searched again every 5 min.
const PASS_STEP_MS = 5 * 60 * 1000;

export interface SatelliteTracking {
  lib: SatelliteLib | null;
  satellites: TrackedSatellite[];
  // The satellites the scene shows at `date` (visible now or fading into the shadow); null
  // when the tracking has no data for `date` (off, still loading, failed, or a time far
  // from the data's epoch): the scene then shows the free decorative dots.
  sky: SkySatellite[] | null;
  // The next ISS pass (or the one in progress), only while `wantIssPass`.
  issPass: SatellitePass | null;
}

// Satellite tracking (ROADMAP item 97, Premium): loads satellite.js with a dynamic import()
// and the CelesTrak data only when `enabled`, then gives the sky once per second of `date`
// (the app clock, so time travel moves the satellites too). Nothing is computed while the
// sun is above -6°.
export const useSatelliteTracking = (
  enabled: boolean,
  date: Date,
  latitude: number,
  longitude: number,
  sunAltitude: number,
  wantIssPass: boolean,
): SatelliteTracking => {
  const [lib, setLib] = useState<SatelliteLib | null>(null);
  const [records, setRecords] = useState<GpRecord[] | null>(null);

  useEffect(() => {
    if (!enabled || lib) return;
    let cancelled = false;
    import('satellite.js').then(
      (module) => !cancelled && setLib(module),
      (error) => console.error('Error loading satellite.js:', error),
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, lib]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => {
      loadSatelliteData().then((data) => !cancelled && setRecords(data));
    };
    load();
    const timer = setInterval(load, DATA_CHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  const satellites = useMemo(() => (lib && records ? toTrackedSatellites(lib, records) : []), [lib, records]);
  const observer = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);

  const second = Math.floor(date.getTime() / 1000);
  const hasData = enabled && satellites.length > 0 && isNearEpoch(satellites[0], date);
  const isDark = sunAltitude < SUN_MAX_ALTITUDE;
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

  return { lib, satellites, sky, issPass };
};

const REMINDER_CHECK_MS = 30_000;

// The ISS pass reminder (ROADMAP item 97): item 69's notification PASS_REMINDER_MIN before
// the pass, once per pass, only while `active` (live time, notifications allowed).
export const useSatellitePassReminder = (pass: SatellitePass | null, active: boolean, language: Language) => {
  const shownKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!active || !pass) return;
    const check = () => {
      if (!isPassReminderDue(new Date(), pass, shownKeyRef.current)) return;
      shownKeyRef.current = getPassReminderKey(pass);
      void showReminderNotification(getPassReminderText(pass, language), 'satellite-pass');
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
  }, [pass, active, language]);
};
