import { TAP_TARGET } from '@/utils/glassChrome';
import React, { lazy } from 'react';
import LazyPart from './LazyPart';
import { ROW, ICON_TOGGLE, ICON_TOGGLE_BASE, FOCUS_RING, formatTerrainDelta, type InfoPanelProps } from './InfoPanel';
import { Clock, Sunrise, Sunset, ChevronDown, ChevronUp, Wind, Moon, RefreshCw, Thermometer, MessageSquare, Mountain, Rewind, FastForward, Bell, BellRing, AlarmClock, AlarmClockCheck, Satellite, Award, Database, CircleAlert } from 'lucide-react';
import { isFeedbackAvailable, openFeedbackForm } from '@/utils/feedback';
// The dialogs, the line of sight details and the place search load when they open (ROADMAP item 174).
const DataSourcesDialog = lazy(() => import('./DataSourcesDialog'));
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
const LineOfSightDetails = lazy(() => import('./LineOfSightDetails'));
import PremiumBadge from './PremiumBadge';
import { usePremiumGate } from '@/hooks/usePremium';
import ShareCardButton from '@/components/ShareCardButton';
import {
  type SunTimes,
  type TimeWindow,
  formatTime,
  getRelevantTwilightTimes
} from '../utils/sunUtils';
import { getMoonPhaseLabel } from '../utils/moonUtils';
import { getScoreReason } from '../utils/weatherUtils';
import { type WeatherType } from './CloudLayer';
import { fromDateTimeLocalValue, getTimeTravelRange, toDateTimeLocalValue } from '@/utils/timeTravel';
import { formatTemperature} from '@/utils/temperatureUnit';
import { SUNSET_REMINDER_MIN } from '@/utils/sunsetReminder';
import { PASS_REMINDER_MIN } from '@/utils/satelliteUtils';
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '@/utils/language';
import { formatNumber} from '@/i18n';
import { useLanguage } from '@/hooks/useLanguage';

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

// Item 165: a card's toggle stretches over its header row (the row is `relative`), so a tap
// on the title opens the card too, not only the chevron. Item 173: the row is at least 44 px high.
const SECTION_TOGGLE = `${ICON_TOGGLE_BASE} after:absolute after:inset-0`;

// A compact variant of ICON_TOGGLE for the inline "line of sight" buttons (ROADMAP
// item 30), which sit inside an already-tight row and must not push it past one
// line at 360px.
const INLINE_ICON_TOGGLE = `p-0.5 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 shrink-0 ${TAP_TARGET}`;


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



