
import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GLASS_SURFACE } from '@/utils/glassChrome';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [manualSteps, setManualSteps] = useState<string[] | null>(null);

  // Both are plain reads of the current browser environment, so they're derived
  // during render instead of synced into state via an effect.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as Navigator & { standalone?: boolean }).standalone ||
                     document.referrer.includes('android-app://');

  useEffect(() => {
    if (isStandalone) {
      return;
    }

    let showPromptTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user dismissed recently
      const dismissed = localStorage.getItem('pwa-dismissed');
      if (dismissed) {
        const dismissTime = parseInt(dismissed);
        const dayInMs = 24 * 60 * 60 * 1000;
        if (Date.now() - dismissTime < dayInMs) {
          return;
        }
      }

      // Show prompt after a delay
      showPromptTimeoutId = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS has no beforeinstallprompt event, so it's the only platform that needs the
    // manual fallback prompt (not just any narrow window).
    if (isIOS) {
      const dismissed = localStorage.getItem('pwa-dismissed');
      if (!dismissed || (Date.now() - parseInt(dismissed)) > 24 * 60 * 60 * 1000) {
        fallbackTimeoutId = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (showPromptTimeoutId) clearTimeout(showPromptTimeoutId);
      if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
    };
  }, [isIOS, isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
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

  // Manual steps show inside this card, not in a blocking alert() (AUDIT C-7).
  const showManualInstructions = () => {
    if (isIOS) {
      setManualSteps([
        'Tap the Share button (⬆️) at the bottom',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to confirm',
      ]);
    } else if (/Android/.test(navigator.userAgent)) {
      setManualSteps([
        'Tap the menu (⋮) in your browser',
        'Look for "Add to Home Screen" or "Install App"',
        'Tap "Add" or "Install"',
      ]);
    } else {
      setManualSteps([
        'Look for an install icon in your address bar',
        'Or check your browser menu for "Install Sun Chaser"',
        'Click "Install" to add it as a desktop app',
      ]);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 ${GLASS_SURFACE} rounded-panel text-white p-4 animate-in slide-in-from-bottom-2 duration-500`}
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom))',
        left: 'calc(1rem + env(safe-area-inset-left))',
        right: 'calc(1rem + env(safe-area-inset-right))',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <Smartphone className="h-8 w-8 text-brand-peach" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-title mb-1">Install Sun Chaser</h3>
            {manualSteps ? (
              <ol className="list-decimal pl-5 text-body text-white/80 leading-relaxed">
                {manualSteps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            ) : (
              <p className="text-body text-white/80 leading-relaxed">
                Get the full app experience! Install Sun Chaser for offline access,
                faster loading, and easy access from your home screen.
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={manualSteps ? () => setShowPrompt(false) : handleInstall}
            className="rounded-full bg-brand-sunset text-brand-night hover:bg-brand-sunset/90 font-semibold px-4 py-2"
          >
            {manualSteps ? 'Got it' : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Install
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="rounded-full text-white/70 hover:text-white hover:bg-white/10 px-3 py-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
