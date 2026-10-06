// A small airliner far up (ROADMAP item 96): side view, flying right, on a 40 × 12 grid.
// By day a pale silhouette; at night only its lights: a white strobe that flashes once every
// 2 s and one steady wing light, red or green. No other motion: CloudLayer moves the plane.

export const PLANE_ASPECT = 12 / 40; // height / width
// Where the trail leaves the plane (the engine under the wing), as a share of the box.
export const PLANE_TRAIL_X = 0.46;
export const PLANE_TRAIL_Y = 0.72;

const BODY = [
  'M2 6Q2 4.6 4 4.6L33 4.6Q38.5 4.9 40 6.1Q38.6 7.3 33 7.4L4 7.4Q2 7.4 2 6Z', // fuselage
  'M2.6 4.8 0.8 0.4 3.6 0.4 8.4 4.6Z', // fin
  'M3 6.4 0.4 8 3.4 8 7.4 6.9Z', // tailplane
  'M15.5 6.8 10.6 11.6 13.6 11.6 24.5 7Z', // wing
  'M16.4 8.6Q16.4 7.8 18.5 7.8L20.8 7.9Q21.3 8.6 20.8 9.3L18.5 9.4Q16.4 9.4 16.4 8.6Z', // engine
];

interface ScenePlaneProps {
  width: number; // px
  lights?: 'red' | 'green';
  // The live radar (item 96) flashes the strobe from its own clock: true shows it, false hides
  // it, no CSS animation. Without it, the strobe flashes by itself once every 2 s.
  strobeOn?: boolean;
}

const ScenePlane = ({ width, lights, strobeOn }: ScenePlaneProps) => (
  <svg width={width} height={width * PLANE_ASPECT} viewBox="0 0 40 12" className="block overflow-visible" data-testid="scene-plane">
    {lights ? (
      <>
        <circle cx={18} cy={9.8} r={1.2} fill={`hsl(var(--scene-plane-${lights}))`} data-testid="plane-wing-light" />
        <circle
          cx={22}
          cy={4.4}
          r={1.3}
          fill="hsl(var(--scene-plane-strobe))"
          style={strobeOn === undefined ? { animation: 'planeStrobe 2s linear infinite' } : { opacity: strobeOn ? 1 : 0 }}
          data-testid="plane-strobe"
        />
      </>
    ) : (
      <g fill="currentColor">{BODY.map(d => <path key={d} d={d} />)}</g>
    )}
  </svg>
);

export default ScenePlane;
