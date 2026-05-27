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
    <div className="flex flex-col w-[295px] flex-shrink-0 h-full max-h-full overflow-hidden select-none pb-2 font-mono">
      {/* Holographic Cyber-Chamber Header */}
      <div className="flex items-center justify-between mb-3.5 px-3.5 py-2.5 rounded border border-white/10 bg-white/[0.02] dark:bg-black/30 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          {/* Neon telemetry halo dot */}
          <div 
            className="h-1.5 w-1.5 rounded-full transition-all duration-350" 
            style={{ 
              backgroundColor: statusColor, 
              boxShadow: `0 0 10px ${statusColor}` 
            }} 
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground select-none">
            {statusLabel}
          </span>
          
          {/* Telemetry Count */}
          <span className="text-[8.5px] font-bold text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded border border-white/5 font-mono select-none">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 relative z-10" data-no-click>
          <button
            onClick={onAddTask}
            className="text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/10 rounded p-1.5 transition-all duration-200 cursor-pointer min-h-7 min-w-7 flex items-center justify-center"
            title="Stage directive"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/10 rounded p-1.5 transition-all duration-200 cursor-pointer min-h-7 min-w-7 flex items-center justify-center"
              title="Lock Chamber Shutter"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cyber Droppable Chamber Pane */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[140px] space-y-2.5 rounded-xl p-3 transition-all duration-300 overflow-y-auto custom-scrollbar bg-white/[0.005] dark:bg-black/[0.1] border border-white/5 relative',
          isOver
            ? 'bg-violet-500/[0.02] border-violet-500/35 border-dashed ring-1 ring-violet-500/20 shadow-[inset_0_0_12px_rgba(167,139,250,0.12)] scale-[0.99]'
            : '',
        )}
      >
        {/* Blueprint mesh background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.004)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />

        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5 relative z-10">
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
          <div className="flex flex-col items-center justify-center h-32 rounded border border-dashed border-white/10 bg-white/[0.002] select-none text-center p-4 relative z-10">
            <span className="text-[8.5px] text-muted-foreground/50 font-black uppercase tracking-[0.2em] font-mono">CHAMBER_EMPTY</span>
          </div>
        )}
      </div>

      {/* Custom Severity bracket bottom button */}
      <button
        onClick={onAddTask}
        className="mt-3 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[9.5px] font-black uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300 w-full shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer min-h-9 select-none"
      >
        <span>[+ Add directive]</span>
      </button>
    </div>
  );
}
