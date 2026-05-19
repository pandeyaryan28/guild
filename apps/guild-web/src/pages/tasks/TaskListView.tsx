import * as React from 'react';
import { cn } from '@/lib/utils';
import { deleteTask, type Task, type ActorInfo } from '../../lib/tasks';
import { TaskListRow } from './TaskListRow';
import { useOrgMembers } from '../../hooks/useChat';

export type GroupBy = 'status' | 'none';

interface TaskListViewProps {
  tasks: Task[];
  loading: boolean;
  orgId: string;
  actor: ActorInfo;
  selectedTask: Task | null;
  onSelectTask: (task: Task) => void;
  groupBy?: GroupBy;
  emptyMessage?: string;
}

const GROUP_ORDER = ['todo', 'in_progress', 'review', 'done'] as const;
const GROUP_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  done: 'Completed',
};

export function TaskListView({
  tasks,
  loading,
  orgId,
  actor,
  selectedTask,
  onSelectTask,
  groupBy = 'status',
  emptyMessage = 'No tasks yet',
}: TaskListViewProps) {
  const members = useOrgMembers(orgId);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set(['done']));

  // Build member map uid → display name
  const memberMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => { map[m.uid] = m.fullName || m.username || m.uid; });
    return map;
  }, [members]);

  // Split top-level tasks vs subtasks
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

  const handleDelete = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await deleteTask(task.id);
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        </div>
      </div>
    );
  }

  if (rootTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="text-4xl opacity-20 select-none">✓</div>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  if (groupBy === 'none') {
    return (
      <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-0.5">
        {rootTasks.map((task) => (
          <TaskListRow
            key={task.id}
            task={task}
            orgId={orgId}
            actor={actor}
            subtasks={subtaskMap[task.id] ?? []}
            isSelected={selectedTask?.id === task.id}
            onSelect={onSelectTask}
            onDelete={handleDelete}
            memberMap={memberMap}
          />
        ))}
      </div>
    );
  }

  // Group by status
  const groups = GROUP_ORDER.map((status) => ({
    key: status,
    label: GROUP_LABELS[status],
    tasks: rootTasks.filter((t) => t.status === status),
  })).filter((g) => g.tasks.length > 0);

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-4">
      {groups.map(({ key, label, tasks: groupTasks }) => {
        const collapsed = collapsedGroups.has(key);
        return (
          <div key={key}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(key)}
              className="flex items-center gap-2 w-full mb-1.5 group"
            >
              <span className={cn(
                'text-xs font-semibold uppercase tracking-wider transition-colors',
                key === 'done' ? 'text-text-muted' : 'text-text-muted',
              )}>
                {label}
              </span>
              <span className="text-[10px] text-text-muted font-medium">
                {groupTasks.length}
              </span>
              <div className="flex-1 h-px bg-border/20" />
              <span className="text-text-muted group-hover:text-text-muted transition-colors">
                {collapsed
                  ? <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12"><path d="M4 5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  : <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12"><path d="M4 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                }
              </span>
            </button>

            {/* Tasks in group */}
            {!collapsed && (
              <div className="space-y-0.5">
                {groupTasks.map((task) => (
                  <TaskListRow
                    key={task.id}
                    task={task}
                    orgId={orgId}
                    actor={actor}
                    subtasks={subtaskMap[task.id] ?? []}
                    isSelected={selectedTask?.id === task.id}
                    onSelect={onSelectTask}
                    onDelete={handleDelete}
                    memberMap={memberMap}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
