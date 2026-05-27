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
    : 'text-rose-450 border-rose-500/20 bg-rose-500/5';

  // SVG Radial Telemetry Arc calculations
  const progressValue = goal.progressRollup !== undefined ? goal.progressRollup : 0;
  const radius = 18;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius; // Approx 113.1
  const strokeDashoffset = circumference - (progressValue / 100) * circumference;

  const goalIdCode = `G-${goal.id.slice(0, 4).toUpperCase()}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-xl border bg-white/[0.015] dark:bg-black/[0.15] backdrop-blur-md transition-all duration-300 cursor-grab active:cursor-grabbing p-4.5 space-y-3.5 select-none font-mono overflow-hidden',
        'border-white/5 hover:border-violet-500/25 hover:bg-white/[0.035] dark:hover:bg-white/[0.002] hover:shadow-[0_8px_20px_-10px_rgba(124,58,237,0.2)] hover:-translate-y-0.5',
        isSortableDragging && 'opacity-20 border-violet-500/10',
        isDragging && 'shadow-2xl shadow-violet-500/25 border-violet-500/35 bg-white/[0.04] dark:bg-white/[0.004] rotate-1 scale-102',
      )}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-no-click]')) {
          onClick();
        }
      }}
    >
      {/* Blueprint Grid layout underlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

      {/* Main card details: Radial SVG progress split side-by-side with Content */}
      <div className="flex items-start gap-3 relative z-10">
        
        {/* Left Side: SVG Circular Telemetry Ring */}
        {goal.progressRollup !== undefined && (
          <div className="shrink-0 flex items-center justify-center relative h-12 w-12 bg-white/[0.02] border border-white/5 rounded-full select-none" data-no-click>
            <svg className="w-12 h-12 transform -rotate-90">
              {/* Radial linear gradient definition */}
              <defs>
                <linearGradient id={`radialGrad-${goal.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {/* Circle track underlay */}
              <circle
                className="text-white/[0.04] stroke-current"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx="24"
                cy="24"
              />
              {/* Circle active progress path */}
              <circle
                className="stroke-current transition-all duration-700 ease-out"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx="24"
                cy="24"
                style={{ 
                  stroke: `url(#radialGrad-${goal.id})`,
                  filter: `drop-shadow(0 0 4px rgba(139, 92, 246, 0.4))` 
                }}
              />
            </svg>
            {/* Centered Monospace Rate display */}
            <span className="absolute text-[8px] font-black text-foreground font-mono select-none">
              {progressValue}%
            </span>
          </div>
        )}

        {/* Right Side: Title details and context actions */}
        <div className="flex-1 min-w-0 space-y-2 pl-0.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              {/* Monospace directive index tag */}
              <span className="font-mono text-[9px] font-black text-violet-400/90 bg-violet-500/5 border border-violet-500/10 px-1 rounded select-none w-fit">
                {goalIdCode}
              </span>
              
              <h4 className="text-[12px] font-sans font-semibold text-foreground group-hover:text-violet-400 transition-colors truncate tracking-wide leading-snug">
                {goal.title}
              </h4>
            </div>

            <div data-no-click className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/10 transition-all outline-none min-h-7 min-w-7 flex items-center justify-center cursor-pointer">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 border border-white/10 bg-surface/95 backdrop-blur-2xl p-1 text-xs shadow-xl rounded font-mono">
                  <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer py-1.5 hover:bg-white/5 rounded">Open details</DropdownMenuItem>
                  {goal.status !== 'active' && (
                    <DropdownMenuItem onClick={() => onStatusChange('active')} className="font-semibold cursor-pointer py-1.5 hover:bg-white/5 rounded">Set active</DropdownMenuItem>
                  )}
                  {goal.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => onStatusChange('completed')} className="font-semibold cursor-pointer py-1.5 hover:bg-white/5 rounded">Set completed</DropdownMenuItem>
                  )}
                  {goal.status !== 'cancelled' && (
                    <DropdownMenuItem onClick={() => onStatusChange('cancelled')} className="font-semibold cursor-pointer py-1.5 hover:bg-white/5 rounded">Set cancelled</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:text-red-400 font-semibold cursor-pointer py-1.5 hover:bg-red-500/10 rounded">Remove directive</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <p className="text-[10px] text-muted-foreground/80 line-clamp-2 leading-relaxed font-sans pl-0.5">
              {goal.description}
            </p>
          )}

          {/* Severity & Recurrence directive tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-0.5">
            <span className={cn('px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-md select-none', horizonClass)}>
              {horizonLabel}
            </span>
            {recurrenceLabel && (
              <span className={cn('px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-md select-none', recurrenceClass)}>
                {recurrenceLabel}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Target date stamp at bottom */}
      {due && (
        <div className="flex items-center justify-end pt-2 border-t border-white/5 text-[9px] text-muted-foreground relative z-10 select-none">
          <span className={cn(
            'flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md font-mono transition-all duration-300',
            isOverdue 
              ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]' 
              : 'bg-white/[0.02] border-white/10 text-muted-foreground',
          )}>
            <Calendar className="h-2.5 w-2.5 text-muted-foreground shrink-0 mr-0.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  );
}
