// Sizes of the sea creatures and a colour of the sea visitors, apart from their drawings, so
// CloudLayer can lay out the lanes and hit areas without the drawings (SceneFish, SceneBoat,
// SceneVisitor, SceneBird) in the start bundle: they load with `lazy()` (ROADMAP item 174).

// SceneBoat: drawn this wide, then scaled by CloudLayer. The grid is 64 x 37.
export const BOAT_WIDTH_PX = 48;
export const BOAT_HEIGHT_PX = (BOAT_WIDTH_PX * 37) / 64;

// SceneFish: how far the grown whale spout reaches above the 24-unit box and ahead of it, in
// grid units (the lane plan of item 92 keeps that water free).
export const WHALE_SPOUT_TOP = 3;
export const WHALE_SPOUT_AHEAD = 3;

// SceneVisitor: the shark and the dolphin pod on a 48-unit grid, waterline at `WL`.
export const VISITOR_GRID = 48; // one animal's width in grid units
export const DOLPHIN_SPACING = 34; // grid units from one dolphin to the next in the pod
export const VISITOR_VIEW_TOP = -2;
export const VISITOR_VIEW_HEIGHT = 34; // the svg's height in grid units
export const SHARK_WATERLINE = 10.6;
export const DOLPHIN_WATERLINE = 10.2;
// How far the svg reaches above the waterline, in grid units (the lane plan of item 92).
export const SHARK_ABOVE_WATER = SHARK_WATERLINE - VISITOR_VIEW_TOP;
export const DOLPHINS_ABOVE_WATER = DOLPHIN_WATERLINE - VISITOR_VIEW_TOP;

export type VisitorTone = 'day' | 'dusk' | 'moon';
// The glint on the water by light (item 94's ripple and bubbles use it too).
export const VISITOR_GLINT: Record<VisitorTone, string> = {
  moon: 'hsl(var(--scene-moon) / 0.75)',
  dusk: 'hsl(var(--scene-fish-glint-dusk) / 0.8)',
  day: 'hsl(var(--scene-glow-white) / 0.75)',
};
export const getVisitorGlint = (tone: VisitorTone): string => VISITOR_GLINT[tone];
