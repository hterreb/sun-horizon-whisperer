import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FestivalEggs from '../src/components/FestivalEggs';
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

const base = {
  timeOfDay: 'night' as const, weatherType: 'clear' as const, latitude: 47.8, date: new Date(2026, 11, 6, 20),
  moon: { x: 100, y: 100, r: 24 }, horizonY: 500,
};
const day = { ...base, timeOfDay: 'midday' as const };
const animation = (el: HTMLElement) => el.style.animation;

// ROADMAP item 118: cultural festival eggs.
describe('FestivalEggs', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing without a festival', () => {
    const { container } = render(<FestivalEggs {...base} event="christmas" />);
    expect(container.innerHTML).toBe('');
    render(<FestivalEggs {...base} event={null} />);
    expect(screen.queryByTestId(/festival-/)).toBeNull();
  });

  it('floats candle-lit krathongs slowly on the sea at night only', () => {
    const { rerender } = render(<FestivalEggs {...base} event="loy-krathong" />);
    const krathongs = screen.getAllByTestId('festival-krathong');
    expect(krathongs).toHaveLength(5);
    expect(animation(krathongs[0])).toMatch(/festival-drift \d+s ease-in-out infinite alternate/);
    expect(parseFloat(krathongs[0].style.top)).toBeGreaterThan(500); // on the water
    rerender(<FestivalEggs {...day} event="loy-krathong" />);
    expect(screen.queryByTestId('festival-krathong')).toBeNull();
  });

  it('lines diyas along the horizon with a slow glow (at least 4 s), at night', () => {
    render(<FestivalEggs {...base} event="diwali" />);
    const diyas = screen.getAllByTestId('festival-diya');
    expect(diyas).toHaveLength(9);
    for (const diya of diyas) {
      const seconds = Number(animation(diya).match(/festival-glow (\d+)s/)?.[1]);
      expect(seconds).toBeGreaterThanOrEqual(4);
    }
  });

  it('gives the Eid moon a golden glow and shows the label pill all day', () => {
    const { rerender } = render(<FestivalEggs {...base} event="eid-al-fitr" />);
    expect(screen.getByTestId('festival-eid-glow')).toBeTruthy();
    expect(screen.getByTestId('festival-eid-pill').textContent).toBe('Eid al-Fitr · Eid Mubarak');
    rerender(<FestivalEggs {...day} event="eid-al-fitr" moon={null} />);
    expect(screen.queryByTestId('festival-eid-glow')).toBeNull();
    expect(screen.getByTestId('festival-eid-pill')).toBeTruthy();
  });

  it('shows the Eid pill in the chosen language', () => {
    render(
      <LanguageContext.Provider value={{ language: 'fr', setLanguage: () => {}, t: (key, vars) => translate('fr', key, vars) }}>
        <FestivalEggs {...base} event="eid-al-fitr" />
      </LanguageContext.Provider>
    );
    expect(screen.getByTestId('festival-eid-pill').textContent).toBe('Aïd al-Fitr · Aïd Moubarak');
  });

  it('raises red lanterns slowly and draws the moon rabbit on the Mid-Autumn moon', () => {
    render(<FestivalEggs {...base} event="mid-autumn" />);
    const lanterns = screen.getAllByTestId('festival-lantern');
    expect(lanterns).toHaveLength(6);
    // At least 150 s from the horizon to the top: about 4 px/s on a phone.
    expect(Number(animation(lanterns[0]).match(/festival-rise (\d+)s/)?.[1])).toBeGreaterThanOrEqual(150);
    expect(screen.getByTestId('festival-moon-rabbit')).toBeTruthy();
  });

  it('drifts cherry petals across the day sky, not at night', () => {
    const { rerender } = render(<FestivalEggs {...day} event="hanami" />);
    const petals = screen.getAllByTestId('festival-petal');
    expect(petals.length).toBeGreaterThan(0);
    // 110 vw in at least 70 s: slower than the birds' 2.5 %/s.
    expect(Number(animation(petals[0]).match(/festival-fall (\d+)s/)?.[1])).toBeGreaterThanOrEqual(70);
    rerender(<FestivalEggs {...base} event="hanami" />);
    expect(screen.queryByTestId('festival-petal')).toBeNull();
  });

  it('makes Vega and Altair bright with a faint Milky Way between them at Tanabata', () => {
    render(<FestivalEggs {...base} event="tanabata" />);
    expect(screen.getAllByTestId('festival-tanabata-star')).toHaveLength(2);
    expect(screen.getByTestId('festival-milky-way')).toBeTruthy();
  });

  it('floats marigolds on the water for Día de los Muertos, day and night', () => {
    const { rerender } = render(<FestivalEggs {...day} event="dia-de-muertos" />);
    expect(screen.getAllByTestId('festival-marigold').length).toBeGreaterThan(0);
    rerender(<FestivalEggs {...base} event="dia-de-muertos" />);
    expect(screen.getAllByTestId('festival-marigold').length).toBeGreaterThan(0);
  });

  it('shows one Hanukkah light per night', () => {
    const { rerender } = render(<FestivalEggs {...base} event="hanukkah" date={new Date(2026, 11, 4, 20)} />);
    expect(screen.getAllByTestId('festival-hanukkah-light')).toHaveLength(1);
    rerender(<FestivalEggs {...base} event="hanukkah" date={new Date(2026, 11, 8, 20)} />);
    expect(screen.getAllByTestId('festival-hanukkah-light')).toHaveLength(5);
    rerender(<FestivalEggs {...base} event="hanukkah" date={new Date(2026, 11, 11, 20)} />);
    expect(screen.getAllByTestId('festival-hanukkah-light')).toHaveLength(8);
    // ?egg=hanukkah out of season: all 8.
    rerender(<FestivalEggs {...base} event="hanukkah" date={new Date(2026, 5, 1, 20)} />);
    expect(screen.getAllByTestId('festival-hanukkah-light')).toHaveLength(8);
  });

  it('frames the equinox pill with an arc of big spring blossoms for Nowruz, day and night', () => {
    const { rerender } = render(<FestivalEggs {...day} event="nowruz" />);
    // The arc hangs from the pill's top (CalendarEggs: horizon + 90 px).
    expect(screen.getByTestId('festival-nowruz').style.top).toBe('590px');
    const blossoms = screen.getAllByTestId('festival-blossom');
    expect(blossoms).toHaveLength(7);
    // At least 28 px wide (2× the old 16 px dots at the smallest).
    for (const b of blossoms) expect(Number(b.querySelector('svg')?.getAttribute('width'))).toBeGreaterThanOrEqual(28);
    const centre = (el: HTMLElement) => {
      const size = Number(el.querySelector('svg')?.getAttribute('width'));
      return { x: parseFloat(el.style.left) + size / 2, y: parseFloat(el.style.top) + size / 2 };
    };
    const [left, , , middle, , , right] = blossoms.map(centre);
    expect(left.x).toBe(-right.x); // symmetric about the pill
    expect(middle.x).toBe(0);
    expect(middle.y).toBeGreaterThan(left.y); // an arc: the ends beside the pill, the middle under it
    expect(left.y).toBe(right.y);
    // A few petals sink very slowly from the arc.
    const petals = screen.getAllByTestId('festival-nowruz-petal');
    expect(petals.length).toBeGreaterThan(0);
    expect(Number(animation(petals[0]).match(/festival-sink (\d+)s/)?.[1])).toBeGreaterThanOrEqual(25);
    rerender(<FestivalEggs {...base} event="nowruz" />);
    expect(screen.getAllByTestId('festival-blossom')).toHaveLength(7);
  });

  it('lights Midsummer bonfires when the sun is low (the sky eggs label a real midnight sun)', () => {
    const { rerender } = render(<FestivalEggs {...base} event="midsummer" timeOfDay="civil-twilight" />);
    expect(screen.getAllByTestId('festival-bonfire')).toHaveLength(3);
    rerender(<FestivalEggs {...day} event="midsummer" latitude={64.1} />);
    expect(screen.queryByTestId('festival-bonfire')).toBeNull();
  });

  it('drops slow confetti for Carnival by day', () => {
    render(<FestivalEggs {...day} event="carnival" />);
    const confetti = screen.getAllByTestId('festival-confetti');
    expect(confetti.length).toBeGreaterThan(0);
    expect(Number(animation(confetti[0]).match(/festival-fall (\d+)s/)?.[1])).toBeGreaterThanOrEqual(50);
  });

  it('draws nothing of its own for Holi (SkyClouds tints the clouds)', () => {
    const { container } = render(<FestivalEggs {...day} event="holi" />);
    expect(container.querySelector('[data-testid^="festival-"]')).toBeNull();
  });

  describe('reduced motion', () => {
    beforeEach(() => mockReducedMotion(true));

    it('keeps the floating and glowing things, without motion', () => {
      const { rerender } = render(<FestivalEggs {...base} event="loy-krathong" />);
      expect(animation(screen.getAllByTestId('festival-krathong')[0])).toBe('');
      rerender(<FestivalEggs {...base} event="diwali" />);
      expect(animation(screen.getAllByTestId('festival-diya')[0])).toBe('');
      rerender(<FestivalEggs {...base} event="mid-autumn" />);
      const lantern = screen.getAllByTestId('festival-lantern')[0];
      expect(animation(lantern)).toBe('');
      expect(lantern.style.opacity).toBe('');
      rerender(<FestivalEggs {...base} event="midsummer" />);
      expect(animation(screen.getAllByTestId('festival-bonfire')[0])).toBe('');
    });

    it('hides the drifting petals and the confetti', () => {
      const { rerender } = render(<FestivalEggs {...day} event="hanami" />);
      expect(screen.queryByTestId('festival-petal')).toBeNull();
      rerender(<FestivalEggs {...day} event="carnival" />);
      expect(screen.queryByTestId('festival-confetti')).toBeNull();
    });

    it('keeps the Nowruz blossoms still and hides their sinking petals', () => {
      render(<FestivalEggs {...day} event="nowruz" />);
      const blossoms = screen.getAllByTestId('festival-blossom');
      expect(blossoms).toHaveLength(7);
      expect(animation(blossoms[0])).toBe('');
      expect(screen.queryByTestId('festival-nowruz-petal')).toBeNull();
    });
  });

  it('opens the festival card on a double tap (item 116)', () => {
    vi.useFakeTimers();
    const onInfo = vi.fn();
    render(<FestivalEggs {...base} event="diwali" onInfo={onInfo} />);
    const diya = screen.getAllByTestId('festival-diya')[0];
    fireEvent.click(diya, { clientX: 10, clientY: 20 });
    expect(onInfo).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(diya, { clientX: 10, clientY: 20 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'diwali' }, { x: 10, y: 20 }, 'egg-diya-0');
    vi.useRealTimers();
  });
});
