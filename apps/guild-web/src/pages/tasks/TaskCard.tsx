import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, MessageSquare, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { type Task, type TaskLabel, PRIORITY_CONFIG, STATUS_CONFIG } from '../../lib/tasks';
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
  const isOverdue = due && due < now;
  const isDueToday = due && due.toDateString() === now.toDateString();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-2xl border bg-white/[0.02] dark:bg-white/[0.002] backdrop-blur-md transition-all duration-300 cursor-grab active:cursor-grabbing select-none',
        'border-white/5 hover:border-violet-500/25 hover:bg-white/[0.04] dark:hover:bg-white/[0.005] hover:shadow-[0_12px_24px_-10px_rgba(124,58,237,0.15)] hover:-translate-y-1',
        isSortableDragging && 'opacity-30 border-violet-500/20',
        isDragging && 'shadow-2xl shadow-violet-500/20 rotate-1 scale-102 border-violet-500/30 bg-white/[0.05]',
      )}
      onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-no-click]')) onClick(); }}
    >
      <div className="p-4 space-y-3">
        {/* Priority bar & Title */}
        <div className="flex items-start gap-2.5">
          <div
            className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: priority.color, boxShadow: `0 0 6px ${priority.color}` }}
            title={priority.label}
          />
          <p className="text-xs font-black text-foreground/95 leading-normal flex-1 min-w-0 tracking-wide">
            {task.title}
          </p>
          {/* Context menu */}
          <div data-no-click>
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/5 transition-all outline-none">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 border border-white/10 bg-surface/90 backdrop-blur-xl p-1 text-xs">
                <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer">Open</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400 font-semibold cursor-pointer">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Labels */}
        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {taskLabels.slice(0, 2).map((l) => <LabelBadge key={l.id} label={l} />)}
            {taskLabels.length > 2 && (
              <span className="text-[9px] font-bold text-muted-foreground/60 px-1">+{taskLabels.length - 2}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          {/* Assignees */}
          <div className="flex -space-x-1.5">
            {task.assigneeIds.slice(0, 3).map((uid) => {
              const m = memberMap.get(uid);
              const initials = (m?.fullName || m?.username || '?')[0].toUpperCase();
              return (
                <div
                  key={uid}
                  className="h-4.5 w-4.5 rounded-full bg-violet-500/10 border border-white/15 flex items-center justify-center text-[7px] font-bold text-violet-400 shadow-sm"
                  title={m?.fullName || m?.username}
                >
                  {initials}
                </div>
              );
            })}
            {task.assigneeIds.length > 3 && (
              <div className="h-4.5 w-4.5 rounded-full bg-white/[0.04] border border-white/15 flex items-center justify-center text-[7px] font-bold text-muted-foreground shadow-sm">
                +{task.assigneeIds.length - 3}
              </div>
            )}
          </div>

          {/* Due date */}
          {due && (
            <span className={cn(
              'flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border backdrop-blur-md font-mono',
              isOverdue ? 'bg-red-500/5 border-red-500/20 text-red-400' : isDueToday ? 'bg-amber-500/5 border-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]' : 'bg-white/[0.02] border-white/5 text-muted-foreground',
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
