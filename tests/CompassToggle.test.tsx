import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CompassToggle from '../src/components/CompassToggle';

describe('CompassToggle (ROADMAP item 8)', () => {
  it('renders nothing when unsupported', () => {
    render(<CompassToggle status="unsupported" onEnable={vi.fn()} onDisable={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing when unavailable (permission denied or no sensor)', () => {
    render(<CompassToggle status="unavailable" onEnable={vi.fn()} onDisable={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an unpressed button with an aria-label when idle, and calls onEnable on click', () => {
    const onEnable = vi.fn();
    render(<CompassToggle status="idle" onEnable={onEnable} onDisable={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(onEnable).toHaveBeenCalledTimes(1);
  });

  it('shows a pressed button when active, and calls onDisable on click', () => {
    const onDisable = vi.fn();
    render(<CompassToggle status="active" onEnable={vi.fn()} onDisable={onDisable} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(onDisable).toHaveBeenCalledTimes(1);
  });

  describe('fades out in fullscreen, together with FullscreenButton (ROADMAP item 18)', () => {
    it('is fully opaque outside fullscreen, regardless of showCursor', () => {
      render(
        <CompassToggle status="idle" onEnable={vi.fn()} onDisable={vi.fn()} isFullscreen={false} showCursor={false} />
      );
      expect(screen.getByRole('button')).toHaveClass('opacity-100');
    });

    it('fades out in fullscreen once the cursor has gone idle', () => {
      render(
        <CompassToggle status="idle" onEnable={vi.fn()} onDisable={vi.fn()} isFullscreen={true} showCursor={false} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-0');
      // Stays reachable: opacity-0 only, never display:none.
      expect(button).not.toHaveAttribute('hidden');
    });

    it('stays visible in fullscreen while showCursor is true (mouse move or tap)', () => {
      render(
        <CompassToggle status="idle" onEnable={vi.fn()} onDisable={vi.fn()} isFullscreen={true} showCursor={true} />
      );
      expect(screen.getByRole('button')).toHaveClass('opacity-100');
    });

    it('becomes visible again on keyboard focus, even while showCursor is false', () => {
      render(
        <CompassToggle status="idle" onEnable={vi.fn()} onDisable={vi.fn()} isFullscreen={true} showCursor={false} />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-0');

      fireEvent.focus(button);
      expect(button).toHaveClass('opacity-100');

      fireEvent.blur(button);
      expect(button).toHaveClass('opacity-0');
    });
  });
});
