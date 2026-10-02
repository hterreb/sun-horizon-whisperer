import { describe, it, expect, beforeEach } from 'vitest';
import {
  PREMIUM_ENFORCED,
  formatPrice,
  isPremiumEnforced,
  isPremiumLocked,
  loadOwnedHint,
  ownsPremium,
  saveOwnedHint,
} from '../src/utils/premium';

describe('premium (ROADMAP item 14 gate)', () => {
  beforeEach(() => localStorage.clear());

  it('ships with the gate off: PREMIUM_ENFORCED is false', () => {
    expect(PREMIUM_ENFORCED).toBe(false);
    expect(isPremiumEnforced('')).toBe(false);
  });

  it('turns the gate on with ?premium=enforce in dev only', () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(isPremiumEnforced('?premium=enforce')).toBe(true);
    expect(isPremiumEnforced('?premium=other')).toBe(false);
  });

  it('locks only with billing available, the gate on and no purchase', () => {
    expect(isPremiumLocked(true, true, false)).toBe(true);
    expect(isPremiumLocked(false, true, false)).toBe(false);
    expect(isPremiumLocked(true, false, false)).toBe(false);
    expect(isPremiumLocked(true, true, true)).toBe(false);
  });

  it('finds the premium product in the purchase list', () => {
    expect(ownsPremium([{ itemId: 'premium' }])).toBe(true);
    expect(ownsPremium([{ itemId: 'other' }])).toBe(false);
    expect(ownsPremium([])).toBe(false);
  });

  it('formats the Play price in the chosen language', () => {
    expect(formatPrice({ currency: 'EUR', value: '3.99' }, 'en')).toBe('€3.99');
    expect(formatPrice({ currency: 'EUR', value: '3.99' }, 'de')).toBe('3,99 €');
  });

  it('keeps the owned hint in localStorage', () => {
    expect(loadOwnedHint()).toBe(false);
    saveOwnedHint(true);
    expect(loadOwnedHint()).toBe(true);
  });
});
