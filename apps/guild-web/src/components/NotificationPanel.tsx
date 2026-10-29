import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCheck, AtSign, CheckSquare, MessageSquare,
  Hash, User, X, BellOff, Check, Undo2,
  CornerDownRight, Play, CheckCircle2, Volume2, VolumeX,
  Layers, Loader2, Send, Trash2, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@guild/types';
import { avatarHue } from './MemberProfileDrawer';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, doc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { moveTask, addComment } from '../lib/tasks';
import { updateRequestStatus } from '../lib/requests';

// ─── Sound Synthesizer ────────────────────────────────────────────────────────

const synthSound = (type: 'success' | 'click' | 'whoosh') => {
  if (typeof window === 'undefined') return;
  const isMuted = localStorage.getItem('notif_muted') === 'true';
  if (isMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'whoosh') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {}
};

// ─── Type Metadata ────────────────────────────────────────────────────────────

const META_MAP: Record<string, {
  icon: React.ElementType;
  accent: string;        // tailwind color name for ring/dot
  iconBg: string;        // icon wrapper bg + text
  label: string;
  category: 'inbox' | 'tasks' | 'mentions' | 'requests';
}> = {
  mention: {
    icon: AtSign,
    accent: 'violet',
    iconBg: 'bg-violet-500/12 text-violet-500 dark:text-violet-400',
    label: 'Mention',
    category: 'mentions',
  },
  dm: {
    icon: User,
    accent: 'pink',
    iconBg: 'bg-pink-500/12 text-pink-500 dark:text-pink-400',
    label: 'Direct Message',
    category: 'mentions',
  },
  channel_invite: {
    icon: Hash,
    accent: 'sky',
    iconBg: 'bg-sky-500/12 text-sky-500 dark:text-sky-400',
    label: 'Channel Invite',
    category: 'inbox',
  },
  task_assign: {
    icon: CheckSquare,
    accent: 'emerald',
    iconBg: 'bg-emerald-500/12 text-emerald-500 dark:text-emerald-400',
    label: 'Task Assigned',
    category: 'tasks',
  },
  task_comment: {
    icon: MessageSquare,
    accent: 'amber',
    iconBg: 'bg-amber-500/12 text-amber-500 dark:text-amber-400',
    label: 'Task Comment',
    category: 'tasks',
  },
  request_pending: {
    icon: Layers,
    accent: 'amber',
    iconBg: 'bg-amber-500/12 text-amber-500 dark:text-amber-400',
    label: 'Approval Needed',
    category: 'requests',
  },
  request_approved: {
    icon: CheckCircle2,
    accent: 'emerald',
    iconBg: 'bg-emerald-500/12 text-emerald-500 dark:text-emerald-400',
    label: 'Request Approved',
    category: 'requests',
  },
  request_rejected: {
    icon: X,
    accent: 'rose',
    iconBg: 'bg-rose-500/12 text-rose-500 dark:text-rose-400',
    label: 'Request Rejected',
    category: 'requests',
  },
};

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
  return ts.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isToday(ts: any): boolean {
  if (!ts?.toDate) return false;
  const d = ts.toDate();
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function getTaskIdFromLink(link: string): string | null {
  if (!link) return null;
  const match = link.match(/[?&]task=([^&]+)/);
  return match ? match[1] : null;
}

// ─── Tabs Config ──────────────────────────────────────────────────────────────

type TabId = 'all' | 'unread' | 'tasks' | 'mentions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'mentions', label: 'Mentions' },
];

// ─── Component: Notification Row ──────────────────────────────────────────────

