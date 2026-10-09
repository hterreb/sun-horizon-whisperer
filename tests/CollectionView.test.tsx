import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CollectionView from '@/components/CollectionView';
import { BADGES, type Collection } from '@/utils/collection';

const collection: Collection = {
  'fish:seahorse': '2026-10-09T12:00:00.000Z',
  'egg:ufo': '2026-10-08T22:00:00.000Z',
  'sun:midday': '2026-10-09T11:00:00.000Z',
};

const renderView = (open = true, onClose = vi.fn()) =>
  render(<CollectionView open={open} onClose={onClose} collection={collection} />);

const cellOf = (id: string) => {
  const index = BADGES.findIndex((badge) => badge.id === id);
  return screen.getAllByRole('listitem')[index];
};

describe('CollectionView', () => {
  it('renders nothing when closed', () => {
    const { container } = renderView(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the found count out of all badges', () => {
    renderView();
    expect(screen.getByRole('dialog')).toHaveTextContent(`3 / ${BADGES.length}`);
    expect(screen.getAllByRole('listitem')).toHaveLength(BADGES.length);
  });

  it('shows a collected badge with name, rarity tier and first-seen date', () => {
    renderView();
    const cell = cellOf('fish:seahorse');
    expect(cell).not.toHaveAttribute('data-missing');
    expect(within(cell).getByText('Seahorse')).toBeInTheDocument();
    expect(within(cell).getByText('Rare')).toBeInTheDocument();
    const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(collection['fish:seahorse']!));
    expect(within(cell).getByText(`Found ${date}`)).toBeInTheDocument();
  });

  it('hides the name of a missing scene badge and shows only its outlined art', () => {
    renderView();
    const cell = cellOf('fish:perch');
    expect(cell).toHaveAttribute('data-missing');
    expect(cell).toHaveAttribute('aria-label', 'Not found yet');
    expect(cell).not.toHaveTextContent('Perch');
    expect(cell.querySelector('svg')).not.toBeNull();
    expect((cell.firstElementChild as HTMLElement).style.filter).toBe('url(#badge-outline)');
  });

  it('shows only "?" for a missing egg, with no art and no name', () => {
    renderView();
    const cell = cellOf('egg:disco');
    expect(cell).toHaveAttribute('data-missing');
    expect(cell).toHaveTextContent(/^\?$/);
    expect(cell.querySelector('svg')).toBeNull();
  });

  it('shows a collected egg with its name', () => {
    renderView();
    const cell = cellOf('egg:ufo');
    expect(cell).not.toHaveAttribute('data-missing');
    expect(cell.querySelector('svg')).not.toBeNull();
    expect(cell).not.toHaveTextContent('?');
  });

  it('closes on Escape, on the close button and on the backdrop', () => {
    const onClose = vi.fn();
    renderView(true, onClose);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('groups the states under their base badge: one row each for sun, moon and terrain (item 115)', () => {
    renderView();
    const rowOf = (id: string) => cellOf(id).closest('ul')!;
    expect(within(rowOf('sun')).getAllByRole('listitem')).toHaveLength(6);
    expect(within(rowOf('moon')).getAllByRole('listitem')).toHaveLength(9);
    expect(within(rowOf('terrain')).getAllByRole('listitem')).toHaveLength(6);
    expect(rowOf('sun:dawn')).toBe(rowOf('sun'));
    expect(rowOf('terrain:alpine')).toBe(rowOf('terrain'));
    expect(rowOf('plane')).not.toBe(rowOf('sun'));
  });

  it('shows a collected state with its name and a missing state as a grey outline (item 115)', () => {
    renderView();
    expect(within(cellOf('sun:midday')).getByText('Midday sun')).toBeInTheDocument();
    for (const id of ['sun:dawn', 'moon:new', 'terrain:alpine']) {
      const cell = cellOf(id);
      expect(cell).toHaveAttribute('data-missing');
      expect(cell.querySelector('svg')).not.toBeNull();
      expect((cell.firstElementChild as HTMLElement).style.filter).toBe('url(#badge-outline)');
    }
    expect(cellOf('moon:new')).not.toHaveTextContent('New Moon');
  });
});
