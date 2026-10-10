import React, { useEffect, useId } from 'react';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { type CalendarEvent } from '@/utils/calendarEvents';
import { type PlayfulEgg, getPotOfGoldX } from '@/utils/playfulEggs';
import { type RarityTier } from '@/utils/rarityTier';
import { type EggCardKind } from '@/utils/sceneInfo';
import { HitArea, type SceneInfoHandler } from './CloudLayer';
import { type RainbowGeometry } from './SunVisualization';

// Playful pack (ROADMAP item 117): the static scene objects. The empty tomb with its warm glow
// on Easter morning; on St Patrick's Day a soft green tint over the sky all day and the pot of
// gold at the rainbow's end. The tomb and the pot stand on the horizon line (the far shore).
// Nothing moves, so reduced motion shows them too. April Fools
// (useAprilFoolsSwap) and the heart cloud (SkyClouds) are drawn where the sun, the moon and the
// clouds are.

interface PlayfulEggsProps {
  event: CalendarEvent | null;
  // Easter Sunday from sunrise to 12:00 (playfulEggs.isEasterMorning), or ?egg=easter.
  easterMorning: boolean;
  width: number;
  horizonY: number;
  // The sun's x (px) and how much it shines (0-1), for the morning light on the tomb.
  sunX: number;
  sunLight: number;
  rainbow: RainbowGeometry;
  onInfo?: SceneInfoHandler;
  infoRing?: string | null;
  infoRingTier?: RarityTier | null;
  // Called while an egg shows, so SunTracker can collect its badge.
  onShown?: (kind: PlayfulEgg) => void;
}

const TOMB_W = 72;
const TOMB_H = 44;
const TOMB_GLOW = 24; // how far the glow reaches out of the tomb (px)
const POT_W = 30;
const POT_H = 24;
const TOMB_RING = 'egg-tomb';
const POT_RING = 'egg-pot';

