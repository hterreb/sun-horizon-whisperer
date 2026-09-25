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
  const [location, setLocation] = useState<LocationData>({ latitude: 0, longitude: 0, loaded: false });
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

  // Handle cursor visibility in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      // Set initial timeout for cursor fade
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      
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
    } else {
      // Always show cursor when not in fullscreen
      setShowCursor(true);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
        cursorTimeoutRef.current = null;
      }
    }
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

  // Fetch weather data when location is available
  useEffect(() => {
    if (location.loaded && useRealWeather) {
      fetchWeatherData();
    }
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
    // A manually chosen location (set via InfoPanel's "Change location" form) takes
    // priority over both geolocation and the New York fallback.
    const manual = loadManualLocation();
    if (manual) {
      setLocation({ latitude: manual.latitude, longitude: manual.longitude, loaded: true });
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
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
    } else {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation. Using default location.",
        variant: "destructive"
      });
      setLocation({
        latitude: 40.7128,
        longitude: -74.0060,
        loaded: true
      });
    }
  }, []);

  // Manual location form (InfoPanel): validated lat/lon submitted by the user.
  const handleLocationChange = useCallback((latitude: number, longitude: number) => {
    setLocation({ latitude, longitude, loaded: true });
    saveManualLocation(latitude, longitude);
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

  useEffect(() => {
    if (location.loaded) {
      const sunPos = getSunPosition(date, location.latitude, location.longitude);
      const moonPos = getMoonPosition(date, location.latitude, location.longitude);
      const times = getSunTimes(date, location.latitude, location.longitude);

      setSunPosition(sunPos);
      setMoonPosition(moonPos);
      setSunTimes(times);

      if (times) {
        const tod = getTimeOfDay(date, times);
        setTimeOfDay(tod);
      }
    }
    // `date` is intentionally excluded: this effect only needs to run once when
    // location first becomes available (the 30s interval effect above keeps
    // sun/moon position in sync afterwards) — including `date` would re-run it
    // every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.loaded, location.latitude, location.longitude]);

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
      className={`relative min-h-screen w-full overflow-hidden ${
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
        <div className="flex h-screen items-center justify-center">
          <div className="text-white text-center">
            <p className="mb-4">Detecting your location...</p>
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SunTracker;