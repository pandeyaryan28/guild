import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Trash2, Calendar, Check, Clock } from 'lucide-react';
import { moveTask, STATUS_CONFIG, PRIORITY_CONFIG, type Task, type ActorInfo, type TaskStatus } from '../../lib/tasks';
import { motion } from 'motion/react';

interface TaskListRowProps {
  task: Task;
  orgId: string;
  actor: ActorInfo;
  depth?: number;
  subtasks?: Task[];
  isSelected?: boolean;
  onSelect: (task: Task) => void;
  onDelete?: (task: Task) => void;
  memberMap: Record<string, string>;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const PRIORITY_STYLES: Record<string, { dot: string; label: string; chip: string }> = {
  urgent: { dot: '#ef4444', label: 'Urgent', chip: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40' },
  high:   { dot: '#f97316', label: 'High',   chip: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40' },
  medium: { dot: '#6366f1', label: 'Medium', chip: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40' },
  low:    { dot: '#14b8a6', label: 'Low',    chip: 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-200/60 dark:border-teal-800/40' },
};

function DueDateChip({ dueDate }: { dueDate: { toDate: () => Date } | null | undefined }) {
  if (!dueDate) return null;
  const due = dueDate.toDate?.();
  if (!due) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : diff < 0 ? `${Math.abs(diff)}d ago` : due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isOverdue = diff < 0;
  const isToday = diff === 0;

  return (
    <span className={cn(
      'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium border select-none',
      isOverdue ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/30 text-rose-600 dark:text-rose-400' :
      isToday   ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30 text-amber-600 dark:text-amber-400' :
                  'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/40 text-slate-500 dark:text-slate-400',
    )}>
      <Calendar className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

export function TaskListRow({
  task, orgId, actor, depth = 0, subtasks = [],
  isSelected, onSelect, onDelete, memberMap,
}: TaskListRowProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);

  const isDone = task.status === 'done';
  const isReview = task.status === 'review';
  const hasSubtasks = subtasks.length > 0;
  const priorityStyle = PRIORITY_STYLES[task.priority];
  const cfg = STATUS_CONFIG[task.status];

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    let newStatus: TaskStatus;
    if (isDone || isReview) {
      newStatus = 'todo';
    } else {
      newStatus = task.creatorId !== actor.uid ? 'review' : 'done';
    }
    await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    setCompleting(false);
  };

  const taskCode = `#${task.id.slice(0, 4).toUpperCase()}`;
  const completedSubtasks = subtasks.filter((s) => s.status === 'done').length;

  return (
    <>
      <div
        onClick={() => onSelect(task)}
        className={cn(
          'group relative flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer select-none transition-all duration-150',
          isSelected
            ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-300/60 dark:border-indigo-600/40 shadow-sm'
            : 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/30',
          isDone && 'opacity-55 hover:opacity-70',
        )}
        style={{ paddingLeft: depth > 0 ? `${16 + depth * 20}px` : undefined }}
      >
        {/* Subtask indent line */}
        {depth > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-slate-150 dark:bg-slate-800 pointer-events-none"
            style={{ left: `${(depth - 1) * 20 + 12}px` }}
          />
        )}

        {/* Subtask expand chevron */}
        {hasSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex-shrink-0 h-5 w-5 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-90 text-indigo-500')} />
          </button>
        )}

        {/* Complete toggle */}
        <button
          onClick={handleComplete}
          className={cn(
            'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer relative z-10',
            isDone   ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' :
            isReview ? 'bg-amber-400 border-amber-400 text-white animate-pulse' :
                       'border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
            completing && 'opacity-50 scale-90',
          )}
        >
          {isDone   && <Check className="h-3 w-3 stroke-[3px]" />}
          {isReview && <Clock className="h-2.5 w-2.5" style={{ animation: 'spin 3s linear infinite' }} />}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600 shrink-0 font-mono">
              {taskCode}
            </span>
            <span className={cn(
              'text-sm font-medium leading-tight tracking-tight transition-colors',
              isDone
                ? 'line-through text-slate-400 dark:text-slate-500'
                : isSelected
                ? 'text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white',
            )}>
              {task.title}
            </span>
          </div>

          {/* Meta chips row */}
          {(task.dueDate || (task.priority !== 'none' && priorityStyle) || hasSubtasks || task.assigneeIds.length > 0) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <DueDateChip dueDate={task.dueDate as any} />

              {task.priority !== 'none' && priorityStyle && (
                <span className={cn('px-1.5 py-0.5 rounded-md text-[11px] font-semibold border', priorityStyle.chip)}>
                  {priorityStyle.label}
                </span>
              )}

              {task.status !== 'todo' && task.status !== 'done' && cfg && (
                <span
                  className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold border"
                  style={{
                    color: cfg.dot,
                    backgroundColor: `${cfg.dot}15`,
                    borderColor: `${cfg.dot}30`,
                  }}
                >
                  {cfg.label}
                </span>
              )}

              {hasSubtasks && (
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/30 px-1.5 py-0.5 rounded-md">
                  {completedSubtasks}/{subtasks.length} done
                </span>
              )}

              {/* Assignee avatars */}
              {task.assigneeIds.length > 0 && (
                <div className="flex -space-x-1">
                  {task.assigneeIds.slice(0, 3).map((uid) => {
                    const name = memberMap[uid] || uid;
                    return (
                      <div
                        key={uid}
                        title={name}
                        className="h-4 w-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-indigo-700 dark:text-indigo-300"
                      >
                        {getInitials(name)}
                      </div>
                    );
                  })}
                  {task.assigneeIds.length > 3 && (
                    <div className="h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-700 flex items-center justify-center text-[9px] font-semibold text-slate-500">
                      +{task.assigneeIds.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Subtasks */}
      {expanded && subtasks.map((sub) => (
        <TaskListRow
          key={sub.id}
          task={sub}
          orgId={orgId}
          actor={actor}
          depth={depth + 1}
          subtasks={[]}
          isSelected={false}
          onSelect={onSelect}
          onDelete={onDelete}
          memberMap={memberMap}
        />
      ))}
    </>
  );
}
