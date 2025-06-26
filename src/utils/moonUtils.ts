
import SunCalc from 'suncalc';

export interface MoonPosition {
  azimuth: number;
  altitude: number;
  phase: number;
  illumination: number;
  visible: boolean;
}

export const getMoonPosition = (date: Date, latitude: number, longitude: number): MoonPosition => {
  const moonPosition = SunCalc.getMoonPosition(date, latitude, longitude);
  const moonIllumination = SunCalc.getMoonIllumination(date);
  
  // Convert from radians to degrees
  const altitudeDegrees = moonPosition.altitude * (180 / Math.PI);
  const azimuthDegrees = (moonPosition.azimuth * (180 / Math.PI) + 180) % 360;
  
  return {
    azimuth: azimuthDegrees,
    altitude: altitudeDegrees,
    phase: moonIllumination.phase,
    illumination: moonIllumination.fraction,
    visible: altitudeDegrees > -6 // Moon is visible when above -6 degrees
  };
};

export const getMoonPhaseLabel = (phase: number): string => {
  if (phase < 0.03) return 'New Moon';
  if (phase < 0.22) return 'Waxing Crescent';
  if (phase < 0.28) return 'First Quarter';
  if (phase < 0.47) return 'Waxing Gibbous';
  if (phase < 0.53) return 'Full Moon';
  if (phase < 0.72) return 'Waning Gibbous';
  if (phase < 0.78) return 'Third Quarter';
  if (phase < 0.97) return 'Waning Crescent';
  return 'New Moon';
};
