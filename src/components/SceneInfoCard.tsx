import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { resolveInfoText, type SceneInfo } from '@/utils/sceneInfo';

// Info cards (ROADMAP item 95): one small glass card above the tapped point, inside the
// screen. It closes on a tap outside, on Escape, or after CARD_CLOSE_MS. SunTracker shows
// one card at a time and mounts a new card (a new `key`) for each tap, so the timer starts
// again.

export const CARD_CLOSE_MS = 15_000;
const GAP_PX = 14; // between the tapped point and the card
const EDGE_PX = 8; // the least space to the screen edge

interface SceneInfoCardProps {
  info: SceneInfo;
  x: number; // the tapped point, px in the viewport
  y: number;
  onClose: () => void;
}

const SceneInfoCard: React.FC<SceneInfoCardProps> = ({ info, x, y, onClose }) => {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Above the point, centred on it, clamped inside the screen; below the point when there is
  // no room above. Set on the element before paint, so the card does not jump.
  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const { offsetWidth: w, offsetHeight: h } = card;
    const left = Math.min(Math.max(x - w / 2, EDGE_PX), window.innerWidth - w - EDGE_PX);
    const above = y - GAP_PX - h;
    const top = above >= EDGE_PX ? above : Math.min(y + GAP_PX, window.innerHeight - h - EDGE_PX);
    card.style.left = `${Math.max(EDGE_PX, left)}px`;
    card.style.top = `${Math.max(EDGE_PX, top)}px`;
  }, [x, y, info]);

  useEffect(() => {
    const close = () => closeRef.current();
    const timer = setTimeout(close, CARD_CLOSE_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    // A tap outside closes the card; a tap on another thing then opens that thing's card.
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !ref.current?.contains(event.target)) close();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby="scene-info-title"
      data-share-hide
      data-testid="scene-info-card"
      className={`fixed z-40 w-max max-w-[min(15rem,calc(100vw-1rem))] ${GLASS_SURFACE} rounded-panel px-3 py-2 text-white`}
      style={{ left: x, top: y }}
    >
      <h2 id="scene-info-title" className="text-body font-bold">{t(info.title)}</h2>
      {info.lines.map((line, i) =>
        line.label ? (
          <div key={i} className="flex justify-between gap-3 text-caption">
            <span className="text-white/70">{t(line.label)}</span>
            <span className="text-right">{resolveInfoText(t, line.value)}</span>
          </div>
        ) : (
          <p key={i} className="text-caption">{resolveInfoText(t, line.value)}</p>
        )
      )}
    </div>
  );
};

export default SceneInfoCard;
