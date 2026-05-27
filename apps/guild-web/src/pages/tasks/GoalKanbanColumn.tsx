import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Goal } from '../../lib/goals';
import { GoalKanbanCard } from './GoalKanbanCard';

const STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-indigo-500', dot: '#6366f1' },
  completed: { label: 'Completed', color: 'text-emerald-500', dot: '#10b981' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500',    dot: '#64748b' },
};

interface GoalKanbanColumnProps {
  status: Goal['status'];
  goals: Goal[];
  onGoalClick: (goal: Goal) => void;
  onAddGoal?: () => void;
  onDeleteGoal: (goalId: string) => void;
  onStatusChange: (goalId: string, nextStatus: Goal['status']) => void;
}

export function GoalKanbanColumn({ status, goals, onGoalClick, onAddGoal, onDeleteGoal, onStatusChange }: GoalKanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const statusLabel = config?.label || status;
  const statusColor = config?.dot || '#64748b';

  return (
    <div className="flex flex-col w-[300px] flex-shrink-0 h-full max-h-full overflow-hidden select-none pb-2">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/85 bg-white dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          {/* Status tracking dot */}
          <div 
            className="h-2 w-2 rounded-full" 
            style={{ backgroundColor: statusColor }} 
          />
          <span className="text-[13px] font-bold tracking-tight text-slate-800 dark:text-slate-200 select-none uppercase">
            {statusLabel}
          </span>
          
          {/* Goals count badge */}
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-200/40 dark:border-slate-700/20 select-none">
            {goals.length}
          </span>
        </div>
        
        {status === 'active' && onAddGoal && (
          <div data-no-click>
            <button
              onClick={onAddGoal}
              className="text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent rounded-xl p-1.5 transition-all duration-200 cursor-pointer min-h-8 min-w-8 flex items-center justify-center"
              title="Add Goal"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Goal drop area container */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[140px] space-y-3 rounded-2xl p-3.5 transition-all duration-300 overflow-y-auto scrollbar-thin bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 relative',
          isOver
            ? 'bg-indigo-500/[0.015] border-indigo-500/35 border-dashed shadow-[inset_0_0_12px_rgba(99,102,241,0.06)]'
            : '',
        )}
      >
        <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 relative z-10">
            {goals.map((goal) => (
              <GoalKanbanCard
                key={goal.id}
                goal={goal}
                onClick={() => onGoalClick(goal)}
                onDelete={() => onDeleteGoal(goal.id)}
                onStatusChange={(nextStatus) => onStatusChange(goal.id, nextStatus)}
              />
            ))}
          </div>
        </SortableContext>

        {goals.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center h-32 rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 bg-transparent select-none text-center p-4 relative z-10">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No goals here</span>
          </div>
        )}
      </div>

      {/* Bottom add button */}
      {status === 'active' && onAddGoal && (
        <button
          onClick={onAddGoal}
          className="mt-3.5 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs sm:text-[13px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-slate-350 dark:hover:border-slate-700 shadow-sm transition-all duration-300 w-full hover:scale-[1.01] active:scale-[0.99] cursor-pointer min-h-9 select-none"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Add Goal</span>
        </button>
      )}
    </div>
  );
}
