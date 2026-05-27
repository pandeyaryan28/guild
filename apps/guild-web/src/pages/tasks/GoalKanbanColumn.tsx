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

  const statusLabel = config?.label || status;
  const statusColor = config?.dot || '#52525b';

  return (
    <div className="flex flex-col w-[300px] flex-shrink-0 h-full max-h-full overflow-hidden select-none pb-2">
      {/* Column Header Pane */}
      <div className="flex items-center justify-between mb-3.5 px-3 py-2 rounded-xl bg-white/[0.02] dark:bg-white/[0.002] border border-white/5 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          {/* Glowing Status Dot */}
          <div 
            className="h-2 w-2 rounded-full transition-all duration-350" 
            style={{ 
              backgroundColor: statusColor, 
              boxShadow: `0 0 10px ${statusColor}` 
            }} 
          />
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{statusLabel}</span>
          
          {/* Count Badge */}
          <span className="text-[9px] font-bold text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/5 font-mono select-none">
            {goals.length}
          </span>
        </div>
        
        {status === 'active' && onAddGoal && (
          <div data-no-click>
            <button
              onClick={onAddGoal}
              className="text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 rounded-xl p-1.5 transition-all duration-200 cursor-pointer min-h-8 min-w-8 flex items-center justify-center border border-transparent hover:border-white/10"
              title="Create new active goal"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[140px] space-y-2.5 rounded-2xl p-3 transition-all duration-300 overflow-y-auto custom-scrollbar bg-white/[0.01] dark:bg-black/[0.06] border border-white/5',
          isOver
            ? 'bg-violet-500/[0.04] border-violet-500/30 ring-1 ring-violet-500/25 shadow-[inset_0_0_12px_rgba(167,139,250,0.15)] scale-[0.99]'
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
          <div className="flex flex-col items-center justify-center h-32 rounded-2xl border border-dashed border-white/10 bg-white/[0.005] select-none text-center p-4">
            <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-wider font-bold">Drop Goals Here</span>
          </div>
        )}
      </div>

      {/* Add goal bottom trigger */}
      {status === 'active' && onAddGoal && (
        <button
          onClick={onAddGoal}
          className="mt-2.5 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-white/[0.015] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300 w-full shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer min-h-10"
        >
          <Plus className="h-3.5 w-3.5" />
          Create active goal
        </button>
      )}
    </div>
  );
}
