// The live planes' contrails (ROADMAP item 142, SUN-CHASER-1H and 1N): each trail is fixed in
// the sky. A point is made where the plane is, and it never moves after that. Pure: the trail
// history per plane in sky points (azimuth, elevation, time), and its segments on the screen
// with an opacity and a width by age. No React, no DOM.

import { MAX_COMPASS_PLANES } from './liveRadar';
import { getTrailOpacity } from './planes';

// A trail is never longer than this (s), whatever the forecast: also the persistent one, which
// lasts 10-15 min in the decorative scene.
export const MAX_TRAIL_SEC = 600;
// A point every 5 s, plus the live head. With reduced motion, only the feed's points (one with
// each answer, every 15 s): 0 = a point at each update.
export const TRAIL_POINT_MS = 5_000;
export const REDUCED_TRAIL_POINT_MS = 0;
// At most this many points per plane (600 s at one every 5 s), and at most this many trails,
// fading ones included: the oldest fading trail goes first.
export const MAX_TRAIL_POINTS = 120;
export const MAX_TRAILS = MAX_COMPASS_PLANES;
// A plane that shows again after this long starts a new trail (also after the page was hidden).
export const TRAIL_GAP_MS = 30_000;
// The fade in steps over the life: the segments of one step are drawn as one path.
export const TRAIL_FADE_STEPS = 20;
// The head follows the plane's tail when the body turns or rolls (item 143: a 2 s glide) at
// most this fast, so it lags a little but never jumps. Reduced motion has no glide: its updates
// are 15 s apart, so the head takes the new place at once.
export const TAIL_SHIFT_PX_S = 4;

// A point of the trail: where the plane was in the sky, when, and where its tail was on the
// screen relative to that place (px; `getTailOffset`), so that the trail leaves the plane there.
export interface SkyPoint {
  az: number;
  el: number;
  t: number; // ms
  ox: number;
  oy: number;
}

export interface LiveTrail {
  key: string; // the plane and the time of the first point: a stable React key
  hex: string;
  lifeMs: number;
  thin: number; // px, the width at the head
  spread: number; // × the width at the end of the life
  points: SkyPoint[]; // oldest first, never moved
  head: SkyPoint; // the plane's latest place: moves while the plane shows, then stays
  active: boolean; // the plane showed in the last update
}

// A shown plane with a contrail, at the time of the update.
export interface TrailPlane {
  hex: string;
  az: number;
  el: number;
  ox: number;
  oy: number;
  lifeMs: number;
  thin: number;
  spread: number;
}

// The trails after one update at `t` (ms) with the planes that show now. A shown plane goes on
// with its trail when it showed in the last update too (and not longer ago than TRAIL_GAP_MS),
// else it starts a new one with one point where it is now: no trail on the first frame. A trail
// whose plane does not show keeps its last head and fades. A segment fades with its older
// point, so a point goes when its life is over, and a trail goes with its last point.
// Unchanged trails keep their object, so a memoized drawing renders again only on a change.
export const updateLiveTrails = (
  trails: LiveTrail[], planes: TrailPlane[], t: number, spacingMs: number,
): LiveTrail[] => {
  const shown = new Map(planes.map(plane => [plane.hex, plane]));
  const continued = new Set<string>();
  const next: LiveTrail[] = [];
  for (const trail of trails) {
    const plane = trail.active && t - trail.head.t <= TRAIL_GAP_MS ? shown.get(trail.hex) : undefined;
    let updated = trail;
    if (plane) {
      continued.add(plane.hex);
      // The tail's offset moves towards the plane's new one at most TAIL_SHIFT_PX_S.
      const shiftX = plane.ox - trail.head.ox;
      const shiftY = plane.oy - trail.head.oy;
      const k = Math.min(1, (TAIL_SHIFT_PX_S * Math.max(0, t - trail.head.t)) / 1000 / (Math.hypot(shiftX, shiftY) || 1));
      const head: SkyPoint = { az: plane.az, el: plane.el, t, ox: trail.head.ox + k * shiftX, oy: trail.head.oy + k * shiftY };
      const last = trail.points[trail.points.length - 1];
      const points = !last || t - last.t >= spacingMs ? [...trail.points, head].slice(-MAX_TRAIL_POINTS) : trail.points;
      updated = { ...trail, points, head };
    } else if (trail.active) {
      updated = { ...trail, active: false };
    }
    const faded = updated.points.findIndex(point => t - point.t < updated.lifeMs);
    if (faded !== 0) {
      const points = faded < 0 ? [] : updated.points.slice(faded);
      // A plane that still shows keeps its head as the first point (after a long pause).
      if (points.length === 0 && !updated.active) continue;
      updated = { ...updated, points: points.length > 0 ? points : [updated.head] };
    }
    next.push(updated);
  }
  for (const plane of planes) {
    if (continued.has(plane.hex)) continue;
    const head: SkyPoint = { az: plane.az, el: plane.el, t, ox: plane.ox, oy: plane.oy };
    next.push({
      key: `${plane.hex}@${t}`, hex: plane.hex, lifeMs: plane.lifeMs, thin: plane.thin, spread: plane.spread,
      points: [head], head, active: true,
    });
  }
  if (next.length <= MAX_TRAILS) return next;
  // Too many: the fading trails whose plane left first go first.
  const drop = new Set(
    next.filter(trail => !trail.active).sort((a, b) => a.head.t - b.head.t).slice(0, next.length - MAX_TRAILS),
  );
  return next.filter(trail => !drop.has(trail)).slice(0, MAX_TRAILS);
};

