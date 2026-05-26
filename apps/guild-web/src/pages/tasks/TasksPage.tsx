import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FolderOpen, Target, LayoutList, Sun, CalendarDays, CheckCircle2, Settings, Send, Eye, Users, Menu, Trello, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTasks, useTaskLabels } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useOrgMembers } from '../../hooks/useChat';
import { useTeams } from '../../hooks/useTeams';
import { TasksLayout } from './TasksLayout';
import { TasksNav, type NavView } from './TasksNav';
import { TaskIsland } from '../../components/tasks/TaskIsland';
import { InlineTaskInput } from './InlineTaskInput';
import { TaskDetailPanel } from './TaskDetailPanel';
import { KanbanBoard } from './KanbanBoard';
import { CreateTaskPopup } from '../../components/tasks/CreateTaskPopup';
import type { Task, TaskStatus } from '../../lib/tasks';

function getViewTitle(view: NavView, projects: { id: string; name: string }[], goals: { id: string; title: string }[]): { title: string; subtitle?: string } {
  switch (view.type) {
    case 'all': return { title: 'My Tasks', subtitle: 'All your tasks' };
    case 'today': return { title: 'Today', subtitle: 'Due today' };
    case 'upcoming': return { title: 'Upcoming', subtitle: 'Due in the next 7 days' };
    case 'completed': return { title: 'Completed', subtitle: 'Done tasks' };
    case 'assigned': return { title: 'Assigned to Others', subtitle: 'Tasks you assigned to others' };
    case 'review': return { title: 'In Review', subtitle: 'Tasks waiting for your review' };
    case 'team': return { title: 'Team Tasks', subtitle: 'Overview of active tasks assigned to your team members' };
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

function filterTasksForView(tasks: Task[], view: NavView, myUid: string, teamMemberIds: string[] = []): Task[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const upcomingEnd = new Date(todayStart.getTime() + 7 * 86400000);

  switch (view.type) {
    case 'all':
      return tasks.filter((t) => t.assigneeIds.includes(myUid) && t.status !== 'done' && t.status !== 'review');
    case 'today': {
      return tasks.filter((t) => {
        if (t.status === 'done' || t.status === 'review') return false;
        if (!t.assigneeIds.includes(myUid)) return false;
        const due = t.dueDate?.toDate?.();
        return due && due >= todayStart && due < todayEnd;
      });
    }
    case 'upcoming': {
      return tasks.filter((t) => {
        if (t.status === 'done' || t.status === 'review') return false;
        if (!t.assigneeIds.includes(myUid)) return false;
        const due = t.dueDate?.toDate?.();
        return due && due >= todayEnd && due < upcomingEnd;
      });
    }
    case 'completed':
      return tasks.filter((t) => t.status === 'done' && t.assigneeIds.includes(myUid));
    case 'assigned':
      return tasks.filter((t) => t.creatorId === myUid && t.assigneeIds.some(id => id !== myUid) && t.status !== 'done' && t.status !== 'review');
    case 'review':
      return tasks.filter((t) => t.creatorId === myUid && t.status === 'review');
    case 'team':
      return tasks.filter((t) => t.assigneeIds.some((id) => teamMemberIds.includes(id)));
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
    case 'assigned': return <Send className={cls} />;
    case 'review': return <Eye className={cls} />;
    case 'team': return <Users className={cls} />;
    case 'project': return <FolderOpen className={cls} />;
    case 'goal': return <Target className={cls} />;
  }
}

export function TasksPage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const [activeView, setActiveView] = React.useState<NavView>({ type: 'all' });
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'board'>(() => {
    return (localStorage.getItem('guild_tasks_view_mode') as 'list' | 'board') || 'list';
  });
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = React.useState<TaskStatus>('todo');

  const { projects } = useProjects(orgId);
  const { goals } = useGoals(orgId);

  // Always load all org tasks (the hook is inexpensive and we filter client-side)
  const { tasks, loading } = useTasks(orgId);
  const labels = useTaskLabels(orgId);

  const members = useOrgMembers(orgId);
  const { teams } = useTeams(orgId);

  const teamMemberIds = React.useMemo(() => {
    if (!user) return [];
    const directReportIds = members
      .filter((m) => m.managerId === user.uid)
      .map((m) => m.uid);

    const managedTeamMemberIds = teams
      .filter((t) => t.managerId === user.uid)
      .flatMap((t) => t.memberIds);

    const allIds = new Set([...directReportIds, ...managedTeamMemberIds]);
    allIds.delete(user.uid);
    return Array.from(allIds);
  }, [members, teams, user]);

  const teamMemberProfiles = React.useMemo(() => {
    return members.filter((m) => teamMemberIds.includes(m.uid));
  }, [members, teamMemberIds]);

  const actor = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Unknown',
  }), [user, userProfile]);
  const actorName = userProfile?.fullName || user?.displayName || user?.email || 'Me';

  if (!user || !orgId) return <Navigate to="/login" replace />;

  const viewTasks = filterTasksForView(tasks, activeView, user?.uid ?? '', teamMemberIds);
  const { title, subtitle } = getViewTitle(activeView, projects, goals);

  // Group columns for Kanban board view
  const viewColumns = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    map.set('todo', []);
    map.set('in_progress', []);
    map.set('review', []);
    map.set('done', []);
    for (const task of viewTasks) {
      const col = map.get(task.status);
      if (col) col.push(task);
    }
    for (const [s, col] of map) {
      map.set(s, [...col].sort((a, b) => a.orderIndex - b.orderIndex));
    }
    return map;
  }, [viewTasks]);

  const kanbanMemberMap = React.useMemo(() => {
    const map = new Map<string, { fullName: string; username: string }>();
    members.forEach((m) => {
      map.set(m.uid, {
        fullName: m.fullName || m.uid,
        username: m.username || m.uid,
      });
    });
    return map;
  }, [members]);

  // Scope defaults for InlineTaskInput
  const defaultProjectId = activeView.type === 'project' ? activeView.id : null;
  const defaultGoalId = activeView.type === 'goal' ? activeView.id : null;

  const handleViewChange = (view: NavView) => {
    setActiveView(view);
    setSelectedTask(null);
    setMobileNavOpen(false);
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask((prev) => (prev?.id === task.id ? null : task));
  };

  return (
    <TasksLayout
      panelOpen={!!selectedTask}
      mobileNavOpen={mobileNavOpen}
      onMobileNavClose={() => setMobileNavOpen(false)}
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
          <div className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border-default">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent/40 hover:text-foreground shrink-0 transition-colors"
              title="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <ViewIcon view={activeView} />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
              )}
              {activeView.type === 'team' && teamMemberProfiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {teamMemberProfiles.map((m) => (
                    <span
                      key={m.uid}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      {m.fullName}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-accent/20 border border-border-default/45 p-0.5 rounded-lg shrink-0 mr-1.5">
              <button
                onClick={() => {
                  localStorage.setItem('guild_tasks_view_mode', 'list');
                  setViewMode('list');
                }}
                className={cn(
                  'p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all',
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
                  'p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all',
                  viewMode === 'board'
                    ? 'bg-bg-primary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Board View"
              >
                <Trello className="h-3.5 w-3.5" />
              </button>
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
            {viewMode === 'list' ? (
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
                  activeView.type === 'today' ? 'Nothing due today' :
                  activeView.type === 'upcoming' ? 'No upcoming tasks' :
                  activeView.type === 'completed' ? 'No completed tasks yet' :
                  activeView.type === 'assigned' ? 'You haven\'t assigned any tasks to others' :
                  activeView.type === 'review' ? 'No tasks pending your review' :
                  'No tasks yet'
                }
              />
            ) : (
              <div className="h-full w-full p-6 overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-12 h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading board…</p>
                    </div>
                  </div>
                ) : viewTasks.length === 0 ? (
                  <div className="flex items-center justify-center py-12 h-full">
                    <div className="text-center space-y-3">
                      <div className="text-5xl opacity-15 select-none">✓</div>
                      <p className="text-sm text-muted-foreground">No tasks in this view</p>
                      <button
                        onClick={() => {
                          setCreateTaskDefaultStatus('todo');
                          setCreateTaskOpen(true);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Add a task
                      </button>
                    </div>
                  </div>
                ) : (
                  <KanbanBoard
                    columns={viewColumns}
                    allTasks={viewTasks}
                    labels={labels}
                    memberMap={kanbanMemberMap}
                    orgId={orgId}
                    actor={actor}
                    onTaskClick={handleSelectTask}
                    onAddTask={(status) => {
                      setCreateTaskDefaultStatus(status);
                      setCreateTaskOpen(true);
                    }}
                  />
                )}
              </div>
            )}

            {/* Kanban Mode Task Creation Popup */}
            <CreateTaskPopup
              open={createTaskOpen}
              onClose={() => setCreateTaskOpen(false)}
              orgId={orgId}
              actor={actor}
              defaultStatus={createTaskDefaultStatus}
              defaultProjectId={defaultProjectId}
              defaultGoalId={defaultGoalId}
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
          layoutMode="inline"
        />
      }
    />
  );
}
