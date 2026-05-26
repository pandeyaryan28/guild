import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Loader2, Trello, LayoutList, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useTasks, useTaskLabels } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';
import { TaskDetailPanel } from './TaskDetailPanel';
import { KanbanBoard } from './KanbanBoard';
import { CreateTaskPopup } from '../../components/tasks/CreateTaskPopup';
import { TaskListRow } from './TaskListRow';
import { deleteTask, type Task, type TaskStatus, STATUS_CONFIG } from '../../lib/tasks';

export function TasksPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'board'>(() => {
    return (localStorage.getItem('guild_tasks_view_mode') as 'list' | 'board') || 'list';
  });
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = React.useState<TaskStatus>('todo');

  // Load all tasks, labels, and members
  const { tasks, columns, loading } = useTasks(orgId);
  const labels = useTaskLabels(orgId);
  const members = useOrgMembers(orgId);

  const actor = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Unknown',
  }), [user, userProfile]);
  
  const actorName = userProfile?.fullName || user?.displayName || user?.email || 'Me';

  // Member map for TaskCard and TaskListRow
  const memberMap = React.useMemo(() => {
    const map = new Map<string, { fullName: string; username: string }>();
    members.forEach((m) => {
      map.set(m.uid, {
        fullName: m.fullName || m.uid,
        username: m.username || m.uid,
      });
    });
    return map;
  }, [members]);

  const memberRecordMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.uid] = m.fullName || m.username || m.uid;
    });
    return map;
  }, [members]);

  // Root level tasks and subtask map
  const rootTasks = React.useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);
  
  const subtaskMap = React.useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.filter((t) => t.parentTaskId).forEach((t) => {
      const key = t.parentTaskId!;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  if (!user || !orgId) return <Navigate to="/login" replace />;

  const activeTasksCount = rootTasks.filter((t) => t.status !== 'done').length;

  const handleDeleteTask = async (task: Task) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(task.id);
    if (selectedTask?.id === task.id) {
      setSelectedTask(null);
    }
  };

  const handleToggleTaskSelect = (task: Task) => {
    setSelectedTask((prev) => (prev?.id === task.id ? null : task));
  };

  const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
            <CheckSquare className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Tasks</h1>
            <p className="text-[11px] text-muted-foreground">
              {loading ? 'Loading…' : `${activeTasksCount} active task${activeTasksCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-accent/20 border border-border-default/45 p-0.5 rounded-lg mr-1 shrink-0">
            <button
              onClick={() => {
                localStorage.setItem('guild_tasks_view_mode', 'list');
                setViewMode('list');
              }}
              className={cn(
                'p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer',
                viewMode === 'list'
                  ? 'bg-bg-primary text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="List View"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                localStorage.setItem('guild_tasks_view_mode', 'board');
                setViewMode('board');
              }}
              className={cn(
                'p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer',
                viewMode === 'board'
                  ? 'bg-bg-primary text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Board View"
            >
              <Trello className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => {
              setCreateTaskDefaultStatus('todo');
              setCreateTaskOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm border-0 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto p-6 relative">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <CheckSquare className="h-6 w-6 text-violet-400/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No tasks yet</p>
              <p className="text-[11px] text-muted-foreground">Create a task to get started.</p>
            </div>
            <button
              onClick={() => {
                setCreateTaskDefaultStatus('todo');
                setCreateTaskOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-650 hover:bg-violet-750 text-white px-4 py-2 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm border-0 h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-8">
            {statuses.map((status) => {
              const statusTasks = rootTasks.filter((t) => t.status === status);
              if (statusTasks.length === 0) return null;
              const statusCfg = STATUS_CONFIG[status];
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusCfg.dot }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {statusCfg.label}
                    </span>
                    <span className="text-[9px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded font-bold">
                      {statusTasks.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {statusTasks.map((task) => (
                      <TaskListRow
                        key={task.id}
                        task={task}
                        orgId={orgId}
                        actor={actor}
                        subtasks={subtaskMap[task.id] ?? []}
                        isSelected={selectedTask?.id === task.id}
                        onSelect={handleToggleTaskSelect}
                        onDelete={handleDeleteTask}
                        memberMap={memberRecordMap}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <KanbanBoard
            columns={columns}
            allTasks={rootTasks}
            labels={labels}
            memberMap={memberMap}
            orgId={orgId}
            actor={actor}
            onTaskClick={handleToggleTaskSelect}
            onAddTask={(status) => {
              setCreateTaskDefaultStatus(status);
              setCreateTaskOpen(true);
            }}
          />
        )}
      </div>

      {/* Task Creation Popup */}
      <CreateTaskPopup
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultStatus={createTaskDefaultStatus}
      />

      {/* Task Detail Sidebar Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          orgId={orgId}
          actor={actor}
          authorUsername={actorName}
        />
      )}
    </div>
  );
}
