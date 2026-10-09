import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NationalEggs, { BONFIRE_RING, JETS_RING } from '../src/components/NationalEggs';
import { NATIONAL_DAYS, type NationalDayKind } from '@/utils/nationalDays';

const mockReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);

const endAnimation = (element: Element, animationName: string) => {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: animationName });
  fireEvent(element, event);
};

const day = (kind: NationalDayKind) => NATIONAL_DAYS.find(d => d.kind === kind)!;
// Item 116: a double tap opens the card.
const tap = (wrapper: Element, x = 120, y = 300) => {
  const hit = wrapper.querySelector('[data-testid="scene-hit"]')!;
  fireEvent.click(hit, { clientX: x, clientY: y, detail: 1 });
  fireEvent.click(hit, { clientX: x, clientY: y, detail: 2 });
};

describe('NationalEggs', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  describe('Frecce Tricolori (jets)', () => {
    it('flies nine jets once across the day sky, each with a smoke trail in the flag colours', () => {
      render(<NationalEggs day={day('festaRepubblica')} timeOfDay="midday" />);
      const smoke = screen.getAllByTestId('national-smoke');
      expect(smoke).toHaveLength(9);
      // Top three green, middle three white, bottom three red.
      expect(smoke[0].style.background).toContain('--national-it-green');
      expect(smoke[4].style.background).toContain('--national-white');
      expect(smoke[8].style.background).toContain('--national-it-red');
      const formation = screen.getByTestId('national-formation');
      expect(formation.querySelectorAll('path')).toHaveLength(9);
      // One slow glide, no repeat.
      expect(formation.style.animation).toMatch(/^national-fly [\d.]+s linear forwards$/);
    });

    it('moves at most 2 % of the width per second, capped at phone speed', () => {
      render(<NationalEggs day={day('festaRepubblica')} timeOfDay="midday" />);
      const seconds = Number(screen.getByTestId('national-formation').style.animation.match(/national-fly ([\d.]+)s/)![1]);
      const pxPerSecond = (window.innerWidth + 64) / seconds;
      expect(pxPerSecond).toBeLessThanOrEqual(Math.min(window.innerWidth * 0.02, 7.8) + 1e-9);
    });

    it('does not fly at night', () => {
      render(<NationalEggs day={day('festaRepubblica')} timeOfDay="night" />);
      expect(screen.queryByTestId('national-jets')).toBeNull();
    });

    it('keeps flying when the time of day changes, and is gone after the smoke has faded', () => {
      const { rerender } = render(<NationalEggs day={day('festaRepubblica')} timeOfDay="evening" />);
      rerender(<NationalEggs day={day('festaRepubblica')} timeOfDay="civil-twilight" />);
      const smoke = screen.getAllByTestId('national-smoke')[0];
      endAnimation(smoke, 'national-smoke');
      expect(screen.getByTestId('national-jets')).toBeTruthy();
      endAnimation(smoke, 'national-fade');
      expect(screen.queryByTestId('national-jets')).toBeNull();
    });

    it('shows no jets with reduced motion', () => {
      mockReducedMotion(true);
      render(<NationalEggs day={day('festaRepubblica')} timeOfDay="midday" />);
      expect(screen.queryByTestId('national-jets')).toBeNull();
    });

    it('opens the card on a double tap on the formation', () => {
      const onInfo = vi.fn();
      render(<NationalEggs day={day('festaRepubblica')} timeOfDay="midday" onInfo={onInfo} />);
      const formation = screen.getByTestId('national-formation');
      expect(formation.className).toContain('pointer-events-auto');
      expect(formation.getAttribute('aria-hidden')).toBe('true');
      tap(formation);
      expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'festaRepubblica' }, { x: 120, y: 300 }, JETS_RING);
    });
  });

  describe('fireworks', () => {
    it('starts one show in the flag palette at night', () => {
      const { container } = render(<NationalEggs day={day('bastilleDay')} timeOfDay="night" />);
      expect(container.querySelector('canvas')).toBeTruthy();
      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('starts no show by day', () => {
      const { container } = render(<NationalEggs day={day('independenceDay')} timeOfDay="afternoon" />);
      expect(container.querySelector('canvas')).toBeNull();
    });

    it('starts no show with reduced motion', () => {
      mockReducedMotion(true);
      const { container } = render(<NationalEggs day={day('independenceDay')} timeOfDay="night" />);
      expect(container.querySelector('canvas')).toBeNull();
    });
  });

  describe('Guy Fawkes bonfire', () => {
    it('glows on the shore at night only, without animation', () => {
      const { rerender } = render(<NationalEggs day={day('guyFawkes')} timeOfDay="night" />);
      const bonfire = screen.getByTestId('national-bonfire');
      expect(bonfire.style.background).toContain('--national-bonfire');
      expect(bonfire.style.animation).toBe('');
      rerender(<NationalEggs day={day('guyFawkes')} timeOfDay="midday" />);
      expect(screen.queryByTestId('national-bonfire')).toBeNull();
    });

    it('stays (static) with reduced motion', () => {
      mockReducedMotion(true);
      render(<NationalEggs day={day('guyFawkes')} timeOfDay="night" />);
      expect(screen.getByTestId('national-bonfire')).toBeTruthy();
    });

    it('opens the card on a double tap', () => {
      const onInfo = vi.fn();
      render(<NationalEggs day={day('guyFawkes')} timeOfDay="night" onInfo={onInfo} />);
      tap(screen.getByTestId('national-bonfire'));
      expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'guyFawkes' }, { x: 120, y: 300 }, BONFIRE_RING);
    });

    it('has no bonfire on the other fireworks days', () => {
      render(<NationalEggs day={day('bastilleDay')} timeOfDay="night" />);
      expect(screen.queryByTestId('national-bonfire')).toBeNull();
    });
  });

  it('draws nothing in the sky on a bunting day (the boats carry the bunting)', () => {
    const { container } = render(<NationalEggs day={day('germanUnity')} timeOfDay="midday" />);
    expect(container.querySelector('[data-testid^="national-"], canvas')).toBeNull();
  });
});
