import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global cached prompt to share across components (Dashboard, Settings, prompts)
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((lis) => lis(globalDeferredPrompt));
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('guild_install_cta_dismissed') === 'true';
    }
    return false;
  });

  React.useEffect(() => {
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(checkIOS);

    const listener = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };

    promptListeners.add(listener);
    return () => {
      promptListeners.delete(listener);
    };
  }, []);

  const install = React.useCallback(async () => {
    if (isIOS) {
      // For iOS Safari, guide them (handled by layouts or local notices)
      return 'ios_guide';
    }

    if (!deferredPrompt) {
      console.warn('Install prompt is not available yet');
      return 'unavailable';
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        promptListeners.forEach((lis) => lis(null));
        return 'accepted';
      }
      return 'dismissed';
    } catch (e) {
      console.error('PWA Installation failed programmatically', e);
      return 'failed';
    }
  }, [deferredPrompt, isIOS]);

  const dismiss = React.useCallback(() => {
    localStorage.setItem('guild_install_cta_dismissed', 'true');
    setIsDismissed(true);
  }, []);

  const resetDismiss = React.useCallback(() => {
    localStorage.removeItem('guild_install_cta_dismissed');
    setIsDismissed(false);
  }, []);

  return {
    isInstallable: !!deferredPrompt || isIOS,
    isStandalone,
    isIOS,
    isDismissed,
    install,
    dismiss,
    resetDismiss,
  };
}
