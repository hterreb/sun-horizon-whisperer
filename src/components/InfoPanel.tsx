import React, { useState, useEffect, useRef } from 'react';
import { Clock, Sunrise, Sunset, MapPin, ChevronDown, ChevronUp, Cloud, Cloudy, CloudRain, CloudSnow, CloudSun, CloudFog, CloudDrizzle, CloudHail, Sun, CloudLightning, Moon, RefreshCw, Thermometer, MessageSquare } from 'lucide-react';
import { getFeedback } from '@sentry/react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import {
  type SunPosition,
  type SunTimes,
  type LocationData,
  type TimeOfDay,
  type NextGoldenBlueHours,
  type TimeWindow,
  formatTime,
  getTimeOfDayLabel,
  getRelevantTwilightTimes
} from '../utils/sunUtils';
import { type MoonPosition, type MoonTimes, getMoonPhaseLabel } from '../utils/moonUtils';
import { type WeatherData } from '../utils/weatherUtils';
import { isValidLatitude, isValidLongitude } from '../utils/manualLocation';
import { searchPlaces, formatGeocodeResultLabel, type GeocodeResult } from '../utils/geocodeUtils';
import { type WeatherType } from './CloudLayer';
import { format } from 'date-fns';

interface InfoPanelProps {
  sunPosition: SunPosition;
  moonPosition: MoonPosition;
  moonTimes: MoonTimes;
  nextFullMoon: Date;
  nextNewMoon: Date;
  sunTimes: SunTimes | null;
  nextGoldenBlueHours: NextGoldenBlueHours | null;
  location: LocationData;
  // The place name chosen via search, when the current location came from one; takes
  // priority over the reverse-geocode guess below for the same coordinates.
  manualPlaceName: string | null;
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
  onLocationChange: (latitude: number, longitude: number, name?: string) => void;
  onUseMyLocation: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  sunPosition,
  moonPosition,
  moonTimes,
  nextFullMoon,
  nextNewMoon,
  sunTimes,
  nextGoldenBlueHours,
  location,
  manualPlaceName,
  timeOfDay,
  currentTime,
  weatherType,
  weatherData,
  isLoadingWeather,
  useRealWeather,
  isFullscreen = false,
  onWeatherChange,
  onWeatherModeToggle,
  onWeatherRefresh,
  onLocationChange,
  onUseMyLocation
}) => {
  const [locationName, setLocationName] = useState<string>('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<GeocodeResult[]>([]);
  const [placeSearchStatus, setPlaceSearchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const placeAbortRef = useRef<AbortController | null>(null);
  const latInputRef = useRef<HTMLInputElement>(null);
  const changeLocationButtonRef = useRef<HTMLButtonElement>(null);
  const [isMoonCollapsed, setIsMoonCollapsed] = useState(true);
  const [isTwilightCollapsed, setIsTwilightCollapsed] = useState(false);
  const [isSunPositionCollapsed, setIsSunPositionCollapsed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredTwilight, setHoveredTwilight] = useState<string | null>(null);
  const fadeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  // Tracks which collapsible sections the user has manually toggled, so the
  // time-of-day auto-collapse effect below only ever touches sections the user
  // hasn't taken control of themselves.
  const userToggledMoonRef = React.useRef(false);
  const userToggledTwilightRef = React.useRef(false);
  const userToggledSunPositionRef = React.useRef(false);

  // Whenever fullscreen mode toggles (either direction), the panel should be visible
  // immediately; the effect below then re-arms the auto-fade timer for fullscreen.
  // Adjusting state during render (rather than in an effect) avoids an extra commit.
  const [prevIsFullscreen, setPrevIsFullscreen] = useState(isFullscreen);
  if (isFullscreen !== prevIsFullscreen) {
    setPrevIsFullscreen(isFullscreen);
    setIsVisible(true);
  }

  // Fade out after 10 seconds, but only while in fullscreen.
  useEffect(() => {
    if (!isFullscreen) return;

    fadeTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

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

  // Keyboard focus and touch also need to bring the panel back, not just mouse hover.
  const handleFocus = handleMouseEnter;
  const handleTouchStart = handleMouseEnter;

  // Auto-adjust collapsed states based on time of day
  useEffect(() => {
    const isNightTime = timeOfDay === 'night' || 
                       timeOfDay === 'astronomical-twilight' || 
                       timeOfDay === 'nautical-twilight' || 
                       timeOfDay === 'civil-twilight';
    
    if (isNightTime) {
      // During night/twilight: collapse twilight times and sun position, expand moon
      if (!userToggledTwilightRef.current) setIsTwilightCollapsed(true);
      if (!userToggledSunPositionRef.current) setIsSunPositionCollapsed(true);
      if (moonPosition.visible && !userToggledMoonRef.current) {
        setIsMoonCollapsed(false);
      }
    } else {
      // During day: expand twilight times and sun position, collapse moon
      if (!userToggledTwilightRef.current) setIsTwilightCollapsed(false);
      if (!userToggledSunPositionRef.current) setIsSunPositionCollapsed(false);
      if (!userToggledMoonRef.current) setIsMoonCollapsed(true);
    }
  }, [timeOfDay, moonPosition.visible]);

  useEffect(() => {
    if (!location.loaded) return;

    // A place chosen via search already has its name; use it instead of guessing
    // from a reverse-geocode call for the same coordinates. Deferred to a timer
    // callback (rather than run synchronously in the effect body) so this setState
    // doesn't run as part of the effect's own commit; see the weather-fetch effect
    // in SunTracker.tsx for the same pattern.
    if (manualPlaceName) {
      const timeoutId = setTimeout(() => {
        setLocationName(manualPlaceName);
        setLoadingLocation(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const fetchLocationName = async () => {
      setLoadingLocation(true);
      try {
        // Round to ~1km precision before sending the location to a third party.
        const roundedLat = Math.round(location.latitude * 100) / 100;
        const roundedLon = Math.round(location.longitude * 100) / 100;
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${roundedLat}&longitude=${roundedLon}&localityLanguage=en`
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
  }, [location.latitude, location.longitude, location.loaded, manualPlaceName]);

  // Debounced place-name search (ROADMAP item 12): waits 300ms after typing stops,
  // ignores queries under 2 characters, and aborts a request superseded by a newer
  // one so a slow response can never clobber the results of a later query.
  useEffect(() => {
    const trimmed = placeQuery.trim();
    if (trimmed.length < 2) {
      placeAbortRef.current?.abort();
      const timeoutId = setTimeout(() => {
        setPlaceResults([]);
        setPlaceSearchStatus('idle');
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const timeoutId = setTimeout(() => {
      placeAbortRef.current?.abort();
      const controller = new AbortController();
      placeAbortRef.current = controller;
      setPlaceSearchStatus('loading');

      searchPlaces(trimmed, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return;
          setPlaceResults(results);
          setPlaceSearchStatus('done');
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error('Error searching places:', error);
          setPlaceResults([]);
          setPlaceSearchStatus('error');
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [placeQuery]);

  // Abort any in-flight search when the panel unmounts.
  useEffect(() => {
    return () => {
      placeAbortRef.current?.abort();
    };
  }, []);

  // Focus the latitude field when the manual-location form opens.
  useEffect(() => {
    if (isLocationFormOpen) {
      latInputRef.current?.focus();
    }
  }, [isLocationFormOpen]);

  const resetPlaceSearch = () => {
    placeAbortRef.current?.abort();
    setPlaceQuery('');
    setPlaceResults([]);
    setPlaceSearchStatus('idle');
  };

  const openLocationForm = () => {
    setLatInput(location.latitude.toFixed(4));
    setLonInput(location.longitude.toFixed(4));
    setLocationError(null);
    resetPlaceSearch();
    setIsLocationFormOpen(true);
  };

  const closeLocationForm = () => {
    setIsLocationFormOpen(false);
    setLocationError(null);
    resetPlaceSearch();
    changeLocationButtonRef.current?.focus();
  };

  const handleSubmitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);

    if (Number.isNaN(lat) || !isValidLatitude(lat)) {
      setLocationError('Latitude must be a number between -90 and 90.');
      return;
    }
    if (Number.isNaN(lon) || !isValidLongitude(lon)) {
      setLocationError('Longitude must be a number between -180 and 180.');
      return;
    }

    onLocationChange(lat, lon);
    closeLocationForm();
  };

  const handleSelectPlace = (result: GeocodeResult) => {
    const label = formatGeocodeResultLabel(result);
    onLocationChange(result.latitude, result.longitude, label);
    closeLocationForm();
  };

  const handleUseMyLocationClick = () => {
    onUseMyLocation();
    closeLocationForm();
  };

  if (!sunTimes) return null;

  const relevantTwilightTimes = getRelevantTwilightTimes(currentTime, sunTimes, location.latitude, location.longitude);

  // At polar day/night, SunCalc has no real sunrise/sunset, so `sunTimes.sunrise`/`.sunset`
  // hold invented 06:00/18:00 fallback times (kept only for internal time-of-day math).
  // Show a plain-language label instead of those fake times.
  const polarSunLabel = sunTimes.polar === 'day'
    ? 'Sun does not set'
    : sunTimes.polar === 'night'
      ? 'Sun does not rise'
      : null;

  // Frost (< -5°C, ROADMAP item 10): a subtle, CSS-only icy edge on the panel itself.
  const isFrost = weatherData != null && weatherData.temperature < -5;

  // Golden/blue hour window (ROADMAP item 20): null at polar day/night, or before
  // SunTracker has computed it yet. A window running right now is marked as such
  // instead of showing its already-passed start time.
  const formatWindow = (window: TimeWindow | null | undefined): string => {
    if (!window) return '—';
    const now = currentTime.getTime();
    if (now >= window.start.getTime() && now < window.end.getTime()) {
      return `now, until ${formatTime(window.end)}`;
    }
    return `${formatTime(window.start)} – ${formatTime(window.end)}`;
  };

  // "this morning" / "this evening" / "tomorrow morning" (ROADMAP item 20).
  const goldenBlueHeading = nextGoldenBlueHours
    ? nextGoldenBlueHours.day === 'today'
      ? `this ${nextGoldenBlueHours.part}`
      : `tomorrow ${nextGoldenBlueHours.part}`
    : null;

  const weatherOptions: { type: WeatherType; label: string; icon: React.ReactNode }[] = [
    { type: 'clear', label: 'Clear', icon: <Sun size={16} /> },
    { type: 'partly', label: 'Partly', icon: <CloudSun size={16} /> },
    { type: 'cloudy', label: 'Cloudy', icon: <Cloudy size={16} /> },
    { type: 'overcast', label: 'Overcast', icon: <Cloud size={16} /> },
    { type: 'fog', label: 'Fog', icon: <CloudFog size={16} /> },
    { type: 'drizzle', label: 'Drizzle', icon: <CloudDrizzle size={16} /> },
    { type: 'rain', label: 'Rain', icon: <CloudRain size={16} /> },
    { type: 'storm', label: 'Storm', icon: <CloudLightning size={16} /> },
    { type: 'snow', label: 'Snow', icon: <CloudSnow size={16} /> },
    { type: 'hail', label: 'Hail', icon: <CloudHail size={16} /> },
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
      className={`absolute top-0 right-0 z-30 w-full max-w-[300px] sm:w-[300px] bg-black bg-opacity-40 backdrop-blur-md text-white rounded-bl-lg overflow-hidden transition-opacity duration-300 max-h-dvh ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${
        // Frost (ROADMAP item 10): a subtle icy glow on the panel edges, CSS only.
        isFrost ? 'shadow-[inset_0_0_22px_4px_rgba(191,219,254,0.35),inset_0_0_2px_1px_rgba(255,255,255,0.6)]' : ''
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingRight: 'env(safe-area-inset-right)' }}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onTouchStart={handleTouchStart}
    >
      {/* Header with toggle button */}
      <div className="p-4 pb-2 flex items-start justify-between flex-shrink-0">
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
              <Button
                ref={changeLocationButtonRef}
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1 text-xs opacity-80 hover:opacity-100 text-white justify-start"
                onClick={() => (isLocationFormOpen ? closeLocationForm() : openLocationForm())}
                aria-expanded={isLocationFormOpen}
              >
                {isLocationFormOpen ? 'Cancel' : 'Change location'}
              </Button>
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

      {isLocationFormOpen && (
        <form onSubmit={handleSubmitLocation} noValidate className="mx-4 mb-3 p-2 space-y-2 text-xs bg-white bg-opacity-10 rounded">
          <div className="flex flex-col gap-1">
            <label htmlFor="manual-location-search" className="opacity-80">Search for a place</label>
            <input
              id="manual-location-search"
              type="text"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="e.g. Friedrichshafen"
              className="bg-black bg-opacity-30 rounded px-2 py-1 text-white"
              role="combobox"
              aria-expanded={placeResults.length > 0}
              aria-controls="manual-location-search-results"
              aria-autocomplete="list"
            />
            {placeSearchStatus === 'loading' && (
              <p className="opacity-70">Searching…</p>
            )}
            {placeSearchStatus === 'error' && (
              <p role="alert" className="text-red-300">Could not search for places.</p>
            )}
            {placeSearchStatus === 'done' && placeResults.length === 0 && (
              <p className="opacity-70">No results</p>
            )}
            {placeResults.length > 0 && (
              <ul
                id="manual-location-search-results"
                role="listbox"
                aria-label="Search results"
                className="space-y-1"
              >
                {placeResults.map((result, index) => (
                  <li key={`${result.latitude}-${result.longitude}-${index}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => handleSelectPlace(result)}
                      className="w-full text-left px-2 py-1 rounded bg-white bg-opacity-5 hover:bg-opacity-20 transition-colors"
                    >
                      {formatGeocodeResultLabel(result)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="manual-location-lat" className="opacity-80">Latitude</label>
            <input
              id="manual-location-lat"
              ref={latInputRef}
              type="number"
              step="any"
              min={-90}
              max={90}
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className="bg-black bg-opacity-30 rounded px-2 py-1 text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="manual-location-lon" className="opacity-80">Longitude</label>
            <input
              id="manual-location-lon"
              type="number"
              step="any"
              min={-180}
              max={180}
              value={lonInput}
              onChange={(e) => setLonInput(e.target.value)}
              className="bg-black bg-opacity-30 rounded px-2 py-1 text-white"
            />
          </div>
          {locationError && (
            <p role="alert" className="text-red-300">{locationError}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm" variant="secondary">Set location</Button>
            <Button type="button" size="sm" variant="outline" onClick={handleUseMyLocationClick}>
              Use my location
            </Button>
          </div>
        </form>
      )}

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0">
          <ScrollArea className="max-h-[calc(100dvh-120px)]">
            <div
              className="px-4 pb-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
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
              <span className="font-semibold text-sm sm:text-base">{format(currentTime, 'HH:mm:ss')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Sunrise size={18} className="mr-2" />
                <span className="text-sm">Sunrise</span>
              </div>
              <span className="font-semibold text-sm sm:text-base">{polarSunLabel ?? formatTime(sunTimes.sunrise)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Sunset size={18} className="mr-2" />
                <span className="text-sm">Sunset</span>
              </div>
              <span className="font-semibold text-sm sm:text-base">{polarSunLabel ?? formatTime(sunTimes.sunset)}</span>
            </div>

            {/* Sunset score (ROADMAP item 11) */}
            {weatherData?.sunsetScoreToday && (
              <div className="text-xs opacity-80 tabular-nums -mt-2">
                <div>
                  Sunset score {weatherData.sunsetScoreToday.score}/10 · {weatherData.sunsetScoreToday.reason}
                </div>
                {weatherData.sunsetScoreTomorrow && (
                  <div className="opacity-70 mt-0.5">
                    Tomorrow: {weatherData.sunsetScoreTomorrow.score}/10 · {weatherData.sunsetScoreTomorrow.reason}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Golden & blue hour: only the next pair, from the same part of the day
              (ROADMAP item 20) */}
          <div className="mt-6 pt-4 border-t border-white border-opacity-20">
            <h3 className="text-sm font-bold mb-2">
              Golden &amp; Blue Hour{goldenBlueHeading ? ` · ${goldenBlueHeading}` : ''}
            </h3>
            <div className="space-y-1 text-xs">
              {nextGoldenBlueHours?.part === 'morning' ? (
                <>
                  <div className="flex justify-between">
                    <span className="opacity-80">Blue hour:</span>
                    <span className="font-mono tabular-nums">{formatWindow(nextGoldenBlueHours?.blue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Golden hour:</span>
                    <span className="font-mono tabular-nums">{formatWindow(nextGoldenBlueHours?.golden)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="opacity-80">Golden hour:</span>
                    <span className="font-mono tabular-nums">{formatWindow(nextGoldenBlueHours?.golden)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Blue hour:</span>
                    <span className="font-mono tabular-nums">{formatWindow(nextGoldenBlueHours?.blue)}</span>
                  </div>
                </>
              )}
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
                  onClick={() => {
                    userToggledMoonRef.current = true;
                    setIsMoonCollapsed(!isMoonCollapsed);
                  }}
                  className="p-1 rounded hover:bg-white hover:bg-opacity-10 transition-colors"
                  aria-label={isMoonCollapsed ? "Expand moon info" : "Collapse moon info"}
                >
                  {isMoonCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
              
              <div className={`transition-all duration-300 ease-in-out ${
                isMoonCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-64 opacity-100'
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
                  <div className="flex justify-between">
                    <span>Moonrise:</span>
                    <span className="font-mono">
                      {moonTimes.alwaysUp
                        ? 'Up all day'
                        : moonTimes.alwaysDown
                          ? 'Down all day'
                          : moonTimes.rise
                            ? formatTime(moonTimes.rise)
                            : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moonset:</span>
                    <span className="font-mono">
                      {moonTimes.alwaysUp
                        ? 'Up all day'
                        : moonTimes.alwaysDown
                          ? 'Down all day'
                          : moonTimes.set
                            ? formatTime(moonTimes.set)
                            : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next full moon:</span>
                    <span className="font-mono">{format(nextFullMoon, 'MMM d, HH:mm')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next new moon:</span>
                    <span className="font-mono">{format(nextNewMoon, 'MMM d, HH:mm')}</span>
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
                onClick={() => {
                  userToggledTwilightRef.current = true;
                  setIsTwilightCollapsed(!isTwilightCollapsed);
                }}
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
                      <button
                        type="button"
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left"
                        onMouseEnter={() => setHoveredTwilight('civil')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onFocus={() => setHoveredTwilight('civil')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'civil' ? null : 'civil')}
                        aria-expanded={hoveredTwilight === 'civil'}
                        aria-describedby="twilight-degree-civil"
                        title="Click or hover for degree information"
                      >
                        Civil:
                      </button>
                      <span className="font-mono">{formatTime(sunTimes.sunset)} - {formatTime(relevantTwilightTimes.civil)}</span>
                    </div>
                    {hoveredTwilight === 'civil' && (
                      <div id="twilight-degree-civil" className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('civil')}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <button
                        type="button"
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left"
                        onMouseEnter={() => setHoveredTwilight('nautical')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onFocus={() => setHoveredTwilight('nautical')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'nautical' ? null : 'nautical')}
                        aria-expanded={hoveredTwilight === 'nautical'}
                        aria-describedby="twilight-degree-nautical"
                        title="Click or hover for degree information"
                      >
                        Nautical:
                      </button>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.civil)} - {formatTime(relevantTwilightTimes.nautical)}</span>
                    </div>
                    {hoveredTwilight === 'nautical' && (
                      <div id="twilight-degree-nautical" className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('nautical')}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <button
                        type="button"
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left"
                        onMouseEnter={() => setHoveredTwilight('astronomical')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onFocus={() => setHoveredTwilight('astronomical')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'astronomical' ? null : 'astronomical')}
                        aria-expanded={hoveredTwilight === 'astronomical'}
                        aria-describedby="twilight-degree-astronomical"
                        title="Click or hover for degree information"
                      >
                        Astronomical:
                      </button>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.nautical)} - {formatTime(relevantTwilightTimes.astronomical)}</span>
                    </div>
                    {hoveredTwilight === 'astronomical' && (
                      <div id="twilight-degree-astronomical" className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('astronomical')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <button
                        type="button"
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left"
                        onMouseEnter={() => setHoveredTwilight('astronomical')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onFocus={() => setHoveredTwilight('astronomical')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'astronomical' ? null : 'astronomical')}
                        aria-expanded={hoveredTwilight === 'astronomical'}
                        aria-describedby="twilight-degree-astronomical"
                        title="Click or hover for degree information"
                      >
                        Astronomical:
                      </button>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.astronomical)} - {formatTime(relevantTwilightTimes.nautical)}</span>
                    </div>
                    {hoveredTwilight === 'astronomical' && (
                      <div id="twilight-degree-astronomical" className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('astronomical')}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <button
                        type="button"
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left"
                        onMouseEnter={() => setHoveredTwilight('nautical')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onFocus={() => setHoveredTwilight('nautical')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'nautical' ? null : 'nautical')}
                        aria-expanded={hoveredTwilight === 'nautical'}
                        aria-describedby="twilight-degree-nautical"
                        title="Click or hover for degree information"
                      >
                        Nautical:
                      </button>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.nautical)} - {formatTime(relevantTwilightTimes.civil)}</span>
                    </div>
                    {hoveredTwilight === 'nautical' && (
                      <div id="twilight-degree-nautical" className="text-xs opacity-60 ml-2">
                        {getDegreeInfo('nautical')}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <button
                        type="button"
                        className="font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left"
                        onMouseEnter={() => setHoveredTwilight('civil')}
                        onMouseLeave={() => setHoveredTwilight(null)}
                        onFocus={() => setHoveredTwilight('civil')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'civil' ? null : 'civil')}
                        aria-expanded={hoveredTwilight === 'civil'}
                        aria-describedby="twilight-degree-civil"
                        title="Click or hover for degree information"
                      >
                        Civil:
                      </button>
                      <span className="font-mono">{formatTime(relevantTwilightTimes.civil)} - {formatTime(sunTimes.sunrise)}</span>
                    </div>
                    {hoveredTwilight === 'civil' && (
                      <div id="twilight-degree-civil" className="text-xs opacity-60 ml-2">
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
                onClick={() => {
                  userToggledSunPositionRef.current = true;
                  setIsSunPositionCollapsed(!isSunPositionCollapsed);
                }}
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

          {/* Anonymous feedback (ROADMAP item 21): only when Sentry is set up */}
          {getFeedback() && (
            <div className="mt-6 pt-4 border-t border-white border-opacity-20">
              <button
                onClick={async () => {
                  const form = await getFeedback()?.createForm();
                  form?.appendToDom();
                  form?.open();
                }}
                className="flex items-center gap-2 text-xs opacity-80 hover:opacity-100 transition-opacity"
              >
                <MessageSquare size={14} />
                Send feedback
              </button>
            </div>
          )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default InfoPanel;