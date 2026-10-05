import { render, fireEvent } from '@testing-library/react';
import SceneHuntFx from '../src/components/SceneHuntFx';
import { type HuntFx } from '../src/utils/sharkHunt';

const fx = (extra: Partial<HuntFx> = {}): HuntFx => ({
  id: 1, x: 50, y: 85, unit: 1, tone: 'day', ripple: { dx: -8, delay: 2.1 }, ...extra,
});

// jsdom has no AnimationEvent: an animationend with its animation's name, as a browser sends it.
const endAnimation = (element: Element, animationName: string) => {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: animationName });
  fireEvent(element, event);
};

describe('SceneHuntFx (ROADMAP item 94)', () => {
  it('stays at the meeting point and opens the ripple ring above it after its delay (X1)', () => {
    const { getByTestId } = render(<SceneHuntFx fx={fx()} onDone={() => {}} />);
    const root = getByTestId('hunt-fx');
    expect(root.style.left).toBe('50%');
    expect(root.style.top).toBe('85%');
    expect(root.getAttribute('style')).not.toContain('animation');
    const ripple = getByTestId('hunt-ripple');
    expect(ripple.getAttribute('style')).toContain('sceneHuntRipple 3.5s linear 2.1s both');
    // 16.6 grid units wide (half) at the end, centred 8 px behind the meeting point.
    expect(ripple.getAttribute('width')).toBe('33.2');
    expect(parseFloat(ripple.style.left) + 16.6).toBeCloseTo(-8);
  });

  it('lets the H1 bubbles rise from the body line, one after the other', () => {
    const bubbles = [0, 0.45, 1, 1.6].map((delay, i) => ({ dx: -5 - i, delay: 1.2 + delay, r: 1 }));
    const { getAllByTestId } = render(<SceneHuntFx fx={fx({ bubbles })} onDone={() => {}} />);
    const drawn = getAllByTestId('hunt-bubble');
    expect(drawn).toHaveLength(4);
    expect(drawn[3].getAttribute('style')).toContain('sceneHuntBubble 2.2s linear 2.8s both');
    expect(drawn[0].style.getPropertyValue('--rise')).toBe('-5.4px');
  });

  it('calls onDone at the end of the ripple only', () => {
    const onDone = vi.fn();
    const { getByTestId } = render(<SceneHuntFx fx={fx({ bubbles: [{ dx: 0, delay: 0, r: 1 }] })} onDone={onDone} />);
    endAnimation(getByTestId('hunt-bubble'), 'sceneHuntBubble');
    expect(onDone).not.toHaveBeenCalled();
    endAnimation(getByTestId('hunt-ripple'), 'sceneHuntRipple');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('uses the glint colour of the light', () => {
    const { container } = render(<SceneHuntFx fx={fx({ tone: 'moon' })} onDone={() => {}} />);
    expect(container.querySelector('ellipse')!.getAttribute('style')).toContain('--scene-moon');
  });
});
