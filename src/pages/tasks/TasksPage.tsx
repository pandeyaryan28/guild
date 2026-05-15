import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTasks, useTaskLabels } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { useOrgMembers } from '../../hooks/useChat';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailPanel } from './TaskDetailPanel';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { type Task, type TaskStatus, type ActorInfo } from '../../lib/tasks';

export function TasksPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { tasks, columns, loading } = useTasks(orgId);
  const labels = useTaskLabels(orgId);
  const members = useOrgMembers(orgId);

  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createStatus, setCreateStatus] = React.useState<TaskStatus>('todo');

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Unknown',
  }), [user, userProfile]);

  const memberMap = React.useMemo(() => {
    const m = new Map<string, { fullName: string; username: string }>();
    members.forEach((mem) => m.set(mem.uid, { fullName: mem.fullName || '', username: mem.username || '' }));
    return m;
  }, [members]);

  const handleTaskClick = (task: Task) => {
    setSearchParams({ task: task.id });
  };

  const handleClosePanel = () => {
    setSearchParams({});
  };

  const handleAddTask = (status: TaskStatus) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No organization found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <CheckSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Tasks</h1>
            <p className="text-[11px] text-muted-foreground">
              {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => { setCreateStatus('todo'); setCreateOpen(true); }}
          className="h-8 gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          New Task
        </Button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-hidden p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-[280px] space-y-2">
                  <div className="h-5 w-24 rounded bg-muted/40 animate-pulse" />
                  <div className="space-y-2">
                    {Array.from({ length: i + 1 }).map((_, j) => (
                      <div key={j} className="h-20 rounded-xl bg-muted/20 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <KanbanBoard
            columns={columns}
            allTasks={tasks}
            labels={labels}
            memberMap={memberMap}
            orgId={orgId}
            actor={actor}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        )}
      </div>

      {/* Task Detail Panel */}
      {openTask && (
        <TaskDetailPanel
          task={openTask}
          onClose={handleClosePanel}
          orgId={orgId}
          actor={actor}
          authorUsername={userProfile?.username || user?.displayName || 'user'}
        />
      )}

      {/* Create Modal */}
      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
        defaultStatus={createStatus}
        actor={actor}
        labels={labels}
      />
    </div>
  );
}
