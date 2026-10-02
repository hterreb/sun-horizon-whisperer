import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PremiumBadge from '@/components/PremiumBadge';
import { PremiumContext, type PremiumValue } from '@/hooks/usePremium';

const premiumValue = (overrides: Partial<PremiumValue>): PremiumValue => ({
  isPremium: false,
  isBillingAvailable: true,
  isLocked: false,
  price: null,
  buy: async () => {},
  restore: async () => {},
  requirePremium: vi.fn(),
  isDialogOpen: false,
  setDialogOpen: () => {},
  ...overrides,
});

const renderBadge = (value?: PremiumValue) =>
  render(value ? <PremiumContext.Provider value={value}><PremiumBadge /></PremiumContext.Provider> : <PremiumBadge />);

describe('PremiumBadge (ROADMAP items 35 and 14)', () => {
  it('shows on the web (no provider, no billing): the gold plus stays', () => {
    renderBadge();
    expect(screen.getByTestId('premium-badge')).toHaveAttribute('title', 'Premium feature, free for now');
  });

  it('shows in the Play app before a purchase', () => {
    renderBadge(premiumValue({}));
    expect(screen.getByTestId('premium-badge')).toBeInTheDocument();
  });

  it('says "Premium feature" (not "free for now") while locked', () => {
    renderBadge(premiumValue({ isLocked: true }));
    expect(screen.getByTestId('premium-badge')).toHaveAttribute('title', 'Premium feature');
  });

  it('goes away after a Play purchase', () => {
    renderBadge(premiumValue({ isPremium: true }));
    expect(screen.queryByTestId('premium-badge')).not.toBeInTheDocument();
  });
});
