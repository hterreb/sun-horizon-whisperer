
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
import SunVisualization from './SunVisualization';
import InfoPanel from './InfoPanel';
import NightStars from './NightStars';
import MusicPlayer from './MusicPlayer';
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const SunTracker: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [location, setLocation] = useState<LocationData>({ latitude: 0, longitude: 0, loaded: false });
  const [sunPosition, setSunPosition] = useState<SunPosition>({ azimuth: 0, altitude: 0 });
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midday');
  const isMobile = useIsMobile();

  // Update time every second for smooth clock display
  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Recalculate sun position every 30 seconds for real-time updates
  useEffect(() => {
    const sunUpdateTimer = setInterval(() => {
      if (location.loaded) {
        const currentDate = new Date();
        const position = getSunPosition(currentDate, location.latitude, location.longitude);
        const times = getSunTimes(currentDate, location.latitude, location.longitude);
        
        setSunPosition(position);
        setSunTimes(times);
        
        if (times) {
          const tod = getTimeOfDay(currentDate, times);
          setTimeOfDay(tod);
        }
      }
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(sunUpdateTimer);
  }, [location]);

  // Refresh sun times daily at midnight
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
      
      // Set up daily refresh
      const dailyTimer = setInterval(() => {
        if (location.loaded) {
          const times = getSunTimes(new Date(), location.latitude, location.longitude);
          setSunTimes(times);
        }
      }, 24 * 60 * 60 * 1000); // Every 24 hours
      
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

  // Initial calculation when location is loaded
  useEffect(() => {
    if (location.loaded) {
      const position = getSunPosition(date, location.latitude, location.longitude);
      const times = getSunTimes(date, location.latitude, location.longitude);
      
      setSunPosition(position);
      setSunTimes(times);
      
      if (times) {
        const tod = getTimeOfDay(date, times);
        setTimeOfDay(tod);
      }
    }
  }, [location.loaded]);

  const getBackgroundStyle = useCallback(() => {
    return {
      background: getBackgroundGradient(timeOfDay)
    };
  }, [timeOfDay]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={getBackgroundStyle()}>
      <NightStars timeOfDay={timeOfDay} />
      <MusicPlayer />
      
      {location.loaded ? (
        <>
          <SunVisualization 
            sunPosition={sunPosition} 
            timeOfDay={timeOfDay}
          />
          <InfoPanel 
            sunPosition={sunPosition}
            sunTimes={sunTimes}
            location={location}
            timeOfDay={timeOfDay}
            currentTime={date}
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