export interface InfoPanelBodyProps
  extends Required<Pick<InfoPanelProps,
    | 'temperatureUnit' | 'onTemperatureUnitChange' | 'manualWindy' | 'onManualWindyChange' | 'terrainStatus'
    | 'terrainSunTimes' | 'terrainMoonTimes' | 'eyeHeightMeters' | 'onEyeHeightChange' | 'isTimePreview'
    | 'timePlayDirection' | 'onTimePlay' | 'onTimeJump' | 'isSunsetCountdownOn' | 'horizonProfile'
    | 'isSunsetReminderOn' | 'isSatelliteTrackingOn' | 'isIssReminderOn' | 'isLivePlanesOn' | 'liveRadarStatus'
    | 'satelliteStatus'>>,
    Pick<InfoPanelProps,
    | 'location' | 'sunPosition' | 'moonPosition' | 'moonTimes' | 'nextFullMoon' | 'nextNewMoon' | 'nextGoldenBlueHours'
    | 'currentTime' | 'weatherType' | 'weatherData' | 'isLoadingWeather' | 'useRealWeather' | 'onWeatherChange'
    | 'onWeatherModeToggle' | 'onWeatherRefresh' | 'onSunsetCountdownToggle' | 'onSunsetReminderToggle'
    | 'onSatelliteTrackingToggle' | 'onIssReminderToggle' | 'onLivePlanesToggle' | 'onLivePlanesRefresh'
    | 'onSatelliteRefresh' | 'onCollectionOpen'> {
  sunTimes: SunTimes;
  // What the panel works out for its header too; the body takes it as it is.
  placeName: string | null;
  polarSunLabel: string | null;
  shownSunrise: Date | null;
  shownSunset: Date | null;
  overHills: (terrain: Date | null | undefined, flat: Date | null) => React.ReactNode;
  formatWindow: (window: TimeWindow | null | undefined) => { text: string; isNow: boolean };
  goldenBlueDayPart: string | null;
  weatherOptions: { type: WeatherType; label: string; icon: React.ReactNode }[];
  getDegreeInfo: (twilightType: string) => string;
  relevantTwilightTimes: ReturnType<typeof getRelevantTwilightTimes>;
  isLiveRadarError: boolean;
  isSatelliteError: boolean;
  // The open and closed state of the cards stays in the panel, so it survives a close.
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMoonCollapsed: boolean; setIsMoonCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isTwilightCollapsed: boolean; setIsTwilightCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isSunPositionCollapsed: boolean; setIsSunPositionCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isGoldenBlueCollapsed: boolean; setIsGoldenBlueCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isSunTerrainOpen: boolean; setIsSunTerrainOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMoonTerrainOpen: boolean; setIsMoonTerrainOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDataSourcesOpen: boolean; setIsDataSourcesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeDataSources: () => void;
  hoveredTwilight: string | null; setHoveredTwilight: React.Dispatch<React.SetStateAction<string | null>>;
  timePickerRange: { min: Date; max: Date } | null;
  setTimePickerRange: React.Dispatch<React.SetStateAction<{ min: Date; max: Date } | null>>;
  userToggledMoonRef: React.MutableRefObject<boolean>;
  userToggledTwilightRef: React.MutableRefObject<boolean>;
  userToggledSunPositionRef: React.MutableRefObject<boolean>;
}

// Everything below the panel's header (item 174): its own chunk, so the closed panel and the
// header stay in the first bundle. InfoPanel owns the state; this only draws it.
const InfoPanelBody: React.FC<InfoPanelBodyProps> = ({
  location, temperatureUnit, onTemperatureUnitChange, manualWindy, onManualWindyChange, terrainStatus, terrainSunTimes, terrainMoonTimes, eyeHeightMeters, onEyeHeightChange, isTimePreview, timePlayDirection, onTimePlay, onTimeJump, isSunsetCountdownOn, horizonProfile, isSunsetReminderOn, isSatelliteTrackingOn, isIssReminderOn, isLivePlanesOn, liveRadarStatus, satelliteStatus, sunPosition, moonPosition, moonTimes, nextFullMoon, nextNewMoon, nextGoldenBlueHours, currentTime, weatherType, weatherData, isLoadingWeather, useRealWeather, onWeatherChange, onWeatherModeToggle, onWeatherRefresh, onSunsetCountdownToggle, onSunsetReminderToggle, onSatelliteTrackingToggle, onIssReminderToggle, onLivePlanesToggle, onLivePlanesRefresh, onSatelliteRefresh, onCollectionOpen, sunTimes, placeName, polarSunLabel, shownSunrise, shownSunset, overHills, formatWindow, goldenBlueDayPart, weatherOptions, getDegreeInfo, relevantTwilightTimes, isLiveRadarError, isSatelliteError, setIsCollapsed, isMoonCollapsed, setIsMoonCollapsed, isTwilightCollapsed, setIsTwilightCollapsed, isSunPositionCollapsed, setIsSunPositionCollapsed, isGoldenBlueCollapsed, setIsGoldenBlueCollapsed, isSunTerrainOpen, setIsSunTerrainOpen, isMoonTerrainOpen, setIsMoonTerrainOpen, isDataSourcesOpen, setIsDataSourcesOpen, closeDataSources, hoveredTwilight, setHoveredTwilight, timePickerRange, setTimePickerRange, userToggledMoonRef, userToggledTwilightRef, userToggledSunPositionRef
}) => {
  const { t, language, setLanguage, timeZone } = useLanguage();
  const { isLocked, requirePremium } = usePremiumGate();
  const formatLocalTime = (date: Date | null) => formatTime(date, language, timeZone);
  return (
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
                placeName: placeName,
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
  );
};

export default InfoPanelBody;
