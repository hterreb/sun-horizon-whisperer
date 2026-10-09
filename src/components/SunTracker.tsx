import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import {
  getSunPosition,
  getSunTimes,
  getSunPathAround,
  formatTime,
  getTimeOfDay,
  getTimeOfDayLabel,
  getBackgroundGradient,
  mixGradientTowardOvercast,
  getNextGoldenBlueHours,
  type LocationData,
  type SunPosition,
  type SunTimes,
  type TimeOfDay,
  type NextGoldenBlueHours
} from '../utils/sunUtils';
import {
  getMoonPosition,
  getMoonPathAround,
  getMoonTimes,
  getNextFullMoon,
  getNextNewMoon,
  type MoonPosition,
  type MoonTimes
} from '../utils/moonUtils';
import { fetchCurrentWeather, getUpperAirAt, getWeatherAt, type WeatherData } from '../utils/weatherUtils';
import { getContrail } from '@/utils/planes';
import { useLivePlanes, type LivePlanesState } from '@/hooks/useLivePlanes';
import { useLiveRoute } from '@/hooks/useLiveRoute';
import { getMoonLook, getSkyOvercastMix, getStarCloudFactor } from '@/utils/weatherEffectsUtils';
import { getAstroEvent, parseEggOverride, METEOR_SHOWER_RATE } from '@/utils/astroEvents';
import SunVisualization from './SunVisualization';
import SceneInfoCard from './SceneInfoCard';
import { getSceneInfo, type SceneInfoTarget } from '@/utils/sceneInfo';
import InfoPanel from './InfoPanel';
import NightStars from './NightStars';
import Aurora from '@/components/Aurora';
import MusicPlayer from './MusicPlayer';
import TopLeftButtons from './TopLeftButtons';
import PWAInstallPrompt from './PWAInstallPrompt';
import MidnightGhost, { GHOST_RING } from './MidnightGhost';
import TemperatureIceberg from './TemperatureIceberg';
import LoadingScreen, { FAST_START_MS } from './LoadingScreen';
import { type WeatherType } from './CloudLayer';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useIdleHide } from '@/hooks/useIdleHide';
import { useCompassHeading } from '@/hooks/useCompassHeading';
import { useHorizonProfile } from '@/hooks/useHorizonProfile';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useSunsetCountdown, primeCountdownAudio } from '@/hooks/useSunsetCountdown';
import { useSunsetReminder, requestReminderPermission, getNotificationPermission } from '@/hooks/useSunsetReminder';
import { SUNSET_REMINDER_MIN } from '@/utils/sunsetReminder';
import { useSatelliteTracking, useSatellitePassReminder } from '@/hooks/useSatelliteTracking';
import { PASS_REMINDER_MIN, getSatelliteCard } from '@/utils/satelliteUtils';
import { loadManualLocation, saveManualLocation, clearManualLocation } from '../utils/manualLocation';
import {
  hasSeenCompassCalibrationHint,
  markCompassCalibrationHintSeen
} from '../utils/compassUtils';
import { getTerrainSunTimes, getTerrainMoonTimes } from '../utils/horizonUtils';
import { getSunArcLabels, getMoonArcLabels } from '../utils/arcLabels';
import { PremiumContext, usePremium } from '@/hooks/usePremium';
import PremiumDialog from './PremiumDialog';
import CollectionView from './CollectionView';
import {
  BADGES, addToCollection, badgeForAstroEvent, badgeForCalendarEvent, badgeForTarget, isCollectionPaused, loadCollection,
  saveCollection, type BadgeId, type Collection,
} from '@/utils/collection';
import { watchSunEvent, NO_SUN_EVENT_WATCH, getCountdownTarget } from '../utils/sunEvents';
import { getCalendarEvent } from '@/utils/calendarEvents';
import { PLAY_SPEED, PLAY_TICK_MS, clampTimeOffset } from '@/utils/timeTravel';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { DISCO_MS, KONAMI_SEQUENCE, SUNGLASSES_MS, advanceKonami, getEggOverride, registerSunTap, rollUfo } from '@/utils/hiddenEggs';
import { isCloudEggDay, isCloudEggForced } from '@/utils/skyCloudUtils';
import { isInstalledApp } from '@/utils/installedApp';
import { getStartReveal, isFastReturn, loadLastVisible, saveLastVisible } from '@/utils/fastReturn';
import DiscoSky from './DiscoSky';
import Ufo, { UFO_RING } from './Ufo';
import { loadTemperatureUnit, saveTemperatureUnit, type TemperatureUnit } from '@/utils/temperatureUnit';
import { loadLanguage, saveLanguage, type Language } from '@/utils/language';
import { translate, type Translate } from '@/i18n';
import { LanguageContext } from '@/hooks/useLanguage';

// Eye height above ground for line of sight with terrain (ROADMAP item 13): e.g. a
// building floor or a tower, clamped to a sane 0-1000 m range and persisted like
// manualLocation.ts's try/catch-wrapped localStorage pattern.
const EYE_HEIGHT_STORAGE_KEY = 'eye-height-m';
// Sunset countdown toggle (ROADMAP item 43), off by default.
const SUNSET_COUNTDOWN_STORAGE_KEY = 'sunset-countdown';
// Sunset reminder toggle (ROADMAP item 69), off by default.
const SUNSET_REMINDER_STORAGE_KEY = 'sunset-reminder';
// Satellite tracking toggle (ROADMAP item 97), on by default (Premium in the Play app).
const SATELLITE_TRACKING_STORAGE_KEY = 'satellite-tracking';
// "ISS passes" reminder toggle (ROADMAP item 97), off by default.
const ISS_REMINDER_STORAGE_KEY = 'iss-pass-reminder';
// The live radar's switch (ROADMAP item 96): saved, off by default (Lutz, 2026-10-06).
const LIVE_PLANES_STORAGE_KEY = 'live-planes';
const SATELLITE_CARD_STEP_MS = 10_000;
const DEFAULT_EYE_HEIGHT_M = 1.7;
// Manual weather's strong-wind switch (ROADMAP item 73): above the 40 km/h strong-wind line.
const MANUAL_STRONG_WIND_KMH = 50;
const HOUR_MS = 60 * 60 * 1000;
const MAX_EYE_HEIGHT_M = 1000;

const clampEyeHeight = (value: number): number =>
  Number.isFinite(value) ? Math.min(MAX_EYE_HEIGHT_M, Math.max(0, value)) : DEFAULT_EYE_HEIGHT_M;

