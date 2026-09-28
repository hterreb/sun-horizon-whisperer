import React from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type CompassStatus } from '@/hooks/useCompassHeading';

interface CompassToggleProps {
  status: CompassStatus;
  onEnable: () => void;
  onDisable: () => void;
}

// Opt-in live compass mode toggle (ROADMAP item 8). Sits beside FullscreenButton
// (same z-40 UI-chrome layer and safe-area padding), hidden entirely when the
// device has no DeviceOrientationEvent, and hidden again once permission was denied
// or no sensor reading ever arrived (see useCompassHeading's 'unavailable' status).
const CompassToggle: React.FC<CompassToggleProps> = ({ status, onEnable, onDisable }) => {
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
      aria-label={isActive ? 'Disable compass' : 'Enable compass'}
      aria-pressed={isActive}
      className={`fixed z-40 bg-black/20 backdrop-blur-sm hover:bg-black/40 border border-white/20 transition-colors ${
        isActive ? 'text-brand-sky' : 'text-white'
      }`}
      style={{
        top: 'calc(1rem + env(safe-area-inset-top))',
        left: 'calc(4rem + env(safe-area-inset-left))',
      }}
      title={isActive ? 'Disable compass' : 'Enable compass'}
    >
      <Compass className="h-4 w-4" />
    </Button>
  );
};

export default CompassToggle;
