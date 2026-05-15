import * as React from 'react';
import { useAuth } from './useAuth';
import {
  listenToNotifications,
  markNotificationRead,
  markAllRead,
  type Notification,
} from '../lib/notifications';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(orgId: string | undefined): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId || !user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenToNotifications(orgId, user.uid, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });
  }, [orgId, user?.uid]);

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markRead = React.useCallback(async (id: string) => {
    await markNotificationRead(id);
  }, []);

  const markAllAsRead = React.useCallback(async () => {
    if (!orgId || !user?.uid) return;
    await markAllRead(orgId, user.uid);
  }, [orgId, user?.uid]);

  return { notifications, unreadCount, loading, markRead, markAllAsRead };
}
