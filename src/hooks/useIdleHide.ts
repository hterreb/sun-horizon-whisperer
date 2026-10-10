import { useCallback, useEffect, useRef, useState } from 'react';
import { DOUBLE_TAP_MS } from './useDoubleTap';

// Fullscreen idle fade (ROADMAP item 89). Entering fullscreen hides after ENTER_HIDE_MS;
// a wake (a mouse move, a tap, a hover, a focus) before this first hide starts
// ENTER_HIDE_MS again. After the first hide, a wake shows and hides after WAKE_HIDE_MS.
// Leaving fullscreen shows at once.
// Item 132: hidden controls take no taps (`isTappable` false). After a wake they take taps
// again only after TAP_READY_MS, longer than a double tap: the second tap of a double tap
// cannot click a control that the first tap brought back.
export const ENTER_HIDE_MS = 3000;
export const WAKE_HIDE_MS = 10000;
export const TAP_READY_MS = DOUBLE_TAP_MS + 50;

export interface IdleHide {
  isVisible: boolean;
  isTappable: boolean;
  wake: () => void;
}

export const useIdleHide = (isActive: boolean): IdleHide => {
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

  const hideAfter = useCallback((ms: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      hasHiddenRef.current = true;
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      setIsVisible(false);
      setIsTappable(false);
    }, ms);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    hasHiddenRef.current = false;
    hideAfter(ENTER_HIDE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, [isActive, hideAfter]);

  const wake = useCallback(() => {
    if (!isActive) return;
    setIsVisible(true);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setIsTappable(true), TAP_READY_MS);
    hideAfter(hasHiddenRef.current ? WAKE_HIDE_MS : ENTER_HIDE_MS);
  }, [isActive, hideAfter]);

  return { isVisible, isTappable: !isActive || isTappable, wake };
};

// Outside SunTracker (tests, or no fullscreen): always shown, always takes taps.
export const ALWAYS_SHOWN: IdleHide = { isVisible: true, isTappable: true, wake: () => {} };
