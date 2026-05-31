import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  // Unregister any stale/broken service workers from previous deploys.
  // This ensures users who have a broken cached SW (e.g., with the old importScripts
  // error) get a clean slate. The VitePWA registerSW call below will install the
  // correct new SW immediately afterward.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    // If there's already a registration but it has no active worker,
    // it's stuck in a broken install/waiting state — clean it up.
    for (const reg of registrations) {
      if (!reg.active || reg.active.scriptURL.includes('push-sw')) {
        reg.unregister().then(() => {
          console.log('[SW] Cleaned up stale/broken service worker registration');
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
