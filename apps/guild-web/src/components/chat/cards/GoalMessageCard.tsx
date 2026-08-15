import * as React from 'react';
import { Target, TrendingUp, ArrowUpRight, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useSearchParams } from 'react-router-dom';

const GOAL_STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; dot: string }> = {
  active: { 
    label: 'Active', 
    border: 'border-emerald-400/50 dark:border-emerald-500/40', 
    bg: 'bg-emerald-50 dark:bg-emerald-500/15', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    dot: 'bg-emerald-500' 
  },
  completed: { 
    label: 'Completed', 
    border: 'border-emerald-400/50 dark:border-emerald-500/40', 
    bg: 'bg-emerald-50 dark:bg-emerald-500/15', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    dot: 'bg-emerald-500' 
  },
  paused: { 
    label: 'Paused', 
    border: 'border-amber-400/50 dark:border-amber-500/40', 
    bg: 'bg-amber-50 dark:bg-amber-500/15', 
    text: 'text-amber-700 dark:text-amber-300', 
    dot: 'bg-amber-500' 
  },
  cancelled: { 
    label: 'Cancelled', 
    border: 'border-zinc-300 dark:border-zinc-700/60', 
    bg: 'bg-zinc-100 dark:bg-zinc-800/60', 
    text: 'text-zinc-700 dark:text-zinc-400', 
    dot: 'bg-zinc-400' 
  },
};

export interface GoalMessageCardProps {
  goalId?: string;
  fallbackTitle?: string;
  members: any[];
}

export function GoalMessageCard({
  goalId,
  fallbackTitle,
  members,
}: GoalMessageCardProps) {
  const [goal, setGoal] = React.useState<any>(null);
  const [, setSearchParams] = useSearchParams();

  React.useEffect(() => {
    if (!goalId) return;
    const unsub = onSnapshot(doc(db, 'goals', goalId), (snap) => {
      if (snap.exists()) {
        setGoal({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [goalId]);

  const displayTitle = goal?.title || fallbackTitle || 'Untitled Objective';
  const statusKey = goal?.status || 'active';
  const statusConfig = GOAL_STATUS_CONFIG[statusKey] || GOAL_STATUS_CONFIG.active;
  const progressPercent = typeof goal?.progress === 'number' ? Math.min(Math.max(goal.progress, 0), 100) : (statusKey === 'completed' ? 100 : 0);

  const ownerProfile = members.find((m) => m.uid === goal?.ownerId);
  const ownerName = ownerProfile?.fullName || 'Workspace Team';

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (goalId) {
      setSearchParams({ goal: goalId });
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={handleOpenDetail}
      className={cn(
        'mt-2.5 w-full max-w-md rounded-2xl border transition-all cursor-pointer select-none text-left relative overflow-hidden group',
        'bg-surface/90 dark:bg-surface-elevated/80 backdrop-blur-xl shadow-md hover:shadow-xl',
        'border-emerald-400/40 dark:border-emerald-500/30 hover:border-emerald-500/60'
      )}
    >
      {/* Top Accent Emerald Gradient */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300" />

      <div className="p-4 space-y-3">
        {/* Header Row: Type, Status, Horizon */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <Target className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Strategic Goal
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {goal?.horizon && (
              <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-full border border-border-subtle dark:border-white/10 bg-surface-elevated/80 dark:bg-white/5 text-muted-foreground">
                {goal.horizon.replace('_', ' ')}
              </span>
            )}
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-tight',
              statusConfig.border,
              statusConfig.bg,
              statusConfig.text
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Goal Title */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
            {displayTitle}
          </h4>
        </div>

        {/* Progress Bar Visualizer */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span>Progress</span>
            <span className="font-mono text-foreground font-bold">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200/80 dark:bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            />
          </div>
        </div>

        {/* Footer info: Owner & Drawer link */}
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle dark:border-white/5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Lead:</span>
            <span className="font-medium text-foreground truncate">{ownerName}</span>
          </div>
          <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>View Goal</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
