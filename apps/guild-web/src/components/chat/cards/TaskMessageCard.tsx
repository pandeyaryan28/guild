import * as React from 'react';
import { CheckSquare, User, Calendar, ArrowUpRight, Check, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { updateTask } from '../../../lib/tasks';
import { useSearchParams } from 'react-router-dom';

const TASK_STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; dot: string }> = {
  todo: { label: 'To Do', border: 'border-zinc-500/30', bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' },
  in_progress: { label: 'In Progress', border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  review: { label: 'Review', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  done: { label: 'Done', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; dot: string }> = {
  urgent: { label: 'Urgent', border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
  high: { label: 'High', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
  medium: { label: 'Medium', border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  low: { label: 'Low', border: 'border-zinc-500/30', bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' },
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

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!orgId || !currentUserProfile || !taskId) return;
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
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      onClick={handleOpenDetail}
      className={cn(
        'mt-2.5 w-full max-w-md rounded-2xl border border-white/10 dark:border-white/10 bg-surface-elevated/70 dark:bg-surface/75 backdrop-blur-xl p-4 shadow-md shadow-black/5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group cursor-pointer relative overflow-hidden',
      )}
    >
      {/* Subtle Linear Indicator Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/80 group-hover:bg-primary transition-colors" />

      {/* Header Row: Type, Status, Priority */}
      <div className="flex items-center justify-between gap-2 mb-2 pl-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <CheckSquare className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/95">
            Task
          </span>
          {isApproved ? (
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
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
              <AlertCircle className="h-2.5 w-2.5" />
              Pending Approval
            </span>
          )}
        </div>

        {priorityConfig && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider shrink-0',
              priorityConfig.border,
              priorityConfig.bg,
              priorityConfig.text,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', priorityConfig.dot)} />
            {priorityConfig.label}
          </span>
        )}
      </div>

      {/* Task Title */}
      <div className="pl-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug break-words">
        {displayTitle}
      </div>

      {/* Metadata & Actions Footer */}
      <div className="mt-3 pt-2.5 border-t border-white/5 pl-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 border border-white/5">
            <User className="h-3 w-3 text-primary/80" />
            <span className="font-medium text-foreground text-[10.5px]">
              {effectiveAssignee}
            </span>
          </div>
          {task?.dueDate && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 border border-white/5">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px]">{task.dueDate}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-primary text-[10.5px] font-bold opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
          <span>Open</span>
          <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>

      {/* Approval CTA for Managers/Admins */}
      {!isApproved && canApprove && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApprove}
          disabled={saving}
          className="mt-3 w-full py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Check className="h-3.5 w-3.5" /> Approve Task
        </motion.button>
      )}
    </motion.div>
  );
}
