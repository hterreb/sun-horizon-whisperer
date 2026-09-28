import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type CompassStatus } from '@/hooks/useCompassHeading';
import { GLASS_ICON_BUTTON } from '@/utils/glassChrome';
import { isFeedbackAvailable, openFeedbackForm } from '@/utils/feedback';
import FullscreenButton from './FullscreenButton';
import CompassToggle from './CompassToggle';

interface TopLeftButtonsProps {
  isFullscreen: boolean;
  showCursor: boolean;
  onFullscreenChange: (isFullscreen: boolean) => void;
  compassStatus: CompassStatus;
  onCompassEnable: () => void;
  onCompassDisable: () => void;
}

// The top-left button row (ROADMAP item 22: FullscreenButton + CompassToggle in one
// fixed flex row; ROADMAP item 23 adds a "Send feedback" button, shown only when
// Sentry feedback is set up, so it's reachable in fullscreen too - see
// isFeedbackAvailable). One visibility rule for the whole row: visible when not in
// fullscreen, or the idle timer hasn't fired (`showCursor`), or a button in the row
// has keyboard focus - the last case needs no JS state, `focus-within` covers it.
const TopLeftButtons: React.FC<TopLeftButtonsProps> = ({
  isFullscreen,
  showCursor,
  onFullscreenChange,
  compassStatus,
  onCompassEnable,
  onCompassDisable
}) => {
  const isVisible = !isFullscreen || showCursor;

  return (
    <div
      className={`fixed z-40 flex items-center gap-2 transition-opacity duration-300 focus-within:opacity-100 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        top: 'calc(1rem + env(safe-area-inset-top))',
        left: 'calc(1rem + env(safe-area-inset-left))',
      }}
    >
      <FullscreenButton onFullscreenChange={onFullscreenChange} />
      <CompassToggle status={compassStatus} onEnable={onCompassEnable} onDisable={onCompassDisable} />
      {isFeedbackAvailable() && (
        <Button
          variant="ghost"
          size="icon"
          onClick={openFeedbackForm}
          aria-label="Send feedback"
          className={`${GLASS_ICON_BUTTON} text-white`}
          title="Send feedback"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default TopLeftButtons;
