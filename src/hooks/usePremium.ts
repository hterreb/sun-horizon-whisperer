import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { translate } from '@/i18n';
import { type Language } from '@/utils/language';
import {
  PLAY_BILLING,
  PREMIUM_SKU,
  formatPrice,
  isPremiumEnforced,
  isPremiumLocked,
  loadOwnedHint,
  ownsPremium,
  saveOwnedHint,
} from '@/utils/premium';

// Premium through Google Play Billing (ROADMAP item 14, billing plan in item 45).
// SunTracker calls usePremium and provides the result through PremiumContext. Gated
// features call requirePremium(action): it runs the action, or opens the purchase
// dialog (PremiumDialog) when the feature is locked. Without the Digital Goods API
// (the web) Premium is always unlocked.
export interface PremiumValue {
  isPremium: boolean;
  isBillingAvailable: boolean;
  isLocked: boolean;
  price: string | null;
  buy: () => Promise<void>;
  restore: () => Promise<void>;
  requirePremium: (action?: () => void) => void;
  isDialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
}

export const PremiumContext = createContext<PremiumValue>({
  isPremium: true,
  isBillingAvailable: false,
  isLocked: false,
  price: null,
  buy: async () => {},
  restore: async () => {},
  requirePremium: (action) => action?.(),
  isDialogOpen: false,
  setDialogOpen: () => {},
});

export const usePremiumGate = (): PremiumValue => useContext(PremiumContext);

const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';

export const usePremium = (language: Language, enforced: boolean = isPremiumEnforced()): PremiumValue => {
  const serviceRef = useRef<DigitalGoodsService | null>(null);
  const [isBillingAvailable, setIsBillingAvailable] = useState(false);
  const [owned, setOwned] = useState(loadOwnedHint);
  const [priceDetails, setPriceDetails] = useState<{ currency: string; value: string } | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const setOwnedAndHint = useCallback((next: boolean) => {
    setOwned(next);
    saveOwnedHint(next);
  }, []);

  const showError = useCallback(() => {
    toast({ title: translate(language, 'premium.failedTitle'), description: translate(language, 'premium.failedDescription') });
  }, [language]);

  useEffect(() => {
    const getService = window.getDigitalGoodsService;
    if (typeof getService !== 'function') return;
    let cancelled = false;
    (async () => {
      let service: DigitalGoodsService;
      try {
        service = await getService(PLAY_BILLING);
      } catch {
        // Chrome outside the Play app: no Play Billing, so Premium stays unlocked.
        return;
      }
      if (cancelled) return;
      serviceRef.current = service;
      setIsBillingAvailable(true);
      service.listPurchases().then(
        (purchases) => !cancelled && setOwnedAndHint(ownsPremium(purchases)),
        () => {} // Keep the start hint; the next start or "Restore" asks again.
      );
      service.getDetails([PREMIUM_SKU]).then(
        (details) => !cancelled && setPriceDetails(details.find((item) => item.itemId === PREMIUM_SKU)?.price ?? null),
        () => {} // No price: the dialog shows the Buy button without it.
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [setOwnedAndHint]);

  const restore = useCallback(async () => {
    const service = serviceRef.current;
    if (!service) return;
    try {
      const isOwned = ownsPremium(await service.listPurchases());
      setOwnedAndHint(isOwned);
      if (isOwned) setDialogOpen(false);
      else toast({ title: translate(language, 'premium.restoreNone') });
    } catch {
      showError();
    }
  }, [language, setOwnedAndHint, showError]);

  const buy = useCallback(async () => {
    const service = serviceRef.current;
    try {
      const request = new PaymentRequest(
        [{ supportedMethods: PLAY_BILLING, data: { sku: PREMIUM_SKU } }],
        // Play shows its own price and title; the total is required by the API only.
        { total: { label: 'Premium', amount: { currency: 'EUR', value: '0' } } }
      );
      const response = await request.show();
      // Paid: unlock now. An error below shows the toast but keeps Premium.
      setOwnedAndHint(true);
      setDialogOpen(false);
      await response.complete('success');
      // Acknowledge (Play refunds a purchase that is not acknowledged within 3 days).
      // Digital Goods API v2 has no client acknowledge(): the Chrome docs
      // (developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing)
      // and chromeos.dev/en/publish/pwa-play-billing acknowledge on a backend with the
      // Play Developer API (purchases.products.acknowledge). The first release has no
      // backend (item 45), so this calls the v1 acknowledge() where the browser still
      // has it; complete('success') above only closes the Payment Request UI. See item 14.
      await service?.acknowledge?.(response.details.purchaseToken, 'onetime');
    } catch (error) {
      if (!isAbortError(error)) showError();
    }
  }, [setOwnedAndHint, showError]);

  const isLocked = isPremiumLocked(isBillingAvailable, enforced, owned);
  const requirePremium = useCallback(
    (action?: () => void) => {
      if (isLocked) setDialogOpen(true);
      else action?.();
    },
    [isLocked]
  );

  const price = useMemo(() => (priceDetails ? formatPrice(priceDetails, language) : null), [priceDetails, language]);

  return useMemo(
    () => ({
      isPremium: !isBillingAvailable || owned,
      isBillingAvailable,
      isLocked,
      price,
      buy,
      restore,
      requirePremium,
      isDialogOpen,
      setDialogOpen,
    }),
    [isBillingAvailable, owned, isLocked, price, buy, restore, requirePremium, isDialogOpen]
  );
};
