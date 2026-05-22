import * as React from 'react';
import { CheckSquare, Square, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { moveTask, PRIORITY_CONFIG, STATUS_CONFIG } from '../../lib/tasks';
import type { Task } from '../../lib/tasks';

interface Props {
  tasks: Task[];
  title: string;
  onSelectTask: (task: Task) => void;
  orgId: string;
}

export function ReportTasksList({ tasks, title, onSelectTask, orgId }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No tasks found matching this criteria.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-default bg-card overflow-hidden shadow-sm">
      <div className="border-b border-border-default bg-surface/50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            {title} ({tasks.length})
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground">Click task row to view details</span>
      </div>
      <div className="divide-y divide-border-default max-h-[350px] overflow-y-auto custom-scrollbar">
        {tasks.map((task) => {
          const isOverdue = task.dueDate && task.status !== 'done' && task.dueDate.toDate() < new Date();
          const priority = PRIORITY_CONFIG[task.priority];
          const status = STATUS_CONFIG[task.status];

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="flex items-center justify-between px-5 py-3 hover:bg-surface/30 cursor-pointer transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Status Toggle Button */}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newStatus = task.status === 'done' ? 'todo' : 'done';
                    const actor = { uid: task.assigneeIds[0] || 'anonymous', name: 'User' };
                    await moveTask(
                      task.id,
                      orgId,
                      newStatus,
                      task.orderIndex !== undefined ? task.orderIndex : 1000,
                      task.status,
                      actor
                    );
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0 focus:outline-none"
                >
                  {task.status === 'done' ? (
                    <CheckSquare className="h-4.5 w-4.5 text-emerald-400" />
                  ) : (
                    <Square className="h-4.5 w-4.5" />
                  )}
                </button>

                <span className={cn(
                  "text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors",
                  task.status === 'done' && "line-through text-muted-foreground/70"
                )}>
                  {task.title}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {/* Priority Badge */}
                {task.priority !== 'none' && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: `${priority.color}15`,
                      borderColor: `${priority.color}30`,
                      color: priority.color,
                    }}
                  >
                    {priority.label}
                  </span>
                )}

                {/* Due Date Label */}
                {task.dueDate && (
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 bg-surface ring-1 ring-border-default",
                    isOverdue ? "text-red-400 ring-red-500/20 bg-red-500/5 font-semibold animate-pulse" : "text-muted-foreground"
                  )}>
                    <Clock className="h-3 w-3" />
                    {format(task.dueDate.toDate(), 'MMM d')}
                  </span>
                )}

                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/100 group-hover:translate-x-0.5 transition-all duration-150" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
