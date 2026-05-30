import * as React from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_PUBLIC_KEY = 'BLA5LxMq9q_LRmLD941wmpjEVoPI5KECTF44ySo0X3TpF5Y2NooH-YtLrJ35ymlvIGw7WUrOjThyVggGhiZODJg';

/**
 * Utility helper to convert Base64 VAPID Public key to a Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = React.useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  
  const [isSubscribing, setIsSubscribing] = React.useState(false);

  // Sync / Register active subscription in Firestore
  const syncPushSubscription = React.useCallback(async (userId: string) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported in this browser context');
      return;
    }

    setIsSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
        console.log('Successfully subscribed browser to Web Push service');
      }

      // Save subscription object to Firestore
      const subscriptionJSON = subscription.toJSON();
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        pushSubscriptions: arrayUnion(subscriptionJSON)
      });
      
      console.log('Saved push subscription details inside user profile');
    } catch (err) {
      console.error('Failed to broker browser push subscription', err);
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  const requestPermission = React.useCallback(async (userId?: string) => {
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
  }, [syncPushSubscription]);

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
    isSupported: typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  };
}
