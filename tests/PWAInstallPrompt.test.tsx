import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import PWAInstallPrompt from '../src/components/PWAInstallPrompt';

describe('PWAInstallPrompt', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('renders install prompt when not installed', () => {
    render(<PWAInstallPrompt />);
    // Prompt may be delayed, so this is a placeholder
  });

  // More tests for dismiss, manual instructions, etc.

  it('does not reappear within 24h after dismiss', () => {
    // Simulate dismiss and check localStorage/timer
  });

  it('shows manual install instructions for iOS/Android/Desktop', () => {
    // Render with different user agents and check instructions
  });

  it('triggers native install prompt if available', () => {
    // Mock beforeinstallprompt event and check for prompt call
  });

  it('does not show the manual fallback prompt on a narrow non-iOS window (C-7)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });

    render(<PWAInstallPrompt />);
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.queryByRole('heading', { name: /install sun chaser/i })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('does not resurrect the prompt via a stale fallback timer after dismiss (C-7)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)' });

    render(<PWAInstallPrompt />);

    // Let the iOS fallback timer show the prompt.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('heading', { name: /install sun chaser/i })).toBeInTheDocument();

    // Dismiss it (second button is the X/dismiss button).
    const buttons = screen.getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[1]);
    });
    expect(screen.queryByRole('heading', { name: /install sun chaser/i })).not.toBeInTheDocument();

    // A stale, uncleared fallback timeout from before the dismiss must not bring it back.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole('heading', { name: /install sun chaser/i })).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
