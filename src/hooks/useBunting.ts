import { createContext, useContext } from 'react';

// National days (utils/nationalDays): on a bunting day the scene's boats carry pennant strings in
// the flag colours (BoatBunting in SceneBoat). SunTracker provides the colours (CSS colours) and
// `onShow`, which a decorated boat calls when it shows, so the badge counts only then. The
// provider wraps the scene only: without it (the collection grid, tests) a boat has no bunting.
export interface Bunting {
  colors: readonly string[];
  // 'pennant' (national days, the default) or 'picado' (Día de los Muertos, item 118: small square flags).
  shape?: 'pennant' | 'picado';
  onShow: () => void;
}

export const BuntingContext = createContext<Bunting | null>(null);

export const useBunting = (): Bunting | null => useContext(BuntingContext);
