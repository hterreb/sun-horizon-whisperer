import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getSunPosition,
  getSunTimes,
  getSunPathAround,
  formatTime,
  getTimeOfDay,
  getTimeOfDayLabel,
  getBackgroundGradient,
  shiftGradientBrightness,
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
import { fetchCurrentWeather, type WeatherData } from '../utils/weatherUtils';
import SunVisualization from './SunVisualization';
import InfoPanel from './InfoPanel';
import NightStars from './NightStars';
import MusicPlayer from './MusicPlayer';
import TopLeftButtons from './TopLeftButtons';
import PWAInstallPrompt from './PWAInstallPrompt';
import MidnightGhost from './MidnightGhost';
import TemperatureIceberg from './TemperatureIceberg';
import { type WeatherType } from './CloudLayer';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useCompassHeading } from '@/hooks/useCompassHeading';
import { useHorizonProfile } from '@/hooks/useHorizonProfile';
import { loadManualLocation, saveManualLocation, clearManualLocation } from '../utils/manualLocation';
import {
  hasSeenCompassCalibrationHint,
  markCompassCalibrationHintSeen
} from '../utils/compassUtils';
import { getTerrainSunTimes, getTerrainMoonTimes } from '../utils/horizonUtils';
import { getSunArcLabels, getMoonArcLabels } from '../utils/arcLabels';
import { isLineOfSightEnabled } from '../utils/premium';

// Sky gradient brightness shift per weather type (ROADMAP item 10), in per-channel
// RGB units - see shiftGradientBrightness. Grey/wet weather darkens the sky; snow
// brightens it slightly; clear/partly/cloudy are left alone.
const WEATHER_GRADIENT_SHIFT: Record<WeatherType, number> = {
  clear: 0,
  partly: 0,
  cloudy: 0,
  overcast: -10,
  fog: -5,
  drizzle: -10,
  rain: -20,
  storm: -40,
  hail: -25,
  snow: 15,
};

// Eye height above ground for line of sight with terrain (ROADMAP item 13): e.g. a
// building floor or a tower, clamped to a sane 0-1000 m range and persisted like
// manualLocation.ts's try/catch-wrapped localStorage pattern.
const EYE_HEIGHT_STORAGE_KEY = 'eye-height-m';
const DEFAULT_EYE_HEIGHT_M = 1.7;
const MAX_EYE_HEIGHT_M = 1000;

const clampEyeHeight = (value: number): number =>
  Number.isFinite(value) ? Math.min(MAX_EYE_HEIGHT_M, Math.max(0, value)) : DEFAULT_EYE_HEIGHT_M;

