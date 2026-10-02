// Premium gating (ROADMAP items 14 and 45). Premium is the one-time Google Play product
// `premium`, sold only in the Play app (TWA) through the Digital Goods API. The web has
// no Digital Goods API, so it stays free. A feature is locked only when billing is
// available AND PREMIUM_ENFORCED is true AND the user has not bought Premium.
// ROADMAP item 35 marks the premium set with a gold plus (PremiumBadge): change
// location, manual weather, the sunset score, line of sight, compass, time travel and
// the share card (item 68). The hook and the gate are in hooks/usePremium.ts.

// Stays false until the `premium` product exists in the Play Console (item 16).
export const PREMIUM_ENFORCED = false;

export const PLAY_BILLING = 'https://play.google.com/billing';
export const PREMIUM_SKU = 'premium';
const OWNED_KEY = 'premium-owned';

// Dev only: `?premium=enforce` turns the gate on for screenshots and manual checks.
// import.meta.env.DEV is false in a production build, so the build drops this branch.
export const isPremiumEnforced = (search: string = window.location.search): boolean =>
  PREMIUM_ENFORCED || (import.meta.env.DEV && new URLSearchParams(search).get('premium') === 'enforce');

export const ownsPremium = (purchases: { itemId: string }[]): boolean =>
  purchases.some((purchase) => purchase.itemId === PREMIUM_SKU);

export const isPremiumLocked = (isBillingAvailable: boolean, enforced: boolean, owned: boolean): boolean =>
  isBillingAvailable && enforced && !owned;

export const formatPrice = (price: { currency: string; value: string }, language: string): string =>
  new Intl.NumberFormat(language, { style: 'currency', currency: price.currency }).format(Number(price.value));

// Fast start hint only: listPurchases() is the truth and overwrites it.
export const loadOwnedHint = (): boolean => {
  try {
    return localStorage.getItem(OWNED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const saveOwnedHint = (owned: boolean): void => {
  try {
    localStorage.setItem(OWNED_KEY, String(owned));
  } catch {
    // Storage blocked: the next start asks listPurchases() again.
  }
};
