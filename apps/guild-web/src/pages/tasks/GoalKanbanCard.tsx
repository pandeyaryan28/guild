import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Goal } from '../../lib/goals';

const STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-violet-400', dot: '#a78bfa' },
  completed: { label: 'Completed', color: 'text-cyan-400', dot: '#22d3ee' },
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
    ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5'
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
        'group relative rounded-2xl border bg-white/[0.02] dark:bg-white/[0.002] backdrop-blur-md transition-all duration-300 cursor-grab active:cursor-grabbing p-4.5 space-y-3.5 select-none',
        'border-white/5 hover:border-violet-500/25 hover:bg-white/[0.04] dark:hover:bg-white/[0.005] hover:shadow-[0_12px_24px_-10px_rgba(124,58,237,0.15)] hover:-translate-y-1',
        isSortableDragging && 'opacity-30 border-violet-500/20',
        isDragging && 'shadow-2xl shadow-violet-500/20 rotate-1 scale-102 border-violet-500/30 bg-white/[0.05]',
      )}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-no-click]')) {
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <h4 className="text-xs font-black text-foreground group-hover:text-violet-400 transition-colors flex-1 truncate tracking-wide">
          {goal.title}
        </h4>
        <div data-no-click>
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/5 transition-all outline-none">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 border border-white/10 bg-surface/90 backdrop-blur-xl p-1 text-xs">
              <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer">Open Details</DropdownMenuItem>
              {goal.status !== 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange('active')} className="font-semibold cursor-pointer">Mark Active</DropdownMenuItem>
              )}
              {goal.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onStatusChange('completed')} className="font-semibold cursor-pointer">Mark Completed</DropdownMenuItem>
              )}
              {goal.status !== 'cancelled' && (
                <DropdownMenuItem onClick={() => onStatusChange('cancelled')} className="font-semibold cursor-pointer">Mark Cancelled</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400 font-semibold cursor-pointer">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {goal.description && (
        <p className="text-[10px] text-muted-foreground/80 line-clamp-2 leading-relaxed font-medium">
          {goal.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className={cn('px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border backdrop-blur-md', horizonClass)}>
          {horizonLabel}
        </span>
        {recurrenceLabel && (
          <span className={cn('px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border backdrop-blur-md', recurrenceClass)}>
            {recurrenceLabel}
          </span>
        )}
      </div>

      {goal.progressRollup !== undefined && (
        <div className="pt-3 border-t border-white/5 space-y-1.5">
          <div className="flex items-center justify-between text-[8px] text-muted-foreground font-black tracking-wider">
            <span>ROLLUP PROGRESS</span>
            <span className="font-mono text-foreground">{goal.progressRollup}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/[0.04] dark:bg-black/20 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(167,139,250,0.4)]"
              style={{ width: `${goal.progressRollup}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 text-[9px] text-muted-foreground">
        {due ? (
          <span className={cn('flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border backdrop-blur-md font-mono', isOverdue ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-white/[0.02] border-white/5')}>
            <Calendar className="h-2.5 w-2.5 text-muted-foreground shrink-0 mr-1" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
