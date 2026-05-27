import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trello, LayoutList, CheckSquare, Target, Check, Trash2, ChevronDown, Calendar, ShieldCheck } from 'lucide-react';
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

const GOAL_STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; dot: string; leftBorder: string }> = {
  active:    { label: 'Active',    color: 'text-violet-400', dot: '#a78bfa', leftBorder: 'border-l-violet-550' },
  completed: { label: 'Completed', color: 'text-cyan-400', dot: '#22d3ee', leftBorder: 'border-l-cyan-550' },
  cancelled: { label: 'Cancelled', color: 'text-zinc-500',    dot: '#52525b', leftBorder: 'border-l-zinc-550' },
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
    ? 'text-violet-400 border-violet-500/20 bg-violet-500/5' 
    : 'text-sky-400 border-sky-500/20 bg-sky-500/5';

  const recurrenceLabel = goal.recurrence && goal.recurrence !== 'none'
    ? goal.recurrence.charAt(0).toUpperCase() + goal.recurrence.slice(1)
    : null;

  const recurrenceClass = goal.recurrence === 'daily'
    ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5'
    : goal.recurrence === 'weekly'
    ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
    : 'text-rose-450 border-rose-500/20 bg-rose-500/5';

  const statusCfg = GOAL_STATUS_CONFIG[goal.status];
  const leftBorderColor = statusCfg?.dot || '#a78bfa';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col md:flex-row md:items-center justify-between p-4.5 rounded-2xl bg-white/[0.015] dark:bg-white/[0.002] border border-white/5 hover:border-violet-500/25 hover:bg-white/[0.035] dark:hover:bg-white/[0.004] hover:shadow-[0_12px_24px_-12px_rgba(124,58,237,0.12)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer select-none pl-5 gap-4.5',
        goal.status === 'completed' && 'opacity-60'
      )}
    >
      {/* Decorative vertical glowing status strip on the left edge */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300"
        style={{ 
          backgroundColor: leftBorderColor,
          boxShadow: `0 0 10px ${leftBorderColor}`
        }}
      />

      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {/* Toggle complete circle with neon gradients */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className={cn(
            'flex-shrink-0 h-5.5 w-5.5 mt-0.5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10 min-h-5.5 min-w-5.5',
            goal.status === 'completed'
              ? 'bg-gradient-to-br from-cyan-400 to-sky-500 border-transparent text-white shadow-[0_0_8px_rgba(34,211,238,0.4)] scale-102 hover:scale-105 active:scale-95'
              : 'border-white/20 hover:border-cyan-400/60 hover:bg-cyan-500/5 hover:scale-105 active:scale-95',
          )}
          title={goal.status === 'completed' ? 'Mark active' : 'Mark completed'}
        >
          {goal.status === 'completed' && <Check className="h-3.5 w-3.5 text-white font-black stroke-[3px]" />}
        </button>

        {/* Goal Title & description */}
        <div className="min-w-0 flex-1">
          <span className={cn(
            'text-[13.5px] font-bold tracking-wide block text-foreground truncate group-hover:text-violet-400 transition-colors',
            goal.status === 'completed' && 'line-through text-muted-foreground font-normal'
          )}>
            {goal.title}
          </span>
          {goal.description && (
            <p className="text-[10px] text-muted-foreground/80 line-clamp-1 leading-normal mt-1 font-medium">{goal.description}</p>
          )}
        </div>
      </div>

      {/* Meta alignments & badges */}
      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 md:ml-4 border-t border-white/5 pt-3.5 md:pt-0 md:border-none">
        
        {/* Badges container */}
        <div className="flex items-center gap-1.5 select-none">
          <span className={cn('px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border backdrop-blur-md', horizonClass)}>
            {horizonLabel}
          </span>
          {recurrenceLabel && (
            <span className={cn('px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border backdrop-blur-md', recurrenceClass)}>
              {recurrenceLabel}
            </span>
          )}
        </div>

        {/* Target due date badge */}
        {due && (
          <span className={cn(
            'flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border backdrop-blur-md font-mono select-none transition-all duration-300',
            isOverdue ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.1)] animate-pulse' : 'bg-white/[0.02] border-white/5 text-muted-foreground'
          )}>
            <Calendar className="h-2.5 w-2.5 text-muted-foreground shrink-0 mr-0.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Progress Rollup bar (hidden on mobile devices for layout simplicity) */}
        {goal.progressRollup !== undefined && (
          <div className="w-28 flex flex-col justify-center gap-1.5 hidden lg:flex select-none">
            <div className="flex items-center justify-between text-[8px] font-black text-muted-foreground tracking-wider">
              <span>ROLLUP PROGRESS</span>
              <span className="font-mono text-foreground">{goal.progressRollup}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.04] dark:bg-black/20 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(167,139,250,0.4)]"
                style={{ width: `${goal.progressRollup}%` }}
              />
            </div>
          </div>
        )}

        {/* Delete action button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-muted-foreground hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/15 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer min-h-9 min-w-9 flex items-center justify-center"
          title="Delete goal"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>
    </motion.div>
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
    <div className="absolute inset-y-0 left-0 right-0 top-0 bottom-6 md:bottom-2 flex flex-col overflow-hidden p-1 sm:p-2 bg-transparent select-none">
      
      {/* ─── Premium Canvas Workspace Shell with Acrylic details ─── */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-card/80 to-card/50 dark:from-card/50 dark:to-card/25 backdrop-blur-3xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative group transition-all duration-500">
        
        {/* Shifting Aurora mesh glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-violet-600/15 via-fuchsia-500/[0.04] to-transparent rounded-full blur-3xl pointer-events-none animate-pulse duration-[8s]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-cyan-500/10 via-cyan-500/[0.03] to-transparent rounded-full blur-3xl pointer-events-none animate-pulse duration-[12s]" />
        
        {/* Canvas dot grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.015)_1px,transparent_1px)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none opacity-90" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.002)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.002)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

        {/* ─── Responsive Glass operational Deck Header ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-white/5 flex-shrink-0 gap-4.5 bg-white/[0.015] dark:bg-white/[0.002] backdrop-blur-md relative z-10 shadow-sm">
        
          {/* Segmented control tab switcher with framer sliding highlight */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] dark:bg-white/[0.01] border border-white/10 p-1.5 rounded-2xl shrink-0 backdrop-blur-md shadow-inner relative justify-around sm:justify-start">
            <button
              onClick={() => handleTabChange('tasks')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer relative z-10 flex-1 sm:flex-none min-h-9',
                activeTab === 'tasks' ? 'text-foreground font-black' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckSquare className={cn('h-4 w-4 transition-colors duration-300', activeTab === 'tasks' ? 'text-violet-400' : 'text-muted-foreground')} />
              <span>Tasks Focus</span>
              {activeTab === 'tasks' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl shadow-lg -z-10"
                  transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                />
              )}
            </button>
            <button
              onClick={() => handleTabChange('goals')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer relative z-10 flex-1 sm:flex-none min-h-9',
                activeTab === 'goals' ? 'text-foreground font-black' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Target className={cn('h-4 w-4 transition-colors duration-300', activeTab === 'goals' ? 'text-violet-400' : 'text-muted-foreground')} />
              <span>Goals Focus</span>
              {activeTab === 'goals' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl shadow-lg -z-10"
                  transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                />
              )}
            </button>
          </div>

          {/* View Toggles & creation button CTA */}
          <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0">
            
            {/* View toggles sliding background */}
            <div className="flex items-center gap-1 bg-white/[0.03] dark:bg-white/[0.01] border border-white/10 p-1 rounded-xl shrink-0 backdrop-blur-md shadow-inner relative">
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
                  'p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all duration-300 cursor-pointer relative z-10 min-h-8 min-w-8',
                  (activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list')
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="List View"
              >
                <LayoutList className="h-4 w-4" />
                {(activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list') && (
                  <motion.div
                    layoutId="activeViewIndicator"
                    className="absolute inset-0 bg-white/5 border border-white/10 rounded-lg shadow-sm -z-10"
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
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
                  'p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all duration-300 cursor-pointer relative z-10 min-h-8 min-w-8',
                  (activeTab === 'tasks' ? tasksViewMode === 'board' : goalsViewMode === 'board')
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Board View"
              >
                <Trello className="h-4 w-4" />
                {(activeTab === 'tasks' ? tasksViewMode === 'board' : goalsViewMode === 'board') && (
                  <motion.div
                    layoutId="activeViewIndicator"
                    className="absolute inset-0 bg-white/5 border border-white/10 rounded-lg shadow-sm -z-10"
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  />
                )}
              </button>
            </div>

            {/* Premium action button */}
            {activeTab === 'tasks' ? (
              <button
                onClick={() => {
                  setCreateTaskDefaultStatus('todo');
                  setCreateTaskOpen(true);
                }}
                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4.5 py-2 text-xs font-black tracking-wider transition-all duration-300 active:scale-95 hover:scale-[1.02] cursor-pointer shadow-[0_8px_20px_-6px_rgba(124,58,237,0.4)] border border-violet-500/20 h-10 select-none"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>New Task</span>
              </button>
            ) : (
              <button
                onClick={() => setCreateGoalOpen(true)}
                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4.5 py-2 text-xs font-black tracking-wider transition-all duration-300 active:scale-95 hover:scale-[1.02] cursor-pointer shadow-[0_8px_20px_-6px_rgba(124,58,237,0.4)] border border-violet-500/20 h-10 select-none"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>New Goal</span>
              </button>
            )}
          </div>

        </div>

        {/* ─── Scrollable main content viewports ─── */}
        <div className={cn(
          "flex-grow relative z-10 p-4 sm:p-5.5 min-h-0",
          (activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list')
            ? "overflow-y-auto custom-scrollbar"
            : "overflow-hidden"
        )}>
        
        {((activeTab === 'tasks' && tasksLoading) || (activeTab === 'goals' && goalsLoading)) ? (
          <div className="flex h-full items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
              <p className="text-[11px] text-muted-foreground font-black tracking-widest uppercase animate-pulse select-none">Syncing viewport…</p>
            </div>
          </div>
        ) : activeTab === 'tasks' ? (
          
          /* =========================================================================
             TASKS VIEWPORT
             ========================================================================= */
          tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] gap-5 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20 shadow-inner">
                <CheckSquare className="h-7 w-7 text-violet-400/80" />
              </div>
              <div className="space-y-1.5 select-none">
                <p className="text-sm font-black text-foreground uppercase tracking-wide">No tasks created yet</p>
                <p className="text-[11px] text-muted-foreground/80 max-w-[280px]">Add your initial task focus area to launch collaborate operations.</p>
              </div>
              <button
                onClick={() => {
                  setCreateTaskDefaultStatus('todo');
                  setCreateTaskOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-650 hover:bg-violet-600 text-white px-4.5 py-2 text-xs font-black tracking-wider transition-all duration-300 active:scale-95 hover:scale-[1.02] cursor-pointer h-9 shadow-md border-0 uppercase"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Add task
              </button>
            </div>
          ) : tasksViewMode === 'list' ? (
            <div className="space-y-8 select-none">
              {taskStatuses.map((status) => {
                const statusTasks = rootTasks.filter((t) => t.status === status);
                if (statusTasks.length === 0) return null;
                const statusCfg = TASK_STATUS_CONFIG[status];
                const statusColor = statusCfg?.dot || '#a78bfa';
                
                // Done tasks collapsed archive rows
                if (status === 'done') {
                  return (
                    <div key={status} className="space-y-3.5 pt-2 select-none">
                      <button
                        type="button"
                        onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                        className="w-full border border-white/5 bg-white/[0.015] hover:bg-white/[0.035] rounded-2xl p-3 cursor-pointer flex items-center justify-between text-[10.5px] text-muted-foreground hover:text-foreground transition-all duration-300 font-black tracking-wider select-none shadow-sm"
                      >
                        <span className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-cyan-400" />
                          Completed Tasks Archive ({statusTasks.length})
                        </span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-350", showCompletedTasks ? "rotate-180 text-cyan-400" : "")} />
                      </button>
                      <AnimatePresence>
                        {showCompletedTasks && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-2 pb-1"
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
                      {/* Halo styled status marker */}
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ 
                          backgroundColor: statusColor,
                          boxShadow: `0 0 10px ${statusColor}` 
                        }} 
                      />
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        {statusCfg?.label || status}
                      </span>
                      <span className="text-[9.5px] font-black text-muted-foreground/80 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/5 font-mono select-none">
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
            <div className="flex flex-col items-center justify-center h-full min-h-[350px] gap-5 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20 shadow-inner">
                <Target className="h-7 w-7 text-violet-400/80" />
              </div>
              <div className="space-y-1.5 select-none">
                <p className="text-sm font-black text-foreground uppercase tracking-wide">No goals created yet</p>
                <p className="text-[11px] text-muted-foreground/80 max-w-[280px]">Add your core milestone focus results to launch your tracking targets.</p>
              </div>
              <button
                onClick={() => setCreateGoalOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-650 hover:bg-violet-650 text-white px-4.5 py-2 text-xs font-black tracking-wider transition-all duration-300 active:scale-95 hover:scale-[1.02] cursor-pointer h-9 shadow-md border-0 uppercase"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Add Goal
              </button>
            </div>
          ) : goalsViewMode === 'list' ? (
            <div className="space-y-8 select-none">
              {/* Active Goals list */}
              {activeGoals.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground mb-3.5 px-2 select-none">Active Goals</p>
                  <div className="space-y-2.5">
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
                <div className="space-y-3.5 pt-2 select-none">
                  <button
                    type="button"
                    onClick={() => setShowCompletedGoals(!showCompletedGoals)}
                    className="w-full border border-white/5 bg-white/[0.015] hover:bg-white/[0.035] rounded-2xl p-3 cursor-pointer flex items-center justify-between text-[10.5px] text-muted-foreground hover:text-foreground transition-all duration-300 font-black tracking-wider select-none shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-cyan-400" />
                      Completed & Cancelled Goals Archive ({completedOrCancelledGoals.length})
                    </span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-350", showCompletedGoals ? "rotate-180 text-cyan-400" : "")} />
                  </button>
                  <AnimatePresence>
                    {showCompletedGoals && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2.5 pb-1"
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

      {/* ─── Premium glass status metrics canvas bar ─── */}
      <div className="h-8.5 border-t border-white/5 bg-white/[0.01] dark:bg-white/[0.002] flex items-center justify-between px-5 text-[9.5px] font-mono font-bold tracking-wider text-muted-foreground/60 select-none relative z-10 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]" />
            CLOUD SYNCED
          </span>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
          <span className="hidden sm:block">WORKSPACE: {orgId.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4.5">
          <span>ACTIVE TASKS: {activeTasksCount}</span>
          <div className="h-4 w-[1px] bg-white/10 hidden md:block" />
          <span className="hidden md:block">GOALS: {goals.length}</span>
          <div className="h-4 w-[1px] bg-white/10 hidden lg:block" />
          <span className="hidden lg:block">OPERATOR: {actorName.toUpperCase()}</span>
        </div>
      </div>

      </div>

      {/* ─── Unified Create Drawers / Overlays ─── */}

      {/* Create task popup */}
      <CreateTaskPopup
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        orgId={orgId}
        actor={actor}
        defaultStatus={createTaskDefaultStatus}
      />

      {/* Create goal dialog */}
      <CreateGoalModal
        open={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        orgId={orgId}
      />

      {/* Detail panel canvas */}
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
