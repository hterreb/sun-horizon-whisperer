import React, { useState, useEffect, useCallback } from 'react';
import { 
  getSunPosition, 
  getSunTimes, 
  formatTime, 
  getTimeOfDay,
  getTimeOfDayLabel,
  getBackgroundGradient,
  type LocationData,
  type SunPosition,
  type SunTimes,
  type TimeOfDay
} from '../utils/sunUtils';
import { getMoonPosition, type MoonPosition } from '../utils/moonUtils';
import { fetchCurrentWeather, type WeatherData } from '../utils/weatherUtils';
import SunVisualization from './SunVisualization';
import InfoPanel from './InfoPanel';
import NightStars from './NightStars';
import MusicPlayer from './MusicPlayer';
import FullscreenButton from './FullscreenButton';
import PWAInstallPrompt from './PWAInstallPrompt';
import MidnightGhost from './MidnightGhost';
import TemperatureIceberg from './TemperatureIceberg';
import { type WeatherType } from './CloudLayer';
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWakeLock } from '@/hooks/useWakeLock';
import { loadManualLocation, saveManualLocation, clearManualLocation } from '../utils/manualLocation';

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

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
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
      const weather = await fetchCurrentWeather(location.latitude, location.longitude);
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

    if (times) {
      setTimeOfDay(getTimeOfDay(date, times));
    }
  }

  const getBackgroundStyle = useCallback(() => {
    let baseGradient = getBackgroundGradient(timeOfDay);
    
    if (weatherType === 'storm') {
      baseGradient = baseGradient.replace(/rgb\(([^)]+)\)/g, (match, rgb) => {
        const values = rgb.split(',').map((v: string) => Math.max(0, parseInt(v.trim()) - 40));
        return `rgb(${values.join(',')})`;
      });
    } else if (weatherType === 'rain') {
      baseGradient = baseGradient.replace(/rgb\(([^)]+)\)/g, (match, rgb) => {
        const values = rgb.split(',').map((v: string) => Math.max(0, parseInt(v.trim()) - 20));
        return `rgb(${values.join(',')})`;
      });
    }
    
    return { background: baseGradient };
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
      <FullscreenButton onFullscreenChange={setIsFullscreen} />
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
            timeOfDay={timeOfDay}
            weatherType={weatherType}
            latitude={location.latitude}
          />
          <InfoPanel 
            sunPosition={sunPosition}
            moonPosition={moonPosition}
            sunTimes={sunTimes}
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