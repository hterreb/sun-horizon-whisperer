import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Santa, { SANTA_RING, SANTA_WIDTH, SantaShape } from '@/components/Santa';

// Christmas Eve (ROADMAP "Ongoing", Calendar): Santa's sleigh glides once across the night sky.
describe('Santa', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const fly = (innerWidth: number, random: number) => {
    vi.stubGlobal('innerWidth', innerWidth);
    vi.spyOn(Math, 'random').mockReturnValue(random);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onDone = vi.fn();
    render(<Santa onDone={onDone} />);
    const x = () => parseFloat(screen.getByTestId('santa').style.transform.replace('translateX(', ''));
    const at = (ms: number) => act(() => { frames.shift()!(ms); });
    return { onDone, x, at };
  };

  it('glides left to right at 2.5 % of a phone width per second, then calls onDone', () => {
    // 390 px phone: 9.75 px/s, so 390 + 120 px take about 52 s.
    const { onDone, x, at } = fly(390, 0.2);
    expect(screen.getByTestId('santa').getAttribute('data-direction')).toBe('right');
    at(0);
    expect(x()).toBe(-SANTA_WIDTH);
    at(10_000);
    expect(x()).toBeCloseTo(-SANTA_WIDTH + 97.5);
    at(52_000);
    expect(onDone).not.toHaveBeenCalled();
    at(52_400);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keeps the phone speed in px/s on a wide screen (calm motion)', () => {
    // 1920 px: still 9.75 px/s, not 48 px/s.
    const { x, at } = fly(1920, 0.2);
    at(0);
    at(10_000);
    expect(x()).toBeCloseTo(-SANTA_WIDTH + 97.5);
  });

  it('can fly right to left, the drawing mirrored', () => {
    const { x, at } = fly(390, 0.8);
    const santa = screen.getByTestId('santa');
    expect(santa.getAttribute('data-direction')).toBe('left');
    expect((santa.firstElementChild as HTMLElement).style.transform).toBe('scaleX(-1)');
    at(0);
    expect(x()).toBe(390);
    at(10_000);
    expect(x()).toBeCloseTo(390 - 97.5);
  });

  it('a tap opens his info card; the ring shows while the card is open (item 113)', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const onInfo = vi.fn();
    const { rerender } = render(<Santa onDone={vi.fn()} onInfo={onInfo} />);
    const santa = screen.getByTestId('santa');
    expect(santa.className).toContain('pointer-events-auto');
    const hit = santa.querySelector<HTMLElement>('[data-testid="scene-hit"]')!;
    expect(parseFloat(hit.style.height)).toBeGreaterThanOrEqual(44);
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
