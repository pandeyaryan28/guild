import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MoreHorizontal, Target } from 'lucide-react';
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

  const due = goal.targetDate?.toDate?.();
  const now = new Date();
  const isOverdue = due && due < now && goal.status === 'active';

  const horizonLabel = goal.horizon === 'long_term' ? 'Vision' : 'Milestone';
  const horizonClass = goal.horizon === 'long_term'
    ? 'text-violet-400 border-violet-500/20 bg-violet-500/5'
    : 'text-sky-400 border-sky-500/20 bg-sky-500/5';

  const recurrenceLabel = goal.recurrence && goal.recurrence !== 'none'
    ? goal.recurrence.charAt(0).toUpperCase() + goal.recurrence.slice(1)
    : null;

  const recurrenceClass = goal.recurrence === 'daily'
    ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5'
    : goal.recurrence === 'weekly'
    ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
    : 'text-rose-400 border-rose-500/20 bg-rose-500/5';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-2xl border bg-white/[0.025] dark:bg-white/[0.002] backdrop-blur-md transition-all duration-300 cursor-grab active:cursor-grabbing p-4.5 space-y-4 select-none',
        'border-white/5 hover:border-violet-500/25 hover:bg-white/[0.05] dark:hover:bg-white/[0.005] hover:shadow-[0_12px_24px_-10px_rgba(124,58,237,0.18)] hover:-translate-y-0.5',
        isSortableDragging && 'opacity-25 border-violet-500/15',
        isDragging && 'shadow-2xl shadow-violet-500/25 border-violet-500/35 bg-white/[0.06] dark:bg-white/[0.01] rotate-1 scale-102',
      )}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-no-click]')) {
          onClick();
        }
      }}
    >
      {/* Title & Dropdown */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Target className="h-4 w-4 text-violet-400/80 shrink-0 mt-0.5" />
          <h4 className="text-xs font-black text-foreground group-hover:text-violet-400 transition-colors truncate tracking-wide leading-snug">
            {goal.title}
          </h4>
        </div>

        <div data-no-click className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10 transition-all outline-none min-h-8 min-w-8 flex items-center justify-center cursor-pointer">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 border border-white/10 bg-surface/90 backdrop-blur-xl p-1 text-xs shadow-xl rounded-xl">
              <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer py-2 hover:bg-white/5 rounded-lg">Open Details</DropdownMenuItem>
              {goal.status !== 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange('active')} className="font-semibold cursor-pointer py-2 hover:bg-white/5 rounded-lg">Mark Active</DropdownMenuItem>
              )}
              {goal.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onStatusChange('completed')} className="font-semibold cursor-pointer py-2 hover:bg-white/5 rounded-lg">Mark Completed</DropdownMenuItem>
              )}
              {goal.status !== 'cancelled' && (
                <DropdownMenuItem onClick={() => onStatusChange('cancelled')} className="font-semibold cursor-pointer py-2 hover:bg-white/5 rounded-lg">Mark Cancelled</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400 font-semibold cursor-pointer py-2 hover:bg-red-500/10 rounded-lg">Delete Goal</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <p className="text-[10px] text-muted-foreground/80 line-clamp-2 leading-relaxed font-medium pl-6">
          {goal.description}
        </p>
      )}

      {/* Badges / Horizon tags */}
      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        <span className={cn('px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border backdrop-blur-md select-none', horizonClass)}>
          {horizonLabel}
        </span>
        {recurrenceLabel && (
          <span className={cn('px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border backdrop-blur-md select-none', recurrenceClass)}>
            {recurrenceLabel}
          </span>
        )}
      </div>

      {/* Futuristic Progress Rollup Gauges */}
      {goal.progressRollup !== undefined && (
        <div className="pt-3 border-t border-white/5 space-y-2 pl-6">
          <div className="flex items-center justify-between text-[8px] text-muted-foreground font-black tracking-wider">
            <span>ROLLUP PROGRESS</span>
            <span className="font-mono text-foreground">{goal.progressRollup}%</span>
          </div>
          
          {/* Double-layer gauge track */}
          <div className="h-1.5 w-full bg-white/[0.04] dark:bg-black/20 rounded-full overflow-hidden border border-white/5 relative">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(167,139,250,0.4)] relative"
              style={{ width: `${goal.progressRollup}%` }}
            >
              {/* Glowing Particle effect */}
              {goal.progressRollup > 0 && (
                <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full opacity-70 filter blur-[1px] animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Target Date stamp */}
      <div className="flex items-center justify-between pt-1 text-[9px] text-muted-foreground pl-6">
        {due ? (
          <span className={cn(
            'flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border backdrop-blur-md font-mono select-none transition-all duration-300',
            isOverdue 
              ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]' 
              : 'bg-white/[0.02] border-white/5',
          )}>
            <Calendar className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
