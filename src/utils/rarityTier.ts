// Rarity tiers (ROADMAP items 105, 107, 113): the six tiers and their colours. The info card has a
// faint outline in its tier colour, and the ring around the tapped thing has the same colour.
// Things without a tier (sun, moon, cloud, terrain, planes, satellites) keep the neutral look.
// The colours are the `--color-tier-*` tokens in index.css. Item 113: "ultra rare" is only for
// the easter eggs; no spawn share gives it.

export type RarityTier = 'common' | 'frequent' | 'uncommon' | 'rare' | 'veryRare' | 'ultraRare';

// From the most common to the rarest (the card's tier meter).
export const TIER_ORDER: RarityTier[] = ['common', 'frequent', 'uncommon', 'rare', 'veryRare', 'ultraRare'];

// The card's 1 px outline: the tier colour at half strength, or the glass panel's border.
export const TIER_CARD_BORDER: Record<RarityTier, string> = {
  common: 'border-tier-common/50',
  frequent: 'border-tier-frequent/50',
  uncommon: 'border-tier-uncommon/50',
  rare: 'border-tier-rare/50',
  veryRare: 'border-tier-very-rare/50',
  ultraRare: 'border-tier-ultra-rare/50',
};
export const NEUTRAL_CARD_BORDER = 'border-[hsl(var(--panel-border)/0.14)]';

// The ring around the tapped thing (item 95): the tier colour, or white at 70 %.
export const TIER_RING_BORDER: Record<RarityTier, string> = {
  common: 'border-tier-common/80',
  frequent: 'border-tier-frequent/80',
  uncommon: 'border-tier-uncommon/80',
  rare: 'border-tier-rare/80',
  veryRare: 'border-tier-very-rare/80',
  ultraRare: 'border-tier-ultra-rare/80',
};
export const NEUTRAL_RING_BORDER = 'border-white/70';

export const cardBorderClass = (tier: RarityTier | null | undefined): string =>
  tier ? TIER_CARD_BORDER[tier] : NEUTRAL_CARD_BORDER;

export const ringBorderClass = (tier: RarityTier | null | undefined): string =>
  tier ? TIER_RING_BORDER[tier] : NEUTRAL_RING_BORDER;
