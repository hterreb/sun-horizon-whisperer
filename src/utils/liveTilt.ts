// How a live plane (ROADMAP item 143, option H of the plane tilt lookbook) points along its way
// across the screen. Two views:
// - Side view (the ScenePlane silhouette) up to 60°: turned to the screen direction, at most
//   ±60°; when it moves left it is turned by 180° and mirrored (scaleY(-1)), so the fin stays up.
// - Underside view above 60° (seen from below, as a plane high overhead): it points exactly along
//   the way, also straight up. Back to the side view only below 50°, so a plane near the limit
//   does not roll back and forth.
// `dx`, `dy`: the screen step (px) to 1 s later, y down. Pure: the caller keeps the last tilt
// per plane and passes it back as `prev`.

import { PLANE_ASPECT, PLANE_TRAIL_X, PLANE_TRAIL_Y, PLANE_UNDER_TAIL_X } from '@/components/ScenePlane';

export type LiveView = 'side' | 'under';

export interface LiveTilt {
  angle: number; // rad, the body's turn on the screen (y down). Unwrapped: never the long way round.
  side: 1 | -1; // the side view faces right (1) or left (-1, drawn with scaleY(-1))
  view: LiveView;
  first: boolean; // the plane's first frame: its angle and view come at once, with no transition
}

const DEG = Math.PI / 180;
export const SIDE_MAX_TILT_RAD = 60 * DEG;
export const UNDER_ON_RAD = 60 * DEG; // steeper than this: the underside view
export const UNDER_OFF_RAD = 50 * DEG; // back to the side view only below this
// The side view changes from right to left (or back) only when dx passes ±0.05 px/s, so a plane
// that moves almost straight up or down does not flip back and forth.
export const SIDE_SWITCH_PX_S = 0.05;
// Below this screen speed (px/s) a plane has no clear way: it keeps its last tilt.
export const STILL_PX_S = 0.1;

// 1/50 rad steps, as the trail angle: the memoized body renders again only on a change.
const roundAngle = (a: number): number => Math.round(a * 50) / 50;
// `a` plus the whole turns that bring it nearest to `prev`.
const unwrap = (a: number, prev: number): number => a + 2 * Math.PI * Math.round((prev - a) / (2 * Math.PI));

export const getLiveTilt = (prev: LiveTilt | undefined, dx: number, dy: number): LiveTilt => {
  // Still, or dx unknown (0) at the edge of the 360° view: keep the last tilt.
  if (Math.hypot(dx, dy) < STILL_PX_S || dx === 0) {
    if (prev) return prev.first ? { ...prev, first: false } : prev;
    return { angle: dx < 0 ? Math.PI : 0, side: dx < 0 ? -1 : 1, view: 'side', first: true };
  }
  const side: 1 | -1 = !prev
    ? (dx < 0 ? -1 : 1)
    : dx > SIDE_SWITCH_PX_S ? 1 : dx < -SIDE_SWITCH_PX_S ? -1 : prev.side;
  const steep = Math.atan2(Math.abs(dy), Math.abs(dx)); // 0 level, π/2 straight up or down
  const view: LiveView = steep > UNDER_ON_RAD ? 'under' : !prev || steep < UNDER_OFF_RAD ? 'side' : prev.view;
  // Side view: the climb angle along the way it faces (up is positive), at most ±60°.
  const climb = Math.max(-SIDE_MAX_TILT_RAD, Math.min(SIDE_MAX_TILT_RAD, Math.atan2(-dy, dx * side)));
  const angle = roundAngle(view === 'under' ? Math.atan2(dy, dx) : side > 0 ? -climb : Math.PI + climb);
  return { angle: prev ? unwrap(angle, prev.angle) : angle, side, view, first: !prev };
};

// Where the trail leaves the body as it is drawn (item 142), in px from the plane's middle (y
// down): in the side view the engine (PLANE_TRAIL_X/Y), mirrored with the body when it faces left
// (scaleY(-1)); from below the rear end of the fuselage. Both turned by the body's angle (the
// angle the body glides to).
export const getTailOffset = (tilt: Pick<LiveTilt, 'angle' | 'side' | 'view'>, planeWidth: number): { x: number; y: number } => {
  const [x, y] = tilt.view === 'under'
    ? [(PLANE_UNDER_TAIL_X - 0.5) * planeWidth, 0]
    : [(PLANE_TRAIL_X - 0.5) * planeWidth, tilt.side * (PLANE_TRAIL_Y - 0.5) * planeWidth * PLANE_ASPECT];
  const cos = Math.cos(tilt.angle);
  const sin = Math.sin(tilt.angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
};
