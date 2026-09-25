
import React, { useState, useEffect } from 'react';
import { Fullscreen, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullscreenButtonProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({ onFullscreenChange }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenState = !!document.fullscreenElement;
      setIsFullscreen(fullscreenState);
      onFullscreenChange?.(fullscreenState);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenChange]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
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

  // iPhone Safari has no Fullscreen API; render nothing rather than a button that does nothing.
  if (document.fullscreenEnabled === false) {
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
      className={`fixed top-4 left-4 z-40 bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white border border-white/20 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
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
