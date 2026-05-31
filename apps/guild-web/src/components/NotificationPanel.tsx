import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCheck, AtSign, CheckSquare, MessageSquare,
  Hash, User, X, BellOff, Archive, Check, Undo2, FolderArchive,
  CornerDownRight, Play, CheckCircle2, Volume2, VolumeX, Sparkles,
  Inbox, Layers, Loader2, Send, Clock
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
      // Sweets chimes: C5 then G5
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'click') {
      // Soft woodblock click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === 'whoosh') {
      // Soft airy sweep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch (e) {
    // Audio Context blocked or unsupported
  }
};

// ─── Metadata mapping per notification category/type ──────────────────────────

const META_MAP: Record<string, { icon: React.ElementType; color: string; label: string; glow: string }> = {
  mention: {
    icon: AtSign,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    glow: 'from-violet-500/10 to-transparent',
    label: 'Mention',
  },
  dm: {
    icon: User,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    glow: 'from-pink-500/10 to-transparent',
    label: 'Direct Message',
  },
  channel_invite: {
    icon: Hash,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    glow: 'from-sky-500/10 to-transparent',
    label: 'Invite',
  },
  task_assign: {
    icon: CheckSquare,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    glow: 'from-emerald-500/10 to-transparent',
    label: 'Assignment',
  },
  task_comment: {
    icon: MessageSquare,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    glow: 'from-amber-500/10 to-transparent',
    label: 'Comment',
  },
  request_pending: {
    icon: Layers,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    glow: 'from-amber-500/10 to-transparent',
    label: 'Approval Request',
  },
  request_approved: {
    icon: CheckCircle2,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    glow: 'from-emerald-500/10 to-transparent',
    label: 'Approved',
  },
  request_rejected: {
    icon: X,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    glow: 'from-rose-500/10 to-transparent',
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

// Helper to parse Task ID from link (/tasks?task=XXX)
function getTaskIdFromLink(link: string): string | null {
  if (!link) return null;
  const match = link.match(/[?&]task=([^&]+)/);
  return match ? match[1] : null;
}

// ─── Component: Premium Notification Row ──────────────────────────────────────────

function NotifRow({
  n,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onNavigate,
  userProfile,
}: {
  n: Notification;
  onMarkRead: (id: string) => Promise<void>;
  onMarkUnread: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onNavigate: (link: string) => void;
  userProfile: any;
}) {
  const meta = META_MAP[n.type] || {
    icon: Bell,
    color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    glow: 'from-zinc-500/5 to-transparent',
    label: 'Alert',
  };
  const Icon = meta.icon;

  // Local inline UI states
  const [isReplying, setIsReplying] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [replyingLoading, setReplyingLoading] = React.useState(false);
  
  const [actionStatus, setActionStatus] = React.useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [actionMessage, setActionMessage] = React.useState('');

  async function handleRowClick(e: React.MouseEvent) {
    // Avoid triggering navigation when typing in the quick reply box or clicking buttons
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
      
      // Auto mark notification read on successful action
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
      // Find comment section title if clean
      const cleanedTitle = n.title.replace(/.*commented on task "(.*)"/, '$1') || 'Task';

      await addComment({
        taskId,
        orgId: n.orgId,
        authorId: userProfile.uid,
        authorName: userProfile.fullName,
        authorUsername: userProfile.username,
        body: replyText,
        mentions: [],
        notifyIds: [n.actor.id], // notify the original comment creator
        taskTitle: cleanedTitle
      });

      setReplyText('');
      setIsReplying(false);
      synthSound('success');
      
      // Mark original notification as read
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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 25, transition: { duration: 0.15 } }}
      className={cn(
        'group relative flex w-full flex-col gap-3 rounded-2xl p-4 text-left transition-all border select-none cursor-pointer',
        n.read
          ? 'bg-white/[0.01] dark:bg-zinc-950/20 border-white/5 text-muted-foreground hover:bg-white/[0.03] dark:hover:bg-white/[0.02] hover:border-white/10'
          : 'bg-gradient-to-r border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.15)]'
      )}
      style={!n.read ? {
        background: `linear-gradient(90deg, oklch(from var(--accent) l c h / 6%) 0%, oklch(from var(--accent) l c h / 1%) 100%)`,
        borderColor: 'oklch(from var(--accent) l c h / 20%)'
      } : undefined}
      onClick={handleRowClick}
    >
      {/* Absolute aura glowing gradient for unread items */}
      {!n.read && (
        <div className={cn(
          'absolute inset-0 bg-gradient-to-r opacity-50 pointer-events-none rounded-2xl transition-opacity group-hover:opacity-80 blur-sm -z-10',
          meta.glow
        )} />
      )}

      {/* Dynamic urgency left glow border indicator */}
      <div
        className={cn(
          'absolute left-0 top-4 bottom-4 w-1 rounded-r-md bg-current transition-all opacity-70 group-hover:opacity-100',
          n.urgency === 'high'
            ? 'text-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
            : n.urgency === 'medium'
            ? 'text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
            : 'text-zinc-500',
        )}
      />

      {/* Row core layout */}
      <div className="flex w-full items-start gap-4">
        {/* Actor Avatar with nested status Badge */}
        <div className="relative shrink-0 select-none">
          <div
            className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-xs font-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden"
            style={{ background: `hsl(${avatarHue(n.actor.id)} 55% 45%)` }}
          >
            {n.actor.avatarUrl ? (
              <img
                src={n.actor.avatarUrl}
                alt={n.actor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              n.actor.initials
            )}
          </div>
          {/* Micro icon category badge nested bottom-right */}
          <div
            className={cn(
              'absolute -bottom-1 -right-1.5 h-5 w-5 rounded-full border border-zinc-950 flex items-center justify-center shrink-0 shadow-lg',
              meta.color
            )}
          >
            <Icon className="h-2.5 w-2.5" />
          </div>
        </div>

        {/* Text Context Area */}
        <div className="min-w-0 flex-1 pr-16 select-text">
          <div className="flex items-center gap-2 leading-none flex-wrap">
            <span 
              className="text-[9px] font-black uppercase tracking-widest leading-none"
              style={{ color: !n.read ? 'var(--accent)' : 'oklch(from var(--accent) calc(l - 0.15) calc(c - 0.05) h)' }}
            >
              {meta.label}
            </span>
            <span className="text-[10px] text-zinc-600 dark:text-zinc-500">•</span>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
              <Clock className="h-3 w-3 inline text-zinc-600" />
              <span>{relativeTime(n.createdAt)}</span>
            </div>
            {n.urgency === 'high' && (
              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-extrabold uppercase px-1 rounded">
                High Priority
              </span>
            )}
          </div>
          <p
            className={cn(
              'text-xs font-bold leading-snug mt-1.5',
              n.read ? 'text-zinc-300' : 'text-white'
            )}
          >
            {n.title}
          </p>
          {n.body && (
            <p className={cn(
              "mt-1 text-[11px] leading-relaxed line-clamp-2",
              n.read ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              {n.body}
            </p>
          )}
        </div>

        {/* Action Status Indicator */}
        {!n.read && actionStatus === 'idle' && (
          <div 
            className="absolute top-5 right-4 h-2.5 w-2.5 shrink-0 rounded-full md:group-hover:opacity-0 transition-opacity duration-200 shadow-md animate-pulse"
            style={{
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 10px var(--accent)'
            }}
          />
        )}

        {/* Control actions toolbar (Mark Read, Archive) */}
        <div className="absolute right-3.5 top-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200">
          <Button
            variant="ghost"
            size="icon"
            title={n.read ? 'Mark as unread' : 'Mark as read'}
            className="h-7 w-7 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-400 hover:text-white shadow-md hover:scale-105 active:scale-95 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              synthSound('click');
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
              className="h-7 w-7 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-400 hover:text-white shadow-md hover:scale-105 active:scale-95 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                synthSound('whoosh');
                onArchive(n.id);
              }}
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ─── Inline Action Tray / Success Messaging ─────────────────────────────── */}
      <AnimatePresence mode="wait">
        {actionStatus !== 'idle' ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="inline-action-element border-t border-white/5 pt-3.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {actionStatus === 'loading' && (
                <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
              )}
              {actionStatus === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
              {actionStatus === 'failed' && (
                <X className="h-4 w-4 text-rose-400" />
              )}
              <span className="text-[11px] font-semibold text-zinc-300">{actionMessage || 'Processing...'}</span>
            </div>
            {actionStatus === 'failed' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[10px] rounded-lg text-zinc-400 hover:text-white"
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
                className="inline-action-element border-t border-white/5 pt-3.5 flex items-center gap-2"
              >
                <Button
                  size="sm"
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl px-3.5 h-8 text-[11px] font-black tracking-wide flex items-center gap-1.5 shadow-sm transition-all"
                  onClick={() => handleApprovalRequest('approved')}
                >
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl px-3.5 h-8 text-[11px] font-black tracking-wide flex items-center gap-1.5 shadow-sm transition-all"
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
                className="inline-action-element border-t border-white/5 pt-3 flex items-center gap-2"
              >
                <Button
                  size="sm"
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl px-3.5 h-8 text-[11px] font-black tracking-wide flex items-center gap-1.5 shadow-sm transition-all"
                  onClick={() => handleTaskStatusUpdate('in_progress')}
                >
                  <Play className="h-3 w-3 fill-current" /> Start Task
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl px-3.5 h-8 text-[11px] font-black tracking-wide flex items-center gap-1.5 shadow-sm transition-all"
                  onClick={() => handleTaskStatusUpdate('done')}
                >
                  <CheckCircle2 className="h-3 w-3" /> Complete Task
                </Button>
              </motion.div>
            )}

            {/* Quick Comment / DM Reply input */}
            {(n.type === 'task_comment' || n.type === 'mention' || n.type === 'dm') && (
              <div className="inline-action-element border-t border-white/5 pt-2">
                <AnimatePresence initial={false}>
                  {isReplying ? (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-2 mt-1.5"
                      onSubmit={submitQuickReply}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={n.type === 'dm' ? "Type direct reply..." : "Write quick comment..."}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="flex-1 bg-black/30 dark:bg-white/[0.02] border border-white/10 rounded-xl px-3 text-[11px] text-white focus:outline-none focus:border-cyan-500/40"
                          disabled={replyingLoading}
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!replyText.trim() || replyingLoading}
                          className="h-8 w-8 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-md transition-all"
                        >
                          {replyingLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-[9px] rounded-md text-zinc-500 hover:text-zinc-300"
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
                      className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-cyan-400 transition-colors font-semibold"
                      onClick={() => {
                        synthSound('click');
                        setIsReplying(true);
                      }}
                    >
                      <CornerDownRight className="h-3.5 w-3.5 text-zinc-500" />
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

// ─── Component: Redesigned Notification Hub Dropdown ───────────────────────────

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
  
  // Custom states
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'inbox' | 'mentions' | 'tasks' | 'requests' | 'archive'>('inbox');
  const [soundMuted, setSoundMuted] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('notif_muted') === 'true';
  });

  // Handle click outside to close panel
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        synthSound('whoosh');
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
    if (activeTab === 'mentions') return notifications.filter(n => n.category === 'mentions' || n.type === 'dm');
    if (activeTab === 'tasks') return notifications.filter(n => n.category === 'tasks' || n.type.startsWith('task_'));
    if (activeTab === 'requests') return notifications.filter(n => n.category === 'requests' || n.type.startsWith('request_'));
    // Fallback: Inbox (all active notifications)
    return notifications;
  }, [activeTab, notifications, archivedNotifications]);

  function handleNavigate(link: string) {
    navigate(link);
    onClose();
  }

  // Toggle chime sound muted state
  function toggleMute() {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    localStorage.setItem('notif_muted', String(nextMuted));
    if (!nextMuted) {
      setTimeout(() => synthSound('success'), 50);
    }
  }

  const TABS = [
    { id: 'inbox' as const, label: 'Inbox', icon: Inbox, count: notifications.length },
    { id: 'mentions' as const, label: 'Conversations', icon: AtSign, count: notifications.filter(n => n.category === 'mentions' || n.type === 'dm').length },
    { id: 'tasks' as const, label: 'Work', icon: CheckSquare, count: notifications.filter(n => n.category === 'tasks' || n.type.startsWith('task_')).length },
    { id: 'requests' as const, label: 'Approvals', icon: Layers, count: notifications.filter(n => n.category === 'requests' || n.type.startsWith('request_')).length },
    { id: 'archive' as const, label: 'Archive', icon: Archive, count: archivedNotifications.length },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed top-[72px] sm:top-[80px] right-4 left-4 sm:left-auto sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[440px] max-w-[calc(100vw-32px)] origin-top-right overflow-hidden rounded-3xl border border-white/10 dark:border-white/5 bg-zinc-950/80 backdrop-blur-3xl flex flex-col h-[600px] max-h-[calc(100vh-120px)] shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        >
          {/* Ambient colored lighting gradient inside header */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-cyan-500/5 via-violet-500/2 to-transparent pointer-events-none -z-10" />

          {/* Header Panel */}
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 shrink-0">
            <div className="flex items-center gap-2.5 select-none">
              <div className="h-8 w-8 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Bell className="h-4.5 w-4.5 shadow-glow" />
              </div>
              <div>
                <span className="text-sm font-black text-white flex items-center gap-1.5">
                  Notification Hub <Sparkles className="h-3 w-3 text-cyan-400" />
                </span>
                <span className="text-[10px] text-zinc-500 leading-none">Manage workflow updates & approvals</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Sound Synthesizer toggle */}
              <button
                type="button"
                title={soundMuted ? "Unmute UI chimes" : "Mute UI chimes"}
                className={cn(
                  "h-7 w-7 rounded-xl flex items-center justify-center border text-zinc-400 hover:text-white transition-all cursor-pointer",
                  soundMuted ? "bg-zinc-900/30 border-white/5" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
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
                  className="h-7 w-7 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5 transition-all duration-200"
                  onClick={() => {
                    synthSound('success');
                    onMarkAllRead();
                  }}
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
              {notifications.some((n) => n.read) && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Archive read notifications"
                  className="h-7 w-7 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5 transition-all duration-200"
                  onClick={() => {
                    synthSound('whoosh');
                    onArchiveAllRead();
                  }}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                title="Close"
                className="h-7 w-7 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5 transition-all duration-200"
                onClick={() => {
                  synthSound('whoosh');
                  onClose();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Segmented slider tab row */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5 bg-black/20 shrink-0 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={cn(
                    'relative px-3.5 py-1.5 text-[10px] font-black rounded-xl tracking-wider transition-all select-none cursor-pointer outline-none shrink-0 flex items-center gap-1.5',
                    active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.01]',
                  )}
                  onClick={() => {
                    synthSound('click');
                    setActiveTab(tab.id);
                  }}
                >
                  {/* Slider indicator background under active tab */}
                  {active && (
                    <motion.div
                      layoutId="activeTabSlider2"
                      className="absolute inset-0 bg-white/[0.04] border border-white/5 rounded-xl -z-10 shadow-inner"
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                    />
                  )}
                  <TabIcon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span 
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-black ml-0.5 shadow-sm"
                      style={active ? {
                        backgroundColor: 'oklch(from var(--accent) l c h / 12%)',
                        border: '1px solid oklch(from var(--accent) l c h / 15%)',
                        color: 'var(--accent)'
                      } : {
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: '#71717a'
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notifications List Container */}
          <div className="flex-1 overflow-y-auto px-4 py-3 select-none custom-scroll-thin bg-black/10">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-24 px-8 text-center h-full select-none"
                >
                  <div 
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                    style={{
                      backgroundColor: 'oklch(from var(--accent) l c h / 8%)',
                      borderColor: 'oklch(from var(--accent) l c h / 15%)',
                      color: 'var(--accent)'
                    }}
                  >
                    <BellOff className="h-5.5 w-5.5" />
                  </div>
                  <h4 className="text-xs font-black text-white leading-normal tracking-wide">
                    {activeTab === 'archive' ? 'Archive is empty' : 'All Caught Up!'}
                  </h4>
                  <p className="mt-2 text-[11px] text-zinc-500 max-w-[240px] leading-relaxed">
                    {activeTab === 'archive'
                      ? 'Notifications you archive will appear here for reference.'
                      : 'No new workspace alerts matching this category.'}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3 pb-3">
                  {filteredNotifications.map((n) => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      onMarkRead={onMarkRead}
                      onMarkUnread={onMarkUnread}
                      onArchive={onArchive}
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
  archivedNotifications: Notification[];
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
