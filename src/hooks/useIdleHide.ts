import { useCallback, useEffect, useRef, useState } from 'react';
import { DOUBLE_TAP_MS } from './useDoubleTap';

// Fullscreen idle fade (ROADMAP item 89). Entering fullscreen hides after ENTER_HIDE_MS;
// a wake (a mouse move, a tap, a hover, a focus) before this first hide starts
// ENTER_HIDE_MS again. After the first hide, a wake shows and hides after WAKE_HIDE_MS.
// Leaving fullscreen shows at once.
// Item 132: hidden controls take no taps (`isTappable` false). After a wake they take taps
// again only after TAP_READY_MS, longer than a double tap: the second tap of a double tap
// cannot click a control that the first tap brought back.
// Item 136: `toggle` (a tap on the empty sky) hides at once and with no timer, so the controls
// stay hidden until the next toggle or wake; when they are hidden, it does the same as `wake`.
// `enterHideMs` null (the installed app, where nobody enters fullscreen): no hide before the
// first toggle.
export const ENTER_HIDE_MS = 3000;
export const WAKE_HIDE_MS = 10000;
export const TAP_READY_MS = DOUBLE_TAP_MS + 50;

export interface IdleHide {
  isVisible: boolean;
  isTappable: boolean;
  wake: () => void;
  toggle: () => void;
}

export const useIdleHide = (isActive: boolean, enterHideMs: number | null = ENTER_HIDE_MS): IdleHide => {
  const [isVisible, setIsVisible] = useState(true);
  const [isTappable, setIsTappable] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHiddenRef = useRef(false);

  // Show at once when fullscreen toggles (either direction); the effect below then
  // arms the timer for fullscreen. Adjusting state during render avoids an extra commit.
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  if (isActive !== prevIsActive) {
    setPrevIsActive(isActive);
    setIsVisible(true);
    setIsTappable(true);
  }

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    hasHiddenRef.current = true;
    setIsVisible(false);
    setIsTappable(false);
  }, []);

  // `null`: no timer, the controls stay as they are.
  const hideAfter = useCallback((ms: number | null) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (ms !== null) timeoutRef.current = setTimeout(hide, ms);
  }, [hide]);

  useEffect(() => {
    if (!isActive) return;
    hasHiddenRef.current = false;
    hideAfter(enterHideMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, [isActive, enterHideMs, hideAfter]);

  const wake = useCallback(() => {
    if (!isActive) return;
    setIsVisible(true);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setIsTappable(true), TAP_READY_MS);
    hideAfter(hasHiddenRef.current ? WAKE_HIDE_MS : enterHideMs);
  }, [isActive, enterHideMs, hideAfter]);

  const toggle = useCallback(() => {
    if (!isActive) return;
    if (isVisible) hide();
    else wake();
  }, [isActive, isVisible, hide, wake]);

  return { isVisible, isTappable: !isActive || isTappable, wake, toggle };
};

// Outside SunTracker (tests, or no fullscreen): always shown, always takes taps.
export const ALWAYS_SHOWN: IdleHide = { isVisible: true, isTappable: true, wake: () => {}, toggle: () => {} };
