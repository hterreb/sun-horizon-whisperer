import React, { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import PremiumBadge from '@/components/PremiumBadge';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { usePremiumGate } from '@/hooks/usePremium';
import { captureShareView, drawShareCard, getShareCardData, shareOrDownload, type ShareCardInput } from '@/utils/shareCard';
import { type HorizonProfile } from '@/utils/horizonUtils';

// Share card (ROADMAP item 68): the "Share" button in the Sunset row, with the gold
// plus (item 35). Gated through requirePremium (item 14). Since item 78 it shares the
// current view (the scene root marked `data-share-root`); the drawn card is the fallback.
interface ShareCardButtonProps {
  card: ShareCardInput;
  latitude: number;
  longitude: number;
  horizonProfile: HorizonProfile | null;
  className?: string;
}

const ShareCardButton: React.FC<ShareCardButtonProps> = ({ card, latitude, longitude, horizonProfile, className = '' }) => {
  const [isBusy, setIsBusy] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t, language } = useLanguage();
  const { requirePremium } = usePremiumGate();

  const handleClick = async () => {
    setIsBusy(true);
    try {
      const data = getShareCardData(card, language);
      const root = buttonRef.current?.closest<HTMLElement>('[data-share-root]');
      let blob: Blob;
      let fileName = data.viewFileName;
      try {
        if (!root) throw new Error('No scene to capture');
        blob = await captureShareView(root, data);
      } catch {
        // An old browser, or the capture chunk could not load: the item-68 card.
        blob = await drawShareCard(data, latitude, longitude, horizonProfile);
        fileName = data.fileName;
      }
      await shareOrDownload(blob, fileName);
    } catch {
      toast({ title: t('share.failedTitle'), description: t('share.failedDescription') });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => requirePremium(handleClick)}
      disabled={isBusy}
      className={`${className} relative ml-1`}
      aria-label={t('share.button')}
      title={t('share.button')}
    >
      <Share2 size={14} />
      <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />
    </button>
  );
};

export default ShareCardButton;
