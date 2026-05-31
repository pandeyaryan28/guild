import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCheck, AtSign, CheckSquare, MessageSquare,
  Hash, User, X, BellOff, Check, Undo2,
  CornerDownRight, Play, CheckCircle2, Volume2, VolumeX,
  Layers, Loader2, Send, Trash2
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
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    label: 'Mention',
  },
  dm: {
    icon: User,
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    label: 'Message',
  },
  channel_invite: {
    icon: Hash,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    label: 'Invite',
  },
  task_assign: {
    icon: CheckSquare,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    label: 'Assign',
  },
  task_comment: {
    icon: MessageSquare,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    label: 'Comment',
  },
  request_pending: {
    icon: Layers,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    label: 'Request',
  },
  request_approved: {
    icon: CheckCircle2,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    label: 'Approved',
  },
  request_rejected: {
    icon: X,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    label: 'Rejected',
  },
};

// ─── Relative time utility ────────────────────────────────────────────────────

function relativeTime(ts: any): string {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return ts.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

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
    color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20',
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
      setActionMessage(newStatus === 'done' ? 'Completed' : 'Started');
      synthSound('success');
      
      if (!n.read) await onMarkRead(n.id);
      setTimeout(() => setActionStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setActionStatus('failed');
      setActionMessage('Failed to update');
      setTimeout(() => setActionStatus('idle'), 2500);
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
      console.error('Quick reply failed', err);
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
        setActionMessage('No request found');
        setTimeout(() => setActionStatus('idle'), 2000);
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
      setActionMessage(status === 'approved' ? 'Approved' : 'Rejected');
      synthSound('success');
      
      if (!n.read) await onMarkRead(n.id);
      setTimeout(() => setActionStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setActionStatus('failed');
      setActionMessage('Action failed');
      setTimeout(() => setActionStatus('idle'), 2500);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative flex w-full flex-col gap-2 rounded-xl p-3 text-left transition-all border outline-none select-none cursor-pointer',
        n.read
          ? 'bg-transparent border-transparent text-text-muted hover:bg-white/[0.02] dark:hover:bg-white/[0.01]'
          : 'bg-white/[0.02] border-white/5 shadow-sm'
      )}
      onClick={handleRowClick}
    >
      {/* Dynamic Unread Side Glow Accent */}
      {!n.read && (
        <div
          className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r transition-all"
          style={{
            backgroundColor: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent)'
          }}
        />
      )}

      {/* Row core layout */}
      <div className="flex w-full items-start gap-3">
        {/* Actor Avatar */}
        <div className="relative shrink-0 select-none">
          <div
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black text-white shadow-inner overflow-hidden"
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
          {/* Subtle micro icon indicating type */}
          <div className={cn(
            'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border border-surface flex items-center justify-center shrink-0 shadow-sm',
            meta.color
          )}>
            <Icon className="h-2 w-2" />
          </div>
        </div>

        {/* Text Content */}
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
              {meta.label}
            </span>
            <span className="text-[9px] text-text-muted">•</span>
            <span className="text-[9px] text-text-muted">{relativeTime(n.createdAt)}</span>
          </div>
          <p className={cn(
            'text-xs font-semibold leading-relaxed mt-1 tracking-wide',
            n.read ? 'text-foreground/70' : 'text-foreground font-bold'
          )}>
            {n.title}
          </p>
          {n.body && (
            <p className="mt-0.5 line-clamp-1 text-[10px] text-text-muted leading-relaxed">
              {n.body}
            </p>
          )}
        </div>

        {/* Action Toggle Read Icon (Appears on Hover) */}
        <div className="absolute right-3 top-3 flex items-center transition-all md:opacity-0 md:group-hover:opacity-100 opacity-60">
          <button
            onClick={(e) => {
              e.stopPropagation();
              synthSound('click');
              if (n.read) onMarkUnread(n.id);
              else onMarkRead(n.id);
            }}
            className="h-6 w-6 rounded-md flex items-center justify-center bg-white/[0.03] border border-white/5 text-text-muted hover:text-foreground hover:scale-105 active:scale-95 transition-all outline-none"
            title={n.read ? 'Mark as unread' : 'Mark as read'}
          >
            {n.read ? <Undo2 className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          </button>
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
            <div className="flex items-center gap-1.5">
              {actionStatus === 'loading' && <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />}
              {actionStatus === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
              {actionStatus === 'failed' && <X className="h-3 w-3 text-rose-400" />}
              <span className="text-[10px] font-bold text-text-secondary">{actionMessage}</span>
            </div>
            {actionStatus === 'failed' && (
              <button 
                className="text-[9px] font-bold text-text-muted hover:text-foreground outline-none"
                onClick={() => setActionStatus('idle')}
              >
                Clear
              </button>
            )}
          </motion.div>
        ) : (
          <>
            {/* Approval Request Actions */}
            {n.type === 'request_pending' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="inline-action-element border-t border-white/5 pt-2.5 flex items-center gap-2"
              >
                <button
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 rounded-lg px-2.5 py-1 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all active:scale-95 outline-none cursor-pointer"
                  onClick={() => handleApprovalRequest('approved')}
                >
                  Approve
                </button>
                <button
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/15 rounded-lg px-2.5 py-1 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all active:scale-95 outline-none cursor-pointer"
                  onClick={() => handleApprovalRequest('rejected')}
                >
                  Reject
                </button>
              </motion.div>
            )}

            {/* Task Assignments Actions */}
            {n.type === 'task_assign' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="inline-action-element border-t border-white/5 pt-2.5 flex items-center gap-2"
              >
                <button
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/15 rounded-lg px-2.5 py-1 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all active:scale-95 outline-none cursor-pointer"
                  onClick={() => handleTaskStatusUpdate('in_progress')}
                >
                  <Play className="h-2.5 w-2.5 fill-current" /> Start
                </button>
                <button
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 rounded-lg px-2.5 py-1 text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all active:scale-95 outline-none cursor-pointer"
                  onClick={() => handleTaskStatusUpdate('done')}
                >
                  Complete
                </button>
              </motion.div>
            )}

            {/* Quick Chat Reply Actions */}
            {(n.type === 'task_comment' || n.type === 'mention' || n.type === 'dm') && (
              <div className="inline-action-element border-t border-white/5 pt-2">
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
                          placeholder={n.type === 'dm' ? "Type reply..." : "Type quick comment..."}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 bg-black/20 dark:bg-white/[0.01] border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-cyan-500/30"
                          disabled={replyingLoading}
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim() || replyingLoading}
                          className="h-7 w-7 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-sm transition-all flex items-center justify-center outline-none cursor-pointer"
                        >
                          {replyingLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          className="text-[9px] font-bold text-text-muted hover:text-foreground outline-none"
                          onClick={() => {
                            synthSound('click');
                            setIsReplying(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5 text-[9px] text-text-muted hover:text-primary transition-colors font-extrabold outline-none"
                      onClick={() => {
                        synthSound('click');
                        setIsReplying(true);
                      }}
                    >
                      <CornerDownRight className="h-3 w-3 text-text-muted/60" />
                      Reply...
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
          initial={{ opacity: 0, scale: 0.98, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          className="absolute top-[calc(100%+14px)] right-0 z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl aether-glass border border-border-default/60 bg-surface-elevated/95 shadow-2xl backdrop-blur-3xl flex flex-col h-[500px] max-h-[calc(100vh-120px)]"
        >
          {/* Header Section — Ultra Minimalist with just "Notifications" */}
          <div className="flex items-center justify-between border-b border-border-default/40 px-4 py-3.5 shrink-0 select-none">
            <h3 className="text-sm font-extrabold text-foreground tracking-wide">
              Notifications
            </h3>
            
            <div className="flex items-center gap-1">
              {/* Compact Frosted Sound toggle */}
              <button
                type="button"
                title={soundMuted ? "Unmute chimes" : "Mute chimes"}
                className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center border text-text-muted hover:text-foreground transition-all cursor-pointer outline-none",
                  soundMuted 
                    ? "bg-transparent border-border-default/35" 
                    : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                )}
                onClick={toggleMute}
              >
                {soundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  title="Mark all as read"
                  className="h-6 w-6 rounded-md flex items-center justify-center text-text-muted hover:text-foreground hover:bg-white/[0.03] outline-none transition-all cursor-pointer border border-transparent"
                  onClick={() => {
                    synthSound('success');
                    onMarkAllRead();
                  }}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              
              {notifications.length > 0 && (
                <button
                  type="button"
                  title="Clear all"
                  className="h-6 w-6 rounded-md flex items-center justify-center text-text-muted hover:text-rose-400 hover:bg-rose-500/10 outline-none transition-all cursor-pointer border border-transparent"
                  onClick={() => {
                    synthSound('whoosh');
                    onArchiveAll();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                title="Close"
                className="h-6 w-6 rounded-md flex items-center justify-center text-text-muted hover:text-foreground hover:bg-white/[0.03] outline-none transition-all cursor-pointer border border-transparent"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Minimalist Notifications List Container */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scroll-thin bg-black/[0.01] dark:bg-white/[0.002]">
            <AnimatePresence mode="popLayout">
              {notifications.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col items-center justify-center py-20 px-8 text-center h-full select-none"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 text-text-muted/40 shadow-inner">
                    <BellOff className="h-4.5 w-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">
                    All caught up
                  </h4>
                  <p className="mt-1 text-[10px] text-text-muted max-w-[200px] leading-relaxed">
                    No new workspace activity to report.
                  </p>
                </motion.div>
              ) : (
                <div className="p-2.5 space-y-1">
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
