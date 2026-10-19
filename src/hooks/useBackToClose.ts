import { useEffect, useRef } from 'react';

// Item 173: on a phone, Back closes the open panel, search or dialog first. Each open layer
// adds a history entry (same URL); Back (popstate) closes the top layer only. A layer closed
// in the UI takes its entry back with history.back(), and that popstate is ignored, so after
// all layers are closed a Back leaves the app as before.
// ponytail: module state, one stack for the page; a second React root would share it.
interface Layer {
  close: () => void;
}

const layers: Layer[] = [];
let ignoredPops = 0;
let isListening = false;

const onPopState = () => {
  if (ignoredPops > 0) {
    ignoredPops -= 1;
    return;
  }
  // The top layer leaves the stack before it closes, so its cleanup takes no entry back.
  layers.pop()?.close();
};

export const useBackToClose = (isOpen: boolean, close: () => void, isEnabled = true): void => {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    if (!isOpen || !isEnabled) return;
    if (!isListening) {
      window.addEventListener('popstate', onPopState);
      isListening = true;
    }
    const layer: Layer = { close: () => closeRef.current() };
    layers.push(layer);
    window.history.pushState(window.history.state, '');
    return () => {
      const index = layers.indexOf(layer);
      if (index === -1) return; // closed by Back: its entry is gone already
      layers.splice(index, 1);
      ignoredPops += 1;
      window.history.back();
    };
  }, [isOpen, isEnabled]);
};
