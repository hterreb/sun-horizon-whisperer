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

  it('marks compass mode as premium with a gold plus (ROADMAP item 35)', () => {
    render(<CompassToggle status="idle" onEnable={vi.fn()} onDisable={vi.fn()} />);
    expect(screen.getByRole('button').querySelector('[data-testid="premium-badge"]')).not.toBeNull();
  });

  // Fullscreen-idle fade is owned by the shared TopLeftButtons row (ROADMAP item 22);
  // see tests/TopLeftButtons.test.tsx.
});
