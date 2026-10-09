import React from 'react';
import { render, screen } from '@testing-library/react';
import MoonTint from '../src/components/MoonTint';

describe('MoonTint', () => {
  it('tints the moon copper during a lunar eclipse, by depth', () => {
    render(<svg><MoonTint kind="lunarEclipse" strength={0.5} radius={20} /></svg>);
    const tint = screen.getByTestId('moon-tint-lunarEclipse');
    expect(tint.getAttribute('fill')).toContain('--scene-eclipse-moon');
    expect(Number(tint.getAttribute('opacity'))).toBeCloseTo(0.425);
  });

  it('tints a blue moon deep blue, at full strength', () => {
    render(<svg><MoonTint kind="blueMoon" strength={1} radius={20} /></svg>);
    const tint = screen.getByTestId('moon-tint-blueMoon');
    expect(tint.getAttribute('fill')).toContain('--scene-blue-moon');
    expect(tint.getAttribute('opacity')).toBe('1');
  });
});
