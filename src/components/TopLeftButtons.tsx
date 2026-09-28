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

// The top-left button column (ROADMAP item 22: FullscreenButton + CompassToggle in one
// fixed flex column, stacked vertically since item 31; ROADMAP item 23 adds a "Send
// feedback" button, shown only when Sentry feedback is set up, so it's reachable in
// fullscreen too - see isFeedbackAvailable). One visibility rule for the whole column:
// visible when not in fullscreen, or the idle timer hasn't fired (`showCursor`), or a
// button in it has keyboard focus - `has-[:focus-visible]`, not `focus-within`: a
// mouse click or tap also focuses the button, and `focus-within` then kept the column
// visible for the whole fullscreen session (ROADMAP item 31).
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
      className={`animate-fade-in fixed z-40 flex flex-col items-center gap-2 transition-opacity duration-300 has-[:focus-visible]:opacity-100 ${
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
