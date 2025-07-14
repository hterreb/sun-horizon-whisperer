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

// Mock HTMLCanvasElement.getContext to avoid jsdom errors in canvas-based components
HTMLCanvasElement.prototype.getContext = HTMLCanvasElement.prototype.getContext || (() => {
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

// Mock ResizeObserver for jsdom
global.ResizeObserver =
  global.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// Add any global mocks here if needed 