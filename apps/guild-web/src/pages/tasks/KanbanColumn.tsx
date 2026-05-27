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

  const statusLabel = config?.label || status;
  const statusColor = config?.dot || '#a78bfa';

  return (
    <div className="flex flex-col w-[290px] flex-shrink-0 h-full max-h-full overflow-hidden select-none pb-2">
      {/* Premium Column Header Pane */}
      <div className="flex items-center justify-between mb-3.5 px-3 py-2 rounded-xl bg-white/[0.02] dark:bg-white/[0.002] border border-white/5 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          {/* Glowing Status Dot */}
          <div 
            className="h-2 w-2 rounded-full transition-all duration-300" 
            style={{ 
              backgroundColor: statusColor, 
              boxShadow: `0 0 10px ${statusColor}` 
            }} 
          />
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground">{statusLabel}</span>
          
          {/* Count Badge */}
          <span className="text-[9px] font-bold text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/5 font-mono select-none">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 relative z-10" data-no-click>
          <button
            onClick={onAddTask}
            className="text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 rounded-xl p-1.5 transition-all duration-200 cursor-pointer min-h-8 min-w-8 flex items-center justify-center border border-transparent hover:border-white/10"
            title="Add task to column"
          >
            <Plus className="h-4 w-4" />
          </button>
          
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 rounded-xl p-1.5 transition-all duration-200 cursor-pointer min-h-8 min-w-8 flex items-center justify-center border border-transparent hover:border-white/10"
              title="Collapse completed archive"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Droppable Acrylic Zone Panel */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[140px] space-y-2 rounded-2xl p-3 transition-all duration-300 overflow-y-auto custom-scrollbar bg-white/[0.01] dark:bg-black/[0.06] border border-white/5',
          isOver
            ? 'bg-violet-500/[0.04] border-violet-500/30 ring-1 ring-violet-500/25 shadow-[inset_0_0_12px_rgba(167,139,250,0.15)] scale-[0.99]'
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
          <div className="flex flex-col items-center justify-center h-32 rounded-2xl border border-dashed border-white/10 bg-white/[0.005] select-none text-center p-4">
            <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-wider">Drop Tasks Here</span>
          </div>
        )}
      </div>

      {/* Add Task CTA Button at the Bottom */}
      <button
        onClick={onAddTask}
        className="mt-2.5 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground bg-white/[0.015] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300 w-full shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer min-h-10"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    </div>
  );
}
