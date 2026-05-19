/**
 * Lightweight task row for scoped vertical Kanban views (Project / Goal detail pages).
 * Does NOT require labels or memberMap — those details open in TaskDetailPanel on click.
 */
import * as React from 'react';
import { Calendar, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_CONFIG, type Task } from '../../lib/tasks';

interface ScopedTaskRowProps {
  task: Task;
}

export function ScopedTaskRow({ task }: ScopedTaskRowProps) {
  const priority = PRIORITY_CONFIG[task.priority];
  const due = task.dueDate?.toDate?.();
  const isOverdue = due && due < new Date();

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-border/30 bg-card/50 px-3 py-2.5',
        'hover:border-border/60 hover:bg-card/80 transition-all duration-150 cursor-pointer',
      )}
    >
      {/* Priority dot */}
      <div
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: priority.color }}
        title={priority.label}
      />

      {/* Title */}
      <span className="flex-1 text-[13px] font-medium text-foreground/90 truncate leading-tight">
        {task.title}
      </span>

      {/* Assignee avatars */}
      {task.assigneeIds.length > 0 && (
        <div className="flex -space-x-1">
          {task.assigneeIds.slice(0, 3).map((uid, i) => (
            <div
              key={uid}
              className="h-4 w-4 rounded-full bg-primary/20 ring-1 ring-background flex items-center justify-center text-[7px] font-bold text-primary"
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
      )}

      {/* Due date */}
      {due && (
        <span className={cn(
          'flex items-center gap-0.5 text-[10px] font-medium flex-shrink-0',
          isOverdue ? 'text-red-400' : 'text-muted-foreground/60',
        )}>
          <Calendar className="h-2.5 w-2.5" />
          {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}
