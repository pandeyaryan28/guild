import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MoreHorizontal, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Goal } from '../../lib/goals';

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
    ? 'text-indigo-650 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-850/30 bg-indigo-50/50 dark:bg-indigo-950/10'
    : 'text-sky-650 dark:text-sky-400 border-sky-200/50 dark:border-sky-850/30 bg-sky-50/50 dark:bg-sky-950/10';

  const recurrenceLabel = goal.recurrence && goal.recurrence !== 'none'
    ? goal.recurrence.charAt(0).toUpperCase() + goal.recurrence.slice(1)
    : null;

  const recurrenceClass = goal.recurrence === 'daily'
    ? 'text-teal-600 dark:text-teal-400 border-teal-200/50 dark:border-teal-850/30 bg-teal-50/50 dark:bg-teal-950/10'
    : goal.recurrence === 'weekly'
    ? 'text-amber-600 dark:text-amber-450 border-amber-200/50 dark:border-amber-850/30 bg-amber-50/50 dark:bg-amber-950/10'
    : 'text-rose-600 dark:text-rose-450 border-rose-200/50 dark:border-rose-850/30 bg-rose-50/50 dark:bg-rose-950/10';

  // SVG Radial progress calculations
  const progressValue = goal.progressRollup !== undefined ? goal.progressRollup : 0;
  const radius = 18;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius; // Approx 113.1
  const strokeDashoffset = circumference - (progressValue / 100) * circumference;

  const goalIdCode = `#${goal.id.slice(0, 4).toUpperCase()}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-2xl border bg-white dark:bg-[#1f2937] transition-all duration-300 cursor-grab active:cursor-grabbing p-4.5 space-y-3.5 shadow-sm',
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
      <div className="flex items-start gap-4 relative z-10">
        
        {/* Left Side: SVG Circular Telemetry Ring */}
        {goal.progressRollup !== undefined && (
          <div className="shrink-0 flex items-center justify-center relative h-12 w-12 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-full select-none" data-no-click>
            <svg className="w-12 h-12 transform -rotate-90">
              {/* Circle track underlay */}
              <circle
                className="text-slate-100 dark:text-slate-800 stroke-current"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx="24"
                cy="24"
              />
              {/* Circle active progress path */}
              <circle
                className="text-indigo-500 dark:text-indigo-400 stroke-current transition-all duration-700 ease-out"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx="24"
                cy="24"
              />
            </svg>
            {/* Centered Rate display */}
            <span className="absolute text-[10px] font-bold text-slate-850 dark:text-slate-100 font-sans">
              {progressValue}%
            </span>
          </div>
        )}

        {/* Right Side: Title details and context actions */}
        <div className="flex-1 min-w-0 space-y-2.5 pl-0.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="font-sans text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full select-none w-fit tracking-tight">
                {goalIdCode}
              </span>
              
              <h4 className="text-[13.5px] font-sans font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate tracking-tight leading-snug">
                {goal.title}
              </h4>
            </div>

            <div data-no-click className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 rounded-xl p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all outline-none min-h-7 min-w-7 flex items-center justify-center cursor-pointer border border-transparent">
                  <MoreHorizontal className="h-4.5 w-4.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs shadow-xl rounded-xl font-sans">
                  <DropdownMenuItem onClick={onClick} className="font-semibold cursor-pointer py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Open details</DropdownMenuItem>
                  {goal.status !== 'active' && (
                    <DropdownMenuItem onClick={() => onStatusChange('active')} className="font-semibold cursor-pointer py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Set active</DropdownMenuItem>
                  )}
                  {goal.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => onStatusChange('completed')} className="font-semibold cursor-pointer py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Set completed</DropdownMenuItem>
                  )}
                  {goal.status !== 'cancelled' && (
                    <DropdownMenuItem onClick={() => onStatusChange('cancelled')} className="font-semibold cursor-pointer py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Set cancelled</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDelete} className="text-rose-500 focus:text-rose-500 font-semibold cursor-pointer py-1.5 hover:bg-rose-550 dark:hover:bg-rose-950/20 rounded-lg">Remove goal</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans pl-0.5">
              {goal.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pl-0.5">
            <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md select-none', horizonClass)}>
              {horizonLabel}
            </span>
            {recurrenceLabel && (
              <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md select-none', recurrenceClass)}>
                {recurrenceLabel}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Target date stamp at bottom */}
      {due && (
        <div className="flex items-center justify-end pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 relative z-10 select-none">
          <span className={cn(
            'flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-md transition-all duration-300 font-sans',
            isOverdue 
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-450' 
              : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
          )}>
            <Calendar className="h-3.5 w-3.5 text-slate-450 dark:text-slate-500 shrink-0 mr-0.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  );
}
