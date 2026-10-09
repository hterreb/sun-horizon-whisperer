import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SkyEggs from '../src/components/SkyEggs';
import { LanguageContext } from '@/hooks/useLanguage';
import { translate } from '@/i18n';
import { type AstroEvent } from '@/utils/astroEvents';

// A flat test mapping: 1 px per degree of azimuth, 10 px per degree of altitude, horizon at 500.
const project = (altitude: number, azimuth: number) => ({ x: azimuth, y: 500 - altitude * 10 });
const base = { project, latitude: 47.78, horizonY: 500, opacity: 1 };
const ev = (kind: AstroEvent['kind'], extra: Partial<AstroEvent> = {}): AstroEvent => ({ kind, strength: 1, ...extra });

describe('SkyEggs', () => {
  it('draws nothing without an event or for another event', () => {
    const { container, rerender } = render(<SkyEggs {...base} event={null} />);
    expect(container.innerHTML).toBe('');
    rerender(<SkyEggs {...base} event={ev('aurora')} />);
    expect(container.innerHTML).toBe('');
  });

  it('draws the Pleiades low in the east with a Matariki pill', () => {
    render(<SkyEggs {...base} event={ev('matariki')} />);
    const egg = screen.getByTestId('sky-egg-matariki');
    expect(egg.querySelectorAll('circle')).toHaveLength(7);
    expect(egg.textContent).toBe('Matariki');
    expect(parseFloat(egg.style.left)).toBe(65 - 40); // azimuth 65°, centred
  });

  it('draws the two planets of a conjunction, spread apart, with their names', () => {
    const planets: AstroEvent['planets'] = [
      { name: 'venus', altitude: 10, azimuth: 80 },
      { name: 'jupiter', altitude: 10.5, azimuth: 80.5 },
    ];
    render(<SkyEggs {...base} event={ev('conjunction', { planets })} />);
    const [a, b] = screen.getAllByTestId('sky-egg-planet');
    const gap = Math.hypot(Number(b.getAttribute('cx')) - Number(a.getAttribute('cx')), Number(b.getAttribute('cy')) - Number(a.getAttribute('cy')));
    expect(gap).toBeGreaterThanOrEqual(14);
    expect(screen.getByTestId('sky-egg-conjunction').textContent).toBe('Venus and Jupiter');
  });

  it('draws demo planets for ?egg=conjunction, in the chosen language', () => {
    render(
      <LanguageContext.Provider value={{ language: 'it', setLanguage: () => {}, t: (key, vars) => translate('it', key, vars) }}>
        <SkyEggs {...base} event={ev('conjunction')} />
      </LanguageContext.Provider>
    );
    expect(screen.getByTestId('sky-egg-conjunction').textContent).toBe('Venere e Giove');
  });

  it('puts the noctilucent wisps over the north, or the south in the southern hemisphere', () => {
    const { rerender } = render(<SkyEggs {...base} event={ev('noctilucent')} />);
    const north = screen.getAllByTestId('sky-egg-noctilucent');
    expect(north).toHaveLength(6);
    const centres = north.map((w) => parseFloat(w.style.left) + parseFloat(w.style.width) / 2);
    expect(centres.every((x) => x <= 25 || x >= 335)).toBe(true);
    rerender(<SkyEggs {...base} latitude={-54} event={ev('noctilucent')} />);
    const south = screen.getAllByTestId('sky-egg-noctilucent').map((w) => parseFloat(w.style.left) + parseFloat(w.style.width) / 2);
    expect(south.every((x) => x >= 155 && x <= 205)).toBe(true);
  });

  it('hides the sky things under a covered sky and outside the compass view', () => {
    const { container, rerender } = render(<SkyEggs {...base} opacity={0} event={ev('matariki')} />);
    expect(container.innerHTML).toBe('');
    rerender(<SkyEggs {...base} project={() => null} event={ev('conjunction')} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the midnight sun and polar night pills on the water, also under clouds', () => {
    const { rerender } = render(<SkyEggs {...base} opacity={0} event={ev('midnightSun')} />);
    expect(screen.getByTestId('sky-egg-polar').textContent).toBe('Midnight sun');
    expect(screen.getByTestId('sky-egg-polar').style.top).toBe('630px');
    rerender(<SkyEggs {...base} event={ev('polarNight')} />);
    expect(screen.getByTestId('sky-egg-polar').textContent).toBe('Polar night');
  });

  it('opens the egg card on a double tap; one tap shows only the ring', () => {
    const onInfo = vi.fn();
    render(<SkyEggs {...base} event={ev('matariki')} onInfo={onInfo} />);
    const egg = screen.getByTestId('sky-egg-matariki');
    fireEvent.click(egg);
    expect(onInfo).not.toHaveBeenCalled();
    expect(screen.getByTestId('scene-info-ring')).toBeTruthy();
    fireEvent.click(egg);
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'matariki' }, expect.anything(), 'egg-matariki');
  });

  it('opens the polar night card from its pill', () => {
    const onInfo = vi.fn();
    render(<SkyEggs {...base} event={ev('polarNight')} onInfo={onInfo} />);
    const pill = screen.getByTestId('sky-egg-polar');
    fireEvent.click(pill);
    fireEvent.click(pill);
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'polarNight' }, expect.anything(), 'egg-polar-night');
  });
});
