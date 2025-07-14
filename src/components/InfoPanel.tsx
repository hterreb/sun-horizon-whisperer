import React, { useState, useEffect } from 'react';
import { Clock, Sunrise, Sunset, MapPin, ChevronDown, ChevronUp, CloudRain, CloudSnow, CloudSun, Sun, CloudLightning, Moon, RefreshCw, Thermometer } from 'lucide-react';
import { 
  type SunPosition, 
  type SunTimes, 
  type LocationData, 
  type TimeOfDay,
  formatTime,
  getTimeOfDayLabel,
  getRelevantTwilightTimes 
} from '../utils/sunUtils';
import { type MoonPosition, getMoonPhaseLabel } from '../utils/moonUtils';
import { type WeatherData } from '../utils/weatherUtils';
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
  weatherData: WeatherData | null;
  isLoadingWeather: boolean;
  useRealWeather: boolean;
  isFullscreen?: boolean;
  onWeatherChange: (weather: WeatherType) => void;
  onWeatherModeToggle: (useReal: boolean) => void;
  onWeatherRefresh: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ 
  sunPosition, 
  moonPosition,
  sunTimes, 
  location, 
  timeOfDay,
  currentTime,
  weatherType,
  weatherData,
  isLoadingWeather,
  useRealWeather,
  isFullscreen = false,
  onWeatherChange,
  onWeatherModeToggle,
  onWeatherRefresh
}) => {
  const [locationName, setLocationName] = useState<string>('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMoonCollapsed, setIsMoonCollapsed] = useState(true);
  const [isTwilightCollapsed, setIsTwilightCollapsed] = useState(false);
  const [isSunPositionCollapsed, setIsSunPositionCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredTwilight, setHoveredTwilight] = useState<string | null>(null);
  const fadeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle fade out in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      // Clear any existing timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      
      // Set timeout to fade out after 10 seconds
      fadeTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    } else {
      // Always visible when not in fullscreen
      setIsVisible(true);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    }

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  const handleMouseEnter = () => {
    if (isFullscreen) {
      setIsVisible(true);
      // Reset the fade timer
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      fadeTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    }
  };

  // Auto-adjust collapsed states based on time of day
  useEffect(() => {
    const isNightTime = timeOfDay === 'night' || 
                       timeOfDay === 'astronomical-twilight' || 
                       timeOfDay === 'nautical-twilight' || 
                       timeOfDay === 'civil-twilight';
    
    if (isNightTime) {
      // During night/twilight: collapse twilight times and sun position, expand moon
      setIsTwilightCollapsed(true);
      setIsSunPositionCollapsed(true);
      if (moonPosition.visible) {
        setIsMoonCollapsed(false);
      }
    } else {
      // During day: expand twilight times and sun position, collapse moon
      setIsTwilightCollapsed(false);
      setIsSunPositionCollapsed(false);
      setIsMoonCollapsed(true);
    }
  }, [timeOfDay, moonPosition.visible]);

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

  const relevantTwilightTimes = getRelevantTwilightTimes(currentTime, sunTimes);

  const weatherOptions: { type: WeatherType; label: string; icon: React.ReactNode }[] = [
    { type: 'clear', label: 'Clear', icon: <Sun size={16} /> },
    { type: 'cloudy', label: 'Cloudy', icon: <CloudSun size={16} /> },
    { type: 'overcast', label: 'Overcast', icon: <CloudSun size={16} className="opacity-60" /> },
    { type: 'rain', label: 'Rain', icon: <CloudRain size={16} /> },
    { type: 'storm', label: 'Storm', icon: <CloudLightning size={16} /> },
    { type: 'snow', label: 'Snow', icon: <CloudSnow size={16} /> },
  ];

  const getDegreeInfo = (twilightType: string) => {
    if (relevantTwilightTimes.type === 'dusk') {
      switch (twilightType) {
        case 'civil':
          return 'Sunset (0°) → Civil (-6°)';
        case 'nautical':
          return 'Civil (-6°) → Nautical (-12°)';
        case 'astronomical':
          return 'Nautical (-12°) → Astronomical (-18°)';
        default:
          return '';
      }
    } else {
      switch (twilightType) {
        case 'astronomical':
          return 'Astronomical (-18°) → Nautical (-12°)';
        case 'nautical':
          return 'Nautical (-12°) → Civil (-6°)';
        case 'civil':
          return 'Civil (-6°) → Sunrise (0°)';
        default:
          return '';
      }
    }
  };

  return (
    <div
      data-testid="info-panel"
      className={
        `fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 to-black/30 text-white p-4 sm:p-6 rounded-t-2xl shadow-2xl border-t border-white/10 transition-all duration-500 ${
          isFullscreen ? 'opacity-90' : 'opacity-100'
        } ${isVisible ? '' : 'opacity-0 pointer-events-none'}`
      }
      style={{
        maxWidth: 600,
        margin: '0 auto',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
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
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100'
      }`}>
        <div className="px-4 pb-4">
          {/* Current Weather Display */}
          {weatherData && (
            <div className="mb-4 pt-2 border-t border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold flex items-center">
                  <Thermometer size={16} className="mr-2" />
                  Current Weather
                </h3>
                <button
                  onClick={onWeatherRefresh}
                  disabled={isLoadingWeather}
                  className="p-1 rounded hover:bg-white hover:bg-opacity-10 transition-colors disabled:opacity-50"
                  aria-label="Refresh weather"
                >
                  <RefreshCw size={14} className={isLoadingWeather ? 'animate-spin' : ''} />
                </button>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="opacity-80">Temperature:</span>
                  <span className="font-semibold">{weatherData.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-80">Condition:</span>
                  <span className="font-semibold">{weatherData.weatherDescription}</span>
                </div>
                {weatherData.isRealWeather && (
                  <div className="text-xs opacity-60 mt-1">
                    Updated: {format(weatherData.lastUpdated, 'HH:mm')}
                  </div>
                )}
                {!weatherData.isRealWeather && (
                  <div className="text-xs opacity-60 text-yellow-400 mt-1">
                    Real weather unavailable
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Weather Mode Toggle */}
          <div className="mb-4 pt-2 border-t border-white border-opacity-20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">Weather Mode</h3>
              <div className="flex bg-white bg-opacity-10 rounded p-1">
                <button
                  onClick={() => onWeatherModeToggle(true)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    useRealWeather
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-white opacity-60'
                  }`}
                >
                  Real
                </button>
                <button
                  onClick={() => onWeatherModeToggle(false)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    !useRealWeather
                      ? 'bg-white bg-opacity-20 text-white'
                      : 'text-white opacity-60'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>
          </div>

          {/* Manual Weather Selector - only show when not using real weather */}
          {!useRealWeather && (
            <div className="mb-4 pt-2 border-t border-white border-opacity-20">
              <h3 className="text-sm font-bold mb-2">Manual Weather</h3>
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
          )}

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
          
          {/* Moon information - collapsible */}
          {moonPosition.visible && (
            <div className="mt-6 pt-4 border-t border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold flex items-center">
                  <Moon size={16} className="mr-2" />
                  Moon Information
                </h3>
                <button
                  onClick={() => setIsMoonCollapsed(!isMoonCollapsed)}
                  className="p-1 rounded hover:bg-white hover:bg-opacity-10 transition-colors"
                  aria-label={isMoonCollapsed ? "Expand moon info" : "Collapse moon info"}
                >
                  {isMoonCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
              
              <div className={`transition-all duration-300 ease-in-out ${
                isMoonCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-32 opacity-100'
              }`}>
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
            </div>
          )}
          
          {/* Upcoming twilight times - collapsible */}
          <div className="mt-6 pt-4 border-t border-white border-opacity-20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">
                Upcoming {relevantTwilightTimes.type === 'dawn' ? 'Dawn' : 'Dusk'} Times
              </h3>
              <button
                onClick={() => setIsTwilightCollapsed(!isTwilightCollapsed)}
                className="p-1 rounded hover:bg-white hover:bg-opacity-10 transition-colors"
                aria-label={isTwilightCollapsed ? "Expand twilight times" : "Collapse twilight times"}
              >
                {isTwilightCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>
            
            <div className={`transition-all duration-300 ease-in-out ${
              isTwilightCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-32 opacity-100'
            }`}>
              <div className="space-y-2 text-xs">
                {relevantTwilightTimes.type === 'dusk' ? (
                  <>
                    <div className="flex justify-between">
                      <span 
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHoveredTwilight('civil')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'civil' ? null : 'civil')}
                        title="Click or hover for degree information"
                      >
                        Civil:
                      </span>
                      <span className="font-mono">{formatTime(sunTimes.sunset)} - {formatTime(relevantTwilightTimes.civil)}</span>
                    </div>
                    {hoveredTwilight === 'civil' && (
                      <div className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('civil')}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span 
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHoveredTwilight('nautical')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'nautical' ? null : 'nautical')}
                        title="Click or hover for degree information"
                      >
                        Nautical:
                      </span>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.civil)} - {formatTime(relevantTwilightTimes.nautical)}</span>
                    </div>
                    {hoveredTwilight === 'nautical' && (
                      <div className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('nautical')}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span 
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHoveredTwilight('astronomical')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'astronomical' ? null : 'astronomical')}
                        title="Click or hover for degree information"
                      >
                        Astronomical:
                      </span>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.nautical)} - {formatTime(relevantTwilightTimes.astronomical)}</span>
                    </div>
                    {hoveredTwilight === 'astronomical' && (
                      <div className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('astronomical')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span 
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHoveredTwilight('astronomical')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'astronomical' ? null : 'astronomical')}
                        title="Click or hover for degree information"
                      >
                        Astronomical:
                      </span>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.astronomical)} - {formatTime(relevantTwilightTimes.nautical)}</span>
                    </div>
                    {hoveredTwilight === 'astronomical' && (
                      <div className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('astronomical')}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span 
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHoveredTwilight('nautical')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'nautical' ? null : 'nautical')}
                        title="Click or hover for degree information"
                      >
                        Nautical:
                      </span>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.nautical)} - {formatTime(relevantTwilightTimes.civil)}</span>
                    </div>
                    {hoveredTwilight === 'nautical' && (
                      <div className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('nautical')}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span 
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={() => setHoveredTwilight('civil')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'civil' ? null : 'civil')}
                        title="Click or hover for degree information"
                      >
                        Civil:
                      </span>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.civil)} - {formatTime(sunTimes.sunrise)}</span>
                    </div>
                    {hoveredTwilight === 'civil' && (
                      <div className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('civil')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Sun position - collapsible */}
          <div className="mt-6 pt-4 border-t border-white border-opacity-20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">Sun Position</h3>
              <button
                onClick={() => setIsSunPositionCollapsed(!isSunPositionCollapsed)}
                className="p-1 rounded hover:bg-white hover:bg-opacity-10 transition-colors"
                aria-label={isSunPositionCollapsed ? "Expand sun position" : "Collapse sun position"}
              >
                {isSunPositionCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>
            
            <div className={`transition-all duration-300 ease-in-out ${
              isSunPositionCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-16 opacity-100'
            }`}>
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
    </div>
  );
};

export default InfoPanel;