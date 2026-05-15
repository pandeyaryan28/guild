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
        'group relative rounded-xl border bg-card transition-all duration-150 cursor-grab active:cursor-grabbing',
        'border-border/40 hover:border-border/70 hover:bg-card/80',
        isSortableDragging && 'opacity-40 border-primary/40',
        isDragging && 'shadow-2xl shadow-black/40 rotate-1 scale-105',
      )}
      onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-no-click]')) onClick(); }}
    >
      <div className="p-3 space-y-2.5">
        {/* Priority bar */}
        <div className="flex items-start gap-2">
          <div
            className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: priority.color }}
            title={priority.label}
          />
          <p className="text-sm font-medium text-foreground leading-snug flex-1 min-w-0">
            {task.title}
          </p>
          {/* Context menu */}
          <div data-no-click>
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all outline-none">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 border-border/40 bg-popover/90 backdrop-blur-md text-xs">
                <DropdownMenuItem onClick={onClick}>Open</DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Labels */}
        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {taskLabels.slice(0, 2).map((l) => <LabelBadge key={l.id} label={l} />)}
            {taskLabels.length > 2 && (
              <span className="text-[10px] text-muted-foreground px-1">+{taskLabels.length - 2}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Assignees */}
          <div className="flex -space-x-1.5">
            {task.assigneeIds.slice(0, 3).map((uid) => {
              const m = memberMap.get(uid);
              const initials = (m?.fullName || m?.username || '?')[0].toUpperCase();
              return (
                <div
                  key={uid}
                  className="h-5 w-5 rounded-full bg-primary/30 ring-1 ring-background flex items-center justify-center text-[8px] font-bold text-primary"
                  title={m?.fullName || m?.username}
                >
                  {initials}
                </div>
              );
            })}
            {task.assigneeIds.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-muted ring-1 ring-background flex items-center justify-center text-[8px] text-muted-foreground">
                +{task.assigneeIds.length - 3}
              </div>
            )}
          </div>

          {/* Due date */}
          {due && (
            <span className={cn(
              'flex items-center gap-1 text-[10px] font-medium',
              isOverdue ? 'text-red-400' : isDueToday ? 'text-amber-400' : 'text-muted-foreground',
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
