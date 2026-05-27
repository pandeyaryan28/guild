import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Task, type TaskLabel, PRIORITY_CONFIG } from '../../lib/tasks';
import { LabelBadge } from '../../components/tasks/LabelBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  labels: TaskLabel[];
  memberMap: Map<string, { fullName: string; username: string }>;
  onClick: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

const PRIORITY_ACCENT: Record<string, string> = {
  urgent: '#ef4444',
  high:   '#f97316',
  medium: '#6366f1',
  low:    '#14b8a6',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgent',
  high:   'High',
  medium: 'Medium',
  low:    'Low',
};

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function TaskCard({ task, labels, memberMap, onClick, onDelete, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));
  const due = task.dueDate?.toDate();
  const now = new Date();
  const isOverdue = due && due < now && task.status !== 'done';
  const isDueToday = due && due.toDateString() === now.toDateString() && task.status !== 'done';
  const priorityAccent = PRIORITY_ACCENT[task.priority];
  const taskCode = `#${task.id.slice(0, 4).toUpperCase()}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-xl border bg-white dark:bg-slate-900 cursor-grab active:cursor-grabbing select-none transition-all duration-200',
        'border-slate-100 dark:border-slate-800/70',
        'hover:border-slate-200 dark:hover:border-slate-700/70 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]',
        isSortableDragging && 'opacity-30 border-dashed',
        isDragging && 'shadow-2xl shadow-black/10 dark:shadow-black/40 rotate-[1.5deg] scale-[1.02] border-indigo-300/60 dark:border-indigo-600/40',
      )}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-no-click]')) onClick();
      }}
    >
      {/* Priority accent line */}
      {priorityAccent && (
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ backgroundColor: priorityAccent, opacity: 0.7 }}
        />
      )}

      <div className="p-3.5 pl-5 space-y-3">
        {/* Header row: code + menu */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600 font-mono tracking-tight">
            {taskCode}
          </span>

          <div data-no-click className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all outline-none cursor-pointer min-h-6 min-w-6 flex items-center justify-center">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs shadow-xl rounded-xl">
                <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  Open details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-rose-500 focus:text-rose-500 font-semibold cursor-pointer py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg">
                  Remove task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors break-words">
          {task.title}
        </p>

        {/* Labels */}
        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {taskLabels.slice(0, 2).map((l) => (
              <LabelBadge key={l.id} label={l} />
            ))}
            {taskLabels.length > 2 && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                +{taskLabels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Priority chip */}
        {priorityAccent && task.priority !== 'none' && (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ color: priorityAccent, backgroundColor: `${priorityAccent}18` }}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
          </div>
        )}

        {/* Footer: avatars + due */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/70">
          {/* Assignee avatars */}
          <div className="flex -space-x-1.5">
            {task.assigneeIds.slice(0, 3).map((uid) => {
              const m = memberMap.get(uid);
              const name = m?.fullName || m?.username || '?';
              return (
                <div
                  key={uid}
                  title={name}
                  className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-bold text-indigo-700 dark:text-indigo-300"
                >
                  {getInitials(name)}
                </div>
              );
            })}
            {task.assigneeIds.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-semibold text-slate-500">
                +{task.assigneeIds.length - 3}
              </div>
            )}
          </div>

          {/* Due date */}
          {due && (
            <span className={cn(
              'flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md',
              isOverdue   ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' :
              isDueToday  ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' :
                            'text-slate-400 dark:text-slate-500',
            )}>
              <Calendar className="h-3 w-3 shrink-0" />
              {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
