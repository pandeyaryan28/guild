import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCheck, AtSign, CheckSquare, MessageSquare,
  Hash, User, X, BellOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification, NotificationType } from '../lib/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  open: boolean;
  onClose: () => void;
}

// ─── Icon per type ────────────────────────────────────────────────────────────

const TYPE_META: Record<NotificationType, { icon: React.ElementType; color: string; label: (n: Notification) => string }> = {
  mention: {
    icon: AtSign,
    color: 'text-blue-400 bg-blue-400/10',
    label: (n) => `${n.actorName} mentioned you${n.data.channelId ? ' in a channel' : n.data.dmId ? ' in a DM' : ''}`,
  },
  task_assigned: {
    icon: CheckSquare,
    color: 'text-emerald-400 bg-emerald-400/10',
    label: (n) => `${n.actorName} assigned you to "${n.data.taskTitle ?? 'a task'}"`,
  },
  task_commented: {
    icon: MessageSquare,
    color: 'text-amber-400 bg-amber-400/10',
    label: (n) => `${n.actorName} commented on "${n.data.taskTitle ?? 'a task'}"`,
  },
  channel_invite: {
    icon: Hash,
    color: 'text-purple-400 bg-purple-400/10',
    label: (n) => `${n.actorName} invited you to #${n.data.channelName ?? 'a channel'}`,
  },
  dm_received: {
    icon: User,
    color: 'text-pink-400 bg-pink-400/10',
    label: (n) => `${n.actorName} sent you a direct message`,
  },
};

function notificationHref(n: Notification): string {
  if (n.type === 'task_assigned' || n.type === 'task_commented') {
    return n.data.taskId ? `/tasks?task=${n.data.taskId}` : '/tasks';
  }
  if (n.type === 'channel_invite' || (n.type === 'mention' && n.data.channelId)) {
    return `/chat/c/${n.data.channelId}`;
  }
  if (n.type === 'dm_received' || (n.type === 'mention' && n.data.dmId)) {
    return `/chat/dm/${n.data.dmId ?? ''}`;
  }
  return '/';
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(ts: Notification['createdAt']): string {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return ts.toDate().toLocaleDateString();
}

function groupDate(ts: Notification['createdAt']): string {
  if (!ts?.toDate) return 'Earlier';
  const date = ts.toDate();
  const now = new Date();
  const diff = now.setHours(0, 0, 0, 0) - new Date(date.setHours(0, 0, 0, 0)).getTime();
  if (diff <= 0) return 'Today';
  if (diff <= 86400000) return 'Yesterday';
  return 'Earlier';
}

// ─── Single row ───────────────────────────────────────────────────────────────

function NotifRow({
  n,
  onMarkRead,
  onNavigate,
}: {
  n: Notification;
  onMarkRead: (id: string) => Promise<void>;
  onNavigate: (href: string) => void;
}) {
  const meta = TYPE_META[n.type];
  const Icon = meta?.icon ?? Bell;

  async function handleClick() {
    if (!n.read) await onMarkRead(n.id);
    onNavigate(notificationHref(n));
  }

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.15 }}
      onClick={handleClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        n.read
          ? 'text-muted-foreground hover:bg-accent/20'
          : 'bg-primary/5 hover:bg-primary/10',
      )}
    >
      {/* Type icon */}
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', meta?.color ?? 'bg-muted text-muted-foreground')}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-snug', n.read ? 'text-muted-foreground' : 'font-medium text-foreground')}>
          {meta?.label(n) ?? `Notification from ${n.actorName}`}
        </p>
        {(n.data.messagePreview || n.data.commentPreview) && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/60">
            "{n.data.messagePreview ?? n.data.commentPreview}"
          </p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground/40">{relativeTime(n.createdAt)}</p>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary ring-2 ring-background" />
      )}
    </motion.button>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function NotificationPanel({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  open,
  onClose,
}: NotificationPanelProps) {
  const navigate = useNavigate();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Click outside
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // slight delay so the button click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [open, onClose]);

  // Group notifications
  const groups = React.useMemo(() => {
    const map: Record<string, Notification[]> = {};
    for (const n of notifications) {
      const g = groupDate(n.createdAt);
      (map[g] = map[g] ?? []).push(n);
    }
    // Order groups
    return (['Today', 'Yesterday', 'Earlier'] as const)
      .filter((g) => map[g]?.length)
      .map((g) => ({ label: g, items: map[g] }));
  }, [notifications]);

  function handleNavigate(href: string) {
    navigate(href);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -6 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="absolute right-0 top-full z-50 mt-2 w-[380px] origin-top-right overflow-hidden rounded-xl border border-border/50 bg-background/95 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={onMarkAllRead}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  All read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[480px] overflow-y-auto scrollbar-hide">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border/40 bg-muted/30">
                  <BellOff className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                <p className="mt-1 text-xs text-muted-foreground/50">No new notifications</p>
              </div>
            ) : (
              <div className="p-2">
                {groups.map(({ label, items }) => (
                  <div key={label} className="mb-3">
                    <div className="mb-1 px-3 py-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        {label}
                      </span>
                    </div>
                    <AnimatePresence>
                      {items.map((n) => (
                        <NotifRow
                          key={n.id}
                          n={n}
                          onMarkRead={onMarkRead}
                          onNavigate={handleNavigate}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
