import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Layers,
  Target,
  Check,
  CheckSquare,
  Users,
  Loader2,
  Search,
  Calendar,
  AlertCircle,
  X,
  Kanban,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Send,
  Clock,
  Briefcase,
  Trophy,
  Trash2,
  CalendarDays,
  ExternalLink,
  ChevronUp,
  Globe,
  SlidersHorizontal,
  Folder,
  CircleDot,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';
import { useTeams } from '../../hooks/useTeams';

import { TaskDetailPanel } from '../../pages/tasks/TaskDetailPanel';

import {
  createTask,
  moveTask,
  deleteTask,
  STATUS_CONFIG,
  STATUSES,
  PRIORITY_CONFIG
} from '../../lib/tasks';
import { createGoal, updateGoal, deleteGoal } from '../../lib/goals';
import { createProject, deleteProject } from '../../lib/projects';
import type { Task, TaskStatus, TaskPriority, ActorInfo } from '../../lib/tasks';
import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';

export function TaskCanvas() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // View States: 'goals' (Goals & Job alignment), 'execution' (Segmented task lists), 'projects' (Initiative map)
  const [activeTab, setActiveTab] = React.useState<'goals' | 'execution' | 'projects'>('goals');
  
  // Filters State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState('all');
  const [selectedPriority, setSelectedPriority] = React.useState('all');
  const [showFilters, setShowFilters] = React.useState(false);

  // Creation Drawer States
  const [showCreateDrawer, setShowCreateDrawer] = React.useState(false);
  const [createType, setCreateType] = React.useState<'goal' | 'project' | 'task'>('goal');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form Initializations
  const [projectForm, setProjectForm] = React.useState({ name: '', description: '', startDate: '', dueDate: '' });
  const [goalForm, setGoalForm] = React.useState({ title: '', description: '', projectId: '', ownerId: '', horizon: 'short_term' as 'short_term' | 'long_term', targetDate: '' });
  const [taskForm, setTaskForm] = React.useState({ title: '', description: '', priority: 'none' as TaskPriority, projectId: '', goalId: '', assigneeId: '', dueDate: '' });

  // Data subscriptions
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const members = useOrgMembers(orgId);

  // Task Drawer context
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');
  const openTask = React.useMemo(() => tasks.find((t) => t.id === openTaskId) ?? null, [tasks, openTaskId]);

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid || '',
    name: userProfile?.fullName || user?.displayName || 'Anonymous',
  }), [user, userProfile]);

  // Member Maps
  const memberMap = React.useMemo(() => {
    const map = new Map<string, any>();
    members.forEach((m) => map.set(m.uid, m));
    return map;
  }, [members]);

  const getInitials = (userId: string) => {
    const m = memberMap.get(userId);
    if (!m) return 'U';
    return m.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (userId: string) => {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-indigo-500/10 border-indigo-500/25 text-indigo-400',
      'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
      'bg-sky-500/10 border-sky-500/25 text-sky-400',
      'bg-amber-500/10 border-amber-500/25 text-amber-400',
      'bg-pink-500/10 border-pink-500/25 text-pink-400',
    ];
    return colors[hash % colors.length];
  };

  const getTaskDate = React.useCallback((task: Task): Date | null => {
    if (!task.dueDate) return null;
    if (typeof task.dueDate.toDate === 'function') return task.dueDate.toDate();
    if (task.dueDate instanceof Date) return task.dueDate;
    if ((task.dueDate as any).seconds) return new Date((task.dueDate as any).seconds * 1000);
    return new Date(task.dueDate as any);
  }, []);

  // Filter Tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (t.parentTaskId) return false;
      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (selectedAssigneeId !== 'all' && !t.assigneeIds.includes(selectedAssigneeId)) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
      return true;
    });
  }, [tasks, searchQuery, selectedProjectId, selectedAssigneeId, selectedPriority]);

  // Filter Goals
  const filteredGoals = React.useMemo(() => {
    return goals.filter((g) => {
      if (searchQuery.trim() && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedProjectId !== 'all' && g.projectId !== selectedProjectId) return false;
      if (selectedAssigneeId !== 'all' && g.ownerId !== selectedAssigneeId) return false;
      return true;
    });
  }, [goals, searchQuery, selectedProjectId, selectedAssigneeId]);

  // Pre-fill action setups
  const triggerAddGoal = (projectId: string) => {
    setGoalForm(prev => ({ ...prev, projectId }));
    setCreateType('goal');
    setShowCreateDrawer(true);
  };

  const triggerAddTask = (goalId: string, projectId?: string | null) => {
    setTaskForm(prev => ({ ...prev, goalId, projectId: projectId || '' }));
    setCreateType('task');
    setShowCreateDrawer(true);
  };

  // Creation Submissions
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.name.trim() || !orgId) return;
    setIsSubmitting(true);
    try {
      await createProject({
        orgId,
        name: projectForm.name.trim(),
        description: projectForm.description,
        startDate: projectForm.startDate ? new Date(projectForm.startDate) : null,
        dueDate: projectForm.dueDate ? new Date(projectForm.dueDate) : null,
        actor
      });
      setProjectForm({ name: '', description: '', startDate: '', dueDate: '' });
      setShowCreateDrawer(false);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title.trim() || !orgId) return;
    setIsSubmitting(true);
    try {
      await createGoal({
        orgId,
        title: goalForm.title.trim(),
        description: goalForm.description,
        targetDate: goalForm.targetDate ? new Date(goalForm.targetDate) : null,
        horizon: goalForm.horizon,
        projectId: goalForm.projectId || null,
        ownerId: goalForm.ownerId || actor.uid,
        actor
      });
      setGoalForm({ title: '', description: '', projectId: '', ownerId: '', horizon: 'short_term', targetDate: '' });
      setShowCreateDrawer(false);
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !orgId) return;
    setIsSubmitting(true);
    try {
      await createTask({
        orgId,
        title: taskForm.title.trim(),
        description: taskForm.description,
        priority: taskForm.priority,
        projectId: taskForm.projectId || null,
        goalId: taskForm.goalId || null,
        assigneeIds: taskForm.assigneeId ? [taskForm.assigneeId] : [actor.uid],
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null,
        actor
      });
      setTaskForm({ title: '', description: '', priority: 'none', projectId: '', goalId: '', assigneeId: '', dueDate: '' });
      setShowCreateDrawer(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Task Modifications
  const handleToggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!orgId) return;
    const oldStatus = task.status;
    const newStatus: TaskStatus = oldStatus === 'done' ? 'todo' : 'done';
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, oldStatus, actor);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleUpdateTaskStatus = async (task: Task, newStatus: TaskStatus) => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, task.status, actor);
    } catch (err) {
      console.error('Failed to move task status:', err);
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

  const handleDeleteProjectItem = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Delete this project? associated goals/tasks will be unlinked.')) {
      try {
        await deleteProject(projectId);
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  // Task Segmentation (For activeTab === 'execution')
  const myTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.assigneeIds.includes(actor.uid));
  }, [filteredTasks, actor.uid]);

  const assignedTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.creatorId === actor.uid && !t.assigneeIds.includes(actor.uid));
  }, [filteredTasks, actor.uid]);

  const reviewTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.creatorId === actor.uid && t.status === 'review');
  }, [filteredTasks, actor.uid]);

  const standaloneTasks = React.useMemo(() => {
    return filteredTasks.filter(t => !t.projectId && !t.goalId);
  }, [filteredTasks]);

  // Analytics aggregation
  const analytics = React.useMemo(() => {
    const total = tasks.filter(t => !t.parentTaskId).length;
    const completed = tasks.filter(t => !t.parentTaskId && t.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      total,
      completed,
      rate,
      activeGoals: goals.filter(g => g.status === 'active').length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      myActiveTasksCount: tasks.filter(t => t.assigneeIds.includes(actor.uid) && t.status !== 'done').length,
      pendingReviewsCount: tasks.filter(t => t.creatorId === actor.uid && t.status === 'review').length
    };
  }, [tasks, goals, projects, actor.uid]);

  const isLoading = tasksLoading || goalsLoading || projectsLoading;

  return (
    <div className="flex-grow flex flex-col min-h-0 overflow-hidden w-full h-full bg-transparent">
      <div className="flex flex-1 flex-col overflow-hidden px-4 py-4 md:px-8 md:py-6">
        
        {/* ─── Premium Glassmorphic Top Controls Banner ─── */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 backdrop-blur-xl md:flex-row md:items-center md:justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl p-2.5 text-accent border border-white/5 bg-accent/[0.08]" style={{ color: 'var(--accent)' }}>
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Workspace
              </h1>
              <p className="text-[10px] font-medium text-muted-foreground">
                Team coordination, personal goals, and operational execution
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher Deck */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] p-1 shadow-inner relative backdrop-blur-md">
              {[
                { id: 'goals', label: 'Goals Hub', icon: Trophy },
                { id: 'execution', label: 'Execution', icon: CheckSquare },
                { id: 'projects', label: 'Projects Map', icon: Briefcase }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "relative rounded-lg px-3.5 py-1.5 text-[11px] font-bold transition-all duration-300 z-10 cursor-pointer flex items-center gap-1.5",
                      isSelected ? "text-white" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        style={{ zIndex: -1, backgroundColor: 'var(--accent)' }}
                      />
                    )}
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-inner",
                showFilters 
                  ? "border-accent/40 text-accent bg-accent/[0.08]" 
                  : "border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-muted-foreground hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>

            {/* Create Trigger */}
            <button
              onClick={() => setShowCreateDrawer(!showCreateDrawer)}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[11px] font-bold text-white hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              style={{
                background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)`,
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Item</span>
            </button>
          </div>
        </div>

        {/* ─── Expandable Filters Bar ─── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden mb-4"
            >
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.02] to-white/[0.005] p-4 backdrop-blur-2xl sm:grid-cols-2 md:grid-cols-4 shadow-inner">
                
                {/* Search */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search titles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] py-2 pl-9 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 transition-all font-semibold"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Project Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] px-3 py-1 hover:border-white/20 transition-all">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-950 text-foreground font-bold">All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-zinc-950 text-foreground font-bold">{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] px-3 py-1 hover:border-white/20 transition-all">
                  <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-950 text-foreground font-bold">All Members</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid} className="bg-zinc-950 text-foreground font-bold">{m.fullName || m.username}</option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] px-3 py-1 hover:border-white/20 transition-all">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full bg-transparent text-[11px] font-bold text-foreground outline-none border-none py-1.5 cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-950 text-foreground font-bold">All Priorities</option>
                    {Object.entries(PRIORITY_CONFIG).map(([key, value]) => (
                      <option key={key} value={key} className="bg-zinc-950 text-foreground font-bold">{value.label}</option>
                    ))}
                  </select>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Expandable Creation Drawer ─── */}
        <AnimatePresence>
          {showCreateDrawer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4 border border-white/10 bg-white/[0.01] rounded-2xl backdrop-blur-xl"
            >
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                  {(['goal', 'project', 'task'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCreateType(type)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize border",
                        createType === type
                          ? "bg-accent/[0.08] border-accent/30 text-white"
                          : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
                      )}
                      style={createType === type ? { color: 'oklch(from var(--accent) calc(l + 0.12) c h)', borderColor: 'rgba(255,255,255,0.1)' } : undefined}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {createType === 'project' && (
                  <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Project Name..."
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        required
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-accent/40 font-semibold"
                      />
                      <textarea
                        placeholder="Project Description..."
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        rows={3}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-accent/40 font-semibold resize-none"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Start Date</label>
                          <input
                            type="date"
                            value={projectForm.startDate}
                            onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Due Date</label>
                          <input
                            type="date"
                            value={projectForm.dueDate}
                            onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => setShowCreateDrawer(false)}
                          className="border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || !projectForm.name.trim()}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer"
                          style={{ background: 'var(--accent)' }}
                        >
                          {isSubmitting ? 'Creating...' : 'Create Project'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {createType === 'goal' && (
                  <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Goal Title..."
                        value={goalForm.title}
                        onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                        required
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-accent/40 font-semibold"
                      />
                      <textarea
                        placeholder="Outcome / Job responsibility description..."
                        value={goalForm.description}
                        onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                        rows={3}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-accent/40 font-semibold resize-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Link to Project</label>
                          <select
                            value={goalForm.projectId}
                            onChange={(e) => setGoalForm({ ...goalForm, projectId: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          >
                            <option value="">Standalone Goal</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Assignee</label>
                          <select
                            value={goalForm.ownerId}
                            onChange={(e) => setGoalForm({ ...goalForm, ownerId: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          >
                            <option value="">Select Employee...</option>
                            {members.map(m => (
                              <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Horizon</label>
                          <select
                            value={goalForm.horizon}
                            onChange={(e) => setGoalForm({ ...goalForm, horizon: e.target.value as any })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          >
                            <option value="short_term">Short Term</option>
                            <option value="long_term">Long Term</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Target Date</label>
                          <input
                            type="date"
                            value={goalForm.targetDate}
                            onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => setShowCreateDrawer(false)}
                          className="border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || !goalForm.title.trim()}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer"
                          style={{ background: 'var(--accent)' }}
                        >
                          {isSubmitting ? 'Creating...' : 'Create Goal'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {createType === 'task' && (
                  <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Task Title..."
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        required
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-accent/40 font-semibold"
                      />
                      <textarea
                        placeholder="Task details and execution steps..."
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        rows={3}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-accent/40 font-semibold resize-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Link to Project</label>
                          <select
                            value={taskForm.projectId}
                            onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          >
                            <option value="">No Project</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Link to Goal</label>
                          <select
                            value={taskForm.goalId}
                            onChange={(e) => setTaskForm({ ...taskForm, goalId: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          >
                            <option value="">No Goal</option>
                            {goals.map(g => (
                              <option key={g.id} value={g.id}>{g.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Assignee</label>
                          <select
                            value={taskForm.assigneeId}
                            onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          >
                            <option value="">Select Member...</option>
                            {members.map(m => (
                              <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Priority</label>
                          <select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          >
                            <option value="none">None</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-muted-foreground block uppercase tracking-widest mb-1.5 font-bold">Due Date</label>
                          <input
                            type="date"
                            value={taskForm.dueDate}
                            onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                            className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-accent/40 font-semibold"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-3">
                        <button
                          type="button"
                          onClick={() => setShowCreateDrawer(false)}
                          className="border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || !taskForm.title.trim()}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer"
                          style={{ background: 'var(--accent)' }}
                        >
                          {isSubmitting ? 'Creating...' : 'Create Task'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Split Screen Workspace Panel ─── */}
        <div className="flex-1 flex gap-5 overflow-hidden min-h-0 relative">
          
          {/* Main Content Workspace Container */}
          <div className="flex-1 min-h-0 border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10">
            {isLoading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: 'oklch(from var(--accent) l c h / 10%)', borderTopColor: 'var(--accent)' }} />
                  <p className="text-[11px] text-muted-foreground font-semibold tracking-wide animate-pulse">Syncing workspace coordinates...</p>
                </div>
              </div>
            ) : (
              <div className="h-full w-full overflow-hidden flex flex-col">
                
                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ VIEW 1: GOALS MATRIX (Job & Role focus) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'goals' && (
                  <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-6">
                    
                    {/* Visual context */}
                    <div className="bg-emerald-500/[0.04] border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
                        <div>
                          <h4 className="text-xs font-bold text-white">Primary Employee Goals</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">Goals represent an employee's primary operational focus. Tasks are what is needed to complete a goal.</p>
                        </div>
                      </div>
                    </div>

                    {/* Personal Focus Section */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">My Primary Focus</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredGoals.filter(g => g.ownerId === actor.uid).length > 0 ? (
                          filteredGoals.filter(g => g.ownerId === actor.uid).map(goal => {
                            const goalTasks = tasks.filter(t => t.goalId === goal.id);
                            const doneTasks = goalTasks.filter(t => t.status === 'done').length;
                            const progress = goal.progressRollup ?? 0;
                            const linkedProj = projects.find(p => p.id === goal.projectId);

                            return (
                              <div
                                key={goal.id}
                                className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 space-y-4 hover:border-emerald-500/30 hover:bg-white/[0.03] transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] hover:-translate-y-0.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-white/5 bg-white/5 text-emerald-400">
                                        {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                      </span>
                                      {linkedProj && (
                                        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-white/5 bg-white/5 text-accent" style={{ color: 'var(--accent)' }}>
                                          {linkedProj.name}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-xs font-bold text-white mt-2.5">{goal.title}</h4>
                                    {goal.description && <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{goal.description}</p>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {goal.targetDate && (
                                      <span className="text-[8px] text-muted-foreground font-mono bg-white/5 border border-white/5 rounded px-2 py-0.5">
                                        {new Date((goal.targetDate as any).seconds * 1000).toLocaleDateString()}
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                      className="text-muted-foreground hover:text-red-400 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Circular/Linear Rollup Progress */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                                    <span>Goal Rollup Progress</span>
                                    <span>{progress}% ({doneTasks}/{goalTasks.length} tasks)</span>
                                  </div>
                                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                  </div>
                                </div>

                                {/* Checklist Tasks */}
                                <div className="space-y-1.5 pt-3.5 border-t border-white/5">
                                  {goalTasks.map(task => (
                                    <div
                                      key={task.id}
                                      onClick={() => setSearchParams({ task: task.id })}
                                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className={cn(
                                            "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                            task.status === 'done' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/20 bg-white/[0.02]"
                                          )}
                                        >
                                          {task.status === 'done' && <Check className="w-2.5 h-2.5" />}
                                        </div>
                                        <span className={cn("text-[11px] truncate font-semibold", task.status === 'done' ? "text-muted-foreground line-through" : "text-zinc-200")}>
                                          {task.title}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                        className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => triggerAddTask(goal.id, goal.projectId)}
                                    className="text-[9px] text-muted-foreground hover:text-white font-bold flex items-center gap-1 pt-1.5"
                                  >
                                    <Plus className="w-3 h-3" /> Add Task
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-2 py-8 rounded-2xl border border-dashed border-white/5 bg-white/[0.005] flex flex-col items-center justify-center text-center">
                            <p className="text-[11px] text-muted-foreground italic">No goals assigned to you yet.</p>
                            <button
                              onClick={() => {
                                setGoalForm(prev => ({ ...prev, ownerId: actor.uid }));
                                setCreateType('goal');
                                setShowCreateDrawer(true);
                              }}
                              className="text-[10px] text-emerald-450 hover:underline mt-2 font-black uppercase tracking-wider"
                            >
                              Add Your First Goal
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Team Focus Section */}
                    <div className="space-y-4 pt-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Team Member Focus</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {members.filter(m => m.uid !== actor.uid).map(member => {
                          const memberGoals = filteredGoals.filter(g => g.ownerId === member.uid);
                          if (selectedAssigneeId !== 'all' && member.uid !== selectedAssigneeId) return null;

                          return (
                            <div key={member.uid} className="bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 space-y-4">
                              <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border", getAvatarColor(member.uid))}>
                                    {getInitials(member.uid)}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-white">{member.fullName}</h4>
                                    <p className="text-[9px] text-muted-foreground">{member.designation || 'Team Member'}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setGoalForm(prev => ({ ...prev, ownerId: member.uid }));
                                    setCreateType('goal');
                                    setShowCreateDrawer(true);
                                  }}
                                  className="text-[9px] text-emerald-400 hover:text-emerald-350 border border-emerald-500/10 hover:border-emerald-500/25 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] rounded-lg px-2 py-1 font-bold tracking-wide"
                                >
                                  Assign Goal
                                </button>
                              </div>

                              <div className="space-y-3">
                                {memberGoals.length > 0 ? (
                                  memberGoals.map(goal => {
                                    const progress = goal.progressRollup ?? 0;
                                    return (
                                      <div key={goal.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-2 hover:border-white/10 transition-colors">
                                        <div className="flex items-start justify-between gap-3">
                                          <h5 className="text-[11px] font-bold text-white">{goal.title}</h5>
                                          <button
                                            onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                            className="text-muted-foreground hover:text-red-400 transition-colors"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                                            <span>Progress Rollup</span>
                                            <span>{progress}%</span>
                                          </div>
                                          <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                            <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${progress}%` }} />
                                          </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                          <button
                                            onClick={() => triggerAddTask(goal.id, goal.projectId)}
                                            className="text-[8px] text-muted-foreground hover:text-white font-bold flex items-center gap-0.5"
                                          >
                                            <Plus className="w-2.5 h-2.5" /> Add Task
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-[10px] text-muted-foreground/60 italic py-2 text-center">No goals assigned.</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ VIEW 2: SEGMENTED EXECUTION CANVAS (Personal, Assigned, Approvals, Standalone) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'execution' && (
                  <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-8">
                    
                    {/* Visual contexts */}
                    <div className="bg-accent/[0.04] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4" style={{ borderColor: 'oklch(from var(--accent) l c h / 20%)' }}>
                      <div className="flex items-center gap-3">
                        <CheckSquare className="w-5 h-5 text-accent shrink-0" style={{ color: 'var(--accent)' }} />
                        <div>
                          <h4 className="text-xs font-bold text-white">Segmented Execution Dashboard</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">Differentiate instantly between tasks assigned to you, tasks you assigned to others, reviews pending your sign-off, and standalone items.</p>
                        </div>
                      </div>
                    </div>

                    {/* Split Segments Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      
                      {/* Segment 1: My Personal Tasks */}
                      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-white">My Tasks</h3>
                          </div>
                          <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-[9px] font-bold text-muted-foreground rounded-lg">
                            {myTasks.filter(t => t.status !== 'done').length} Active
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto aether-scroll pr-1">
                          {myTasks.length > 0 ? (
                            myTasks.map(task => (
                              <div
                                key={task.id}
                                onClick={() => setSearchParams({ task: task.id })}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-sky-500/20 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className={cn(
                                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                      task.status === 'done' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/20 bg-white/[0.02]"
                                    )}
                                  >
                                    {task.status === 'done' && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className={cn("text-[11px] truncate font-semibold block", task.status === 'done' ? "text-muted-foreground line-through" : "text-zinc-200")}>
                                      {task.title}
                                    </span>
                                    {task.priority !== 'none' && (
                                      <span className="text-[7px] uppercase font-bold tracking-wider rounded font-mono text-zinc-500 mt-0.5 block">
                                        Priority: {task.priority}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {task.dueDate && (
                                    <span className="text-[8px] font-mono text-muted-foreground bg-white/5 rounded px-1.5 py-0.5 border border-white/5">
                                      {new Date((task.dueDate as any).seconds * 1000).toLocaleDateString()}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                    className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-muted-foreground/60 italic py-6 text-center">No tasks assigned to you.</p>
                          )}
                        </div>
                      </div>

                      {/* Segment 2: Tasks I Assigned */}
                      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-purple-400 shrink-0" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-white">Tasks I Assigned</h3>
                          </div>
                          <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-[9px] font-bold text-muted-foreground rounded-lg">
                            {assignedTasks.filter(t => t.status !== 'done').length} Active
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto aether-scroll pr-1">
                          {assignedTasks.length > 0 ? (
                            assignedTasks.map(task => (
                              <div
                                key={task.id}
                                onClick={() => setSearchParams({ task: task.id })}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-purple-500/20 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className={cn(
                                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                      task.status === 'done' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/20 bg-white/[0.02]"
                                    )}
                                  >
                                    {task.status === 'done' && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className={cn("text-[11px] truncate font-semibold block", task.status === 'done' ? "text-muted-foreground line-through" : "text-zinc-200")}>
                                      {task.title}
                                    </span>
                                    <span className="text-[7px] uppercase font-bold tracking-wider rounded font-mono text-purple-400 mt-0.5 block">
                                      Assigned To: {task.assigneeIds.map(uid => memberMap.get(uid)?.fullName || 'Member').join(', ')}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-bold text-muted-foreground capitalize">
                                    {task.status.replace('_', ' ')}
                                  </span>
                                  <button
                                    onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                    className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-muted-foreground/60 italic py-6 text-center">No tasks assigned to other employees.</p>
                          )}
                        </div>
                      </div>

                      {/* Segment 3: Pending Approvals & Reviews */}
                      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-white">Approvals & Reviews</h3>
                          </div>
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 rounded-lg">
                            {reviewTasks.length} Pending
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto aether-scroll pr-1">
                          {reviewTasks.length > 0 ? (
                            reviewTasks.map(task => (
                              <div
                                key={task.id}
                                onClick={() => setSearchParams({ task: task.id })}
                                className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/[0.02] border border-amber-500/20 hover:bg-amber-500/[0.04] transition-all cursor-pointer group"
                              >
                                <div className="min-w-0">
                                  <span className="text-[11px] truncate font-bold text-white block">
                                    {task.title}
                                  </span>
                                  <p className="text-[8px] text-muted-foreground mt-0.5 font-semibold">
                                    Submitted by: {task.assigneeIds.map(uid => memberMap.get(uid)?.fullName || 'Member').join(', ')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleUpdateTaskStatus(task, 'done');
                                    }}
                                    className="px-2.5 py-1 bg-white hover:bg-white/90 text-zinc-950 font-bold rounded-lg text-[9px] transition-all cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleUpdateTaskStatus(task, 'todo');
                                    }}
                                    className="px-2.5 py-1 border border-white/10 hover:bg-white/5 text-white font-bold rounded-lg text-[9px] transition-all cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-muted-foreground/60 italic py-6 text-center">No reviews pending your approval.</p>
                          )}
                        </div>
                      </div>

                      {/* Segment 4: Standalone Execution Items */}
                      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-white">Standalone Tasks</h3>
                          </div>
                          <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-[9px] font-bold text-muted-foreground rounded-lg">
                            {standaloneTasks.filter(t => t.status !== 'done').length} Active
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto aether-scroll pr-1">
                          {standaloneTasks.length > 0 ? (
                            standaloneTasks.map(task => (
                              <div
                                key={task.id}
                                onClick={() => setSearchParams({ task: task.id })}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-zinc-500/20 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className={cn(
                                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                      task.status === 'done' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/20 bg-white/[0.02]"
                                    )}
                                  >
                                    {task.status === 'done' && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <span className={cn("text-[11px] truncate font-semibold", task.status === 'done' ? "text-muted-foreground line-through" : "text-zinc-200")}>
                                    {task.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                    className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-muted-foreground/60 italic py-6 text-center">No standalone tasks found.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ VIEW 3: INITIATIVE PROJECTS MAP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {activeTab === 'projects' && (
                  <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-6">
                    
                    <div className="bg-indigo-500/[0.04] border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-indigo-400 shrink-0 animate-pulse" />
                        <div>
                          <h4 className="text-xs font-bold text-white">Active Initiatives Map</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">Projects encompass high-level team targets. Track linked employee goals and associated task metrics.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {projects.map(project => {
                        const projectGoals = filteredGoals.filter(g => g.projectId === project.id);
                        const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
                        const doneTasks = projectTasks.filter(t => t.status === 'done').length;
                        const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;

                        return (
                          <div
                            key={project.id}
                            className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 space-y-5 hover:border-indigo-500/30 hover:bg-white/[0.02] transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                              <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                  <Folder className="w-4.5 h-4.5 text-indigo-450" />
                                  {project.name}
                                </h3>
                                {project.description && <p className="text-xs text-muted-foreground mt-1 max-w-xl font-medium leading-relaxed">{project.description}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => triggerAddGoal(project.id)}
                                  className="text-[9px] text-emerald-400 hover:text-emerald-350 border border-emerald-500/10 hover:border-emerald-500/25 bg-emerald-500/[0.03] rounded-lg px-2.5 py-1.5 font-bold tracking-wide"
                                >
                                  + Goal
                                </button>
                                <button
                                  onClick={(e) => handleDeleteProjectItem(e, project.id)}
                                  className="text-muted-foreground hover:text-red-400 p-1.5 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                              
                              {/* Linked Employee Goals Column */}
                              <div className="md:col-span-2 space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aligned Employee Goals</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                  {projectGoals.map(goal => (
                                    <div key={goal.id} className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl space-y-3">
                                      <div className="flex items-start justify-between gap-2.5">
                                        <h5 className="text-[11px] font-bold text-white leading-snug">{goal.title}</h5>
                                        <div className="w-5.5 h-5.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-[9px] text-emerald-450 shrink-0" title={`Assigned to ${memberMap.get(goal.ownerId)?.fullName || 'Member'}`}>
                                          {getInitials(goal.ownerId)}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[8px] text-muted-foreground font-semibold">
                                          <span>Goal Completion</span>
                                          <span>{goal.progressRollup ?? 0}%</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${goal.progressRollup ?? 0}%` }} />
                                        </div>
                                      </div>

                                      <div className="flex justify-between pt-1 border-t border-white/5">
                                        <button
                                          onClick={() => triggerAddTask(goal.id, project.id)}
                                          className="text-[8px] text-muted-foreground hover:text-sky-400 font-bold flex items-center gap-0.5"
                                        >
                                          <Plus className="w-2.5 h-2.5" /> Add Task
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                          className="text-muted-foreground hover:text-red-400 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {projectGoals.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground/60 italic py-6 text-center col-span-2">No employee goals aligned yet.</p>
                                  )}
                                </div>
                              </div>

                              {/* Aligned Tasks Column */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Initiative Action Items</h4>
                                <div className="space-y-2 max-h-56 overflow-y-auto aether-scroll pr-1">
                                  {projectTasks.map(task => (
                                    <div
                                      key={task.id}
                                      onClick={() => setSearchParams({ task: task.id })}
                                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          onClick={(e) => handleToggleTaskStatus(e, task)}
                                          className={cn(
                                            "h-3 w-3 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                            task.status === 'done' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/20 bg-white/[0.02]"
                                          )}
                                        >
                                          {task.status === 'done' && <Check className="w-2 h-2" />}
                                        </div>
                                        <span className={cn("text-[10px] truncate font-semibold", task.status === 'done' ? "text-muted-foreground line-through" : "text-zinc-300")}>
                                          {task.title}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                        className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  {projectTasks.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground/60 italic py-6 text-center">No tasks assigned.</p>
                                  )}
                                </div>
                              </div>

                            </div>

                            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                              <span>Overall execution completion rate: {progress}%</span>
                              <div className="w-24 bg-white/5 rounded-full h-1 overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── Shared Task Details Overlay Drawer ─── */}
      {openTask && (
        <TaskDetailPanel
          task={openTask}
          orgId={orgId}
          actor={actor}
          authorUsername={userProfile?.username || actor.name}
          onClose={() => {
            const copy = new URLSearchParams(searchParams);
            copy.delete('task');
            setSearchParams(copy);
          }}
        />
      )}
    </div>
  );
}
