import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Santa, { FAR_SPEED, FAR_WIDTH, MOON_WIDTH_PER_R, SANTA_RING, SantaShape } from '@/components/Santa';
import { playSleighBells } from '@/utils/sleighBells';

vi.mock('@/utils/sleighBells', () => ({ playSleighBells: vi.fn(() => 0) }));

// Christmas Eve (ROADMAP "Ongoing", Calendar): Santa's sleigh glides once across the night sky.
describe('Santa', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.mocked(playSleighBells).mockClear();
  });

  const fly = (innerWidth: number, random: number, props: Partial<React.ComponentProps<typeof Santa>> = {}) => {
    vi.stubGlobal('innerWidth', innerWidth);
    vi.spyOn(Math, 'random').mockReturnValue(random);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onDone = vi.fn();
    render(<Santa onDone={onDone} {...props} />);
    const x = () => parseFloat(screen.getByTestId('santa').style.transform.replace('translateX(', ''));
    const greeting = () => parseFloat(screen.getByTestId('santa-greeting').style.opacity);
    const at = (ms: number) => act(() => { frames.shift()!(ms); });
    return { onDone, x, at, greeting };
  };
  const MOON = { x: 100, y: 200, r: 28 };

  it('S4: without the moon he is small and far, at 0.45 x the speed, and stops in the middle', () => {
    // 390 px phone: 0.45 x 9.75 = 4.3875 px/s; 24 px wide, from -24 to the stop at 195 - 12.
    const v = 9.75 * FAR_SPEED;
    const { onDone, x, at, greeting } = fly(390, 0.2);
    const santa = screen.getByTestId('santa');
    expect(santa.getAttribute('data-mode')).toBe('far');
    expect(santa.style.top).toBe('23%');
    expect(santa.querySelector('svg')!.getAttribute('width')).toBe(String(FAR_WIDTH));
    at(0);
    expect(x()).toBe(-FAR_WIDTH);
    at(10_000);
    expect(x()).toBeCloseTo(-FAR_WIDTH + 10 * v);
    expect(greeting()).toBe(0);
    // He stands still at 183 from tB = (207 - 1.5 v) / v + 3 to tB + 5, and says "Ho ho ho!".
    const tB = (207 - 1.5 * v) / v + 3;
    at((tB + 2.5) * 1000);
    expect(x()).toBeCloseTo(183);
    expect(greeting()).toBe(1);
    at((tB + 4.5) * 1000);
    expect(x()).toBeCloseTo(183);
    expect(greeting()).toBeCloseTo(0.5);
    // Done when 390 + 24 px are flown: tD + (414 - 207 - 1.5 v) / v.
    const end = tB + 8 + (414 - 207 - 1.5 * v) / v;
    at((end - 0.2) * 1000);
    expect(onDone).not.toHaveBeenCalled();
    at((end + 0.2) * 1000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keeps the phone speed in px/s on a wide screen (calm motion)', () => {
    // 1920 px: still 9.75 px/s, not 48 px/s.
    const { x, at } = fly(1920, 0.2, { moon: { x: 1500, y: 300, r: 24 } });
    const w = Math.round(24 * MOON_WIDTH_PER_R);
    at(0);
    at(10_000);
    expect(x()).toBeCloseTo(-w + 97.5);
  });

  it('S2: with the moon he crosses it at its centre height, about 1.93 x its radius wide, and stops on it', () => {
    // Right to left from 390 to the stop at 100 - 27 = 73 (317 px), 9.75 px/s.
    const { x, at, greeting } = fly(390, 0.8, { moon: MOON });
    const santa = screen.getByTestId('santa');
    expect(santa.getAttribute('data-mode')).toBe('moon');
    expect(santa.getAttribute('data-direction')).toBe('left');
    expect((santa.firstElementChild as HTMLElement).style.transform).toBe('scaleX(-1)');
    expect(santa.querySelector('svg')!.getAttribute('width')).toBe('54');
    expect(parseFloat(santa.style.top)).toBeCloseTo(200 - (54 * 32 / 120) / 2);
    expect(santa.querySelector('[data-testid="santa-nose-glow"]')).toBeNull();
    at(0);
    expect(x()).toBe(390);
    at(10_000);
    expect(x()).toBeCloseTo(390 - 97.5);
    const tB = (317 - 1.5 * 9.75) / 9.75 + 3;
    at((tB + 1) * 1000);
    expect(x()).toBeCloseTo(73);
    expect(greeting()).toBe(1);
  });

  it('S2: follows the moon\'s latest place (the first one can be from before the layout), keeps it when the moon hides', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onDone = vi.fn();
    const { rerender } = render(<Santa onDone={onDone} moon={{ x: 4, y: 17, r: 28 }} />);
    const santa = screen.getByTestId('santa');
    const at = (ms: number) => act(() => { frames.shift()!(ms); });
    at(0);
    rerender(<Santa onDone={onDone} moon={{ x: 100, y: 300, r: 28 }} />);
    at(1000);
    expect(parseFloat(santa.style.top)).toBeCloseTo(300 - 7.2);
    rerender(<Santa onDone={onDone} moon={null} />);
    // Stops on the moon at 100 - 27 = 73: 127 px from -54.
    const tB = (127 - 1.5 * 9.75) / 9.75 + 3;
    at((tB + 1) * 1000);
    expect(parseFloat(santa.style.transform.replace('translateX(', ''))).toBeCloseTo(73);
    expect(parseFloat(santa.style.top)).toBeCloseTo(300 - 7.2);
    expect(santa.getAttribute('data-mode')).toBe('moon');
  });

  it('S2: never flies back when the moon moves behind him before he slows down (compass pan)', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onDone = vi.fn();
    const { rerender } = render(<Santa onDone={onDone} moon={{ x: 330, y: 200, r: 28 }} />);
    const santa = screen.getByTestId('santa');
    const x = () => parseFloat(santa.style.transform.replace('translateX(', ''));
    const xs: number[] = [];
    for (let ms = 0; ms <= 60_000 && !onDone.mock.calls.length; ms += 250) {
      // At 20 s he has flown 195 px (x 141); the moon now sits at 100, behind him.
      if (ms === 20_000) rerender(<Santa onDone={onDone} moon={{ x: 100, y: 200, r: 28 }} />);
      act(() => { frames.shift()!(ms); });
      if (!onDone.mock.calls.length) xs.push(x());
    }
    for (let i = 1; i < xs.length; i++) expect(xs[i], `frame ${i}`).toBeGreaterThanOrEqual(xs[i - 1] - 1e-9);
    // He slows down from where he is and stops 1.5 v further on.
    expect(Math.max(...xs.slice(80, 100))).toBeLessThanOrEqual(-54 + 9.75 * 20.25 + 1.5 * 9.75 + 1e-6);
  });

  it('keeps his path when the window resizes mid-flight (speed and start latched)', () => {
    const { x, at } = fly(390, 0.8);
    at(0);
    at(10_000);
    const before = x();
    vi.stubGlobal('innerWidth', 1200);
    at(10_500);
    expect(x()).toBeCloseTo(before - 0.5 * 9.75 * FAR_SPEED);
  });

  it('still ends (onDone) with a zero window width', () => {
    const { onDone, at } = fly(0, 0.2);
    for (let ms = 0; ms <= 200_000 && !onDone.mock.calls.length; ms += 1000) at(ms);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('S4: a red glow on Rudolph\'s nose, inside the mirrored drawing, and a tap target of 44 px', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    render(<Santa onDone={vi.fn()} onInfo={vi.fn()} />);
    const santa = screen.getByTestId('santa');
    const glow = screen.getByTestId('santa-nose-glow');
    expect(glow.parentElement).toBe(santa.firstElementChild);
    expect(glow.parentElement!.style.transform).toBe('scaleX(-1)');
    expect(parseFloat(glow.style.left)).toBeCloseTo(109.8 * 0.2 - 2.4);
    expect(parseFloat(glow.style.top)).toBeCloseTo(12.7 * 0.2 - 2.4);
    expect(glow.style.background).toBe('rgb(255, 80, 80)');
    expect(glow.style.filter).toBe('blur(2px)');
    const hit = santa.querySelector<HTMLElement>('[data-testid="scene-hit"]')!;
    expect(parseFloat(hit.style.width)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(hit.style.height)).toBeGreaterThanOrEqual(44);
  });

  it('S9: rings the bells once when he enters, with the sound setting', () => {
    const { at } = fly(390, 0.2, { soundOn: true });
    at(0);
    at(1000);
    expect(playSleighBells).toHaveBeenCalledTimes(1);
    // No running AudioContext in the test: the util gets null and plays nothing.
    expect(playSleighBells).toHaveBeenCalledWith(null, true);
  });

  it('S9: passes the sound off to the bells', () => {
    const { at } = fly(390, 0.2);
    at(0);
    expect(playSleighBells).toHaveBeenCalledWith(null, false);
  });

  it('a double tap opens his info card; the ring shows while the card is open (items 113, 116)', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onInfo = vi.fn();
    const { rerender } = render(<Santa onDone={vi.fn()} onInfo={onInfo} />);
    const santa = screen.getByTestId('santa');
    expect(santa.className).toContain('pointer-events-auto');
    expect(santa.className).toContain('touch-manipulation');
    const hit = santa.querySelector<HTMLElement>('[data-testid="scene-hit"]')!;
    expect(parseFloat(hit.style.height)).toBeGreaterThanOrEqual(44);
    fireEvent.click(hit, { clientX: 60, clientY: 90 });
    // One tap: no card, only the ring for a moment.
    expect(onInfo).not.toHaveBeenCalled();
    expect(santa.querySelector('[data-testid="scene-info-ring"]')).not.toBeNull();
    fireEvent.click(hit, { clientX: 60, clientY: 90 });
    expect(onInfo).toHaveBeenCalledWith({ type: 'egg', kind: 'santa' }, { x: 60, y: 90 }, SANTA_RING);
    expect(santa.querySelector('[data-testid="scene-info-ring"]')).toBeNull();
    rerender(<Santa onDone={vi.fn()} onInfo={onInfo} ringOn ringTier="ultraRare" />);
    expect(santa.querySelector('[data-testid="scene-info-ring"]')!.className).toContain('border-tier-ultra-rare/80');
  });

  it('draws a sleigh with four reindeer; Rudolph\'s red nose is the one colour', () => {
    const { container } = render(<SantaShape width={64} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('64');
    expect(svg.querySelectorAll('ellipse')).toHaveLength(4);
    expect(svg.querySelectorAll('[fill="#EF4444"]')).toHaveLength(1);
  });
});
