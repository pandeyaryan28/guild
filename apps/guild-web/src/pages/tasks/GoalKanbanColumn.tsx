import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Goal } from '../../lib/goals';
import { GoalKanbanCard } from './GoalKanbanCard';

const STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-violet-400', dot: '#a78bfa' },
  completed: { label: 'Completed', color: 'text-cyan-400', dot: '#22d3ee' },
  cancelled: { label: 'Cancelled', color: 'text-zinc-500',    dot: '#52525b' },
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

  return (
    <div className="flex flex-col w-[290px] flex-shrink-0 h-full max-h-full overflow-hidden select-none">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3.5 px-2 py-1.5 rounded-xl bg-white/[0.02] dark:bg-white/[0.002] border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: config.dot, color: config.dot }} />
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{config.label}</span>
          <span className="text-[9px] font-bold text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/5 font-mono">
            {goals.length}
          </span>
        </div>
        {status === 'active' && onAddGoal && (
          <div data-no-click>
            <button
              onClick={onAddGoal}
              className="text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/5 rounded-lg p-1 transition-all"
              title="Create goal"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] space-y-2 rounded-2xl p-2.5 transition-all duration-300 overflow-y-auto custom-scrollbar bg-white/[0.01] dark:bg-black/[0.08] border border-white/5',
          isOver
            ? 'bg-violet-500/[0.04] ring-1 ring-violet-500/25 border-violet-500/20 shadow-inner'
            : '',
        )}
      >
        <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          {goals.map((goal) => (
            <GoalKanbanCard
              key={goal.id}
              goal={goal}
              onClick={() => onGoalClick(goal)}
              onDelete={() => onDeleteGoal(goal.id)}
              onStatusChange={(nextStatus) => onStatusChange(goal.id, nextStatus)}
            />
          ))}
        </SortableContext>

        {goals.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center h-28 rounded-2xl border border-dashed border-white/10 bg-white/[0.005]">
            <span className="text-[10px] text-muted-foreground font-semibold italic tracking-wide">Drop Goals Here</span>
          </div>
        )}
      </div>

      {/* Add goal bottom */}
      {status === 'active' && onAddGoal && (
        <button
          onClick={onAddGoal}
          className="mt-2.5 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-white/[0.015] hover:bg-white/[0.03] border border-white/5 rounded-xl transition-all w-full shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Create active goal
        </button>
      )}
    </div>
  );
}