// The scene's side of the loading hand-off (ROADMAP item 39). While loading, the scene
// is clipped to nothing so the loading screen underneath shows; it then opens through
// a circle from the mark ('iris'), or fades in ('fade': reduced motion, a location
// known within FAST_START_MS, or a fast return, item 90; see getStartReveal).
type Reveal = 'loading' | 'iris' | 'fade' | 'done';
const REVEAL_CLASS: Record<Reveal, string> = {
  loading: '[clip-path:circle(0_at_50%_36%)]',
  iris: 'animate-scene-iris',
  fade: 'animate-scene-fade',
  done: '',
};
const REVEAL_MS = { iris: 1000, fade: 200 };

const loadStoredEyeHeight = (): number => {
  try {
    const raw = localStorage.getItem(EYE_HEIGHT_STORAGE_KEY);
    return raw === null ? DEFAULT_EYE_HEIGHT_M : clampEyeHeight(Number(raw));
  } catch (error) {
    console.error('Error reading eye height:', error);
    return DEFAULT_EYE_HEIGHT_M;
  }
};

// The live radar before its first answer (item 96).
const NO_LIVE_PLANES: LivePlanesState = { feed: { now: 0, aircraft: [] }, receivedAt: 0 };

const SunTracker: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  // A manually chosen location (set via InfoPanel's "Change location" form) takes
  // priority over both geolocation and the New York fallback; reading localStorage
  // here (rather than in an effect) means it's available from the very first render.
  const [location, setLocation] = useState<LocationData>(() => {
    const manual = loadManualLocation();
    if (manual) {
      return { latitude: manual.latitude, longitude: manual.longitude, loaded: true };
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return { latitude: 40.7128, longitude: -74.0060, loaded: true };
    }
    return { latitude: 0, longitude: 0, loaded: false };
  });
  // The place name chosen via search (ROADMAP item 12); takes priority over the
  // reverse-geocode guess InfoPanel would otherwise compute for the same coordinates.
  // Cleared whenever the location changes without a name (typed lat/lon, geolocation).
  const [manualPlaceName, setManualPlaceName] = useState<string | null>(
    () => loadManualLocation()?.name ?? null
  );
  // Time travel (ROADMAP item 44): the one time source. `date` is always
  // `Date.now() + timeOffsetMs`; 0 is live. Play moves the offset (-1 back, 1 forward).
  const [timeOffsetMs, setTimeOffsetMs] = useState(0);
  const [playDirection, setPlayDirection] = useState<-1 | 0 | 1>(0);
  const timeOffsetRef = React.useRef(0);
  // A preview (any other time than now) is active. The weather follows the hourly
  // forecast (item 86); the sunset score and the spawns stay live; the fireworks (item 41)
  // and the countdown (item 43) run only when this is false.
  const isTimePreview = timeOffsetMs !== 0;
  const [manualOrLiveWeatherType, setWeatherType] = useState<WeatherType>('clear');
  const [liveWeatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [useRealWeather, setUseRealWeather] = useState(true);
  // The forecast hour of the preview (item 86): one step per hour, not per play tick.
  const previewHour = isTimePreview ? Math.round(date.getTime() / HOUR_MS) : null;
  const weatherData = useMemo(
    () => (liveWeatherData && previewHour !== null ? getWeatherAt(liveWeatherData, new Date(previewHour * HOUR_MS)) : liveWeatherData),
    [liveWeatherData, previewHour]
  );
  const weatherType = useRealWeather && weatherData?.isForecast ? weatherData.weatherType : manualOrLiveWeatherType;
  const [manualWindy, setManualWindy] = useState(false);
  // Display unit only (ROADMAP backlog "Unit toggle °C/°F"); effects stay in °C.
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>(() => loadTemperatureUnit(navigator.language));
  const handleTemperatureUnitChange = useCallback((unit: TemperatureUnit) => {
    setTemperatureUnit(unit);
    saveTemperatureUnit(unit);
  }, []);
  // UI language (ROADMAP item 67): default from navigator.language, saved choice first.
  // Given to the components below through LanguageContext.
  const [language, setLanguageState] = useState<Language>(() => loadLanguage(navigator.language));
  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    saveLanguage(next);
  }, []);
  const t = useCallback<Translate>((key, vars) => translate(language, key, vars), [language]);
  const languageContext = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  // Premium (ROADMAP item 14): given to the components below through PremiumContext.
  // Line of sight is off while Premium is locked.
  const premium = usePremium(language);
  const isLineOfSightOn = !premium.isLocked;
  // The live radar (ROADMAP item 96): off by default, as it sends the rounded place to adsb.lol
  // (through our proxy); the choice is saved. Premium in the Play app; only live, not during time travel, where the
  // scene shows another time and the decorative planes fly.
  const [isLivePlanesOn, setLivePlanesOn] = useState(() => {
    try {
      return localStorage.getItem(LIVE_PLANES_STORAGE_KEY) === 'on';
    } catch {
      return false;
    }
  });
  const handleLivePlanesToggle = useCallback((on: boolean) => {
    setLivePlanesOn(on);
    try {
      localStorage.setItem(LIVE_PLANES_STORAGE_KEY, on ? 'on' : 'off');
    } catch (error) {
      console.error('Error saving live planes:', error);
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isVisible: showCursor, wake: wakeCursor } = useIdleHide(isFullscreen);
  const isMobile = useIsMobile();

  // Loading screen hand-off (ROADMAP item 39): the top-left buttons and the radio
  // mount only at 'done' and fade in (their own `animate-fade-in`).
  const prefersReducedMotion = usePrefersReducedMotion();
  const [reveal, setReveal] = useState<Reveal>(() => (location.loaded ? 'fade' : 'loading'));
  const [isSlowStart, setIsSlowStart] = useState(false);
  // Fast return (ROADMAP item 90): read once, before this page saves a new time.
  const [fastReturn] = useState(() => isFastReturn(loadLastVisible(), Date.now()));
  useEffect(() => {
    const timeoutId = setTimeout(() => setIsSlowStart(true), FAST_START_MS);
    return () => clearTimeout(timeoutId);
  }, []);
  useEffect(() => {
    const save = () => saveLastVisible();
    document.addEventListener('visibilitychange', save);
    window.addEventListener('pagehide', save);
    return () => {
      document.removeEventListener('visibilitychange', save);
      window.removeEventListener('pagehide', save);
    };
  }, []);
  if (location.loaded && reveal === 'loading') {
    setReveal(getStartReveal(isSlowStart, prefersReducedMotion, fastReturn));
  }
  useEffect(() => {
    if (reveal !== 'iris' && reveal !== 'fade') return;
    const timeoutId = setTimeout(() => setReveal('done'), REVEAL_MS[reveal]);
    return () => clearTimeout(timeoutId);
  }, [reveal]);
  // Set once the user picks a location, so a late answer to the startup geolocation
  // request (or its timeout) can't replace that choice.
  const locationChosenRef = React.useRef(false);

  // Keep the screen on in fullscreen, and always in the installed app (ROADMAP item 90):
  // the Play app is fullscreen through its display mode, where `isFullscreen` stays false.
  useWakeLock(isFullscreen || isInstalledApp());

  // Live compass mode (ROADMAP item 8, field-of-view mapping in item 19): the raw
  // (smoothed) heading is handed straight down to SunVisualization, which does its own
  // field-of-view mapping - null while compass mode isn't active reproduces the
  // static, full-circle view.
  const { status: compassStatus, heading: rawCompassHeading, enable: enableCompass, disable: disableCompass } = useCompassHeading();
  const activeCompassHeading = compassStatus === 'active' ? rawCompassHeading : null;

  // Line of sight with terrain (ROADMAP item 13): eye height is user-editable (via
  // InfoPanel) and persisted, and gates/feeds the horizon profile load below.
  const [eyeHeight, setEyeHeight] = useState<number>(loadStoredEyeHeight);
  const handleEyeHeightChange = useCallback((value: number) => {
    const clamped = clampEyeHeight(value);
    setEyeHeight(clamped);
    try {
      localStorage.setItem(EYE_HEIGHT_STORAGE_KEY, String(clamped));
    } catch (error) {
      console.error('Error saving eye height:', error);
    }
  }, []);

  const { profile: horizonProfile, status: terrainStatus } = useHorizonProfile(
    location.latitude,
    location.longitude,
    eyeHeight,
    isLineOfSightOn && location.loaded
  );

  const handleCompassEnable = useCallback(() => {
    if (!hasSeenCompassCalibrationHint()) {
      markCompassCalibrationHintSeen();
      toast({
        title: t('compass.calibratingTitle'),
        description: t('compass.calibratingDescription')
      });
    }
    enableCompass();
  }, [enableCompass, t]);

  // In fullscreen, a mouse move shows the cursor again and restarts the idle timer
  // (useIdleHide: 3 s after entering, 10 s after a wake, ROADMAP item 89).
  useEffect(() => {
    if (!isFullscreen) return;

    // A tap should bring the cursor (and the fullscreen/compass toggles, which fade
    // together with it - ROADMAP item 18) back too; mobile taps don't fire mousemove.
    document.addEventListener('mousemove', wakeCursor);
    document.addEventListener('touchstart', wakeCursor);

    return () => {
      document.removeEventListener('mousemove', wakeCursor);
      document.removeEventListener('touchstart', wakeCursor);
    };
  }, [isFullscreen, wakeCursor]);

  // Update time every second for smooth clock display, every PLAY_TICK_MS during play.
  useEffect(() => {
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      if (playDirection !== 0) {
        // Real time already moves the clock at 1x; the offset adds the rest.
        const wanted = timeOffsetRef.current + (playDirection * PLAY_SPEED - 1) * (now - last);
        const offset = clampTimeOffset(wanted, new Date(now));
        if (offset !== wanted) setPlayDirection(0);
        timeOffsetRef.current = offset;
        setTimeOffsetMs(offset);
      }
      last = now;
      setDate(new Date(now + timeOffsetRef.current));
    }, playDirection !== 0 ? PLAY_TICK_MS : 1000);

    return () => clearInterval(timer);
  }, [playDirection]);

  const applyTimeOffset = useCallback((offsetMs: number) => {
    const now = new Date();
    const offset = clampTimeOffset(offsetMs, now);
    timeOffsetRef.current = offset;
    setTimeOffsetMs(offset);
    setDate(new Date(now.getTime() + offset));
  }, []);

  // A second tap on the same direction pauses.
  const handleTimePlay = useCallback((direction: -1 | 1) => {
    setPlayDirection((current) => (current === direction ? 0 : direction));
  }, []);

  const handleTimeJump = useCallback((target: Date) => {
    applyTimeOffset(target.getTime() - Date.now());
  }, [applyTimeOffset]);

  const handleBackToNow = useCallback(() => {
    setPlayDirection(0);
    applyTimeOffset(0);
  }, [applyTimeOffset]);

  const fetchWeatherData = useCallback(async () => {
    if (!location.loaded) return;

    setIsLoadingWeather(true);
    try {
      // Sunset score (ROADMAP item 11) needs today's and tomorrow's sunset time.
      // Computed fresh here (rather than reading `sunTimes` state) so this
      // callback's identity stays stable across the 30s sun-position tick -
      // it's relied on by the 30-minute auto-refresh interval below.
      const now = new Date();
      const todaySunTimes = getSunTimes(now, location.latitude, location.longitude);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowSunTimes = getSunTimes(tomorrow, location.latitude, location.longitude);

      const weather = await fetchCurrentWeather(
        location.latitude,
        location.longitude,
        todaySunTimes.sunset,
        tomorrowSunTimes.sunset
      );
      setWeatherData(weather);

      if (useRealWeather) {
        setWeatherType(weather.weatherType);
      }

      // Only surface a toast when the refresh actually failed; a successful
      // refresh (every 30 min, or a cache hit) should stay silent.
      if (!weather.isRealWeather) {
        toast({
          title: t('toast.weatherUnavailableTitle'),
          description: t('toast.weatherUnavailableDescription'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[SunTracker Debug] Error fetching weather:', error);
      toast({
        title: t('toast.weatherFailedTitle'),
        description: t('toast.weatherFailedDescription'),
        variant: "destructive"
      });
    } finally {
      setIsLoadingWeather(false);
    }
  }, [location.loaded, location.latitude, location.longitude, useRealWeather, t]);

  // Fetch weather data when location is available. Kicking off the fetch from a
  // timer callback (rather than calling it synchronously in the effect body) avoids
  // `fetchWeatherData`'s own synchronous `setIsLoadingWeather(true)` running as part
  // of the effect's commit.
  useEffect(() => {
    if (!(location.loaded && useRealWeather)) return;

    const timeoutId = setTimeout(() => {
      fetchWeatherData();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [location.loaded, useRealWeather, fetchWeatherData]);

  // Auto-refresh weather every 30 minutes
  useEffect(() => {
    if (!location.loaded || !useRealWeather) return;

    const weatherRefreshTimer = setInterval(() => {
      fetchWeatherData();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(weatherRefreshTimer);
  }, [location.loaded, useRealWeather, fetchWeatherData]);

  useEffect(() => {
    // Manual location and the no-geolocation-support fallback are already applied
    // via the lazy state initializer above; only geolocation itself needs an effect
    // (an actual async browser API call).
    if (loadManualLocation()) return;

    if (!navigator.geolocation) {
      toast({
        title: t('toast.geolocationUnsupportedTitle'),
        description: t('toast.geolocationUnsupportedDefault'),
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationChosenRef.current) return;
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loaded: true
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        if (locationChosenRef.current) return;
        setLocation({
          latitude: 40.7128,
          longitude: -74.0060,
          loaded: true
        });
        toast({
          title: t('toast.locationUnavailableTitle'),
          description: t('toast.locationUnavailableDefault'),
          variant: "destructive"
        });
      },
      // AUDIT C-16: give up after 10 s and use the default location. Browsers start
      // this timer once permission is granted; an open prompt is covered by the
      // loading screen's "Choose a place".
      { timeout: 10000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- asks for the location once at start; `t` is the start language
  }, []);

  // Manual location form (InfoPanel): validated lat/lon submitted by the user, or a
  // place selected from search (in which case `name` is set alongside the coordinates).
  const handleLocationChange = useCallback((latitude: number, longitude: number, name?: string) => {
    locationChosenRef.current = true;
    setLocation({ latitude, longitude, loaded: true });
    setManualPlaceName(name ?? null);
    saveManualLocation(latitude, longitude, name);
  }, []);

  // "Use my location" inside the manual form: re-requests geolocation and, on
  // success, drops the manual override so future loads go back to auto-detection.
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: t('toast.geolocationUnsupportedTitle'),
        description: t('toast.geolocationUnsupported'),
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearManualLocation();
        setManualPlaceName(null);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loaded: true
        });
        toast({
          title: t('toast.locationDetectedTitle'),
          description: t('toast.locationDetectedDescription'),
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({
          title: t('toast.locationUnavailableTitle'),
          description: t('toast.locationUnavailable'),
          variant: "destructive"
        });
      }
    );
  }, [t]);

  // Sun/moon position, sun times, golden/blue hour and time of day, derived from `date`
  // (ROADMAP item 44). Keyed on the 30 s step, so live mode keeps its 30 s rhythm and a
  // time jump or a location change updates the scene at once.
  const sunStepKey = Math.floor(date.getTime() / 30_000);
  const { sunPosition, moonPosition, sunTimes, nextGoldenBlueHours, timeOfDay } = useMemo((): {
    sunPosition: SunPosition;
    moonPosition: MoonPosition;
    sunTimes: SunTimes | null;
    nextGoldenBlueHours: NextGoldenBlueHours | null;
    timeOfDay: TimeOfDay;
  } => {
    if (!location.loaded) {
      return {
        sunPosition: { azimuth: 0, altitude: 0 },
        moonPosition: { azimuth: 0, altitude: 0, phase: 0, illumination: 0, visible: false },
        sunTimes: null,
        nextGoldenBlueHours: null,
        timeOfDay: 'midday',
      };
    }
    const times = getSunTimes(date, location.latitude, location.longitude);
    return {
      sunPosition: getSunPosition(date, location.latitude, location.longitude),
      moonPosition: getMoonPosition(date, location.latitude, location.longitude),
      sunTimes: times,
      nextGoldenBlueHours: getNextGoldenBlueHours(date, location.latitude, location.longitude),
      timeOfDay: getTimeOfDay(date, times),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on sunStepKey (the 30 s step), not `date` itself
  }, [sunStepKey, location.loaded, location.latitude, location.longitude]);

  // Moonrise/moonset, next full/new moon, and the sun's and moon's arcs (for
  // SunVisualization, a ±12 h window around now - ROADMAP item 17) change slowly,
  // unlike sun/moon position above which update every 30s. Keying the memo on the
  // hour rather than `date` itself (which ticks every second) avoids recomputing
  // these on every render.
  const moonHourKey = `${date.toDateString()} ${date.getHours()}`;
  const moonExtras = useMemo(() => {
    if (!location.loaded) {
      return {
        sunPath: [] as SunPosition[],
        moonPath: [] as MoonPosition[],
        moonTimes: { rise: null, set: null, alwaysUp: false, alwaysDown: false } as MoonTimes,
        nextFullMoon: date,
        nextNewMoon: date,
      };
    }
    return {
      sunPath: getSunPathAround(date, location.latitude, location.longitude),
      moonPath: getMoonPathAround(date, location.latitude, location.longitude),
      moonTimes: getMoonTimes(date, location.latitude, location.longitude),
      nextFullMoon: getNextFullMoon(date),
      nextNewMoon: getNextNewMoon(date),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on moonHourKey (the hour), not `date` itself
  }, [moonHourKey, location.loaded, location.latitude, location.longitude]);

  // The panel's rise/set times follow the pass the arcs draw (AUDIT C-17): after sunset
  // the next sunrise/sunset, after moonset the next moonrise/moonset. Same arcLabels calls
  // as SunVisualization, so panel and arc labels cannot disagree. Keyed on the minute.
  const passMinuteKey = Math.floor(date.getTime() / 60_000);
  const passTimes = useMemo(() => {
    if (!location.loaded) return null;
    const sun = getSunArcLabels(date, location.latitude, location.longitude);
    const moon = getMoonArcLabels(date, location.latitude, location.longitude);
    return {
      sunrise: sun.rise?.time ?? null,
      sunset: sun.set?.time ?? null,
      moonrise: moon.rise?.time ?? null,
      moonset: moon.set?.time ?? null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on passMinuteKey, not `date` itself
  }, [passMinuteKey, location.loaded, location.latitude, location.longitude]);
  // No moon pass (up or down all day): keep getMoonTimes' alwaysUp/alwaysDown flags.
  const panelMoonTimes: MoonTimes = passTimes && (passTimes.moonrise || passTimes.moonset)
    ? { rise: passTimes.moonrise, set: passTimes.moonset, alwaysUp: false, alwaysDown: false }
    : moonExtras.moonTimes;

  // Terrain-adjusted sun/moon times (ROADMAP item 13) only change per day/location/
  // profile, unlike sun/moon position - keyed on the days of the passes the panel shows
  // plus the profile's own identity (a new object each time the horizon profile
  // (re)loads), not `date` itself.
  const sunPassDay = passTimes?.sunrise ?? date;
  const moonRiseDay = passTimes?.moonrise ?? date;
  const moonSetDay = passTimes?.moonset ?? date;
  const terrainDateKey = [sunPassDay, moonRiseDay, moonSetDay].map((d) => d.toDateString()).join('|');
  const terrainExtras = useMemo(() => {
    if (!horizonProfile) {
      return {
        terrainSunTimes: null as { sunrise: Date | null; sunset: Date | null } | null,
        terrainMoonTimes: null as { rise: Date | null; set: Date | null } | null,
      };
    }
    return {
      terrainSunTimes: getTerrainSunTimes(sunPassDay, location.latitude, location.longitude, horizonProfile),
      terrainMoonTimes: {
        rise: getTerrainMoonTimes(moonRiseDay, location.latitude, location.longitude, horizonProfile).rise,
        set: getTerrainMoonTimes(moonSetDay, location.latitude, location.longitude, horizonProfile).set,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on terrainDateKey (the day) and the profile identity, not `date` itself
  }, [terrainDateKey, horizonProfile, location.latitude, location.longitude]);

  // Astronomy easter eggs: at most one at a time; `?egg=<kind>` forces one for testing.
  const [astroEggOverride] = useState(() => (typeof window === 'undefined' ? null : parseEggOverride(window.location.search)));
  const astroEvent = location.loaded
    ? getAstroEvent({
        date,
        latitude: location.latitude,
        longitude: location.longitude,
        sunAltitude: sunPosition.altitude,
        moonAltitude: moonPosition.altitude,
        timeOfDay,
        weatherType,
        // The line-of-sight sunset when there is one, like the fireworks.
        sunset: terrainExtras.terrainSunTimes?.sunset ?? sunTimes?.sunset ?? null,
      }, astroEggOverride)
    : null;

  // Collection badges (ROADMAP item 112): the first time each kind of thing is seen. A test
  // link (?egg=, ?fish=, ?hunt=) pauses it. One toast per new badge, outside the setState.
  const [collectionPaused] = useState(() => isCollectionPaused(window.location.search));
  const [collection, setCollection] = useState<Collection>(loadCollection);
  const collectionRef = React.useRef(collection);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const tRef = React.useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const collect = useCallback((id: BadgeId) => {
    if (collectionPaused) return;
    const next = addToCollection(collectionRef.current, id, new Date());
    if (!next) return;
    collectionRef.current = next;
    setCollection(next);
    saveCollection(next);
    const badge = BADGES.find((b) => b.id === id);
    if (badge) toast({ title: tRef.current('collection.new', { name: tRef.current(badge.name) }) });
  }, [collectionPaused]);
  const handleCollectionOpen = useCallback(() => setIsCollectionOpen(true), []);
  const handleCollectionClose = useCallback(() => setIsCollectionOpen(false), []);

  // Fireworks (ROADMAP items 41 and 80): one show per sunrise or sunset (terrain time
  // when there is one), at the first live, visible tick up to 15 min after it, if the
  // page was open before it (watchSunEvent). The ref keeps the armed and the last
  // celebrated event, so a show never repeats. A time preview (item 44) never starts
  // one. A hidden tick (a desktop tab still ticks) waits for the return. Each fired or
  // skipped show leaves a Sentry breadcrumb, with no place or time in it.
  const [fireworksTrigger, setFireworksTrigger] = useState(0);
  const prevClockRef = React.useRef(date);
  const sunEventWatchRef = React.useRef(NO_SUN_EVENT_WATCH);
  useEffect(() => {
    const prev = prevClockRef.current;
    prevClockRef.current = date;
    // New Year (ROADMAP "Ongoing", Calendar): also when the clock enters 00:00 on Jan 1.
    const entersNewYear = getCalendarEvent(date) === 'new-year' && getCalendarEvent(prev) !== 'new-year';
    let fire = !isTimePreview && entersNewYear;
    if (fire && !prefersReducedMotion) collect('egg:newYear');
    if (document.visibilityState !== 'hidden') {
      const { watch, outcome } = watchSunEvent(sunEventWatchRef.current, date, isTimePreview, sunTimes, terrainExtras.terrainSunTimes);
      sunEventWatchRef.current = watch;
      if (outcome) {
        const skipped = outcome !== 'fired' ? outcome : prefersReducedMotion ? 'reduced motion' : null;
        Sentry.addBreadcrumb({ category: 'fireworks', message: skipped ? `skipped: ${skipped}` : 'fired', level: 'info' });
        if (outcome === 'fired') fire = true;
      }
    }
    if (fire) setFireworksTrigger(date.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per clock tick
  }, [date]);

  // Hidden easter eggs (ROADMAP "Ongoing — Easter eggs"): sunglasses after 7 taps on
  // the sun, a rare UFO per night view, and a disco sky from 7 taps on the moon (same
  // rule as the sun) or the Konami code.
  // `?egg=sunglasses|ufo|disco` shows one at once, for testing.
  const [eggOverride] = useState(() => getEggOverride(window.location.search));
  const [sunglassesOn, setSunglassesOn] = useState(eggOverride === 'sunglasses');
  const [discoOn, setDiscoOn] = useState(eggOverride === 'disco');
  const [ufoOn, setUfoOn] = useState(eggOverride === 'ufo');
  const sunTapsRef = React.useRef({ count: 0, lastMs: -Infinity });
  const handleSunTap = useCallback(() => {
    const { taps, triggered } = registerSunTap(sunTapsRef.current, Date.now());
    sunTapsRef.current = taps;
    if (triggered) {
      setSunglassesOn(true);
      collect('egg:sunglasses');
    }
  }, [collect]);
  const moonTapsRef = React.useRef({ count: 0, lastMs: -Infinity });
  const handleMoonTap = useCallback(() => {
    const { taps, triggered } = registerSunTap(moonTapsRef.current, Date.now());
    moonTapsRef.current = taps;
    if (triggered) {
      setDiscoOn(true);
      collect('egg:disco');
    }
  }, [collect]);
  useEffect(() => {
    if (!sunglassesOn) return;
    const id = setTimeout(() => setSunglassesOn(false), SUNGLASSES_MS);
    return () => clearTimeout(id);
  }, [sunglassesOn]);
  useEffect(() => {
    let progress = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return;
      progress = advanceKonami(progress, e.key);
      if (progress === KONAMI_SEQUENCE.length) {
        progress = 0;
        setDiscoOn(true);
        collect('egg:disco');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collect]);
  useEffect(() => {
    if (!discoOn) return;
    const id = setTimeout(() => setDiscoOn(false), DISCO_MS);
    return () => clearTimeout(id);
  }, [discoOn]);
  const isNight = timeOfDay === 'night';
  // One roll each time night starts (adjusting state during render, like MidnightGhost).
  const [prevIsNight, setPrevIsNight] = useState(false);
  if (isNight !== prevIsNight) {
    setPrevIsNight(isNight);
    if (isNight && rollUfo()) setUfoOn(true);
  }
  const handleUfoDone = useCallback(() => setUfoOn(false), []);
  // Reduced motion shows no UFO, so it does not count.
  useEffect(() => {
    if (ufoOn && !prefersReducedMotion) collect('egg:ufo');
  }, [ufoOn, prefersReducedMotion, collect]);
  // Info cards (ROADMAP item 95): one card at a time, for the last thing tapped in the scene.
  // `id` mounts a new card per tap, so its 15 s timer starts again.
  const [infoCard, setInfoCard] = useState<{ target: SceneInfoTarget; x: number; y: number; ring: string; id: number } | null>(null);
  const infoCardCount = React.useRef(0);
  const handleSceneInfo = useCallback((target: SceneInfoTarget, point: { x: number; y: number }, ring: string) => {
    infoCardCount.current += 1;
    setInfoCard({ target, ...point, ring, id: infoCardCount.current });
    const badge = badgeForTarget(target);
    if (badge) collect(badge);
  }, [collect]);
  const handleInfoClose = useCallback(() => setInfoCard(null), []);
  // Rare lenticular and mammatus clouds (ROADMAP item 84, X1): one day in 30 per place;
  // `?egg=lenticular` or `?egg=mammatus` forces the day.
  const [cloudEggForced] = useState(() => isCloudEggForced(window.location.search));
  const cloudEgg = cloudEggForced || isCloudEggDay(date, location.latitude, location.longitude);
  // Calendar easter eggs (ROADMAP "Ongoing"): one event id per minute. `?egg=dragon`
  // forces Lunar New Year (item 100).
  const [dragonForced] = useState(() => new URLSearchParams(window.location.search).get('egg') === 'dragon');
  const calendarEvent = useMemo(
    () => (dragonForced ? 'lunar-new-year' : getCalendarEvent(date, location.latitude)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on passMinuteKey, not `date` itself
    [passMinuteKey, location.latitude]
  );

  // Sunset countdown (ROADMAP item 43): 10 s of ticks and a chime at the next sunset
  // (line of sight when there is one). Live time only; the tap that turns it on
  // starts the audio (browsers allow sound only after a user gesture). The pill counts
  // down for everyone, the sound only with the toggle on (item 98).
  const [isCountdownOn, setIsCountdownOn] = useState(() => {
    try {
      return localStorage.getItem(SUNSET_COUNTDOWN_STORAGE_KEY) === 'on';
    } catch {
      return false;
    }
  });
  const handleCountdownToggle = useCallback(() => {
    const next = !isCountdownOn;
    setIsCountdownOn(next);
    try {
      localStorage.setItem(SUNSET_COUNTDOWN_STORAGE_KEY, next ? 'on' : 'off');
    } catch (error) {
      console.error('Error saving sunset countdown:', error);
    }
    if (next) primeCountdownAudio();
  }, [isCountdownOn]);
  const countdownTarget = getCountdownTarget(date, sunTimes, terrainExtras.terrainSunTimes, isLineOfSightOn);
  const { seconds: countdownSeconds, isSounding: isCountdownSounding } = useSunsetCountdown(countdownTarget?.time ?? null, date, !isTimePreview, isCountdownOn);

  // Sunset reminder (ROADMAP item 69): a notification SUNSET_REMINDER_MIN before the same
  // target, while the app is open. Live time only. The tap that turns it on asks for the
  // notification permission; without the permission the toggle shows as off.
  const [isReminderSaved, setIsReminderSaved] = useState(() => {
    try {
      return localStorage.getItem(SUNSET_REMINDER_STORAGE_KEY) === 'on';
    } catch {
      return false;
    }
  });
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission);
  const isReminderOn = isReminderSaved && notificationPermission === 'granted';
  const handleReminderToggle = useCallback(async () => {
    const next = !isReminderOn;
    if (next) {
      const granted = await requestReminderPermission();
      setNotificationPermission(getNotificationPermission());
      if (!granted) {
        toast({
          title: t('reminder.blockedTitle'),
          description: t('reminder.blockedDescription'),
        });
        return;
      }
      toast({
        title: t('reminder.onTitle'),
        description: t('reminder.onDescription', { minutes: SUNSET_REMINDER_MIN }),
      });
    }
    setIsReminderSaved(next);
    try {
      localStorage.setItem(SUNSET_REMINDER_STORAGE_KEY, next ? 'on' : 'off');
    } catch (error) {
      console.error('Error saving sunset reminder:', error);
    }
  }, [isReminderOn, t]);
  useSunsetReminder(countdownTarget?.time ?? null, isReminderOn && !isTimePreview, language);

  // Satellite tracking (ROADMAP item 97): on by default; Premium in the Play app (item 45).
  // It sends no place: the CelesTrak data is global.
  const [isSatelliteTrackingSaved, setIsSatelliteTrackingSaved] = useState(() => {
    try {
      return localStorage.getItem(SATELLITE_TRACKING_STORAGE_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const isSatelliteTrackingOn = isSatelliteTrackingSaved && !premium.isLocked;
  const handleSatelliteTrackingToggle = useCallback(() => {
    const next = !isSatelliteTrackingOn;
    setIsSatelliteTrackingSaved(next);
    try {
      localStorage.setItem(SATELLITE_TRACKING_STORAGE_KEY, next ? 'on' : 'off');
    } catch (error) {
      console.error('Error saving satellite tracking:', error);
    }
  }, [isSatelliteTrackingOn]);
  // "ISS passes" (Lutz, 2026-10-06): its own switch next to the sunset reminder, off by
  // default, Premium-gated like the tracking (free on the web, item 45). It asks for the
  // notification permission as the sunset reminder does (item 69), and works also with the
  // tracking off (it then loads the data without showing satellites).
  const [isIssReminderSaved, setIsIssReminderSaved] = useState(() => {
    try {
      return localStorage.getItem(ISS_REMINDER_STORAGE_KEY) === 'on';
    } catch {
      return false;
    }
  });
  const isIssReminderOn = isIssReminderSaved && notificationPermission === 'granted' && !premium.isLocked;
  const handleIssReminderToggle = useCallback(async () => {
    const next = !isIssReminderOn;
    if (next) {
      const granted = await requestReminderPermission();
      setNotificationPermission(getNotificationPermission());
      if (!granted) {
        toast({
          title: t('reminder.blockedTitle'),
          description: t('issReminder.blockedDescription'),
        });
        return;
      }
      toast({
        title: t('issReminder.onTitle'),
        description: t('issReminder.onDescription', { minutes: PASS_REMINDER_MIN }),
      });
    }
    setIsIssReminderSaved(next);
    try {
      localStorage.setItem(ISS_REMINDER_STORAGE_KEY, next ? 'on' : 'off');
    } catch (error) {
      console.error('Error saving the ISS pass reminder:', error);
    }
  }, [isIssReminderOn, t]);
  const isPassReminderOn = isIssReminderOn && !isTimePreview && location.loaded;
  const satelliteTracking = useSatelliteTracking(
    isSatelliteTrackingOn && location.loaded,
    date,
    location.latitude,
    location.longitude,
    sunPosition.altitude,
    isPassReminderOn
  );
  useSatellitePassReminder(satelliteTracking.issPass, isPassReminderOn, language);
  // The open card of a tracked satellite, updated every 10 s.
  const cardSatelliteId = infoCard?.target.type === 'satellite' ? infoCard.target.id : null;
  const satelliteCardStep = Math.floor(date.getTime() / SATELLITE_CARD_STEP_MS);
  const satelliteCard = useMemo(() => {
    const sat = satelliteTracking.satellites.find((s) => s.id === cardSatelliteId);
    if (!sat || !satelliteTracking.lib) return null;
    return getSatelliteCard(satelliteTracking.lib, sat, new Date(satelliteCardStep * SATELLITE_CARD_STEP_MS), location);
  }, [cardSatelliteId, satelliteCardStep, satelliteTracking.lib, satelliteTracking.satellites, location]);

  // A manually picked weather ignores the real cloud cover: the sky, the stars and
  // the moon then follow the weather type alone (ROADMAP items 50, 52, 57).
  const cloudCover = useRealWeather ? weatherData?.cloudCoverPercent ?? null : null;

  // Collection badges (ROADMAP item 112) of the calendar and astronomy eggs, when the scene
  // really shows them (CalendarEggs' rules: dark sky = night or astronomical/nautical twilight).
  // Not for a forced egg (?egg=dragon or any ?egg) and not in a time preview.
  const isDarkSky = timeOfDay === 'night' || timeOfDay === 'astronomical-twilight' || timeOfDay === 'nautical-twilight';
  const calendarBadge = dragonForced ? null : badgeForCalendarEvent(calendarEvent, {
    isNight: isDarkSky,
    moonUp: isDarkSky && moonPosition.visible && getMoonLook(weatherType, cloudCover).disc > 0,
    weatherType,
    reducedMotion: prefersReducedMotion,
    isTimePreview,
  });
  useEffect(() => {
    if (calendarBadge) collect(calendarBadge);
  }, [calendarBadge, collect]);
  // Reduced motion draws no shooting stars, so the meteor shower does not count then.
  const astroKind = astroEggOverride || isTimePreview ? null : astroEvent?.kind ?? null;
  const astroBadge = astroKind && !(astroKind === 'meteorShower' && prefersReducedMotion) ? badgeForAstroEvent(astroKind) : null;
  useEffect(() => {
    if (astroBadge) collect(astroBadge);
  }, [astroBadge, collect]);
  // The forecast rain amount (ROADMAP item 77); manual weather uses the type's middle value.
  const rainMmH = useRealWeather ? weatherData?.precipitationMmH ?? null : null;
  // The cover per layer for the cloud types (ROADMAP item 84); manual weather uses the type's own.
  const cloudLayers = useRealWeather ? weatherData?.cloudLayers ?? null : null;
  // The planes' contrails (ROADMAP item 96) from the forecast's upper air at the scene's time;
  // manual weather has no upper air, so no contrails.
  const upperAir = useRealWeather ? getUpperAirAt(weatherData?.hourly ?? null, date) : null;
  const contrail = getContrail(upperAir?.tempC, upperAir?.rhPercent);
  const isLiveRadarActive = isLivePlanesOn && location.loaded && !premium.isLocked && !isTimePreview;
  const liveFeed = useLivePlanes(isLiveRadarActive, location.latitude, location.longitude);
  // While the radar is on and its first answer is on the way, no plane shows.
  const livePlanes: LivePlanesState | null = isLiveRadarActive ? liveFeed ?? NO_LIVE_PLANES : null;
  // A live plane's card asks for its route once (item 111).
  const liveRouteCallsign = infoCard?.target.type === 'livePlane' ? infoCard.target.callsign : null;
  const liveRoute = useLiveRoute(liveRouteCallsign, location.latitude, location.longitude);

  const skyGradient = useMemo(() => {
    // Clouds dim the sky (ROADMAP item 50): mix toward grey per weather type, scaled
    // by the measured cloud cover.
    // The water takes its colours from this same gradient (ROADMAP item 53).
    return mixGradientTowardOvercast(getBackgroundGradient(timeOfDay), getSkyOvercastMix(weatherType, cloudCover, rainMmH));
  }, [timeOfDay, weatherType, cloudCover, rainMmH]);

  const handleWeatherChange = (newWeather: WeatherType) => {
    setWeatherType(newWeather);
    setUseRealWeather(false);
  };

  const handleWeatherModeToggle = (useReal: boolean) => {
    setUseRealWeather(useReal);
    
    if (useReal && liveWeatherData) {
      setWeatherType(liveWeatherData.weatherType);
    }
  };

  const handleWeatherRefresh = () => {
    fetchWeatherData();
  };

  // The open info card's content (item 95); its rarity tier also colours the ring (item 107).
  const infoCardInfo = infoCard && location.loaded ? getSceneInfo(infoCard.target, {
    language,
    now: date,
    timeOfDay,
    sceneSunTimes: sunTimes,
    sunPosition,
    sunTimes: passTimes ?? sunTimes,
    terrainSunTimes: terrainExtras.terrainSunTimes,
    nextGoldenBlueHours,
    moonPosition,
    moonTimes: panelMoonTimes,
    horizonProfile,
    weatherType,
    cloudLayers,
    satellite: satelliteCard,
    route: liveRoute,
  }) : null;

  return (
    <LanguageContext.Provider value={languageContext}>
    <PremiumContext.Provider value={premium}>
    {reveal !== 'done' && (
      <LoadingScreen
        still={prefersReducedMotion || reveal !== 'loading'}
        onSelectPlace={handleLocationChange}
      />
    )}
    <div 
      data-share-root
      className={`relative min-h-dvh w-full overflow-hidden ${REVEAL_CLASS[reveal]} ${
        isFullscreen && !showCursor ? 'cursor-none' : ''
      }`} 
      style={{ background: skyGradient }}
    >
      <NightStars
        timeOfDay={timeOfDay}
        moonPosition={moonPosition}
        weatherType={weatherType}
        cloudCoverPercent={cloudCover}
        shootingStarRate={astroEvent?.kind === 'meteorShower' ? METEOR_SHOWER_RATE : undefined}
      />
      {astroEvent?.kind === 'aurora' && <Aurora opacity={getStarCloudFactor(weatherType, cloudCover)} />}
      {discoOn && <DiscoSky />}
      {ufoOn && (
        <Ufo onDone={handleUfoDone} onInfo={handleSceneInfo} ringOn={infoCard?.ring === UFO_RING} ringTier={infoCardInfo?.tier ?? null} />
      )}
      {reveal === 'done' && (
        <>
          <MusicPlayer isFullscreen={isFullscreen} duck={isCountdownSounding} />
          <TopLeftButtons
            isFullscreen={isFullscreen}
            showCursor={showCursor}
            onFullscreenChange={setIsFullscreen}
            compassStatus={compassStatus}
            onCompassEnable={handleCompassEnable}
            onCompassDisable={disableCompass}
          />
        </>
      )}
      <PWAInstallPrompt />
      {/* One special event at a time: New Year's fireworks replace the midnight ghost. */}
      {calendarEvent !== 'new-year' && (
        <MidnightGhost
          currentTime={date}
          onInfo={handleSceneInfo}
          ringOn={infoCard?.ring === GHOST_RING}
          ringTier={infoCardInfo?.tier ?? null}
        />
      )}
      <TemperatureIceberg 
        temperature={weatherData?.temperature || 20} 
        isVisible={location.loaded && weatherData !== null} 
      />
      
      {location.loaded && (
        <>
          <SunVisualization
            sunPosition={sunPosition}
            moonPosition={moonPosition}
            sunPath={moonExtras.sunPath}
            moonPath={moonExtras.moonPath}
            timeOfDay={timeOfDay}
            skyGradient={skyGradient}
            weatherType={weatherType}
            latitude={location.latitude}
            longitude={location.longitude}
            date={date}
            temperatureC={weatherData?.temperature ?? null}
            cloudCoverPercent={cloudCover}
            // Manual mode sets the wind itself (ROADMAP item 73): calm, or strong with the switch.
            windSpeedKmh={useRealWeather ? weatherData?.windSpeedKmh ?? null : manualWindy ? MANUAL_STRONG_WIND_KMH : 0}
            rainMmH={rainMmH}
            cloudLayers={cloudLayers}
            contrail={contrail}
            livePlanes={livePlanes}
            cloudEgg={cloudEgg}
            sunTimes={sunTimes}
            windDirectionDeg={weatherData?.windDirectionDeg ?? null}
            compassHeading={activeCompassHeading}
            horizonProfile={horizonProfile}
            terrainSunTimes={terrainExtras.terrainSunTimes}
            astroEvent={astroEvent}
            terrainMoonTimes={terrainExtras.terrainMoonTimes}
            isFullscreen={isFullscreen}
            showCursor={showCursor}
            fireworksTrigger={fireworksTrigger}
            sunglasses={sunglassesOn}
            onSunTap={handleSunTap}
            onMoonTap={handleMoonTap}
            onSceneInfo={handleSceneInfo}
            infoRing={infoCard?.ring ?? null}
            infoRingTier={infoCardInfo?.tier ?? null}
            calendarEvent={calendarEvent}
            playDirection={playDirection}
            satellites={satelliteTracking.sky}
            sunsetCountdown={countdownSeconds === null ? null : { seconds: countdownSeconds, lineOfSight: !!countdownTarget?.lineOfSight }}
            onCountdownSoundOn={isCountdownOn ? undefined : handleCountdownToggle}
          />
          <InfoPanel
            sunPosition={sunPosition}
            moonPosition={moonPosition}
            moonTimes={panelMoonTimes}
            nextFullMoon={moonExtras.nextFullMoon}
            nextNewMoon={moonExtras.nextNewMoon}
            sunTimes={sunTimes}
            passSunTimes={passTimes}
            nextGoldenBlueHours={nextGoldenBlueHours}
            location={location}
            manualPlaceName={manualPlaceName}
            timeOfDay={timeOfDay}
            currentTime={date}
            weatherType={weatherType}
            weatherData={weatherData}
            isLoadingWeather={isLoadingWeather}
            useRealWeather={useRealWeather}
            temperatureUnit={temperatureUnit}
            onTemperatureUnitChange={handleTemperatureUnitChange}
            isFullscreen={isFullscreen}
            onWeatherChange={handleWeatherChange}
            manualWindy={manualWindy}
            onManualWindyChange={setManualWindy}
            onWeatherModeToggle={handleWeatherModeToggle}
            onWeatherRefresh={handleWeatherRefresh}
            onLocationChange={handleLocationChange}
            onUseMyLocation={handleUseMyLocation}
            terrainStatus={terrainStatus}
            terrainSunTimes={terrainExtras.terrainSunTimes}
            terrainMoonTimes={terrainExtras.terrainMoonTimes}
            eyeHeightMeters={eyeHeight}
            onEyeHeightChange={handleEyeHeightChange}
            isTimePreview={isTimePreview}
            timePlayDirection={playDirection}
            onTimePlay={handleTimePlay}
            onTimeJump={handleTimeJump}
            isSunsetCountdownOn={isCountdownOn}
            onSunsetCountdownToggle={handleCountdownToggle}
            horizonProfile={horizonProfile}
            isSunsetReminderOn={isReminderOn}
            onSunsetReminderToggle={notificationPermission === 'unsupported' ? undefined : handleReminderToggle}
            isSatelliteTrackingOn={isSatelliteTrackingOn}
            onSatelliteTrackingToggle={handleSatelliteTrackingToggle}
            isIssReminderOn={isIssReminderOn}
            onIssReminderToggle={notificationPermission === 'unsupported' ? undefined : handleIssReminderToggle}
            isLivePlanesOn={isLivePlanesOn}
            onLivePlanesToggle={handleLivePlanesToggle}
            onCollectionOpen={handleCollectionOpen}
          />
        </>
      )}
      {/* Time travel (ROADMAP item 44): bottom centre, above the radio; stays visible
          in fullscreen. */}
      {isTimePreview && (
        <button
          type="button"
          data-share-hide
          onClick={handleBackToNow}
          className={`fixed left-1/2 z-20 -translate-x-1/2 ${GLASS_SURFACE} rounded-full px-4 py-2 text-caption font-semibold text-white hover:bg-[hsl(var(--panel-background)/0.65)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70`}
          style={{ bottom: `calc(${isMobile ? '7.5rem' : '4.5rem'} + env(safe-area-inset-bottom))` }}
        >
          {t('time.backToNow')}
        </button>
      )}
      {infoCard && infoCardInfo && (
        <SceneInfoCard
          key={infoCard.id}
          info={infoCardInfo}
          x={infoCard.x}
          y={infoCard.y}
          onClose={handleInfoClose}
        />
      )}
    </div>
    <PremiumDialog />
    <CollectionView open={isCollectionOpen} onClose={handleCollectionClose} collection={collection} />
    </PremiumContext.Provider>
    </LanguageContext.Provider>
  );
};

export default SunTracker;