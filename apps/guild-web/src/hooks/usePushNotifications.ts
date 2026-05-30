import * as React from 'react';

export function usePushNotifications() {
  const [permission, setPermission] = React.useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const requestPermission = React.useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return 'default';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (e) {
      console.error('Error requesting notification permission', e);
      return 'default';
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  return {
    permission,
    requestPermission,
    isSupported: typeof window !== 'undefined' && 'Notification' in window
  };
}
