
import { type WeatherType } from '../components/CloudLayer';
import { translate, type MessageKey } from '@/i18n';
import { type Language } from '@/utils/language';
import { getPrecipitationMmH } from './rainUtils';
import { type CloudLayers } from './skyCloudUtils';

export interface WeatherData {
  temperature: number;
  weatherType: WeatherType;
  // The dictionary key of the condition text (ROADMAP item 67), e.g. 'condition.clearSky'.
  conditionKey: MessageKey;
  lastUpdated: Date;
  isRealWeather: boolean;
  // Sunset score (ROADMAP item 11) for today's and tomorrow's sunset. Null when
  // no sunset time was supplied to fetchCurrentWeather, or the API's hourly
  // data didn't cover it.
  sunsetScoreToday: SunsetScoreResult | null;
  sunsetScoreTomorrow: SunsetScoreResult | null;
  // Cloud/wind (ROADMAP item 10), for the cloud layer's count/opacity/drift. Null
  // when the API's `current` block didn't include them (e.g. an older cache entry,
  // or the fallback weather on a fetch error).
  cloudCoverPercent: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  // The rain amount in mm/h (ROADMAP item 77, X1); from the weather code when the
  // measured amount is 0 or missing. Null without rain or in an older cache entry.
  precipitationMmH: number | null;
  // The cover per layer in the hour nearest the fetch (ROADMAP item 84, C1), for the
  // cloud types. Null without hourly data or in an older cache entry.
  cloudLayers: CloudLayers | null;
}

interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
    time: string;
  };
  // Open-Meteo's newer `current` block (ROADMAP item 10) - requested alongside the
  // legacy `current_weather` block above, which has no cloud_cover field.
  current?: {
    cloud_cover: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    precipitation?: number; // mm over `interval` seconds
    interval?: number;
  };
  hourly?: {
    time: string[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
  };
}

