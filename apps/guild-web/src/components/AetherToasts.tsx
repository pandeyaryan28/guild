import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, AtSign, CheckSquare, MessageSquare, Hash, Layers, User, Sparkles } from 'lucide-react';
import type { Notification } from '@guild/types';
import { cn } from '@/lib/utils';
import { avatarHue } from './MemberProfileDrawer';

// ─── Sound Synthesizer (Zero-Dependency Web Audio API) ────────────────────────

const playChime = () => {
  if (typeof window === 'undefined') return;
  const isMuted = localStorage.getItem('notif_muted') === 'true';
  if (isMuted) return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Warm retro-modern bell chime: C5 to E5 to G5
    osc.type = 'sine';
    const now = ctx.currentTime;
    
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16); // G5
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.start();
    osc.stop(now + 0.4);
  } catch (e) {
    // Context blocked
  }
};

interface AetherToastsProps {
  activeToasts: Notification[];
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => Promise<void>;
}

const META_MAP: Record<string, { icon: React.ElementType; color: string; label: string; glow: string }> = {
  mention: {
    icon: AtSign,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20',
    glow: 'shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)]',
    label: 'Mention',
  },
  dm: {
    icon: User,
    color: 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border border-pink-500/20',
    glow: 'shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)]',
    label: 'Direct Message',
  },
  channel_invite: {
    icon: Hash,
    color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20',
    glow: 'shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)]',
    label: 'Invite',
  },
  task_assign: {
    icon: CheckSquare,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    glow: 'shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)]',
    label: 'Task Assigned',
  },
  task_comment: {
    icon: MessageSquare,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20',
    glow: 'shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)]',
    label: 'Comment',
  },
  request_pending: {
    icon: Layers,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20',
    glow: 'shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)]',
    label: 'Approval Pending',
  },
  request_approved: {
    icon: Layers,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    glow: 'shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)]',
    label: 'Request Approved',
  },
  request_rejected: {
    icon: Layers,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20',
    glow: 'shadow-[0_0_15px_color-mix(in_srgb,var(--accent)_15%,transparent)]',
    label: 'Request Rejected',
  },
};

export function AetherToasts({ activeToasts, onDismiss, onMarkRead }: AetherToastsProps) {
  const navigate = useNavigate();
  const prevCount = React.useRef(activeToasts.length);

  // Play sweet bell chime automatically when a new toast lands
  React.useEffect(() => {
    if (activeToasts.length > prevCount.current) {
      playChime();
    }
    prevCount.current = activeToasts.length;
  }, [activeToasts]);

  const handleToastClick = async (toast: Notification) => {
    // Mark as read immediately
    await onMarkRead(toast.id);
    // Dismiss toast
    onDismiss(toast.id);
    // Navigate to link
    navigate(toast.link);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3.5 w-full max-w-[380px] pointer-events-none select-none">
      <AnimatePresence mode="popLayout">
        {activeToasts.map((toast) => {
          const meta = META_MAP[toast.type] || {
            icon: Bell,
            color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
            glow: 'shadow-[0_0_12px_rgba(161,161,170,0.1)]',
            label: 'Alert',
          };
          const Icon = meta.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 40, scale: 0.9, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.85, y: -20, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto border border-border-default rounded-3xl p-4.5 bg-surface-elevated/85 backdrop-blur-3xl shadow-[0_15px_45px_rgba(0,0,0,0.25)] flex gap-4 relative overflow-hidden group/toast cursor-pointer hover:border-border-strong hover:scale-[1.01] active:scale-[0.98] transition-all text-foreground"
              onClick={() => handleToastClick(toast)}
            >
              {/* Highlight background accent flare */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none" />

              {/* Urgency glow side-marker */}
              <div
                className={cn(
                  'absolute left-0 top-4 bottom-4 w-1.5 rounded-r-md bg-current opacity-80',
                  toast.urgency === 'high'
                    ? 'text-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                    : toast.urgency === 'medium'
                    ? 'text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                    : 'text-zinc-500',
                )}
              />

              {/* Actor Avatar with dynamic badge */}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-xs font-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden"
                  style={{ background: `hsl(${avatarHue(toast.actor.id)} 55% 45%)` }}
                >
                  {toast.actor.avatarUrl ? (
                    <img
                      src={toast.actor.avatarUrl}
                      alt={toast.actor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    toast.actor.initials
                  )}
                </div>
                {/* Micro icon category badge on bottom-right of avatar */}
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1.5 h-5.5 w-5.5 rounded-full border border-zinc-950 flex items-center justify-center shrink-0 shadow-md',
                    meta.color,
                    meta.glow
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                </div>
              </div>

              {/* Toast message text */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">
                    {meta.label}
                  </span>
                  {toast.urgency === 'high' && (
                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-black uppercase px-1 rounded flex items-center gap-0.5 leading-none">
                      <Sparkles className="h-2 w-2 text-rose-400 fill-current animate-pulse" /> Urgent
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-black text-foreground truncate mt-2 leading-snug">
                  {toast.title}
                </h4>
                {toast.body && (
                  <p className="text-[11px] text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                    {toast.body}
                  </p>
                )}
              </div>

              {/* Close toast button */}
              <button
                type="button"
                className="absolute top-3.5 right-3.5 h-6.5 w-6.5 flex items-center justify-center rounded-xl text-text-muted hover:bg-surface-hover hover:text-foreground border border-transparent hover:border-border-default/45 opacity-0 group-hover/toast:opacity-100 transition-all outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(toast.id);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
