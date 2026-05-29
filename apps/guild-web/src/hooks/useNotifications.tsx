import * as React from 'react';
import { useAuth } from './useAuth';
import type { Notification, NotificationCategory } from '@guild/types';
import {
  listenToNotifications,
  listenToArchivedNotifications,
  markNotificationRead,
  archiveNotification,
  markAllRead as dbMarkAllRead,
  archiveAllRead as dbArchiveAllRead,
} from '../lib/notifications';

interface UseNotificationsReturn {
  notifications: Notification[];
  archivedNotifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markUnread: (id: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  archiveAllRead: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  activeToasts: Notification[];
  dismissToast: (id: string) => void;
}

export function useNotifications(orgId: string | undefined): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [archivedNotifications, setArchivedNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeToasts, setActiveToasts] = React.useState<Notification[]>([]);

  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstRun = React.useRef(true);

  // Subscribe to live active notifications
  React.useEffect(() => {
    if (!orgId || !user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    seenIdsRef.current.clear();
    isFirstRun.current = true;

    const unsub = listenToNotifications(orgId, user.uid, (notifs) => {
      // Detect newly arrived notifications
      const newNotifs = notifs.filter((n) => !seenIdsRef.current.has(n.id));

      // Update seen IDs
      notifs.forEach((n) => seenIdsRef.current.add(n.id));

      if (!isFirstRun.current) {
        const freshUnread = newNotifs.filter((n) => !n.read && !n.archived);
        if (freshUnread.length > 0) {
          setActiveToasts((prev) => [...prev, ...freshUnread]);
        }
      } else {
        isFirstRun.current = false;
      }

      setNotifications(notifs);
      setLoading(false);
    });

    return unsub;
  }, [orgId, user?.uid]);

  // Subscribe to archived notifications
  React.useEffect(() => {
    if (!orgId || !user?.uid) {
      setArchivedNotifications([]);
      return;
    }
    return listenToArchivedNotifications(orgId, user.uid, (notifs) => {
      setArchivedNotifications(notifs);
    });
  }, [orgId, user?.uid]);

  // Auto-dismiss toasts after 5 seconds
  React.useEffect(() => {
    if (activeToasts.length === 0) return;
    const oldest = activeToasts[0];
    const timer = setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== oldest.id));
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeToasts]);

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markRead = React.useCallback(async (id: string) => {
    await markNotificationRead(id, true);
  }, []);

  const markUnread = React.useCallback(async (id: string) => {
    await markNotificationRead(id, false);
  }, []);

  const archive = React.useCallback(async (id: string) => {
    await archiveNotification(id, true);
    // Dismiss toast if archived
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const archiveAllRead = React.useCallback(async () => {
    if (!orgId || !user?.uid) return;
    await dbArchiveAllRead(orgId, user.uid);
  }, [orgId, user?.uid]);

  const markAllAsRead = React.useCallback(async () => {
    if (!orgId || !user?.uid) return;
    await dbMarkAllRead(orgId, user.uid);
  }, [orgId, user?.uid]);

  const dismissToast = React.useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    notifications,
    archivedNotifications,
    unreadCount,
    loading,
    markRead,
    markUnread,
    archive,
    archiveAllRead,
    markAllAsRead,
    activeToasts,
    dismissToast,
  };
}
