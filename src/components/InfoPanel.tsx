import { TAP_TARGET } from '@/utils/glassChrome';
import React, { lazy, useState, useEffect, useRef, useCallback } from 'react';
import LazyPart from './LazyPart';
import { Clock, Sunrise, Sunset, MapPin, ChevronDown, ChevronUp, Cloud, Cloudy, CloudRain, CloudSnow, CloudSun, CloudFog, CloudDrizzle, CloudHail, Sun, CloudLightning, Wind, Moon, RefreshCw, Thermometer, MessageSquare, Mountain, Rewind, FastForward, Bell, BellRing, AlarmClock, AlarmClockCheck, Satellite, Award, Database, CircleAlert } from 'lucide-react';
import { isFeedbackAvailable, openFeedbackForm } from '@/utils/feedback';
// The dialogs, the line of sight details and the place search load when they open (ROADMAP item 174).
const DataSourcesDialog = lazy(() => import('./DataSourcesDialog'));
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
const LineOfSightDetails = lazy(() => import('./LineOfSightDetails'));
import PremiumBadge from './PremiumBadge';
import { usePremiumGate } from '@/hooks/usePremium';
import { ALWAYS_SHOWN, type IdleHide } from '@/hooks/useIdleHide';
import ShareCardButton from '@/components/ShareCardButton';
const PlaceSearch = lazy(() => import('./PlaceSearch'));
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
import { type WeatherData, getScoreReason } from '../utils/weatherUtils';
import { getWeatherEffects } from '../utils/weatherEffectsUtils';
import { isValidLatitude, isValidLongitude } from '../utils/manualLocation';
import { type HorizonProfileStatus } from '../hooks/useHorizonProfile';
import { type HorizonProfile } from '@/utils/horizonUtils';
import { type WeatherType } from './CloudLayer';
import {
  type PlaceInfo, loadPlace, savePlace, fetchPlace, fetchPhotonPlace, deviceCountry, reportPlace, placeStatusOf, errorStatusOf,
} from '@/utils/placeName';
import { fromDateTimeLocalValue, getTimeTravelRange, toDateTimeLocalValue } from '@/utils/timeTravel';
import { placeClockDifferenceMinutes } from '@/utils/timeZone';
import { formatTemperature, type TemperatureUnit } from '@/utils/temperatureUnit';
import { SUNSET_REMINDER_MIN } from '@/utils/sunsetReminder';
import { PASS_REMINDER_MIN } from '@/utils/satelliteUtils';
import { type LiveStatus } from '@/utils/liveRadar';
import { type SatelliteStatus } from '@/hooks/useSatelliteTracking';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '@/utils/language';
import { formatNumber, translate, type MessageKey } from '@/i18n';
import { useLanguage } from '@/hooks/useLanguage';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBackToClose } from '@/hooks/useBackToClose';
import { isEmptySkyTap } from '@/utils/sceneTap';

// Direction D "Polished Classic" (ROADMAP items 7 & 15): shared classes so every
// row/section/focus ring in the panel reads as one system. ROW, ICON_TOGGLE and
// FOCUS_RING are exported for LineOfSightDetails.tsx (ROADMAP item 30), the one
// sibling component that reuses them; SECTION_HEADING stays file-local - see
// glassChrome.ts for the one style helper shared more broadly, and its test.
export const ROW = 'flex justify-between items-center gap-2 border-t border-[hsl(var(--panel-border)/0.12)] pt-1';
const SECTION_HEADING = 'text-title font-bold flex items-center';
// Item 176: a tap focused the twilight label (open), the touch's mouse events opened it again,
// and the click then closed it: a tap showed nothing. Only a mouse hovers, and only a keyboard
// focus (`:focus-visible`) opens it; the click toggles.
const isKeyboardFocus = (element: Element): boolean => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
};
// Lookbook round 2 (Lutz, 2026-10-19, option A2): a closed card is one row of a compact list (a
// faint line, a 16 px title, 44 px high); an open card keeps its gap and big title. The first
// card keeps a gap above it, so the list does not touch the block before.
const cardSection = (isClosed: boolean, isFirst = false) =>
  isClosed ? `border-t border-white/10 ${isFirst ? 'mt-4' : ''}` : 'mt-6 pt-4 border-t border-white/20';
const cardHeaderRow = (isClosed: boolean) => `relative flex items-center justify-between min-h-11 ${isClosed ? '' : 'mb-2'}`;
const cardTitle = (isClosed: boolean) => (isClosed ? 'text-body font-semibold flex items-center' : SECTION_HEADING);
const ICON_TOGGLE_BASE = 'p-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70';
// Item 173: a 44 px tap area (TAP_TARGET) around the 26-30 px button.
export const ICON_TOGGLE = `${ICON_TOGGLE_BASE} ${TAP_TARGET}`;
export const FOCUS_RING = 'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70';
// Item 165: a card's toggle stretches over its header row (the row is `relative`), so a tap
// on the title opens the card too, not only the chevron. Item 173: the row is at least 44 px high.
const SECTION_TOGGLE = `${ICON_TOGGLE_BASE} after:absolute after:inset-0`;

// A compact variant of ICON_TOGGLE for the inline "line of sight" buttons (ROADMAP
// item 30), which sit inside an already-tight row and must not push it past one
// line at 360px.
const INLINE_ICON_TOGGLE = `p-0.5 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 shrink-0 ${TAP_TARGET}`;

// Line-of-sight terrain rows (ROADMAP items 13 & 30): formats the terrain-adjusted
// rise/set time against the astronomical one, as a short value, e.g. "18:42 (-23 min)"
// - or a plain-language fallback when the body never clears the terrain that day, or
// when the astronomical time itself is unknown (e.g. no moonrise on a given night).
// eslint-disable-next-line react-refresh/only-export-components -- exported for unit testing
export const formatTerrainDelta = (
  body: 'sun' | 'moon',
  terrainDate: Date | null,
  astronomicalDate: Date | null,
  language: Language = 'en',
  timeZone?: string
): string => {
  if (!astronomicalDate) return '—';
  if (!terrainDate) return translate(language, body === 'sun' ? 'terrain.sunHidden' : 'terrain.moonHidden');
  const diffMinutes = Math.round((terrainDate.getTime() - astronomicalDate.getTime()) / 60000);
  const sign = diffMinutes >= 0 ? '+' : '';
  return `${formatTime(terrainDate, language, timeZone)} (${sign}${translate(language, 'common.minutes', { value: diffMinutes })})`;
};

// "Oct 7, 14:05" in the UI language, as date-fns 'MMM d, HH:mm' did, with Intl instead
// (AUDIT P-7, ROADMAP item 67).
const formatMoonDate = (date: Date, language: Language, timeZone?: string): string =>
  `${date.toLocaleDateString(language, { month: 'short', day: 'numeric', timeZone })}, ${formatTime(date, language, timeZone)}`;

// Highlights "now, until 19:42" in peach, the same D `--panel-hi` treatment as the
// terrain delta above.
const renderWindow = ({ text, isNow }: { text: string; isNow: boolean }): React.ReactNode =>
  isNow ? <span className="text-brand-peach">{text}</span> : text;

