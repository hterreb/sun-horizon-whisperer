import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TopLeftButtons from '../src/components/TopLeftButtons';
import * as feedback from '@/utils/feedback';

describe('TopLeftButtons (ROADMAP items 22 and 23)', () => {
  const originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled');

  beforeEach(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    vi.spyOn(feedback, 'isFeedbackAvailable').mockReturnValue(false);
  });

  afterEach(() => {
    if (originalFullscreenEnabled) {
      Object.defineProperty(document, 'fullscreenEnabled', originalFullscreenEnabled);
    }
    vi.restoreAllMocks();
  });

  const renderRow = (isFullscreen: boolean, showCursor: boolean) =>
    render(
      <TopLeftButtons
        isFullscreen={isFullscreen}
        showCursor={showCursor}
        onFullscreenChange={vi.fn()}
        compassStatus="idle"
        onCompassEnable={vi.fn()}
        onCompassDisable={vi.fn()}
      />
    );

  it('puts the fullscreen and compass buttons in one row, both with aria-labels', () => {
    renderRow(false, true);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-label');
    }
  });

  it('stacks the buttons vertically (ROADMAP item 31)', () => {
    const { container } = renderRow(false, true);
    expect(container.firstChild).toHaveClass('flex-col');
  });

  // ROADMAP item 31: `focus-within` also matched after a mouse click or tap (the
  // clicked fullscreen button keeps focus), so the column never faded out.
  it('comes back for keyboard focus only, not for the focus a click leaves behind', () => {
    const { container } = renderRow(true, false);
    expect(container.firstChild).toHaveClass('has-focus-visible:opacity-100');
    expect(container.firstChild).not.toHaveClass('focus-within:opacity-100');
  });

  it('is fully opaque outside fullscreen, regardless of showCursor', () => {
    const { container } = renderRow(false, false);
    expect(container.firstChild).toHaveClass('opacity-100');
  });

  it('fades the whole row out in fullscreen once idle', () => {
    const { container } = renderRow(true, false);
    expect(container.firstChild).toHaveClass('opacity-0');
  });

  it('stays visible in fullscreen while showCursor is true', () => {
    const { container } = renderRow(true, true);
    expect(container.firstChild).toHaveClass('opacity-100');
  });

  it('shows a feedback button, with the same visibility rule, only when Sentry feedback is available', () => {
    vi.spyOn(feedback, 'isFeedbackAvailable').mockReturnValue(true);
    renderRow(false, true);
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('opens the feedback form when the feedback button is clicked', () => {
    vi.spyOn(feedback, 'isFeedbackAvailable').mockReturnValue(true);
    const openFeedbackForm = vi.spyOn(feedback, 'openFeedbackForm').mockResolvedValue(undefined);
    renderRow(false, true);

    screen.getByRole('button', { name: 'Send feedback' }).click();
    expect(openFeedbackForm).toHaveBeenCalledTimes(1);
  });
});
