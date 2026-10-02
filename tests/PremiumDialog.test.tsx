import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PremiumDialog from '@/components/PremiumDialog';
import { LanguageContext } from '@/hooks/useLanguage';
import { PremiumContext, type PremiumValue } from '@/hooks/usePremium';
import { translate } from '@/i18n';

const premiumValue = (overrides: Partial<PremiumValue>): PremiumValue => ({
  isPremium: false,
  isBillingAvailable: true,
  isLocked: true,
  price: '€3.99',
  buy: vi.fn(async () => {}),
  restore: vi.fn(async () => {}),
  requirePremium: vi.fn(),
  isDialogOpen: true,
  setDialogOpen: vi.fn(),
  ...overrides,
});

const renderDialog = (value: PremiumValue, language: 'en' | 'de' = 'en') =>
  render(
    <LanguageContext.Provider value={{ language, setLanguage: () => {}, t: (key, vars) => translate(language, key, vars) }}>
      <PremiumContext.Provider value={value}>
        <PremiumDialog />
      </PremiumContext.Provider>
    </LanguageContext.Provider>
  );

describe('PremiumDialog (ROADMAP item 14)', () => {
  it('renders nothing while closed', () => {
    renderDialog(premiumValue({ isDialogOpen: false }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the title, what Premium includes and the local price', () => {
    renderDialog(premiumValue({}));
    expect(screen.getByRole('dialog', { name: /sun chaser premium/i })).toBeInTheDocument();
    expect(screen.getByText(/share card/)).toBeInTheDocument();
    expect(screen.getByText('One-time purchase: €3.99')).toBeInTheDocument();
  });

  it('hides the price line when Play gave no price', () => {
    renderDialog(premiumValue({ price: null }));
    expect(screen.queryByText(/One-time purchase/)).not.toBeInTheDocument();
  });

  it('Buy, Restore and Cancel call the hook', () => {
    const value = premiumValue({});
    renderDialog(value);
    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore purchase' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(value.buy).toHaveBeenCalled();
    expect(value.restore).toHaveBeenCalled();
    expect(value.setDialogOpen).toHaveBeenCalledWith(false);
  });

  it('closes on Escape', () => {
    const value = premiumValue({});
    renderDialog(value);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(value.setDialogOpen).toHaveBeenCalledWith(false);
  });

  it('is translated (German)', () => {
    renderDialog(premiumValue({}), 'de');
    expect(screen.getByRole('button', { name: 'Kaufen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kauf wiederherstellen' })).toBeInTheDocument();
  });
});
