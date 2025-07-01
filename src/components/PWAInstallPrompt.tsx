
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
    console.log('[PWA Debug] isMobile:', isMobile);
    
    const handler = (e: Event) => {
      console.log('[PWA Debug] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('pwa-dismissed');
      if (dismissed) {
        const dismissTime = parseInt(dismissed);
        const dayInMs = 24 * 60 * 60 * 1000;
        if (Date.now() - dismissTime < dayInMs) {
          console.log('[PWA Debug] Recently dismissed, not showing prompt');
          return;
        }
      }
      
      // Show on mobile devices or if not mobile but prompt is available
      if (isMobile || window.innerWidth <= 768) {
        console.log('[PWA Debug] Showing install prompt');
        setShowPrompt(true);
      }
    };

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA Debug] Already installed as PWA');
      return;
    }

    window.addEventListener('beforeinstallprompt', handler);
    
    // Fallback for mobile detection if beforeinstallprompt doesn't fire
    const checkMobileAndShow = () => {
      if ((isMobile || window.innerWidth <= 768) && !deferredPrompt) {
        console.log('[PWA Debug] Mobile detected, checking for PWA install availability');
        // On mobile, show a generic install message even if beforeinstallprompt didn't fire
        const dismissed = localStorage.getItem('pwa-dismissed');
        if (!dismissed || (Date.now() - parseInt(dismissed)) > 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            if (!deferredPrompt && !showPrompt) {
              console.log('[PWA Debug] Showing fallback mobile install prompt');
              setShowPrompt(true);
            }
          }, 3000); // Show after 3 seconds if no native prompt
        }
      }
    };

    if (isMobile !== undefined) {
      checkMobileAndShow();
    }
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isMobile, deferredPrompt, showPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      console.log('[PWA Debug] Using native install prompt');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else {
      console.log('[PWA Debug] No native prompt, showing manual instructions');
      // Fallback for browsers that don't support beforeinstallprompt
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      let message = 'To install this app:\n';
      if (isIOS) {
        message += '1. Tap the Share button\n2. Select "Add to Home Screen"';
      } else if (isAndroid) {
        message += '1. Tap the menu (⋮)\n2. Select "Add to Home Screen" or "Install App"';
      } else {
        message += '1. Look for "Install" or "Add to Home Screen" in your browser menu';
      }
      
      alert(message);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    console.log('[PWA Debug] User dismissed install prompt');
    setShowPrompt(false);
    // Hide for 24 hours
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  // Don't show if already installed
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg border border-white/20 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install Sun Chaser</h3>
          <p className="text-xs text-gray-300">
            Add to your home screen for the best experience and offline access
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
          >
            <Download className="h-3 w-3 mr-1" />
            Install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-gray-300 hover:text-white hover:bg-white/10 text-xs px-2 py-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
