import React from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type CompassStatus } from '@/hooks/useCompassHeading';
import { GLASS_ICON_BUTTON } from '@/utils/glassChrome';
import PremiumBadge from './PremiumBadge';
import { useLanguage } from '@/hooks/useLanguage';

interface CompassToggleProps {
  status: CompassStatus;
  onEnable: () => void;
  onDisable: () => void;
}

// Opt-in live compass mode toggle (ROADMAP item 8). Sits beside FullscreenButton in
// the shared top-left button row (ROADMAP item 22, TopLeftButtons.tsx), which owns
// the row's fixed position, safe-area padding and fullscreen-idle fade. Hidden
// entirely when the device has no DeviceOrientationEvent, and hidden again once
// permission was denied or no sensor reading ever arrived (see useCompassHeading's
// 'unavailable' status). Marked premium with a gold plus (ROADMAP item 35), still free.
const CompassToggle: React.FC<CompassToggleProps> = ({
  status,
  onEnable,
  onDisable
}) => {
  const { t } = useLanguage();
  if (status === 'unsupported' || status === 'unavailable') {
    return null;
  }

  const isActive = status === 'active';

  const handleClick = () => {
    if (isActive) {
      onDisable();
    } else {
      // Called directly from the click handler (no awaits before it) so iOS's
      // DeviceOrientationEvent.requestPermission() still sees a user gesture.
      onEnable();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label={isActive ? t('compass.disable') : t('compass.enable')}
      aria-pressed={isActive}
      className={`${GLASS_ICON_BUTTON} relative transition-colors ${isActive ? 'text-brand-sky' : 'text-white'}`}
      title={isActive ? t('compass.disable') : t('compass.enable')}
    >
      <Compass className="h-4 w-4" />
      <PremiumBadge className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5" />
    </Button>
  );
};

export default CompassToggle;
