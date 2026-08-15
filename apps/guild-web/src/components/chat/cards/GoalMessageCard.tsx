import * as React from 'react';
import { Target, TrendingUp, ArrowUpRight, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useSearchParams } from 'react-router-dom';

const GOAL_STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; dot: string }> = {
  active: { label: 'Active', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  completed: { label: 'Completed', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  paused: { label: 'Paused', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  cancelled: { label: 'Cancelled', border: 'border-zinc-500/30', bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' },
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
  const ownerName = ownerProfile?.fullName || 'Workspace';

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (goalId) {
      setSearchParams({ goal: goalId });
    }
  };

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      onClick={handleOpenDetail}
      className="mt-2.5 w-full max-w-md rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-surface-elevated/70 dark:to-surface/75 backdrop-blur-xl p-4 shadow-md shadow-black/5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all text-left group cursor-pointer relative overflow-hidden"
    >
      {/* Subtle Emerald Indicator Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/80 group-hover:bg-emerald-500 transition-colors" />

      {/* Header Row: Type, Status, Horizon */}
      <div className="flex items-center justify-between gap-2 mb-2 pl-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Target className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
            Goal
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
              statusConfig.border,
              statusConfig.bg,
              statusConfig.text,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
            {statusConfig.label}
          </span>
        </div>

        {goal?.horizon && (
          <span className="text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-muted-foreground shrink-0">
            {goal.horizon.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Goal Title */}
      <div className="pl-1 text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors leading-snug break-words">
        {displayTitle}
      </div>

      {/* Progress Bar Visualizer */}
      <div className="mt-3 pl-1 space-y-1.5">
        <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            Milestone Progress
          </span>
          <span className="font-bold text-foreground">{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
          />
        </div>
      </div>

      {/* Metadata & Actions Footer */}
      <div className="mt-3 pt-2.5 border-t border-white/5 pl-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1 text-[10.5px]">
          <span>Lead:</span>
          <span className="font-semibold text-foreground">@{ownerName}</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 text-[10.5px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
          <span>View Goal</span>
          <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </motion.div>
  );
}