const PlayfulEggs: React.FC<PlayfulEggsProps> = ({
  event, easterMorning, width, horizonY, sunX, sunLight, rainbow, onInfo, infoRing = null, infoRingTier = null, onShown,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { tap } = useDoubleTap(onInfo);
  const showTomb = event === 'easter' && easterMorning && width > 0;
  const potX = event === 'st-patrick' ? getPotOfGoldX(rainbow, width, horizonY) : null;
  const showPot = potX !== null;
  const showGreen = event === 'st-patrick' && width > 0 && horizonY > 0;

  useEffect(() => {
    if (showTomb) onShown?.('easter');
  }, [showTomb, onShown]);
  useEffect(() => {
    if (showGreen) onShown?.('stPatrick');
  }, [showGreen, onShown]);

  // The CalendarEggs tap pattern (items 113, 116): a double tap opens the card.
  const tapProps = (kind: EggCardKind, ring: string) => onInfo ? {
    'aria-hidden': true,
    onClick: (e: React.MouseEvent) => tap({ type: 'egg', kind }, { x: e.clientX, y: e.clientY }, ring),
  } : {};
  const tapClass = onInfo ? 'pointer-events-auto cursor-pointer touch-manipulation' : 'pointer-events-none';
  const hit = (ring: string, w: number, h: number) =>
    onInfo && <HitArea cx={w / 2} cy={h / 2} width={w} height={h} ring={infoRing === ring} tier={infoRing === ring ? infoRingTier : null} />;

  // The tomb stands near the edge away from the sun, so the sun lights its face. At 10 % or
  // 90 % it stays clear of the sunrise and sunset labels (E and W, at 25 % and 75 %).
  const sunLeft = sunX < width / 2;
  const tombX = width * (sunLeft ? 0.9 : 0.1);

  return (
    <>
      {showGreen && (
        // St Patrick's Day: a soft, static green wash over the sky, strongest at the top.
        <div
          aria-hidden="true"
          data-testid="st-patrick-tint"
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: horizonY,
            background: 'linear-gradient(to bottom, hsl(var(--scene-st-patrick) / 0.22), hsl(var(--scene-st-patrick) / 0.08))',
          }}
        />
      )}

      {showTomb && (
        <div
          data-testid="empty-tomb"
          // z-5: in front of the terrain silhouette, like the black cat.
          className={`absolute z-5 ${tapClass}`} data-scene-hit
          style={{ left: tombX - TOMB_W / 2, top: horizonY - TOMB_H + 2, width: TOMB_W, height: TOMB_H }}
          {...tapProps('emptyTomb', TOMB_RING)}
        >
          {/* A soft, warm, static glow around the tomb, brightest at the open entrance. */}
          <div
            aria-hidden="true"
            data-testid="tomb-glow"
            className="absolute pointer-events-none"
            style={{
              left: -TOMB_GLOW, top: -TOMB_GLOW, width: TOMB_W + 2 * TOMB_GLOW, height: TOMB_H + TOMB_GLOW - 2,
              background: `radial-gradient(ellipse 50% 100% at ${((34 + TOMB_GLOW) / (TOMB_W + 2 * TOMB_GLOW)) * 100}% 100%, hsl(var(--scene-tomb-glow) / 0.45) 0%, hsl(var(--scene-tomb-glow) / 0.15) 50%, transparent 100%)`,
            }}
          />
          <svg aria-hidden="true" className="block" width={TOMB_W} height={TOMB_H} viewBox={`0 0 ${TOMB_W} ${TOMB_H}`}>
            <defs>
              <radialGradient id={`${uid}g`} cx="0.5" cy="1" r="1">
                <stop offset="0" stopColor="hsl(var(--scene-tomb-glow))" stopOpacity={0.9} />
                <stop offset="1" stopColor="hsl(var(--scene-tomb-glow))" stopOpacity={0} />
              </radialGradient>
              <linearGradient id={`${uid}l`} x1={sunLeft ? 0 : 1} y1={0} x2={sunLeft ? 1 : 0} y2={0}>
                <stop offset="0" stopColor="hsl(var(--scene-tomb-light))" stopOpacity={0.55 * sunLight} />
                <stop offset="1" stopColor="hsl(var(--scene-tomb-light))" stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* The rock, then the morning light on it from the sun's side. */}
            <path d="M2 44 C4 26 14 12 34 10 C54 9 66 22 70 44 Z" fill="hsl(var(--scene-tomb-rock))" />
            <path d="M2 44 C4 26 14 12 34 10 C54 9 66 22 70 44 Z" fill={`url(#${uid}l)`} />
            {/* The open entrance. */}
            <path d="M26 44 V31 A8 8 0 0 1 42 31 V44 Z" fill="hsl(var(--scene-tomb-entrance))" />
            {/* The light out of the entrance. */}
            <path d="M26 44 V31 A8 8 0 0 1 42 31 V44 Z" fill={`url(#${uid}g)`} />
            {/* The round stone, rolled away to the side. */}
            <circle cx={54} cy={35} r={9} fill="hsl(var(--scene-tomb-rock))" stroke="hsl(var(--scene-tomb-entrance))" strokeOpacity={0.5} />
            <circle cx={54} cy={35} r={9} fill={`url(#${uid}l)`} />
            <circle cx={54} cy={35} r={5.5} fill="none" stroke="hsl(var(--scene-tomb-entrance))" strokeOpacity={0.25} />
          </svg>
          {hit(TOMB_RING, TOMB_W, TOMB_H)}
        </div>
      )}

      {showPot && (
        <div
          data-testid="pot-of-gold"
          className={`absolute z-5 ${tapClass}`} data-scene-hit
          style={{ left: (potX as number) - POT_W / 2, top: horizonY - POT_H + 2, width: POT_W, height: POT_H }}
          {...tapProps('potOfGold', POT_RING)}
        >
          <svg aria-hidden="true" className="block" width={POT_W} height={POT_H} viewBox={`0 0 ${POT_W} ${POT_H}`}>
            {/* The gold heaped over the rim, then the pot. */}
            <ellipse cx={15} cy={8} rx={10} ry={4.5} fill="hsl(var(--scene-gold))" />
            <circle cx={10} cy={6} r={2.2} fill="hsl(var(--scene-gold))" stroke="hsl(var(--scene-gold-dark))" strokeWidth={0.6} />
            <circle cx={16} cy={4.5} r={2.2} fill="hsl(var(--scene-gold))" stroke="hsl(var(--scene-gold-dark))" strokeWidth={0.6} />
            <circle cx={21} cy={6.5} r={2.2} fill="hsl(var(--scene-gold))" stroke="hsl(var(--scene-gold-dark))" strokeWidth={0.6} />
            <path d="M5 11 H25 C26 18 22 23 15 23 C8 23 4 18 5 11 Z" fill="hsl(var(--scene-pot))" />
            <rect x={3} y={9} width={24} height={3.5} rx={1.75} fill="hsl(var(--scene-pot))" />
          </svg>
          {hit(POT_RING, POT_W, POT_H)}
        </div>
      )}
    </>
  );
};

export default PlayfulEggs;
