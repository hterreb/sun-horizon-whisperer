
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

// Single source of the 8-phase thresholds. `getMoonPhaseLabel` here and
// `getMoonPhaseIcon` in SunVisualization.tsx both look up their result by this same
// index, so they can't disagree on which of the 8 phases a given `phase` falls into.
export const getMoonPhaseIndex = (phase: number): number => {
  if (phase < 0.03) return 0; // New Moon
  if (phase < 0.22) return 1; // Waxing Crescent
  if (phase < 0.28) return 2; // First Quarter
  if (phase < 0.47) return 3; // Waxing Gibbous
  if (phase < 0.53) return 4; // Full Moon
  if (phase < 0.72) return 5; // Waning Gibbous
  if (phase < 0.78) return 6; // Third Quarter
  if (phase < 0.97) return 7; // Waning Crescent
  return 0; // New Moon
};

const MOON_PHASE_LABELS = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Third Quarter',
  'Waning Crescent',
];

export const getMoonPhaseLabel = (phase: number): string => MOON_PHASE_LABELS[getMoonPhaseIndex(phase)];