// Cache interface
interface WeatherCache {
  data: WeatherData;
  timestamp: number;
  latitude: number;
  longitude: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const CACHE_KEY = 'weather_cache';

// Map every Open-Meteo WMO weather code to exactly one WeatherType (ROADMAP item 10).
// WMO has no plain "hail" code (96/99 are thunderstorm *with* hail) - the lightning is
// the more safety-relevant fact, so those stay 'storm'; 'hail' is reachable via manual
// weather mode only. See tests/utils.weatherUtils.test.ts for full code coverage.
export const WMO_CODE_MAP: Record<number, { type: WeatherType; conditionKey: MessageKey }> = {
  0: { type: 'clear', conditionKey: 'condition.clearSky' },
  1: { type: 'partly', conditionKey: 'condition.mainlyClear' },
  2: { type: 'cloudy', conditionKey: 'condition.partlyCloudy' },
  3: { type: 'overcast', conditionKey: 'condition.overcast' },
  45: { type: 'fog', conditionKey: 'condition.fog' },
  48: { type: 'fog', conditionKey: 'condition.rimeFog' },
  51: { type: 'drizzle', conditionKey: 'condition.lightDrizzle' },
  53: { type: 'drizzle', conditionKey: 'condition.moderateDrizzle' },
  55: { type: 'drizzle', conditionKey: 'condition.denseDrizzle' },
  56: { type: 'drizzle', conditionKey: 'condition.lightFreezingDrizzle' },
  57: { type: 'drizzle', conditionKey: 'condition.denseFreezingDrizzle' },
  61: { type: 'rain', conditionKey: 'condition.slightRain' },
  63: { type: 'rain', conditionKey: 'condition.moderateRain' },
  65: { type: 'rain', conditionKey: 'condition.heavyRain' },
  66: { type: 'rain', conditionKey: 'condition.lightFreezingRain' },
  67: { type: 'rain', conditionKey: 'condition.heavyFreezingRain' },
  71: { type: 'snow', conditionKey: 'condition.slightSnow' },
  73: { type: 'snow', conditionKey: 'condition.moderateSnow' },
  75: { type: 'snow', conditionKey: 'condition.heavySnow' },
  77: { type: 'snow', conditionKey: 'condition.snowGrains' },
  80: { type: 'rain', conditionKey: 'condition.slightRainShowers' },
  81: { type: 'rain', conditionKey: 'condition.moderateRainShowers' },
  82: { type: 'rain', conditionKey: 'condition.violentRainShowers' },
  85: { type: 'snow', conditionKey: 'condition.slightSnowShowers' },
  86: { type: 'snow', conditionKey: 'condition.heavySnowShowers' },
  95: { type: 'storm', conditionKey: 'condition.thunderstorm' },
  96: { type: 'storm', conditionKey: 'condition.thunderstormSlightHail' },
  99: { type: 'storm', conditionKey: 'condition.thunderstormHeavyHail' },
};

const mapWeatherCode = (code: number): { type: WeatherType; conditionKey: MessageKey } =>
  WMO_CODE_MAP[code] ?? { type: 'clear', conditionKey: 'condition.unknown' };

export interface SunsetScoreInput {
  low: number; // cloud cover %, 0-100
  mid: number;
  high: number;
  visibility: number; // meters
}

export interface SunsetScoreResult {
  score: number; // 0-10, integer
  // Dictionary keys of the reason (ROADMAP item 67), see getScoreReason.
  clouds: MessageKey;
  horizon: MessageKey;
}

// Tuning constants for getSunsetScore, below.
const SCORE_BASELINE = 5; // a cloudless sky is a plain gradient, not spectacular
const CLOUD_SWEET_SPOT_MIN = 30; // % cover where clouds start catching light well
const CLOUD_SWEET_SPOT_MAX = 70; // % cover where clouds start blocking too much light
const HIGH_CLOUD_WEIGHT = 2.5; // max points added by high clouds in the sweet spot
const MID_CLOUD_WEIGHT = 2.5; // max points added by mid clouds in the sweet spot
const LOW_CLOUD_WEIGHT = 5; // max points subtracted by low cloud cover
const VISIBILITY_WEIGHT = 5; // max points subtracted by poor visibility
const VISIBILITY_FULL_PENALTY_M = 1000; // at/below this, full visibility penalty (fog)
const VISIBILITY_NO_PENALTY_M = 10000; // at/above this, no visibility penalty

// 0 at 0% and 100% cover, ramping up to 1 across the sweet spot (30-70%): clouds
// need to cover enough sky to catch color, but full overcast blocks the light.
const cloudContribution = (coverPercent: number): number => {
  if (coverPercent <= 0 || coverPercent >= 100) return 0;
  if (coverPercent >= CLOUD_SWEET_SPOT_MIN && coverPercent <= CLOUD_SWEET_SPOT_MAX) return 1;
  if (coverPercent < CLOUD_SWEET_SPOT_MIN) return coverPercent / CLOUD_SWEET_SPOT_MIN;
  return (100 - coverPercent) / (100 - CLOUD_SWEET_SPOT_MAX);
};

// Low clouds sit on the horizon and can hide the sun before it reaches the
// skyline, so every % of low cover subtracts linearly.
const lowCloudPenalty = (lowPercent: number): number =>
  LOW_CLOUD_WEIGHT * (Math.min(100, Math.max(0, lowPercent)) / 100);

// Fog/haze scatters and washes out color at the horizon. No penalty above 10km
// visibility, full penalty at or below 1km, linear in between.
const visibilityPenalty = (visibilityMeters: number): number => {
  if (visibilityMeters >= VISIBILITY_NO_PENALTY_M) return 0;
  if (visibilityMeters <= VISIBILITY_FULL_PENALTY_M) return VISIBILITY_WEIGHT;
  const t =
    (VISIBILITY_NO_PENALTY_M - visibilityMeters) /
    (VISIBILITY_NO_PENALTY_M - VISIBILITY_FULL_PENALTY_M);
  return VISIBILITY_WEIGHT * t;
};

const describeClouds = (mid: number, high: number): MessageKey => {
  const isHigh = cloudContribution(high) > 0.3;
  const isMid = cloudContribution(mid) > 0.3;
  if (isHigh && isMid) return 'score.cloudsHighMid';
  if (isHigh) return 'score.cloudsHigh';
  if (isMid) return 'score.cloudsMid';
  return high < 10 && mid < 10 ? 'score.cloudsNone' : 'score.cloudsThin';
};

const describeHorizon = (low: number, visibility: number): MessageKey => {
  if (visibility <= VISIBILITY_FULL_PENALTY_M) return 'score.horizonFog';
  if (low >= 60) return 'score.horizonClouded';
  if (low >= 25 || visibility < VISIBILITY_NO_PENALTY_M) return 'score.horizonHazy';
  return 'score.horizonClear';
};

// "high clouds, clear horizon" in the UI language.
export const getScoreReason = (score: SunsetScoreResult, language: Language): string =>
  translate(language, 'score.reason', {
    clouds: translate(language, score.clouds),
    horizon: translate(language, score.horizon),
  });

/**
 * Scores how photogenic a sunset is likely to be (0-10) from cloud cover at
 * three altitude bands plus horizontal visibility.
 *
 * Formula:
 * - Start at a baseline of 5/10 - a cloudless sky is an ordinary gradient.
 * - High and mid clouds each add up to 2.5 points. They contribute most (a
 *   factor of 1) when covering 30-70% of the sky - a "broken" pattern that
 *   catches the low sun's light without blocking it - ramping down to 0 at
 *   0% or 100% cover.
 * - Low clouds subtract up to 5 points, linearly with their cover: they sit
 *   on the horizon and can hide the sun before it even sets.
 * - Poor visibility (fog/haze) subtracts up to 5 points: none above 10km,
 *   the full 5 at or below 1km, linear in between.
 * The result is clamped to [0, 10] and rounded to the nearest integer.
 */
export const getSunsetScore = ({ low, mid, high, visibility }: SunsetScoreInput): SunsetScoreResult => {
  const raw =
    SCORE_BASELINE +
    cloudContribution(high) * HIGH_CLOUD_WEIGHT +
    cloudContribution(mid) * MID_CLOUD_WEIGHT -
    lowCloudPenalty(low) -
    visibilityPenalty(visibility);

  return {
    score: Math.round(Math.min(10, Math.max(0, raw))),
    clouds: describeClouds(mid, high),
    horizon: describeHorizon(low, visibility),
  };
};

// Open-Meteo's hourly `time` strings are requested in UTC (see `timezone=UTC`
// below) and omit seconds, e.g. "2024-06-01T18:00" - append the offset SunCalc
// dates already carry so both can be compared as absolute instants.
const parseHourlyTime = (isoMinuteUtc: string): Date | null => {
  const parsed = new Date(`${isoMinuteUtc}:00Z`);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const findNearestHourlySample = (
  hourly: NonNullable<OpenMeteoResponse['hourly']>,
  target: Date
): SunsetScoreInput | null => {
  let bestIndex = -1;
  let bestDiffMs = Infinity;

  for (let i = 0; i < hourly.time.length; i++) {
    const t = parseHourlyTime(hourly.time[i]);
    if (!t) continue;
    const diffMs = Math.abs(t.getTime() - target.getTime());
    if (diffMs < bestDiffMs) {
      bestDiffMs = diffMs;
      bestIndex = i;
    }
  }

  if (bestIndex === -1) return null;

  return {
    low: hourly.cloud_cover_low[bestIndex],
    mid: hourly.cloud_cover_mid[bestIndex],
    high: hourly.cloud_cover_high[bestIndex],
    visibility: hourly.visibility[bestIndex]
  };
};

// The cloud layers now (ROADMAP item 84): the hourly sample nearest `now`.
const cloudLayersAt = (hourly: OpenMeteoResponse['hourly'], now: Date): CloudLayers | null => {
  if (!hourly) return null;
  const sample = findNearestHourlySample(hourly, now);
  if (!sample || ![sample.low, sample.mid, sample.high].every(Number.isFinite)) return null;
  return { low: sample.low, mid: sample.mid, high: sample.high };
};

const scoreSunsetAt = (
  hourly: OpenMeteoResponse['hourly'],
  sunset: Date | null | undefined
): SunsetScoreResult | null => {
  if (!hourly || !sunset || isNaN(sunset.getTime())) return null;
  const sample = findNearestHourlySample(hourly, sunset);
  return sample ? getSunsetScore(sample) : null;
};

// Check if cached data is still valid
const getCachedWeather = (latitude: number, longitude: number): WeatherData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData: WeatherCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    // A future timestamp (device clock set back) must not keep the entry fresh.
    if (now < cacheData.timestamp || now - cacheData.timestamp > CACHE_DURATION) return null;
    
    // Check if location has changed significantly (more than ~1km)
    const latDiff = Math.abs(cacheData.latitude - latitude);
    const lonDiff = Math.abs(cacheData.longitude - longitude);
    if (latDiff > 0.01 || lonDiff > 0.01) return null;

    // An entry from before ROADMAP item 67 has English texts instead of keys.
    if (!cacheData.data.conditionKey) return null;
    
    // Convert lastUpdated back to Date object. Also normalize the sunset score and
    // cloud/wind fields: a cache entry written before ROADMAP item 11/10 won't have
    // them.
    return {
      ...cacheData.data,
      lastUpdated: new Date(cacheData.data.lastUpdated),
      sunsetScoreToday: cacheData.data.sunsetScoreToday ?? null,
      sunsetScoreTomorrow: cacheData.data.sunsetScoreTomorrow ?? null,
      cloudCoverPercent: cacheData.data.cloudCoverPercent ?? null,
      windSpeedKmh: cacheData.data.windSpeedKmh ?? null,
      windDirectionDeg: cacheData.data.windDirectionDeg ?? null,
      precipitationMmH: cacheData.data.precipitationMmH ?? null,
      cloudLayers: cacheData.data.cloudLayers ?? null
    };
  } catch (error) {
    console.error('Error reading weather cache:', error);
    return null;
  }
};