function NotifRow({
  n,
  onMarkRead,
  onMarkUnread,
  onNavigate,
  userProfile,
}: {
  n: Notification;
  onMarkRead: (id: string) => Promise<void>;
  onMarkUnread: (id: string) => Promise<void>;
  onNavigate: (link: string) => void;
  userProfile: any;
}) {
  const meta = META_MAP[n.type] ?? {
    icon: Bell,
    accent: 'zinc',
    iconBg: 'bg-zinc-500/12 text-zinc-400',
    label: 'Alert',
    category: 'inbox' as const,
  };
  const Icon = meta.icon;

  const [isReplying, setIsReplying] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [replyingLoading, setReplyingLoading] = React.useState(false);
  const [actionStatus, setActionStatus] = React.useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [actionMessage, setActionMessage] = React.useState('');
  const [hovered, setHovered] = React.useState(false);

  async function handleRowClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('.inline-action') || target.closest('button') || target.closest('input')) return;
    synthSound('click');
    if (!n.read) await onMarkRead(n.id);
    onNavigate(n.link);
  }

  async function handleTaskStatusUpdate(newStatus: 'in_progress' | 'done') {
    const taskId = getTaskIdFromLink(n.link);
    if (!taskId || !userProfile) return;
    setActionStatus('loading');
    synthSound('click');
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) { setActionStatus('failed'); setActionMessage('Task not found'); return; }
      const taskData = taskSnap.data();
      const actor = { uid: userProfile.uid, name: userProfile.fullName };
      await moveTask(taskId, n.orgId, newStatus, taskData.orderIndex || 1000, taskData.status || 'todo', actor);
      setActionStatus('success');
      setActionMessage(newStatus === 'done' ? 'Marked complete' : 'Marked in progress');
      synthSound('success');
      if (!n.read) await onMarkRead(n.id);
      setTimeout(() => setActionStatus('idle'), 2200);
    } catch (err) {
      console.error(err);
      setActionStatus('failed');
      setActionMessage('Failed to update');
      setTimeout(() => setActionStatus('idle'), 2500);
    }
  }

  async function submitQuickReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !userProfile) return;
    const taskId = getTaskIdFromLink(n.link);
    if (!taskId) return;
    setReplyingLoading(true);
    synthSound('click');
    try {
      const cleanedTitle = n.title.replace(/.*commented on task "(.*)"/, '$1') || 'Task';
      await addComment({
        taskId, orgId: n.orgId,
        authorId: userProfile.uid, authorName: userProfile.fullName,
        authorUsername: userProfile.username, body: replyText,
        mentions: [], notifyIds: [n.actor.id], taskTitle: cleanedTitle,
      });
      setReplyText(''); setIsReplying(false);
      synthSound('success');
      if (!n.read) await onMarkRead(n.id);
    } catch (err) { console.error('Quick reply failed', err); }
    finally { setReplyingLoading(false); }
  }

  async function handleApprovalRequest(status: 'approved' | 'rejected') {
    if (!userProfile) return;
    setActionStatus('loading'); synthSound('click');
    try {
      const q = query(collection(db, 'requests'),
        where('orgId', '==', n.orgId), where('approverId', '==', userProfile.uid),
        where('creatorId', '==', n.actor.id), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      if (snap.empty) { setActionStatus('failed'); setActionMessage('No request found'); setTimeout(() => setActionStatus('idle'), 2000); return; }
      const reqDoc = snap.docs[0];
      const reqData = reqDoc.data();
      await updateRequestStatus(reqDoc.id, n.orgId, status, userProfile.uid, userProfile.fullName,
        userProfile.username, n.actor.id, reqData.title || 'Request', 'Handled via notification hub');
      setActionStatus('success');
      setActionMessage(status === 'approved' ? 'Approved ✓' : 'Rejected');
      synthSound('success');
      if (!n.read) await onMarkRead(n.id);
      setTimeout(() => setActionStatus('idle'), 2200);
    } catch (err) {
      console.error(err); setActionStatus('failed'); setActionMessage('Action failed');
      setTimeout(() => setActionStatus('idle'), 2500);
    }
  }

  const hasActions = n.type === 'request_pending' || n.type === 'task_assign' ||
    n.type === 'task_comment' || n.type === 'mention' || n.type === 'dm';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        'group relative flex w-full flex-col rounded-xl cursor-pointer select-none transition-all duration-200 outline-none',
        n.read
          ? 'hover:bg-surface-hover/60'
          : 'bg-accent/[0.04] dark:bg-accent/[0.06]'
      )}
      onClick={handleRowClick}
    >
      {/* Unread left accent bar */}
      {!n.read && (
        <motion.div
          layoutId={`bar-${n.id}`}
          className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      )}

      <div className="flex items-start gap-3 px-3 pt-3 pb-2.5">
        {/* Avatar with type badge */}
        <div className="relative shrink-0 mt-0.5">
          <div
            className="w-9 h-9 rounded-xl border border-white/10 dark:border-white/8 flex items-center justify-center text-[11px] font-black text-white overflow-hidden shadow-sm"
            style={{ background: `hsl(${avatarHue(n.actor.id)} 55% 42%)` }}
          >
            {n.actor.avatarUrl ? (
              <img src={n.actor.avatarUrl} alt={n.actor.name} className="w-full h-full object-cover" />
            ) : n.actor.initials}
          </div>
          {/* Type badge */}
          <div className={cn(
            'absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center border border-bg-primary dark:border-bg-primary shadow-md',
            meta.iconBg
          )}>
            <Icon className="h-2 w-2" strokeWidth={2.5} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-7">
          {/* Type label + time row */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn(
              'text-[10px] font-bold tracking-wide uppercase',
              n.read ? 'text-text-muted' : 'text-text-secondary'
            )}>
              {meta.label}
            </span>
            {n.urgency === 'high' && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                · Urgent
              </span>
            )}
            <span className="text-[10px] text-text-muted ml-auto">{relativeTime(n.createdAt)}</span>
          </div>

          {/* Title */}
          <p className={cn(
            'text-[13px] leading-snug line-clamp-2 tracking-[-0.01em]',
            n.read ? 'text-text-secondary font-medium' : 'text-foreground font-semibold'
          )}>
            {n.title}
          </p>

          {/* Body preview */}
          {n.body && (
            <p className="mt-0.5 text-[11px] text-text-muted leading-relaxed line-clamp-1">
              {n.body}
            </p>
          )}
        </div>

        {/* Read/Unread toggle (visible on hover) */}
        <motion.button
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            e.stopPropagation();
            synthSound('click');
            if (n.read) onMarkUnread(n.id);
            else onMarkRead(n.id);
          }}
          className="absolute right-2.5 top-2.5 h-6 w-6 rounded-lg flex items-center justify-center text-text-muted hover:text-foreground hover:bg-surface-hover border border-transparent hover:border-border-default/50 transition-all outline-none"
          title={n.read ? 'Mark as unread' : 'Mark as read'}
        >
          {n.read ? <Undo2 className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        </motion.button>
      </div>

      {/* ─── Inline Action Area ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {hasActions && actionStatus !== 'idle' ? (
          <motion.div
            key="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="inline-action mx-3 mb-2.5 border-t border-border-subtle pt-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5">
              {actionStatus === 'loading' && <Loader2 className="h-3 w-3 text-text-muted animate-spin" />}
              {actionStatus === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
              {actionStatus === 'failed' && <X className="h-3 w-3 text-rose-500" />}
              <span className={cn(
                'text-[11px] font-medium',
                actionStatus === 'success' ? 'text-emerald-500 dark:text-emerald-400'
                : actionStatus === 'failed' ? 'text-rose-500 dark:text-rose-400'
                : 'text-text-secondary'
              )}>
                {actionMessage || (actionStatus === 'loading' ? 'Processing…' : '')}
              </span>
            </div>
            {actionStatus === 'failed' && (
              <button
                className="text-[10px] font-medium text-text-muted hover:text-foreground transition-colors outline-none"
                onClick={() => setActionStatus('idle')}
              >
                Dismiss
              </button>
            )}
          </motion.div>
        ) : hasActions ? (
          <motion.div
            key="actions"
            initial={false}
            className="inline-action mx-3 mb-2.5"
          >
            {/* Request: Approve / Reject */}
            {n.type === 'request_pending' && (
              <div className="flex items-center gap-1.5 border-t border-border-subtle pt-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/8 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 hover:border-emerald-500/30 text-[11px] font-semibold transition-all active:scale-95 outline-none cursor-pointer"
                  onClick={() => handleApprovalRequest('approved')}
                >
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                  Approve
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-rose-500/8 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/15 hover:border-rose-500/30 text-[11px] font-semibold transition-all active:scale-95 outline-none cursor-pointer"
                  onClick={() => handleApprovalRequest('rejected')}
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                  Reject
                </button>
              </div>
            )}

            {/* Task: Start / Complete */}
            {n.type === 'task_assign' && (
              <div className="flex items-center gap-1.5 border-t border-border-subtle pt-2">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/8 hover:bg-accent/15 text-accent border border-accent/15 hover:border-accent/30 text-[11px] font-semibold transition-all active:scale-95 outline-none cursor-pointer"
                  onClick={() => handleTaskStatusUpdate('in_progress')}
                >
                  <Play className="h-2.5 w-2.5 fill-current" />
                  Start
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/8 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 hover:border-emerald-500/30 text-[11px] font-semibold transition-all active:scale-95 outline-none cursor-pointer"
                  onClick={() => handleTaskStatusUpdate('done')}
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Complete
                </button>
              </div>
            )}

            {/* Chat: Quick Reply */}
            {(n.type === 'task_comment' || n.type === 'mention' || n.type === 'dm') && (
              <div className="border-t border-border-subtle pt-2">
                <AnimatePresence initial={false}>
                  {isReplying ? (
                    <motion.form
                      key="reply-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={submitQuickReply}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={n.type === 'dm' ? 'Reply…' : 'Quick comment…'}
                        disabled={replyingLoading}
                        autoFocus
                        className="flex-1 h-8 bg-bg-tertiary border border-border-default rounded-lg px-2.5 text-[11px] text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim() || replyingLoading}
                        className="h-8 w-8 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 shrink-0 flex items-center justify-center transition-all disabled:opacity-40 outline-none"
                      >
                        {replyingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { synthSound('click'); setIsReplying(false); }}
                        className="h-8 w-8 rounded-lg text-text-muted hover:text-foreground hover:bg-surface-hover shrink-0 flex items-center justify-center transition-all outline-none"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.form>
                  ) : (
                    <motion.button
                      key="reply-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => { synthSound('click'); setIsReplying(true); }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors outline-none"
                    >
                      <CornerDownRight className="h-3 w-3" />
                      Reply
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1.5 select-none">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  );
}

// ─── Component: Notification Panel ───────────────────────────────────────────

export function NotificationPanel({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkUnread,
  onArchiveAll,
  onMarkAllRead,
  open,
  onClose,
}: NotificationPanelProps) {
  const navigate = useNavigate();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = React.useState<TabId>('all');
  const [soundMuted, setSoundMuted] = React.useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('notif_muted') === 'true'
  );

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [open, onClose]);

  // Reset tab when reopening
  React.useEffect(() => { if (open) setActiveTab('all'); }, [open]);

  function handleNavigate(link: string) { navigate(link); onClose(); }

  function toggleMute() {
    const next = !soundMuted;
    setSoundMuted(next);
    localStorage.setItem('notif_muted', String(next));
    if (!next) setTimeout(() => synthSound('success'), 50);
  }

  // Filter notifications by active tab
  const filtered = React.useMemo(() => {
    switch (activeTab) {
      case 'unread': return notifications.filter((n) => !n.read);
      case 'tasks':  return notifications.filter((n) => META_MAP[n.type]?.category === 'tasks');
      case 'mentions': return notifications.filter((n) => META_MAP[n.type]?.category === 'mentions');
      default: return notifications;
    }
  }, [notifications, activeTab]);

  // Group by today vs earlier
  const todayItems    = filtered.filter((n) => isToday(n.createdAt));
  const earlierItems  = filtered.filter((n) => !isToday(n.createdAt));

  // Tab badge counts
  const tabCounts = React.useMemo(() => ({
    all:      notifications.length,
    unread:   notifications.filter((n) => !n.read).length,
    tasks:    notifications.filter((n) => META_MAP[n.type]?.category === 'tasks').length,
    mentions: notifications.filter((n) => META_MAP[n.type]?.category === 'mentions').length,
  }), [notifications]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
          className="absolute top-[calc(100%+12px)] right-0 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-w-[calc(100vw-2rem)] origin-top-right flex flex-col rounded-2xl border border-border-default/70 bg-surface-elevated/96 shadow-[0_24px_60px_rgba(0,0,0,0.2)] backdrop-blur-3xl overflow-hidden"
          style={{ maxHeight: 'min(580px, calc(100vh - 100px))' }}
        >
          {/* ── Header ────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground px-1.5 tabular-nums">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Sound toggle */}
              <button
                title={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
                onClick={toggleMute}
                className={cn(
                  'h-7 w-7 rounded-lg flex items-center justify-center transition-all outline-none cursor-pointer',
                  soundMuted
                    ? 'text-text-muted hover:text-foreground hover:bg-surface-hover'
                    : 'text-accent bg-accent/8 hover:bg-accent/15'
                )}
              >
                {soundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>

              {/* Mark all read */}
              {unreadCount > 0 && (
                <button
                  title="Mark all as read"
                  onClick={() => { synthSound('success'); onMarkAllRead(); }}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-text-muted hover:text-foreground hover:bg-surface-hover transition-all outline-none cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Clear all */}
              {notifications.length > 0 && (
                <button
                  title="Clear all"
                  onClick={() => { synthSound('whoosh'); onArchiveAll(); }}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-text-muted hover:text-rose-500 hover:bg-rose-500/8 transition-all outline-none cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Close */}
              <button
                title="Close"
                onClick={onClose}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-text-muted hover:text-foreground hover:bg-surface-hover transition-all outline-none cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── Filter Tabs ────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-0.5 px-3 pb-2 shrink-0 border-b border-border-subtle">
            {TABS.map((tab) => {
              const count = tabCounts[tab.id];
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { synthSound('click'); setActiveTab(tab.id); }}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all outline-none cursor-pointer select-none',
                    isActive
                      ? 'text-foreground bg-surface-hover'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover/60'
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      'inline-flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold px-1 tabular-nums',
                      isActive ? 'bg-accent/15 text-accent' : 'bg-border-default/60 text-text-muted'
                    )}>
                      {count}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-0 rounded-lg border border-border-default/50 bg-surface-hover"
                      style={{ zIndex: -1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Notification List ──────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 px-6 text-center h-full select-none"
                >
                  <div className="mb-4 h-12 w-12 rounded-2xl bg-surface-hover border border-border-default/50 flex items-center justify-center">
                    <BellOff className="h-5 w-5 text-text-muted" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {activeTab === 'unread' ? 'All caught up' : 'Nothing here'}
                  </h4>
                  <p className="mt-1.5 text-[11px] text-text-muted leading-relaxed max-w-[180px]">
                    {activeTab === 'unread'
                      ? 'You have no unread notifications.'
                      : 'No notifications in this category yet.'}
                  </p>
                </motion.div>
              ) : (
                <div key="list" className="pb-2">
                  {todayItems.length > 0 && (
                    <>
                      <SectionLabel label="Today" />
                      <div className="px-2 space-y-0.5">
                        {todayItems.map((n) => (
                          <NotifRow
                            key={n.id}
                            n={n}
                            onMarkRead={onMarkRead}
                            onMarkUnread={onMarkUnread}
                            onNavigate={handleNavigate}
                            userProfile={userProfile}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {earlierItems.length > 0 && (
                    <>
                      <SectionLabel label="Earlier" />
                      <div className="px-2 space-y-0.5">
                        {earlierItems.map((n) => (
                          <NotifRow
                            key={n.id}
                            n={n}
                            onMarkRead={onMarkRead}
                            onMarkUnread={onMarkUnread}
                            onNavigate={handleNavigate}
                            userProfile={userProfile}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface NotificationPanelProps {
  notifications: Notification[];
  archivedNotifications?: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkUnread: (id: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
  onArchiveAllRead?: () => Promise<void>;
  onArchiveAll: () => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  open: boolean;
  onClose: () => void;
}
