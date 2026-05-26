import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Goal } from '../../lib/goals';

const STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-violet-400', dot: '#a78bfa' },
  completed: { label: 'Completed', color: 'text-emerald-400', dot: '#34d399' },
  cancelled: { label: 'Cancelled', color: 'text-zinc-500',    dot: '#52525b' },
};

interface GoalKanbanCardProps {
  goal: Goal;
  onClick: () => void;
  onDelete: () => void;
  onStatusChange: (status: Goal['status']) => void;
  isDragging?: boolean;
}

export function GoalKanbanCard({ goal, onClick, onDelete, onStatusChange, isDragging }: GoalKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = STATUS_CONFIG[goal.status];
  const due = goal.targetDate?.toDate?.();
  const now = new Date();
  const isOverdue = due && due < now && goal.status === 'active';

  const horizonLabel = goal.horizon === 'long_term' ? 'Vision' : 'Milestone';
  const horizonClass = goal.horizon === 'long_term'
    ? 'text-violet-450 border-violet-500/20 bg-violet-500/5'
    : 'text-sky-400 border-sky-500/20 bg-sky-500/5';

  const recurrenceLabel = goal.recurrence && goal.recurrence !== 'none'
    ? goal.recurrence.charAt(0).toUpperCase() + goal.recurrence.slice(1)
    : null;

  const recurrenceClass = goal.recurrence === 'daily'
    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
    : goal.recurrence === 'weekly'
    ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
    : 'text-rose-450 border-rose-500/20 bg-rose-500/5';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-xl border bg-card transition-all duration-150 cursor-grab active:cursor-grabbing p-4 space-y-3 select-none',
        'border-border-default hover:border-violet-500/30 hover:bg-surface',
        isSortableDragging && 'opacity-40 border-primary/40',
        isDragging && 'shadow-2xl shadow-black/40 rotate-1 scale-105',
      )}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-no-click]')) {
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-bold text-foreground leading-snug group-hover:text-violet-400 transition-colors flex-1 truncate">
          {goal.title}
        </h4>
        <div data-no-click>
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all outline-none">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 border-border-default bg-popover/90 backdrop-blur-md text-xs">
              <DropdownMenuItem onClick={onClick}>Open Details</DropdownMenuItem>
              {goal.status !== 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange('active')}>Mark Active</DropdownMenuItem>
              )}
              {goal.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onStatusChange('completed')}>Mark Completed</DropdownMenuItem>
              )}
              {goal.status !== 'cancelled' && (
                <DropdownMenuItem onClick={() => onStatusChange('cancelled')}>Mark Cancelled</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {goal.description && (
        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
          {goal.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border', horizonClass)}>
          {horizonLabel}
        </span>
        {recurrenceLabel && (
          <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border', recurrenceClass)}>
            {recurrenceLabel}
          </span>
        )}
      </div>

      {goal.progressRollup !== undefined && (
        <div className="pt-2 border-t border-border-default/50 space-y-1">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
            <span>COMPLETION RATE</span>
            <span className="font-bold text-foreground">{goal.progressRollup}%</span>
          </div>
          <div className="h-1 w-full bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${goal.progressRollup}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 text-[9px] text-muted-foreground">
        {due ? (
          <span className={cn('flex items-center gap-1 font-medium', isOverdue ? 'text-red-400' : '')}>
            <Calendar className="h-2.5 w-2.5 text-muted-foreground mr-1" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
