import { useEffect, useRef, type RefObject } from 'react';
import { getScenePlaybackRate, type PlayDirection } from '@/utils/timeTravel';

// A reversed infinite animation (the cloud drift) stops at its start and then loses its
// transform. In rewind it keeps at least half an hour of animation time in reserve.
const REWIND_RESERVE_MS = 3_600_000;

// Animations that keep live speed: CSS transitions (a colour change must not run back), and
// all animations inside an element marked `data-live-speed` (snow and hail, as the rain).
const keepsLiveSpeed = (animation: Animation): boolean => {
  if ('transitionProperty' in animation) return true;
  const target = (animation.effect as KeyframeEffect | null)?.target;
  return target?.closest('[data-live-speed]') != null;
};

// Sets the play rate (ROADMAP item 83, SP1) on each animation under `container`, so new
// kinds of scene animation follow without a list of names. The first call after a direction
// change turns the animations where they are. A later call finds the spawns since the call
// before by their rate: in rewind such a spawn starts at its end (delay included), so it
// comes in from the right. A reversed animation fires `animationend` at its start, which
// removes the entity as in live mode.
export const applyScenePlaybackRate = (container: Element, direction: PlayDirection, directionChanged: boolean): void => {
  const rate = getScenePlaybackRate(direction);
  for (const animation of container.getAnimations({ subtree: true })) {
    if (keepsLiveSpeed(animation)) continue;
    const timing = animation.effect?.getComputedTiming();
    const end = Number(timing?.endTime);
    if (rate < 0) {
      const current = Number(animation.currentTime);
      if (end === Infinity) {
        // Whole periods (two iterations, for `alternate`) keep the animation's phase.
        const period = 2 * Number(timing?.duration);
        if (period > 0 && current < REWIND_RESERVE_MS / 2) {
          animation.currentTime = current + Math.ceil(REWIND_RESERVE_MS / period) * period;
        }
      } else if (animation.playbackRate !== rate && !directionChanged) {
        animation.currentTime = end;
      }
    }
    if (animation.playbackRate !== rate) animation.playbackRate = rate;
  }
};

// The scene under `containerRef` follows time-travel play. The effect runs after each render:
// during play CloudLayer renders on each clock tick (100 ms) and on each spawn, so new spawns
// follow at once. Live and paused: rate 1, set once after play.
export const useScenePlaybackRate = (containerRef: RefObject<Element | null>, direction: PlayDirection): void => {
  const lastDirectionRef = useRef<PlayDirection>(0);
  useEffect(() => {
    const last = lastDirectionRef.current;
    lastDirectionRef.current = direction;
    const container = containerRef.current;
    // jsdom has no Web Animations API.
    if (!container || typeof container.getAnimations !== 'function' || (direction === 0 && last === 0)) return;
    applyScenePlaybackRate(container, direction, direction !== last);
  });
};