// A point's width at `a` = its age / its life (0-1), as the decorative pieces: from thin to
// `spread` × thin. Its opacity: `getTrailOpacity` (planes).
export const getTrailWidth = (thin: number, spread: number, a: number): number => thin * (1 + (spread - 1) * a);

export interface TrailPath {
  step: number; // 0 = the newest fade step
  d: string;
  opacity: number;
  width: number; // px
}
type Project = (altitude: number, azimuth: number) => { x: number; y: number };
// A segment is not drawn when both ends are this far outside the screen (the compass view).
const OFF_SCREEN_PX = 50;
const px = (n: number) => Math.round(n * 10) / 10;

// The segments between the points, oldest first, as one path per fade step. Each segment has
// the opacity and the width of its older point's age, in TRAIL_FADE_STEPS steps over the life.
// Two points on both sides of the 360° edge are not joined.
export const getTrailPaths = (
  points: SkyPoint[], t: number, look: Pick<LiveTrail, 'lifeMs' | 'thin' | 'spread'>, project: Project, sceneWidth: number,
): TrailPath[] => {
  const paths = new Map<number, { d: string; x: number; y: number }>();
  const at = (point: SkyPoint) => {
    const p = project(point.el, point.az);
    return { x: px(p.x + point.ox), y: px(p.y + point.oy) };
  };
  const offScreen = (x: number) => (x < -OFF_SCREEN_PX ? -1 : x > sceneWidth + OFF_SCREEN_PX ? 1 : 0);
  let from = points.length > 0 ? at(points[0]) : null;
  for (let i = 1; i < points.length; i++) {
    const a = Math.max(0, (t - points[i - 1].t) / look.lifeMs);
    const start = from!;
    const to = at(points[i]);
    from = to;
    if (a >= 1) continue; // faded
    if (start.x === to.x && start.y === to.y) continue;
    if (Math.abs(to.x - start.x) > sceneWidth / 2) continue; // across the 360° edge
    if (offScreen(start.x) !== 0 && offScreen(start.x) === offScreen(to.x)) continue;
    const step = Math.min(TRAIL_FADE_STEPS - 1, Math.floor(a * TRAIL_FADE_STEPS));
    const path = paths.get(step);
    if (!path) paths.set(step, { d: `M${start.x} ${start.y}L${to.x} ${to.y}`, ...to });
    else {
      path.d += path.x === start.x && path.y === start.y ? `L${to.x} ${to.y}` : `M${start.x} ${start.y}L${to.x} ${to.y}`;
      path.x = to.x;
      path.y = to.y;
    }
  }
  return [...paths].map(([step, { d }]) => {
    const a = (step + 0.5) / TRAIL_FADE_STEPS; // the middle of the step
    return {
      step, d,
      opacity: Math.round(getTrailOpacity(a) * 100) / 100,
      width: px(getTrailWidth(look.thin, look.spread, a)),
    };
  });
};

// The trail's fade clock: `t` in steps of a hundredth of the life (at least `minMs`), so a
// memoized trail renders again only when its look can change, not on each tick.
export const getTrailFadeTime = (t: number, lifeMs: number, minMs: number): number => {
  const step = Math.max(minMs, lifeMs / 100);
  return Math.floor(t / step) * step;
};
