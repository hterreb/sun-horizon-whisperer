import React, { useEffect, useRef, useState } from 'react';
import { Award } from 'lucide-react';
import { BadgeArt } from '@/components/CollectionView';
import { useLanguage } from '@/hooks/useLanguage';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { type MessageKey } from '@/i18n';
import { BADGES, type BadgeId } from '@/utils/collection';
import { GLASS_CARD_SURFACE } from '@/utils/glassChrome';
import { cardBorderClass, ringBorderClass, TIER_ORDER, type RarityTier } from '@/utils/rarityTier';
import { RARITY_NAMES } from '@/utils/sceneInfo';

// "Badge unlocked" card (ROADMAP item 114): a new badge shows like a game achievement. A glass
// card at the top centre: the badge as in the collection grid with its tier ring, the kicker,
// the name, the tier word and the counter. Calm motion, CSS only: the card slides down 12 px
// and fades in, one light sweep crosses the badge, the ring glows once. Reduced motion: fade
// only. It fades out after SHOW_MS; a tap opens the collection at the badge; a swipe up or
// Escape closes it. SunTracker shows one card at a time (a queue).

export const SHOW_MS = 4000;
export const FADE_OUT_MS = 300;
const SWIPE_UP_PX = 24;

// The tier colour as text colour: the tier word, and the glow (its shadow is `currentColor`).
const TIER_TEXT: Record<RarityTier, string> = {
  common: 'text-tier-common', frequent: 'text-tier-frequent', uncommon: 'text-tier-uncommon',
  rare: 'text-tier-rare', veryRare: 'text-tier-very-rare', ultraRare: 'text-tier-ultra-rare',
};
const tierOfName = (name: MessageKey | null): RarityTier | null =>
  TIER_ORDER.find((tier) => RARITY_NAMES[tier] === name) ?? null;

interface BadgeUnlockedProps {
  badgeId: BadgeId;
  found: number; // the collected count with this badge
  onOpen(id: BadgeId): void;
  onDone(): void;
}

const BadgeUnlocked: React.FC<BadgeUnlockedProps> = ({ badgeId, found, onOpen, onDone }) => {
  const { t } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);
  const swipeStartY = useRef<number | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), SHOW_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLeaving(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => doneRef.current(), FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  const badge = BADGES.find((b) => b.id === badgeId);
  if (!badge) return null;
  const tier = tierOfName(badge.rarity);
  const name = t(badge.name);
  const label = badge.rarity
    ? t('badgeUnlocked.label', { name, tier: t(badge.rarity) })
    : t('badgeUnlocked.labelNoTier', { name });
  const motion = leaving ? 'animate-badge-out' : reducedMotion ? 'animate-badge-fade' : 'animate-badge-in';

  const handlePointerDown = (event: React.PointerEvent) => {
    swipeStartY.current = event.clientY;
    swiped.current = false;
  };
  const handlePointerUp = (event: React.PointerEvent) => {
    if (swipeStartY.current !== null && swipeStartY.current - event.clientY > SWIPE_UP_PX) {
      swiped.current = true;
      setLeaving(true);
    }
    swipeStartY.current = null;
  };
  const handleClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onOpen(badgeId);
    onDone();
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-110 flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      data-share-hide
    >
      <div role="status" aria-live="polite" className={`pointer-events-auto ${motion}`} data-testid="badge-unlocked">
        <span className="sr-only">{label}</span>
        <button
          type="button"
          aria-label={t('badgeUnlocked.open')}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className={`flex w-80 max-w-full touch-none items-center gap-3 ${GLASS_CARD_SURFACE} ${cardBorderClass(tier)} rounded-panel p-3 pr-4 text-left text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
        >
          <span aria-hidden="true" className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 bg-white/10 ${ringBorderClass(tier)}`}>
            {!reducedMotion && (
              <span data-testid="badge-glow" className={`absolute -inset-0.5 rounded-full shadow-[0_0_14px_4px_currentColor] animate-badge-glow ${tier ? TIER_TEXT[tier] : 'text-white'}`} />
            )}
            <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
              <span className="scale-[0.8]"><BadgeArt badge={badge} /></span>
              {!reducedMotion && (
                <span data-testid="badge-sweep" className="absolute inset-0 animate-badge-sweep bg-linear-to-r from-transparent via-white/45 to-transparent" />
              )}
            </span>
          </span>
          <span aria-hidden="true" className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-brand-gold-light">
              <Award size={14} />
              {t('badgeUnlocked.kicker')}
            </span>
            <span className="truncate text-[15px] font-bold leading-5">{name}</span>
            <span className="text-caption">
              {badge.rarity && tier && <span className={`font-semibold ${TIER_TEXT[tier]}`}>{t(badge.rarity)} · </span>}
              <span className="text-white/75">{t('collection.count', { found, total: BADGES.length })}</span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default BadgeUnlocked;
