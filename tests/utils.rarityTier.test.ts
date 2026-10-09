import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  cardBorderClass, ringBorderClass, NEUTRAL_CARD_BORDER, NEUTRAL_RING_BORDER, TIER_CARD_BORDER, TIER_RING_BORDER, TIER_ORDER,
  type RarityTier,
} from '@/utils/rarityTier';

// ROADMAP items 107, 113: the tier colour on the info card's outline and on the ring.
const TIERS: RarityTier[] = ['common', 'frequent', 'uncommon', 'rare', 'veryRare', 'ultraRare'];

describe('rarityTier (ROADMAP item 107)', () => {
  it('gives each tier its own token colour, faint on the card and stronger on the ring', () => {
    expect(new Set(TIERS.map(t => TIER_CARD_BORDER[t])).size).toBe(6);
    for (const tier of TIERS) {
      expect(TIER_CARD_BORDER[tier]).toMatch(/^border-tier-[a-z-]+\/50$/);
      expect(TIER_RING_BORDER[tier]).toMatch(/^border-tier-[a-z-]+\/80$/);
      expect(cardBorderClass(tier)).toBe(TIER_CARD_BORDER[tier]);
      expect(ringBorderClass(tier)).toBe(TIER_RING_BORDER[tier]);
    }
    expect(ringBorderClass('veryRare')).toBe('border-tier-very-rare/80');
    expect(cardBorderClass('frequent')).toBe('border-tier-frequent/50');
    expect(ringBorderClass('frequent')).toBe('border-tier-frequent/80');
    expect(cardBorderClass('ultraRare')).toBe('border-tier-ultra-rare/50');
    expect(ringBorderClass('ultraRare')).toBe('border-tier-ultra-rare/80');
  });

  it('orders the tiers from common to ultra rare (item 113)', () => {
    expect(TIER_ORDER).toEqual(TIERS);
  });

  it('has a static colour token for each tier, the 4 old ones unchanged (item 113)', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const token = (name: string) => css.match(new RegExp(`--color-tier-${name}: (#[0-9a-f]{6});`))?.[1];
    expect(token('common')).toBe('#cbd5e1');
    expect(token('frequent')).toBe('#a7d3b5');
    expect(token('uncommon')).toBe('#5eead4');
    expect(token('rare')).toBe('#60a5fa');
    expect(token('very-rare')).toBe('#f5b82e');
    expect(token('ultra-rare')).toBe('#d8a0f5');
  });

  it('keeps the neutral border and ring without a tier', () => {
    expect(cardBorderClass(null)).toBe(NEUTRAL_CARD_BORDER);
    expect(ringBorderClass(null)).toBe(NEUTRAL_RING_BORDER);
    expect(ringBorderClass(undefined)).toBe('border-white/70');
  });
});
