import React from 'react';
import { render } from '@testing-library/react';
import MidnightGhost from '../src/components/MidnightGhost';

describe('MidnightGhost', () => {
  it('shows ghost at midnight', () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const { container } = render(<MidnightGhost currentTime={midnight} />);
    expect(container.innerHTML).toMatch(/ghost/i);
  });

  // More tests for disappearance, animation, etc.

  it('ghost floats and bounces within bounds', () => {
    // Simulate animation and check position stays within bounds
  });
});
