import * as React from 'react';

/**
 * Custom React Hook to track the client's online/offline connectivity status.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState<boolean>(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Default fallback to online for SSR/pre-render
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline, { passive: true });
    window.addEventListener('offline', handleOffline, { passive: true });

    // Double check status upon mount to prevent race conditions
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
