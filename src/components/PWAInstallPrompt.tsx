
import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { type MessageKey } from '@/i18n';
import { useLanguage } from '@/hooks/useLanguage';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [manualSteps, setManualSteps] = useState<MessageKey[] | null>(null);
  const { t } = useLanguage();

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
      setManualSteps(['install.ios1', 'install.ios2', 'install.ios3']);
    } else if (/Android/.test(navigator.userAgent)) {
      setManualSteps(['install.android1', 'install.android2', 'install.android3']);
    } else {
      setManualSteps(['install.desktop1', 'install.desktop2', 'install.desktop3']);
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
      data-share-hide
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
            <h3 className="font-bold text-title mb-1">{t('install.title')}</h3>
            {manualSteps ? (
              <ol className="list-decimal pl-5 text-body text-white/80 leading-relaxed">
                {manualSteps.map((step) => <li key={step}>{t(step)}</li>)}
              </ol>
            ) : (
              <p className="text-body text-white/80 leading-relaxed">
                {t('install.text')}
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
            {manualSteps ? t('install.gotIt') : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('install.install')}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            aria-label={t('install.dismiss')}
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
