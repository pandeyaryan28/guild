import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCheck, AtSign, CheckSquare, MessageSquare,
  Hash, User, X, BellOff, Archive, Check, Undo2, FolderArchive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification } from '@guild/types';
import { avatarHue } from './MemberProfileDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  notifications: Notification[]; // Active ones
  archivedNotifications: Notification[]; // Archived ones
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkUnread: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onArchiveAllRead: () => Promise<void>;
  onArchiveAll: () => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  open: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'mentions' | 'tasks' | 'approvals' | 'archive';

// ─── Metadata per event type ──────────────────────────────────────────────────

const META_MAP: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  mention: {
    icon: AtSign,
    color: 'text-violet-400 bg-violet-400/10 border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.12)]',
    label: 'Mention',
  },
  dm: {
    icon: User,
    color: 'text-pink-400 bg-pink-400/10 border-pink-500/20 shadow-[0_0_12px_rgba(236,72,153,0.12)]',
    label: 'Direct Message',
  },
  channel_invite: {
    icon: Hash,
    color: 'text-sky-400 bg-sky-400/10 border-sky-500/20 shadow-[0_0_12px_rgba(56,189,248,0.12)]',
    label: 'Invite',
  },
  task_assign: {
    icon: CheckSquare,
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
    label: 'Task Assignment',
  },
  task_comment: {
    icon: MessageSquare,
    color: 'text-amber-400 bg-amber-400/10 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]',
    label: 'Task Comment',
  },
  request_pending: {
    icon: LayersFallback,
    color: 'text-amber-400 bg-amber-400/10 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]',
    label: 'Approval Request',
  },
  request_approved: {
    icon: LayersFallback,
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
    label: 'Request Approved',
  },
  request_rejected: {
    icon: LayersFallback,
    color: 'text-rose-400 bg-rose-400/10 border-rose-500/20 shadow-[0_0_12px_rgba(239,68,68,0.12)]',
    label: 'Request Rejected',
  },
};

// Fallback dynamic component
function LayersFallback(props: any) {
  return <FolderArchive {...props} />;
}

// ─── Relative time utility ────────────────────────────────────────────────────

