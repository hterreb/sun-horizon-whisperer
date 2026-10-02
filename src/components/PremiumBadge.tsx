import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { usePremiumGate } from '@/hooks/usePremium';

// Gold "plus" mark on premium features (ROADMAP item 35): change location, manual
// weather, the sunset score, line of sight, compass and the share card (item 68).
// Decorative only: all of them stay free while PREMIUM_ENFORCED is false (see
// utils/premium.ts). After a Play purchase (item 14) the plus goes away everywhere. The plus is its own `size-full` svg so the caller's size class
// scales the whole badge; `!` beats the shadcn Button's `[&_svg]:size-4`, so the
// badge also works inside a Button.
const PremiumBadge: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useLanguage();
  const { isBillingAvailable, isPremium, isLocked } = usePremiumGate();
  if (isBillingAvailable && isPremium) return null;
  return (
  <span
    aria-hidden="true"
    title={isLocked ? t('premium.badge') : t('common.premium')}
    data-testid="premium-badge"
    className={cn(
      'inline-flex h-3 w-3 flex-shrink-0 rounded-full bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-night ring-1 ring-white/50 shadow-[0_0_6px_hsl(var(--brand-gold)/0.7)]',
      className
    )}
  >
    <svg viewBox="0 0 12 12" className="!size-full">
      <path d="M6 3v6M3 6h6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  </span>
  );
};

export default PremiumBadge;
