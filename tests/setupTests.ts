import { beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom';
import { loadDictionary } from '@/i18n';

// The non-en dictionaries load on demand in the app (ROADMAP item 125); tests use them directly.
await Promise.all((['de', 'es', 'it', 'fr'] as const).map(loadDictionary));

// React.lazy (ROADMAP item 125) in tests: start the import when the component is
// defined, and wait for it before the tests of the file, so the component is ready at
// the first render and the tests stay synchronous.
// ponytail: tests do not cover the lazy loading itself; the browser check does.
const lazyLoads = vi.hoisted(() => [] as Promise<void>[]);
beforeAll(() => Promise.all(lazyLoads));
vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof import('react')>();
  const lazy = <P extends object>(factory: () => Promise<{ default: React.ComponentType<P> }>) => {
    let Component: React.ComponentType<P> | null = null;
    const load = factory().then((m) => { Component = m.default; });
    lazyLoads.push(load);
    const Lazy = (props: P) => {
      if (!Component) throw load;
      return react.createElement(Component, props);
    };
    return Lazy;
  };
  return { ...react, default: { ...react, lazy }, lazy };
});

// Polyfill window.matchMedia for jsdom
global.window.matchMedia = global.window.matchMedia || function(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: function() {}, // deprecated
    removeListener: function() {}, // deprecated
    addEventListener: function() {},
    removeEventListener: function() {},
    dispatchEvent: function() { return false; }
  };
};

// Mock HTMLCanvasElement.getContext to avoid jsdom errors in canvas-based components.
// jsdom already defines getContext (as a throwing "Not implemented" stub), so it must
// be overridden unconditionally rather than via `||`.
HTMLCanvasElement.prototype.getContext = (() => {
  // Return a minimal mock context
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    arcTo: () => {},
    strokeRect: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
    // Add more methods if needed
  };
});

// Stub HTMLMediaElement play/pause: jsdom does not implement them, which
// otherwise logs "Not implemented" errors whenever a component (e.g.
// MusicPlayer) calls them. Individual tests may still override `play` with
// their own vi.spyOn to assert on call counts.
HTMLMediaElement.prototype.play = function () {
  return Promise.resolve();
};
HTMLMediaElement.prototype.pause = function () {};

// Mock ResizeObserver for jsdom
global.ResizeObserver =
  global.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// Add any global mocks here if needed 