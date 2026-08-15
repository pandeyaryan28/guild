import * as React from 'react';
import { CheckSquare, User, Calendar, ArrowUpRight, Check, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { updateTask } from '../../../lib/tasks';
import { useSearchParams } from 'react-router-dom';

const TASK_STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; dot: string; glow: string }> = {
  todo: { 
    label: 'To Do', 
    border: 'border-zinc-300 dark:border-zinc-700/60', 
    bg: 'bg-zinc-100 dark:bg-zinc-800/60', 
    text: 'text-zinc-700 dark:text-zinc-300', 
    dot: 'bg-zinc-500 dark:bg-zinc-400',
    glow: 'shadow-zinc-500/5'
  },
  in_progress: { 
    label: 'In Progress', 
    border: 'border-blue-400/50 dark:border-blue-500/40', 
    bg: 'bg-blue-50 dark:bg-blue-500/15', 
    text: 'text-blue-700 dark:text-blue-300', 
    dot: 'bg-blue-600 dark:bg-blue-400',
    glow: 'shadow-blue-500/10'
  },
  review: { 
    label: 'Review', 
    border: 'border-amber-400/50 dark:border-amber-500/40', 
    bg: 'bg-amber-50 dark:bg-amber-500/15', 
    text: 'text-amber-700 dark:text-amber-300', 
    dot: 'bg-amber-600 dark:bg-amber-400',
    glow: 'shadow-amber-500/10'
  },
  done: { 
    label: 'Completed', 
    border: 'border-emerald-400/50 dark:border-emerald-500/40', 
    bg: 'bg-emerald-50 dark:bg-emerald-500/15', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    glow: 'shadow-emerald-500/10'
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; dot: string }> = {
  urgent: { label: 'Urgent', border: 'border-red-400/50 dark:border-red-500/40', bg: 'bg-red-50 dark:bg-red-500/15', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  high: { label: 'High', border: 'border-amber-400/50 dark:border-amber-500/40', bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  medium: { label: 'Medium', border: 'border-blue-400/50 dark:border-blue-500/40', bg: 'bg-blue-50 dark:bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-400' },
  low: { label: 'Low', border: 'border-zinc-300 dark:border-zinc-700/60', bg: 'bg-zinc-100 dark:bg-zinc-800/60', text: 'text-zinc-700 dark:text-zinc-400', dot: 'bg-zinc-400' },
};

export interface TaskMessageCardProps {
  taskId: string;
  fallbackTitle?: string;
  creatorName?: string;
  assigneeName?: string;
  members: any[];
  currentUser: any;
  orgId?: string;
}

export function TaskMessageCard({
  taskId,
  fallbackTitle,
  creatorName,
  assigneeName,
  members,
  currentUser,
  orgId,
}: TaskMessageCardProps) {
  const [task, setTask] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);
  const [, setSearchParams] = useSearchParams();

  React.useEffect(() => {
    if (!taskId) return;
    const unsub = onSnapshot(doc(db, 'tasks', taskId), (snap) => {
      if (snap.exists()) {
        setTask({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [taskId]);

  const displayTitle = task?.title || fallbackTitle || 'Untitled Task';
  const statusKey = task?.status || 'todo';
  const isDone = statusKey === 'done';
  const statusConfig = TASK_STATUS_CONFIG[statusKey] || TASK_STATUS_CONFIG.todo;
  const priorityKey = task?.priority && task.priority !== 'none' ? task.priority : null;
  const priorityConfig = priorityKey ? PRIORITY_CONFIG[priorityKey] : null;

  const reactorProfile = members.find((m) => m.uid === task?.creatorId);
  const currentUserProfile = members.find((m) => m.uid === currentUser?.uid);

  const isManager = reactorProfile?.managerId && reactorProfile.managerId === currentUser?.uid;
  const isOwner = currentUserProfile?.role === 'owner';
  const isAdmin = currentUserProfile?.role === 'admin';
  const canApprove = isManager || isOwner || isAdmin;
  const isApproved = task?.approved !== false;

  const effectiveAssignee =
    assigneeName ||
    (task?.assigneeIds && task.assigneeIds.length > 0
      ? members.find((m) => m.uid === task.assigneeIds[0])?.fullName || 'Assignee'
      : 'Unassigned');

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!orgId || !currentUserProfile || !taskId || saving) return;
    setSaving(true);
    try {
      const newStatus = isDone ? 'todo' : 'done';
      const actionActor = { uid: currentUser.uid, name: currentUserProfile.fullName };
      await updateTask(taskId, orgId, { status: newStatus } as any, actionActor);
    } catch (err: any) {
      alert(err.message || 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!orgId || !currentUserProfile || !taskId || saving) return;
    setSaving(true);
    try {
      const actionActor = { uid: currentUser.uid, name: currentUserProfile.fullName };
      await updateTask(taskId, orgId, { approved: true } as any, actionActor);
    } catch (err: any) {
      alert(err.message || 'Failed to approve task.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (taskId) {
      setSearchParams({ task: taskId });
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
        isDone 
          ? 'border-emerald-400/40 dark:border-emerald-500/30' 
          : 'border-border-default/80 dark:border-white/10 hover:border-primary/40'
      )}
    >
      {/* Decorative Top Pill Accent Line */}
      <div className={cn(
        'h-1 w-full transition-colors',
        isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary/80 via-primary/50 to-primary/20'
      )} />

      <div className="p-4 space-y-3">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border font-bold text-xs transition-colors',
              isDone 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-primary/10 text-primary border-primary/20'
            )}>
              <CheckSquare className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Task Card
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {priorityConfig && (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                priorityConfig.border,
                priorityConfig.bg,
                priorityConfig.text
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full', priorityConfig.dot)} />
                {priorityConfig.label}
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

        {/* Task Title & Interactive Complete Checkbox */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleToggleComplete}
            disabled={saving}
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer',
              isDone 
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                : 'border-border-strong dark:border-white/20 hover:border-primary bg-background/50 hover:bg-primary/5'
            )}
            title={isDone ? "Mark as Incomplete" : "Mark as Complete"}
          >
            {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </button>

          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug',
              isDone && 'line-through text-muted-foreground decoration-muted-foreground/60'
            )}>
              {displayTitle}
            </h4>
          </div>
        </div>

        {/* Task Details Footer: Assignee, Due, Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-subtle dark:border-white/5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-elevated/70 dark:bg-white/5 border border-border-subtle dark:border-white/5">
              <User className="h-3 w-3 text-primary" />
              <span className="font-medium text-[11px] text-foreground truncate max-w-[120px]">
                {effectiveAssignee}
              </span>
            </div>

            {task?.dueDate && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isApproved && canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
              >
                <Check className="h-3 w-3" /> Approve
              </button>
            )}

            <div className="flex items-center gap-0.5 text-primary text-[11px] font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>View</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
