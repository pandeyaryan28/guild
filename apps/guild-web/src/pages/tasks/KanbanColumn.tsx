import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
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
}

export function KanbanColumn({ status, tasks, labels, memberMap, onTaskClick, onAddTask, onDeleteTask }: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-[280px] flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.dot }} />
          <span className="text-xs font-semibold text-foreground">{config.label}</span>
          <span className="text-[10px] text-muted-foreground bg-bg-tertiary rounded px-1.5 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded p-1 transition-colors"
          title="Add task"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[60px] space-y-2 rounded-xl p-2 transition-all duration-200',
          isOver
            ? 'bg-primary/5 ring-1 ring-primary/30'
            : 'bg-bg-primary',
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
          <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border-default">
            <span className="text-[11px] text-text-muted">Drop here</span>
          </div>
        )}
      </div>

      {/* Add task bottom */}
      <button
        onClick={onAddTask}
        className="mt-2 flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded-lg transition-colors w-full"
      >
        <Plus className="h-3 w-3" />
        Add task
      </button>
    </div>
  );
}
