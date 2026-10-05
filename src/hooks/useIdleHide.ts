import { useCallback, useEffect, useRef, useState } from 'react';

// Fullscreen idle fade (ROADMAP item 89). Entering fullscreen hides after ENTER_HIDE_MS;
// a wake (a mouse move, a tap, a hover, a focus) before this first hide starts
// ENTER_HIDE_MS again. After the first hide, a wake shows and hides after WAKE_HIDE_MS.
// Leaving fullscreen shows at once.
export const ENTER_HIDE_MS = 3000;
export const WAKE_HIDE_MS = 10000;

export const useIdleHide = (isActive: boolean): { isVisible: boolean; wake: () => void } => {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHiddenRef = useRef(false);

  // Show at once when fullscreen toggles (either direction); the effect below then
  // arms the timer for fullscreen. Adjusting state during render avoids an extra commit.
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  if (isActive !== prevIsActive) {
    setPrevIsActive(isActive);
    setIsVisible(true);
  }

  const hideAfter = useCallback((ms: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      hasHiddenRef.current = true;
      setIsVisible(false);
    }, ms);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    hasHiddenRef.current = false;
    hideAfter(ENTER_HIDE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isActive, hideAfter]);

  const wake = useCallback(() => {
    if (!isActive) return;
    setIsVisible(true);
    hideAfter(hasHiddenRef.current ? WAKE_HIDE_MS : ENTER_HIDE_MS);
  }, [isActive, hideAfter]);

  return { isVisible, wake };
};
