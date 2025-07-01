
import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show on mobile devices
      if (isMobile) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isMobile]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Hide for 24 hours
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  // Check if user dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed) {
      const dismissTime = parseInt(dismissed);
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissTime < dayInMs) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (!showPrompt || !deferredPrompt || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg border border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install Sun Tracker</h3>
          <p className="text-xs text-gray-300">
            Add to your home screen for the best experience
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-3 w-3 mr-1" />
            Install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-gray-300 hover:text-white hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
