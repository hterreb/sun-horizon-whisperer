import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import PremiumBadge from '@/components/PremiumBadge';
import { useLanguage } from '@/hooks/useLanguage';
import { usePremiumGate } from '@/hooks/usePremium';
import { GLASS_SURFACE } from '@/utils/glassChrome';

// Purchase dialog (ROADMAP item 14): opens from requirePremium() when a gold-plus
// feature is locked. Hand-built because src/components/ui has no dialog and the shadcn
// dialog would add @radix-ui/react-dialog as a new dependency.
const PremiumDialog: React.FC = () => {
  const { t } = useLanguage();
  const { isDialogOpen, setDialogOpen, price, buy, restore } = usePremiumGate();

  useEffect(() => {
    if (!isDialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialogOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDialogOpen, setDialogOpen]);

  if (!isDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setDialogOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-dialog-title"
        className={`${GLASS_SURFACE} rounded-panel w-full max-w-sm p-5 text-white space-y-3`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="premium-dialog-title" className="text-title font-bold inline-flex items-center gap-2">
          {t('premium.title')}
          <PremiumBadge className="h-4 w-4" />
        </h2>
        <p className="text-body opacity-90">{t('premium.includes')}</p>
        {price && <p className="text-body font-semibold">{t('premium.price', { price })}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="secondary" className="rounded-full" onClick={buy} autoFocus>
            {t('premium.buy')}
          </Button>
          <Button type="button" variant="ghost" className="rounded-full text-white" onClick={restore}>
            {t('premium.restore')}
          </Button>
          <Button type="button" variant="ghost" className="rounded-full text-white ml-auto" onClick={() => setDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PremiumDialog;