// Item 164: a live feed in `error` (live planes, satellite tracking) gets a red icon next to its
// name and a refresh button as the weather's (the icon turns while the refresh runs).
const FeedErrorIcon = ({ label }: { label: string }) => (
  <CircleAlert size={14} className="text-red-400 shrink-0" role="img" aria-label={label} />
);
const FeedRefreshButton = ({ label, onClick, refreshing, disabled = false, className = '' }: {
  label: string; onClick: () => void; refreshing: boolean; disabled?: boolean; className?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={refreshing || disabled}
    className={`${ICON_TOGGLE} disabled:opacity-50 shrink-0 ${className}`}
    aria-label={label}
  >
    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
  </button>
);

interface InfoPanelProps {
  sunPosition: SunPosition;
  moonPosition: MoonPosition;
  moonTimes: MoonTimes;
  nextFullMoon: Date;
  nextNewMoon: Date;
  sunTimes: SunTimes | null;
  // Sunrise/sunset of the pass the sun arc draws (AUDIT C-17): after sunset, the next
  // ones. Null or missing falls back to `sunTimes` (today's).
  passSunTimes?: { sunrise: Date | null; sunset: Date | null } | null;
  nextGoldenBlueHours: NextGoldenBlueHours | null;
  location: LocationData;
  // The place name chosen via search, when the current location came from one; takes
  // priority over the reverse-geocode guess below for the same coordinates.
  manualPlaceName: string | null;
  // Item 170: a place set by hand with no name (typed coordinates): "Chosen point", not "Your location".
  isChosenPoint?: boolean;
  // Item 169: a place set by hand with no known time zone; its times are in the device's clock.
  isPlaceZoneUnknown?: boolean;
  // Tells SunTracker the place name shown here (null: none yet), for Santa's card (lookbook S7).
  onPlaceName?: (name: string | null) => void;
  timeOfDay: TimeOfDay;
  currentTime: Date;
  weatherType: WeatherType;
  weatherData: WeatherData | null;
  isLoadingWeather: boolean;
  useRealWeather: boolean;
  // Display unit for temperatures (°C/°F toggle). Defaults to °C for existing callers.
  temperatureUnit?: TemperatureUnit;
  onTemperatureUnitChange?: (unit: TemperatureUnit) => void;
  // The shared fullscreen idle fade (items 89 and 132), from SunTracker.
  controls?: IdleHide;
  onWeatherChange: (weather: WeatherType) => void;
  // Manual mode's strong-wind switch (ROADMAP item 73): leaves, slower birds, boat wakes.
  manualWindy?: boolean;
  onManualWindyChange?: (windy: boolean) => void;
  onWeatherModeToggle: (useReal: boolean) => void;
  onWeatherRefresh: () => void;
  onLocationChange: (latitude: number, longitude: number, name?: string, countryCode?: string, timeZone?: string) => void;
  onUseMyLocation: () => void;
  // Line of sight with terrain (ROADMAP item 13): hidden entirely while `idle` (the
  // feature is off, or location isn't loaded yet). Defaults keep every existing
  // caller/test working unchanged.
  terrainStatus?: HorizonProfileStatus;
  terrainSunTimes?: { sunrise: Date | null; sunset: Date | null } | null;
  terrainMoonTimes?: { rise: Date | null; set: Date | null } | null;
  eyeHeightMeters?: number;
  onEyeHeightChange?: (meters: number) => void;
  // Time travel (ROADMAP item 44): a preview shows the date and time instead of the
  // live clock. -1 plays backward, 1 forward, 0 is paused.
  isTimePreview?: boolean;
  timePlayDirection?: -1 | 0 | 1;
  onTimePlay?: (direction: -1 | 1) => void;
  onTimeJump?: (date: Date) => void;
  // Sunset countdown (ROADMAP item 43): the bell toggle in the Sunset row.
  isSunsetCountdownOn?: boolean;
  onSunsetCountdownToggle?: () => void;
  // Share card (ROADMAP item 68): the terrain silhouette on the card.
  horizonProfile?: HorizonProfile | null;
  // Sunset reminder (ROADMAP item 69): the alarm-clock toggle next to the bell. Not
  // passed when the browser has no Notification API.
  isSunsetReminderOn?: boolean;
  onSunsetReminderToggle?: () => void;
  // Satellite tracking (ROADMAP item 97): the switch with the gold plus.
  isSatelliteTrackingOn?: boolean;
  onSatelliteTrackingToggle?: () => void;
  // "ISS passes" (ROADMAP item 97): the reminder toggle next to the sunset reminder, with the
  // gold plus. Not passed when the browser has no Notification API.
  isIssReminderOn?: boolean;
  onIssReminderToggle?: () => void;
  // The live radar (ROADMAP item 96, Premium): the "Live planes" switch, off by default.
  isLivePlanesOn?: boolean;
  onLivePlanesToggle?: (on: boolean) => void;
  // Item 155: the status line under the switch while the radar runs; null: no line. `nearby` is
  // the aircraft in the last answer, `shown` the planes drawn; `compassOff`: the compass button
  // is there and compass mode is off.
  liveRadarStatus?: { status: LiveStatus; nearby: number; shown: number; compassOff: boolean; refreshing?: boolean } | null;
  // Item 164: in `error`, a red icon, a red line and this refresh (asks the feed at once).
  onLivePlanesRefresh?: () => void;
  // Item 164: the satellite tracking's status while the tracking runs (null: none). In `error`:
  // a red icon, a red line and the refresh; `nextTryAt` (CelesTrak's wait) disables the refresh.
  satelliteStatus?: { status: SatelliteStatus; refreshing: boolean; nextTryAt: number | null } | null;
  onSatelliteRefresh?: () => void;
  // Collection badges (ROADMAP item 112): the row button that opens the collection.
  onCollectionOpen?: () => void;
  // National days (utils/nationalDays): the place's country code from the reverse-geocode
  // answer below (cached, item 130), the device time zone's country when the call fails, or
  // null (a searched place: SunTracker keeps its own code; no code). Keep it stable (a state
  // setter): a new function fetches again.
  onCountryChange?: (countryCode: string | null) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  sunPosition,
  moonPosition,
  moonTimes,
  nextFullMoon,
  nextNewMoon,
  sunTimes,
  passSunTimes = null,
  nextGoldenBlueHours,
  location,
  manualPlaceName,
  isChosenPoint = false,
  isPlaceZoneUnknown = false,
  onPlaceName,
  timeOfDay,
  currentTime,
  weatherType,
  weatherData,
  isLoadingWeather,
  useRealWeather,
  temperatureUnit = 'C',
  onTemperatureUnitChange = () => {},
  controls = ALWAYS_SHOWN,
  onWeatherChange,
  manualWindy = false,
  onManualWindyChange = () => {},
  onWeatherModeToggle,
  onWeatherRefresh,
  onLocationChange,
  onUseMyLocation,
  terrainStatus = 'idle',
  terrainSunTimes = null,
  terrainMoonTimes = null,
  eyeHeightMeters = 1.7,
  onEyeHeightChange = () => {},
  isTimePreview = false,
  timePlayDirection = 0,
  onTimePlay = () => {},
  onTimeJump = () => {},
  isSunsetCountdownOn = false,
  onSunsetCountdownToggle,
  horizonProfile = null,
  isSunsetReminderOn = false,
  onSunsetReminderToggle,
  isSatelliteTrackingOn = false,
  onSatelliteTrackingToggle,
  isIssReminderOn = false,
  onIssReminderToggle,
  isLivePlanesOn = false,
  onLivePlanesToggle,
  liveRadarStatus = null,
  onLivePlanesRefresh,
  satelliteStatus = null,
  onSatelliteRefresh,
  onCollectionOpen,
  onCountryChange,
}) => {
  const { t, language, setLanguage, timeZone } = useLanguage();
  // Premium gate (ROADMAP item 14): every gold-plus control goes through requirePremium.
  const { isLocked, requirePremium } = usePremiumGate();
  const formatLocalTime = (date: Date | null) => formatTime(date, language, timeZone);
  // Item 169: the place's clock against the device's, under the place name.
  const clockDifference = timeZone ? placeClockDifferenceMinutes(currentTime, timeZone) : 0;
  const clockOffsetText = (minutes: number) => {
    const abs = Math.abs(minutes);
    return abs % 60 === 0 ? t('common.hours', { value: abs / 60 }) : t('info.hoursMinutes', { hours: Math.floor(abs / 60), minutes: abs % 60 });
  };
  const clockNote = isPlaceZoneUnknown
    ? t('location.clockYours')
    : clockDifference > 0
      ? t('location.clockAhead', { offset: clockOffsetText(clockDifference) })
      : clockDifference < 0
        ? t('location.clockBehind', { offset: clockOffsetText(clockDifference) })
        : null;
  // Item 164: a live feed in `error` while its switch is on.
  const isLiveRadarError = isLivePlanesOn && liveRadarStatus?.status === 'error';
  const isSatelliteError = isSatelliteTrackingOn && satelliteStatus?.status === 'error';
  // '' until the first lookup ends; null when the lookup found no place name.
  const [locationName, setLocationName] = useState<string | null>('');
  // Item 137: the shown name comes from Photon (OpenStreetMap data) and needs the attribution.
  const [isOsmName, setIsOsmName] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  // Phones (< 640 px, Tailwind `sm`) start collapsed so the first view shows the scene
  // (ROADMAP item 55). Read once at mount; later resizes do not change it.
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 640);
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const changeLocationButtonRef = useRef<HTMLButtonElement>(null);
  const [isMoonCollapsed, setIsMoonCollapsed] = useState(true);
  const [isTwilightCollapsed, setIsTwilightCollapsed] = useState(false);
  const [isSunPositionCollapsed, setIsSunPositionCollapsed] = useState(false);
  // Golden & Blue Hour (ROADMAP item 24): collapsed by default, and not part of the
  // time-of-day auto-collapse effect below - it stays as the user left it.
  const [isGoldenBlueCollapsed, setIsGoldenBlueCollapsed] = useState(true);
  // Data sources dialog (ROADMAP item 153). A stable close: the panel renders each second.
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const closeDataSources = useCallback(() => setIsDataSourcesOpen(false), []);
  // Line of sight details (ROADMAP item 30): closed by default, and independent for
  // the sun rows and the moon rows.
  const [isSunTerrainOpen, setIsSunTerrainOpen] = useState(false);
  // Time travel (ROADMAP item 44): the datetime-local input shows while this is set,
  // with its min/max (today ± 1 year) taken when it opens.
  const [timePickerRange, setTimePickerRange] = useState<{ min: Date; max: Date } | null>(null);
  const [isMoonTerrainOpen, setIsMoonTerrainOpen] = useState(false);
  const [hoveredTwilight, setHoveredTwilight] = useState<string | null>(null);
  // Tracks which collapsible sections the user has manually toggled, so the
  // time-of-day auto-collapse effect below only ever touches sections the user
  // hasn't taken control of themselves.
  const userToggledMoonRef = React.useRef(false);
  const userToggledTwilightRef = React.useRef(false);
  const userToggledSunPositionRef = React.useRef(false);

  // In fullscreen the panel fades out with the other controls: 3 s after entering, 10 s after a
  // wake (ROADMAP item 89). SunTracker wakes on a mouse move or a tap; hidden, it takes no taps (item 132).
  const { isVisible, isTappable, wake: handleFocus } = controls;

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
        setIsOsmName(false);
        setLoadingLocation(false);
        onCountryChange?.(null);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    // Set on cleanup: a response for an old location (or after unmount) must not set state.
    let cancelled = false;

    const fetchLocationName = async () => {
      const latitude = location.latitude;
      const longitude = location.longitude;
      const showPlace = (place: PlaceInfo) => {
        setLocationName(place.name);
        setIsOsmName(place.source === 'photon');
        onCountryChange?.(place.countryCode);
      };
      // Item 130: show the cached answer at once; ask again only when it is stale.
      const cached = loadPlace(latitude, longitude, language);
      if (cached) {
        showPlace(cached.place);
        setLoadingLocation(false);
        if (cached.fresh) {
          reportPlace('cached');
          return;
        }
      } else {
        setLoadingLocation(true);
      }
      try {
        const place = await fetchPlace(latitude, longitude, language, () => cancelled);
        if (cancelled) return;
        savePlace(latitude, longitude, language, place);
        showPlace(place);
        reportPlace(placeStatusOf(place));
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching location name:', error);
        // Item 137: both BigDataCloud calls failed; ask Photon once.
        let fallback: PlaceInfo | null = null;
        let photonStatus: string;
        try {
          fallback = await fetchPhotonPlace(latitude, longitude, language);
          photonStatus = placeStatusOf(fallback);
        } catch (photonError) {
          console.error('Error fetching location name from Photon:', photonError);
          photonStatus = errorStatusOf(photonError);
        }
        if (cancelled) return;
        reportPlace(errorStatusOf(error), photonStatus);
        // Photon's answer, unless it is empty or has no town while the cache has one. Else keep
        // the cached answer; without one, no name and the device time zone's country.
        const isEmpty = !fallback || (fallback.name === null && fallback.countryCode === null);
        const keepCachedTown = cached?.place.hasTown && !fallback?.hasTown;
        if (fallback && !isEmpty && !keepCachedTown) {
          savePlace(latitude, longitude, language, fallback);
          showPlace(fallback);
        } else if (!cached) {
          setLocationName(null);
          setIsOsmName(false);
          onCountryChange?.(deviceCountry());
        }
      } finally {
        if (!cancelled) setLoadingLocation(false);
      }
    };

    fetchLocationName();
    return () => {
      cancelled = true;
    };
  }, [location.latitude, location.longitude, location.loaded, manualPlaceName, language, onCountryChange]);

  // The shown place name for SunTracker (Santa's card, lookbook S7); '' (loading) counts as none.
  const shownPlaceName = locationName || null;
  useEffect(() => {
    onPlaceName?.(shownPlaceName);
  }, [shownPlaceName, onPlaceName]);

  const openLocationForm = () => {
    setLatInput(location.latitude.toFixed(4));
    setLonInput(location.longitude.toFixed(4));
    setLocationError(null);
    setIsLocationFormOpen(true);
  };

  const closeLocationForm = () => {
    setIsLocationFormOpen(false);
    setLocationError(null);
    changeLocationButtonRef.current?.focus();
  };

  // Item 173, on a phone: Back closes the open search, Data sources or the panel first.
  const isPhone = useIsMobile();
  const collapse = useCallback(() => setIsCollapsed(true), []);
  useBackToClose(!isCollapsed, collapse, isPhone);
  useBackToClose(!isCollapsed && isLocationFormOpen, closeLocationForm, isPhone);
  useBackToClose(isDataSourcesOpen, closeDataSources, isPhone);
  // Item 173, on a phone: a tap on the empty sky beside the open panel closes the panel and
  // does nothing else (it stops before the item 136 toggle). The panel covers most of the sky.
  useEffect(() => {
    if (isCollapsed || !isPhone) return;
    const onClick = (event: MouseEvent) => {
      if (!isEmptySkyTap(event.target)) return;
      event.stopPropagation();
      setIsCollapsed(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isCollapsed, isPhone]);

  const handleSubmitLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);

    if (Number.isNaN(lat) || !isValidLatitude(lat)) {
      setLocationError(t('location.latitudeError'));
      return;
    }
    if (Number.isNaN(lon) || !isValidLongitude(lon)) {
      setLocationError(t('location.longitudeError'));
      return;
    }

    requirePremium(() => {
      onLocationChange(lat, lon);
      closeLocationForm();
    });
  };

  // Item 170: the form opens for everyone, so "Use my location" is always free; a place
  // set by hand (search or coordinates) is Premium.
  const handleSelectPlace = (latitude: number, longitude: number, name: string, countryCode?: string, timeZone?: string) => {
    requirePremium(() => {
      onLocationChange(latitude, longitude, name, countryCode, timeZone);
      closeLocationForm();
    });
  };

  const handleUseMyLocationClick = () => {
    onUseMyLocation();
    closeLocationForm();
  };

  if (!sunTimes) return null;

  const relevantTwilightTimes = getRelevantTwilightTimes(currentTime, sunTimes, location.latitude, location.longitude);

  // Coordinates in the header (ROADMAP item 25): shown only when there is no place
  // name to show instead - while the reverse-geocode lookup is still loading, or
  // after it failed (null). Kept in the "Change location" form either way.
  const hasPlaceName = locationName !== '' && locationName !== null;
  const showCoordinates = loadingLocation || !hasPlaceName;

  // At polar day/night, SunCalc has no real sunrise/sunset, so `sunTimes.sunrise`/`.sunset`
  // hold invented 06:00/18:00 fallback times (kept only for internal time-of-day math).
  // Show a plain-language label instead of those fake times.
  const polarSunLabel = sunTimes.polar === 'day'
    ? t('sun.noSet')
    : sunTimes.polar === 'night'
      ? t('sun.noRise')
      : null;
  const shownSunrise = passSunTimes?.sunrise ?? sunTimes.sunrise;
  const shownSunset = passSunTimes?.sunset ?? sunTimes.sunset;
  // Item 176: the time over the hills (the sky's line-of-sight pill) under the flat-horizon
  // time, when the hills shift it by 2 min or more; first users saw two times and no reason.
  const overHills = (terrain: Date | null | undefined, flat: Date | null) =>
    !polarSunLabel && terrain && flat && Math.abs(terrain.getTime() - flat.getTime()) >= 2 * 60_000 ? (
      <span className="text-caption opacity-70 tabular-nums">{t('sun.overHills', { time: formatLocalTime(terrain) })}</span>
    ) : null;

  // Frost (ROADMAP items 10 & 49): getWeatherEffects owns the one threshold.
  const isFrost = getWeatherEffects({
    type: weatherType,
    windKmh: weatherData?.windSpeedKmh,
    tempC: weatherData?.temperature,
    sunAltitude: sunPosition.altitude,
  }).showFrost;

  // Golden/blue hour window (ROADMAP item 20): null at polar day/night, or before
  // SunTracker has computed it yet. A window running right now is marked as such
  // instead of showing its already-passed start time.
  const formatWindow = (window: TimeWindow | null | undefined): { text: string; isNow: boolean } => {
    if (!window) return { text: '—', isNow: false };
    const now = currentTime.getTime();
    if (now >= window.start.getTime() && now < window.end.getTime()) {
      return { text: t('golden.nowUntil', { time: formatLocalTime(window.end) }), isNow: true };
    }
    return { text: `${formatLocalTime(window.start)} – ${formatLocalTime(window.end)}`, isNow: false };
  };

  // "This morning" / "This evening" / "Tomorrow morning" (ROADMAP item 20). First line
  // of the collapsible body, not part of the heading, so the heading never wraps
  // (ROADMAP item 33).
  const GOLDEN_BLUE_DAY_PARTS: Record<string, MessageKey> = {
    'today morning': 'golden.thisMorning',
    'today evening': 'golden.thisEvening',
    'tomorrow morning': 'golden.tomorrowMorning',
    'tomorrow evening': 'golden.tomorrowEvening',
  };
  const goldenBlueDayPart = nextGoldenBlueHours
    ? t(GOLDEN_BLUE_DAY_PARTS[`${nextGoldenBlueHours.day} ${nextGoldenBlueHours.part}`])
    : null;

  const weatherOptions: { type: WeatherType; label: string; icon: React.ReactNode }[] = [
    { type: 'clear', label: t('weatherType.clear'), icon: <Sun size={16} /> },
    { type: 'partly', label: t('weatherType.partly'), icon: <CloudSun size={16} /> },
    { type: 'cloudy', label: t('weatherType.cloudy'), icon: <Cloudy size={16} /> },
    { type: 'overcast', label: t('weatherType.overcast'), icon: <Cloud size={16} /> },
    { type: 'fog', label: t('weatherType.fog'), icon: <CloudFog size={16} /> },
    { type: 'drizzle', label: t('weatherType.drizzle'), icon: <CloudDrizzle size={16} /> },
    { type: 'rain', label: t('weatherType.rain'), icon: <CloudRain size={16} /> },
    { type: 'storm', label: t('weatherType.storm'), icon: <CloudLightning size={16} /> },
    { type: 'snow', label: t('weatherType.snow'), icon: <CloudSnow size={16} /> },
    { type: 'hail', label: t('weatherType.hail'), icon: <CloudHail size={16} /> },
  ];

  // "Sunset (0°) → Civil (-6°)", in the order the twilight runs (dusk or dawn).
  const getDegreeInfo = (twilightType: string) => {
    const steps = [
      `${t('sun.sunset')} (0°)`,
      `${t('twilight.civil')} (-6°)`,
      `${t('twilight.nautical')} (-12°)`,
      `${t('twilight.astronomical')} (-18°)`,
    ];
    const index = ['civil', 'nautical', 'astronomical'].indexOf(twilightType);
    if (index === -1) return '';
    if (relevantTwilightTimes.type === 'dusk') return `${steps[index]} → ${steps[index + 1]}`;
    const dawnTo = index === 0 ? `${t('sun.sunrise')} (0°)` : steps[index];
    return `${steps[index + 1]} → ${dawnTo}`;
  };

  // The top-left button column (3.5rem wide, down to 9.5rem: fullscreen, compass,
  // feedback - ROADMAP item 31) fits beside the 300 px panel from 364 px up; below
  // that the panel starts under the column.
  return (
    <div
      data-share-hide
      data-idle-control
      className={`absolute top-0 max-[363px]:top-[calc(10rem+env(safe-area-inset-top))] right-0 z-30 w-full max-w-[min(300px,calc(100vw-2rem))] sm:w-[300px] bg-[hsl(var(--panel-background)/0.45)] backdrop-blur-md border border-[hsl(var(--panel-border)/0.14)] text-white rounded-bl-panel max-[363px]:rounded-tl-panel overflow-hidden transition-opacity duration-300 max-h-dvh max-[363px]:max-h-[calc(100dvh-10rem-env(safe-area-inset-top))] ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${isTappable ? '' : 'pointer-events-none'} ${
        // Frost (ROADMAP items 10 & 49): a white-blue inner edge about 6 px wide, CSS only.
        // Only one `shadow-[...]` utility can win per element, so the frost edge
        // (when present) replaces the plain D panel shadow rather than fighting it.
        isFrost
          ? 'shadow-[inset_0_0_6px_3px_rgba(224,242,254,0.75),inset_0_0_0_1px_rgba(255,255,255,0.8)]'
          : 'shadow-[0_8px_30px_rgba(0,0,0,0.25)]'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingRight: 'env(safe-area-inset-right)' }}
      onFocus={handleFocus}
    >
      {isFrost && (
        // Static ice crystals in two corners (ROADMAP item 49). No animation.
        <div data-testid="panel-frost" aria-hidden="true" className="pointer-events-none">
          {['top-1 left-1', 'bottom-1 right-1 rotate-180'].map((pos) => (
            <svg key={pos} className={`absolute ${pos} w-5 h-5 text-sky-100/80`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {/* ponytail: one 3-line snowflake plus a small one, reused for both corners */}
              <path d="M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6M18 12v6M15.4 13.5l5.2 3M15.4 16.5l5.2-3" />
            </svg>
          ))}
        </div>
      )}

      {/* Header with toggle button */}
      <div className="p-4 pb-3 flex items-start justify-between shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-display leading-none font-bold tracking-tight">{t(getTimeOfDayLabel(timeOfDay))}</h1>
          <div className="flex items-start text-body opacity-80 mt-1">
            <MapPin size={14} className="mr-1 mt-0.5 shrink-0" />
            <div className="flex flex-col min-w-0">
              {loadingLocation ? (
                <span>{t('location.loading')}</span>
              ) : (
                locationName !== '' && <span className="mb-1 truncate">{locationName ?? t(isChosenPoint ? 'location.chosenPoint' : 'location.unknown')}</span>
              )}
              {showCoordinates && (
                <span className="text-caption opacity-70 tabular-nums">
                  {formatNumber(language, location.latitude, 4)}°, {formatNumber(language, location.longitude, 4)}°
                </span>
              )}
              {clockNote && <span className="text-caption opacity-70" data-testid="clock-note">{clockNote}</span>}
              {/* Item 137: a name from Photon is OpenStreetMap data (ODbL); the attribution takes
                  the coordinates' line, so the panel is not higher than while it loads. */}
              {isOsmName && !showCoordinates && (
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`self-start text-caption opacity-70 hover:opacity-100 hover:underline ${FOCUS_RING}`}
                >
                  {t('location.osmAttribution')}
                </a>
              )}
              {/* Expanded panel only (ROADMAP item 47): keeps the collapsed panel within
                  COLLAPSED_PANEL_HEIGHT in SunVisualization.tsx. */}
              {!isCollapsed && (
                <Button
                  ref={changeLocationButtonRef}
                  type="button"
                  variant="link"
                  size="sm"
                  className={`h-auto p-0 mt-1 gap-1 text-caption opacity-80 hover:opacity-100 text-white justify-start ${TAP_TARGET} ${FOCUS_RING}`}
                  onClick={() => (isLocationFormOpen ? closeLocationForm() : openLocationForm())}
                  aria-expanded={isLocationFormOpen}
                >
                  {isLocationFormOpen ? t('common.cancel') : <>{t('location.change')}<PremiumBadge /></>}
                </Button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`ml-2 ${ICON_TOGGLE} shrink-0 relative`}
          aria-label={isCollapsed ? t('panel.expand') : t('panel.collapse')}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          {/* Item 164 (option 6): the closed panel shows a feed in `error` too. */}
          {isCollapsed && (isLiveRadarError || isSatelliteError) && (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-400" data-testid="panel-error-dot" aria-hidden="true" />
          )}
        </button>
      </div>

      {!isCollapsed && isLocationFormOpen && (
        <form onSubmit={handleSubmitLocation} noValidate className="mx-4 mb-3 p-2 space-y-2 text-caption bg-white/10 rounded">
          {/* Item 165: the cursor starts in the search, so a typed place and Enter search it
              (in the latitude field, Enter set the old coordinates again). */}
          <LazyPart><PlaceSearch onSelect={handleSelectPlace} autoFocus /></LazyPart>
          <div className="flex flex-col gap-1">
            <label htmlFor="manual-location-lat" className="opacity-80">{t('location.latitude')}</label>
            <input
              id="manual-location-lat"
              type="number"
              step="any"
              min={-90}
              max={90}
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              className={`bg-black/30 rounded px-2 py-1 text-white tabular-nums ${FOCUS_RING}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="manual-location-lon" className="opacity-80">{t('location.longitude')}</label>
            <input
              id="manual-location-lon"
              type="number"
              step="any"
              min={-180}
              max={180}
              value={lonInput}
              onChange={(e) => setLonInput(e.target.value)}
              className={`bg-black/30 rounded px-2 py-1 text-white tabular-nums ${FOCUS_RING}`}
            />
          </div>
          {locationError && (
            <p role="alert" className="text-brand-coral">{locationError}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" size="sm" variant="secondary" className="rounded-full">{t('location.set')}</Button>
            {/* Item 165: the outline variant's white fill under the panel's white text hid the label. */}
            <Button type="button" size="sm" variant="outline" className="rounded-full bg-transparent border-white/40 hover:bg-white/10 hover:text-white" onClick={handleUseMyLocationClick}>
              {t('location.useMine')}
            </Button>
          </div>
        </form>
      )}

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0">
          <ScrollArea className="max-h-[calc(100dvh-120px)] max-[363px]:max-h-[calc(100dvh-280px-env(safe-area-inset-top))]">
            <div
              className="px-4 pb-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
          {/* Current Weather Display. Item 176: shown with "–" before the first answer, so the
              panel does not jump when the weather comes. */}
          {(
            <div className="mb-4 pt-2 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className={SECTION_HEADING}>
                  <Thermometer size={16} className="mr-2" />
                  {t(weatherData?.isForecast ? 'weather.forecast' : 'weather.current')}
                </h3>
                <button
                  onClick={onWeatherRefresh}
                  disabled={isLoadingWeather}
                  className={`${ICON_TOGGLE} disabled:opacity-50`}
                  aria-label={t('weather.refresh')}
                >
                  <RefreshCw size={14} className={isLoadingWeather ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Item 165: dimmed while a new answer loads, so the old place's weather does not read as the new one's. */}
              <div className={`space-y-1 transition-opacity ${isLoadingWeather ? 'opacity-50' : ''}`} aria-busy={isLoadingWeather}>
                <div className={`${ROW} min-h-11`}>
                  <span className="opacity-80 text-body">{t('weather.temperature')}</span>
                  <div className="flex items-center gap-2">
                    {/* Item 165: the fallback weather's 20 °C read as a real temperature. */}
                    <span className="font-semibold text-body tabular-nums">{weatherData?.isRealWeather ? formatTemperature(weatherData.temperature, temperatureUnit) : '–'}</span>
                    <div className="flex bg-white/10 rounded-full p-1" role="group" aria-label={t('weather.temperatureUnit')}>
                      {(['C', 'F'] as const).map((unit) => (
                        <button
                          key={unit}
                          onClick={() => onTemperatureUnitChange(unit)}
                          aria-pressed={temperatureUnit === unit}
                          className={`text-caption px-2 py-1 min-w-11 rounded-full transition-colors ${TAP_TARGET} ${FOCUS_RING} ${
                            temperatureUnit === unit
                              ? 'bg-white/20 text-white'
                              : 'text-white opacity-60'
                          }`}
                        >
                          °{unit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={ROW}>
                  <span className="opacity-80 text-body">{t('weather.condition')}</span>
                  <span className="font-semibold text-body text-right">{weatherData ? t(weatherData.conditionKey) : '–'}</span>
                </div>
                {weatherData && !weatherData.isRealWeather && (
                  <div className="text-caption opacity-60 text-brand-peach mt-1">
                    {t('weather.realUnavailable')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Weather Mode Toggle */}
          <div className="mb-4 pt-2 border-t border-white/20">
            <div className="flex items-center justify-between mb-2 min-h-11">
              <h3 className={SECTION_HEADING}>{t('weather.mode')}</h3>
              <div className="flex bg-white/10 rounded-full p-1">
                <button
                  onClick={() => onWeatherModeToggle(true)}
                  className={`text-caption px-2 py-1 min-w-11 rounded-full transition-colors ${TAP_TARGET} ${FOCUS_RING} ${
                    useRealWeather
                      ? 'bg-white/20 text-white'
                      : 'text-white opacity-60'
                  }`}
                >
                  {t('weather.real')}
                </button>
                <button
                  onClick={() => requirePremium(() => onWeatherModeToggle(false))}
                  className={`text-caption px-2 py-1 min-w-11 rounded-full transition-colors ${TAP_TARGET} ${FOCUS_RING} ${
                    !useRealWeather
                      ? 'bg-white/20 text-white'
                      : 'text-white opacity-60'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">{t('weather.manual')}<PremiumBadge /></span>
                </button>
              </div>
            </div>
          </div>

          {/* Live planes (ROADMAP item 96): the live flight radar, Premium in the Play app. */}
          {onLivePlanesToggle && (
            <div className="mb-4 pt-2 border-t border-white/20">
              <div className="flex items-center justify-between gap-2 min-h-11">
                <label htmlFor="live-planes" className={`${SECTION_HEADING} inline-flex items-center gap-1`}>
                  {t('radar.livePlanes')}<PremiumBadge />
                </label>
                {/* Item 164: outside the label, so the switch keeps its name. */}
                {isLiveRadarError && (
                  <>
                    <span className="mr-auto inline-flex"><FeedErrorIcon label={t('radar.unavailable')} /></span>
                    {onLivePlanesRefresh && (
                      <FeedRefreshButton label={t('radar.refresh')} onClick={onLivePlanesRefresh} refreshing={!!liveRadarStatus?.refreshing} />
                    )}
                  </>
                )}
                <Switch
                  className={TAP_TARGET}
                  id="live-planes"
                  checked={isLivePlanesOn}
                  onCheckedChange={on => (on ? requirePremium(() => onLivePlanesToggle(true)) : onLivePlanesToggle(false))}
                />
              </div>
              {/* Item 155: what the radar finds; without the compass the 360° view shows few. */}
              {isLivePlanesOn && liveRadarStatus && (
                <p className={`text-caption mt-1 ${isLiveRadarError ? 'text-red-400' : ''}`} data-testid="live-planes-status">
                  {liveRadarStatus.status === 'ok'
                    ? t('radar.status', { nearby: liveRadarStatus.nearby, shown: liveRadarStatus.shown })
                      + (liveRadarStatus.compassOff && liveRadarStatus.shown < liveRadarStatus.nearby ? ` · ${t('radar.compassAll')}` : '')
                    : t(liveRadarStatus.status === 'error' ? 'radar.unavailable' : 'radar.loading')}
                </p>
              )}
              <p className="text-caption opacity-60 mt-1">{t('radar.hint')}</p>
            </div>
          )}

          {/* Manual Weather Selector - only show when not using real weather */}
          {!useRealWeather && (
            <div className="mb-4 pt-2 border-t border-white/20">
              <h3 className={`${SECTION_HEADING} mb-2`}>{t('weather.manualTitle')}</h3>
              <div className="grid grid-cols-3 gap-1">
                {weatherOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => onWeatherChange(option.type)}
                    className={`flex items-center justify-center p-2 rounded-full text-caption transition-colors ${FOCUS_RING} ${
                      weatherType === option.type
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white opacity-60 hover:opacity-80'
                    }`}
                  >
                    <span className="mr-1">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onManualWindyChange(!manualWindy)}
                aria-pressed={manualWindy}
                className={`mt-1 w-full flex items-center justify-center p-2 rounded-full text-caption transition-colors ${FOCUS_RING} ${
                  manualWindy
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white opacity-60 hover:opacity-80'
                }`}
              >
                <Wind size={16} className="mr-1" />
                {t('weather.strongWind')}
              </button>
            </div>
          )}

          {/* Time information */}
          <div className="space-y-1">
            {/* Item 165: the open date field is wider than the row on a phone in fr/es: the
                controls wrap to a second line, on the right. */}
            <div className={`${ROW} flex-wrap min-h-11`}>
              <div className="flex items-center">
                <Clock size={18} className="mr-2" />
                <span className="text-body inline-flex items-center gap-1 whitespace-nowrap">{isTimePreview ? t('time.preview') : t('time.current')}<PremiumBadge /></span>
              </div>
              <div className="flex items-center gap-3.5 ml-auto">
                <button
                  type="button"
                  onClick={() => requirePremium(() => onTimePlay(-1))}
                  className={`${INLINE_ICON_TOGGLE} ${timePlayDirection === -1 ? 'bg-white/20' : ''}`}
                  aria-label={t('time.playBackward')}
                  aria-pressed={timePlayDirection === -1}
                >
                  <Rewind size={14} />
                </button>
                {timePickerRange ? (
                  <input
                    type="datetime-local"
                    aria-label={t('time.set')}
                    autoFocus
                    value={toDateTimeLocalValue(currentTime, timeZone)}
                    min={toDateTimeLocalValue(timePickerRange.min, timeZone)}
                    max={toDateTimeLocalValue(timePickerRange.max, timeZone)}
                    onChange={(e) => {
                      const target = fromDateTimeLocalValue(e.target.value, timeZone);
                      if (target && !Number.isNaN(target.getTime())) onTimeJump(target);
                    }}
                    onBlur={() => setTimePickerRange(null)}
                    className={`bg-black/30 rounded px-1 text-caption text-white tabular-nums scheme-dark ${FOCUS_RING}`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => requirePremium(() => setTimePickerRange(getTimeTravelRange(new Date())))}
                    className={`font-semibold text-body tabular-nums whitespace-nowrap rounded ${TAP_TARGET} ${FOCUS_RING}`}
                    title={t('time.set')}
                  >
                    {isTimePreview
                      ? formatMoonDate(currentTime, language, timeZone)
                      : currentTime.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone })}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => requirePremium(() => onTimePlay(1))}
                  className={`${INLINE_ICON_TOGGLE} ${timePlayDirection === 1 ? 'bg-white/20' : ''}`}
                  aria-label={t('time.playForward')}
                  aria-pressed={timePlayDirection === 1}
                >
                  <FastForward size={14} />
                </button>
              </div>
            </div>

            <div className={`${ROW} min-h-11`}>
              <div className="flex items-center min-w-0">
                <Sunrise size={18} className="mr-2 shrink-0" />
                <span className="text-body truncate">{t('sun.sunrise')}</span>
                {(terrainStatus !== 'idle' || isLocked) && (
                  <button
                    type="button"
                    onClick={() => requirePremium(() => setIsSunTerrainOpen(!isSunTerrainOpen))}
                    className={`${INLINE_ICON_TOGGLE} relative ml-1`}
                    aria-label={t('terrain.show')}
                    aria-expanded={isSunTerrainOpen}
                  >
                    <Mountain size={14} />
                    <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-body tabular-nums">{polarSunLabel ?? formatLocalTime(shownSunrise)}</span>
                {overHills(terrainSunTimes?.sunrise, shownSunrise)}
              </div>
            </div>

            <div className={`${ROW} min-h-11`}>
              <div className="flex items-center">
                <Sunset size={18} className="mr-2" />
                <span className="text-body">{t('sun.sunset')}</span>
                {onSunsetCountdownToggle && (
                  <button
                    type="button"
                    onClick={onSunsetCountdownToggle}
                    className={`${INLINE_ICON_TOGGLE} ml-1 ${isSunsetCountdownOn ? 'bg-white/20' : ''}`}
                    aria-label={t('sun.countdown')}
                    aria-pressed={isSunsetCountdownOn}
                  >
                    {isSunsetCountdownOn ? <BellRing size={14} /> : <Bell size={14} />}
                  </button>
                )}
                {onSunsetReminderToggle && (
                  <button
                    type="button"
                    onClick={onSunsetReminderToggle}
                    className={`${INLINE_ICON_TOGGLE} ml-[26px] ${isSunsetReminderOn ? 'bg-white/20' : ''}`}
                    aria-label={t('reminder.toggle', { minutes: SUNSET_REMINDER_MIN })}
                    title={t('reminder.toggle', { minutes: SUNSET_REMINDER_MIN })}
                    aria-pressed={isSunsetReminderOn}
                  >
                    {isSunsetReminderOn ? <AlarmClockCheck size={14} /> : <AlarmClock size={14} />}
                  </button>
                )}
                {!polarSunLabel && shownSunset && (
                  <ShareCardButton
                    className={`${INLINE_ICON_TOGGLE} ml-[26px]`}
                    card={{
                      placeName: hasPlaceName ? locationName : null,
                      now: currentTime,
                      flatSunset: shownSunset,
                      terrainSunset: horizonProfile ? terrainSunTimes?.sunset ?? null : undefined,
                      scoreToday: weatherData?.sunsetScoreToday,
                      scoreTomorrow: weatherData?.sunsetScoreTomorrow,
                    }}
                    latitude={location.latitude}
                    longitude={location.longitude}
                    horizonProfile={horizonProfile}
                  />
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-body tabular-nums">{polarSunLabel ?? formatLocalTime(shownSunset)}</span>
                {overHills(terrainSunTimes?.sunset, shownSunset)}
              </div>
            </div>

            {terrainStatus !== 'idle' && isSunTerrainOpen && (
              <LazyPart>
                <LineOfSightDetails
                  idPrefix="sun-terrain"
                  terrainStatus={terrainStatus}
                  eyeHeightMeters={eyeHeightMeters}
                  onEyeHeightChange={onEyeHeightChange}
                  rows={[
                    { label: t('sun.sunrise'), value: formatTerrainDelta('sun', terrainSunTimes?.sunrise ?? null, shownSunrise, language, timeZone) },
                    { label: t('sun.sunset'), value: formatTerrainDelta('sun', terrainSunTimes?.sunset ?? null, shownSunset, language, timeZone) },
                  ]}
                />
              </LazyPart>
            )}

            {/* Sunset score (ROADMAP item 11) */}
            {/* Locked (item 14): only the label with the plus, which opens the purchase. */}
            {/* Item 176: none on a polar day or night: there is no sunset to score. */}
            {weatherData?.sunsetScoreToday && !polarSunLabel && isLocked && (
              <button type="button" onClick={() => requirePremium()} className={`text-caption opacity-80 mt-1 inline-flex items-center gap-1 rounded ${FOCUS_RING}`}>
                {t('score.label')}<PremiumBadge />
              </button>
            )}
            {weatherData?.sunsetScoreToday && !polarSunLabel && !isLocked && (
              <div className="text-caption opacity-80 mt-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1">{t('score.label')}<PremiumBadge /></span>
                  <span className="inline-flex items-center rounded-full bg-brand-peach text-brand-night px-2 py-0.5 font-semibold tabular-nums">
                    {weatherData.sunsetScoreToday.score}/10
                  </span>
                  <span className="opacity-80">· {getScoreReason(weatherData.sunsetScoreToday, language)}</span>
                </div>
                {weatherData.sunsetScoreTomorrow && (
                  <div className="opacity-70 flex items-center gap-2">
                    <span>{t('score.tomorrow')}</span>
                    <span className="inline-flex items-center rounded-full bg-brand-peach text-brand-night px-2 py-0.5 font-semibold tabular-nums">
                      {weatherData.sunsetScoreTomorrow.score}/10
                    </span>
                    <span className="opacity-80">· {getScoreReason(weatherData.sunsetScoreTomorrow, language)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Moon information - collapsible, shown even when the moon is below the horizon */}
          <div className={cardSection(isMoonCollapsed, true)}>
            <div className={cardHeaderRow(isMoonCollapsed)}>
              <h3 className={cardTitle(isMoonCollapsed)}>
                <Moon size={16} className="mr-2" />
                {t('moon.title')}
              </h3>
              <button
                onClick={() => {
                  userToggledMoonRef.current = true;
                  setIsMoonCollapsed(!isMoonCollapsed);
                }}
                className={SECTION_TOGGLE}
                aria-label={isMoonCollapsed ? t('moon.expand') : t('moon.collapse')}
              >
                {isMoonCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>

            <div className={`transition-all duration-300 ease-in-out ${
              isMoonCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-160 opacity-100'
            }`}>
              <div className="space-y-1">
                <div className={ROW}>
                  <span className="text-caption">{t('moon.phase')}</span>
                  <span className="text-caption tabular-nums">{t(getMoonPhaseLabel(moonPosition.phase))}</span>
                </div>
                <div className={ROW}>
                  <span className="text-caption">{t('moon.illumination')}</span>
                  <span className="text-caption tabular-nums">{new Intl.NumberFormat(language, { style: 'percent' }).format(moonPosition.illumination)}</span>
                </div>
                <div className={ROW}>
                  <span className="text-caption">{t('common.altitude')}</span>
                  {/* Item 165: a negative number alone did not tell first users where the moon is. */}
                  <span className="text-caption tabular-nums">
                    {formatNumber(language, moonPosition.altitude, 1)}°{moonPosition.altitude < 0 && ` · ${t('moon.belowHorizon')}`}
                  </span>
                </div>
                <div className={ROW}>
                  <span className="text-caption">{t('common.azimuth')}</span>
                  <span className="text-caption tabular-nums">{formatNumber(language, moonPosition.azimuth, 1)}°</span>
                </div>
                <div className={ROW}>
                  <span className="text-caption flex items-center min-w-0">
                    <span className="truncate">{t('common.labelColon', { label: t('moon.rise') })}</span>
                    {(terrainStatus !== 'idle' || isLocked) && (
                      <button
                        type="button"
                        onClick={() => requirePremium(() => setIsMoonTerrainOpen(!isMoonTerrainOpen))}
                        className={`${INLINE_ICON_TOGGLE} relative ml-1`}
                        aria-label={t('terrain.show')}
                        aria-expanded={isMoonTerrainOpen}
                      >
                        <Mountain size={14} />
                        <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                  <span className="text-caption tabular-nums">
                    {moonTimes.alwaysUp
                      ? t('moon.upAllDay')
                      : moonTimes.alwaysDown
                        ? t('moon.downAllDay')
                        : moonTimes.rise
                          ? formatLocalTime(moonTimes.rise)
                          : '—'}
                  </span>
                </div>
                <div className={ROW}>
                  <span className="text-caption">{t('common.labelColon', { label: t('moon.set') })}</span>
                  <span className="text-caption tabular-nums">
                    {moonTimes.alwaysUp
                      ? t('moon.upAllDay')
                      : moonTimes.alwaysDown
                        ? t('moon.downAllDay')
                        : moonTimes.set
                          ? formatLocalTime(moonTimes.set)
                          : '—'}
                  </span>
                </div>

                {terrainStatus !== 'idle' && isMoonTerrainOpen && (
                  <LazyPart>
                    <LineOfSightDetails
                      idPrefix="moon-terrain"
                      terrainStatus={terrainStatus}
                      eyeHeightMeters={eyeHeightMeters}
                      onEyeHeightChange={onEyeHeightChange}
                      rows={[
                        { label: t('moon.rise'), value: formatTerrainDelta('moon', terrainMoonTimes?.rise ?? null, moonTimes.rise, language, timeZone) },
                        { label: t('moon.set'), value: formatTerrainDelta('moon', terrainMoonTimes?.set ?? null, moonTimes.set, language, timeZone) },
                      ]}
                    />
                  </LazyPart>
                )}

                <div className={ROW}>
                  <span className="text-caption">{t('moon.nextFull')}</span>
                  <span className="text-caption tabular-nums">{formatMoonDate(nextFullMoon, language, timeZone)}</span>
                </div>
                <div className={ROW}>
                  <span className="text-caption">{t('moon.nextNew')}</span>
                  <span className="text-caption tabular-nums">{formatMoonDate(nextNewMoon, language, timeZone)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Golden & blue hour: only the next pair, from the same part of the day
              (ROADMAP item 20). Moved below Moon Information and collapsed by
              default (ROADMAP item 24) - not part of the time-of-day auto-collapse
              effect, so it stays as the user left it. */}
          <div className={cardSection(isGoldenBlueCollapsed)}>
            <div className={cardHeaderRow(isGoldenBlueCollapsed)}>
              <h3 className={cardTitle(isGoldenBlueCollapsed)}>
                {t('golden.title')}
              </h3>
              <button
                onClick={() => setIsGoldenBlueCollapsed(!isGoldenBlueCollapsed)}
                className={SECTION_TOGGLE}
                aria-label={isGoldenBlueCollapsed ? t('golden.expand') : t('golden.collapse')}
                aria-expanded={!isGoldenBlueCollapsed}
              >
                {isGoldenBlueCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>

            <div className={`transition-all duration-300 ease-in-out ${
              isGoldenBlueCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-32 opacity-100'
            }`}>
              {goldenBlueDayPart && (
                <p className="text-caption opacity-70 mb-1">{goldenBlueDayPart}</p>
              )}
              <div className="space-y-1">
                {nextGoldenBlueHours?.part === 'morning' ? (
                  <>
                    <div className={ROW}>
                      <span className="opacity-80 text-caption">{t('golden.blue')}</span>
                      <span className="text-caption tabular-nums">{renderWindow(formatWindow(nextGoldenBlueHours?.blue))}</span>
                    </div>
                    <div className={ROW}>
                      <span className="opacity-80 text-caption">{t('golden.golden')}</span>
                      <span className="text-caption tabular-nums">{renderWindow(formatWindow(nextGoldenBlueHours?.golden))}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={ROW}>
                      <span className="opacity-80 text-caption">{t('golden.golden')}</span>
                      <span className="text-caption tabular-nums">{renderWindow(formatWindow(nextGoldenBlueHours?.golden))}</span>
                    </div>
                    <div className={ROW}>
                      <span className="opacity-80 text-caption">{t('golden.blue')}</span>
                      <span className="text-caption tabular-nums">{renderWindow(formatWindow(nextGoldenBlueHours?.blue))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming twilight times - collapsible */}
          <div className={cardSection(isTwilightCollapsed)}>
            <div className={cardHeaderRow(isTwilightCollapsed)}>
              <h3 className={cardTitle(isTwilightCollapsed)}>
                {relevantTwilightTimes.type === 'dawn' ? t('twilight.dawnTitle') : t('twilight.duskTitle')}
              </h3>
              <button
                onClick={() => {
                  userToggledTwilightRef.current = true;
                  setIsTwilightCollapsed(!isTwilightCollapsed);
                }}
                className={SECTION_TOGGLE}
                aria-label={isTwilightCollapsed ? t('twilight.expand') : t('twilight.collapse')}
              >
                {isTwilightCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>

            <div className={`transition-all duration-300 ease-in-out ${
              isTwilightCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-32 opacity-100'
            }`}>
              <div className="space-y-1">
                {relevantTwilightTimes.type === 'dusk' ? (
                  <>
                    <div className={`${ROW} min-h-11`}>
                      <button
                        type="button"
                        className={`font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left text-caption rounded ${TAP_TARGET} ${FOCUS_RING}`}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setHoveredTwilight('civil')}
                        onPointerLeave={(e) => e.pointerType === 'mouse' && setHoveredTwilight(null)}
                        onFocus={(e) => isKeyboardFocus(e.currentTarget) && setHoveredTwilight('civil')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'civil' ? null : 'civil')}
                        aria-expanded={hoveredTwilight === 'civil'}
                        aria-describedby="twilight-degree-civil"
                        title={t('twilight.degreeHint')}
                      >
                        {t('common.labelColon', { label: t('twilight.civil') })}
                      </button>
                      <span className="text-caption tabular-nums">{formatLocalTime(sunTimes.sunset)} – {formatLocalTime(relevantTwilightTimes.civil)}</span>
                    </div>
                    {hoveredTwilight === 'civil' && (
                      <div id="twilight-degree-civil" className="text-caption opacity-60 ml-2">
                        {getDegreeInfo('civil')}
                      </div>
                    )}
                    <div className={`${ROW} min-h-11`}>
                      <button
                        type="button"
                        className={`font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left text-caption rounded ${TAP_TARGET} ${FOCUS_RING}`}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setHoveredTwilight('nautical')}
                        onPointerLeave={(e) => e.pointerType === 'mouse' && setHoveredTwilight(null)}
                        onFocus={(e) => isKeyboardFocus(e.currentTarget) && setHoveredTwilight('nautical')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'nautical' ? null : 'nautical')}
                        aria-expanded={hoveredTwilight === 'nautical'}
                        aria-describedby="twilight-degree-nautical"
                        title={t('twilight.degreeHint')}
                      >
                        {t('common.labelColon', { label: t('twilight.nautical') })}
                      </button>
                      <span className="text-caption tabular-nums">{formatLocalTime(relevantTwilightTimes.civil)} – {formatLocalTime(relevantTwilightTimes.nautical)}</span>
                    </div>
                    {hoveredTwilight === 'nautical' && (
                      <div id="twilight-degree-nautical" className="text-caption opacity-60 ml-2">
                        {getDegreeInfo('nautical')}
                      </div>
                    )}
                    <div className={`${ROW} min-h-11`}>
                      <button
                        type="button"
                        className={`font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left text-caption rounded ${TAP_TARGET} ${FOCUS_RING}`}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setHoveredTwilight('astronomical')}
                        onPointerLeave={(e) => e.pointerType === 'mouse' && setHoveredTwilight(null)}
                        onFocus={(e) => isKeyboardFocus(e.currentTarget) && setHoveredTwilight('astronomical')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'astronomical' ? null : 'astronomical')}
                        aria-expanded={hoveredTwilight === 'astronomical'}
                        aria-describedby="twilight-degree-astronomical"
                        title={t('twilight.degreeHint')}
                      >
                        {t('common.labelColon', { label: t('twilight.astronomical') })}
                      </button>
                      <span className="text-caption tabular-nums">{formatLocalTime(relevantTwilightTimes.nautical)} – {formatLocalTime(relevantTwilightTimes.astronomical)}</span>
                    </div>
                    {hoveredTwilight === 'astronomical' && (
                      <div id="twilight-degree-astronomical" className="text-caption opacity-60 ml-2">
                        {getDegreeInfo('astronomical')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={`${ROW} min-h-11`}>
                      <button
                        type="button"
                        className={`font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left text-caption rounded ${TAP_TARGET} ${FOCUS_RING}`}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setHoveredTwilight('astronomical')}
                        onPointerLeave={(e) => e.pointerType === 'mouse' && setHoveredTwilight(null)}
                        onFocus={(e) => isKeyboardFocus(e.currentTarget) && setHoveredTwilight('astronomical')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'astronomical' ? null : 'astronomical')}
                        aria-expanded={hoveredTwilight === 'astronomical'}
                        aria-describedby="twilight-degree-astronomical"
                        title={t('twilight.degreeHint')}
                      >
                        {t('common.labelColon', { label: t('twilight.astronomical') })}
                      </button>
                      <span className="text-caption tabular-nums">{formatLocalTime(relevantTwilightTimes.astronomical)} – {formatLocalTime(relevantTwilightTimes.nautical)}</span>
                    </div>
                    {hoveredTwilight === 'astronomical' && (
                      <div id="twilight-degree-astronomical" className="text-caption opacity-60 ml-2">
                        {getDegreeInfo('astronomical')}
                      </div>
                    )}
                    <div className={`${ROW} min-h-11`}>
                      <button
                        type="button"
                        className={`font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left text-caption rounded ${TAP_TARGET} ${FOCUS_RING}`}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setHoveredTwilight('nautical')}
                        onPointerLeave={(e) => e.pointerType === 'mouse' && setHoveredTwilight(null)}
                        onFocus={(e) => isKeyboardFocus(e.currentTarget) && setHoveredTwilight('nautical')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'nautical' ? null : 'nautical')}
                        aria-expanded={hoveredTwilight === 'nautical'}
                        aria-describedby="twilight-degree-nautical"
                        title={t('twilight.degreeHint')}
                      >
                        {t('common.labelColon', { label: t('twilight.nautical') })}
                      </button>
                      <span className="text-caption tabular-nums">{formatLocalTime(relevantTwilightTimes.nautical)} – {formatLocalTime(relevantTwilightTimes.civil)}</span>
                    </div>
                    {hoveredTwilight === 'nautical' && (
                      <div id="twilight-degree-nautical" className="text-caption opacity-60 ml-2">
                        {getDegreeInfo('nautical')}
                      </div>
                    )}
                    <div className={`${ROW} min-h-11`}>
                      <button
                        type="button"
                        className={`font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left text-caption rounded ${TAP_TARGET} ${FOCUS_RING}`}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && setHoveredTwilight('civil')}
                        onPointerLeave={(e) => e.pointerType === 'mouse' && setHoveredTwilight(null)}
                        onFocus={(e) => isKeyboardFocus(e.currentTarget) && setHoveredTwilight('civil')}
                        onBlur={() => setHoveredTwilight(null)}
                        onClick={() => setHoveredTwilight(hoveredTwilight === 'civil' ? null : 'civil')}
                        aria-expanded={hoveredTwilight === 'civil'}
                        aria-describedby="twilight-degree-civil"
                        title={t('twilight.degreeHint')}
                      >
                        {t('common.labelColon', { label: t('twilight.civil') })}
                      </button>
                      <span className="text-caption tabular-nums">{formatLocalTime(relevantTwilightTimes.civil)} – {formatLocalTime(sunTimes.sunrise)}</span>
                    </div>
                    {hoveredTwilight === 'civil' && (
                      <div id="twilight-degree-civil" className="text-caption opacity-60 ml-2">
                        {getDegreeInfo('civil')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sun position - collapsible */}
          <div className={cardSection(isSunPositionCollapsed)}>
            <div className={cardHeaderRow(isSunPositionCollapsed)}>
              <h3 className={cardTitle(isSunPositionCollapsed)}>{t('sunPosition.title')}</h3>
              <button
                onClick={() => {
                  userToggledSunPositionRef.current = true;
                  setIsSunPositionCollapsed(!isSunPositionCollapsed);
                }}
                className={SECTION_TOGGLE}
                aria-label={isSunPositionCollapsed ? t('sunPosition.expand') : t('sunPosition.collapse')}
              >
                {isSunPositionCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>

            <div className={`transition-all duration-300 ease-in-out ${
              isSunPositionCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-16 opacity-100'
            }`}>
              <div className="grid grid-cols-2 gap-1 text-caption">
                <div>
                  <span>{t('common.altitude')} </span>
                  <span className="tabular-nums">{formatNumber(language, sunPosition.altitude, 2)}°</span>
                </div>
                <div>
                  <span>{t('common.azimuth')} </span>
                  <span className="tabular-nums">{formatNumber(language, sunPosition.azimuth, 2)}°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Satellite tracking (ROADMAP item 97): Premium in the Play app. The ISS passes
              toggle sits next to the switch (item 154) and works with the tracking off. */}
          {onSatelliteTrackingToggle && (
            // Lookbook round 2: less space after the card list, and a heading like Live planes.
            <div className="mt-2 pt-2 border-t border-white/20">
              <div className="flex items-center justify-between gap-2 min-h-11" title={t('satellite.trackingHint')}>
                <span className={`${SECTION_HEADING} gap-1`}>
                  <Satellite size={16} className="mr-1" />
                  {t('satellite.tracking')}
                  <PremiumBadge />
                </span>
                {/* Item 164: outside the span, so its opacity does not dim the red. */}
                {isSatelliteError && <FeedErrorIcon label={t('satellite.unavailable')} />}
                {onIssReminderToggle && (
                  <button
                    type="button"
                    onClick={() => requirePremium(onIssReminderToggle)}
                    className={`${INLINE_ICON_TOGGLE} relative ml-auto mr-1.5 ${isIssReminderOn ? 'bg-white/20' : ''}`}
                    aria-label={t('issReminder.label')}
                    title={t('issReminder.toggle', { minutes: PASS_REMINDER_MIN })}
                    aria-pressed={isIssReminderOn}
                  >
                    <Satellite size={14} />
                    <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />
                  </button>
                )}
                {isSatelliteError && onSatelliteRefresh && (
                  <FeedRefreshButton
                    label={t('satellite.refresh')}
                    onClick={onSatelliteRefresh}
                    refreshing={!!satelliteStatus?.refreshing}
                    disabled={satelliteStatus?.nextTryAt != null}
                    className={onIssReminderToggle ? '' : 'ml-auto'}
                  />
                )}
                <Switch
                  className={TAP_TARGET}
                  checked={isSatelliteTrackingOn}
                  onCheckedChange={() => requirePremium(onSatelliteTrackingToggle)}
                  aria-label={t('satellite.tracking')}
                />
              </div>
              {/* Item 164 (R-a): CelesTrak blocks a client that asks again after an error, so the
                  refresh waits for the cache's next try. */}
              {isSatelliteError && (
                <p className="text-caption text-red-400 mt-1" data-testid="satellite-status">
                  {t('satellite.unavailable')}
                  {satelliteStatus?.nextTryAt != null && ` · ${t('satellite.nextTry', { time: formatLocalTime(new Date(satelliteStatus.nextTryAt)) })}`}
                </p>
              )}
            </div>
          )}

          {/* Collection badges (ROADMAP item 112) */}
          {onCollectionOpen && (
            <div className="mt-2 pt-2 border-t border-white/20">
              {/* Lookbook round 2: a heading row; the whole row opens the collection. */}
              <button
                onClick={() => { setIsCollapsed(true); onCollectionOpen?.(); }}
                className={`${SECTION_HEADING} gap-2 w-full min-h-11 hover:opacity-80 transition-opacity rounded ${FOCUS_RING}`}
              >
                <Award size={16} />
                {t('collection.title')}
              </button>
            </div>
          )}

          {/* Language (ROADMAP item 67): the same segmented style as the °C/°F toggle. */}
          {/* Lookbook round 2: a heading, and the buttons on a second line. */}
          <div className="mt-2 pt-2 border-t border-white/20">
            <h3 className={`${SECTION_HEADING} min-h-11`}>{t('language.label')}</h3>
            <div className="flex w-fit bg-white/10 rounded-full p-1" role="group" aria-label={t('language.label')}>
              {LANGUAGES.map((code) => (
                <button
                  key={code}
                  lang={code}
                  onClick={() => setLanguage(code)}
                  aria-pressed={language === code}
                  aria-label={LANGUAGE_NAMES[code]}
                  title={LANGUAGE_NAMES[code]}
                  className={`text-caption px-2 py-1 min-w-11 rounded-full uppercase transition-colors ${TAP_TARGET} ${FOCUS_RING} ${
                    language === code
                      ? 'bg-white/20 text-white'
                      : 'text-white opacity-60'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* Anonymous feedback (ROADMAP item 21): only when Sentry is set up */}
          {isFeedbackAvailable() && (
            <div className="mt-6 pt-4 border-t border-white/20">
              <button
                onClick={() => openFeedbackForm(t)}
                className={`flex items-center gap-2 text-caption opacity-80 hover:opacity-100 transition-opacity rounded ${TAP_TARGET} ${FOCUS_RING}`}
              >
                <MessageSquare size={14} />
                {t('feedback.send')}
              </button>
            </div>
          )}

          {/* Data sources and the privacy page (ROADMAP item 153) */}
          <div className="mt-6 pt-4 border-t border-white/20">
            <button
              onClick={() => setIsDataSourcesOpen(true)}
              className={`flex items-center gap-2 text-caption opacity-80 hover:opacity-100 transition-opacity rounded ${TAP_TARGET} ${FOCUS_RING}`}
              aria-haspopup="dialog"
            >
              <Database size={14} />
              {t('dataSources.title')}
            </button>
            {isDataSourcesOpen && <LazyPart><DataSourcesDialog onClose={closeDataSources} /></LazyPart>}
          </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default InfoPanel;
