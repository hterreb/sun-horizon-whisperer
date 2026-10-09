import { useCallback, useRef } from 'react';
import type { SceneInfoHandler } from '@/components/CloudLayer';
import type { SceneInfoTarget } from '@/utils/sceneInfo';

// Item 116: a scene thing opens its info card (and collects its badge) only on a double tap:
// two taps on the same target (the same ring id) within DOUBLE_TAP_MS. A single tap opens and
// shows nothing (no ring). `immediate` (a keyboard click) opens at once. One rule for all
// scene hit areas.
export const DOUBLE_TAP_MS = 350;

export type SceneTapHandler = (target: SceneInfoTarget, point: { x: number; y: number }, ring: string, immediate?: boolean) => void;

export const useDoubleTap = (onInfo?: SceneInfoHandler): { tap: SceneTapHandler } => {
  const lastRef = useRef<{ ring: string; at: number } | null>(null);

  const tap = useCallback<SceneTapHandler>((target, point, ring, immediate = false) => {
    const now = Date.now();
    const last = lastRef.current;
    if (immediate || (last && last.ring === ring && now - last.at <= DOUBLE_TAP_MS)) {
      lastRef.current = null;
      onInfo?.(target, point, ring);
      return;
    }
    lastRef.current = { ring, at: now };
  }, [onInfo]);

  return { tap };
};
