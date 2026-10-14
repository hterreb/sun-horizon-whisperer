import { type RefObject, useEffect, useState } from 'react';

// The scene's size (ROADMAP item 151), shared by SunVisualization (and so SeaCanvas), SkyClouds,
// NightStars and RainCanvas. React 18 renders a `setState` from a `resize` listener at once, inside
// the event, so each `resize` rebuilt the scene before Chrome could paint the new size, and a
// rotation fires several as the system bars settle. Here a `resize` only restarts one shared timer.
// VIEWPORT_DEBOUNCE_MS after the last one, the timer reads each user's size and sets its state, so
// all users change in one render, after Chrome has painted the new size.
export const VIEWPORT_DEBOUNCE_MS = 150;

export interface ViewportSize {
  width: number;
  height: number;
}

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

const onResize = () => {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    listeners.forEach((listener) => listener());
  }, VIEWPORT_DEBOUNCE_MS);
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener('resize', onResize);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    window.removeEventListener('resize', onResize);
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
};

const windowSize = (): ViewportSize => ({ width: window.innerWidth, height: window.innerHeight });

// The window's inner size. With `element`: that element's client size instead, 0 × 0 until the
// mount effect measures it (SunVisualization's h-dvh box, which keeps its size when the keyboard
// shrinks only the visual viewport).
export const useViewportSize = (element?: RefObject<HTMLElement | null>): ViewportSize => {
  const [size, setSize] = useState<ViewportSize>(() => (element ? { width: 0, height: 0 } : windowSize()));
  useEffect(() => {
    const update = () => {
      const node = element?.current;
      const next = !element ? windowSize() : node ? { width: node.clientWidth, height: node.clientHeight } : null;
      if (next) setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };
    if (element) update();
    return subscribe(update);
  }, [element]);
  return size;
};
