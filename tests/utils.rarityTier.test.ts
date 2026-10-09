import { describe, it, expect } from 'vitest';
import {
  cardBorderClass, ringBorderClass, NEUTRAL_CARD_BORDER, NEUTRAL_RING_BORDER, TIER_CARD_BORDER, TIER_RING_BORDER,
  type RarityTier,
} from '@/utils/rarityTier';

// ROADMAP item 107: the tier colour on the info card's outline and on the ring.
const TIERS: RarityTier[] = ['common', 'uncommon', 'rare', 'veryRare'];

describe('rarityTier (ROADMAP item 107)', () => {
  it('gives each tier its own token colour, faint on the card and stronger on the ring', () => {
    expect(new Set(TIERS.map(t => TIER_CARD_BORDER[t])).size).toBe(4);
    for (const tier of TIERS) {
      expect(TIER_CARD_BORDER[tier]).toMatch(/^border-tier-[a-z-]+\/50$/);
      expect(TIER_RING_BORDER[tier]).toMatch(/^border-tier-[a-z-]+\/80$/);
      expect(cardBorderClass(tier)).toBe(TIER_CARD_BORDER[tier]);
      expect(ringBorderClass(tier)).toBe(TIER_RING_BORDER[tier]);
    }
    expect(ringBorderClass('veryRare')).toBe('border-tier-very-rare/80');
  });

  it('keeps the neutral border and ring without a tier', () => {
    expect(cardBorderClass(null)).toBe(NEUTRAL_CARD_BORDER);
    expect(ringBorderClass(null)).toBe(NEUTRAL_RING_BORDER);
    expect(ringBorderClass(undefined)).toBe('border-white/70');
  });
});
