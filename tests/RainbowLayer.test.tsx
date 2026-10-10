import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RainbowLayer, { RAINBOW_OPACITY, RAINBOW_RING } from '../src/components/RainbowLayer';
import type { TimeOfDay } from '../src/utils/sunUtils';

const rainbow = { visible: true, xFraction: 0.5, apexHeightDeg: 20 };
const base = { rainbow, timeOfDay: 'midday' as TimeOfDay, containerWidth: 800, containerHeight: 600 };

describe('RainbowLayer (ROADMAP items 10, 121)', () => {
  it('renders the arc when visible, positioned by xFraction/apexHeightDeg', () => {
    const { container } = render(<RainbowLayer {...base} />);
    const circles = container.querySelectorAll('[data-testid="rainbow"] circle');
    expect(circles).toHaveLength(6);
    expect(circles[0].getAttribute('cx')).toBe(String(0.5 * base.containerWidth));
  });

  it('renders nothing when not visible', () => {
    const { container } = render(<RainbowLayer {...base} rainbow={{ visible: false, xFraction: 0, apexHeightDeg: 0 }} />);
    expect(container.querySelector('circle')).toBeNull();
  });

  it('is faint: opacity 0.2, blurred, the feet fading out', () => {
    render(<RainbowLayer {...base} />);
    const svg = screen.getByTestId('rainbow');
    expect(RAINBOW_OPACITY).toBe(0.2);
    expect(svg.style.opacity).toBe('0.2');
    expect(svg.querySelector('feGaussianBlur')).not.toBeNull();
    expect(svg.querySelector('mask')).not.toBeNull();
  });

  it('takes taps only on the arc stroke, and has no hit path without onInfo', () => {
    const { rerender } = render(<RainbowLayer {...base} />);
    expect(screen.queryByTestId('rainbow-hit')).toBeNull();
    rerender(<RainbowLayer {...base} onInfo={vi.fn()} />);
    const hit = screen.getByTestId('rainbow-hit');
    expect(hit.style.pointerEvents).toBe('stroke');
    expect(hit.getAttribute('fill')).toBe('none');
    expect(hit.hasAttribute('data-scene-hit')).toBe(true);
    expect(hit.getAttribute('class')).toContain('touch-manipulation');
    // The hit svg stops above the horizon, so the pot of gold at the foot keeps its tap.
    expect(Number(hit.closest('svg')!.getAttribute('height'))).toBeLessThan(base.containerHeight * 0.65);
  });

  it('opens its card on a double tap, not on one tap', () => {
    const onInfo = vi.fn();
    render(<RainbowLayer {...base} onInfo={onInfo} />);
    const hit = screen.getByTestId('rainbow-hit');
    fireEvent.click(hit);
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(hit);
    expect(onInfo).toHaveBeenCalledWith({ type: 'rainbow' }, expect.anything(), RAINBOW_RING);
  });

  it('shows the ring while its card is open', () => {
    const { rerender } = render(<RainbowLayer {...base} onInfo={vi.fn()} />);
    expect(screen.queryAllByTestId('scene-info-ring')).toHaveLength(0);
    rerender(<RainbowLayer {...base} onInfo={vi.fn()} infoRing={RAINBOW_RING} />);
    expect(screen.getAllByTestId('scene-info-ring').length).toBeGreaterThan(0);
  });

  it('draws nothing and takes no taps at night', () => {
    render(<RainbowLayer {...base} timeOfDay="night" onInfo={vi.fn()} />);
    expect(screen.queryByTestId('rainbow')).toBeNull();
    expect(screen.queryByTestId('rainbow-hit')).toBeNull();
  });
});
