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
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkOrientation();
    
    window.addEventListener('resize', checkOrientation);
    
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDate(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

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
      const position = getSunPosition(date, location.latitude, location.longitude);
      const times = getSunTimes(date, location.latitude, location.longitude);
      
      setSunPosition(position);
      setSunTimes(times);
      
      if (times) {
        const tod = getTimeOfDay(date, times);
        setTimeOfDay(tod);
      }
    }
  }, [date, location]);

  const getBackgroundStyle = useCallback(() => {
    return {
      background: getBackgroundGradient(timeOfDay)
    };
  }, [timeOfDay]);

  return (
    <div className="relative h-screen w-screen force-landscape overflow-hidden" style={getBackgroundStyle()}>
      {!isLandscape && (
        <div className="landscape-message fixed inset-0 z-50 bg-black bg-opacity-80 text-white flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl mb-4">Please rotate your device</h2>
          <p>This app works best in landscape mode</p>
        </div>
      )}
      
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
        <div className="flex h-full items-center justify-center">
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
