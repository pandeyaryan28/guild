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
    <div className="flex flex-col w-[290px] flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.dot }} />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">{config.label}</span>
          <span className="text-[10px] text-muted-foreground bg-bg-tertiary rounded px-1.5 py-0.5 font-medium">
            {goals.length}
          </span>
        </div>
        {status === 'active' && onAddGoal && (
          <button
            onClick={onAddGoal}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded p-1 transition-colors"
            title="Create goal"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] space-y-2 rounded-xl p-2 transition-all duration-200 bg-surface/30 border border-border-default/45',
          isOver
            ? 'bg-violet-500/5 ring-1 ring-violet-500/20 border-violet-500/30'
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
          <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-border-default/60">
            <span className="text-[10px] text-text-muted italic">Drop goals here</span>
          </div>
        )}
      </div>

      {/* Add goal bottom */}
      {status === 'active' && onAddGoal && (
        <button
          onClick={onAddGoal}
          className="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded-lg transition-colors w-full"
        >
          <Plus className="h-3 w-3" />
          Create active goal
        </button>
      )}
    </div>
  );
}
