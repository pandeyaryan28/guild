import * as React from 'react';
import { useAuth } from './useAuth';
import type { Notification } from '@guild/types';
import {
  listenToNotifications,
  listenToArchivedNotifications,
  markNotificationRead,
  archiveNotification,
  markAllRead as dbMarkAllRead,
  archiveAllRead as dbArchiveAllRead,
  archiveAll as dbArchiveAll,
} from '../lib/notifications';
import { useWorkspaceData } from '../context/WorkspaceDataContext';

interface UseNotificationsReturn {
  notifications: Notification[];
  archivedNotifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markUnread: (id: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  archiveAllRead: () => Promise<void>;
  archiveAll: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  activeToasts: Notification[];
  dismissToast: (id: string) => void;
}

export function useNotifications(orgId: string | undefined): UseNotificationsReturn {
  const { user } = useAuth();
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackNotifications, setFallbackNotifications] = React.useState<Notification[]>([]);
  const [fallbackArchived, setFallbackArchived] = React.useState<Notification[]>([]);
  const [fallbackLoading, setFallbackLoading] = React.useState(true);
  const [fallbackToasts, setFallbackToasts] = React.useState<Notification[]>([]);

  const seenIdsRef = React.useRef<Set<string>>(new Set());
  const isFirstRun = React.useRef(true);

  React.useEffect(() => {
    if (canUseContext || !orgId || !user?.uid) {
      if (!orgId || !user?.uid) {
        setFallbackNotifications([]);
        setFallbackLoading(false);
      }
      return;
    }
    setFallbackLoading(true);
    seenIdsRef.current.clear();
    isFirstRun.current = true;

    return listenToNotifications(orgId, user.uid, (notifs) => {
      const newNotifs = notifs.filter((n) => !seenIdsRef.current.has(n.id));
      notifs.forEach((n) => seenIdsRef.current.add(n.id));

      if (!isFirstRun.current) {
        const freshUnread = newNotifs.filter((n) => !n.read && !n.archived);
        if (freshUnread.length > 0) {
          setFallbackToasts((prev) => [...prev, ...freshUnread]);
        }
      } else {
        isFirstRun.current = false;
      }

      setFallbackNotifications(notifs);
      setFallbackLoading(false);
    });
  }, [canUseContext, orgId, user?.uid]);

  React.useEffect(() => {
    if (canUseContext || !orgId || !user?.uid) {
      if (!orgId || !user?.uid) setFallbackArchived([]);
      return;
    }
    return listenToArchivedNotifications(orgId, user.uid, (notifs) => {
      setFallbackArchived(notifs);
    });
  }, [canUseContext, orgId, user?.uid]);

  React.useEffect(() => {
    if (canUseContext || fallbackToasts.length === 0) return;
    const oldest = fallbackToasts[0];
    const timer = setTimeout(() => {
      setFallbackToasts((prev) => prev.filter((t) => t.id !== oldest.id));
    }, 5000);
    return () => clearTimeout(timer);
  }, [canUseContext, fallbackToasts]);

  const notifications = canUseContext && workspace ? workspace.notifications : fallbackNotifications;
  const archivedNotifications = canUseContext && workspace ? workspace.archivedNotifications : fallbackArchived;
  const loading = canUseContext && workspace ? workspace.notificationsLoading : fallbackLoading;
  const activeToasts = canUseContext && workspace ? workspace.activeToasts : fallbackToasts;

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const dismissToast = React.useCallback((id: string) => {
    if (canUseContext && workspace) {
      workspace.dismissToast(id);
    } else {
      setFallbackToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }, [canUseContext, workspace]);

  const markRead = React.useCallback(async (id: string) => {
    await markNotificationRead(id, true);
  }, []);

  const markUnread = React.useCallback(async (id: string) => {
    await markNotificationRead(id, false);
  }, []);

  const archive = React.useCallback(async (id: string) => {
    await archiveNotification(id, true);
    dismissToast(id);
  }, [dismissToast]);

  const archiveAllRead = React.useCallback(async () => {
    if (!orgId || !user?.uid) return;
    await dbArchiveAllRead(orgId, user.uid);
  }, [orgId, user?.uid]);

  const archiveAll = React.useCallback(async () => {
    if (!orgId || !user?.uid) return;
    await dbArchiveAll(orgId, user.uid);
    if (canUseContext && workspace) {
      workspace.clearActiveToasts();
    } else {
      setFallbackToasts([]);
    }
  }, [canUseContext, workspace, orgId, user?.uid]);

  const markAllAsRead = React.useCallback(async () => {
    if (!orgId || !user?.uid) return;
    await dbMarkAllRead(orgId, user.uid);
  }, [orgId, user?.uid]);

  return {
    notifications,
    archivedNotifications,
    unreadCount,
    loading,
    markRead,
    markUnread,
    archive,
    archiveAllRead,
    archiveAll,
    markAllAsRead,
    activeToasts,
    dismissToast,
  };
}
