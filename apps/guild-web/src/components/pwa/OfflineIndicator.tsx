import * as React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showStatus, setShowStatus] = React.useState(false);
  const [wasOffline, setWasOffline] = React.useState(false);

  React.useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowStatus(true);
    } else if (isOnline && wasOffline) {
      // Reconnected: show online banner temporarily then slide out
      setShowStatus(true);
      const timer = setTimeout(() => {
        setShowStatus(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none select-none px-4 py-2 flex items-center justify-center"
        >
          <div
            className={`aether-glass px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 border backdrop-blur-xl transition-colors duration-300 text-xs font-black tracking-wide ${
              isOnline
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300 shadow-emerald-500/5'
                : 'border-amber-500/30 bg-amber-950/40 text-amber-300 shadow-amber-500/5'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Connection Restored — Syncing Operations</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>Operating in Offline Mode — Changes will sync</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
