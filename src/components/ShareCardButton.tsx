import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import PremiumBadge from '@/components/PremiumBadge';
import { toast } from '@/hooks/use-toast';
import { drawShareCard, getShareCardData, shareOrDownload, type ShareCardInput } from '@/utils/shareCard';
import { type HorizonProfile } from '@/utils/horizonUtils';

// Share card (ROADMAP item 68): the "Share" button in the Sunset row, with the gold
// plus (item 35). Free while PREMIUM_ENFORCED is false; item 14 gates it later.
interface ShareCardButtonProps {
  card: ShareCardInput;
  latitude: number;
  longitude: number;
  horizonProfile: HorizonProfile | null;
  className?: string;
}

const ShareCardButton: React.FC<ShareCardButtonProps> = ({ card, latitude, longitude, horizonProfile, className = '' }) => {
  const [isBusy, setIsBusy] = useState(false);

  const handleClick = async () => {
    setIsBusy(true);
    try {
      const data = getShareCardData(card);
      const blob = await drawShareCard(data, latitude, longitude, horizonProfile);
      await shareOrDownload(blob, data.fileName);
    } catch {
      toast({ title: 'Could not share the sunset', description: 'Please try again.' });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      className={`${className} relative ml-1`}
      aria-label="Share sunset card"
      title="Share sunset card"
    >
      <Share2 size={14} />
      <PremiumBadge className="absolute -right-1 -top-1 h-2.5 w-2.5" />
    </button>
  );
};

export default ShareCardButton;
