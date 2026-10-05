import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import SceneInfoCard, { CARD_CLOSE_MS } from '../src/components/SceneInfoCard';
import { type SceneInfo } from '../src/utils/sceneInfo';

// ROADMAP item 95: the glass card above the tapped point.
const INFO: SceneInfo = { title: 'fish.perch', lines: [{ value: { key: 'fishFact.perch' } }, { value: { key: 'info.dayFish' } }] };

describe('SceneInfoCard (ROADMAP item 95)', () => {
  const show = (x = 200, y = 400) => {
    const onClose = vi.fn();
    render(<div><button type="button">elsewhere</button><SceneInfoCard info={INFO} x={x} y={y} onClose={onClose} /></div>);
    return onClose;
  };
  const card = () => screen.getByTestId('scene-info-card');

  afterEach(() => vi.useRealTimers());

  it('shows the title and the rows in the glass style with 18 px corners', () => {
    show();
    expect(screen.getByRole('dialog', { name: 'Perch' })).toBeInTheDocument();
    expect(card()).toHaveTextContent('Its dark stripes hide the perch among water plants.');
    expect(card()).toHaveTextContent('Day fish');
    expect(card().className).toContain('rounded-panel');
    expect(card().className).toContain('backdrop-blur-md');
  });

  it('sits above the tapped point, and inside the screen near an edge', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);
    try {
      show(300, 400);
      expect(card().style.left).toBe('200px'); // centred on x
      expect(card().style.top).toBe('286px'); // 14 px above y
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('stays inside the screen at the right edge and goes below the point at the top', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);
    try {
      show(window.innerWidth - 5, 50);
      expect(card().style.left).toBe(`${window.innerWidth - 208}px`);
      expect(card().style.top).toBe('64px');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('closes on a tap outside, not on a tap on the card', () => {
    const onClose = show();
    fireEvent.pointerDown(card());
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText('elsewhere'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const onClose = show();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes after 15 s', () => {
    vi.useFakeTimers();
    const onClose = show();
    act(() => { vi.advanceTimersByTime(CARD_CLOSE_MS - 1); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
