import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trello, LayoutList, CheckSquare, Target, Check, Trash2, ChevronDown, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useTasks, useTaskLabels } from '../../hooks/useTasks';
import { useGoals } from '../../hooks/useGoals';
import { useOrgMembers } from '../../hooks/useChat';
import { TaskDetailPanel } from './TaskDetailPanel';
import { KanbanBoard } from './KanbanBoard';
import { CreateTaskPopup } from '../../components/tasks/CreateTaskPopup';
import { TaskListRow } from './TaskListRow';
import { GoalKanbanBoard } from './GoalKanbanBoard';
import { CreateGoalModal } from './CreateGoalModal';
import { deleteTask, type Task, type TaskStatus, STATUS_CONFIG as TASK_STATUS_CONFIG } from '../../lib/tasks';
import { deleteGoal, updateGoal, type Goal, type GoalStatus } from '../../lib/goals';

const GOAL_STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-violet-400', dot: '#a78bfa' },
  completed: { label: 'Completed', color: 'text-emerald-400', dot: '#34d399' },
  cancelled: { label: 'Cancelled', color: 'text-zinc-500',    dot: '#52525b' },
};

function GoalListRow({
  goal,
  onSelect,
  onDelete,
  onToggleComplete,
}: {
  goal: Goal;
  onSelect: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
}) {
  const due = goal.targetDate?.toDate?.();
  const now = new Date();
  const isOverdue = due && due < now && goal.status === 'active';

  const horizonLabel = goal.horizon === 'long_term' ? 'Vision' : 'Milestone';
  const horizonClass = goal.horizon === 'long_term' 
    ? 'text-violet-450 border-violet-500/20 bg-violet-500/5' 
    : 'text-sky-400 border-sky-500/20 bg-sky-500/5';

  const recurrenceLabel = goal.recurrence && goal.recurrence !== 'none'
    ? goal.recurrence.charAt(0).toUpperCase() + goal.recurrence.slice(1)
    : null;

  const recurrenceClass = goal.recurrence === 'daily'
    ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
    : goal.recurrence === 'weekly'
    ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
    : 'text-rose-450 border-rose-500/20 bg-rose-500/5';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex items-center justify-between p-3.5 rounded-xl bg-card border border-border-default/80 hover:border-violet-500/30 hover:bg-surface hover:shadow-sm transition-all duration-200 cursor-pointer select-none',
        goal.status === 'completed' && 'opacity-65'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Toggle complete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className={cn(
            'flex-shrink-0 h-5 w-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200 cursor-pointer',
            goal.status === 'completed'
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-muted-foreground/45 hover:border-emerald-500/60 hover:bg-emerald-500/5',
          )}
          title={goal.status === 'completed' ? 'Mark active' : 'Mark completed'}
        >
          {goal.status === 'completed' && <Check className="h-3 w-3 text-white" />}
        </button>

        {/* Title & description */}
        <div className="min-w-0 flex-1">
          <span className={cn(
            'text-xs font-bold block text-foreground truncate group-hover:text-violet-450 transition-colors',
            goal.status === 'completed' && 'line-through text-text-muted font-normal'
          )}>
            {goal.title}
          </span>
          {goal.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-1 leading-normal mt-0.5 font-medium">{goal.description}</p>
          )}
        </div>
      </div>

      {/* Meta alignment */}
      <div className="flex items-center gap-4 shrink-0 ml-3">
        {/* Badges */}
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border', horizonClass)}>
            {horizonLabel}
          </span>
          {recurrenceLabel && (
            <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border', recurrenceClass)}>
              {recurrenceLabel}
            </span>
          )}
        </div>

        {/* Target date */}
        {due && (
          <span className={cn(
            'flex items-center gap-1 text-[10px] font-mono font-semibold',
            isOverdue ? 'text-red-400' : 'text-muted-foreground'
          )}>
            <Calendar className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Completion rate bar */}
        {goal.progressRollup !== undefined && (
          <div className="w-24 flex flex-col justify-center gap-1 hidden md:flex">
            <div className="flex items-center justify-between text-[8px] font-bold text-muted-foreground">
              <span>COMPLETION</span>
              <span>{goal.progressRollup}%</span>
            </div>
            <div className="h-1 w-full bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${goal.progressRollup}%` }}
              />
            </div>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          title="Delete goal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function TasksPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Tabs: 'tasks' | 'goals'
  const [activeTab, setActiveTab] = React.useState<'tasks' | 'goals'>(() => {
    return (localStorage.getItem('guild_unified_active_tab') as 'tasks' | 'goals') || 'tasks';
  });

  // View modes
  const [tasksViewMode, setTasksViewMode] = React.useState<'list' | 'board'>(() => {
    return (localStorage.getItem('guild_tasks_view_mode') as 'list' | 'board') || 'list';
  });
  const [goalsViewMode, setGoalsViewMode] = React.useState<'list' | 'board'>(() => {
    return (localStorage.getItem('guild_goals_view_mode') as 'list' | 'board') || 'list';
  });

  // Expandable collapse states for completed sections
  const [showCompletedTasks, setShowCompletedTasks] = React.useState(false);
  const [showCompletedGoals, setShowCompletedGoals] = React.useState(false);

  // Modals & Panels state
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = React.useState<TaskStatus>('todo');
  const [createGoalOpen, setCreateGoalOpen] = React.useState(false);

  // Core Data Hooks
  const { tasks, columns: taskColumns, loading: tasksLoading } = useTasks(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const labels = useTaskLabels(orgId);
  const members = useOrgMembers(orgId);

  // Actor
  const actor = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Unknown',
  }), [user, userProfile]);
  
  const actorName = userProfile?.fullName || user?.displayName || user?.email || 'Me';

  // Member Maps
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

  // Root tasks & subtasks map
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

  // Goal partitions
  const activeGoals = React.useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const completedOrCancelledGoals = React.useMemo(() => goals.filter((g) => g.status !== 'active'), [goals]);

  if (!user || !orgId) return <Navigate to="/login" replace />;

  const activeTasksCount = rootTasks.filter((t) => t.status !== 'done').length;

  const handleTabChange = (tab: 'tasks' | 'goals') => {
    localStorage.setItem('guild_unified_active_tab', tab);
    setActiveTab(tab);
  };

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

  const taskStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ─── Header Section ─── */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-border-default flex-shrink-0 gap-4">
        
        {/* Segmented Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-accent/20 border border-border-default/45 p-0.5 rounded-xl shrink-0">
          <button
            onClick={() => handleTabChange('tasks')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
              activeTab === 'tasks'
                ? 'bg-bg-primary text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CheckSquare className={cn('h-4 w-4 transition-colors', activeTab === 'tasks' ? 'text-violet-400' : 'text-text-muted')} />
            <span>Tasks</span>
          </button>
          <button
            onClick={() => handleTabChange('goals')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
              activeTab === 'goals'
                ? 'bg-bg-primary text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Target className={cn('h-4 w-4 transition-colors', activeTab === 'goals' ? 'text-violet-400' : 'text-text-muted')} />
            <span>Goals Focus</span>
          </button>
        </div>

        {/* View toggles and creation CTA */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {/* List vs Board Toggle */}
          <div className="flex items-center gap-1 bg-accent/20 border border-border-default/45 p-0.5 rounded-lg shrink-0">
            <button
              onClick={() => {
                if (activeTab === 'tasks') {
                  localStorage.setItem('guild_tasks_view_mode', 'list');
                  setTasksViewMode('list');
                } else {
                  localStorage.setItem('guild_goals_view_mode', 'list');
                  setGoalsViewMode('list');
                }
              }}
              className={cn(
                'p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer',
                (activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list')
                  ? 'bg-bg-primary text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="List View"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                if (activeTab === 'tasks') {
                  localStorage.setItem('guild_tasks_view_mode', 'board');
                  setTasksViewMode('board');
                } else {
                  localStorage.setItem('guild_goals_view_mode', 'board');
                  setGoalsViewMode('board');
                }
              }}
              className={cn(
                'p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer',
                (activeTab === 'tasks' ? tasksViewMode === 'board' : goalsViewMode === 'board')
                  ? 'bg-bg-primary text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Board View"
            >
              <Trello className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Creation Button */}
          {activeTab === 'tasks' ? (
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
          ) : (
            <button
              onClick={() => setCreateGoalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm border-0 h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              New Goal
            </button>
          )}
        </div>

      </div>

      {/* ─── Scrollable Main Content Canvas ─── */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        
        {/* Loading overlay */}
        {((activeTab === 'tasks' && tasksLoading) || (activeTab === 'goals' && goalsLoading)) ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-[11px] text-muted-foreground font-semibold tracking-wide animate-pulse">Syncing viewport…</p>
            </div>
          </div>
        ) : activeTab === 'tasks' ? (
          
          /* =========================================================================
             TASKS VIEWPORT
             ========================================================================= */
          tasks.length === 0 ? (
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
                className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer h-8 shadow-sm border-0"
              >
                <Plus className="h-3.5 w-3.5" />
                New Task
              </button>
            </div>
          ) : tasksViewMode === 'list' ? (
            <div className="space-y-8">
              {taskStatuses.map((status) => {
                const statusTasks = rootTasks.filter((t) => t.status === status);
                if (statusTasks.length === 0) return null;
                const statusCfg = TASK_STATUS_CONFIG[status];
                
                // Done tasks are collapsible by default
                if (status === 'done') {
                  return (
                    <div key={status} className="space-y-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                        className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide select-none"
                      >
                        <span className="flex items-center gap-2">
                          <CheckSquare className="h-3.5 w-3.5 text-emerald-450" />
                          Completed Tasks ({statusTasks.length})
                        </span>
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCompletedTasks ? "rotate-180" : "")} />
                      </button>
                      <AnimatePresence>
                        {showCompletedTasks && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-1.5"
                          >
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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

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
              columns={taskColumns}
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
          )
        ) : (
          
          /* =========================================================================
             GOALS VIEWPORT
             ========================================================================= */
          goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <Target className="h-6 w-6 text-violet-400/60" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">No goals yet</p>
                <p className="text-[11px] text-muted-foreground">Create a goal focus outcome to get started.</p>
              </div>
              <button
                onClick={() => setCreateGoalOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer h-8 shadow-sm border-0"
              >
                <Plus className="h-3.5 w-3.5" />
                New Goal
              </button>
            </div>
          ) : goalsViewMode === 'list' ? (
            <div className="space-y-8">
              {/* Active Goals list */}
              {activeGoals.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">Active Goals</p>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {activeGoals.map((g) => (
                        <GoalListRow
                          key={g.id}
                          goal={g}
                          onSelect={() => navigate(`/goals/${g.id}`)}
                          onDelete={async () => {
                            if (confirm('Delete this goal? associated tasks will be unlinked.')) {
                              await deleteGoal(g.id);
                            }
                          }}
                          onToggleComplete={async () => {
                            const nextStatus = g.status === 'completed' ? 'active' : 'completed';
                            await updateGoal(g.id, { status: nextStatus });
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Collapsible Completed/Cancelled Goals Archive */}
              {completedOrCancelledGoals.length > 0 && (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompletedGoals(!showCompletedGoals)}
                    className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide select-none"
                  >
                    <span className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-emerald-450" />
                      Completed & Cancelled Goals ({completedOrCancelledGoals.length})
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCompletedGoals ? "rotate-180" : "")} />
                  </button>
                  <AnimatePresence>
                    {showCompletedGoals && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        {completedOrCancelledGoals.map((g) => (
                          <GoalListRow
                            key={g.id}
                            goal={g}
                            onSelect={() => navigate(`/goals/${g.id}`)}
                            onDelete={async () => {
                              if (confirm('Delete this goal? associated tasks will be unlinked.')) {
                                await deleteGoal(g.id);
                              }
                            }}
                            onToggleComplete={async () => {
                              const nextStatus = g.status === 'completed' ? 'active' : 'completed';
                              await updateGoal(g.id, { status: nextStatus });
                            }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ) : (
            <GoalKanbanBoard
              goals={goals}
              onGoalClick={(g) => navigate(`/goals/${g.id}`)}
              onAddGoal={() => setCreateGoalOpen(true)}
            />
          )
        )}
      </div>

      {/* ─── Overlay & Modal Drawers ─── */}

      {/* Task Creation Popup */}
      <CreateTaskPopup
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultStatus={createTaskDefaultStatus}
      />

      {/* Goal Creation Popup */}
      <CreateGoalModal
        open={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        orgId={orgId}
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
