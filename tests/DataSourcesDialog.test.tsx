import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataSourcesDialog from '@/components/DataSourcesDialog';
import { STREAMS } from '@/utils/radioStreams';
import { LanguageContext } from '@/hooks/useLanguage';
import { translate } from '@/i18n';

// ROADMAP item 153: the credits and licences of every data source, and the privacy page.
const renderDialog = (onClose = vi.fn(), language: 'en' | 'fr' = 'en') => {
  render(
    <LanguageContext.Provider value={{ language, setLanguage: () => {}, t: (key, vars) => translate(language, key, vars) }}>
      <DataSourcesDialog onClose={onClose} />
    </LanguageContext.Provider>
  );
  return onClose;
};

describe('DataSourcesDialog (ROADMAP item 153)', () => {
  it('opens every link in a new tab, without the opener', () => {
    renderDialog();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(15);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('names every radio station of the player, without a link', () => {
    renderDialog();
    for (const { name } of STREAMS) {
      expect(screen.getByText(name, { exact: false })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    }
  });

  it('translates the labels and keeps the provider names', () => {
    renderDialog(vi.fn(), 'fr');
    expect(screen.getByRole('dialog', { name: 'Sources des données' })).toBeInTheDocument();
    expect(screen.getByText('Météo :')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open-Meteo' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute('href', '/privacy/');
  });

  it('closes on Escape and on a tap outside, not on a tap inside', () => {
    const onClose = renderDialog();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
