import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Bird, Cloud, Egg, Fish, Moon, Mountain, PartyPopper, Plane, Sailboat, Satellite, Sun, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { GLASS_CARD_SURFACE } from '@/utils/glassChrome';
import { cardBorderClass, TIER_ORDER, type RarityTier } from '@/utils/rarityTier';
import { resolveInfoText, type SceneIconId, type SceneInfo } from '@/utils/sceneInfo';
import { Bat } from './sceneIcons';

// Info cards (ROADMAP item 95): one small glass card above the tapped point, inside the
// screen. It closes on a tap outside, on Escape, or after CARD_CLOSE_MS. SunTracker shows
// one card at a time and mounts a new card (a new `key`) for each tap, so the timer starts
// again.
// Item 107 (lookbook K4, "Field guide"): an almanac entry. A kicker with the type icon and name
// in the type colour, the title, the Latin name, a thin rule, label-value rows with dotted
// leaders, and the fact as a "Field note" at the end. A faint outline in the rarity tier colour.

export const CARD_CLOSE_MS = 15_000;
const GAP_PX = 14; // between the tapped point and the card
const EDGE_PX = 8; // the least space to the screen edge

// The kicker's icon and colour per type (the `--color-kind-*` tokens in index.css).
const KICKER: Record<SceneIconId, { Icon: LucideIcon; colour: string }> = {
  water: { Icon: Fish, colour: 'text-kind-water' },
  visitor: { Icon: Fish, colour: 'text-kind-visitor' },
  bird: { Icon: Bird, colour: 'text-kind-bird' },
  bat: { Icon: Bat, colour: 'text-kind-moon' },
  boat: { Icon: Sailboat, colour: 'text-kind-boat' },
  plane: { Icon: Plane, colour: 'text-kind-plane' },
  cloud: { Icon: Cloud, colour: 'text-kind-cloud' },
  sun: { Icon: Sun, colour: 'text-kind-sun' },
  moon: { Icon: Moon, colour: 'text-kind-moon' },
  terrain: { Icon: Mountain, colour: 'text-kind-terrain' },
  satellite: { Icon: Satellite, colour: 'text-kind-satellite' },
  // Item 113: the easter eggs and special events, in the "ultra rare" colour.
  egg: { Icon: Egg, colour: 'text-tier-ultra-rare' },
  event: { Icon: PartyPopper, colour: 'text-tier-ultra-rare' },
};

// The rarity meter: one bar per tier, lit up to the card's tier.
const TIER_STEPS = TIER_ORDER;
const METER_ON: Record<RarityTier, string> = {
  common: 'bg-tier-common', frequent: 'bg-tier-frequent', uncommon: 'bg-tier-uncommon',
  rare: 'bg-tier-rare', veryRare: 'bg-tier-very-rare', ultraRare: 'bg-tier-ultra-rare',
};
const Meter: React.FC<{ tier: RarityTier }> = ({ tier }) => (
  <span className="inline-flex gap-0.5" aria-hidden="true" data-testid="rarity-meter">
    {TIER_STEPS.map((step, i) => (
      <i key={step} className={`h-1 w-2 rounded-sm ${i <= TIER_STEPS.indexOf(tier) ? METER_ON[tier] : 'bg-white/20'}`} />
    ))}
  </span>
);

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

  const { Icon, colour } = KICKER[info.icon];
  const title = t(info.title);
  // In English most cloud titles are the Latin genus already: then no second line.
  const latin = info.latin && info.latin.toLowerCase() !== title.toLowerCase() ? info.latin : null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby="scene-info-title"
      data-share-hide
      data-testid="scene-info-card"
      className={`fixed z-40 flex w-max max-w-[min(16rem,calc(100vw-1rem))] flex-col gap-1 ${GLASS_CARD_SURFACE} ${cardBorderClass(info.tier)} animate-card-in rounded-panel px-3 pb-2.5 pt-2 text-white`}
      style={{ left: x, top: y }}
    >
      <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase leading-4 tracking-[0.12em] ${colour}`} data-testid="scene-info-kicker">
        <Icon size={14} aria-hidden="true" />
        {t(info.kicker)}
      </span>
      <h2 id="scene-info-title" className="text-[15px] font-bold leading-5">{title}</h2>
      {latin && <span className="-mt-1 text-caption italic text-white/75">{latin}</span>}
      <hr className="my-0.5 w-full border-0 border-t border-white/15" />
      {info.lines.map((line, i) =>
        line.label ? (
          <div key={i} className="flex items-baseline gap-1 text-caption">
            <span className="whitespace-nowrap text-white/75">{t(line.label)}</span>
            <span className="min-w-2.5 flex-1 -translate-y-[3px] border-b border-dotted border-white/30" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-right">
              {line.tier && <Meter tier={line.tier} />}
              {resolveInfoText(t, line.value)}
            </span>
          </div>
        ) : (
          <p key={i} className="text-caption">{resolveInfoText(t, line.value)}</p>
        )
      )}
      {info.fact && (
        <div className="mt-0.5 flex flex-col gap-px text-caption">
          <b className="text-[11px] uppercase leading-4 tracking-[0.12em] text-white/60">{t(info.fact.label)}</b>
          <span>{t(info.fact.text)}</span>
        </div>
      )}
    </div>
  );
};

export default SceneInfoCard;
