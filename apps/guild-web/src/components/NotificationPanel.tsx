import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCheck, AtSign, CheckSquare, MessageSquare,
  Hash, User, X, BellOff, Check, Undo2,
  CornerDownRight, Play, CheckCircle2, Volume2, VolumeX, Sparkles,
  Layers, Loader2, Send, Clock, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification } from '@guild/types';
import { avatarHue } from './MemberProfileDrawer';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, doc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { moveTask, addComment } from '../lib/tasks';
import { updateRequestStatus } from '../lib/requests';

// ─── Sound Synthesizer (Zero-Dependency Web Audio API) ────────────────────────

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
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'whoosh') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {}
};

// ─── Metadata mapping per notification category/type ──────────────────────────

const META_MAP: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  mention: {
    icon: AtSign,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 shadow-sm',
    label: 'Mention',
  },
  dm: {
    icon: User,
    color: 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border border-pink-500/20 shadow-sm',
    label: 'Direct Message',
  },
  channel_invite: {
    icon: Hash,
    color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 shadow-sm',
    label: 'Invite',
  },
  task_assign: {
    icon: CheckSquare,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm',
    label: 'Assignment',
  },
  task_comment: {
    icon: MessageSquare,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 shadow-sm',
    label: 'Comment',
  },
  request_pending: {
    icon: Layers,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 shadow-sm',
    label: 'Approval Request',
  },
  request_approved: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm',
    label: 'Approved',
  },
  request_rejected: {
    icon: X,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-sm',
    label: 'Rejected',
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
  return ts.toDate().toLocaleDateString();
}

