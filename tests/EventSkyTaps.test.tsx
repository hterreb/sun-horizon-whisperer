import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EventSkyTaps from '../src/components/EventSkyTaps';

// Item 123 (decision 2026-10-10): the tap areas of the sky-wide events, in the lowest scene layer.
const doubleTap = (el: Element) => {
  fireEvent.click(el, { detail: 1 });
  fireEvent.click(el, { detail: 2 });
};

describe('EventSkyTaps', () => {
  it('has no tap areas without an event, and no z-index', () => {
    render(<EventSkyTaps onInfo={vi.fn()} aurora={false} meteorShower={false} fireworks={null} />);
    const layer = screen.getByTestId('event-sky-taps');
    expect(layer.children).toHaveLength(0);
    expect(layer.className).toContain('pointer-events-none');
    expect(layer.className).not.toMatch(/\bz-/);
    expect(layer.style.zIndex).toBe('');
  });

  it('opens the aurora, meteor shower and fireworks cards on a double tap, not on one tap', () => {
    const onInfo = vi.fn();
    const { rerender } = render(<EventSkyTaps onInfo={onInfo} aurora meteorShower={false} fireworks={null} />);
    const band = screen.getAllByTestId('aurora-tap')[1];
    expect(band.className).toContain('pointer-events-auto');
    expect(band.hasAttribute('data-scene-hit')).toBe(true);
    fireEvent.click(band, { detail: 1 });
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(band, { detail: 2 });
    expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'aurora' }, expect.anything(), 'egg-aurora');
    rerender(<EventSkyTaps onInfo={onInfo} aurora={false} meteorShower fireworks={null} />);
    doubleTap(screen.getByTestId('meteor-tap'));
    expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'meteorShower' }, expect.anything(), 'egg-meteor-shower');
    rerender(<EventSkyTaps onInfo={onInfo} aurora={false} meteorShower={false} fireworks="bastilleDay" />);
    doubleTap(screen.getByTestId('fireworks-tap'));
    expect(onInfo).toHaveBeenLastCalledWith({ type: 'egg', kind: 'bastilleDay' }, expect.anything(), 'egg-fireworks');
  });

  it('takes no taps without onInfo', () => {
    render(<EventSkyTaps aurora meteorShower fireworks="fireworks" />);
    expect(screen.getByTestId('event-sky-taps').children).toHaveLength(0);
  });
});
