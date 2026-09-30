// Temperature unit toggle (ROADMAP backlog "Unit toggle °C/°F"): display only. The
// weather data and every effect threshold stay in °C.

export type TemperatureUnit = 'C' | 'F';

export const TEMPERATURE_UNIT_STORAGE_KEY = 'temperature-unit';

// Regions that use °F (CLDR "temperature" preference).
const FAHRENHEIT_REGIONS = new Set(['US', 'LR', 'MM', 'BS', 'KY', 'PW', 'FM', 'MH']);

export const getDefaultTemperatureUnit = (locale: string): TemperatureUnit => {
  let region: string | undefined;
  try {
    region = new Intl.Locale(locale).maximize().region;
  } catch {
    region = undefined;
  }
  return region && FAHRENHEIT_REGIONS.has(region) ? 'F' : 'C';
};

export const loadTemperatureUnit = (locale: string): TemperatureUnit => {
  try {
    const stored = localStorage.getItem(TEMPERATURE_UNIT_STORAGE_KEY);
    if (stored === 'C' || stored === 'F') return stored;
  } catch {
    // Storage blocked: use the locale default.
  }
  return getDefaultTemperatureUnit(locale);
};

export const saveTemperatureUnit = (unit: TemperatureUnit): void => {
  try {
    localStorage.setItem(TEMPERATURE_UNIT_STORAGE_KEY, unit);
  } catch {
    // Storage blocked: the choice lasts for this session only.
  }
};

export const celsiusToFahrenheit = (c: number): number => (c * 9) / 5 + 32;

export const formatTemperature = (celsius: number, unit: TemperatureUnit): string =>
  `${Math.round(unit === 'F' ? celsiusToFahrenheit(celsius) : celsius)}°${unit}`;
