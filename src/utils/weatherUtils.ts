
import { type WeatherType } from '../components/CloudLayer';

export interface WeatherData {
  temperature: number;
  weatherType: WeatherType;
  weatherDescription: string;
  lastUpdated: Date;
  isRealWeather: boolean;
}

interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
    time: string;
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

// Map Open-Meteo weather codes to our WeatherType
const mapWeatherCode = (code: number): { type: WeatherType; description: string } => {
  if (code === 0) return { type: 'clear', description: 'Clear sky' };
  if (code <= 3) {
    if (code === 1) return { type: 'cloudy', description: 'Mainly clear' };
    if (code === 2) return { type: 'cloudy', description: 'Partly cloudy' };
    return { type: 'overcast', description: 'Overcast' };
  }
  if (code <= 48) return { type: 'overcast', description: 'Foggy' };
  if (code <= 55) return { type: 'rain', description: 'Drizzle' };
  if (code <= 65) return { type: 'rain', description: 'Rain' };
  if (code <= 77) return { type: 'snow', description: 'Snow' };
  if (code <= 82) return { type: 'rain', description: 'Rain showers' };
  if (code <= 86) return { type: 'snow', description: 'Snow showers' };
  if (code <= 99) return { type: 'storm', description: 'Thunderstorm' };
  
  return { type: 'clear', description: 'Unknown' };
};

// Check if cached data is still valid
const getCachedWeather = (latitude: number, longitude: number): WeatherData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData: WeatherCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - cacheData.timestamp > CACHE_DURATION) return null;
    
    // Check if location has changed significantly (more than ~1km)
    const latDiff = Math.abs(cacheData.latitude - latitude);
    const lonDiff = Math.abs(cacheData.longitude - longitude);
    if (latDiff > 0.01 || lonDiff > 0.01) return null;
    
    // Convert lastUpdated back to Date object
    return {
      ...cacheData.data,
      lastUpdated: new Date(cacheData.data.lastUpdated)
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

export const fetchCurrentWeather = async (latitude: number, longitude: number): Promise<WeatherData> => {
  console.log(`[Weather Debug] Fetching weather for lat: ${latitude}, lon: ${longitude}`);
  
  // Check cache first
  const cachedWeather = getCachedWeather(latitude, longitude);
  if (cachedWeather) {
    console.log('[Weather Debug] Using cached weather data');
    return cachedWeather;
  }
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    console.log('[Weather Debug] Fetching from API:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data: OpenMeteoResponse = await response.json();
    console.log('[Weather Debug] API response:', data);
    
    const weatherMapping = mapWeatherCode(data.current_weather.weathercode);
    
    const weatherData: WeatherData = {
      temperature: Math.round(data.current_weather.temperature),
      weatherType: weatherMapping.type,
      weatherDescription: weatherMapping.description,
      lastUpdated: new Date(),
      isRealWeather: true
    };
    
    console.log('[Weather Debug] Mapped weather data:', weatherData);
    
    // Cache the result
    cacheWeather(weatherData, latitude, longitude);
    
    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    
    // Return fallback weather data
    return {
      temperature: 20,
      weatherType: 'clear',
      weatherDescription: 'Weather unavailable',
      lastUpdated: new Date(),
      isRealWeather: false
    };
  }
};

export const clearWeatherCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('[Weather Debug] Weather cache cleared');
  } catch (error) {
    console.error('Error clearing weather cache:', error);
  }
};
