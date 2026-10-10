import React from 'react';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type EggCardKind } from '@/utils/sceneInfo';
import { AURORA_BANDS } from '@/utils/auroraBands';
import { type SceneInfoHandler } from './CloudLayer';

interface EventSkyTapsProps {
  onInfo?: SceneInfoHandler;
  // The aurora shows (not under a covered sky).
  aurora: boolean;
  // A meteor shower draws meteors (night, no reduced motion).
  meteorShower: boolean;
  // The card of a running fireworks show ('fireworks' or a national day's card), or null.
  fireworks: EggCardKind | null;
}

// Item 123 (decision 2026-10-10): the tap areas of the sky-wide events, in the lowest scene layer.
// SunTracker renders this first, with no z-index, so every thing drawn after it (the UFO, the
// national eggs, satellites, planes, clouds, birds, bats, fish, boats, the sun and the moon) takes
// its own tap, and only a tap on the empty sky opens the event's card. The event visuals (Aurora,
// NightStars' meteors, Fireworks) stay where they are and take no taps. No ring: these events have
// no ring shape, like the terrain.
export const AURORA_RING = 'egg-aurora';
export const METEOR_RING = 'egg-meteor-shower';
export const FIREWORKS_RING = 'egg-fireworks';
const SKY = 'absolute inset-x-0 top-0 h-[65%]'; // above the horizon (65 % of the height, as in SunVisualization)
const TAP = 'pointer-events-auto cursor-pointer touch-manipulation';

const EventSkyTaps: React.FC<EventSkyTapsProps> = ({ onInfo, aurora, meteorShower, fireworks }) => {
  const { tap } = useDoubleTap(onInfo);
  const props = (kind: EggCardKind, ring: string) => ({
    'aria-hidden': true,
    'data-scene-hit': '',
    onClick: (e: React.MouseEvent) => tap({ type: 'egg', kind }, { x: e.clientX, y: e.clientY }, ring),
  });
  return (
    <div data-testid="event-sky-taps" className="absolute inset-0 pointer-events-none">
      {onInfo && aurora && AURORA_BANDS.map((b) => (
        // The band's box, without its slow drift.
        <div
          key={b.left}
          data-testid="aurora-tap"
          className={`absolute ${TAP}`}
          style={{ top: b.top, left: b.left, width: b.width, height: '32%' }}
          {...props('aurora', AURORA_RING)}
        />
      ))}
      {onInfo && meteorShower && <div data-testid="meteor-tap" className={`${SKY} ${TAP}`} {...props('meteorShower', METEOR_RING)} />}
      {onInfo && fireworks && <div data-testid="fireworks-tap" className={`${SKY} ${TAP}`} {...props(fireworks, FIREWORKS_RING)} />}
    </div>
  );
};

export default EventSkyTaps;
