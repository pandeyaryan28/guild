import * as React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { type Task, type ActorInfo } from '../../lib/tasks';
import { TaskListRow } from '../../pages/tasks/TaskListRow';
import { InlineTaskInput } from '../../pages/tasks/InlineTaskInput';
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
  const [inlineAddActive, setInlineAddActive] = React.useState(false);

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

  return (
    <div className="w-full flex justify-center pt-8 pb-32 px-4 overflow-y-auto h-full">
      <div className="w-full max-w-[800px] bg-bg-primary border border-border-default rounded-[24px] shadow-sm p-6 sm:p-8 flex flex-col h-max min-h-[300px]">
        {/* Title */}
        {title && (
          <div className="mb-6 px-2">
            <h2 className="text-xl font-medium text-foreground tracking-tight">{title}</h2>
          </div>
        )}

        {/* Add Task Trigger */}
        {!showCompleted && (
          <div className="mb-6">
            {!inlineAddActive ? (
              <button
                onClick={() => setInlineAddActive(true)}
                className="flex items-center gap-3 px-2 py-2 text-primary hover:bg-primary/5 rounded-xl transition-colors w-full text-left"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Add a task</span>
              </button>
            ) : (
              <div className="px-2">
                <InlineTaskInput
                  orgId={orgId}
                  actor={actor}
                  defaultProjectId={defaultProjectId}
                  defaultGoalId={defaultGoalId}
                  defaultStatus="todo"
                  onCreated={() => {}}
                  onCancel={() => setInlineAddActive(false)}
                  autoFocus
                />
              </div>
            )}
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
            <div className="text-center space-y-2">
              <div className="text-4xl opacity-20 select-none">✓</div>
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          </div>
        )}

        {/* Task Groups */}
        {!loading && groups.length > 0 && (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.id} className="space-y-3">
                <h3 className="text-xs font-semibold text-text-muted px-2">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.tasks.map((task) => (
                    <TaskListRow
                      key={task.id}
                      task={task}
                      orgId={orgId}
                      actor={actor}
                      subtasks={subtaskMap[task.id] ?? []}
                      isSelected={selectedTask?.id === task.id}
                      onSelect={onSelectTask}
                      onDelete={onDeleteTask}
                      memberMap={memberMap}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
