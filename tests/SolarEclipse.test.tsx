import React from 'react';
import { render, screen } from '@testing-library/react';
import SolarEclipse from '../src/components/SolarEclipse';

describe('SolarEclipse', () => {
  it('centres the moon disc on the sun at totality, with a corona', () => {
    render(<SolarEclipse x={100} y={200} strength={1} radius={16} />);
    const disc = screen.getByTestId('solar-eclipse');
    expect(disc.style.left).toBe('100px');
    expect(disc.style.boxShadow).not.toBe('none');
  });

  it('offsets the disc for a partial cover, without a corona', () => {
    render(<SolarEclipse x={100} y={200} strength={0.5} radius={16} />);
    const disc = screen.getByTestId('solar-eclipse');
    expect(parseFloat(disc.style.left)).toBeGreaterThan(100);
    expect(disc.style.boxShadow).toBe('none');
  });
});
