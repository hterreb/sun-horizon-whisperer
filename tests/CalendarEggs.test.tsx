import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CalendarEggs from '../src/components/CalendarEggs';
import { LanguageContext } from '@/hooks/useLanguage';
import { translate } from '@/i18n';

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

  it('shows the season badge in the chosen language', () => {
    render(
      <LanguageContext.Provider value={{ language: 'de', setLanguage: () => {}, t: (key, vars) => translate('de', key, vars) }}>
        <CalendarEggs {...base} event="equinox" />
      </LanguageContext.Provider>
    );
    expect(screen.getByTestId('season-badge').textContent).toBe('Tagundnachtgleiche · Tag und Nacht sind gleich lang');
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

  it('flies Santa once on Christmas Eve, also when it snows, then removes him', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const { rerender } = render(<CalendarEggs {...base} event="christmas" />);
    expect(screen.queryByTestId('santa')).toBeNull();
    rerender(<CalendarEggs {...base} event="christmas" weatherType="snow" santa />);
    expect(screen.getByTestId('santa')).toBeTruthy();
    // jsdom's window is 1024 px wide: at the phone's 9.75 px/s, 1024 + 120 px take about 117 s.
    act(() => { frames.shift()!(0); frames.shift()!(120_000); });
    expect(screen.queryByTestId('santa')).toBeNull();
    rerender(<CalendarEggs {...base} event="christmas" santa />);
    expect(screen.queryByTestId('santa')).toBeNull();
  });

  it('keeps Santa in the sky until he is done when midnight ends Christmas Eve mid-flight', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const { rerender } = render(<CalendarEggs {...base} event="christmas" santa />);
    act(() => { frames.shift()!(0); frames.shift()!(30_000); });
    const santa = screen.getByTestId('santa');
    // 00:00: no longer Santa time, he flies on from where he is.
    rerender(<CalendarEggs {...base} event="christmas" />);
    expect(screen.getByTestId('santa')).toBe(santa);
    act(() => { frames.shift()!(60_000); });
    expect(screen.getByTestId('santa')).toBe(santa);
    act(() => { frames.shift()!(120_000); });
    expect(screen.queryByTestId('santa')).toBeNull();
  });

  it('flies Santa across the drawn moon (lookbook S2), else small and far (S4)', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    const { unmount } = render(<CalendarEggs {...base} event="christmas" santa />);
    expect(screen.getByTestId('santa').getAttribute('data-mode')).toBe('moon');
    unmount();
    render(<CalendarEggs {...base} moon={null} event="christmas" santa />);
    expect(screen.getByTestId('santa').getAttribute('data-mode')).toBe('far');
  });

  it('waits for the measured scene before Santa starts, then picks his mode', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    const { rerender } = render(<CalendarEggs {...base} moon={null} measured={false} event="christmas" santa />);
    expect(screen.queryByTestId('santa')).toBeNull();
    rerender(<CalendarEggs {...base} measured event="christmas" santa />);
    expect(screen.getByTestId('santa').getAttribute('data-mode')).toBe('moon');
  });

  it('shows Santa only with the Christmas event', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    render(<CalendarEggs {...base} event="friday-13" santa />);
    expect(screen.queryByTestId('santa')).toBeNull();
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

  describe('egg info cards (ROADMAP item 113)', () => {
    // Item 116: a double tap opens the card.
    const tap = (wrapper: Element, x = 120, y = 300) => {
      const hit = wrapper.querySelector('[data-testid="scene-hit"]')!;
      fireEvent.click(hit, { clientX: x, clientY: y, detail: 1 });
      fireEvent.click(hit, { clientX: x, clientY: y, detail: 2 });
    };

    it('opens the card of the black cat, a Halloween bat and the pumpkin moon; the thing moves on', () => {
      const onInfo = vi.fn();
      const { rerender } = render(<CalendarEggs {...base} event="friday-13" onInfo={onInfo} />);
      const cat = screen.getByTestId('black-cat');
      expect(cat.className).toContain('pointer-events-auto');
      expect(cat.getAttribute('aria-hidden')).toBe('true');
      tap(cat);
      expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'blackCat' }, { x: 120, y: 300 }, 'egg-cat');
      expect(cat.getAttribute('style')).toMatch(/egg-glide 45s/);

      rerender(<CalendarEggs {...base} event="halloween-bats" onInfo={onInfo} />);
      tap(screen.getAllByTestId('halloween-bat')[2]);
      expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'halloweenBat' }, { x: 120, y: 300 }, 'egg-bat-2');

      rerender(<CalendarEggs {...base} event="halloween-pumpkin" onInfo={onInfo} />);
      tap(screen.getByTestId('pumpkin-moon').parentElement!);
      expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'pumpkinMoon' }, { x: 120, y: 300 }, 'egg-pumpkin');
    });

    it('gives each hit area at least 44 × 44 px and the ring of the open card in its tier colour', () => {
      render(<CalendarEggs {...base} event="halloween-bats" onInfo={vi.fn()} infoRing="egg-bat-1" infoRingTier="ultraRare" />);
      const bats = screen.getAllByTestId('halloween-bat');
      const hit = bats[1].querySelector<HTMLElement>('[data-testid="scene-hit"]')!;
      expect(parseFloat(hit.style.width)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(hit.style.height)).toBeGreaterThanOrEqual(44);
      expect(bats[1].querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-ultra-rare/80');
      expect(bats[0].querySelector('[data-testid="scene-info-ring"]')).toBeNull();
    });

    it('opens the dragon card from the hit area that follows it', () => {
      const frames: FrameRequestCallback[] = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
      vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(390);
      vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(844);
      const onInfo = vi.fn();
      render(<CalendarEggs {...base} event="lunar-new-year" onInfo={onInfo} infoRing="egg-dragon" infoRingTier="ultraRare" />);
      act(() => { frames.shift()!(0); frames.shift()!(30_000); });
      const hit = screen.getByTestId('lunar-dragon-hit');
      // 30 s at 6.24 px/s: the box has moved from off screen into the scene.
      expect(hit.style.transform).toMatch(/^translate\(-?\d+(\.\d)?px, \d+(\.\d)?px\)$/);
      tap(hit);
      expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'dragon' }, { x: 120, y: 300 }, 'egg-dragon');
      expect(hit.querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-ultra-rare/80');
    });

    it('opens the Santa card', () => {
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
      const onInfo = vi.fn();
      render(<CalendarEggs {...base} event="christmas" santa onInfo={onInfo} infoRing="egg-santa" infoRingTier="ultraRare" />);
      const santa = screen.getByTestId('santa');
      tap(santa);
      expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'santa' }, { x: 120, y: 300 }, 'egg-santa');
      expect(santa.querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-ultra-rare/80');
    });

    it('takes no taps without onInfo', () => {
      render(<CalendarEggs {...base} event="friday-13" />);
      expect(screen.getByTestId('black-cat').className).toContain('pointer-events-none');
      expect(screen.queryByTestId('scene-hit')).toBeNull();
    });
  });

  it('turns the moving eggs off under reduced motion, keeps the static ones', () => {
    mockReducedMotion(true);
    const { rerender } = render(<CalendarEggs {...base} event="friday-13" />);
    expect(screen.queryByTestId('black-cat')).toBeNull();
    rerender(<CalendarEggs {...base} event="lunar-new-year" />);
    expect(screen.queryByTestId('lunar-dragon')).toBeNull();
    rerender(<CalendarEggs {...base} event="halloween-bats" />);
    expect(screen.queryByTestId('halloween-bat')).toBeNull();
    rerender(<CalendarEggs {...base} event="christmas" santa />);
    expect(screen.queryByTestId('christmas-flake')).toBeNull();
    expect(screen.queryByTestId('santa')).toBeNull();
    rerender(<CalendarEggs {...base} event="halloween-pumpkin" />);
    expect(screen.getByTestId('pumpkin-moon')).toBeTruthy();
  });
});
