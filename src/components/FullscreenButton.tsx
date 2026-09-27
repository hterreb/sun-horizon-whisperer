
import React, { useState, useEffect } from 'react';
import { Fullscreen, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [isVisible, setIsVisible] = useState(true);

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

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (isFullscreen) {
      setIsVisible(false);
    }
  };

  // Keyboard focus and touch also need to bring the button back, not just mouse hover.
  const handleFocus = () => {
    setIsVisible(true);
  };

  const handleTouchStart = () => {
    setIsVisible(true);
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onTouchStart={handleTouchStart}
      className={`fixed z-40 bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white border border-white/20 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        top: 'calc(1rem + env(safe-area-inset-top))',
        left: 'calc(1rem + env(safe-area-inset-left))',
      }}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
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
