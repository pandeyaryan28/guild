import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Task, type TaskLabel, STATUS_CONFIG, type TaskStatus } from '../../lib/tasks';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  labels: TaskLabel[];
  memberMap: Map<string, { fullName: string; username: string }>;
  onTaskClick: (task: Task) => void;
  onAddTask: () => void;
  onDeleteTask: (taskId: string) => void;
  onCollapse?: () => void;
}

export function KanbanColumn({ status, tasks, labels, memberMap, onTaskClick, onAddTask, onDeleteTask, onCollapse }: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-[280px] flex-shrink-0 h-full max-h-full overflow-hidden select-none">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3.5 px-2 py-1.5 rounded-xl bg-white/[0.02] dark:bg-white/[0.002] border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ backgroundColor: config.dot, color: config.dot }} />
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{config.label}</span>
          <span className="text-[9px] font-bold text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/5 font-mono">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1 relative z-10" data-no-click>
          <button
            onClick={onAddTask}
            className="text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/5 rounded-lg p-1 transition-all"
            title="Add task"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/5 rounded-lg p-1 transition-all"
              title="Collapse column"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] space-y-2 rounded-2xl p-2.5 transition-all duration-300 overflow-y-auto custom-scrollbar bg-white/[0.01] dark:bg-black/[0.08] border border-white/5',
          isOver
            ? 'bg-violet-500/[0.04] ring-1 ring-violet-500/25 border-violet-500/20 shadow-inner'
            : '',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              labels={labels}
              memberMap={memberMap}
              onClick={() => onTaskClick(task)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center h-28 rounded-2xl border border-dashed border-white/10 bg-white/[0.005]">
            <span className="text-[10px] text-muted-foreground font-semibold italic tracking-wide">Drop Tasks Here</span>
          </div>
        )}
      </div>

      {/* Add task bottom */}
      <button
        onClick={onAddTask}
        className="mt-2.5 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-white/[0.015] hover:bg-white/[0.03] border border-white/5 rounded-xl transition-all w-full shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    </div>
  );
}
