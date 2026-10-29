import { Contrast, Snowflake, Sun, type LucideIcon } from 'lucide-react';
import { type TurningPoint } from '@/utils/turningPoints';

// The icon of each turning point (ROADMAP items 186 and 187): the horizon calendar's marks in the
// scene and the kicker of their info card. Both equinoxes set in the same place.
export const TURNING_ICONS: Record<TurningPoint, LucideIcon> = {
  midsummer: Sun, midwinter: Snowflake, springEquinox: Contrast, autumnEquinox: Contrast,
};