function relativeTime(ts: any): string {
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

// ─── Single Row Component ─────────────────────────────────────────────────────

function NotifRow({
  n,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onNavigate,
}: {
  n: Notification;
  onMarkRead: (id: string) => Promise<void>;
  onMarkUnread: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onNavigate: (link: string) => void;
}) {
  const meta = META_MAP[n.type] || {
    icon: Bell,
    color: 'text-zinc-400 bg-zinc-400/10 border-zinc-500/20 shadow-[0_0_12px_rgba(161,161,170,0.1)]',
    label: 'Alert',
  };
  const Icon = meta.icon;

  async function handleRowClick() {
    if (!n.read) await onMarkRead(n.id);
    onNavigate(n.link);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-all border border-transparent select-none cursor-pointer',
        n.read
          ? 'bg-transparent text-muted-foreground hover:bg-white/[0.02] hover:border-white/5'
          : 'bg-primary/5 border-primary/10 hover:bg-primary/8 hover:border-primary/15',
      )}
      onClick={handleRowClick}
    >
      {/* Dynamic urgency color indicator */}
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-1 rounded-r bg-current transition-all opacity-0 group-hover:opacity-100',
          n.urgency === 'high'
            ? 'text-rose-500'
            : n.urgency === 'medium'
            ? 'text-cyan-500'
            : 'text-zinc-500',
        )}
      />

      {/* Actor Avatar / Initials */}
      <div className="relative shrink-0 select-none">
        <div
          className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-xs font-black text-white shadow-inner"
          style={{ background: `hsl(${avatarHue(n.actor.id)} 55% 45%)` }}
        >
          {n.actor.avatarUrl ? (
            <img
              src={n.actor.avatarUrl}
              alt={n.actor.name}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            n.actor.initials
          )}
        </div>
        {/* Micro icon badge on bottom-right of avatar */}
        <div
          className={cn(
            'absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full border border-surface flex items-center justify-center shrink-0',
            meta.color,
          )}
        >
          <Icon className="h-2 w-2" />
        </div>
      </div>

      {/* Text Content */}
      <div className="min-w-0 flex-1 pr-6 select-text">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/80">
            {meta.label}
          </span>
          <span className="text-[10px] text-text-muted select-none">•</span>
          <span className="text-[10px] text-text-muted select-none">{relativeTime(n.createdAt)}</span>
        </div>
        <p
          className={cn(
            'text-xs font-bold leading-normal mt-1',
            n.read ? 'text-foreground/80' : 'text-foreground',
          )}
        >
          {n.title}
        </p>
        {n.body && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted leading-relaxed">
            {n.body}
          </p>
        )}
      </div>

      {/* Right control status indicator (when not hovered) */}
      {!n.read && (
        <div className="mt-3.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--accent)] group-hover:opacity-0 transition-opacity" />
      )}

      {/* Hover action toolbar tray */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
        <Button
          variant="ghost"
          size="icon"
          title={n.read ? 'Mark as unread' : 'Mark as read'}
          className="h-7 w-7 rounded-lg bg-surface/90 border border-white/10 text-muted-foreground hover:text-foreground shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            if (n.read) onMarkUnread(n.id);
            else onMarkRead(n.id);
          }}
        >
          {n.read ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        {!n.archived && (
          <Button
            variant="ghost"
            size="icon"
            title="Archive"
            className="h-7 w-7 rounded-lg bg-surface/90 border border-white/10 text-muted-foreground hover:text-foreground shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(n.id);
            }}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Redesigned Panel ────────────────────────────────────────────────────

export function NotificationPanel({
  notifications,
  archivedNotifications,
  unreadCount,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onArchiveAllRead,
  onArchiveAll,
  onMarkAllRead,
  open,
  onClose,
}: NotificationPanelProps) {
  const navigate = useNavigate();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>('all');

  // Handle click outside to close dropdown
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [open, onClose]);

  // Tab calculations
  const filteredNotifications = React.useMemo(() => {
    if (activeTab === 'archive') return archivedNotifications;

    switch (activeTab) {
      case 'mentions':
        return notifications.filter((n) => n.category === 'mentions');
      case 'tasks':
        return notifications.filter((n) => n.category === 'tasks');
      case 'approvals':
        return notifications.filter((n) => n.category === 'requests');
      case 'all':
      default:
        return notifications;
    }
  }, [activeTab, notifications, archivedNotifications]);

  function handleNavigate(link: string) {
    navigate(link);
    onClose();
  }

  const TABS: { id: TabType; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'mentions', label: 'Mentions', count: notifications.filter((n) => n.category === 'mentions').length },
    { id: 'tasks', label: 'Tasks', count: notifications.filter((n) => n.category === 'tasks').length },
    { id: 'approvals', label: 'Approvals', count: notifications.filter((n) => n.category === 'requests').length },
    { id: 'archive', label: 'Archive', count: archivedNotifications.length },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -6 }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          className="absolute right-0 top-full z-50 mt-2 w-[400px] origin-top-right overflow-hidden rounded-2xl aether-glass border border-white/10 dark:border-white/5 bg-surface/95 dark:bg-zinc-950/95 shadow-2xl backdrop-blur-3xl flex flex-col h-[520px]"
        >
          {/* Header section */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Bell className="h-4 w-4" />
              </div>
              <span className="text-sm font-extrabold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 border border-primary/20 px-2 py-0.5 text-[9px] font-black text-primary shadow-[0_0_8px_rgba(var(--accent),0.1)] animate-pulse">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 rounded-lg px-2 text-[10px] font-extrabold text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer outline-none border border-transparent hover:border-white/5"
                  onClick={onMarkAllRead}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark Read
                </Button>
              )}
              {notifications.some((n) => n.read) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 rounded-lg px-2 text-[10px] font-extrabold text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer outline-none border border-transparent hover:border-white/5"
                  onClick={onArchiveAllRead}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Clear Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 rounded-lg px-2 text-[10px] font-extrabold text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer outline-none border border-transparent hover:border-white/5"
                  onClick={onArchiveAll}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer outline-none border border-transparent hover:border-white/5"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Segmented slider tab row */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 bg-white/[0.01] shrink-0 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={cn(
                    'relative px-2.5 py-1 text-[10px] font-extrabold rounded-lg tracking-wider transition-all select-none cursor-pointer outline-none shrink-0',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.02]',
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {/* Slider indicator background under active tab */}
                  {active && (
                    <motion.div
                      layoutId="activeTabSlider"
                      className="absolute inset-0 bg-white/5 dark:bg-white/10 rounded-lg -z-10 border border-white/5"
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                    />
                  )}
                  <span className="flex items-center gap-1">
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-[8px] opacity-60 font-semibold">({tab.count})</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Notifications List Container */}
          <div className="flex-1 overflow-y-auto pr-1 select-none custom-scroll-thin bg-black/[0.02] dark:bg-white/[0.005]">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-20 px-8 text-center h-full select-none"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 dark:bg-white/[0.02] shadow-inner text-text-muted/65 animate-bounce-subtle">
                    <BellOff className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-extrabold text-foreground leading-normal">
                    {activeTab === 'archive' ? 'Archive is empty' : 'All caught up!'}
                  </h4>
                  <p className="mt-1.5 text-[11px] text-text-muted max-w-[220px] leading-relaxed">
                    {activeTab === 'archive'
                      ? 'Notifications you archive will appear here for reference.'
                      : 'No new workspace activity matching this category.'}
                  </p>
                </motion.div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {filteredNotifications.map((n) => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      onMarkRead={onMarkRead}
                      onMarkUnread={onMarkUnread}
                      onArchive={onArchive}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
