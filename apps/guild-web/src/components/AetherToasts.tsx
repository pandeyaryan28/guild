import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, AtSign, CheckSquare, MessageSquare, Hash, Layers, User } from 'lucide-react';
import type { Notification } from '@guild/types';
import { cn } from '@/lib/utils';
import { avatarHue } from './MemberProfileDrawer';

interface AetherToastsProps {
  activeToasts: Notification[];
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => Promise<void>;
}

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
    icon: Layers,
    color: 'text-amber-400 bg-amber-400/10 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]',
    label: 'Approval Pending',
  },
  request_approved: {
    icon: Layers,
    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
    label: 'Request Approved',
  },
  request_rejected: {
    icon: Layers,
    color: 'text-rose-400 bg-rose-400/10 border-rose-500/20 shadow-[0_0_12px_rgba(239,68,68,0.12)]',
    label: 'Request Rejected',
  },
};

export function AetherToasts({ activeToasts, onDismiss, onMarkRead }: AetherToastsProps) {
  const navigate = useNavigate();

  const handleToastClick = async (toast: Notification) => {
    // Mark as read immediately
    await onMarkRead(toast.id);
    // Dismiss toast
    onDismiss(toast.id);
    // Navigate to link
    navigate(toast.link);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 w-full max-w-[360px] pointer-events-none select-none">
      <AnimatePresence mode="popLayout">
        {activeToasts.map((toast) => {
          const meta = META_MAP[toast.type] || {
            icon: Bell,
            color: 'text-zinc-400 bg-zinc-400/10 border-zinc-500/20 shadow-[0_0_12px_rgba(161,161,170,0.1)]',
            label: 'Alert',
          };
          const Icon = meta.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, y: -20, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto aether-glass border border-white/10 dark:border-white/5 rounded-2xl p-4 shadow-2xl flex gap-3.5 relative overflow-hidden group/toast cursor-pointer hover:border-white/20 dark:hover:border-white/10 active:scale-[0.98] transition-colors"
              onClick={() => handleToastClick(toast)}
            >
              {/* Sidebar border colored by type */}
              <div
                className={cn(
                  'absolute left-0 top-0 bottom-0 w-1.5 bg-current',
                  toast.urgency === 'high'
                    ? 'text-rose-500'
                    : toast.urgency === 'medium'
                    ? 'text-cyan-500'
                    : 'text-zinc-500',
                )}
              />

              {/* Actor Avatar / Initials */}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-xs font-black text-white shadow-inner"
                  style={{ background: `hsl(${avatarHue(toast.actor.id)} 55% 45%)` }}
                >
                  {toast.actor.avatarUrl ? (
                    <img
                      src={toast.actor.avatarUrl}
                      alt={toast.actor.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    toast.actor.initials
                  )}
                </div>
                {/* Micro icon badge on bottom-right of avatar */}
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-surface flex items-center justify-center shrink-0',
                    meta.color,
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                </div>
              </div>

              {/* Text Context */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                    {meta.label}
                  </span>
                  {toast.urgency === 'high' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                  )}
                </div>
                <h4 className="text-xs font-extrabold text-foreground truncate mt-1 leading-normal">
                  {toast.title}
                </h4>
                {toast.body && (
                  <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                    {toast.body}
                  </p>
                )}
              </div>

              {/* Action Close Box */}
              <button
                type="button"
                className="absolute top-2.5 right-2.5 h-6 w-6 flex items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-foreground opacity-0 group-hover/toast:opacity-100 transition-all outline-none border border-transparent hover:border-white/5"
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
