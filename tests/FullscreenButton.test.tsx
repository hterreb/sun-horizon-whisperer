import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
