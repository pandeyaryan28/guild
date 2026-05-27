import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Check, Loader2, Trash2, X,
  ChevronDown, Target, Zap, LayoutGrid,
  Kanban, Eye, EyeOff, MoreHorizontal, Calendar, Folder
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';
import { useTeams } from '../../hooks/useTeams';

import {
  createTask,
  moveTask,
  deleteTask,
  STATUSES,
  PRIORITY_CONFIG
} from '../../lib/tasks';
import { createGoal, updateGoal, deleteGoal } from '../../lib/goals';
import type { Task, TaskStatus, TaskPriority, ActorInfo } from '../../lib/tasks';
import type { Goal } from '../../lib/goals';

import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../components/tasks/GoalDetailDrawer';
import { cn } from '@/lib/utils';

export function GoalsBoardPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // View state
  const [activeView, setActiveView] = React.useState<'list' | 'kanban'>('list');
  const [activeFocus, setActiveFocus] = React.useState<'goals' | 'tasks'>('tasks');

  // Filter State
  const [horizonFilter, setHorizonFilter] = React.useState<'all' | 'short_term' | 'long_term'>('all');
  const [projectFilter, setProjectFilter] = React.useState<'all' | string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<'all' | TaskPriority>('all');

  // Collapsed sections
  const [showArchivedGoals, setShowArchivedGoals] = React.useState(false);
  const [showArchivedTasks, setShowArchivedTasks] = React.useState(false);
  const [showCompletedKanban, setShowCompletedKanban] = React.useState(false);
  const [completedGoalsExpanded, setCompletedGoalsExpanded] = React.useState<Record<string, boolean>>({});

  // Dynamic quick-add goal state
  const [newGoalTitle, setNewGoalTitle] = React.useState('');
  const [newGoalHorizon, setNewGoalHorizon] = React.useState<'short_term' | 'long_term'>('short_term');
  const [newGoalProjectId, setNewGoalProjectId] = React.useState('');
  const [showAddGoalForm, setShowAddGoalForm] = React.useState(false);

  // Inline task inputs mapped by goal id (or 'standalone')
  const [inlineTaskTitles, setInlineTaskTitles] = React.useState<Record<string, string>>({});

  // Inspect drawer states
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);

  // Submitting loader
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Data Subscriptions
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams, loading: teamsLoading } = useTeams(orgId);
  const members = useOrgMembers(orgId);

  const activeTask = React.useMemo(() => {
    if (!selectedTask) return null;
    return tasks.find(t => t.id === selectedTask.id) ?? selectedTask;
  }, [tasks, selectedTask]);

  const activeGoal = React.useMemo(() => {
    if (!selectedGoal) return null;
    return goals.find(g => g.id === selectedGoal.id) ?? selectedGoal;
  }, [goals, selectedGoal]);

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid || '',
    name: userProfile?.fullName || user?.displayName || 'Anonymous',
  }), [user, userProfile]);

  const isLoading = tasksLoading || goalsLoading || projectsLoading || teamsLoading;

  // Compute managed team members UIDs
  const managedTeamMemberUids = React.useMemo(() => {
    const uids = new Set<string>();
    teams.forEach(t => {
      if (t.managerId === user?.uid) {
        t.memberIds.forEach(id => uids.add(id));
      }
    });
    return uids;
  }, [teams, user?.uid]);

  // Apply strict filtering scoping rules + active UI filters
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      // 1. Precise Logic Scope:
      const isAssignedToMe = t.assigneeIds.includes(user?.uid || '');
      const isAssignedByMe = t.creatorId === user?.uid; // created / assigned to others by me

      // Check if task assignee is in a team managed by me
      const isManagedTeamTask = teams.some(team => 
        team.managerId === user?.uid && 
        t.assigneeIds.some(uid => team.memberIds.includes(uid))
      );

      if (!isAssignedToMe && !isAssignedByMe && !isManagedTeamTask) {
        return false;
      }

      // 2. UI Filter Criteria
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, teams, user?.uid, projectFilter, priorityFilter]);

  const filteredGoals = React.useMemo(() => {
    return goals.filter((g) => {
      if (horizonFilter !== 'all' && g.horizon !== horizonFilter) return false;
      if (projectFilter !== 'all' && g.projectId !== projectFilter) return false;
      return true;
    });
  }, [goals, horizonFilter, projectFilter]);

  // Goal segments
  const activeGoalsList = React.useMemo(() => {
    return filteredGoals.filter(g => g.status !== 'completed' && g.status !== 'cancelled');
  }, [filteredGoals]);

  const completedGoalsList = React.useMemo(() => {
    return filteredGoals.filter(g => g.status === 'completed');
  }, [filteredGoals]);

  // Tasks segments
  const activeTasksList = React.useMemo(() => {
    return filteredTasks.filter(t => t.status !== 'done');
  }, [filteredTasks]);

  const completedTasksList = React.useMemo(() => {
    return filteredTasks.filter(t => t.status === 'done');
  }, [filteredTasks]);

  // Inline quick task submit
  const handleInlineTaskSubmit = async (e: React.FormEvent, goalId: string | null) => {
    e.preventDefault();
    const key = goalId || 'standalone';
    const titleText = inlineTaskTitles[key]?.trim();
    if (!titleText || !orgId) return;

    setInlineTaskTitles(prev => ({ ...prev, [key]: '' }));

    try {
      await createTask({
        orgId,
        title: titleText,
        description: '',
        priority: 'none',
        projectId: goalId ? (goals.find(g => g.id === goalId)?.projectId || null) : null,
        goalId: goalId,
        assigneeIds: [actor.uid],
        dueDate: null,
        actor
      });
    } catch (err) {
      console.error('Failed to create inline task:', err);
    }
  };

  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !orgId) return;
    setIsSubmitting(true);
    try {
      await createGoal({
        orgId,
        title: newGoalTitle.trim(),
        description: '',
        targetDate: null,
        horizon: newGoalHorizon,
        projectId: newGoalProjectId || null,
        ownerId: actor.uid,
        actor
      });
      setNewGoalTitle('');
      setNewGoalProjectId('');
      setShowAddGoalForm(false);
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!orgId) return;
    const oldStatus = task.status;
    const newStatus: TaskStatus = oldStatus === 'done' ? 'todo' : 'done';
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, oldStatus, actor);
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const handleUpdateTaskStatus = async (task: Task, newStatus: TaskStatus) => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, task.status, actor);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleDeleteTaskItem = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (confirm('Delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const handleDeleteGoalItem = async (e: React.MouseEvent, goalId: string) => {
    e.stopPropagation();
    if (confirm('Delete this goal? associated tasks will be unlinked.')) {
      try {
        await deleteGoal(goalId);
      } catch (err) {
        console.error('Failed to delete goal:', err);
      }
    }
  };

  const handleToggleGoalStatus = async (e: React.MouseEvent, goal: Goal) => {
    e.stopPropagation();
    const nextStatus = goal.status === 'completed' ? 'active' : 'completed';
    try {
      await updateGoal(goal.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to toggle goal status:', err);
    }
  };

  const toggleGoalCompletedTasks = (goalId: string) => {
    setCompletedGoalsExpanded(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const getPriorityLabel = (p: TaskPriority) => {
    if (p === 'urgent') return 'Urgent';
    if (p === 'high') return 'High';
    if (p === 'medium') return 'Medium';
    if (p === 'low') return 'Low';
    return '';
  };

  const getPriorityColors = (p: TaskPriority) => {
    if (p === 'urgent') return 'text-red-500 border-red-500/15 bg-red-500/5';
    if (p === 'high') return 'text-amber-500 border-amber-500/15 bg-amber-500/5';
    if (p === 'medium') return 'text-indigo-500 border-indigo-500/15 bg-indigo-500/5';
    if (p === 'low') return 'text-cyan-500 border-cyan-500/15 bg-cyan-500/5';
    return 'text-neutral-400 border-neutral-200/50 dark:border-neutral-800/40 bg-neutral-50/5';
  };

  const getTaskStatusLabel = (s: TaskStatus) => {
    if (s === 'todo') return 'Todo';
    if (s === 'in_progress') return 'In Progress';
    if (s === 'review') return 'Review';
    if (s === 'done') return 'Completed';
    return s;
  };

  const getTaskStatusColor = (s: TaskStatus) => {
    if (s === 'todo') return 'bg-neutral-100 text-neutral-500 border-neutral-200/55 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700/60';
    if (s === 'in_progress') return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    if (s === 'review') return 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20';
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  };

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-semibold">
        No organization context found. Please ensure you are logged in.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent select-none">
      
      {/* ─── Premium Header ─── */}
      <div className="border-b border-neutral-100 dark:border-neutral-850 shrink-0 bg-white/20 dark:bg-neutral-900/[0.01] backdrop-blur-xl">
        <div className={`mx-auto w-full px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${activeView === 'list' ? 'max-w-5xl' : 'max-w-none'}`}>
          <div>
            <h1 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">Goals & Tasks Board</h1>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-550 font-bold uppercase mt-0.5 tracking-wider">
              Workspace coordination & milestones
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Focus toggle */}
            <div className="flex items-center gap-0.5 bg-neutral-100/50 dark:bg-neutral-850/30 border border-neutral-200 dark:border-neutral-800 p-0.5 rounded-xl shadow-inner">
              <button
                onClick={() => { setActiveFocus('goals'); setActiveView('list'); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  activeFocus === 'goals'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                )}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Goals Focus</span>
              </button>
              <button
                onClick={() => setActiveFocus('tasks')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  activeFocus === 'tasks'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Tasks Focus</span>
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center gap-0.5 bg-neutral-100/50 dark:bg-neutral-850/30 border border-neutral-200 dark:border-neutral-800 p-0.5 rounded-xl shadow-inner">
              <button
                onClick={() => setActiveView('list')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  activeView === 'list'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setActiveView('kanban')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  activeView === 'kanban'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                )}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            {/* New Goal CTA */}
            {activeFocus === 'goals' && (
              <button
                onClick={() => setShowAddGoalForm(!showAddGoalForm)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-md bg-accent"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Goal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Premium Filter Bar ─── */}
      <div className="border-b border-neutral-100 dark:border-neutral-850 bg-neutral-50/30 dark:bg-neutral-900/[0.003] shrink-0 text-xs py-3.5">
        <div className={`mx-auto w-full px-6 flex flex-wrap items-center gap-6 transition-all duration-300 ${activeView === 'list' ? 'max-w-5xl' : 'max-w-none'}`}>
          
          {activeFocus === 'goals' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wide">Horizon:</span>
              <select
                value={horizonFilter}
                onChange={(e: any) => setHorizonFilter(e.target.value)}
                className="bg-transparent text-neutral-700 dark:text-neutral-300 font-bold border-none outline-none cursor-pointer focus:text-neutral-900"
              >
                <option value="all">All Horizons</option>
                <option value="short_term">Short Term</option>
                <option value="long_term">Long Term</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wide">Project:</span>
            <select
              value={projectFilter}
              onChange={(e: any) => setProjectFilter(e.target.value)}
              className="bg-transparent text-neutral-700 dark:text-neutral-300 font-bold border-none outline-none cursor-pointer focus:text-neutral-900 max-w-[200px]"
            >
              <option value="all">All Projects</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>

          {activeFocus === 'tasks' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wide">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e: any) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-neutral-700 dark:text-neutral-300 font-bold border-none outline-none cursor-pointer focus:text-neutral-900"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">None</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ─── Premium Creation Slide-Over ─── */}
      <AnimatePresence>
        {showAddGoalForm && activeFocus === 'goals' && (
          <>
            {/* Drawer Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddGoalForm(false)}
              className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/40 backdrop-blur-xs z-40"
            />
            {/* Goal Creation Right Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col h-full overflow-hidden p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                  New Strategic Goal
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddGoalForm(false)}
                  className="p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGoalSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Goal Focus Title</label>
                    <input
                      type="text"
                      required
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 text-xs text-foreground outline-none placeholder:text-neutral-400 focus:border-accent/40 font-semibold"
                      placeholder="High-level objective focus..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Chronology Horizon</label>
                    <select
                      value={newGoalHorizon}
                      onChange={(e: any) => setNewGoalHorizon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-bold"
                    >
                      <option value="short_term">Short Term (Weekly/Monthly)</option>
                      <option value="long_term">Long Term (Quarterly/Annual)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Project Initiative</label>
                    <select
                      value={newGoalProjectId}
                      onChange={(e) => setNewGoalProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-bold"
                    >
                      <option value="">None (Standalone Goal)</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.id}>{proj.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setShowAddGoalForm(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newGoalTitle.trim()}
                    className="flex-1 px-4 py-3 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Content Canvas ─── */}
      <div className="flex-grow overflow-y-auto aether-scroll">
        <div className={`mx-auto w-full px-6 py-6 transition-all duration-300 ${activeView === 'list' ? 'max-w-5xl' : 'max-w-none'}`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-accent" style={{ color: 'var(--accent)' }} />
              <p className="text-[10px] text-neutral-400 dark:text-neutral-550 font-bold uppercase tracking-wider animate-pulse">Loading directory context...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              
              {/* ================================================================= */}
              {/* LIST VIEW                                                         */}
              {/* ================================================================= */}
              {activeView === 'list' && (
                <motion.div
                  key="list-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  
                  {/* --- GOALS TRACK --- */}
                  {activeFocus === 'goals' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                          <Target className="w-4 h-4 text-cyan-500 drop-shadow-[0_0_2px_rgba(6,182,212,0.2)]" />
                          <span>Active Objectives ({activeGoalsList.length})</span>
                        </h3>

                        {activeGoalsList.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeGoalsList.map(goal => {
                              const goalTasks = filteredTasks.filter(t => t.goalId === goal.id);
                              const activeGoalTasks = goalTasks.filter(t => t.status !== 'done');
                              const completedGoalTasks = goalTasks.filter(t => t.status === 'done');
                              const progress = goal.progressRollup ?? 0;
                              const linkedProj = projects.find(p => p.id === goal.projectId);
                              const isCompletedExpanded = !!completedGoalsExpanded[goal.id];

                              return (
                                <div
                                  key={goal.id}
                                  onClick={() => setSelectedGoal(goal)}
                                  className="bg-neutral-50/30 dark:bg-neutral-900/10 border border-neutral-200/50 dark:border-neutral-850/50 hover:border-cyan-500/35 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 rounded-2xl p-5 space-y-4 shadow-sm transition-all duration-300 flex flex-col justify-between cursor-pointer"
                                >
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-100 dark:border-neutral-800/80 text-cyan-600 dark:text-cyan-400 bg-cyan-500/[0.04]">
                                        {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                      </span>
                                      {linkedProj && (
                                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-100 dark:border-neutral-800/80 text-indigo-500 dark:text-indigo-400 bg-indigo-500/[0.04]">
                                          {linkedProj.name}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <button
                                          type="button"
                                          onClick={(e) => handleToggleGoalStatus(e, goal)}
                                          className="h-4.5 w-4.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-cyan-500 flex items-center justify-center shrink-0 cursor-pointer bg-white dark:bg-neutral-900 transition-colors"
                                          title="Complete Goal"
                                        >
                                          <div className="h-2 w-2 rounded-full bg-transparent hover:bg-cyan-500" />
                                        </button>
                                        <h4 className="text-xs font-bold text-neutral-850 dark:text-neutral-150 truncate">
                                          {goal.title}
                                        </h4>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 shrink-0 opacity-100 md:opacity-0 hover:opacity-100 group-hover:opacity-100">
                                        <button
                                          onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                          className="text-neutral-400 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Progress track */}
                                    <div className="space-y-1 pt-1">
                                      <div className="flex justify-between text-[8px] text-neutral-400 font-bold uppercase">
                                        <span>Completion progress</span>
                                        <span>{progress}% ({completedGoalTasks.length}/{goalTasks.length} tasks)</span>
                                      </div>
                                      <div className="w-full bg-neutral-150 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden shadow-inner">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{
                                            width: `${progress}%`,
                                            background: `linear-gradient(90deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {/* Active Checklist list */}
                                    <div className="space-y-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-850/60">
                                      {activeGoalTasks.slice(0, 3).map(task => (
                                        <div
                                          key={task.id}
                                          onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                          className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-100/30 dark:bg-neutral-850/10 border border-neutral-100/40 dark:border-neutral-850/30 hover:border-accent/30 transition-all group"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <button
                                              type="button"
                                              onClick={(e) => handleToggleTaskStatus(e, task)}
                                              className="h-4.5 w-4.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center shrink-0 cursor-pointer hover:border-accent"
                                            >
                                              <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                                            </button>
                                            <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-250 truncate">
                                              {task.title}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                            className="text-neutral-400 hover:text-red-400 transition-colors p-0.5 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}

                                      {goalTasks.length > 3 && (
                                        <div className="text-[9px] text-neutral-400 font-bold pl-1 uppercase tracking-wide">
                                          + {goalTasks.length - 3} more tasks linked
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick Inline form */}
                                  <form
                                    onSubmit={(e) => handleInlineTaskSubmit(e, goal.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-850/60 flex gap-2"
                                  >
                                    <input
                                      type="text"
                                      placeholder="Add task to objective..."
                                      value={inlineTaskTitles[goal.id] || ''}
                                      onChange={(e) => setInlineTaskTitles(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                      className="flex-grow bg-neutral-100/40 dark:bg-neutral-850/15 border border-neutral-200/50 dark:border-neutral-800/80 rounded-xl px-3 py-2 text-[11px] text-foreground placeholder:text-neutral-400 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:border-accent/40 shadow-inner font-semibold"
                                    />
                                    <button
                                      type="submit"
                                      className="px-2.5 py-2 bg-neutral-150/40 hover:bg-neutral-200/50 border border-neutral-200/50 dark:border-neutral-800/85 rounded-xl hover:text-foreground text-neutral-500 transition-all cursor-pointer shadow-sm"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </form>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-12 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center text-center bg-neutral-50/10 dark:bg-neutral-900/5 shadow-inner">
                            <p className="text-xs text-neutral-400 italic">No active objectives match filters.</p>
                          </div>
                        )}
                      </div>

                      {/* Archived Goals Accordion */}
                      <div className="pt-6 border-t border-neutral-100 dark:border-neutral-850 space-y-4">
                        <button
                          type="button"
                          onClick={() => setShowArchivedGoals(!showArchivedGoals)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-800 hover:border-accent/20 transition-all font-bold text-[10px] text-neutral-400 uppercase tracking-widest cursor-pointer shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            {showArchivedGoals ? <EyeOff className="w-4 h-4 text-cyan-500" /> : <Eye className="w-4 h-4 text-cyan-500" />}
                            <span>Archived Completed Goals ({completedGoalsList.length})</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showArchivedGoals ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showArchivedGoals && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-3 pt-2"
                            >
                              {completedGoalsList.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {completedGoalsList.map(goal => (
                                    <div 
                                      key={goal.id} 
                                      onClick={() => setSelectedGoal(goal)}
                                      className="bg-neutral-50/20 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-4.5 opacity-65 hover:opacity-95 hover:border-cyan-500/20 transition-all shadow-sm cursor-pointer"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <button
                                            type="button"
                                            onClick={(e) => handleToggleGoalStatus(e, goal)}
                                            className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                                          >
                                            <Check className="w-2.5 h-2.5 text-cyan-500" />
                                          </button>
                                          <h5 className="text-[11px] font-bold text-neutral-500 dark:text-neutral-500 line-through decoration-cyan-500/40 truncate flex-1 select-text">
                                            {goal.title}
                                          </h5>
                                        </div>
                                        <button
                                          onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                          className="text-neutral-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-neutral-400 italic text-center py-6">No completed goals found.</p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* --- TASKS TRACK --- */}
                  {activeFocus === 'tasks' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.2)]" />
                          <span>Active Workspace Tasks ({activeTasksList.length})</span>
                        </h3>

                        <div className="bg-neutral-50/20 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-5 space-y-4 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-800 transition-all duration-300">
                          {/* Inline Task creation */}
                          <form
                            onSubmit={(e) => handleInlineTaskSubmit(e, null)}
                            className="flex gap-2 max-w-md pb-4 border-b border-neutral-100 dark:border-neutral-850/65"
                          >
                            <input
                              type="text"
                              placeholder="Create a new task..."
                              value={inlineTaskTitles['standalone'] || ''}
                              onChange={(e) => setInlineTaskTitles(prev => ({ ...prev, standalone: e.target.value }))}
                              className="flex-1 bg-neutral-100/40 dark:bg-neutral-850/15 border border-neutral-200/50 dark:border-neutral-800/80 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-neutral-400 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:border-accent/40 shadow-inner font-semibold"
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-neutral-150/40 hover:bg-neutral-200/50 border border-neutral-200/50 dark:border-neutral-800/85 rounded-xl text-neutral-500 hover:text-foreground transition-all flex items-center gap-1 cursor-pointer text-[10px] font-black uppercase tracking-wide shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Task</span>
                            </button>
                          </form>

                          {activeTasksList.length > 0 ? (
                            <div className="space-y-2.5">
                              {activeTasksList.map(task => {
                                const linkedProj = projects.find(p => p.id === task.projectId);
                                const linkedGoal = goals.find(g => g.id === task.goalId);

                                return (
                                  <div
                                    key={task.id}
                                    onClick={() => setSelectedTask(task)}
                                    className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50/40 dark:bg-neutral-900/10 border border-neutral-150/50 dark:border-neutral-850/40 hover:border-accent/30 hover:bg-neutral-50/70 dark:hover:bg-neutral-900/20 transition-all duration-300 group shadow-sm cursor-pointer"
                                  >
                                    <div className="flex flex-wrap items-center gap-3 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleTaskStatus(e, task)}
                                        className="h-4.5 w-4.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                      >
                                        <div className="h-1.5 w-1.5 rounded-full bg-transparent hover:bg-accent/40" />
                                      </button>
                                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate select-text">
                                        {task.title}
                                      </span>
                                      
                                      {/* Project context tag */}
                                      {linkedProj && (
                                        <span className="text-[8px] font-bold px-2 py-0.5 rounded border border-indigo-500/10 text-indigo-500 bg-indigo-500/5">
                                          {linkedProj.name}
                                        </span>
                                      )}

                                      {/* Goal context tag */}
                                      {linkedGoal && (
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); setSelectedGoal(linkedGoal); }}
                                          className="text-[8px] font-bold px-2 py-0.5 rounded border border-cyan-500/10 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 cursor-pointer hover:bg-cyan-500/10"
                                        >
                                          Goal: {linkedGoal.title}
                                        </span>
                                      )}

                                      {/* Priority Tag */}
                                      {task.priority !== 'none' && (
                                        <span className={cn("text-[8px] font-bold px-2 py-0.5 rounded border", getPriorityColors(task.priority))}>
                                          {getPriorityLabel(task.priority)}
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                      className="text-neutral-400 hover:text-red-400 transition-colors p-1 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400 italic py-2">No active tasks match current filters.</p>
                          )}
                        </div>
                      </div>

                      {/* Archived Tasks Accordion */}
                      <div className="pt-6 border-t border-neutral-100 dark:border-neutral-850 space-y-4">
                        <button
                          type="button"
                          onClick={() => setShowArchivedTasks(!showArchivedTasks)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-800 hover:border-accent/20 transition-all font-bold text-[10px] text-neutral-400 uppercase tracking-widest cursor-pointer shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            {showArchivedTasks ? <EyeOff className="w-4 h-4 text-cyan-500" /> : <Eye className="w-4 h-4 text-cyan-500" />}
                            <span>Archived Completed Tasks ({completedTasksList.length})</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showArchivedTasks ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showArchivedTasks && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-2 pt-2"
                            >
                              {completedTasksList.length > 0 ? (
                                <div className="bg-neutral-50/20 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-4 space-y-2 shadow-inner">
                                  {completedTasksList.map(task => (
                                    <div
                                      key={task.id}
                                      onClick={() => setSelectedTask(task)}
                                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/30 dark:bg-neutral-900/10 border border-neutral-150/40 dark:border-neutral-850/30 opacity-60 hover:opacity-90 hover:border-cyan-500/20 transition-opacity shadow-sm cursor-pointer animate-none"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <button
                                          type="button"
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                                        >
                                          <Check className="w-2.5 h-2.5 text-cyan-500" />
                                        </button>
                                        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-500 line-through decoration-cyan-500/40 truncate select-text">
                                          {task.title}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                        className="text-neutral-400 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-neutral-400 italic text-center py-6">No completed tasks found.</p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}

              {/* ================================================================= */}
              {/* KANBAN VIEW                                                       */}
              {/* ================================================================= */}
              {activeView === 'kanban' && (
                <motion.div
                  key="kanban-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {['todo', 'in_progress', 'review'].map(colStatus => {
                      const colTasks = filteredTasks.filter(t => {
                        if (t.status !== colStatus) return false;
                        if (t.goalId) {
                          const parentGoal = goals.find(g => g.id === t.goalId);
                          if (parentGoal && parentGoal.status === 'completed') return false;
                        }
                        return true;
                      });

                      let colTitle = '';
                      let colColor = '';
                      if (colStatus === 'todo') { colTitle = 'To Do'; colColor = 'text-neutral-500 border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-400'; }
                      else if (colStatus === 'in_progress') { colTitle = 'In Progress'; colColor = 'text-cyan-500 border-cyan-500/20 bg-cyan-500/5 dark:text-cyan-400'; }
                      else if (colStatus === 'review') { colTitle = 'In Review'; colColor = 'text-indigo-500 border-indigo-500/20 bg-indigo-500/5 dark:text-indigo-400'; }

                      return (
                        <div
                          key={colStatus}
                          className="bg-neutral-50/20 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-4 flex flex-col min-h-[480px] gap-4 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-800 transition-colors"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-850 shrink-0">
                            <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border", colColor)}>
                              {colTitle}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-850/50 rounded-lg px-2 py-0.5 border border-neutral-200/40 dark:border-neutral-800/40">
                              {colTasks.length}
                            </span>
                          </div>

                          <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] scrollbar-thin pr-1">
                            {colTasks.map(task => {
                              const parentGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
                              const parentProject = task.projectId ? projects.find(p => p.id === task.projectId) : null;

                              return (
                                <div
                                  key={task.id}
                                  onClick={() => setSelectedTask(task)}
                                  className="bg-white dark:bg-neutral-900/70 border border-neutral-150 dark:border-neutral-850/50 hover:border-accent/40 rounded-2xl p-4.5 space-y-3 transition-all duration-300 shadow-sm relative group cursor-pointer"
                                >
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {parentProject && (
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/10 text-indigo-500 bg-indigo-500/5 truncate max-w-[120px]">
                                          {parentProject.name}
                                        </span>
                                      )}
                                      {parentGoal && (
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); setSelectedGoal(parentGoal); }}
                                          className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/10 text-cyan-500 dark:text-cyan-455 bg-cyan-500/5 truncate max-w-[120px] cursor-pointer hover:bg-cyan-500/10"
                                        >
                                          Goal: {parentGoal.title}
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="text-xs font-bold text-neutral-850 dark:text-neutral-200 leading-snug break-words">
                                      {task.title}
                                    </h5>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-850/50 text-[9px] text-neutral-400 font-bold uppercase tracking-wide">
                                    {task.priority !== 'none' ? (
                                      <span className={cn("px-1.5 py-0.5 rounded border", getPriorityColors(task.priority))}>
                                        {getPriorityLabel(task.priority)}
                                      </span>
                                    ) : (
                                      <span />
                                    )}

                                    {/* Action dropdown and transitions */}
                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      {/* Dropdown status changer instead ofTD, IP, RV buttons */}
                                      <select
                                        value={task.status}
                                        onChange={(e) => handleUpdateTaskStatus(task, e.target.value as TaskStatus)}
                                        className="h-5.5 px-2 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[8px] font-bold text-neutral-600 dark:text-neutral-300 outline-none cursor-pointer"
                                      >
                                        <option value="todo">Todo</option>
                                        <option value="in_progress">Working</option>
                                        <option value="review">Review</option>
                                        <option value="done">Completed</option>
                                      </select>
                                      
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'done'); }}
                                        className="h-5.5 px-2 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-500 bg-emerald-500/5 rounded-lg text-[8px] font-bold cursor-pointer"
                                        title="Complete"
                                      >
                                        DONE
                                      </button>
                                      
                                      <button
                                        onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                        className="h-5.5 w-5.5 border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg flex items-center justify-center transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {colTasks.length === 0 && (
                              <div className="h-28 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center text-center bg-neutral-50/10 dark:bg-neutral-900/5 shadow-inner">
                                <p className="text-[10px] text-neutral-400 italic">Empty</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Completed Kanban Tasks bottom archive */}
                  <div className="pt-6 border-t border-neutral-100 dark:border-neutral-850 space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowCompletedKanban(!showCompletedKanban)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-800 hover:border-accent/20 transition-all font-bold text-[10px] text-neutral-400 uppercase tracking-widest cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        {showCompletedKanban ? <EyeOff className="w-4 h-4 text-emerald-500" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                        <span>Completed Kanban Tasks ({completedTasksList.length})</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showCompletedKanban ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showCompletedKanban && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2 pt-2"
                        >
                          {completedTasksList.length > 0 ? (
                            <div className="bg-neutral-50/20 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-4 space-y-2 shadow-inner">
                              {completedTasksList.map(task => (
                                <div
                                  key={task.id}
                                  onClick={() => setSelectedTask(task)}
                                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/30 dark:bg-neutral-900/10 border border-neutral-150/40 dark:border-neutral-850/30 opacity-60 hover:opacity-90 hover:border-cyan-500/20 transition-opacity shadow-sm cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleTaskStatus(e, task)}
                                      className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                                    >
                                      <Check className="w-2.5 h-2.5 text-cyan-500" />
                                    </button>
                                    <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-550 line-through decoration-cyan-500/40 truncate select-text">
                                      {task.title}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                    className="text-neutral-400 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400 italic text-center py-6">No completed tasks found.</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ─── Task Inspect & Goal Inspect Drawers ─── */}
      <TaskDetailDrawer
        task={activeTask}
        onClose={() => setSelectedTask(null)}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={projects}
        goals={goals}
      />

      <GoalDetailDrawer
        goal={activeGoal}
        onClose={() => setSelectedGoal(null)}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={projects}
        tasks={tasks}
        onSelectTask={(task) => {
          setSelectedGoal(null);
          setSelectedTask(task);
        }}
      />

    </div>
  );
}
