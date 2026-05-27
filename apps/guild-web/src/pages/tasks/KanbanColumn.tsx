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

// Per-status column style
const COLUMN_STYLES: Record<TaskStatus, { accent: string; headerBg: string; dotColor: string }> = {
  todo:        { accent: '#71717a', headerBg: 'bg-slate-50 dark:bg-slate-900/40',  dotColor: '#71717a' },
  in_progress: { accent: '#6366f1', headerBg: 'bg-indigo-50/50 dark:bg-indigo-950/10', dotColor: '#6366f1' },
  review:      { accent: '#f59e0b', headerBg: 'bg-amber-50/50 dark:bg-amber-950/10', dotColor: '#f59e0b' },
  done:        { accent: '#10b981', headerBg: 'bg-emerald-50/50 dark:bg-emerald-950/10', dotColor: '#10b981' },
};

export function KanbanColumn({ status, tasks, labels, memberMap, onTaskClick, onAddTask, onDeleteTask, onCollapse }: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];
  const colStyle = COLUMN_STYLES[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-[290px] flex-shrink-0 h-full max-h-full overflow-hidden gap-3">
      {/* Column header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-xl border',
        colStyle.headerBg,
        'border-slate-200/60 dark:border-slate-800/60'
      )}>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: colStyle.dotColor }}
          />
          <span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
            {config?.label || status}
          </span>
          <span
            className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
            style={{
              color: colStyle.accent,
              backgroundColor: `${colStyle.accent}15`,
            }}
          >
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1" data-no-click>
          <button
            onClick={onAddTask}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Add task"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
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
          'flex-1 min-h-[120px] rounded-xl p-2.5 space-y-2.5 overflow-y-auto scrollbar-thin transition-all duration-200',
          'bg-slate-50/60 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50',
          isOver && 'bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-300/40 dark:border-indigo-700/30 border-dashed'
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5">
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
          </div>
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center h-24 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[11px] font-medium text-slate-300 dark:text-slate-700 uppercase tracking-wider">Empty</span>
          </div>
        )}
      </div>

      {/* Add task button */}
      <button
        onClick={onAddTask}
        className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 transition-all duration-200 cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    </div>
  );
}
