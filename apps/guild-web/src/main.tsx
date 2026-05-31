import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  // Clean up any stale or deprecated service worker registrations.
  // We carefully avoid unregistering a service worker that is currently installing or waiting,
  // preventing a race condition where the new SW is destroyed before it has a chance to activate.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      const activeUrl = reg.active?.scriptURL || '';
      const installingUrl = reg.installing?.scriptURL || '';
      const waitingUrl = reg.waiting?.scriptURL || '';

      // 1. Unregister if it is the old deprecated standalone push service worker
      if (
        activeUrl.includes('push-sw') ||
        installingUrl.includes('push-sw') ||
        waitingUrl.includes('push-sw')
      ) {
        reg.unregister().then(() => {
          console.log('[SW] Cleaned up deprecated push-sw service worker');
        });
        continue;
      }

      // 2. Unregister only if the registration is entirely empty (has no active, installing, or waiting worker)
      if (!reg.active && !reg.installing && !reg.waiting) {
        reg.unregister().then(() => {
          console.log('[SW] Cleaned up empty/broken service worker registration');
        });
      }
    }
  });

  registerSW({
    immediate: true,
    onRegistered(registration) {
      console.log('[SW] Service worker registered', registration?.scope);
    },
    onRegisterError(error) {
      console.error('[SW] Service worker registration failed', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
