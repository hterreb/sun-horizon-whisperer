import React, { useState } from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type CompassStatus } from '@/hooks/useCompassHeading';
import { GLASS_ICON_BUTTON } from '@/utils/glassChrome';

interface CompassToggleProps {
  status: CompassStatus;
  onEnable: () => void;
  onDisable: () => void;
  // Fade out together with FullscreenButton while idle in fullscreen (ROADMAP item
  // 18); both default to their non-fullscreen values so existing callers/tests that
  // don't pass them keep the toggle always visible.
  isFullscreen?: boolean;
  showCursor?: boolean;
}

// Opt-in live compass mode toggle (ROADMAP item 8). Sits beside FullscreenButton
// (same z-40 UI-chrome layer and safe-area padding), hidden entirely when the
// device has no DeviceOrientationEvent, and hidden again once permission was denied
// or no sensor reading ever arrived (see useCompassHeading's 'unavailable' status).
const CompassToggle: React.FC<CompassToggleProps> = ({
  status,
  onEnable,
  onDisable,
  isFullscreen = false,
  showCursor = true
}) => {
  // Keyboard focus must reveal the button even while `showCursor` is false (it's
  // still in the DOM at opacity-0, never display:none, so tabbing to it can focus it
  // without a prior mouse move) - ROADMAP item 18.
  const [isFocused, setIsFocused] = useState(false);

  if (status === 'unsupported' || status === 'unavailable') {
    return null;
  }

  const isActive = status === 'active';
  const isVisible = !isFullscreen || showCursor || isFocused;

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
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={isActive ? 'Disable compass' : 'Enable compass'}
      aria-pressed={isActive}
      className={`fixed z-40 ${GLASS_ICON_BUTTON} transition-colors transition-opacity duration-300 ${
        isActive ? 'text-brand-sky' : 'text-white'
      } ${isVisible ? 'opacity-100' : 'opacity-0'}`}
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
