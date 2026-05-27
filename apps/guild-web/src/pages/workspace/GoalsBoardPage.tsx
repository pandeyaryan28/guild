import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Check, Loader2, Trash2, X,
  ChevronDown, Target, Zap, LayoutGrid,
  Kanban, Eye, EyeOff
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';

import {
  createTask,
  moveTask,
  deleteTask,
  STATUSES
} from '../../lib/tasks';
import { createGoal, updateGoal, deleteGoal } from '../../lib/goals';
import type { Task, TaskStatus, TaskPriority, ActorInfo } from '../../lib/tasks';
import type { Goal } from '../../lib/goals';

export function GoalsBoardPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Layout View toggle: 'list' or 'kanban'
  const [activeView, setActiveView] = React.useState<'list' | 'kanban'>('list');

  // Content Focus toggle: 'tasks' as the default
  const [activeFocus, setActiveFocus] = React.useState<'goals' | 'tasks'>('tasks');

  // Filters State
  const [horizonFilter, setHorizonFilter] = React.useState<'all' | 'short_term' | 'long_term'>('all');
  const [projectFilter, setProjectFilter] = React.useState<'all' | string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<'all' | TaskPriority>('all');

  // Collapsed states for completed items
  const [showArchivedGoals, setShowArchivedGoals] = React.useState(false);
  const [showArchivedTasks, setShowArchivedTasks] = React.useState(false);
  const [showCompletedKanban, setShowCompletedKanban] = React.useState(false);
  const [completedGoalsExpanded, setCompletedGoalsExpanded] = React.useState<Record<string, boolean>>({});

  // Dynamic quick-add state
  const [newGoalTitle, setNewGoalTitle] = React.useState('');
  const [newGoalHorizon, setNewGoalHorizon] = React.useState<'short_term' | 'long_term'>('short_term');
  const [newGoalProjectId, setNewGoalProjectId] = React.useState('');
  const [showAddGoalForm, setShowAddGoalForm] = React.useState(false);

  // Inline task inputs mapped by goal id (or 'standalone')
  const [inlineTaskTitles, setInlineTaskTitles] = React.useState<Record<string, string>>({});

  // Submitting loaders
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Subscriptions
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const members = useOrgMembers(orgId);

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid || '',
    name: userProfile?.fullName || user?.displayName || 'Anonymous',
  }), [user, userProfile]);

  const isLoading = tasksLoading || goalsLoading || projectsLoading;

  // Filter criteria application
  const filteredGoals = React.useMemo(() => {
    return goals.filter((g) => {
      if (horizonFilter !== 'all' && g.horizon !== horizonFilter) return false;
      if (projectFilter !== 'all' && g.projectId !== projectFilter) return false;
      return true;
    });
  }, [goals, horizonFilter, projectFilter]);

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, projectFilter, priorityFilter]);

  // Segmenting items
  const activeGoalsList = React.useMemo(() => {
    return filteredGoals.filter(g => g.status !== 'completed' && g.status !== 'cancelled');
  }, [filteredGoals]);

  const completedGoalsList = React.useMemo(() => {
    return filteredGoals.filter(g => g.status === 'completed');
  }, [filteredGoals]);

  // Tasks segmentations
  const activeTasksList = React.useMemo(() => {
    return filteredTasks.filter(t => t.status !== 'done');
  }, [filteredTasks]);

  const completedTasksList = React.useMemo(() => {
    return filteredTasks.filter(t => t.status === 'done');
  }, [filteredTasks]);

  // Inline Quick creation submits
  const handleInlineTaskSubmit = async (e: React.FormEvent, goalId: string | null) => {
    e.preventDefault();
    const key = goalId || 'standalone';
    const titleText = inlineTaskTitles[key]?.trim();
    if (!titleText || !orgId) return;

    // Reset input immediately
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
    if (confirm('Delete this goal? linked tasks will be unlinked.')) {
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
    if (p === 'urgent') return 'text-red-400 border-red-500/20 bg-red-500/5';
    if (p === 'high') return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    if (p === 'medium') return 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5';
    if (p === 'low') return 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5';
    return 'text-muted-foreground border-white/5 bg-white/2';
  };

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-semibold">
        No organization context found. Please ensure you are logged in.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      
      {/* ─── Centered Page Header (More transparent glass dock) ─── */}
      <div className="border-b border-border-default/40 dark:border-white/10 shrink-0 bg-surface/20 dark:bg-white/[0.01] backdrop-blur-xl">
        <div className={`mx-auto w-full px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${activeView === 'list' ? 'max-w-5xl' : 'max-w-none'}`}>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Goals & Tasks Board</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Goals vs Tasks Focus Toggle */}
            <div className="flex items-center gap-1 bg-surface/20 dark:bg-white/[0.02] border border-border-default/60 dark:border-white/10 p-1 rounded-xl shadow-inner backdrop-blur-xl">
              <button
                onClick={() => { setActiveFocus('goals'); setActiveView('list'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFocus === 'goals' 
                    ? 'bg-white/15 dark:bg-white/10 border border-white/20 dark:border-white/10 text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Goals</span>
              </button>
              <button
                onClick={() => setActiveFocus('tasks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFocus === 'tasks' 
                    ? 'bg-white/15 dark:bg-white/10 border border-white/20 dark:border-white/10 text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Tasks</span>
              </button>
            </div>

            {/* Layout View Toggle */}
            <div className="flex items-center gap-1 bg-surface/20 dark:bg-white/[0.02] border border-border-default/60 dark:border-white/10 p-1 rounded-xl shadow-inner backdrop-blur-xl">
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'list' 
                    ? 'bg-white/15 dark:bg-white/10 border border-white/20 dark:border-white/10 text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setActiveView('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'kanban' 
                    ? 'bg-white/15 dark:bg-white/10 border border-white/20 dark:border-white/10 text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            {/* New Goal Trigger */}
            {activeFocus === 'goals' && (
              <button
                onClick={() => setShowAddGoalForm(!showAddGoalForm)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
                style={{
                  background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`,
                  boxShadow: `0 4px 12px oklch(from var(--accent) l c h / 15%)`
                }}
              >
                <Plus className="w-4 h-4" />
                <span>New Goal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Centered Global Filters Bar ─── */}
      <div className="border-b border-border-default/40 dark:border-white/10 bg-surface/10 dark:bg-white/[0.005] shrink-0 text-xs">
        <div className={`mx-auto w-full px-6 py-3 flex flex-wrap items-center gap-4 transition-all duration-300 ${activeView === 'list' ? 'max-w-5xl' : 'max-w-none'}`}>
          
          {/* Horizon Filter - Goals Only */}
          {activeFocus === 'goals' && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">Horizon:</span>
              <select
                value={horizonFilter}
                onChange={(e: any) => setHorizonFilter(e.target.value)}
                className="bg-surface/20 dark:bg-white/[0.02] backdrop-blur-xl border border-border-default/60 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40"
              >
                <option value="all">All Horizons</option>
                <option value="short_term">Short Term</option>
                <option value="long_term">Long Term</option>
              </select>
            </div>
          )}

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-semibold">Project:</span>
            <select
              value={projectFilter}
              onChange={(e: any) => setProjectFilter(e.target.value)}
              className="bg-surface/20 dark:bg-white/[0.02] backdrop-blur-xl border border-border-default/60 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 max-w-[200px]"
            >
              <option value="all">All Projects</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter - Tasks Only */}
          {activeFocus === 'tasks' && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e: any) => setPriorityFilter(e.target.value)}
                className="bg-surface/20 dark:bg-white/[0.02] backdrop-blur-xl border border-border-default/60 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40"
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

      {/* ─── Centered Creation Forms Panel ─── */}
      <AnimatePresence>
        {showAddGoalForm && activeFocus === 'goals' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border-default/40 dark:border-white/10 bg-surface/10 dark:bg-white/[0.01] backdrop-blur-xl"
          >
            <div className={`mx-auto w-full px-6 py-6 transition-all duration-300 ${activeView === 'list' ? 'max-w-5xl' : 'max-w-none'}`}>
              <form onSubmit={handleCreateGoalSubmit} className="max-w-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border-default/60 dark:border-white/10">
                  <span className="text-xs font-bold text-foreground">Add New Strategic Goal</span>
                  <button
                    type="button"
                    onClick={() => setShowAddGoalForm(false)}
                    className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Goal Title</label>
                    <input
                      type="text"
                      required
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border-default/60 dark:border-white/10 bg-surface/20 dark:bg-white/[0.02] text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/40"
                      placeholder="Describe high-level objective..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Horizon</label>
                    <select
                      value={newGoalHorizon}
                      onChange={(e: any) => setNewGoalHorizon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border-default/60 dark:border-white/10 bg-surface/20 dark:bg-white/[0.02] text-xs text-foreground outline-none cursor-pointer focus:border-accent/40"
                    >
                      <option value="short_term">Short Term (Weekly/Monthly)</option>
                      <option value="long_term">Long Term (Quarterly/Annual)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Associated Project (Optional)</label>
                    <select
                      value={newGoalProjectId}
                      onChange={(e) => setNewGoalProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border-default/60 dark:border-white/10 bg-surface/20 dark:bg-white/[0.02] text-xs text-foreground outline-none cursor-pointer focus:border-accent/40"
                    >
                      <option value="">None (Standalone Goal)</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.id}>{proj.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddGoalForm(false)}
                    className="px-4 py-2 rounded-xl border border-border-default/60 dark:border-white/10 text-xs font-semibold text-muted-foreground hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                    }}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content Canvas ─── */}
      <div className="flex-grow overflow-y-auto aether-scroll">
        {/* Dynamic centered wrapper: max-w-3xl for focused List View, max-w-none for fully wide fluid Kanban Board columns */}
        <div className={`mx-auto w-full px-6 py-8 transition-all duration-300 ${activeView === 'list' ? 'max-w-3xl' : 'max-w-none'}`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent" style={{ color: 'var(--accent)' }} />
              <p className="text-xs text-muted-foreground font-semibold">Loading directory information...</p>
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
                  
                  {/* --- GOALS FOCUS TRACK --- */}
                  {activeFocus === 'goals' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                          <Target className="w-4 h-4 text-cyan-400" />
                          <span>Active Goals ({activeGoalsList.length})</span>
                        </h3>

                        {activeGoalsList.length > 0 ? (
                          <div className="grid grid-cols-1 gap-6">
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
                                  className="bg-surface/20 dark:bg-white/[0.03] backdrop-blur-xl border border-border-default/40 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-xl hover:border-accent/40 dark:hover:border-white/20 transition-all duration-300 flex flex-col justify-between"
                                >
                                  <div className="space-y-3.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-border-default/80 dark:border-white/15 text-cyan-500 dark:text-cyan-400 bg-cyan-500/5">
                                        {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                      </span>
                                      {linkedProj && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-border-default/80 dark:border-white/15 text-indigo-500 dark:text-indigo-400 bg-indigo-500/5">
                                          Project: {linkedProj.name}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <button
                                          type="button"
                                          onClick={(e) => handleToggleGoalStatus(e, goal)}
                                          className="h-4.5 w-4.5 rounded-full border border-border-strong hover:border-cyan-400 dark:border-white/20 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                          title="Mark Goal Completed"
                                        >
                                          <div className="h-2 w-2 rounded-full bg-transparent hover:bg-cyan-400" />
                                        </button>
                                        <h4 className="text-sm font-bold text-foreground truncate select-text">
                                          {goal.title}
                                        </h4>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                          className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                        <span>Goal Progress Rollup</span>
                                        <span>{progress}% ({completedGoalTasks.length}/{goalTasks.length} completed)</span>
                                      </div>
                                      <div className="w-full bg-surface/20 dark:bg-white/[0.02] border border-border-default dark:border-white/10 rounded-full h-2 overflow-hidden shadow-inner">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{
                                            width: `${progress}%`,
                                            background: `linear-gradient(90deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {/* Linked Active Tasks */}
                                    <div className="space-y-2 pt-2 border-t border-border-default/40 dark:border-white/10">
                                      {activeGoalTasks.map(task => (
                                        <div
                                          key={task.id}
                                          className="flex items-center justify-between p-3 rounded-xl bg-surface/30 dark:bg-white/[0.02] backdrop-blur-md border border-border-default/30 dark:border-white/5 hover:border-accent/40 dark:hover:border-white/15 transition-all duration-300 group shadow-sm"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <button
                                              type="button"
                                              onClick={(e) => handleToggleTaskStatus(e, task)}
                                              className="h-4.5 w-4.5 rounded-full border border-border-strong dark:border-white/20 hover:border-accent flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                            >
                                              <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                                            </button>
                                            <span className="text-xs font-semibold text-foreground truncate select-text">
                                              {task.title}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                            className="text-muted-foreground hover:text-red-400 transition-colors p-0.5 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}

                                      {/* Linked Completed Tasks Accordion */}
                                      {completedGoalTasks.length > 0 && (
                                        <div className="space-y-2 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => toggleGoalCompletedTasks(goal.id)}
                                            className="w-full border border-border-default dark:border-white/10 bg-surface/20 dark:bg-white/[0.02] hover:bg-surface/35 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground transition-colors font-bold shadow-inner"
                                          >
                                            <span>Completed Tasks ({completedGoalTasks.length})</span>
                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCompletedExpanded ? 'rotate-180' : ''}`} />
                                          </button>

                                          <AnimatePresence>
                                            {isCompletedExpanded && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden space-y-2"
                                              >
                                                {completedGoalTasks.map(task => (
                                                  <div
                                                    key={task.id}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-surface/10 dark:bg-white/[0.01] border border-border-default/20 dark:border-white/5 opacity-65 hover:opacity-90 transition-all shadow-inner"
                                                  >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                      <button
                                                        type="button"
                                                        onClick={(e) => handleToggleTaskStatus(e, task)}
                                                        className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                                                      >
                                                        <Check className="w-2.5 h-2.5 text-cyan-400" />
                                                      </button>
                                                      <span className="text-xs font-semibold text-muted-foreground line-through truncate select-text">
                                                        {task.title}
                                                      </span>
                                                    </div>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                                      className="text-muted-foreground hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                                                    >
                                                      <X className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                ))}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Quick Inline task insert */}
                                  <form
                                    onSubmit={(e) => handleInlineTaskSubmit(e, goal.id)}
                                    className="mt-4 pt-3.5 border-t border-border-default/40 dark:border-white/10 flex gap-2"
                                  >
                                    <input
                                      type="text"
                                      placeholder="Add task to goal..."
                                      value={inlineTaskTitles[goal.id] || ''}
                                      onChange={(e) => setInlineTaskTitles(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                      className="flex-1 bg-surface/20 dark:bg-white/[0.01] border border-border-default/60 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-surface/30 focus:border-accent/40 shadow-inner"
                                    />
                                    <button
                                      type="submit"
                                      className="px-3 py-2 bg-surface/35 hover:bg-surface/50 border border-border-default/60 dark:border-white/10 rounded-xl hover:text-foreground text-muted-foreground transition-all cursor-pointer shadow-sm"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </form>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-12 border border-dashed border-border-default/40 dark:border-white/15 rounded-2xl flex flex-col items-center justify-center text-center bg-surface/10 dark:bg-white/[0.005] shadow-sm">
                            <p className="text-xs text-muted-foreground italic">No active goals match the current filters.</p>
                          </div>
                        )}
                      </div>

                      {/* Archived Completed Goals */}
                      <div className="pt-6 border-t border-border-default/40 dark:border-white/10 space-y-4">
                        <button
                          type="button"
                          onClick={() => setShowArchivedGoals(!showArchivedGoals)}
                          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-surface/20 dark:bg-white/[0.02] border border-border-default/40 dark:border-white/10 hover:border-accent/40 transition-all font-bold text-xs text-muted-foreground cursor-pointer shadow-md"
                        >
                          <div className="flex items-center gap-2">
                            {showArchivedGoals ? <EyeOff className="w-4.5 h-4.5 text-cyan-400" /> : <Eye className="w-4.5 h-4.5 text-cyan-400" />}
                            <span>Archived Completed Goals ({completedGoalsList.length})</span>
                          </div>
                          <ChevronDown className={`w-4.5 h-4.5 transition-transform ${showArchivedGoals ? 'rotate-180' : ''}`} />
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
                                <div className="grid grid-cols-1 gap-4">
                                  {completedGoalsList.map(goal => (
                                    <div key={goal.id} className="bg-surface/20 dark:bg-white/[0.02] border border-border-default/40 dark:border-white/10 rounded-2xl p-4.5 opacity-65 hover:opacity-95 transition-all shadow-md">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <button
                                            type="button"
                                            onClick={(e) => handleToggleGoalStatus(e, goal)}
                                            className="h-4.5 w-4.5 rounded-full border border-cyan-400 bg-cyan-400/10 flex items-center justify-center shrink-0 cursor-pointer"
                                          >
                                            <Check className="w-2.5 h-2.5 text-cyan-400" />
                                          </button>
                                          <h5 className="text-xs font-bold text-muted-foreground line-through truncate select-text">
                                            {goal.title}
                                          </h5>
                                        </div>
                                        <button
                                          onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                          className="text-muted-foreground hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic text-center py-6">No completed goals found.</p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* --- TASKS FOCUS TRACK --- */}
                  {activeFocus === 'tasks' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>Active Tasks ({activeTasksList.length})</span>
                        </h3>

                        <div className="bg-surface/20 dark:bg-white/[0.03] backdrop-blur-xl border border-border-default/40 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-xl hover:border-accent/40 dark:hover:border-white/20 transition-all duration-300">
                          {/* Inline Task creation */}
                          <form
                            onSubmit={(e) => handleInlineTaskSubmit(e, null)}
                            className="flex gap-2 max-w-md pb-3.5 border-b border-border-default/40 dark:border-white/10"
                          >
                            <input
                              type="text"
                              placeholder="Add a new task..."
                              value={inlineTaskTitles['standalone'] || ''}
                              onChange={(e) => setInlineTaskTitles(prev => ({ ...prev, standalone: e.target.value }))}
                              className="flex-1 bg-surface/20 dark:bg-white/[0.01] border border-border-default/60 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-surface/30 focus:border-accent/40 shadow-inner"
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-surface/35 hover:bg-surface/50 border border-border-default/60 dark:border-white/10 rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 cursor-pointer text-xs font-bold shadow-sm"
                            >
                              <Plus className="w-4 h-4" />
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
                                    className="flex items-center justify-between p-3.5 rounded-xl bg-surface/30 dark:bg-white/[0.02] backdrop-blur-md border border-border-default/30 dark:border-white/5 hover:border-accent/40 dark:hover:border-white/15 transition-all duration-300 group shadow-sm hover:bg-surface/40 dark:hover:bg-white/[0.04]"
                                  >
                                    <div className="flex flex-wrap items-center gap-3 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleTaskStatus(e, task)}
                                        className="h-4.5 w-4.5 rounded-full border border-border-strong dark:border-white/20 hover:border-accent flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                      >
                                        <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                                      </button>
                                      <span className="text-xs font-semibold text-foreground truncate select-text">
                                        {task.title}
                                      </span>
                                      
                                      {/* Project Tag */}
                                      {linkedProj && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/10 text-indigo-400 bg-indigo-500/5">
                                          {linkedProj.name}
                                        </span>
                                      )}

                                      {/* Goal Tag */}
                                      {linkedGoal && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-cyan-500/10 text-cyan-400 bg-cyan-500/5">
                                          Goal: {linkedGoal.title}
                                        </span>
                                      )}

                                      {/* Priority Tag */}
                                      {task.priority !== 'none' && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColors(task.priority)}`}>
                                          {getPriorityLabel(task.priority)}
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                      className="text-muted-foreground hover:text-red-400 transition-colors p-1 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2">No active tasks found matching the criteria.</p>
                          )}
                        </div>
                      </div>

                      {/* Archived Completed Tasks */}
                      <div className="pt-6 border-t border-border-default/40 dark:border-white/10 space-y-4">
                        <button
                          type="button"
                          onClick={() => setShowArchivedTasks(!showArchivedTasks)}
                          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-surface/20 dark:bg-white/[0.02] border border-border-default/40 dark:border-white/10 hover:border-accent/40 transition-all font-bold text-xs text-muted-foreground cursor-pointer shadow-md"
                        >
                          <div className="flex items-center gap-2">
                            {showArchivedTasks ? <EyeOff className="w-4.5 h-4.5 text-cyan-400" /> : <Eye className="w-4.5 h-4.5 text-cyan-400" />}
                            <span>Archived Completed Tasks ({completedTasksList.length})</span>
                          </div>
                          <ChevronDown className={`w-4.5 h-4.5 transition-transform ${showArchivedTasks ? 'rotate-180' : ''}`} />
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
                                <div className="bg-surface/20 dark:bg-white/[0.01] border border-border-default/40 dark:border-white/10 rounded-2xl p-4 space-y-2 shadow-inner">
                                  {completedTasksList.map(task => (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between p-3 rounded-xl bg-surface/10 dark:bg-white/[0.01] border border-border-default/20 dark:border-white/5 opacity-65 hover:opacity-90 transition-opacity shadow-sm"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <button
                                          type="button"
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className="h-4.5 w-4.5 rounded-full border border-cyan-400 bg-cyan-400/10 flex items-center justify-center shrink-0 cursor-pointer"
                                        >
                                          <Check className="w-2.5 h-2.5 text-cyan-400" />
                                        </button>
                                        <span className="text-xs font-semibold text-muted-foreground line-through truncate select-text">
                                          {task.title}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                        className="text-muted-foreground hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic text-center py-6">No completed tasks found.</p>
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
                  {/* Three-Column Active Kanban Layout */}
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
                      let colColorClass = '';
                      if (colStatus === 'todo') { colTitle = 'To Do'; colColorClass = 'bg-surface/20 dark:bg-white/[0.02] border-border-default/60 text-foreground dark:border-white/10 dark:bg-white/[0.01]'; }
                      else if (colStatus === 'in_progress') { colTitle = 'In Progress'; colColorClass = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'; }
                      else if (colStatus === 'review') { colTitle = 'In Review'; colColorClass = 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'; }

                      return (
                        <div
                          key={colStatus}
                          className="bg-surface/20 dark:bg-white/[0.03] backdrop-blur-xl border border-border-default/40 dark:border-white/10 rounded-2xl p-4.5 flex flex-col min-h-[480px] gap-4.5 shadow-xl transition-all duration-300 hover:border-accent/20 dark:hover:border-white/15"
                        >
                          {/* Column Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-border-default/40 dark:border-white/10 shrink-0">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${colColorClass}`}>
                              {colTitle}
                            </span>
                            <span className="text-[10px] font-bold font-mono text-muted-foreground bg-surface/20 dark:bg-white/[0.02] border border-border-default/60 dark:border-white/10 rounded-lg px-2 py-0.5 shadow-inner">
                              {colTasks.length}
                            </span>
                          </div>

                          {/* Column Task Cards */}
                          <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[500px] scrollbar-thin pr-1">
                            {colTasks.map(task => {
                              const parentGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
                              const parentProject = task.projectId ? projects.find(p => p.id === task.projectId) : null;

                              return (
                                <div
                                  key={task.id}
                                  className="bg-surface/40 dark:bg-white/[0.02] backdrop-blur-md border border-border-default/30 dark:border-white/5 hover:border-accent/40 dark:hover:border-white/15 rounded-xl p-3.5 space-y-3.5 transition-all duration-300 shadow-sm relative group cursor-pointer hover:shadow-md"
                                >
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {parentGoal && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/10 text-cyan-500 dark:text-cyan-455 bg-cyan-500/5 truncate max-w-[120px]">
                                          Goal: {parentGoal.title}
                                        </span>
                                      )}
                                      {parentProject && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/10 text-indigo-500 dark:text-indigo-455 bg-indigo-500/5 truncate max-w-[120px]">
                                          Proj: {parentProject.name}
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="text-xs font-bold text-foreground leading-snug select-text">
                                      {task.title}
                                    </h5>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-border-default/40 dark:border-white/10 text-[9px] text-muted-foreground font-semibold">
                                    {task.priority !== 'none' ? (
                                      <span className={`px-1.5 py-0.5 rounded border ${getPriorityColors(task.priority)}`}>
                                        {getPriorityLabel(task.priority)}
                                      </span>
                                    ) : (
                                      <span />
                                    )}

                                    {/* Status Transitions */}
                                    <div className="flex items-center gap-1">
                                      {STATUSES.filter(s => s !== colStatus && s !== 'done').map(s => {
                                        let sym = '';
                                        if (s === 'todo') sym = 'TD';
                                        if (s === 'in_progress') sym = 'IP';
                                        if (s === 'review') sym = 'RV';
                                        return (
                                          <button
                                            key={s}
                                            onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, s); }}
                                            className="h-5 px-1.5 border border-border-default/60 dark:border-white/10 hover:border-accent/40 rounded bg-surface/50 hover:bg-surface text-[8px] font-black tracking-tighter hover:text-foreground transition-all cursor-pointer uppercase shadow-sm"
                                            title={`Move to ${s.replace('_', ' ')}`}
                                          >
                                            {sym}
                                          </button>
                                        );
                                      })}
                                      
                                      {/* Complete checkmark */}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'done'); }}
                                        className="h-5 px-1.5 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-500 rounded bg-emerald-500/5 flex items-center justify-center transition-all cursor-pointer text-[8px] font-bold shadow-sm"
                                        title="Mark Complete"
                                      >
                                        DONE
                                      </button>
                                      
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTaskItem(e, task.id); }}
                                        className="h-5 w-5 border border-border-default/60 dark:border-white/10 hover:border-red-500/20 text-muted-foreground hover:text-red-400 rounded bg-surface/50 flex items-center justify-center transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                        title="Delete Task"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {colTasks.length === 0 && (
                              <div className="h-28 border border-dashed border-border-default/40 dark:border-white/15 rounded-xl flex items-center justify-center text-center bg-surface/10 dark:bg-white/[0.01] shadow-inner">
                                <p className="text-[10px] text-muted-foreground italic">Empty column</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Collapsed Archive for Completed Kanban Tasks at the bottom of the board */}
                  <div className="pt-6 border-t border-border-default/40 dark:border-white/10 space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowCompletedKanban(!showCompletedKanban)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-surface/20 dark:bg-white/[0.02] border border-border-default/40 dark:border-white/10 hover:border-accent/40 transition-all font-bold text-xs text-muted-foreground cursor-pointer shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        {showCompletedKanban ? <EyeOff className="w-4.5 h-4.5 text-emerald-500" /> : <Eye className="w-4.5 h-4.5 text-emerald-500" />}
                        <span>Completed Kanban Tasks ({completedTasksList.length})</span>
                      </div>
                      <ChevronDown className={`w-4.5 h-4.5 transition-transform ${showCompletedKanban ? 'rotate-180' : ''}`} />
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
                            <div className="bg-surface/20 dark:bg-white/[0.01] border border-border-default/40 dark:border-white/10 rounded-2xl p-4 space-y-2 shadow-inner">
                              {completedTasksList.map(task => (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between p-3 rounded-xl bg-surface/10 dark:bg-white/[0.01] border border-border-default/20 dark:border-white/5 opacity-65 hover:opacity-90 transition-opacity shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleTaskStatus(e, task)}
                                      className="h-4.5 w-4.5 rounded-full border border-cyan-400 bg-cyan-400/10 flex items-center justify-center shrink-0 cursor-pointer"
                                    >
                                      <Check className="w-2.5 h-2.5 text-cyan-400" />
                                    </button>
                                    <span className="text-xs font-semibold text-muted-foreground line-through truncate select-text">
                                      {task.title}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                    className="text-muted-foreground hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic text-center py-6">No completed tasks found.</p>
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

    </div>
  );
}