// Cache weather data
const cacheWeather = (data: WeatherData, latitude: number, longitude: number): void => {
  try {
    const cacheData: WeatherCache = {
      data,
      timestamp: Date.now(),
      latitude,
      longitude
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching weather data:', error);
  }
};

export const fetchCurrentWeather = async (
  latitude: number,
  longitude: number,
  // Today's and tomorrow's sunset (ROADMAP item 11), used to pick the hourly
  // cloud cover / visibility sample nearest each sunset for the sunset score.
  // Optional so existing callers/tests without sunset times still work.
  sunsetToday?: Date | null,
  sunsetTomorrow?: Date | null
): Promise<WeatherData> => {
  // Check cache first
  const cachedWeather = getCachedWeather(latitude, longitude);
  if (cachedWeather) {
    return cachedWeather;
  }

  try {
    // Round to ~1km precision before sending the location to a third party. The
    // cache above still keys off the unrounded coordinates passed in, so its
    // "location changed" check is unaffected.
    const roundedLatitude = Math.round(latitude * 100) / 100;
    const roundedLongitude = Math.round(longitude * 100) / 100;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${roundedLatitude}&longitude=${roundedLongitude}` +
      `&current_weather=true` +
      `&current=cloud_cover,wind_speed_10m,wind_direction_10m,precipitation` +
      `&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility` +
      `&timezone=UTC&forecast_days=2`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();

    const weatherMapping = mapWeatherCode(data.current_weather.weathercode);

    const weatherData: WeatherData = {
      temperature: Math.round(data.current_weather.temperature),
      weatherType: weatherMapping.type,
      conditionKey: weatherMapping.conditionKey,
      lastUpdated: new Date(),
      isRealWeather: true,
      sunsetScoreToday: scoreSunsetAt(data.hourly, sunsetToday),
      sunsetScoreTomorrow: scoreSunsetAt(data.hourly, sunsetTomorrow),
      cloudCoverPercent: data.current?.cloud_cover ?? null,
      windSpeedKmh: data.current?.wind_speed_10m ?? null,
      windDirectionDeg: data.current?.wind_direction_10m ?? null,
      precipitationMmH: getPrecipitationMmH(data.current?.precipitation, data.current?.interval, data.current_weather.weathercode),
      cloudLayers: cloudLayersAt(data.hourly, new Date())
    };

    // Cache the result
    cacheWeather(weatherData, latitude, longitude);

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);

    // Return fallback weather data
    return {
      temperature: 20,
      weatherType: 'clear',
      conditionKey: 'condition.unavailable',
      lastUpdated: new Date(),
      isRealWeather: false,
      sunsetScoreToday: null,
      sunsetScoreTomorrow: null,
      cloudCoverPercent: null,
      windSpeedKmh: null,
      windDirectionDeg: null,
      precipitationMmH: null,
      cloudLayers: null
    };
  }
};

export const clearWeatherCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing weather cache:', error);
  }
};
