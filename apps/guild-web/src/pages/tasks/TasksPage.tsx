import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Plus, Loader2, LayoutList, CheckSquare, Target, Check,
  Trash2, ChevronDown, Search, Clock, AlertCircle,
  Zap, TrendingUp, Layers, BarChart2, Circle, CheckCircle,
  Grid3X3, List, Filter, SlidersHorizontal, X, Calendar,
  Flame, ArrowUpRight, MoreHorizontal, ChevronRight, Archive
} from 'lucide-react';
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
import { deleteGoal, updateGoal, type Goal } from '../../lib/goals';

// ─── Goal Status Config ────────────────────────────────────────────────────────
const GOAL_STATUS_CONFIG: Record<Goal['status'], { label: string; accent: string; bg: string }> = {
  active:    { label: 'Active',    accent: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  completed: { label: 'Completed', accent: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  cancelled: { label: 'Cancelled', accent: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

// ─── Goal Row ─────────────────────────────────────────────────────────────────
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
  const progress = goal.progressRollup !== undefined ? goal.progressRollup : 0;
  const statusCfg = GOAL_STATUS_CONFIG[goal.status];

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={onSelect}
      className={cn(
        'group relative flex items-center gap-4 px-5 py-4 rounded-2xl border cursor-pointer select-none transition-all duration-200',
        'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60',
        'hover:border-indigo-300/60 dark:hover:border-indigo-500/30 hover:shadow-[0_4px_20px_rgba(99,102,241,0.08)]',
        goal.status !== 'active' && 'opacity-60'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
        className={cn(
          'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 relative z-10',
          goal.status === 'completed'
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
        )}
      >
        {goal.status === 'completed' && <Check className="h-3 w-3 stroke-[3px]" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={cn(
              'text-sm font-semibold tracking-tight transition-colors',
              goal.status === 'completed'
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
            )}
          >
            {goal.title}
          </span>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ color: statusCfg.accent, backgroundColor: statusCfg.bg }}
          >
            {goal.horizon === 'long_term' ? 'Vision' : 'Milestone'}
          </span>
        </div>
        {goal.description && (
          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">{goal.description}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {due && (
          <span className={cn(
            'flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg',
            isOverdue
              ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20'
              : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
          )}>
            <Calendar className="h-3 w-3" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Progress ring */}
        <div className="relative h-9 w-9 shrink-0">
          <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="18" cy="18" r={radius}
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
            {progress}%
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string;
  value: number | string;
  sub: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{value}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{sub}</span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

// ─── Main TasksPage ────────────────────────────────────────────────────────────
export function TasksPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Tab state
  const [activeTab, setActiveTab] = React.useState<'tasks' | 'goals'>(() =>
    (localStorage.getItem('guild_unified_active_tab') as 'tasks' | 'goals') || 'tasks'
  );

  // View modes
  const [tasksViewMode, setTasksViewMode] = React.useState<'list' | 'board'>(() =>
    (localStorage.getItem('guild_tasks_view_mode') as 'list' | 'board') || 'list'
  );
  const [goalsViewMode, setGoalsViewMode] = React.useState<'list' | 'board'>(() =>
    (localStorage.getItem('guild_goals_view_mode') as 'list' | 'board') || 'list'
  );

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [showFilters, setShowFilters] = React.useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = React.useState(false);
  const [showCompletedGoals, setShowCompletedGoals] = React.useState(false);

  // Modal / panel state
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = React.useState<TaskStatus>('todo');
  const [createGoalOpen, setCreateGoalOpen] = React.useState(false);

  // Data hooks
  const { tasks, columns: taskColumns, loading: tasksLoading } = useTasks(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const labels = useTaskLabels(orgId);
  const members = useOrgMembers(orgId);

  const actor = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Unknown',
  }), [user, userProfile]);

  const actorName = userProfile?.fullName || user?.displayName || user?.email || 'Me';

  const memberMap = React.useMemo(() => {
    const map = new Map<string, { fullName: string; username: string }>();
    members.forEach((m) => map.set(m.uid, { fullName: m.fullName || m.uid, username: m.username || m.uid }));
    return map;
  }, [members]);

  const memberRecordMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => { map[m.uid] = m.fullName || m.username || m.uid; });
    return map;
  }, [members]);

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

  const filteredRootTasks = React.useMemo(() =>
    rootTasks.filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchSearch && matchPriority;
    }),
    [rootTasks, searchQuery, priorityFilter]
  );

  const filteredGoals = React.useMemo(() =>
    goals.filter((g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    ),
    [goals, searchQuery]
  );

  const activeGoals = React.useMemo(() => filteredGoals.filter((g) => g.status === 'active'), [filteredGoals]);
  const completedOrCancelledGoals = React.useMemo(() => filteredGoals.filter((g) => g.status !== 'active'), [filteredGoals]);

  if (!user || !orgId) return <Navigate to="/login" replace />;

  // Stats
  const tasksDoneCount = rootTasks.filter((t) => t.status === 'done').length;
  const activeTasksCount = rootTasks.filter((t) => t.status !== 'done').length;
  const goalsCompletedCount = goals.filter((g) => g.status === 'completed').length;
  const urgentCount = rootTasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

  const handleTabChange = (tab: 'tasks' | 'goals') => {
    localStorage.setItem('guild_unified_active_tab', tab);
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(task.id);
    if (selectedTask?.id === task.id) setSelectedTask(null);
  };

  const handleToggleTaskSelect = (task: Task) => {
    setSelectedTask((prev) => (prev?.id === task.id ? null : task));
  };

  const taskStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
  const isLoading = activeTab === 'tasks' ? tasksLoading : goalsLoading;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0c0e16]">

      {/* ── Top header bar ──────────────────────────────────────── */}
      <div className="flex-none border-b border-slate-200/80 dark:border-slate-800/70 bg-white/90 dark:bg-[#0f111a]/90 backdrop-blur-md">

        {/* Title row */}
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            {/* Page icon */}
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              {activeTab === 'tasks'
                ? <CheckSquare className="h-4 w-4 text-white" />
                : <Target className="h-4 w-4 text-white" />
              }
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
                {activeTab === 'tasks' ? 'Tasks' : 'Goals'}
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                {activeTab === 'tasks'
                  ? `${activeTasksCount} active · ${tasksDoneCount} done`
                  : `${activeGoals.length} active · ${goalsCompletedCount} achieved`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switcher — pill style */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              {(['tasks', 'goals'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
                    activeTab === tab
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                >
                  {tab === 'tasks' ? <CheckSquare className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
                  <span className="capitalize">{tab}</span>
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              {[
                { mode: 'list' as const, icon: List },
                { mode: 'board' as const, icon: Grid3X3 },
              ].map(({ mode, icon: Icon }) => {
                const isActive = activeTab === 'tasks' ? tasksViewMode === mode : goalsViewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      if (activeTab === 'tasks') {
                        localStorage.setItem('guild_tasks_view_mode', mode);
                        setTasksViewMode(mode);
                      } else {
                        localStorage.setItem('guild_goals_view_mode', mode);
                        setGoalsViewMode(mode);
                      }
                    }}
                    className={cn(
                      'p-1.5 rounded-lg transition-all duration-200 cursor-pointer',
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                    )}
                    title={mode === 'list' ? 'List view' : 'Board view'}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Create button */}
            <button
              onClick={() => activeTab === 'tasks'
                ? (setCreateTaskDefaultStatus('todo'), setCreateTaskOpen(true))
                : setCreateGoalOpen(true)
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm shadow-indigo-600/25 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New {activeTab === 'tasks' ? 'Task' : 'Goal'}</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-stretch divide-x divide-slate-100 dark:divide-slate-800/70 border-t border-slate-100 dark:border-slate-800/70">
          <StatCard label="Completed" value={tasksDoneCount} sub={`/ ${rootTasks.length}`} accent="#10b981" icon={CheckCircle} />
          <StatCard label="In Progress" value={activeTasksCount} sub="remaining" accent="#6366f1" icon={Zap} />
          <StatCard label="Urgent" value={urgentCount} sub="tasks" accent="#ef4444" icon={Flame} />
          <StatCard label="Goals" value={goalsCompletedCount} sub={`/ ${goals.length}`} accent="#f59e0b" icon={TrendingUp} />
        </div>

        {/* Search + filter row */}
        <div className="flex items-center gap-2 px-6 py-3 border-t border-slate-100 dark:border-slate-800/70">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {activeTab === 'tasks' && (
            <div className="flex items-center gap-1.5">
              {['all', 'urgent', 'high', 'medium', 'low'].map((p) => {
                const colors: Record<string, string> = {
                  all: 'text-slate-600 dark:text-slate-300',
                  urgent: 'text-rose-600',
                  high: 'text-amber-600',
                  medium: 'text-indigo-600',
                  low: 'text-teal-600',
                };
                return (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all capitalize cursor-pointer',
                      priorityFilter === p
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'
                    )}
                  >
                    {p === 'all' ? 'All' : p}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content area ───────────────────────────────────── */}
      <div className={cn(
        'flex-1 min-h-0',
        (activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list')
          ? 'overflow-y-auto'
          : 'overflow-hidden'
      )}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs text-slate-400 font-medium">Loading...</span>
            </div>
          </div>
        ) : activeTab === 'tasks' ? (
          /* ── TASKS VIEW ── */
          tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet"
              description="Create your first task to start tracking work."
              action={{ label: 'Create Task', onClick: () => { setCreateTaskDefaultStatus('todo'); setCreateTaskOpen(true); } }}
            />
          ) : tasksViewMode === 'list' ? (
            <div className="px-6 py-6 space-y-6">
              {taskStatuses.map((status) => {
                const statusTasks = filteredRootTasks.filter((t) => t.status === status);
                if (statusTasks.length === 0) return null;
                const cfg = TASK_STATUS_CONFIG[status];
                const statusColor = cfg?.dot || '#6366f1';

                if (status === 'done') {
                  return (
                    <div key={status} className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowCompletedTasks((v) => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/40 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Archive className="h-3.5 w-3.5 text-emerald-500" />
                          Completed · {statusTasks.length}
                        </span>
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showCompletedTasks && 'rotate-180')} />
                      </button>
                      <AnimatePresence>
                        {showCompletedTasks && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-2"
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
                  <div key={status} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {cfg?.label || status}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        {statusTasks.length}
                      </span>
                    </div>
                    <div className="space-y-2">
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
            <div className="h-full p-5">
              <KanbanBoard
                columns={taskColumns}
                allTasks={filteredRootTasks}
                labels={labels}
                memberMap={memberMap}
                orgId={orgId}
                actor={actor}
                onTaskClick={handleToggleTaskSelect}
                onAddTask={(status) => { setCreateTaskDefaultStatus(status); setCreateTaskOpen(true); }}
              />
            </div>
          )
        ) : (
          /* ── GOALS VIEW ── */
          goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No goals yet"
              description="Set strategic goals to track your team's direction."
              action={{ label: 'Create Goal', onClick: () => setCreateGoalOpen(true) }}
            />
          ) : goalsViewMode === 'list' ? (
            <div className="px-6 py-6 space-y-6">
              {activeGoals.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Active Goals
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                      {activeGoals.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {activeGoals.map((g) => (
                        <GoalListRow
                          key={g.id}
                          goal={g}
                          onSelect={() => navigate(`/goals/${g.id}`)}
                          onDelete={async () => {
                            if (confirm('Delete this goal?')) await deleteGoal(g.id);
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

              {completedOrCancelledGoals.length > 0 && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowCompletedGoals((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/40 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Archive className="h-3.5 w-3.5 text-emerald-500" />
                      Completed & Cancelled · {completedOrCancelledGoals.length}
                    </span>
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showCompletedGoals && 'rotate-180')} />
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
                              if (confirm('Delete this goal?')) await deleteGoal(g.id);
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
            <div className="h-full p-5">
              <GoalKanbanBoard
                goals={filteredGoals}
                onGoalClick={(g) => navigate(`/goals/${g.id}`)}
                onAddGoal={() => setCreateGoalOpen(true)}
              />
            </div>
          )
        )}
      </div>

      {/* Modals & Panels */}
      <CreateTaskPopup
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultStatus={createTaskDefaultStatus}
      />
      <CreateGoalModal
        open={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        orgId={orgId}
      />
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

// ─── Empty state component ─────────────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[360px] gap-5 px-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center">
        <Icon className="h-6 w-6 text-indigo-500/80" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px]">{description}</p>
      </div>
      <button
        onClick={action.onClick}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 shadow-sm shadow-indigo-600/20 cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        {action.label}
      </button>
    </div>
  );
}
