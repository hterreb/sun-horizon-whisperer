
import React, { useState, useEffect } from 'react';
import { Fullscreen, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GLASS_ICON_BUTTON } from '@/utils/glassChrome';
import { useLanguage } from '@/hooks/useLanguage';

interface FullscreenButtonProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// Safari (desktop and some WebViews) only exposes the older webkit-prefixed
// Fullscreen API; iPhone Safari exposes neither (see CLAUDE.md gotchas / ROADMAP item 4).
interface WebkitDocumentElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface WebkitDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({ onFullscreenChange }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as WebkitDocument;
      const fullscreenState = !!(document.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(fullscreenState);
      onFullscreenChange?.(fullscreenState);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  const toggleFullscreen = async () => {
    try {
      const el = document.documentElement as WebkitDocumentElement;
      const doc = document as WebkitDocument;
      const isCurrentlyFullscreen = !!(document.fullscreenElement || doc.webkitFullscreenElement);

      if (!isCurrentlyFullscreen) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // iPhone Safari has neither the standard nor the webkit-prefixed Fullscreen API;
  // render nothing rather than a button that does nothing.
  const hasFullscreenApi = document.fullscreenEnabled !== false || (document as WebkitDocument).webkitFullscreenEnabled === true;
  if (!hasFullscreenApi) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFullscreen}
      className={`${GLASS_ICON_BUTTON} text-white`}
      title={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
      aria-label={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
    >
      {isFullscreen ? (
        <Minimize className="h-4 w-4" />
      ) : (
        <Fullscreen className="h-4 w-4" />
      )}
    </Button>
  );
};

export default FullscreenButton;
