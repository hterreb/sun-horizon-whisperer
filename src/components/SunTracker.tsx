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
import { type WeatherType } from './CloudLayer';
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  // Debug logging for weather changes
  console.log('[SunTracker Debug] Current weather type:', weatherType);
  console.log('[SunTracker Debug] Current time of day:', timeOfDay);
  console.log('[SunTracker Debug] Weather data:', weatherData);
  console.log('[SunTracker Debug] Using real weather:', useRealWeather);

  // Update time every second for smooth clock display
  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Fetch weather data when location is available
  useEffect(() => {
    if (location.loaded && useRealWeather) {
      fetchWeatherData();
    }
  }, [location.loaded, useRealWeather]);

  // Auto-refresh weather every 30 minutes
  useEffect(() => {
    if (!location.loaded || !useRealWeather) return;

    const weatherRefreshTimer = setInterval(() => {
      console.log('[SunTracker Debug] Auto-refreshing weather data');
      fetchWeatherData();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(weatherRefreshTimer);
  }, [location.loaded, useRealWeather]);

  const fetchWeatherData = async () => {
    if (!location.loaded) return;

    setIsLoadingWeather(true);
    try {
      console.log('[SunTracker Debug] Fetching weather data...');
      const weather = await fetchCurrentWeather(location.latitude, location.longitude);
      setWeatherData(weather);
      
      if (useRealWeather) {
        setWeatherType(weather.weatherType);
        console.log('[SunTracker Debug] Weather type updated to:', weather.weatherType);
      }

      if (weather.isRealWeather) {
        toast({
          title: "Weather updated",
          description: `${weather.weatherDescription}, ${weather.temperature}°C`,
        });
      } else {
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
  };

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
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      if (location.loaded) {
        const times = getSunTimes(new Date(), location.latitude, location.longitude);
        setSunTimes(times);
      }
      
      const dailyTimer = setInterval(() => {
        if (location.loaded) {
          const times = getSunTimes(new Date(), location.latitude, location.longitude);
          setSunTimes(times);
        }
      }, 24 * 60 * 60 * 1000);
      
      return () => clearInterval(dailyTimer);
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [location]);

  useEffect(() => {
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
  }, [location.loaded]);

  const getBackgroundStyle = useCallback(() => {
    // Adjust background based on weather
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
    console.log('[SunTracker Debug] Manual weather change from', weatherType, 'to', newWeather);
    setWeatherType(newWeather);
    setUseRealWeather(false); // Switch to manual mode when user selects weather
  };

  const handleWeatherModeToggle = (useReal: boolean) => {
    console.log('[SunTracker Debug] Weather mode toggle:', useReal ? 'real' : 'manual');
    setUseRealWeather(useReal);
    
    if (useReal && weatherData) {
      setWeatherType(weatherData.weatherType);
    }
  };

  const handleWeatherRefresh = () => {
    console.log('[SunTracker Debug] Manual weather refresh requested');
    fetchWeatherData();
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={getBackgroundStyle()}>
      <NightStars timeOfDay={timeOfDay} moonPosition={moonPosition} />
      <MusicPlayer />
      <FullscreenButton />
      
      {location.loaded ? (
        <>
          <SunVisualization 
            sunPosition={sunPosition} 
            moonPosition={moonPosition}
            timeOfDay={timeOfDay}
            weatherType={weatherType}
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
            onWeatherChange={handleWeatherChange}
            onWeatherModeToggle={handleWeatherModeToggle}
            onWeatherRefresh={handleWeatherRefresh}
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
