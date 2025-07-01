
import React, { useState, useEffect } from 'react';
import { Fullscreen, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FullscreenButton: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFullscreen}
      className="fixed top-4 right-4 z-40 bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white border border-white/20 sm:right-[320px]"
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
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
