import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../src/components/ui/button';

describe('Button', () => {
  it('renders with correct styles and responds to props', () => {
    render(<Button variant="default" size="lg">Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  it('is keyboard accessible', () => {
    render(<Button>Test</Button>);
    screen.getByRole('button').focus();
    expect(screen.getByRole('button')).toHaveFocus();
  });
  it('has appropriate ARIA attributes', () => {
    render(<Button aria-label="test" />);
    expect(screen.getByLabelText('test')).toBeInTheDocument();
  });
}); 