import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Calendar, Clock, AlertCircle } from 'lucide-react';
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

export function TaskCard({ task, labels, memberMap, onClick, onDelete, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id));
  const priority = PRIORITY_CONFIG[task.priority];
  const due = task.dueDate?.toDate();
  const now = new Date();
  const isOverdue = due && due < now && task.status !== 'done';
  const isDueToday = due && due.toDateString() === now.toDateString() && task.status !== 'done';

  const priorityColor = priority?.color || '#52525b';

  // Custom visual priority chips for premium layout
  const priorityBadge = React.useMemo(() => {
    switch (task.priority) {
      case 'urgent':
        return { text: 'Urgent', className: 'text-rose-600 dark:text-rose-455 border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 font-semibold' };
      case 'high':
        return { text: 'High', className: 'text-amber-600 dark:text-amber-450 border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20 font-semibold' };
      case 'medium':
        return { text: 'Medium', className: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30 bg-indigo-50 dark:bg-indigo-950/20' };
      case 'low':
        return { text: 'Low', className: 'text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/30 bg-teal-50 dark:bg-teal-950/20' };
      default:
        return null;
    }
  }, [task.priority]);

  const taskIdCode = `#${task.id.slice(0, 4).toUpperCase()}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-2xl border bg-white dark:bg-[#1f2937] transition-all duration-300 cursor-grab active:cursor-grabbing select-none p-4.5 space-y-3.5 shadow-sm',
        'border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-400/40 hover:shadow-md hover:-translate-y-0.5',
        isSortableDragging && 'opacity-20 border-indigo-500/10',
        isDragging && 'shadow-xl shadow-indigo-500/10 border-indigo-500/40 bg-white dark:bg-[#1f2937]/90 rotate-1 scale-102',
      )}
      onClick={(e) => { 
        if (!(e.target as HTMLElement).closest('[data-no-click]')) {
          onClick(); 
        }
      }}
    >
      <div className="space-y-3 relative z-10">
        
        {/* Task code & Priority details */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sans text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full select-none shrink-0 tracking-tight">
              {taskIdCode}
            </span>
            {priorityBadge && (
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border tracking-tight', priorityBadge.className)}>
                {priorityBadge.text}
              </span>
            )}
          </div>

          <div data-no-click className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 rounded-xl p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all outline-none min-h-7 min-w-7 flex items-center justify-center cursor-pointer border border-transparent">
                <MoreHorizontal className="h-4.5 w-4.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs shadow-xl rounded-xl font-sans">
                <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Open details</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-rose-500 focus:text-rose-500 font-semibold cursor-pointer py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg">Remove task</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Task Title Description */}
        <div className="space-y-1">
          <p className="text-[13.5px] font-sans font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-snug tracking-tight break-words transition-colors duration-300">
            {task.title}
          </p>
        </div>

        {/* Labels badging */}
        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {taskLabels.slice(0, 2).map((l) => (
              <LabelBadge key={l.id} label={l} />
            ))}
            {taskLabels.length > 2 && (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-150/40 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/20 px-2 py-0.5 rounded-full select-none">
                +{taskLabels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* User initials avatars & Clocks */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 select-none">
          
          {/* Overlapping avatar stacks */}
          <div className="flex items-center -space-x-1.5">
            {task.assigneeIds.slice(0, 3).map((uid) => {
              const m = memberMap.get(uid);
              const initials = (m?.fullName || m?.username || '?')[0].toUpperCase();
              return (
                <div
                  key={uid}
                  className="h-5 w-5 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-[9px] font-bold text-indigo-650 dark:text-indigo-400 shadow-sm cursor-default"
                  title={m?.fullName || m?.username}
                >
                  {initials}
                </div>
              );
            })}
            {task.assigneeIds.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[9px] font-semibold text-slate-500 shadow-sm">
                +{task.assigneeIds.length - 3}
              </div>
            )}
          </div>

          {/* Clock stamp */}
          {due && (
            <span className={cn(
              'flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border backdrop-blur-md transition-all duration-300 font-sans',
              isOverdue 
                ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-450' 
                : isDueToday 
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-450 animate-pulse' 
                : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
            )}>
              <Clock className="h-3 w-3 opacity-80 shrink-0" />
              {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
