import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FolderOpen, Target, LayoutList, Sun, CalendarDays, CheckCircle2, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { TasksLayout } from './TasksLayout';
import { TasksNav, type NavView } from './TasksNav';
import { TaskListView } from './TaskListView';
import { InlineTaskInput } from './InlineTaskInput';
import { TaskDetailPanel } from './TaskDetailPanel';
import type { Task } from '../../lib/tasks';

function getViewTitle(view: NavView, projects: { id: string; name: string }[], goals: { id: string; title: string }[]): { title: string; subtitle?: string } {
  switch (view.type) {
    case 'all': return { title: 'My Tasks', subtitle: 'All your tasks' };
    case 'today': return { title: 'Today', subtitle: 'Due today' };
    case 'upcoming': return { title: 'Upcoming', subtitle: 'Due in the next 7 days' };
    case 'completed': return { title: 'Completed', subtitle: 'Done tasks' };
    case 'project': {
      const p = projects.find((x) => x.id === view.id);
      return { title: p?.name ?? 'Project', subtitle: 'Project tasks' };
    }
    case 'goal': {
      const g = goals.find((x) => x.id === view.id);
      return { title: g?.title ?? 'Goal', subtitle: 'Goal tasks' };
    }
  }
}

function filterTasksForView(tasks: Task[], view: NavView): Task[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const upcomingEnd = new Date(todayStart.getTime() + 7 * 86400000);

  switch (view.type) {
    case 'all':
      return tasks.filter((t) => t.status !== 'done');
    case 'today': {
      return tasks.filter((t) => {
        if (t.status === 'done') return false;
        const due = t.dueDate?.toDate?.();
        return due && due >= todayStart && due < todayEnd;
      });
    }
    case 'upcoming': {
      return tasks.filter((t) => {
        if (t.status === 'done') return false;
        const due = t.dueDate?.toDate?.();
        return due && due >= todayEnd && due < upcomingEnd;
      });
    }
    case 'completed':
      return tasks.filter((t) => t.status === 'done');
    case 'project':
      return tasks.filter((t) => t.projectId === view.id);
    case 'goal':
      return tasks.filter((t) => t.goalId === view.id);
  }
}

function ViewIcon({ view }: { view: NavView }) {
  const cls = 'h-4 w-4 text-muted-foreground';
  switch (view.type) {
    case 'all': return <LayoutList className={cls} />;
    case 'today': return <Sun className={cls} />;
    case 'upcoming': return <CalendarDays className={cls} />;
    case 'completed': return <CheckCircle2 className={cls} />;
    case 'project': return <FolderOpen className={cls} />;
    case 'goal': return <Target className={cls} />;
  }
}

export function TasksPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [activeView, setActiveView] = React.useState<NavView>({ type: 'all' });
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  const { projects } = useProjects(orgId);
  const { goals } = useGoals(orgId);

  // Always load all org tasks (the hook is inexpensive and we filter client-side)
  const { tasks, loading } = useTasks(orgId);

  const actor = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Unknown',
  }), [user, userProfile]);
  const actorName = userProfile?.fullName || user?.displayName || user?.email || 'Me';

  if (!user || !orgId) return <Navigate to="/login" replace />;

  const viewTasks = filterTasksForView(tasks, activeView);
  const { title, subtitle } = getViewTitle(activeView, projects, goals);

  // Scope defaults for InlineTaskInput
  const defaultProjectId = activeView.type === 'project' ? activeView.id : null;
  const defaultGoalId = activeView.type === 'goal' ? activeView.id : null;

  const handleViewChange = (view: NavView) => {
    setActiveView(view);
    setSelectedTask(null);
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask((prev) => (prev?.id === task.id ? null : task));
  };

  return (
    <TasksLayout
      panelOpen={!!selectedTask}
      nav={
        <TasksNav
          orgId={orgId}
          actor={actor}
          activeView={activeView}
          onViewChange={handleViewChange}
          actorName={actorName}
        />
      }
      main={
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-border-default">
            <ViewIcon view={activeView} />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
              )}
            </div>
            {/* Task count */}
            {!loading && (
              <span className={cn(
                'flex-shrink-0 text-xs font-medium rounded-full px-2.5 py-1',
                'bg-muted text-muted-foreground',
              )}>
                {viewTasks.filter((t) => !t.parentTaskId).length}
              </span>
            )}
          </div>

          {/* Task Island Container */}
          <div className="flex-1 min-h-0 bg-accent/10 relative">
            <TaskIsland
              title={title}
              tasks={viewTasks}
              loading={loading}
              orgId={orgId}
              actor={actor}
              selectedTask={selectedTask}
              onSelectTask={handleSelectTask}
              defaultProjectId={defaultProjectId}
              defaultGoalId={defaultGoalId}
              showCompleted={activeView.type === 'completed'}
              emptyMessage={
                activeView.type === 'today' ? 'Nothing due today 🎉' :
                activeView.type === 'upcoming' ? 'No upcoming tasks' :
                activeView.type === 'completed' ? 'No completed tasks yet' :
                'No tasks yet'
              }
            />
          </div>
        </div>
      }
      panel={
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          orgId={orgId}
          actor={actor}
          authorUsername={actorName}
        />
      }
    />
  );
}
