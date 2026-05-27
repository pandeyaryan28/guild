import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Check, Loader2, Trash2, Settings, X,
  ChevronDown, Target, Zap, FolderGit, LayoutGrid,
  Kanban, Calendar, User, Eye, EyeOff
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

  // View toggle: 'list' or 'kanban'
  const [activeView, setActiveView] = React.useState<'list' | 'kanban'>('list');

  // Filters State
  const [horizonFilter, setHorizonFilter] = React.useState<'all' | 'short_term' | 'long_term'>('all');
  const [projectFilter, setProjectFilter] = React.useState<'all' | string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<'all' | TaskPriority>('all');

  // Collapsed states for completed items
  const [showArchived, setShowArchived] = React.useState(false);
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

  // Segmenting List View items
  const activeGoalsList = React.useMemo(() => {
    return filteredGoals.filter(g => g.status !== 'completed' && g.status !== 'cancelled');
  }, [filteredGoals]);

  const completedGoalsList = React.useMemo(() => {
    return filteredGoals.filter(g => g.status === 'completed');
  }, [filteredGoals]);

  // Tasks associated with goals vs. standalone/project tasks
  const goalLinkedTasks = React.useMemo(() => {
    return filteredTasks.filter(t => !!t.goalId);
  }, [filteredTasks]);

  const activeStandaloneTasks = React.useMemo(() => {
    return filteredTasks.filter(t => !t.goalId && t.status !== 'done');
  }, [filteredTasks]);

  const completedStandaloneTasks = React.useMemo(() => {
    return filteredTasks.filter(t => !t.goalId && t.status === 'done');
  }, [filteredTasks]);

  // Inline Quick creation submits
  const handleInlineTaskSubmit = async (e: React.FormEvent, goalId: string | null) => {
    e.preventDefault();
    const key = goalId || 'standalone';
    const titleText = inlineTaskTitles[key]?.trim();
    if (!titleText || !orgId) return;

    // Reset input immediately for optimistic UI feel
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
    if (p === 'urgent') return 'text-red-400 border-red-500/20 bg-red-500/5 shadow-[0_0_8px_rgba(239,68,68,0.1)]';
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
      
      {/* ─── Page Header ─── */}
      <div className="px-6 py-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Goals & Tasks Board</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unified directory for tracking active strategic goals and task execution
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white/2 border border-white/5 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'list' ? 'bg-white/5 border border-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setActiveView('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'kanban' ? 'bg-white/5 border border-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban View</span>
            </button>
          </div>

          {/* New Goal Trigger */}
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
        </div>
      </div>

      {/* ─── Global Filters Bar ─── */}
      <div className="px-6 py-3 border-b border-white/5 bg-white/[0.01] flex flex-wrap items-center gap-4 shrink-0 text-xs">
        
        {/* Horizon Filter */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-semibold">Horizon:</span>
          <select
            value={horizonFilter}
            onChange={(e: any) => setHorizonFilter(e.target.value)}
            className="bg-white/2 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-white/10"
          >
            <option value="all" className="bg-surface text-foreground">All Horizons</option>
            <option value="short_term" className="bg-surface text-foreground">Short Term</option>
            <option value="long_term" className="bg-surface text-foreground">Long Term</option>
          </select>
        </div>

        {/* Project Filter */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-semibold">Project:</span>
          <select
            value={projectFilter}
            onChange={(e: any) => setProjectFilter(e.target.value)}
            className="bg-white/2 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-white/10 max-w-[200px]"
          >
            <option value="all" className="bg-surface text-foreground">All Projects</option>
            {projects.map(proj => (
              <option key={proj.id} value={proj.id} className="bg-surface text-foreground">
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-semibold">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e: any) => setPriorityFilter(e.target.value)}
            className="bg-white/2 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none cursor-pointer focus:border-white/10"
          >
            <option value="all" className="bg-surface text-foreground">All Priorities</option>
            <option value="urgent" className="bg-surface text-foreground">Urgent</option>
            <option value="high" className="bg-surface text-foreground">High</option>
            <option value="medium" className="bg-surface text-foreground">Medium</option>
            <option value="low" className="bg-surface text-foreground">Low</option>
            <option value="none" className="bg-surface text-foreground">None</option>
          </select>
        </div>
      </div>

      {/* ─── Creation Forms Panel ─── */}
      <AnimatePresence>
        {showAddGoalForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/5 bg-white/[0.02]"
          >
            <form onSubmit={handleCreateGoalSubmit} className="p-6 max-w-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
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
                    className="w-full px-3 py-2 rounded-xl border border-white/5 bg-white/5 text-xs text-foreground outline-none placeholder:text-muted-foreground hover:bg-white/10 focus:border-white/10"
                    placeholder="Describe high-level objective..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Horizon</label>
                  <select
                    value={newGoalHorizon}
                    onChange={(e: any) => setNewGoalHorizon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-white/5 bg-white/5 text-xs text-foreground outline-none cursor-pointer"
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
                    className="w-full px-3 py-2 rounded-xl border border-white/5 bg-white/5 text-xs text-foreground outline-none cursor-pointer"
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
                  className="px-4 py-2 rounded-xl border border-white/5 text-xs font-semibold text-muted-foreground hover:bg-white/5 cursor-pointer"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Content Canvas ─── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 aether-scroll">
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
                {/* Active Goals Grid */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span>Active Goals ({activeGoalsList.length})</span>
                  </h3>

                  {activeGoalsList.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {activeGoalsList.map(goal => {
                        const goalTasks = goalLinkedTasks.filter(t => t.goalId === goal.id);
                        const activeGoalTasks = goalTasks.filter(t => t.status !== 'done');
                        const completedGoalTasks = goalTasks.filter(t => t.status === 'done');
                        const progress = goal.progressRollup ?? 0;
                        const linkedProj = projects.find(p => p.id === goal.projectId);
                        const isCompletedExpanded = !!completedGoalsExpanded[goal.id];

                        return (
                          <div
                            key={goal.id}
                            className="glass border border-white/5 rounded-2xl p-4.5 space-y-4 hover:border-white/10 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-3.5">
                              {/* Horizon and Project Badges */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/5 text-cyan-400 bg-cyan-500/5">
                                  {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                </span>
                                {linkedProj && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/5 text-indigo-400 bg-indigo-500/5">
                                    Project: {linkedProj.name}
                                  </span>
                                )}
                              </div>

                              {/* Title and Controls */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleGoalStatus(e, goal)}
                                    className="h-4 w-4 rounded-full border border-white/10 hover:border-cyan-400 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                    title="Mark Goal Completed"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-transparent hover:bg-cyan-400" />
                                  </button>
                                  <h4 className="text-xs font-bold text-foreground truncate select-text">
                                    {goal.title}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                    className="text-muted-foreground hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Goal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Progress Rollup */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                  <span>Goal Progress Rollup</span>
                                  <span>{progress}% ({completedGoalTasks.length}/{goalTasks.length} completed)</span>
                                </div>
                                <div className="w-full bg-white/5 border border-white/5 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${progress}%`,
                                      background: `linear-gradient(90deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.1) c h) 100%)`
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Nested Tasks Container */}
                              <div className="space-y-2 pt-2 border-t border-white/5">
                                {activeGoalTasks.map(task => (
                                  <div
                                    key={task.id}
                                    className="flex items-center justify-between p-2 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleTaskStatus(e, task)}
                                        className="h-4 w-4 rounded-full border border-white/10 hover:border-accent flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                      >
                                        <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                                      </button>
                                      <span className="text-xs font-semibold text-foreground truncate select-text">
                                        {task.title}
                                      </span>
                                      {task.priority !== 'none' && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColors(task.priority)}`}>
                                          {getPriorityLabel(task.priority)}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                      className="text-muted-foreground hover:text-red-400 transition-colors p-0.5 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}

                                {/* Nested Collapsible Completed Tasks */}
                                {completedGoalTasks.length > 0 && (
                                  <div className="space-y-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleGoalCompletedTasks(goal.id)}
                                      className="w-full border border-white/5 bg-white/2 hover:bg-white/5 rounded-xl p-2 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground transition-colors font-bold"
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
                                              className="flex items-center justify-between p-2 rounded-xl bg-white/1 border border-white/5 opacity-55 hover:opacity-85 transition-opacity"
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <button
                                                  type="button"
                                                  onClick={(e) => handleToggleTaskStatus(e, task)}
                                                  className="h-4 w-4 rounded-full border border-cyan-400 bg-cyan-400/10 flex items-center justify-center shrink-0 cursor-pointer"
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
                                                <X className="w-3.5 h-3.5" />
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

                            {/* Inline Task Form */}
                            <form
                              onSubmit={(e) => handleInlineTaskSubmit(e, goal.id)}
                              className="mt-4 pt-3.5 border-t border-white/5 flex gap-2"
                            >
                              <input
                                type="text"
                                placeholder="Add task to goal..."
                                value={inlineTaskTitles[goal.id] || ''}
                                onChange={(e) => setInlineTaskTitles(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                className="flex-1 bg-white/2 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-white/5 focus:border-white/10"
                              />
                              <button
                                type="submit"
                                className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-foreground text-muted-foreground transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center bg-white/[0.01]">
                      <p className="text-xs text-muted-foreground italic">No active goals match the current filters.</p>
                    </div>
                  )}
                </div>

                {/* Standalone & Project Tasks Section */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Standalone & Project Tasks ({activeStandaloneTasks.length})</span>
                  </h3>

                  <div className="glass border border-white/5 rounded-2xl p-4.5 space-y-4">
                    
                    {/* Inline Task creation */}
                    <form
                      onSubmit={(e) => handleInlineTaskSubmit(e, null)}
                      className="flex gap-2 max-w-md pb-2 border-b border-white/5"
                    >
                      <input
                        type="text"
                        placeholder="Add standalone task..."
                        value={inlineTaskTitles['standalone'] || ''}
                        onChange={(e) => setInlineTaskTitles(prev => ({ ...prev, standalone: e.target.value }))}
                        className="flex-1 bg-white/2 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none hover:bg-white/5 focus:border-white/10"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-foreground text-muted-foreground transition-all flex items-center gap-1 cursor-pointer text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </form>

                    {activeStandaloneTasks.length > 0 ? (
                      <div className="space-y-2">
                        {activeStandaloneTasks.map(task => {
                          const linkedProj = projects.find(p => p.id === task.projectId);

                          return (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleTaskStatus(e, task)}
                                  className="h-4 w-4 rounded-full border border-white/10 hover:border-accent flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                >
                                  <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                                </button>
                                <span className="text-xs font-semibold text-foreground truncate select-text">
                                  {task.title}
                                </span>
                                
                                {/* Badges */}
                                {linkedProj && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/10 text-indigo-400 bg-indigo-500/5">
                                    {linkedProj.name}
                                  </span>
                                )}
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
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-2">No active standalone tasks found.</p>
                    )}
                  </div>
                </div>

                {/* ==================== Collapsed Archived completed section ==================== */}
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowArchived(!showArchived)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all font-bold text-xs text-muted-foreground cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {showArchived ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4 text-cyan-400" />}
                      <span>Archived Completed Goals & Tasks ({completedGoalsList.length + completedStandaloneTasks.length})</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showArchived && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-6 pt-2"
                      >
                        {/* Completed Goals */}
                        {completedGoalsList.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Completed Goals</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {completedGoalsList.map(goal => (
                                <div key={goal.id} className="glass border border-white/5 rounded-2xl p-4 opacity-60 hover:opacity-90 transition-opacity">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleGoalStatus(e, goal)}
                                        className="h-4 w-4 rounded-full border border-cyan-400 bg-cyan-400/10 flex items-center justify-center shrink-0 cursor-pointer"
                                      >
                                        <Check className="w-2.5 h-2.5 text-cyan-400" />
                                      </button>
                                      <h5 className="text-xs font-bold text-muted-foreground line-through truncate select-text">
                                        {goal.title}
                                      </h5>
                                    </div>
                                    <button
                                      onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                      className="text-muted-foreground hover:text-red-400 p-1 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Completed Standalone Tasks */}
                        {completedStandaloneTasks.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Completed Standalone Tasks</h4>
                            <div className="glass border border-white/5 rounded-2xl p-3 space-y-2">
                              {completedStandaloneTasks.map(task => (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between p-2 rounded-xl bg-white/1 border border-white/5 opacity-55 hover:opacity-85 transition-opacity"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleTaskStatus(e, task)}
                                      className="h-4 w-4 rounded-full border border-cyan-400 bg-cyan-400/10 flex items-center justify-center shrink-0 cursor-pointer"
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
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {completedGoalsList.length === 0 && completedStandaloneTasks.length === 0 && (
                          <p className="text-xs text-muted-foreground italic text-center py-6">No completed items to display.</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
                className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start h-full"
              >
                {STATUSES.map(colStatus => {
                  // Filter tasks under this status (omitting tasks whose goals are completed, unless archived is shown, but to keep board clean, show active tasks)
                  const colTasks = filteredTasks.filter(t => {
                    if (t.status !== colStatus) return false;
                    // If task has a completed goal, hide it to keep active board clean
                    if (t.goalId) {
                      const parentGoal = goals.find(g => g.id === t.goalId);
                      if (parentGoal && parentGoal.status === 'completed') return false;
                    }
                    return true;
                  });

                  let colTitle = '';
                  let colColorClass = '';
                  if (colStatus === 'todo') { colTitle = 'To Do'; colColorClass = 'bg-white/10 border-white/5'; }
                  else if (colStatus === 'in_progress') { colTitle = 'In Progress'; colColorClass = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'; }
                  else if (colStatus === 'review') { colTitle = 'In Review'; colColorClass = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'; }
                  else if (colStatus === 'done') { colTitle = 'Done'; colColorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'; }

                  return (
                    <div
                      key={colStatus}
                      className="glass border border-white/5 rounded-2xl p-4 flex flex-col min-h-[500px] gap-4"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${colColorClass}`}>
                          {colTitle}
                        </span>
                        <span className="text-[10px] font-bold font-mono text-muted-foreground bg-white/2 border border-white/5 rounded-lg px-2 py-0.5">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Column Task Cards */}
                      <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] scrollbar-thin pr-1">
                        {colTasks.map(task => {
                          const parentGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
                          const parentProject = task.projectId ? projects.find(p => p.id === task.projectId) : null;

                          return (
                            <div
                              key={task.id}
                              className="bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-3.5 space-y-3.5 transition-all shadow-sm relative group cursor-pointer"
                              onClick={() => {
                                // Direct toggle to next/complete or status list
                              }}
                            >
                              <div className="space-y-1.5">
                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {parentGoal && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/10 text-cyan-400 bg-cyan-500/5 truncate max-w-[120px]">
                                      Goal: {parentGoal.title}
                                    </span>
                                  )}
                                  {parentProject && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/10 text-indigo-400 bg-indigo-500/5 truncate max-w-[120px]">
                                      Proj: {parentProject.name}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-xs font-bold text-foreground leading-snug select-text">
                                  {task.title}
                                </h5>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[9px] text-muted-foreground font-semibold">
                                {/* Priority details */}
                                {task.priority !== 'none' ? (
                                  <span className={`px-1.5 py-0.5 rounded border ${getPriorityColors(task.priority)}`}>
                                    {getPriorityLabel(task.priority)}
                                  </span>
                                ) : (
                                  <span />
                                )}

                                {/* Status Transitions Dropdown helper controls */}
                                <div className="flex items-center gap-1">
                                  {STATUSES.filter(s => s !== colStatus).map(s => {
                                    let sym = '';
                                    if (s === 'todo') sym = 'TD';
                                    if (s === 'in_progress') sym = 'IP';
                                    if (s === 'review') sym = 'RV';
                                    if (s === 'done') sym = 'DN';
                                    return (
                                      <button
                                        key={s}
                                        onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, s); }}
                                        className="h-5 px-1.5 border border-white/5 hover:border-white/10 rounded bg-white/2 text-[8px] font-black tracking-tighter hover:text-foreground hover:bg-white/5 transition-all cursor-pointer uppercase"
                                        title={`Move to ${s.replace('_', ' ')}`}
                                      >
                                        {sym}
                                      </button>
                                    );
                                  })}
                                  
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTaskItem(e, task.id); }}
                                    className="h-5 w-5 border border-white/5 hover:border-red-500/20 text-muted-foreground hover:text-red-400 rounded bg-white/2 flex items-center justify-center transition-all cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
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
                          <div className="h-28 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-center">
                            <p className="text-[10px] text-muted-foreground italic">Empty column</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
