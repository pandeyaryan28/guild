import * as React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { type Task, type ActorInfo } from '../../lib/tasks';
import { CreateTaskPopup } from './CreateTaskPopup';
import { useOrgMembers } from '../../hooks/useChat';

export type TaskGroupType = 'past' | 'today' | 'tomorrow' | 'upcoming' | 'nodate' | 'completed';

interface TaskGroup {
  id: TaskGroupType;
  label: string;
  tasks: Task[];
}

interface TaskIslandProps {
  title?: string;
  tasks: Task[];
  loading?: boolean;
  orgId: string;
  actor: ActorInfo;
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  emptyMessage?: string;
  defaultProjectId?: string | null;
  defaultGoalId?: string | null;
  showCompleted?: boolean;
}

export function TaskIsland({
  title,
  tasks,
  loading,
  orgId,
  actor,
  selectedTask,
  onSelectTask,
  onDeleteTask,
  emptyMessage = 'No tasks yet',
  defaultProjectId = null,
  defaultGoalId = null,
  showCompleted = false,
}: TaskIslandProps) {
  const members = useOrgMembers(orgId);
  const [popupOpen, setPopupOpen] = React.useState(false);

  // Build member map uid → display name
  const memberMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => { map[m.uid] = m.fullName || m.username || m.uid; });
    return map;
  }, [members]);

  const rootTasks = tasks.filter((t) => !t.parentTaskId);
  const subtaskMap = React.useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.filter((t) => t.parentTaskId).forEach((t) => {
      const key = t.parentTaskId!;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const groups = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const dayAfterTomorrowStart = new Date(todayStart.getTime() + 2 * 86400000);

    const past: Task[] = [];
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const upcoming: Task[] = [];
    const nodate: Task[] = [];
    const completed: Task[] = [];

    rootTasks.forEach((t) => {
      if (t.status === 'done') {
        completed.push(t);
        return;
      }

      if (!t.dueDate) {
        nodate.push(t);
        return;
      }

      const due = t.dueDate.toDate?.();
      if (!due) {
        nodate.push(t);
        return;
      }

      if (due < todayStart) {
        past.push(t);
      } else if (due >= todayStart && due < tomorrowStart) {
        today.push(t);
      } else if (due >= tomorrowStart && due < dayAfterTomorrowStart) {
        tomorrow.push(t);
      } else {
        upcoming.push(t);
      }
    });

    const result: TaskGroup[] = [];

    if (showCompleted) {
      if (completed.length > 0) {
        result.push({ id: 'completed', label: 'Completed', tasks: completed });
      }
      return result;
    }

    if (past.length > 0) result.push({ id: 'past', label: 'Past', tasks: past });
    if (today.length > 0) result.push({ id: 'today', label: 'Today', tasks: today });
    if (tomorrow.length > 0) result.push({ id: 'tomorrow', label: 'Tomorrow', tasks: tomorrow });
    if (upcoming.length > 0) result.push({ id: 'upcoming', label: 'Upcoming', tasks: upcoming });
    if (nodate.length > 0) result.push({ id: 'nodate', label: 'No date', tasks: nodate });

    return result;
  }, [rootTasks, showCompleted]);

  const groupAccentMap: Record<TaskGroupType, string> = {
    past: 'text-red-400',
    today: 'text-primary',
    tomorrow: 'text-orange-400',
    upcoming: 'text-violet-400',
    nodate: 'text-text-muted',
    completed: 'text-emerald-400',
  };

  return (
    <div className="w-full flex justify-center pt-8 pb-32 px-4 overflow-y-auto h-full">
      <div className="w-full max-w-[800px] bg-bg-primary border border-border-default rounded-[24px] shadow-sm p-6 sm:p-8 flex flex-col h-max min-h-[300px]">
        {/* Title */}
        {title && (
          <div className="mb-6 px-2">
            <h2 className="text-xl font-medium text-foreground tracking-tight">{title}</h2>
          </div>
        )}

        {/* Add Task Button */}
        {!showCompleted && (
          <div className="mb-6">
            <button
              onClick={() => setPopupOpen(true)}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left',
                'border border-dashed border-border-default',
                'hover:border-primary/40 hover:bg-primary/5',
              )}
            >
              <div className="h-5 w-5 rounded-full border-2 border-dashed border-current flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Plus className="h-3 w-3" />
              </div>
              <span className="text-sm font-medium text-text-muted group-hover:text-primary transition-colors">
                Add a task
              </span>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading tasks…</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && groups.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="text-5xl opacity-15 select-none">✓</div>
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              {!showCompleted && (
                <button
                  onClick={() => setPopupOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add your first task
                </button>
              )}
            </div>
          </div>
        )}

        {/* Task Groups */}
        {!loading && groups.length > 0 && (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <h3 className={cn('text-[11px] font-semibold uppercase tracking-wider', groupAccentMap[group.id])}>
                    {group.label}
                  </h3>
                  <div className="flex-1 h-px bg-border-default opacity-40" />
                  <span className="text-[10px] text-text-muted">{group.tasks.length}</span>
                </div>
                <div className="space-y-0.5">
                  {group.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all',
                        selectedTask?.id === task.id
                          ? 'bg-primary/5 border-primary/20'
                          : 'border-transparent hover:bg-bg-secondary/60 hover:border-border-default'
                      )}
                    >
                      <div className="h-4 w-4 rounded-full border-2 border-border-default flex items-center justify-center shrink-0 flex-none" />
                      <span className="text-sm font-medium text-foreground truncate flex-1">{task.title}</span>
                      {onDeleteTask && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-400 transition-all"
                        >
                          <Plus className="h-3 w-3 rotate-45" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Popup */}
      <CreateTaskPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultStatus="todo"
        defaultProjectId={defaultProjectId}
        defaultGoalId={defaultGoalId}
      />
    </div>
  );
}
