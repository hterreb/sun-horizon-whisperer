import '@testing-library/jest-dom';

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