import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CalendarEggs from '../src/components/CalendarEggs';

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

const base = { timeOfDay: 'night' as const, weatherType: 'clear' as const, moon: { x: 100, y: 100, r: 24 }, horizonY: 500 };

describe('CalendarEggs', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing visible without an event', () => {
    render(<CalendarEggs {...base} event={null} />);
    expect(screen.queryByTestId(/season-badge|pumpkin-moon|halloween-bat|christmas-flake|black-cat/)).toBeNull();
  });

  it('shows the hemisphere text in the season badge', () => {
    render(<CalendarEggs {...base} event="solstice-shortest" />);
    expect(screen.getByTestId('season-badge').textContent).toMatch(/shortest day/);
  });

  it('draws the pumpkin moon only while the moon is shown', () => {
    const { rerender } = render(<CalendarEggs {...base} event="halloween-pumpkin" />);
    expect(screen.getByTestId('pumpkin-moon')).toBeTruthy();
    rerender(<CalendarEggs {...base} event="halloween-pumpkin" moon={null} />);
    expect(screen.queryByTestId('pumpkin-moon')).toBeNull();
  });

  it('flies Halloween bats at night only', () => {
    const { rerender } = render(<CalendarEggs {...base} event="halloween-bats" />);
    expect(screen.getAllByTestId('halloween-bat').length).toBeGreaterThan(0);
    // ROADMAP item 64: the same solid dark silhouette as the dusk bats.
    const bat = screen.getAllByTestId('halloween-bat')[0].querySelector('svg') as SVGElement;
    expect(bat.getAttribute('fill')).toBe('currentColor');
    expect(bat.style.color).toBe('hsl(var(--scene-critter-silhouette) / 0.9)');
    rerender(<CalendarEggs {...base} event="halloween-bats" timeOfDay="midday" />);
    expect(screen.queryByTestId('halloween-bat')).toBeNull();
  });

  it('adds Christmas snow unless it already snows', () => {
    const { rerender } = render(<CalendarEggs {...base} event="christmas" />);
    expect(screen.getAllByTestId('christmas-flake').length).toBeGreaterThan(0);
    rerender(<CalendarEggs {...base} event="christmas" weatherType="snow" />);
    expect(screen.queryByTestId('christmas-flake')).toBeNull();
  });

  it('walks the black cat once, then removes it', () => {
    render(<CalendarEggs {...base} event="friday-13" />);
    const cat = screen.getByTestId('black-cat');
    expect(cat.getAttribute('style')).toMatch(/45s linear forwards/);
    fireEvent.animationEnd(cat);
    expect(screen.queryByTestId('black-cat')).toBeNull();
  });

  it('flies the Lunar New Year dragon once, in one of three colours, then removes it (item 100)', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    // jsdom has no layout: a 390 × 844 phone.
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(390);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(844);
    render(<CalendarEggs {...base} event="lunar-new-year" />);
    const dragon = screen.getByTestId('lunar-dragon');
    expect(['red', 'jade', 'gold']).toContain(dragon.getAttribute('data-palette'));
    // 6.24 px/s: the 224 px dragon crosses 390 px in about 108 s, then its trail fades (20 s).
    let clock = 0;
    const runTo = (ms: number) => act(() => {
      while (frames.length && clock <= ms) { frames.shift()!(clock); clock += 500; }
    });
    runTo(100_000);
    expect(screen.getByTestId('lunar-dragon')).toBeTruthy();
    runTo(160_000);
    expect(screen.queryByTestId('lunar-dragon')).toBeNull();
  });

  it('turns the moving eggs off under reduced motion, keeps the static ones', () => {
    mockReducedMotion(true);
    const { rerender } = render(<CalendarEggs {...base} event="friday-13" />);
    expect(screen.queryByTestId('black-cat')).toBeNull();
    rerender(<CalendarEggs {...base} event="lunar-new-year" />);
    expect(screen.queryByTestId('lunar-dragon')).toBeNull();
    rerender(<CalendarEggs {...base} event="halloween-bats" />);
    expect(screen.queryByTestId('halloween-bat')).toBeNull();
    rerender(<CalendarEggs {...base} event="christmas" />);
    expect(screen.queryByTestId('christmas-flake')).toBeNull();
    rerender(<CalendarEggs {...base} event="halloween-pumpkin" />);
    expect(screen.getByTestId('pumpkin-moon')).toBeTruthy();
  });
});
