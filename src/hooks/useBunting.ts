import { createContext, useContext } from 'react';
import { type NationalDayKind } from '@/utils/nationalDays';

// National days (utils/nationalDays): on a bunting day the scene's boats carry pennant strings in
// the flag colours (BoatBunting in SceneBoat). SunTracker provides the colours (CSS colours); the
// badge counts on a double tap on a dressed boat (item 123). The provider wraps the scene only:
// without it (the collection grid, tests) a boat has no bunting.
export interface Bunting {
  colors: readonly string[];
  // 'pennant' (national days, the default), 'picado' (Día de los Muertos, item 118: small square
  // flags) or 'lights' (Christmas: warm bulbs and a gold star).
  shape?: 'pennant' | 'picado' | 'lights';
  // Item 128: the national day of the pennants; the boat card names it.
  day?: NationalDayKind;
}

export const BuntingContext = createContext<Bunting | null>(null);

export const useBunting = (): Bunting | null => useContext(BuntingContext);
