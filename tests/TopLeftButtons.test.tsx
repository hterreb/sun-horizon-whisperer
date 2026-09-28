import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import TopLeftButtons from '../src/components/TopLeftButtons';

describe('TopLeftButtons (ROADMAP item 22)', () => {
  const originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled');

  afterEach(() => {
    if (originalFullscreenEnabled) {
      Object.defineProperty(document, 'fullscreenEnabled', originalFullscreenEnabled);
    }
  });

  const renderRow = (isFullscreen: boolean, showCursor: boolean) => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    return render(
      <TopLeftButtons
        isFullscreen={isFullscreen}
        showCursor={showCursor}
        onFullscreenChange={vi.fn()}
        compassStatus="idle"
        onCompassEnable={vi.fn()}
        onCompassDisable={vi.fn()}
      />
    );
  };

  it('puts the fullscreen and compass buttons in one row, both with aria-labels', () => {
    renderRow(false, true);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-label');
    }
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
});
