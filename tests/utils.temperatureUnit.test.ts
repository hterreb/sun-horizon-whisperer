import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  celsiusToFahrenheit,
  formatTemperature,
  getDefaultTemperatureUnit,
  loadTemperatureUnit,
  saveTemperatureUnit,
  TEMPERATURE_UNIT_STORAGE_KEY,
} from '../src/utils/temperatureUnit';

describe('temperatureUnit', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to °F for Fahrenheit regions and °C elsewhere', () => {
    expect(getDefaultTemperatureUnit('en-US')).toBe('F');
    expect(getDefaultTemperatureUnit('en-LR')).toBe('F');
    expect(getDefaultTemperatureUnit('my-MM')).toBe('F');
    expect(getDefaultTemperatureUnit('de-DE')).toBe('C');
    expect(getDefaultTemperatureUnit('en-GB')).toBe('C');
    expect(getDefaultTemperatureUnit('es-US')).toBe('F');
  });

  it('uses the likely region for a language-only locale', () => {
    expect(getDefaultTemperatureUnit('en')).toBe('F');
    expect(getDefaultTemperatureUnit('de')).toBe('C');
  });

  it('falls back to °C for an invalid locale', () => {
    expect(getDefaultTemperatureUnit('not a locale!')).toBe('C');
  });

  it('converts °C to °F', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });

  it('formats in the chosen unit, rounded to whole degrees', () => {
    expect(formatTemperature(20, 'C')).toBe('20°C');
    expect(formatTemperature(20, 'F')).toBe('68°F');
    expect(formatTemperature(-3, 'F')).toBe('27°F');
    expect(formatTemperature(21.4, 'C')).toBe('21°C');
  });

  it('saves and loads the choice, and prefers it over the locale', () => {
    expect(loadTemperatureUnit('de-DE')).toBe('C');
    saveTemperatureUnit('F');
    expect(localStorage.getItem(TEMPERATURE_UNIT_STORAGE_KEY)).toBe('F');
    expect(loadTemperatureUnit('de-DE')).toBe('F');
  });

  it('ignores an invalid stored value', () => {
    localStorage.setItem(TEMPERATURE_UNIT_STORAGE_KEY, 'K');
    expect(loadTemperatureUnit('en-US')).toBe('F');
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadTemperatureUnit('en-US')).toBe('F');
    expect(() => saveTemperatureUnit('C')).not.toThrow();
  });
});
