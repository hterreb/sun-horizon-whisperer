
import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone || 
                     document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    console.log('[PWA Debug] iOS:', iOS, 'Standalone:', standalone, 'Mobile:', isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (isStandalone) {
      console.log('[PWA Debug] Already installed, not showing prompt');
      return;
    }

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
      
      // Show prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // For iOS or if no beforeinstallprompt, show manual install prompt
    if ((isIOS || !deferredPrompt) && (isMobile || window.innerWidth <= 768)) {
      const dismissed = localStorage.getItem('pwa-dismissed');
      if (!dismissed || (Date.now() - parseInt(dismissed)) > 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          if (!showPrompt) {
            console.log('[PWA Debug] Showing fallback install prompt');
            setShowPrompt(true);
          }
        }, 5000);
      }
    }
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isMobile, isIOS, isStandalone, deferredPrompt, showPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      console.log('[PWA Debug] Using native install prompt');
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('[PWA Debug] User accepted install');
          setDeferredPrompt(null);
          setShowPrompt(false);
        }
      } catch (error) {
        console.error('[PWA Debug] Install prompt error:', error);
        showManualInstructions();
      }
    } else {
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    console.log('[PWA Debug] Showing manual install instructions');
    
    let message = 'To install Sun Chaser as an app:\n\n';
    
    if (isIOS) {
      message += '📱 On iPhone/iPad:\n';
      message += '1. Tap the Share button (⬆️) at the bottom\n';
      message += '2. Scroll down and tap "Add to Home Screen"\n';
      message += '3. Tap "Add" to confirm\n\n';
      message += 'The app will appear on your home screen!';
    } else if (/Android/.test(navigator.userAgent)) {
      message += '📱 On Android:\n';
      message += '1. Tap the menu (⋮) in your browser\n';
      message += '2. Look for "Add to Home Screen" or "Install App"\n';
      message += '3. Tap "Add" or "Install"\n\n';
      message += 'The app will be added to your home screen!';
    } else {
      message += '💻 On Desktop:\n';
      message += '1. Look for an install icon in your address bar\n';
      message += '2. Or check your browser menu for "Install Sun Chaser"\n';
      message += '3. Click "Install" to add it as a desktop app';
    }
    
    alert(message);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    console.log('[PWA Debug] User dismissed install prompt');
    setShowPrompt(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-gradient-to-r from-blue-900/95 to-purple-900/95 backdrop-blur-md text-white p-4 rounded-xl border border-white/20 shadow-2xl animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <Smartphone className="h-8 w-8 text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1 text-blue-100">Install Sun Chaser</h3>
            <p className="text-sm text-gray-200 leading-relaxed">
              Get the full app experience! Install Sun Chaser for offline access, 
              faster loading, and easy access from your home screen.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-4 py-2 shadow-lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
