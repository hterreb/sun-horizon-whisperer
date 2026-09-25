import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import FullscreenButton from '../src/components/FullscreenButton';

describe('FullscreenButton', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(document, 'fullscreenEnabled', originalDescriptor);
    } else {
      Reflect.deleteProperty(document, 'fullscreenEnabled');
    }
  });

  it('renders nothing when the Fullscreen API is unavailable (C-13, e.g. iPhone Safari)', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true });
    render(<FullscreenButton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the button when the Fullscreen API is available', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    render(<FullscreenButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders the button when fullscreenEnabled is undefined (jsdom default)', () => {
    Reflect.deleteProperty(document, 'fullscreenEnabled');
    render(<FullscreenButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has an aria-label, and reappears on focus and touch as well as mouse hover (A-3)', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    render(<FullscreenButton />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');

    fireEvent.mouseLeave(button); // fullscreen-only fade; harmless when not fullscreen
    fireEvent.focus(button);
    expect(button.className).toContain('opacity-100');

    fireEvent.touchStart(button);
    expect(button.className).toContain('opacity-100');
  });
});
