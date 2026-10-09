import { useCallback, useEffect, useRef, useState } from 'react';
import type { SceneInfoHandler } from '@/components/CloudLayer';
import type { SceneInfoTarget } from '@/utils/sceneInfo';

// Item 116: a scene thing opens its info card (and collects its badge) only on a double tap:
// two taps on the same target (the same ring id) within DOUBLE_TAP_MS. A single tap opens
// nothing; it shows the thing's ring (`hint`) for HINT_MS, so the user sees that it takes taps.
// `immediate` (a keyboard click) opens at once. One rule for all scene hit areas.
export const DOUBLE_TAP_MS = 350;
export const HINT_MS = 600;

export type SceneTapHandler = (target: SceneInfoTarget, point: { x: number; y: number }, ring: string, immediate?: boolean) => void;

export const useDoubleTap = (onInfo?: SceneInfoHandler): { tap: SceneTapHandler; hint: string | null } => {
  const [hint, setHint] = useState<string | null>(null);
  const lastRef = useRef<{ ring: string; at: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const tap = useCallback<SceneTapHandler>((target, point, ring, immediate = false) => {
    const now = Date.now();
    const last = lastRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (immediate || (last && last.ring === ring && now - last.at <= DOUBLE_TAP_MS)) {
      lastRef.current = null;
      setHint(null);
      onInfo?.(target, point, ring);
      return;
    }
    lastRef.current = { ring, at: now };
    setHint(ring);
    timerRef.current = setTimeout(() => setHint(null), HINT_MS);
  }, [onInfo]);

  return { tap, hint };
};