const loadStoredEyeHeight = (): number => {
  try {
    const raw = localStorage.getItem(EYE_HEIGHT_STORAGE_KEY);
    return raw === null ? DEFAULT_EYE_HEIGHT_M : clampEyeHeight(Number(raw));
  } catch (error) {
    console.error('Error reading eye height:', error);
    return DEFAULT_EYE_HEIGHT_M;
  }
};

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
  const [sunPosition, setSunPosition] = useState<SunPosition>({ azimuth: 0, altitude: 0 });
  const [moonPosition, setMoonPosition] = useState<MoonPosition>({ 
    azimuth: 0, 
    altitude: 0, 
    phase: 0, 
    illumination: 0, 
    visible: false 
  });
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [nextGoldenBlueHours, setNextGoldenBlueHours] = useState<NextGoldenBlueHours | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midday');
  const [weatherType, setWeatherType] = useState<WeatherType>('clear');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [useRealWeather, setUseRealWeather] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const isMobile = useIsMobile();

  const cursorTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Use wake lock when in fullscreen mode
  useWakeLock(isFullscreen);

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
    isLineOfSightEnabled() && location.loaded
  );

  const handleCompassEnable = useCallback(() => {
    if (!hasSeenCompassCalibrationHint()) {
      markCompassCalibrationHintSeen();
      toast({
        title: "Calibrating compass",
        description: "Move your phone in a figure 8 for a more accurate heading."
      });
    }
    enableCompass();
  }, [enableCompass]);

  // Whenever fullscreen mode toggles (either direction), the cursor should be shown
  // immediately; the effect below then re-arms the auto-hide timer for fullscreen.
  // Adjusting state during render (rather than in an effect) avoids an extra commit.
  const [prevIsFullscreenForCursor, setPrevIsFullscreenForCursor] = useState(isFullscreen);
  if (isFullscreen !== prevIsFullscreenForCursor) {
    setPrevIsFullscreenForCursor(isFullscreen);
    setShowCursor(true);
  }

  // Hide the cursor after 10 seconds of no movement, but only while in fullscreen.
  useEffect(() => {
    if (!isFullscreen) return;

    cursorTimeoutRef.current = setTimeout(() => {
      setShowCursor(false);
    }, 10000);

    // Add mouse move listener to show cursor and reset timer
    const handleMouseMove = () => {
      setShowCursor(true);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      cursorTimeoutRef.current = setTimeout(() => {
        setShowCursor(false);
      }, 10000);
    };

    // A tap should bring the cursor (and the fullscreen/compass toggles, which fade
    // together with it - ROADMAP item 18) back too; mobile taps don't fire mousemove.
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchstart', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchstart', handleMouseMove);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  // Update time every second for smooth clock display
  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

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
          title: "Weather unavailable",
          description: "Using default weather. Check your connection.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[SunTracker Debug] Error fetching weather:', error);
      toast({
        title: "Weather fetch failed",
        description: "Could not get current weather data.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingWeather(false);
    }
  }, [location.loaded, location.latitude, location.longitude, useRealWeather]);

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
    const sunUpdateTimer = setInterval(() => {
      if (location.loaded) {
        const currentDate = new Date();
        const sunPos = getSunPosition(currentDate, location.latitude, location.longitude);
        const moonPos = getMoonPosition(currentDate, location.latitude, location.longitude);
        const times = getSunTimes(currentDate, location.latitude, location.longitude);

        setSunPosition(sunPos);
        setMoonPosition(moonPos);
        setSunTimes(times);
        setNextGoldenBlueHours(getNextGoldenBlueHours(currentDate, location.latitude, location.longitude));

        if (times) {
          const tod = getTimeOfDay(currentDate, times);
          setTimeOfDay(tod);
        }
      }
    }, 30000);
    
    return () => clearInterval(sunUpdateTimer);
  }, [location]);

  useEffect(() => {
    // Manual location and the no-geolocation-support fallback are already applied
    // via the lazy state initializer above; only geolocation itself needs an effect
    // (an actual async browser API call).
    if (loadManualLocation()) return;

    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation. Using default location.",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loaded: true
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocation({
          latitude: 40.7128,
          longitude: -74.0060,
          loaded: true
        });
        toast({
          title: "Location unavailable",
          description: "Using default location. Please enable location services for accurate data.",
          variant: "destructive"
        });
      }
    );
  }, []);

  // Manual location form (InfoPanel): validated lat/lon submitted by the user, or a
  // place selected from search (in which case `name` is set alongside the coordinates).
  const handleLocationChange = useCallback((latitude: number, longitude: number, name?: string) => {
    setLocation({ latitude, longitude, loaded: true });
    setManualPlaceName(name ?? null);
    saveManualLocation(latitude, longitude, name);
  }, []);

  // "Use my location" inside the manual form: re-requests geolocation and, on
  // success, drops the manual override so future loads go back to auto-detection.
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
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
          title: "Location detected",
          description: "Using your current location for sun calculations.",
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        toast({
          title: "Location unavailable",
          description: "Could not get your current location.",
          variant: "destructive"
        });
      }
    );
  }, []);

  // Compute sun/moon position and time-of-day the moment location first becomes
  // available or changes (the 30s interval effect above keeps them in sync
  // afterwards). Adjusting state during render, keyed on the location itself rather
  // than `date`, avoids re-running this on every one-second clock tick.
  const locationKey = location.loaded ? `${location.latitude},${location.longitude}` : null;
  const [prevLocationKey, setPrevLocationKey] = useState<string | null>(null);
  if (locationKey !== null && locationKey !== prevLocationKey) {
    setPrevLocationKey(locationKey);
    const sunPos = getSunPosition(date, location.latitude, location.longitude);
    const moonPos = getMoonPosition(date, location.latitude, location.longitude);
    const times = getSunTimes(date, location.latitude, location.longitude);

    setSunPosition(sunPos);
    setMoonPosition(moonPos);
    setSunTimes(times);
    setNextGoldenBlueHours(getNextGoldenBlueHours(date, location.latitude, location.longitude));

    if (times) {
      setTimeOfDay(getTimeOfDay(date, times));
    }
  }

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

  const getBackgroundStyle = useCallback(() => {
    const baseGradient = getBackgroundGradient(timeOfDay);
    // Per-channel brightness shift (ROADMAP item 10): darker for grey/wet weather,
    // a touch brighter for snow. `shiftGradientBrightness` works on the #rrggbb
    // colors getBackgroundGradient actually returns (the old code here matched
    // "rgb(...)", which never appears in that gradient and so never applied).
    const shift = WEATHER_GRADIENT_SHIFT[weatherType];
    return { background: shiftGradientBrightness(baseGradient, shift) };
  }, [timeOfDay, weatherType]);

  const handleWeatherChange = (newWeather: WeatherType) => {
    setWeatherType(newWeather);
    setUseRealWeather(false);
  };

  const handleWeatherModeToggle = (useReal: boolean) => {
    setUseRealWeather(useReal);
    
    if (useReal && weatherData) {
      setWeatherType(weatherData.weatherType);
    }
  };

  const handleWeatherRefresh = () => {
    fetchWeatherData();
  };

  return (
    <div 
      className={`relative min-h-dvh w-full overflow-hidden ${
        isFullscreen && !showCursor ? 'cursor-none' : ''
      }`} 
      style={getBackgroundStyle()}
    >
      <NightStars timeOfDay={timeOfDay} moonPosition={moonPosition} />
      <MusicPlayer isFullscreen={isFullscreen} />
      <TopLeftButtons
        isFullscreen={isFullscreen}
        showCursor={showCursor}
        onFullscreenChange={setIsFullscreen}
        compassStatus={compassStatus}
        onCompassEnable={handleCompassEnable}
        onCompassDisable={disableCompass}
      />
      <PWAInstallPrompt />
      <MidnightGhost currentTime={date} />
      <TemperatureIceberg 
        temperature={weatherData?.temperature || 20} 
        isVisible={location.loaded && weatherData !== null} 
      />
      
      {location.loaded ? (
        <>
          <SunVisualization
            sunPosition={sunPosition}
            moonPosition={moonPosition}
            sunPath={moonExtras.sunPath}
            moonPath={moonExtras.moonPath}
            timeOfDay={timeOfDay}
            weatherType={weatherType}
            latitude={location.latitude}
            longitude={location.longitude}
            date={date}
            temperatureC={weatherData?.temperature ?? null}
            cloudCoverPercent={weatherData?.cloudCoverPercent ?? null}
            windSpeedKmh={weatherData?.windSpeedKmh ?? null}
            windDirectionDeg={weatherData?.windDirectionDeg ?? null}
            compassHeading={activeCompassHeading}
            horizonProfile={horizonProfile}
            isFullscreen={isFullscreen}
            showCursor={showCursor}
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
            isFullscreen={isFullscreen}
            onWeatherChange={handleWeatherChange}
            onWeatherModeToggle={handleWeatherModeToggle}
            onWeatherRefresh={handleWeatherRefresh}
            onLocationChange={handleLocationChange}
            onUseMyLocation={handleUseMyLocation}
            terrainStatus={terrainStatus}
            terrainSunTimes={terrainExtras.terrainSunTimes}
            terrainMoonTimes={terrainExtras.terrainMoonTimes}
            eyeHeightMeters={eyeHeight}
            onEyeHeightChange={handleEyeHeightChange}
          />
        </>
      ) : (
        <div className="flex h-dvh items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
            <p>Locating…</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SunTracker;