// Helper to parse Task ID from link
function getTaskIdFromLink(link: string): string | null {
  if (!link) return null;
  const match = link.match(/[?&]task=([^&]+)/);
  return match ? match[1] : null;
}

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
  const meta = META_MAP[n.type] || {
    icon: Bell,
    color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 shadow-sm',
    label: 'Alert',
  };
  const Icon = meta.icon;

  const [isReplying, setIsReplying] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [replyingLoading, setReplyingLoading] = React.useState(false);
  
  const [actionStatus, setActionStatus] = React.useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [actionMessage, setActionMessage] = React.useState('');

  async function handleRowClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('.inline-action-element') || target.closest('button') || target.closest('input')) {
      return;
    }
    synthSound('click');
    if (!n.read) await onMarkRead(n.id);
    onNavigate(n.link);
  }

  // ─── Action: Task Status Update ──────────────────────────────────────────────
  async function handleTaskStatusUpdate(newStatus: 'in_progress' | 'done') {
    const taskId = getTaskIdFromLink(n.link);
    if (!taskId || !userProfile) return;

    setActionStatus('loading');
    synthSound('click');
    
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      if (!taskSnap.exists()) {
        setActionStatus('failed');
        setActionMessage('Task not found');
        return;
      }
      const taskData = taskSnap.data();
      const oldStatus = taskData.status || 'todo';
      const orderIndex = taskData.orderIndex || 1000;
      
      const actor = { uid: userProfile.uid, name: userProfile.fullName };
      await moveTask(taskId, n.orgId, newStatus, orderIndex, oldStatus, actor);
      
      setActionStatus('success');
      setActionMessage(newStatus === 'done' ? 'Completed task!' : 'Started task!');
      synthSound('success');
      
      if (!n.read) await onMarkRead(n.id);
      
      setTimeout(() => setActionStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setActionStatus('failed');
      setActionMessage('Failed to update task');
      setTimeout(() => setActionStatus('idle'), 3500);
    }
  }

  // ─── Action: Submit Inline Comment Quick Reply ────────────────────────────────
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
        taskId,
        orgId: n.orgId,
        authorId: userProfile.uid,
        authorName: userProfile.fullName,
        authorUsername: userProfile.username,
        body: replyText,
        mentions: [],
        notifyIds: [n.actor.id],
        taskTitle: cleanedTitle
      });

      setReplyText('');
      setIsReplying(false);
      synthSound('success');
      
      if (!n.read) await onMarkRead(n.id);
    } catch (err) {
      console.error('Failed to submit comment quick reply', err);
    } finally {
      setReplyingLoading(false);
    }
  }

  // ─── Action: Approval Request (Approve/Reject) ───────────────────────────────
  async function handleApprovalRequest(status: 'approved' | 'rejected') {
    if (!userProfile) return;
    setActionStatus('loading');
    synthSound('click');

    try {
      const q = query(
        collection(db, 'requests'),
        where('orgId', '==', n.orgId),
        where('approverId', '==', userProfile.uid),
        where('creatorId', '==', n.actor.id),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setActionStatus('failed');
        setActionMessage('No pending request found');
        setTimeout(() => setActionStatus('idle'), 3000);
        return;
      }
      
      const reqDoc = snap.docs[0];
      const reqData = reqDoc.data();
      
      await updateRequestStatus(
        reqDoc.id,
        n.orgId,
        status,
        userProfile.uid,
        userProfile.fullName,
        n.actor.id,
        reqData.title || 'Request',
        `Approved via notification hub`
      );

      setActionStatus('success');
      setActionMessage(status === 'approved' ? 'Request Approved' : 'Request Rejected');
      synthSound('success');
      
      if (!n.read) await onMarkRead(n.id);
      
      setTimeout(() => setActionStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setActionStatus('failed');
      setActionMessage('Failed to update request');
      setTimeout(() => setActionStatus('idle'), 3500);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'group relative flex w-full flex-col gap-2 rounded-2xl p-3 text-left transition-all border select-none cursor-pointer',
        n.read
          ? 'bg-transparent border-transparent text-muted-foreground hover:bg-white/[0.02] hover:border-white/5'
          : 'bg-white/[0.02] border-white/5 shadow-inner'
      )}
      style={!n.read ? {
        background: 'linear-gradient(90deg, oklch(from var(--accent) l c h / 5%) 0%, transparent 100%)',
        borderColor: 'oklch(from var(--accent) l c h / 12%)'
      } : undefined}
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

      {/* Row core layout */}
      <div className="flex w-full items-start gap-3.5">
        {/* Actor Avatar */}
        <div className="relative shrink-0 select-none">
          <div
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-xs font-black text-white shadow-inner overflow-hidden"
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
        <div className="min-w-0 flex-1 pr-14 select-text">
          <div className="flex items-center gap-1.5 leading-none">
            <span 
              className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/80 transition-colors"
              style={!n.read ? { color: 'oklch(from var(--accent) calc(l + 0.1) c h)' } : undefined}
            >
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
        {!n.read && actionStatus === 'idle' && (
          <div 
            className="mt-3.5 h-2 w-2 shrink-0 rounded-full md:group-hover:opacity-0 transition-all duration-200"
            style={{
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent)'
            }}
          />
        )}

        {/* Hover action toolbar tray (Toggle Read Status Only) */}
        <div className="absolute right-2.5 top-3 flex items-center gap-1 transition-all md:opacity-0 md:group-hover:opacity-100 opacity-80 md:scale-95 md:group-hover:scale-100">
          <Button
            variant="ghost"
            size="icon"
            title={n.read ? 'Mark as unread' : 'Mark as read'}
            className="h-7 w-7 rounded-lg bg-surface/90 border border-border-default/40 text-muted-foreground hover:text-foreground shadow-sm hover:scale-105 active:scale-95 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              synthSound('click');
              if (n.read) onMarkUnread(n.id);
              else onMarkRead(n.id);
            }}
          >
            {n.read ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* ─── Inline Action Tray / Success Messaging ─────────────────────────────── */}
      <AnimatePresence mode="wait">
        {actionStatus !== 'idle' ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="inline-action-element border-t border-white/5 pt-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {actionStatus === 'loading' && (
                <Loader2 className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
              )}
              {actionStatus === 'success' && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {actionStatus === 'failed' && (
                <X className="h-3.5 w-3.5 text-rose-400" />
              )}
              <span className="text-[10px] font-semibold text-zinc-400">{actionMessage || 'Processing...'}</span>
            </div>
            {actionStatus === 'failed' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 px-1.5 text-[9px] rounded-lg text-zinc-400 hover:text-white"
                onClick={() => setActionStatus('idle')}
              >
                Clear
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            {/* Inline Action buttons for leave/expense approvals */}
            {n.type === 'request_pending' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="inline-action-element border-t border-white/5 pt-2 flex items-center gap-2"
              >
                <Button
                  size="sm"
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 h-7 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all"
                  onClick={() => handleApprovalRequest('approved')}
                >
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg px-2.5 h-7 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all"
                  onClick={() => handleApprovalRequest('rejected')}
                >
                  <X className="h-3 w-3" /> Reject
                </Button>
              </motion.div>
            )}

            {/* Inline Action buttons for task status transitions */}
            {n.type === 'task_assign' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="inline-action-element border-t border-white/5 pt-2 flex items-center gap-2"
              >
                <Button
                  size="sm"
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg px-2.5 h-7 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all"
                  onClick={() => handleTaskStatusUpdate('in_progress')}
                >
                  <Play className="h-2.5 w-2.5 fill-current" /> Start Task
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 h-7 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all"
                  onClick={() => handleTaskStatusUpdate('done')}
                >
                  <CheckCircle2 className="h-3 w-3" /> Complete Task
                </Button>
              </motion.div>
            )}

            {/* Quick Comment / DM Reply input */}
            {(n.type === 'task_comment' || n.type === 'mention' || n.type === 'dm') && (
              <div className="inline-action-element border-t border-white/5 pt-1.5">
                <AnimatePresence initial={false}>
                  {isReplying ? (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-1.5 mt-1"
                      onSubmit={submitQuickReply}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={n.type === 'dm' ? "Type direct reply..." : "Write quick comment..."}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 bg-black/20 dark:bg-white/[0.01] border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-cyan-500/30"
                          disabled={replyingLoading}
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!replyText.trim() || replyingLoading}
                          className="h-7 w-7 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-sm transition-all"
                        >
                          {replyingLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 px-1.5 text-[8px] rounded text-zinc-500 hover:text-zinc-300"
                          onClick={() => {
                            synthSound('click');
                            setIsReplying(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-cyan-400 transition-colors font-semibold"
                      onClick={() => {
                        synthSound('click');
                        setIsReplying(true);
                      }}
                    >
                      <CornerDownRight className="h-3 w-3 text-zinc-600" />
                      Quick Reply...
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Component: Notification Dropdown Panel ───────────────────────────────────

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
  const [soundMuted, setSoundMuted] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('notif_muted') === 'true';
  });

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

  function handleNavigate(link: string) {
    navigate(link);
    onClose();
  }

  function toggleMute() {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    localStorage.setItem('notif_muted', String(nextMuted));
    if (!nextMuted) {
      setTimeout(() => synthSound('success'), 50);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -6 }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          className="absolute top-[calc(100%+14px)] right-0 z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl aether-glass border border-border-default bg-surface-elevated/95 shadow-2xl backdrop-blur-3xl flex flex-col h-[520px] max-h-[calc(100vh-120px)]"
        >
          {/* Header Section */}
          <div className="flex items-center justify-between border-b border-border-default/45 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 select-none">
              <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary" style={{ color: 'var(--accent)' }}>
                <Bell className="h-4 w-4" />
              </div>
              <span className="text-sm font-extrabold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span 
                  className="rounded-full px-2 py-0.5 text-[9px] font-black shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_20%,transparent)] animate-pulse"
                  style={{
                    backgroundColor: 'oklch(from var(--accent) l c h / 15%)',
                    border: '1px solid oklch(from var(--accent) l c h / 20%)',
                    color: 'var(--accent)'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Sound Synthesizer toggle */}
              <button
                type="button"
                title={soundMuted ? "Unmute UI chimes" : "Mute UI chimes"}
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center border text-text-muted hover:text-foreground transition-all cursor-pointer",
                  soundMuted 
                    ? "bg-surface-hover/30 border-border-default/40" 
                    : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                )}
                onClick={toggleMute}
              >
                {soundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Mark all as read"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer outline-none border border-transparent hover:border-white/5 transition-all duration-200"
                  onClick={() => {
                    synthSound('success');
                    onMarkAllRead();
                  }}
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
              
              {/* Simplified Clear All CTA */}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Clear All Notifications"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer outline-none border border-transparent hover:border-white/5 transition-all duration-200"
                  onClick={() => {
                    synthSound('whoosh');
                    onArchiveAll();
                  }}
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                title="Close"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer outline-none border border-transparent hover:border-white/5 transition-all duration-200"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List Container */}
          <div className="flex-1 overflow-y-auto pr-1 select-none custom-scroll-thin bg-black/[0.02] dark:bg-white/[0.005]">
            <AnimatePresence mode="popLayout">
              {notifications.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-20 px-8 text-center h-full select-none"
                >
                  <div 
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-inner animate-bounce-subtle"
                    style={{
                      backgroundColor: 'oklch(from var(--accent) l c h / 8%)',
                      borderColor: 'oklch(from var(--accent) l c h / 15%)',
                      color: 'var(--accent)'
                    }}
                  >
                    <BellOff className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-extrabold text-foreground leading-normal">
                    All caught up!
                  </h4>
                  <p className="mt-1.5 text-[11px] text-text-muted max-w-[220px] leading-relaxed">
                    No new workspace activity matching this category.
                  </p>
                </motion.div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {notifications.map((n) => (
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
