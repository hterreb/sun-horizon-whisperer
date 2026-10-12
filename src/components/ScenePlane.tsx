// A small airliner far up (ROADMAP item 96): side view, flying right, on a 40 × 12 grid.
// By day a pale silhouette; at night only its lights: a white strobe that flashes once every
// 2 s and one steady wing light, red or green. No other motion: CloudLayer moves the plane.
// The live radar (item 143) also draws it from below (`view="under"`), when it flies steeply
// across the screen.

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
// The same plane seen from below (planform), nose right, on a 40 × 40 grid: the fuselage, the
// wing and the tailplane of BODY on both sides, the engines ahead of the wing.
const UNDER = [
  'M2 20Q2 18.6 4 18.6L33 18.6Q38.6 18.8 40 20Q38.6 21.2 33 21.4L4 21.4Q2 21.4 2 20Z', // fuselage
  'M24.5 18.8 13.6 3.2 10.6 3.2 15.5 18.8Z', // right wing
  'M24.5 21.2 13.6 36.8 10.6 36.8 15.5 21.2Z', // left wing
  'M7.4 19 3.4 13.6 0.6 13.6 3 19Z', // tailplane, right
  'M7.4 21 3.4 26.4 0.6 26.4 3 21Z', // tailplane, left
  'M19.6 14Q19.6 13.2 21.6 13.2L23.9 13.3Q24.4 14 23.9 14.7L21.6 14.8Q19.6 14.8 19.6 14Z', // engine, right
  'M19.6 26Q19.6 25.2 21.6 25.2L23.9 25.3Q24.4 26 23.9 26.7L21.6 26.8Q19.6 26.8 19.6 26Z', // engine, left
];
// Where the trail leaves the plane seen from below (item 142): the rear end of the fuselage, as a
// share of the box's width (on its middle line).
export const PLANE_UNDER_TAIL_X = 2 / 40;
// The wingtip lights from below. Seen from below with the nose up, the left wing (red) is on the
// viewer's right; with the nose to the right (+x) that is the lower wing (+y).
const UNDER_TIP_RED = { cx: 12.1, cy: 36.8 };
const UNDER_TIP_GREEN = { cx: 12.1, cy: 3.2 };

interface ScenePlaneProps {
  width: number; // px
  // At night. The side view shows this one wing light; the underside shows both wingtips.
  lights?: 'red' | 'green';
  // The live radar (item 96) flashes the strobe from its own clock: true shows it, false hides
  // it, no CSS animation. Without it, the strobe flashes by itself once every 2 s.
  strobeOn?: boolean;
  view?: 'side' | 'under'; // item 143: the underside is a square box (40 × 40 grid)
}

const ScenePlane = ({ width, lights, strobeOn, view = 'side' }: ScenePlaneProps) => {
  const strobe = strobeOn === undefined ? { animation: 'planeStrobe 2s linear infinite' } : { opacity: strobeOn ? 1 : 0 };
  if (view === 'under') {
    return (
      <svg width={width} height={width} viewBox="0 0 40 40" className="block overflow-visible" data-testid="scene-plane-under">
        {lights ? (
          <>
            <circle {...UNDER_TIP_RED} r={1.2} fill="hsl(var(--scene-plane-red))" data-testid="plane-tip-light" />
            <circle {...UNDER_TIP_GREEN} r={1.2} fill="hsl(var(--scene-plane-green))" data-testid="plane-tip-light" />
            {[UNDER_TIP_RED, UNDER_TIP_GREEN].map(tip => (
              <circle key={tip.cy} {...tip} r={1.3} fill="hsl(var(--scene-plane-strobe))" style={strobe} data-testid="plane-tip-strobe" />
            ))}
          </>
        ) : (
          <g fill="currentColor">{UNDER.map(d => <path key={d} d={d} />)}</g>
        )}
      </svg>
    );
  }
  return (
    <svg width={width} height={width * PLANE_ASPECT} viewBox="0 0 40 12" className="block overflow-visible" data-testid="scene-plane">
      {lights ? (
        <>
          <circle cx={18} cy={9.8} r={1.2} fill={`hsl(var(--scene-plane-${lights}))`} data-testid="plane-wing-light" />
          <circle
            cx={22}
            cy={4.4}
            r={1.3}
            fill="hsl(var(--scene-plane-strobe))"
            style={strobe}
            data-testid="plane-strobe"
          />
        </>
      ) : (
        <g fill="currentColor">{BODY.map(d => <path key={d} d={d} />)}</g>
      )}
    </svg>
  );
};

export default ScenePlane;
