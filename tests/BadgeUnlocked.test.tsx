import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BadgeUnlocked, { FADE_OUT_MS, SHOW_MS } from '@/components/BadgeUnlocked';
import { LanguageContext } from '@/hooks/useLanguage';
import { translate } from '@/i18n';
import { BADGES } from '@/utils/collection';

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches, media: '', onchange: null, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  } as unknown as MediaQueryList);

const renderCard = (props: Partial<React.ComponentProps<typeof BadgeUnlocked>> = {}) => {
  const onOpen = vi.fn();
  const onDone = vi.fn();
  render(<BadgeUnlocked badgeId="fish:seahorse" found={24} onOpen={onOpen} onDone={onDone} {...props} />);
  return { onOpen, onDone, card: () => screen.queryByTestId('badge-unlocked') };
};

describe('BadgeUnlocked (ROADMAP item 114)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the kicker, the name, the tier in its colour and the counter', () => {
    const { card } = renderCard();
    expect(card()).toHaveTextContent('Badge unlocked');
    expect(card()).toHaveTextContent('Seahorse');
    expect(screen.getByText('Rare ·', { exact: false })).toHaveClass('text-tier-rare');
    expect(card()).toHaveTextContent(`24 / ${BADGES.length}`);
  });

  it('is a polite status with the text "Badge unlocked: Seahorse, rare"', () => {
    const { card } = renderCard();
    expect(screen.getByRole('status')).toBe(card());
    expect(card()).toHaveAttribute('aria-live', 'polite');
    expect(card()).toHaveTextContent('Badge unlocked: Seahorse, Rare');
  });

  it('has no tier word for a badge without a tier', () => {
    const { card } = renderCard({ badgeId: 'sun' });
    expect(card()).toHaveTextContent('Badge unlocked: Sun');
    expect(card()).not.toHaveTextContent('·');
  });

  it('slides in, sweeps and glows once; fades out after 4 s and then is done', () => {
    const { onDone, card } = renderCard();
    expect(card()).toHaveClass('animate-badge-in');
    expect(screen.getByTestId('badge-sweep')).toHaveClass('animate-badge-sweep');
    expect(screen.getByTestId('badge-glow')).toHaveClass('animate-badge-glow');
    act(() => {
      vi.advanceTimersByTime(SHOW_MS - 1);
    });
    expect(card()).toHaveClass('animate-badge-in');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(card()).toHaveClass('animate-badge-out');
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(FADE_OUT_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('with reduced motion only fades in: no sweep, no glow', () => {
    mockReducedMotion(true);
    const { card } = renderCard();
    expect(card()).toHaveClass('animate-badge-fade');
    expect(card()).not.toHaveClass('animate-badge-in');
    expect(screen.queryByTestId('badge-sweep')).toBeNull();
    expect(screen.queryByTestId('badge-glow')).toBeNull();
  });

  it('a tap opens the collection at the badge and closes the card', () => {
    const { onOpen, onDone } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Show in the collection' }));
    expect(onOpen).toHaveBeenCalledWith('fish:seahorse');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('Escape closes it after the fade-out', () => {
    const { onOpen, onDone, card } = renderCard();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(card()).toHaveClass('animate-badge-out');
    act(() => {
      vi.advanceTimersByTime(FADE_OUT_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('a swipe up closes it and does not open the collection', () => {
    const { onOpen, onDone, card } = renderCard();
    const button = screen.getByRole('button', { name: 'Show in the collection' });
    // jsdom has no PointerEvent: a MouseEvent of the pointer type carries clientY.
    fireEvent(button, new MouseEvent('pointerdown', { bubbles: true, clientY: 100 }));
    fireEvent(button, new MouseEvent('pointerup', { bubbles: true, clientY: 40 }));
    fireEvent.click(button);
    expect(onOpen).not.toHaveBeenCalled();
    expect(card()).toHaveClass('animate-badge-out');
    act(() => {
      vi.advanceTimersByTime(FADE_OUT_MS);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows the text in German', () => {
    render(
      <LanguageContext.Provider value={{ language: 'de', setLanguage: () => {}, t: (key, vars) => translate('de', key, vars) }}>
        <BadgeUnlocked badgeId="fish:seahorse" found={1} onOpen={vi.fn()} onDone={vi.fn()} />
      </LanguageContext.Provider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Abzeichen freigeschaltet: Seepferdchen');
  });
});
