import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trello, LayoutList, CheckSquare, Target, Check, Trash2, ChevronDown, Calendar, Terminal, Activity } from 'lucide-react';
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

const GOAL_STATUS_CONFIG: Record<Goal['status'], { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-violet-400', dot: '#a78bfa' },
  completed: { label: 'Completed', color: 'text-cyan-400', dot: '#22d3ee' },
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
  const sideColor = statusCfg?.dot || '#a78bfa';

  // SVG progress dial metrics
  const progress = goal.progressRollup !== undefined ? goal.progressRollup : 0;
  const radius = 16;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const goalIdCode = `G-${goal.id.slice(0, 4).toUpperCase()}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-white/[0.01] dark:bg-black/[0.1] border border-white/5 hover:border-violet-500/20 hover:bg-white/[0.02] dark:hover:bg-white/[0.002] hover:shadow-[0_0_8px_rgba(167,139,250,0.08)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer select-none pl-4.5 font-mono gap-4',
        goal.status === 'completed' && 'opacity-55'
      )}
    >
      {/* Absolute sidebar priority scan track */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l transition-all duration-300"
        style={{ 
          backgroundColor: sideColor,
          boxShadow: `0 0 8px ${sideColor}`
        }}
      />

      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Toggle directive circle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className={cn(
            'flex-shrink-0 h-5.5 w-5.5 mt-0.5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 cursor-pointer relative z-10 min-h-5.5 min-w-5.5',
            goal.status === 'completed'
              ? 'bg-gradient-to-br from-cyan-400 to-sky-500 border-transparent text-white shadow-[0_0_8px_rgba(34,211,238,0.4)] scale-102 hover:scale-105 active:scale-95'
              : 'border-white/20 hover:border-cyan-400/60 hover:bg-cyan-500/5 hover:scale-105 active:scale-95',
          )}
          title={goal.status === 'completed' ? 'Mark Active' : 'Mark Completed'}
        >
          {goal.status === 'completed' && <Check className="h-3.5 w-3.5 text-white font-black stroke-[3px]" />}
        </button>

        {/* Title */}
        <div className="min-w-0 flex-1 pl-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-black text-violet-400/90 bg-violet-500/5 border border-violet-500/10 px-1.5 py-0.5 rounded w-fit select-none shrink-0">
              {goalIdCode}
            </span>
            <span className={cn(
              'text-[13px] font-sans font-bold tracking-wide block text-foreground truncate group-hover:text-violet-400 transition-colors',
              goal.status === 'completed' && 'line-through text-muted-foreground font-normal'
            )}>
              {goal.title}
            </span>
          </div>
          {goal.description && (
            <p className="text-[10px] font-sans text-muted-foreground/80 line-clamp-1 leading-normal mt-1 pl-0.5 font-medium">{goal.description}</p>
          )}
        </div>
      </div>

      {/* Badges and Radial dials row */}
      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 md:ml-4 border-t border-white/5 pt-3.5 md:pt-0 md:border-none">
        
        {/* Recurrence milestone directive badges */}
        <div className="flex items-center gap-1.5 select-none">
          <span className={cn('px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-md', horizonClass)}>
            {horizonLabel}
          </span>
          {recurrenceLabel && (
            <span className={cn('px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-md', recurrenceClass)}>
              {recurrenceLabel}
            </span>
          )}
        </div>

        {/* Target due clock stamp */}
        {due && (
          <span className={cn(
            'flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md font-mono select-none transition-all duration-300',
            isOverdue ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse' : 'bg-white/[0.02] border-white/5 text-muted-foreground'
          )}>
            <Calendar className="h-2.5 w-2.5 text-muted-foreground shrink-0 mr-0.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Small SVG progress dial */}
        {goal.progressRollup !== undefined && (
          <div className="shrink-0 flex items-center justify-center relative h-9 w-9 bg-white/[0.02] border border-white/5 rounded-full select-none" data-no-click>
            <svg className="w-9 h-9 transform -rotate-90">
              <circle
                className="text-white/[0.04] stroke-current"
                strokeWidth="2.5"
                fill="transparent"
                r={radius - 2}
                cx="18"
                cy="18"
              />
              <circle
                className="text-violet-400 stroke-current transition-all duration-500 ease-out"
                strokeWidth="2.5"
                strokeDasharray={circumference - 10}
                strokeDashoffset={offset - 10}
                strokeLinecap="round"
                fill="transparent"
                r={radius - 2}
                cx="18"
                cy="18"
                style={{ stroke: 'url(#listRadialGrad)' }}
              />
            </svg>
            <span className="absolute text-[7.5px] font-black text-foreground font-mono select-none">
              {progress}%
            </span>
          </div>
        )}

        {/* Technical deletion trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-muted-foreground hover:text-red-400 p-2 rounded hover:bg-red-500/10 border border-transparent hover:border-red-500/15 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer min-h-8 min-w-8 flex items-center justify-center"
          title="Remove outcome directive"
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

  // Left HUD Panel Metrics and SVGs
  const tasksDoneCount = rootTasks.filter((t) => t.status === 'done').length;
  const completionPercent = rootTasks.length > 0 ? Math.round((tasksDoneCount / rootTasks.length) * 100) : 0;
  const radarCircumference = 2 * Math.PI * 45; // radius = 45 -> 282.74
  const radarOffset = radarCircumference - (completionPercent / 100) * radarCircumference;

  return (
    <div className="absolute inset-y-0 left-0 right-0 top-0 bottom-6 md:bottom-2 flex flex-col overflow-hidden p-1 sm:p-2 bg-transparent select-none font-mono">
      
      {/* Asymmetric Linear/Terminal background block panel */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-card/85 to-card/50 dark:from-card/50 dark:to-card/20 border border-white/5 rounded-2xl shadow-2xl overflow-hidden relative group transition-all duration-500">
        
        {/* Animated ambient mesh rays */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-violet-600/10 via-cyan-500/[0.02] to-transparent rounded-full blur-3xl pointer-events-none animate-pulse duration-[8s]" />
        
        {/* Blueprint-grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_1px,transparent_1px)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-90" />

        {/* ─── Cybernetic Operational command deck header ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0 gap-4 bg-white/[0.01] dark:bg-black/35 backdrop-blur-md relative z-10 shadow-sm">
          
          <div className="flex items-center gap-1.5 bg-white/[0.03] dark:bg-white/[0.01] border border-white/10 p-1.5 rounded-xl shrink-0 justify-around sm:justify-start">
            <button
              onClick={() => handleTabChange('tasks')}
              className={cn(
                'px-4 py-2 rounded text-xs font-black flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer relative z-10 flex-1 sm:flex-none min-h-9 uppercase tracking-widest',
                activeTab === 'tasks' ? 'text-foreground font-black' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckSquare className={cn('h-3.5 w-3.5 transition-colors duration-300', activeTab === 'tasks' ? 'text-violet-400' : 'text-muted-foreground')} />
              <span>[Tasks Focus]</span>
              {activeTab === 'tasks' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white/5 border border-white/10 rounded shadow-md -z-10"
                  transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                />
              )}
            </button>
            <button
              onClick={() => handleTabChange('goals')}
              className={cn(
                'px-4 py-2 rounded text-xs font-black flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer relative z-10 flex-1 sm:flex-none min-h-9 uppercase tracking-widest',
                activeTab === 'goals' ? 'text-foreground font-black' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Target className={cn('h-3.5 w-3.5 transition-colors duration-300', activeTab === 'goals' ? 'text-violet-400' : 'text-muted-foreground')} />
              <span>[Goals Focus]</span>
              {activeTab === 'goals' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white/5 border border-white/10 rounded shadow-md -z-10"
                  transition={{ type: 'spring', damping: 22, stiffness: 220 }}
                />
              )}
            </button>
          </div>

          {/* Controls viewports and commands */}
          <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 select-none">
            
            <div className="flex items-center gap-1 bg-white/[0.03] dark:bg-white/[0.01] border border-white/10 p-1 rounded shrink-0 backdrop-blur-md relative">
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
                  'p-2 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all duration-300 cursor-pointer relative z-10 min-h-8 min-w-8',
                  (activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list')
                    ? 'text-foreground font-black'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Ledger View"
              >
                <LayoutList className="h-4 w-4" />
                {(activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list') && (
                  <motion.div
                    layoutId="activeViewIndicator"
                    className="absolute inset-0 bg-white/5 border border-white/10 rounded -z-10"
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
                  'p-2 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all duration-300 cursor-pointer relative z-10 min-h-8 min-w-8',
                  (activeTab === 'tasks' ? tasksViewMode === 'board' : goalsViewMode === 'board')
                    ? 'text-foreground font-black'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Chamber Grid"
              >
                <Trello className="h-4 w-4" />
                {(activeTab === 'tasks' ? tasksViewMode === 'board' : goalsViewMode === 'board') && (
                  <motion.div
                    layoutId="activeViewIndicator"
                    className="absolute inset-0 bg-white/5 border border-white/10 rounded -z-10"
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
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
                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 rounded bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 text-xs font-black tracking-widest transition-all duration-300 active:scale-95 hover:scale-[1.02] cursor-pointer shadow-[0_4px_12px_rgba(124,58,237,0.3)] border border-violet-500/20 h-10 select-none uppercase"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>[Stage task]</span>
              </button>
            ) : (
              <button
                onClick={() => setCreateGoalOpen(true)}
                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 rounded bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 text-xs font-black tracking-widest transition-all duration-300 active:scale-95 hover:scale-[1.02] cursor-pointer shadow-[0_4px_12px_rgba(124,58,237,0.3)] border border-violet-500/20 h-10 select-none uppercase"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>[Stage goal]</span>
              </button>
            )}
          </div>

        </div>

        {/* ─── Split Screen HUD Main Console Area ─── */}
        <div className="flex-grow flex flex-col xl:flex-row min-h-0 overflow-hidden relative z-10">
          
          {/* Asymmetric LEFT: Radar Telemetry HUD Panel */}
          <div className="w-full xl:w-[290px] border-b xl:border-b-0 xl:border-r border-white/5 bg-white/[0.005] dark:bg-black/[0.15] p-5 shrink-0 flex flex-col gap-5 font-mono select-none overflow-y-auto custom-scrollbar select-none text-center xl:text-left">
            
            {/* HUD Status Header */}
            <div className="flex items-center justify-center xl:justify-start gap-2 border-b border-white/5 pb-3">
              <Activity className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.25em] text-foreground">TELEMETRY_HUD</span>
            </div>

            {/* Radar Telemetry dial */}
            <div className="flex justify-center py-4 relative select-none">
              <div className="relative h-32 w-32 flex items-center justify-center bg-white/[0.01] border border-white/5 rounded-full select-none shadow-sm">
                
                {/* SVG radar dialect ring */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <defs>
                    <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                  
                  {/* Concentric grids circles */}
                  <circle className="text-white/[0.02] stroke-current" strokeWidth="1" fill="transparent" r="25" cx="64" cy="64" />
                  <circle className="text-white/[0.02] stroke-current" strokeWidth="1" fill="transparent" r="35" cx="64" cy="64" />
                  
                  {/* Underlay tracking circle */}
                  <circle
                    className="text-white/[0.04] stroke-current"
                    strokeWidth="3.5"
                    fill="transparent"
                    r="45"
                    cx="64"
                    cy="64"
                  />
                  {/* Active scanning completion rate dial */}
                  <circle
                    className="stroke-current transition-all duration-700 ease-out"
                    strokeWidth="3.5"
                    strokeDasharray={radarCircumference}
                    strokeDashoffset={radarOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    r="45"
                    cx="64"
                    cy="64"
                    style={{ 
                      stroke: 'url(#radarGrad)',
                      filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.45))'
                    }}
                  />
                </svg>
                
                {/* Radial inner scanner indicators */}
                <div className="absolute text-center space-y-0.5 select-none">
                  <span className="block text-[14px] font-black text-foreground font-mono tracking-wide leading-none">{completionPercent}%</span>
                  <span className="block text-[7.5px] text-muted-foreground uppercase tracking-widest font-mono">COMPLETE</span>
                </div>
              </div>
            </div>

            {/* Tactical outcomes details */}
            <div className="space-y-3.5 pt-2 select-none text-left">
              <div className="bg-white/[0.01] border border-white/5 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">Total Directives:</span>
                  <span className="font-mono text-foreground font-black">{rootTasks.length}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">Completed Directives:</span>
                  <span className="font-mono text-cyan-400 font-black">{tasksDoneCount}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">Staged outcomes:</span>
                  <span className="font-mono text-violet-400 font-black">{activeTasksCount}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">Goal directives:</span>
                  <span className="font-mono text-foreground font-black">{goals.length}</span>
                </div>
              </div>

              <div className="border border-dashed border-white/10 rounded-lg p-3 text-center">
                <span className="block text-[8px] font-black text-violet-400/90 tracking-widest uppercase">HUD_STATUS_ON</span>
                <span className="block text-[7.5px] text-muted-foreground/60 tracking-wider mt-0.5 font-bold uppercase">LEDGER MODULE ACTIVE</span>
              </div>
            </div>

          </div>

          {/* Asymmetric RIGHT: Main viewport canvas ledger lanes */}
          <div className={cn(
            "flex-grow relative p-4 sm:p-5.5 min-h-0",
            (activeTab === 'tasks' ? tasksViewMode === 'list' : goalsViewMode === 'list')
              ? "overflow-y-auto custom-scrollbar"
              : "overflow-hidden"
          )}>
            
            {activeTab === 'tasks' ? (
              
              /* =========================================================================
                 TASKS DIRECTIVES VIEWPORT
                 ========================================================================= */
              tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[350px] gap-5 px-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded border border-white/10 bg-violet-500/10 ring-1 ring-violet-500/20">
                    <Terminal className="h-6 w-6 text-violet-400/70" />
                  </div>
                  <div className="space-y-1.5 select-none">
                    <p className="text-sm font-black text-foreground uppercase tracking-widest font-mono">[NO_DIRECTIVES_STAGED]</p>
                    <p className="text-[10px] text-muted-foreground max-w-[280px]">Add your initial operational task Outcomes to begin ledger tracking.</p>
                  </div>
                  <button
                    onClick={() => {
                      setCreateTaskDefaultStatus('todo');
                      setCreateTaskOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded bg-violet-650 hover:bg-violet-600 text-white px-4 py-2 text-xs font-black tracking-widest transition-all duration-300 active:scale-95 cursor-pointer h-9 shadow-md border-0 uppercase font-mono"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>[Stage outcomes]</span>
                  </button>
                </div>
              ) : tasksViewMode === 'list' ? (
                <div className="space-y-8 select-none">
                  {taskStatuses.map((status) => {
                    const statusTasks = rootTasks.filter((t) => t.status === status);
                    if (statusTasks.length === 0) return null;
                    const statusCfg = TASK_STATUS_CONFIG[status];
                    const statusColor = statusCfg?.dot || '#a78bfa';

                    // Collapsed Vault shutter
                    if (status === 'done') {
                      return (
                        <div key={status} className="space-y-3.5 pt-2 select-none">
                          <button
                            type="button"
                            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                            className="w-full border border-white/10 bg-white/[0.015] hover:bg-white/[0.035] rounded-xl p-3 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-all duration-300 font-black tracking-[0.2em] select-none font-mono shadow-sm"
                          >
                            <span className="flex items-center gap-2 uppercase">
                              <ShieldCheck className="h-4 w-4 text-cyan-400" />
                              [ARCHIVED_DIRECTIVES_VAULT] ({statusTasks.length})
                            </span>
                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showCompletedTasks ? "rotate-180 text-cyan-400" : "")} />
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
                          <div 
                            className="h-1.5 w-1.5 rounded-full" 
                            style={{ 
                              backgroundColor: statusColor,
                              boxShadow: `0 0 10px ${statusColor}` 
                            }} 
                          />
                          <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            {statusCfg?.label || status}
                          </span>
                          <span className="text-[8.5px] font-bold text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded border border-white/5 font-mono select-none">
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
                 GOALS DIRECTIVES VIEWPORT
                 ========================================================================= */
              goals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[350px] gap-5 px-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded border border-white/10 bg-violet-500/10 ring-1 ring-violet-500/20">
                    <Target className="h-6 w-6 text-violet-400/70" />
                  </div>
                  <div className="space-y-1.5 select-none">
                    <p className="text-sm font-black text-foreground uppercase tracking-widest font-mono">[NO_TARGETS_STAGED]</p>
                    <p className="text-[10px] text-muted-foreground max-w-[280px]">Add your strategic milstone directives to trace outcome goals.</p>
                  </div>
                  <button
                    onClick={() => setCreateGoalOpen(true)}
                    className="flex items-center justify-center gap-1.5 rounded bg-violet-650 hover:bg-violet-600 text-white px-4 py-2 text-xs font-black tracking-widest transition-all duration-300 active:scale-95 cursor-pointer h-9 shadow-md border-0 uppercase font-mono"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>[Stage goal]</span>
                  </button>
                </div>
              ) : goalsViewMode === 'list' ? (
                <div className="space-y-8 select-none">
                  {/* Linear gradients definitions specifically inside the list view canvas */}
                  <svg className="absolute w-0 h-0">
                    <defs>
                      <linearGradient id="listRadialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Active milestones outcomes */}
                  {activeGoals.length > 0 && (
                    <div>
                      <p className="text-[9.5px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3.5 px-2 select-none">[ACTIVE DIRECTIVES]</p>
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

                  {/* Completed and Cancelled milestones directives */}
                  {completedOrCancelledGoals.length > 0 && (
                    <div className="space-y-3.5 pt-2 select-none">
                      <button
                        type="button"
                        onClick={() => setShowCompletedGoals(!showCompletedGoals)}
                        className="w-full border border-white/10 bg-white/[0.015] hover:bg-white/[0.035] rounded-xl p-3 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-all duration-300 font-black tracking-[0.2em] select-none font-mono shadow-sm"
                      >
                        <span className="flex items-center gap-2 uppercase">
                          <ShieldCheck className="h-4 w-4 text-cyan-400" />
                          [COMPLETED_DIRECTIVES_ARCHIVE] ({completedOrCancelledGoals.length})
                        </span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showCompletedGoals ? "rotate-180 text-cyan-400" : "")} />
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

        </div>

        {/* ─── HUD bottom terminal parameters bar ─── */}
        <div className="h-8.5 border-t border-white/5 bg-white/[0.005] dark:bg-black/35 flex items-center justify-between px-5 text-[9px] font-mono font-bold tracking-widest text-muted-foreground/60 select-none relative z-10 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-cyan-400 select-none animate-pulse">
              <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              HUD_ACTIVE
            </span>
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
            <span className="hidden sm:block">SYS_WORKSPACE: {orgId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-4.5">
            <span>DIRECTIVES: {rootTasks.length}</span>
            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />
            <span className="hidden md:block">VAULT_ARCHIVE: {tasksDoneCount}</span>
            <div className="h-4 w-[1px] bg-white/10 hidden lg:block" />
            <span className="hidden lg:block">SYS_OPERATOR: {actorName.toUpperCase()}</span>
          </div>
        </div>

      </div>

      {/* ─── STAGE DRAWER DRAWER OVERLAYS ─── */}

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
