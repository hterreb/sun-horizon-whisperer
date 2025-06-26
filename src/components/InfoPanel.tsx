import React, { useState, useEffect } from 'react';
import { Clock, Sunrise, Sunset, MapPin, ChevronDown, ChevronUp, CloudRain, CloudSnow, CloudSun, Sun, CloudLightning, Moon } from 'lucide-react';
import { 
  type SunPosition, 
  type SunTimes, 
  type LocationData, 
  type TimeOfDay,
  formatTime,
  getTimeOfDayLabel 
} from '../utils/sunUtils';
import { type MoonPosition, getMoonPhaseLabel } from '../utils/moonUtils';
import { type WeatherType } from './CloudLayer';
import { format } from 'date-fns';

interface InfoPanelProps {
  sunPosition: SunPosition;
  moonPosition: MoonPosition;
  sunTimes: SunTimes | null;
  location: LocationData;
  timeOfDay: TimeOfDay;
  currentTime: Date;
  weatherType: WeatherType;
  onWeatherChange: (weather: WeatherType) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ 
  sunPosition, 
  moonPosition,
  sunTimes, 
  location, 
  timeOfDay,
  currentTime,
  weatherType,
  onWeatherChange
}) => {
  const [locationName, setLocationName] = useState<string>('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchLocationName = async () => {
      if (!location.loaded) return;
      
      setLoadingLocation(true);
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.latitude}&longitude=${location.longitude}&localityLanguage=en`
        );
        const data = await response.json();
        
        if (data.city && data.countryName) {
          setLocationName(`${data.city}, ${data.countryName}`);
        } else if (data.locality && data.countryName) {
          setLocationName(`${data.locality}, ${data.countryName}`);
        } else if (data.countryName) {
          setLocationName(data.countryName);
        } else {
          setLocationName('Unknown Location');
        }
      } catch (error) {
        console.error('Error fetching location name:', error);
        setLocationName('Unknown Location');
      } finally {
        setLoadingLocation(false);
      }
    };

    fetchLocationName();
  }, [location.latitude, location.longitude, location.loaded]);

  if (!sunTimes) return null;

  const weatherOptions: { type: WeatherType; label: string; icon: React.ReactNode }[] = [
    { type: 'clear', label: 'Clear', icon: <Sun size={16} /> },
    { type: 'cloudy', label: 'Cloudy', icon: <CloudSun size={16} /> },
    { type: 'overcast', label: 'Overcast', icon: <CloudSun size={16} className="opacity-60" /> },
    { type: 'rain', label: 'Rain', icon: <CloudRain size={16} /> },
    { type: 'storm', label: 'Storm', icon: <CloudLightning size={16} /> },
    { type: 'snow', label: 'Snow', icon: <CloudSnow size={16} /> },
  ];

  return (
    <div className="absolute top-0 right-0 w-full max-w-[300px] sm:w-[300px] bg-black bg-opacity-40 backdrop-blur-md text-white rounded-bl-lg overflow-hidden">
      {/* Header with toggle button */}
      <div className="p-4 pb-2 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{getTimeOfDayLabel(timeOfDay)}</h1>
          <div className="flex items-start text-sm opacity-80 mt-1">
            <MapPin size={14} className="mr-1 mt-0.5 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              {loadingLocation ? (
                <span>Loading location...</span>
              ) : (
                locationName && <span className="mb-1 truncate">{locationName}</span>
              )}
              <span className="text-xs opacity-70">
                {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-2 p-1 rounded hover:bg-white hover:bg-opacity-10 transition-colors flex-shrink-0"
          aria-label={isCollapsed ? "Expand info panel" : "Collapse info panel"}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
      
      {/* Collapsible content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
      }`}>
        <div className="px-4 pb-4">
          {/* Weather selector */}
          <div className="mb-4 pt-2 border-t border-white border-opacity-20">
            <h3 className="text-sm font-bold mb-2">Weather</h3>
            <div className="grid grid-cols-3 gap-1">
              {weatherOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => onWeatherChange(option.type)}
                  className={`flex items-center justify-center p-2 rounded text-xs transition-colors ${
                    weatherType === option.type
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'bg-white bg-opacity-5 text-white opacity-60 hover:opacity-80'
                  }`}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time information */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Clock size={18} className="mr-2" />
                <span className="text-sm">Current Time</span>
              </div>
              <span className="font-semibold text-sm sm:text-base">{format(currentTime, 'h:mm:ss a')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Sunrise size={18} className="mr-2" />
                <span className="text-sm">Sunrise</span>
              </div>
              <span className="font-semibold text-sm sm:text-base">{formatTime(sunTimes.sunrise)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Sunset size={18} className="mr-2" />
                <span className="text-sm">Sunset</span>
              </div>
              <span className="font-semibold text-sm sm:text-base">{formatTime(sunTimes.sunset)}</span>
            </div>
          </div>
          
          {/* Moon information */}
          {moonPosition.visible && (
            <div className="mt-6 pt-4 border-t border-white border-opacity-20">
              <h3 className="text-sm font-bold mb-2 flex items-center">
                <Moon size={16} className="mr-2" />
                Moon Information
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Phase:</span>
                  <span className="font-mono">{getMoonPhaseLabel(moonPosition.phase)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Illumination:</span>
                  <span className="font-mono">{(moonPosition.illumination * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Altitude:</span>
                  <span className="font-mono">{moonPosition.altitude.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between">
                  <span>Azimuth:</span>
                  <span className="font-mono">{moonPosition.azimuth.toFixed(1)}°</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Twilight times */}
          <div className="mt-6 pt-4 border-t border-white border-opacity-20">
            <h3 className="text-sm font-bold mb-2">Twilight Times</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-semibold">Civil</div>
                <div className="opacity-80">{formatTime(sunTimes.dawn)} - {formatTime(sunTimes.dusk)}</div>
              </div>
              <div>
                <div className="font-semibold">Nautical</div>
                <div className="opacity-80">{formatTime(sunTimes.nauticalDawn)} - {formatTime(sunTimes.nauticalDusk)}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="font-semibold">Astronomical</div>
                <div className="opacity-80">{formatTime(sunTimes.astronomicalDawn)} - {formatTime(sunTimes.astronomicalDusk)}</div>
              </div>
            </div>
          </div>
          
          {/* Sun position */}
          <div className="mt-6 pt-4 border-t border-white border-opacity-20">
            <h3 className="text-sm font-bold mb-1">Sun Position</h3>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <span>Altitude: </span>
                <span className="font-mono">{sunPosition.altitude.toFixed(2)}°</span>
              </div>
              <div>
                <span>Azimuth: </span>
                <span className="font-mono">{sunPosition.azimuth.toFixed(2)}°</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
