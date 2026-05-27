import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { 
  Plus, Loader2, Trello, LayoutList, CheckSquare, Target, Check, 
  Trash2, ChevronDown, Calendar, Search, SlidersHorizontal, 
  CheckCircle2, Circle, AlertCircle, BarChart3, TrendingUp, Archive, Sliders
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

const GOAL_STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; bg: string; border: string }> = {
  active:    { label: 'Active',    color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-indigo-100 dark:border-indigo-900/30' },
  completed: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-900/30' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500',    bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-100 dark:border-slate-900/30' },
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
    ? 'text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/30 bg-indigo-50/50 dark:bg-indigo-950/10' 
    : 'text-sky-600 dark:text-sky-400 border-sky-200/50 dark:border-sky-800/30 bg-sky-50/50 dark:bg-sky-950/10';

  const recurrenceLabel = goal.recurrence && goal.recurrence !== 'none'
    ? goal.recurrence.charAt(0).toUpperCase() + goal.recurrence.slice(1)
    : null;

  const recurrenceClass = goal.recurrence === 'daily'
    ? 'text-teal-600 dark:text-teal-400 border-teal-200/50 dark:border-teal-800/30 bg-teal-50/50 dark:bg-teal-950/10'
    : goal.recurrence === 'weekly'
    ? 'text-amber-600 dark:text-amber-450 border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10'
    : 'text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/30 bg-rose-50/50 dark:bg-rose-950/10';

  const statusCfg = GOAL_STATUS_CONFIG[goal.status];

  // SVG progress dial metrics
  const progress = goal.progressRollup !== undefined ? goal.progressRollup : 0;
  const radius = 16;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/85 hover:border-indigo-500/40 dark:hover:border-indigo-400/45 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer select-none gap-4',
        goal.status === 'completed' && 'opacity-65'
      )}
    >
      <div className="flex items-start gap-4 min-w-0 flex-1">
        {/* Toggle Circle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className={cn(
            'flex-shrink-0 h-6 w-6 mt-0.5 rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10 min-h-6 min-w-6',
            goal.status === 'completed'
              ? 'bg-emerald-500 border-transparent text-white shadow-sm scale-102 hover:scale-105 active:scale-95'
              : 'border-slate-300 dark:border-slate-700 bg-transparent hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 hover:scale-105 active:scale-95',
          )}
          title={goal.status === 'completed' ? 'Mark Active' : 'Mark Completed'}
        >
          {goal.status === 'completed' && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
        </button>

        {/* Title & Description */}
        <div className="min-w-0 flex-1">
          <span className={cn(
            'text-[15px] font-sans font-semibold tracking-tight block text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors',
            goal.status === 'completed' && 'line-through text-slate-400 dark:text-slate-500 font-normal'
          )}>
            {goal.title}
          </span>
          {goal.description && (
            <p className="text-[13px] font-sans text-slate-500 dark:text-slate-400 line-clamp-1 leading-normal mt-1">{goal.description}</p>
          )}
        </div>
      </div>

      {/* Badges and Radial dials row */}
      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 md:ml-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 md:pt-0 md:border-none">
        
        {/* Horizon and Recurrence */}
        <div className="flex items-center gap-2 select-none">
          <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight border', horizonClass)}>
            {horizonLabel}
          </span>
          {recurrenceLabel && (
            <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight border', recurrenceClass)}>
              {recurrenceLabel}
            </span>
          )}
        </div>

        {/* Target due clock stamp */}
        {due && (
          <span className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border backdrop-blur-md select-none transition-all duration-300',
            isOverdue 
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-450' 
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
          )}>
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* SVG progress dial */}
        {goal.progressRollup !== undefined && (
          <div className="shrink-0 flex items-center justify-center relative h-10 w-10 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-full select-none" data-no-click>
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                className="text-slate-100 dark:text-slate-800 stroke-current"
                strokeWidth="2.5"
                fill="transparent"
                r={radius - 2}
                cx="20"
                cy="20"
              />
              <circle
                className="text-indigo-500 dark:text-indigo-400 stroke-current transition-all duration-500 ease-out"
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                fill="transparent"
                r={radius - 2}
                cx="20"
                cy="20"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-slate-850 dark:text-slate-100 font-sans">
              {progress}%
            </span>
          </div>
        )}

        {/* Delete Trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer min-h-9 min-w-9 flex items-center justify-center"
          title="Remove Goal"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function TasksPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');

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

  // Client side filtering for tasks and goals
  const filteredRootTasks = React.useMemo(() => {
    return rootTasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [rootTasks, searchQuery, priorityFilter]);

  const filteredGoals = React.useMemo(() => {
    return goals.filter(g => {
      return g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (g.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    });
  }, [goals, searchQuery]);

  // Goal partitions
  const activeGoals = React.useMemo(() => filteredGoals.filter((g) => g.status === 'active'), [filteredGoals]);
  const completedOrCancelledGoals = React.useMemo(() => filteredGoals.filter((g) => g.status !== 'active'), [filteredGoals]);

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

  // Stats Calculations
  const tasksDoneCount = rootTasks.filter((t) => t.status === 'done').length;
  const completionPercent = rootTasks.length > 0 ? Math.round((tasksDoneCount / rootTasks.length) * 100) : 0;
  const goalsCompletedCount = goals.filter((g) => g.status === 'completed').length;
  const goalsPercent = goals.length > 0 ? Math.round((goalsCompletedCount / goals.length) * 100) : 0;

  return (
    <div className="absolute inset-y-0 left-0 right-0 top-0 bottom-0 flex flex-col overflow-hidden p-3 sm:p-5 bg-slate-50/50 dark:bg-[#0b0f19]">
      
      {/* Main Luxury Container Panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl shadow-xl overflow-hidden relative">
        
        {/* Soft background ambient light gradients */}
        <div className="absolute top-0 left-1/4 w-[350px] h-[350px] bg-indigo-500/5 dark:bg-indigo-500/[0.02] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-sky-500/5 dark:bg-sky-500/[0.02] rounded-full blur-3xl pointer-events-none" />

        {/* ─── Modern Premium SaaS Dashboard Header ─── */}
        <div className="flex flex-col gap-5 px-6 py-6 border-b border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-[#111827]/80 backdrop-blur-md relative z-10 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Title & Description */}
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-150">
                Workspace
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                Manage, organize, and track your projects, tasks, and goals in real time.
              </p>
            </div>

            {/* Premium Tab Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-2xl shrink-0 self-start lg:self-auto border border-slate-200/40 dark:border-slate-700/35">
              <button
                onClick={() => handleTabChange('tasks')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 cursor-pointer relative z-10 min-h-9 tracking-tight',
                  activeTab === 'tasks' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <CheckSquare className="h-4 w-4" />
                <span>Tasks</span>
                {activeTab === 'tasks' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-750/30 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] -z-10"
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                  />
                )}
              </button>
              <button
                onClick={() => handleTabChange('goals')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 cursor-pointer relative z-10 min-h-9 tracking-tight',
                  activeTab === 'goals' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <Target className="h-4 w-4" />
                <span>Goals</span>
                {activeTab === 'goals' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-750/30 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] -z-10"
                    transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Interactive Filters and View Selectors Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 select-none">
            
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 max-w-sm min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'tasks' ? 'Search tasks...' : 'Search goals...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-650 rounded-2xl pl-10 pr-4 py-2 text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
                />
              </div>

              {activeTab === 'tasks' && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-1.5 shrink-0">
                  <Sliders className="h-3.5 w-3.5 text-slate-450 dark:text-slate-400" />
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-600 dark:text-slate-300 border-none outline-none pr-6 cursor-pointer font-medium"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              )}
            </div>

            {/* View Mode Switchers & Trigger Buttons */}
            <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/40 dark:border-slate-700/35 backdrop-blur-md">
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
                    'p-2 rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10 min-h-8 min-w-8',
                    (activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list')
                      ? 'text-slate-900 dark:text-slate-100 font-bold'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  )}
                  title="List View"
                >
                  <LayoutList className="h-4 w-4" />
                  {(activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list') && (
                    <motion.div
                      layoutId="activeViewIndicator"
                      className="absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700/30 rounded-lg shadow-sm -z-10"
                      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                    />
                  )}
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
                    'p-2 rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10 min-h-8 min-w-8',
                    (activeTab === 'tasks' ? tasksViewMode === 'board' : goalsViewMode === 'board')
                      ? 'text-slate-900 dark:text-slate-100 font-bold'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  )}
                  title="Kanban Board"
                >
                  <Trello className="h-4 w-4" />
                  {(activeTab === 'tasks' ? tasksViewMode === 'board' : goalsViewMode === 'board') && (
                    <motion.div
                      layoutId="activeViewIndicator"
                      className="absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700/30 rounded-lg shadow-sm -z-10"
                      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                    />
                  )}
                </button>
              </div>

              {activeTab === 'tasks' ? (
                <button
                  onClick={() => {
                    setCreateTaskDefaultStatus('todo');
                    setCreateTaskOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-4 py-2.5 text-xs sm:text-[13px] font-semibold transition-all duration-300 active:scale-95 hover:shadow-lg dark:hover:shadow-indigo-500/10 cursor-pointer h-10 select-none tracking-tight border border-indigo-400/20"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>New Task</span>
                </button>
              ) : (
                <button
                  onClick={() => setCreateGoalOpen(true)}
                  className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-4 py-2.5 text-xs sm:text-[13px] font-semibold transition-all duration-300 active:scale-95 hover:shadow-lg dark:hover:shadow-indigo-500/10 cursor-pointer h-10 select-none tracking-tight border border-indigo-400/20"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>New Goal</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Premium Stats Dashboard Strip ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/10 shrink-0 select-none">
          
          <div className="p-5 flex items-center justify-between border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800/80">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tasks Completion</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-800 dark:text-slate-150">{tasksDoneCount}</span>
                <span className="text-xs text-slate-400">/ {rootTasks.length} tasks</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-500 dark:text-indigo-400 font-semibold text-xs">
              {completionPercent}%
            </div>
          </div>

          <div className="p-5 flex items-center justify-between border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800/80">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Active Directives</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-800 dark:text-slate-150">{activeTasksCount}</span>
                <span className="text-xs text-slate-400">remaining</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center border border-amber-100/50 dark:border-amber-900/30 text-amber-500 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Goals Achieved</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-800 dark:text-slate-150">{goalsCompletedCount}</span>
                <span className="text-xs text-slate-400">/ {goals.length} goals</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-500 dark:text-emerald-400 font-semibold text-xs">
              {goalsPercent}%
            </div>
          </div>

        </div>

        {/* ─── Main Viewport Canvas ─── */}
        <div className={cn(
          "flex-grow relative p-5.5 min-h-0",
          (activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list')
            ? "overflow-y-auto scrollbar-thin"
            : "overflow-hidden"
        )}>
          
          {activeTab === 'tasks' ? (
            
            /* =========================================================================
               TASKS VIEWPORT
               ========================================================================= */
            tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[350px] gap-6 px-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/10">
                  <CheckSquare className="h-7 w-7 text-indigo-500/80" />
                </div>
                <div className="space-y-2">
                  <p className="text-[16px] font-semibold text-slate-800 dark:text-slate-200">No tasks created yet</p>
                  <p className="text-[13px] text-slate-450 dark:text-slate-400 max-w-[280px]">Add your initial task output to begin workspace tracking.</p>
                </div>
                <button
                  onClick={() => {
                    setCreateTaskDefaultStatus('todo');
                    setCreateTaskOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-5 py-2.5 text-xs sm:text-[13px] font-semibold transition-all duration-300 cursor-pointer border border-indigo-400/20"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Create Task</span>
                </button>
              </div>
            ) : tasksViewMode === 'list' ? (
              <div className="space-y-8 select-none">
                {taskStatuses.map((status) => {
                  const statusTasks = filteredRootTasks.filter((t) => t.status === status);
                  if (statusTasks.length === 0) return null;
                  const statusCfg = TASK_STATUS_CONFIG[status];
                  const statusColor = statusCfg?.dot || '#a78bfa';

                  if (status === 'done') {
                    return (
                      <div key={status} className="space-y-4 pt-2 select-none">
                        <button
                          type="button"
                          onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                          className="w-full border border-slate-250/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-2xl p-4 cursor-pointer flex items-center justify-between text-xs sm:text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-300 font-semibold select-none shadow-sm"
                        >
                          <span className="flex items-center gap-2.5 uppercase tracking-wide">
                            <Archive className="h-4 w-4 text-emerald-500 dark:text-emerald-450" />
                            Completed Tasks ({statusTasks.length})
                          </span>
                          <ChevronDown className={cn("w-4.5 h-4.5 transition-transform duration-300 text-slate-400", showCompletedTasks ? "rotate-180 text-emerald-500" : "")} />
                        </button>
                        <AnimatePresence>
                          {showCompletedTasks && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-3 pb-1"
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
                    <div key={status} className="space-y-3 select-none">
                      <div className="flex items-center gap-2.5 px-2 select-none">
                        <div 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: statusColor }} 
                        />
                        <span className="text-xs sm:text-[13px] font-bold tracking-wide text-slate-600 dark:text-slate-400 uppercase">
                          {statusCfg?.label || status}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-700/20 select-none">
                          {statusTasks.length}
                        </span>
                      </div>
                      <div className="space-y-3">
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
                allTasks={filteredRootTasks}
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
              <div className="flex flex-col items-center justify-center h-full min-h-[350px] gap-6 px-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/10">
                  <Target className="h-7 w-7 text-indigo-500/80" />
                </div>
                <div className="space-y-2">
                  <p className="text-[16px] font-semibold text-slate-800 dark:text-slate-200">No goals created yet</p>
                  <p className="text-[13px] text-slate-450 dark:text-slate-400 max-w-[280px]">Add your strategic goals to track targets.</p>
                </div>
                <button
                  onClick={() => setCreateGoalOpen(true)}
                  className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-5 py-2.5 text-xs sm:text-[13px] font-semibold transition-all duration-300 cursor-pointer border border-indigo-400/20"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Create Goal</span>
                </button>
              </div>
            ) : goalsViewMode === 'list' ? (
              <div className="space-y-8 select-none">
                
                {/* Active Outcomes */}
                {activeGoals.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 px-2 select-none">Active Goals</p>
                    <div className="space-y-3">
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

                {/* Completed and Cancelled Outcomes */}
                {completedOrCancelledGoals.length > 0 && (
                  <div className="space-y-4 pt-2 select-none">
                    <button
                      type="button"
                      onClick={() => setShowCompletedGoals(!showCompletedGoals)}
                      className="w-full border border-slate-250/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-2xl p-4 cursor-pointer flex items-center justify-between text-xs sm:text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-300 font-semibold select-none shadow-sm"
                    >
                      <span className="flex items-center gap-2.5 uppercase tracking-wide">
                        <Archive className="h-4 w-4 text-emerald-500 dark:text-emerald-450" />
                        Completed & Cancelled Goals ({completedOrCancelledGoals.length})
                      </span>
                      <ChevronDown className={cn("w-4.5 h-4.5 transition-transform duration-300 text-slate-400", showCompletedGoals ? "rotate-180 text-emerald-500" : "")} />
                    </button>
                    <AnimatePresence>
                      {showCompletedGoals && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-3 pb-1"
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
                goals={filteredGoals}
                onGoalClick={(g) => navigate(`/goals/${g.id}`)}
                onAddGoal={() => setCreateGoalOpen(true)}
              />
            )
          )}
          </div>

        </div>

      {/* Task Creation popup */}
      <CreateTaskPopup
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultStatus={createTaskDefaultStatus}
      />

      {/* Goal Creation modal */}
      <CreateGoalModal
        open={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        orgId={orgId}
      />

      {/* Detail dashboard sidebar */}
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
