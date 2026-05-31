import * as React from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_PUBLIC_KEY = 'BLA5LxMq9q_LRmLD941wmpjEVoPI5KECTF44ySo0X3TpF5Y2NooH-YtLrJ35ymlvIGw7WUrOjThyVggGhiZODJg';

/**
 * Converts a URL-safe Base64 VAPID public key into a Uint8Array for the Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Waits until the service worker is both active AND controlling this page.
 * This is critical: navigator.serviceWorker.ready resolves when a SW is active,
 * but it may not be controlling the page yet (controller === null). Subscribing
 * to push while controller === null causes `AbortError: push service error`.
 *
 * We wait for a controllerchange event with a 5-second timeout fallback (reload).
 */
async function waitForActiveController(registration: ServiceWorkerRegistration): Promise<void> {
  // If already controlling this page, we're good.
  if (navigator.serviceWorker.controller) return;

  // Otherwise wait for the controller to change (new SW claims all clients).
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      // Timeout: reload the page so the new SW takes control.
      window.location.reload();
    }, 5000);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

export function usePushNotifications() {
  const [permission, setPermission] = React.useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [isSubscribing, setIsSubscribing] = React.useState(false);
  const [subscriptionError, setSubscriptionError] = React.useState<string | null>(null);
  const [isBraveBlocked, setIsBraveBlocked] = React.useState(false);

  const isIOS = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }, []);

  const isStandalone = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  }, []);

  /**
   * Syncs the push subscription for the given userId.
   * Safe to call multiple times — reuses an existing subscription if one exists.
   */
  const syncPushSubscription = React.useCallback(async (userId: string) => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      console.warn('Push messaging is not supported in this browser context');
      return;
    }

    setIsSubscribing(true);
    setSubscriptionError(null);
    setIsBraveBlocked(false);

    try {
      // Step 1: Wait for the service worker to be fully active.
      const registration = await navigator.serviceWorker.ready;

      // Step 2: Wait until this SW is actually controlling the page.
      // Without this, pushManager.subscribe() fails with AbortError because
      // the push service rejects subscriptions from non-controlling SWs.
      await waitForActiveController(registration);

      // Step 3: Get existing subscription or create a new one.
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        console.log('[Push] New push subscription created');
      } else {
        console.log('[Push] Reusing existing push subscription');
      }

      // Step 4: Persist the subscription object in Firestore.
      const subscriptionJSON = subscription.toJSON();
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushSubscriptions: arrayUnion(subscriptionJSON),
      });

      console.log('[Push] Subscription saved to Firestore');
    } catch (err: any) {
      console.error('[Push] Failed to broker browser push subscription', err);

      const isBrave = typeof navigator !== 'undefined' && 'brave' in navigator;
      if (isBrave && (err.name === 'AbortError' || err.message?.includes('push service error'))) {
        setIsBraveBlocked(true);
        setSubscriptionError(
          'Brave blocked push service registration. Enable Google Services in brave://settings/privacy.'
        );
      } else if (err.name === 'AbortError') {
        setSubscriptionError(
          'Push subscription failed — the service worker may still be loading. Please reload the page and try again.'
        );
      } else {
        setSubscriptionError(err.message || 'Push registration failed');
      }
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  const requestPermission = React.useCallback(
    async (userId?: string) => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return 'default';
      }

      try {
        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'granted' && userId) {
          await syncPushSubscription(userId);
        }

        return result;
      } catch (e) {
        console.error('Error requesting notification permission', e);
        return 'default';
      }
    },
    [syncPushSubscription]
  );

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  return {
    permission,
    requestPermission,
    syncPushSubscription,
    isSubscribing,
    subscriptionError,
    isBraveBlocked,
    isIOS,
    isStandalone,
    isSupported:
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window,
  };
}
