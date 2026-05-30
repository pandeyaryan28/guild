import * as React from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    // 1. Detect standalone mode
    const standaloneCheck = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;
    setIsStandalone(standaloneCheck);

    // 2. Detect iOS
    const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iosCheck);

    // 3. Bind install event for Chrome/Edge/Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait 5 seconds before showing to avoid annoying the user on immediate entry
      const timer = setTimeout(() => {
        if (!standaloneCheck) {
          setShowPrompt(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. Fallback for iOS Safari - show custom prompt after 6 seconds
    if (iosCheck && !standaloneCheck) {
      const iosTimer = setTimeout(() => {
        // Only show if user hasn't dismissed it in this session
        if (!sessionStorage.getItem('dismiss-ios-pwa-prompt')) {
          setShowPrompt(true);
        }
      }, 6000);
      return () => clearTimeout(iosTimer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Hide our prompt UI
    setShowPrompt(false);
    
    // Show the browser's install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setDeferredPrompt(null);
    } else {
      console.log('User dismissed the PWA install prompt');
      // Keep it deferred so they can try again later
      setShowPrompt(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      sessionStorage.setItem('dismiss-ios-pwa-prompt', 'true');
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-[9990] flex justify-center pointer-events-none">
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="aether-glass w-full max-w-sm p-4 rounded-2xl border border-white/10 shadow-2xl flex flex-col gap-3 pointer-events-auto bg-surface/90 backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <Download className="w-4.5 h-4.5 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-foreground tracking-wide leading-tight">Install Guild Workspace</h4>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5 leading-snug">Add to home screen for absolute offline flow and zero browser chrome.</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="h-6 w-6 rounded-full hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Area */}
          {isIOS ? (
            /* iOS Specific Helper Prompt */
            <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-bold text-muted-foreground">
              <div className="flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>1. Tap the <b className="text-foreground">Share</b> button on Safari's bottom toolbar.</span>
              </div>
              <div className="flex items-center gap-2">
                <PlusSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>2. Scroll down and select <b className="text-foreground">"Add to Home Screen"</b>.</span>
              </div>
            </div>
          ) : (
            /* Standard Programmatic Chrome/Android/Edge Button */
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white py-2.5 text-[11px] font-black tracking-widest transition-all active:scale-98 cursor-pointer shadow-lg shadow-primary/10"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>INSTALL NOW</span>
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
