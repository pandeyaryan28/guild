import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Layers,
  Target,
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
  SlidersHorizontal
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

  // Tabs: 'matrix' (Relational Grid), 'goals' (Employee Goals Focus), 'board' (Kanban Execution)
  const [activeTab, setActiveTab] = React.useState<'matrix' | 'goals' | 'board'>('goals');
  
  // Scopes & Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterProject, setFilterProject] = React.useState('all');
  const [filterAssignee, setFilterAssignee] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});

  // Unified creation drawers/toggles
  const [showCreateDrawer, setShowCreateDrawer] = React.useState(false);
  const [createType, setCreateType] = React.useState<'project' | 'goal' | 'task'>('goal');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states
  const [projectForm, setProjectForm] = React.useState({ name: '', description: '', startDate: '', dueDate: '' });
  const [goalForm, setGoalForm] = React.useState({ title: '', description: '', projectId: '', ownerId: '', horizon: 'short_term' as 'short_term' | 'long_term', targetDate: '' });
  const [taskForm, setTaskForm] = React.useState({ title: '', description: '', priority: 'none' as TaskPriority, projectId: '', goalId: '', assigneeId: '', dueDate: '' });

  // Data fetching hooks
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams } = useTeams(orgId);
  const members = useOrgMembers(orgId);

  // Task Drawer parameters
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');
  const openTask = React.useMemo(() => tasks.find((t) => t.id === openTaskId) ?? null, [tasks, openTaskId]);

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Member',
  }), [user, userProfile]);

  // Map member IDs to full names and designations
  const memberMap = React.useMemo(() => {
    const map: Record<string, { name: string; username: string; designation: string }> = {};
    members.forEach((m) => {
      map[m.uid] = {
        name: m.fullName || m.username || 'Member',
        username: m.username || 'member',
        designation: m.designation || 'Team Member'
      };
    });
    return map;
  }, [members]);

  const getInitials = (userId: string) => {
    const m = memberMap[userId];
    if (!m) return 'U';
    return m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Pre-fill helpers for inline adding
  const triggerAddGoalForProject = (projectId: string) => {
    setGoalForm(prev => ({ ...prev, projectId }));
    setCreateType('goal');
    setShowCreateDrawer(true);
  };

  const triggerAddTaskForGoal = (goalId: string, projectId?: string | null) => {
    setTaskForm(prev => ({
      ...prev,
      goalId,
      projectId: projectId || ''
    }));
    setCreateType('task');
    setShowCreateDrawer(true);
  };

  const triggerAddTaskForProject = (projectId: string) => {
    setTaskForm(prev => ({
      ...prev,
      projectId,
      goalId: ''
    }));
    setCreateType('task');
    setShowCreateDrawer(true);
  };

  // Toggle sections expanders
  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
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

  const handleToggleCompleteTask = async (task: Task) => {
    if (!orgId) return;
    const targetStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await moveTask(task.id, orgId, targetStatus, task.orderIndex || 0, task.status, actor);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleMoveTaskStatus = async (task: Task, targetStatus: TaskStatus) => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, targetStatus, task.orderIndex || 0, task.status, actor);
    } catch (err) {
      console.error('Failed to move task status:', err);
    }
  };

  const handleDeleteTaskItem = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const handleDeleteGoalItem = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal? This will unlink associated tasks.')) {
      try {
        await deleteGoal(goalId);
      } catch (err) {
        console.error('Failed to delete goal:', err);
      }
    }
  };

  const handleDeleteProjectItem = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? This will unlink associated goals and tasks.')) {
      try {
        await deleteProject(projectId);
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };

  // Filter logic
  const filteredTasksList = React.useMemo(() => {
    return tasks.filter((t) => {
      if (t.parentTaskId) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterProject !== 'all' && t.projectId !== filterProject) return false;
      if (filterAssignee !== 'all' && !t.assigneeIds.includes(filterAssignee)) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, searchQuery, filterProject, filterAssignee, filterPriority]);

  const filteredGoalsList = React.useMemo(() => {
    return goals.filter((g) => {
      if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterProject !== 'all' && g.projectId !== filterProject) return false;
      if (filterAssignee !== 'all' && g.ownerId !== filterAssignee) return false;
      return true;
    });
  }, [goals, searchQuery, filterProject, filterAssignee]);

  // Statistics
  const overallStats = React.useMemo(() => {
    const total = tasks.filter(t => !t.parentTaskId).length;
    const completed = tasks.filter(t => !t.parentTaskId && t.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate, goalsCount: goals.length, projectsCount: projects.length };
  }, [tasks, goals, projects]);

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 text-sm">
        No organization context found. Please log in and check your workspace parameters.
      </div>
    );
  }

  const isLoading = projectsLoading || goalsLoading || tasksLoading;

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950/60 rounded-2xl border border-zinc-900 p-6 overflow-hidden">
      
      {/* ─── Premium Header & Analytics ─── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-zinc-900">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Workspace</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage team-level initiatives, align employee goals, and execute operations.</p>
        </div>

        {/* Global Statistics Panel */}
        <div className="flex flex-wrap items-center gap-4 bg-zinc-900/30 border border-zinc-900 rounded-xl px-4 py-2.5">
          <div className="text-center px-3 border-r border-zinc-900">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Projects</span>
            <span className="text-sm font-semibold text-white">{overallStats.projectsCount}</span>
          </div>
          <div className="text-center px-3 border-r border-zinc-900">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Goals</span>
            <span className="text-sm font-semibold text-emerald-400">{overallStats.goalsCount}</span>
          </div>
          <div className="text-center px-3 border-r border-zinc-900">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Tasks Done</span>
            <span className="text-sm font-semibold text-sky-400">{overallStats.completed}/{overallStats.total}</span>
          </div>
          <div className="text-center px-3">
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Success Rate</span>
            <span className="text-sm font-semibold text-indigo-400">{overallStats.rate}%</span>
          </div>
        </div>
      </div>

      {/* ─── Interactive Controls (View Tabs & Global Filters) ─── */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 py-4 border-b border-zinc-900">
        
        {/* Navigation Tabs */}
        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-900 self-start shrink-0">
          <button
            onClick={() => setActiveTab('goals')}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-250 flex items-center gap-2",
              activeTab === 'goals'
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-zinc-400 hover:text-zinc-200 border border-transparent"
            )}
          >
            <Trophy className="w-3.5 h-3.5" />
            Goals Hub
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-250 flex items-center gap-2",
              activeTab === 'matrix'
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-zinc-400 hover:text-zinc-200 border border-transparent"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Matrix View
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-250 flex items-center gap-2",
              activeTab === 'board'
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                : "text-zinc-400 hover:text-zinc-200 border border-transparent"
            )}
          >
            <Kanban className="w-3.5 h-3.5" />
            Execution Board
          </button>
        </div>

        {/* Global Inline Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/40 border border-zinc-900 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-800 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div className="relative">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-zinc-900/40 border border-zinc-900 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="relative">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-zinc-900/40 border border-zinc-900 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800"
            >
              <option value="all">All Assignees</option>
              {members.map(m => (
                <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
              ))}
            </select>
          </div>

          {/* "+ New" Action Button */}
          <button
            onClick={() => {
              setShowCreateDrawer(!showCreateDrawer);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 ml-auto"
          >
            <Plus className="w-4 h-4" />
            Create...
          </button>
        </div>
      </div>

      {/* ─── Collapsible Unified Creation Drawer ─── */}
      <AnimatePresence>
        {showCreateDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-zinc-900/20 border-b border-zinc-900"
          >
            <div className="py-6 px-1 space-y-6">
              
              {/* Switch Creation Category */}
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateType('goal')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    createType === 'goal'
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                      : "bg-transparent border-zinc-900 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  New Goal (Employee Job focus)
                </button>
                <button
                  onClick={() => setCreateType('project')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    createType === 'project'
                      ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400"
                      : "bg-transparent border-zinc-900 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  New Project (Team initiative)
                </button>
                <button
                  onClick={() => setCreateType('task')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    createType === 'task'
                      ? "bg-sky-500/10 border-sky-500/25 text-sky-400"
                      : "bg-transparent border-zinc-900 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  New Task (Execution action)
                </button>
              </div>

              {/* Category-Specific Forms */}
              {createType === 'project' && (
                <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Project Name..."
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-800 transition-all font-semibold"
                    />
                    <textarea
                      placeholder="Description of team initiative..."
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                      rows={3}
                      className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-800 transition-all font-semibold resize-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Start Date</label>
                        <input
                          type="date"
                          value={projectForm.startDate}
                          onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Due Date</label>
                        <input
                          type="date"
                          value={projectForm.dueDate}
                          onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !projectForm.name.trim()}
                        className="bg-indigo-500 hover:bg-indigo-600 text-zinc-950 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                      >
                        {isSubmitting ? 'Creating Project...' : 'Create Project'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateDrawer(false)}
                        className="border border-zinc-900 hover:bg-zinc-900 text-zinc-400 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {createType === 'goal' && (
                <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Goal Title..."
                      value={goalForm.title}
                      onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-800 transition-all font-semibold"
                    />
                    <textarea
                      placeholder="What outcome represents this goal?"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                      rows={3}
                      className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-800 transition-all font-semibold resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Link to Project</label>
                        <select
                          value={goalForm.projectId}
                          onChange={(e) => setGoalForm({ ...goalForm, projectId: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        >
                          <option value="">Standalone Goal</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Assignee</label>
                        <select
                          value={goalForm.ownerId}
                          onChange={(e) => setGoalForm({ ...goalForm, ownerId: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        >
                          <option value="">Current User</option>
                          {members.map(m => (
                            <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Horizon</label>
                        <select
                          value={goalForm.horizon}
                          onChange={(e) => setGoalForm({ ...goalForm, horizon: e.target.value as any })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        >
                          <option value="short_term">Short Term</option>
                          <option value="long_term">Long Term</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Target Date</label>
                        <input
                          type="date"
                          value={goalForm.targetDate}
                          onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !goalForm.title.trim()}
                        className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                      >
                        {isSubmitting ? 'Creating Goal...' : 'Create Goal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateDrawer(false)}
                        className="border border-zinc-900 hover:bg-zinc-900 text-zinc-400 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {createType === 'task' && (
                <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Task Title..."
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      required
                      className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-800 transition-all font-semibold"
                    />
                    <textarea
                      placeholder="Description of execution steps..."
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      rows={3}
                      className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-800 transition-all font-semibold resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Link to Project</label>
                        <select
                          value={taskForm.projectId}
                          onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        >
                          <option value="">No Project</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Link to Goal</label>
                        <select
                          value={taskForm.goalId}
                          onChange={(e) => setTaskForm({ ...taskForm, goalId: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        >
                          <option value="">No Goal</option>
                          {goals.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Assignee</label>
                        <select
                          value={taskForm.assigneeId}
                          onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        >
                          <option value="">Assignee...</option>
                          {members.map(m => (
                            <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Priority</label>
                        <select
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        >
                          <option value="none">None</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 block uppercase tracking-wider mb-1">Due Date</label>
                        <input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          className="w-full bg-zinc-900/60 border border-zinc-900 rounded-lg px-3.5 py-2 text-xs text-white outline-none cursor-pointer focus:border-zinc-800 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !taskForm.title.trim()}
                        className="bg-sky-500 hover:bg-sky-600 text-zinc-950 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                      >
                        {isSubmitting ? 'Creating Task...' : 'Create Task'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateDrawer(false)}
                        className="border border-zinc-900 hover:bg-zinc-900 text-zinc-400 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Scrollable Spatial Canvas Workspace ─── */}
      <div className="flex-1 overflow-y-auto mt-6 pr-1 space-y-8">
        
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-zinc-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-700 mr-2" />
            Syncing workspace...
          </div>
        ) : (
          <>
            
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TABS VIEW 1: GOALS HUB (Primary Employee job focus) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {activeTab === 'goals' && (
              <div className="space-y-8">
                {/* Visual context */}
                <div className="bg-emerald-950/10 border border-emerald-900/25 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">Employee Goal Mapping</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Goals represent an employee's primary operational focus. Tasks represent execution action items.</p>
                    </div>
                  </div>
                </div>

                {/* Group goals by employee! */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {members.map(member => {
                    const memberGoals = filteredGoalsList.filter(g => g.ownerId === member.uid);
                    if (filterAssignee !== 'all' && member.uid !== filterAssignee) return null;

                    return (
                      <div key={member.uid} className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-5 space-y-4">
                        {/* Member Profile Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-900/60">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400">
                              {getInitials(member.uid)}
                            </div>
                            <div>
                              <h3 className="text-xs font-semibold text-white">{member.fullName || member.username}</h3>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{member.designation || 'Team Member'}</p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              setGoalForm(prev => ({ ...prev, ownerId: member.uid }));
                              setCreateType('goal');
                              setShowCreateDrawer(true);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-md px-2.5 py-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Goal
                          </button>
                        </div>

                        {/* List of goals for this member */}
                        <div className="space-y-4">
                          {memberGoals.length > 0 ? (
                            memberGoals.map(goal => {
                              const goalTasks = tasks.filter(t => t.goalId === goal.id && !t.parentTaskId);
                              const totalGoalTasks = goalTasks.length;
                              const completedGoalTasks = goalTasks.filter(t => t.status === 'done').length;
                              const currentProgress = goal.progressRollup ?? 0;
                              const linkedProject = projects.find(p => p.id === goal.projectId);

                              return (
                                <div key={goal.id} className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 space-y-3 hover:border-zinc-800 transition-colors">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                          {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                        </span>
                                        {linkedProject && (
                                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                                            {linkedProject.name}
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="text-xs font-bold text-white mt-1.5">{goal.title}</h4>
                                      {goal.description && (
                                        <p className="text-[10px] text-zinc-500">{goal.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {goal.targetDate && (
                                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 bg-zinc-900/60 rounded px-1.5 py-0.5 border border-zinc-900">
                                          <Calendar className="w-2.5 h-2.5" />
                                          <span>{new Date((goal.targetDate as any).seconds * 1000).toLocaleDateString()}</span>
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleDeleteGoalItem(goal.id)}
                                        className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="space-y-1 pt-1.5">
                                    <div className="flex justify-between text-[9px] text-zinc-500">
                                      <span>Goal Progress</span>
                                      <span>{currentProgress}% ({completedGoalTasks}/{totalGoalTasks} tasks)</span>
                                    </div>
                                    <div className="w-full bg-zinc-900/80 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${currentProgress}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Nested Tasks under this Goal */}
                                  <div className="pt-3 border-t border-zinc-900/80 space-y-1.5">
                                    {goalTasks.length > 0 ? (
                                      goalTasks.map(t => (
                                        <div
                                          key={t.id}
                                          className="flex items-center justify-between gap-3 p-2 bg-zinc-950/40 border border-zinc-900/40 rounded hover:border-zinc-800 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <button
                                              onClick={() => handleToggleCompleteTask(t)}
                                              className={cn(
                                                "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                                                t.status === 'done'
                                                  ? "bg-emerald-500 border-emerald-500 text-zinc-950"
                                                  : "border-zinc-800 hover:border-zinc-600 text-transparent"
                                              )}
                                            >
                                              <CheckSquare className="w-3 h-3" />
                                            </button>
                                            <span
                                              onClick={() => setSearchParams({ task: t.id })}
                                              className={cn(
                                                "text-xs truncate cursor-pointer hover:underline",
                                                t.status === 'done' ? "text-zinc-500 line-through" : "text-zinc-300 font-semibold"
                                              )}
                                            >
                                              {t.title}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {t.priority !== 'none' && (
                                              <span className={cn(
                                                "text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded font-mono",
                                                t.priority === 'urgent' && "bg-red-500/10 text-red-400 border border-red-500/10",
                                                t.priority === 'high' && "bg-orange-500/10 text-orange-400 border border-orange-500/10",
                                                t.priority === 'medium' && "bg-amber-500/10 text-amber-400 border border-amber-500/10",
                                                t.priority === 'low' && "bg-sky-500/10 text-sky-400 border border-sky-500/10"
                                              )}>
                                                {t.priority}
                                              </span>
                                            )}
                                            <button
                                              onClick={() => handleDeleteTaskItem(t.id)}
                                              className="text-zinc-600 hover:text-red-400 transition-colors"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-[10px] text-zinc-600 italic py-1">No tasks mapped to this goal yet.</p>
                                    )}
                                    <button
                                      onClick={() => triggerAddTaskForGoal(goal.id, goal.projectId)}
                                      className="text-[10px] text-zinc-500 hover:text-sky-400 font-semibold flex items-center gap-1 pt-1.5"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add Task
                                    </button>
                                  </div>

                                </div>
                              );
                            })
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-zinc-900 rounded-lg">
                              <p className="text-[11px] text-zinc-600 italic">No goals assigned yet.</p>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TABS VIEW 2: MATRIX CANVAS (Visual Relationship Graph) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {activeTab === 'matrix' && (
              <div className="space-y-8">
                <div className="bg-indigo-950/10 border border-indigo-900/25 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">Initiatives Relational Map</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Projects are high-level team coordinates. Goals map to employees. Tasks act as operational action items.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Active Projects Grid */}
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Active Team Projects</h3>
                  
                  {projects.map(project => {
                    const projectGoals = filteredGoalsList.filter(g => g.projectId === project.id);
                    const projectTasksWithoutGoal = filteredTasksList.filter(t => t.projectId === project.id && !t.goalId);
                    
                    const totalProjTasks = tasks.filter(t => t.projectId === project.id && !t.parentTaskId).length;
                    const completedProjTasks = tasks.filter(t => t.projectId === project.id && t.status === 'done' && !t.parentTaskId).length;
                    const projectProgress = totalProjTasks > 0 ? Math.round((completedProjTasks / totalProjTasks) * 100) : 0;

                    return (
                      <div key={project.id} className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6 space-y-5">
                        
                        {/* Project Header Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900/80">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
                              <h3 className="text-sm font-bold text-white">{project.name}</h3>
                              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                                Project
                              </span>
                            </div>
                            {project.description && (
                              <p className="text-xs text-zinc-400 mt-1.5 max-w-2xl font-medium">{project.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => triggerAddGoalForProject(project.id)}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Goal
                            </button>
                            <button
                              onClick={() => triggerAddTaskForProject(project.id)}
                              className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 rounded-md px-2.5 py-1.5 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Task
                            </button>
                            <button
                              onClick={() => handleDeleteProjectItem(project.id)}
                              className="text-zinc-600 hover:text-red-400 p-1.5 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Project Level Aggregates */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          
                          {/* Project Goals Column */}
                          <div className="md:col-span-2 space-y-3">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Employee Goals aligned to this initiative</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {projectGoals.length > 0 ? (
                                projectGoals.map(goal => {
                                  const goalTasks = tasks.filter(t => t.goalId === goal.id && !t.parentTaskId);
                                  const totalTasks = goalTasks.length;
                                  const doneTasks = goalTasks.filter(t => t.status === 'done').length;

                                  return (
                                    <div key={goal.id} className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-4 space-y-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <span className="text-[8px] bg-zinc-800 text-zinc-400 uppercase tracking-widest px-1.5 py-0.2 rounded font-bold">
                                            Goal
                                          </span>
                                          <h5 className="text-xs font-bold text-white mt-1.5">{goal.title}</h5>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-[9px] text-emerald-400 shrink-0" title={`Assigned to ${memberMap[goal.ownerId]?.name || 'Member'}`}>
                                          {getInitials(goal.ownerId)}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-zinc-500 font-medium">
                                          <span>Goal Completion</span>
                                          <span>{goal.progressRollup ?? 0}%</span>
                                        </div>
                                        <div className="w-full bg-zinc-950 rounded-full h-1 overflow-hidden">
                                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${goal.progressRollup ?? 0}%` }} />
                                        </div>
                                      </div>

                                      {/* Subtask listing */}
                                      <div className="space-y-1 pt-1">
                                        {goalTasks.slice(0, 3).map(t => (
                                          <div key={t.id} className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate">
                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", t.status === 'done' ? "bg-emerald-500" : "bg-zinc-700")} />
                                            <span className={cn(t.status === 'done' && "line-through text-zinc-600")}>{t.title}</span>
                                          </div>
                                        ))}
                                        {goalTasks.length > 3 && (
                                          <span className="text-[9px] text-zinc-500 italic font-medium block">+{goalTasks.length - 3} more action items</span>
                                        )}
                                      </div>

                                      <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                                        <button
                                          onClick={() => triggerAddTaskForGoal(goal.id, project.id)}
                                          className="text-[9px] text-zinc-500 hover:text-sky-400 font-bold flex items-center gap-1"
                                        >
                                          <Plus className="w-3 h-3" />
                                          Add Task
                                        </button>
                                        <button
                                          onClick={() => handleDeleteGoalItem(goal.id)}
                                          className="text-zinc-700 hover:text-red-400 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="col-span-2 flex flex-col items-center justify-center py-8 border border-dashed border-zinc-900 rounded-lg">
                                  <p className="text-[10px] text-zinc-600 italic">No goals linked to this project yet.</p>
                                  <button
                                    onClick={() => triggerAddGoalForProject(project.id)}
                                    className="text-[10px] text-emerald-500 hover:underline mt-2 font-bold"
                                  >
                                    Create a Linked Goal
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Project Level Tasks (Tasks without a Goal) */}
                          <div className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-4 space-y-3">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Project-Level Tasks (No specific goal)</h4>
                            <div className="space-y-1.5">
                              {projectTasksWithoutGoal.length > 0 ? (
                                projectTasksWithoutGoal.map(task => (
                                  <div
                                    key={task.id}
                                    className="flex items-center justify-between gap-3 p-2 bg-zinc-950/40 border border-zinc-900/50 rounded hover:border-zinc-800 transition-all"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <button
                                        onClick={() => handleToggleCompleteTask(task)}
                                        className={cn(
                                          "w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0",
                                          task.status === 'done'
                                            ? "bg-emerald-500 border-emerald-500 text-zinc-950"
                                            : "border-zinc-850 hover:border-zinc-600 text-transparent"
                                        )}
                                      >
                                        <CheckSquare className="w-2.5 h-2.5" />
                                      </button>
                                      <span
                                        onClick={() => setSearchParams({ task: task.id })}
                                        className={cn(
                                          "text-[11px] truncate cursor-pointer hover:underline",
                                          task.status === 'done' ? "text-zinc-650 line-through" : "text-zinc-300 font-semibold"
                                        )}
                                      >
                                        {task.title}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteTaskItem(task.id)}
                                      className="text-zinc-700 hover:text-red-400 shrink-0"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-zinc-650 italic py-4 text-center">No project-level tasks.</p>
                              )}
                            </div>
                            <button
                              onClick={() => triggerAddTaskForProject(project.id)}
                              className="text-[10px] text-zinc-500 hover:text-sky-400 font-bold flex items-center gap-1 pt-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Task
                            </button>
                          </div>

                        </div>

                        {/* Project Overall Progress Tracker */}
                        <div className="pt-4 border-t border-zinc-900/60 flex items-center justify-between gap-4 text-[10px] text-zinc-500 font-semibold">
                          <span>Overall project tasks completion rate: {projectProgress}%</span>
                          <div className="w-32 bg-zinc-950 rounded-full h-1.5 overflow-hidden shadow-inner">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${projectProgress}%` }} />
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {/* ─── Standalone & Muted Coordinates ─── */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-6">
                    
                    {/* Standalone Goals (Unlinked to projects) */}
                    <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Standalone Employee Goals</h3>
                        </div>
                        <button
                          onClick={() => {
                            setGoalForm(prev => ({ ...prev, projectId: '' }));
                            setCreateType('goal');
                            setShowCreateDrawer(true);
                          }}
                          className="text-[10px] text-emerald-450 hover:underline font-bold"
                        >
                          + Create Standalone
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredGoalsList.filter(g => !g.projectId).length > 0 ? (
                          filteredGoalsList.filter(g => !g.projectId).map(goal => {
                            const goalTasks = tasks.filter(t => t.goalId === goal.id && !t.parentTaskId);

                            return (
                              <div key={goal.id} className="bg-zinc-900/35 border border-zinc-900 rounded-lg p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs font-bold text-white truncate">{goal.title}</h4>
                                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-[8px] text-emerald-400 shrink-0" title={`Assigned to ${memberMap[goal.ownerId]?.name || 'Member'}`}>
                                    {getInitials(goal.ownerId)}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[9px] text-zinc-500 font-medium">
                                    <span>Goal Progress</span>
                                    <span>{goal.progressRollup ?? 0}%</span>
                                  </div>
                                  <div className="w-full bg-zinc-950 rounded-full h-1 overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: `${goal.progressRollup ?? 0}%` }} />
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                                  <button
                                    onClick={() => triggerAddTaskForGoal(goal.id)}
                                    className="text-[9px] text-zinc-550 hover:text-sky-400 font-bold flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add Task
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGoalItem(goal.id)}
                                    className="text-zinc-700 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-2 py-6 text-center text-zinc-600 text-xs italic">No standalone goals created yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Standalone Tasks (Unlinked to goals or projects) */}
                    <div className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-zinc-400 shrink-0" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Standalone Execution Tasks</h3>
                        </div>
                        <button
                          onClick={() => {
                            setTaskForm(prev => ({ ...prev, projectId: '', goalId: '' }));
                            setCreateType('task');
                            setShowCreateDrawer(true);
                          }}
                          className="text-[10px] text-sky-400 hover:underline font-bold"
                        >
                          + Create Standalone
                        </button>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {filteredTasksList.filter(t => !t.projectId && !t.goalId).length > 0 ? (
                          filteredTasksList.filter(t => !t.projectId && !t.goalId).map(task => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between gap-3 p-2.5 bg-zinc-900/40 border border-zinc-900/60 rounded-lg hover:border-zinc-800 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={() => handleToggleCompleteTask(task)}
                                  className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                                    task.status === 'done'
                                      ? "bg-emerald-500 border-emerald-500 text-zinc-950"
                                      : "border-zinc-800 hover:border-zinc-600 text-transparent"
                                  )}
                                >
                                  <CheckSquare className="w-3 h-3" />
                                </button>
                                <span
                                  onClick={() => setSearchParams({ task: task.id })}
                                  className={cn(
                                    "text-xs truncate cursor-pointer hover:underline",
                                    task.status === 'done' ? "text-zinc-550 line-through" : "text-zinc-300 font-semibold"
                                  )}
                                >
                                  {task.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {task.assigneeIds.length > 0 && (
                                  <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center font-bold text-[8px] text-zinc-400" title={`Assigned to ${memberMap[task.assigneeIds[0]]?.name || 'Member'}`}>
                                    {getInitials(task.assigneeIds[0])}
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeleteTaskItem(task.id)}
                                  className="text-zinc-700 hover:text-red-400 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-zinc-600 text-xs italic">No standalone tasks found. All tasks are linked to project coordinates or individual goals.</div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TABS VIEW 3: KANBAN EXECUTION BOARD (Tasks Board) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {activeTab === 'board' && (
              <div className="space-y-6">
                <div className="bg-sky-950/10 border border-sky-900/25 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Kanban className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-semibold text-white">Operational Execution Board</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Drag-free execution. Seamlessly shift operational statuses across todo, progress, review and done cycles.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {STATUSES.map(status => {
                    const statusTasks = filteredTasksList.filter(t => t.status === status);
                    const config = STATUS_CONFIG[status];

                    return (
                      <div key={status} className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4 flex flex-col h-[520px] overflow-hidden">
                        
                        {/* Status Column Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-900/60 shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.dot }} />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{config.label}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 rounded-md text-[9px] font-mono font-semibold">
                            {statusTasks.length}
                          </span>
                        </div>

                        {/* Task Card Stack */}
                        <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
                          {statusTasks.length > 0 ? (
                            statusTasks.map(task => {
                              const linkedProject = projects.find(p => p.id === task.projectId);
                              const linkedGoal = goals.find(g => g.id === task.goalId);

                              return (
                                <div
                                  key={task.id}
                                  className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-3 space-y-2 hover:border-zinc-800 transition-all group relative"
                                >
                                  <div className="flex items-start justify-between gap-2.5">
                                    <span
                                      onClick={() => setSearchParams({ task: task.id })}
                                      className={cn(
                                        "text-xs font-semibold cursor-pointer hover:underline line-clamp-2",
                                        task.status === 'done' ? "text-zinc-550 line-through" : "text-zinc-300"
                                      )}
                                    >
                                      {task.title}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteTaskItem(task.id)}
                                      className="text-zinc-700 hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Relational Mapping Tags */}
                                  {(linkedProject || linkedGoal) && (
                                    <div className="flex flex-wrap gap-1.5 pt-1 select-none">
                                      {linkedProject && (
                                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 truncate max-w-[100px]" title={linkedProject.name}>
                                          {linkedProject.name}
                                        </span>
                                      )}
                                      {linkedGoal && (
                                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 truncate max-w-[100px]" title={linkedGoal.title}>
                                          {linkedGoal.title}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Task Footer Meta Data */}
                                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-900/60 text-[9px] text-zinc-550 font-medium">
                                    <div className="flex items-center gap-1.5">
                                      {task.priority !== 'none' && (
                                        <span className={cn(
                                          "px-1 py-0.2 rounded text-[7px] uppercase font-bold",
                                          task.priority === 'urgent' && "bg-red-500/10 text-red-400",
                                          task.priority === 'high' && "bg-orange-500/10 text-orange-400",
                                          task.priority === 'medium' && "bg-amber-500/10 text-amber-400",
                                          task.priority === 'low' && "bg-sky-500/10 text-sky-400"
                                        )}>
                                          {task.priority}
                                        </span>
                                      )}
                                      {task.dueDate && (
                                        <span className="flex items-center gap-0.5">
                                          <Calendar className="w-2.5 h-2.5 shrink-0" />
                                          {new Date((task.dueDate as any).seconds * 1000).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>

                                    {/* Assignee Avatar */}
                                    {task.assigneeIds.length > 0 && (
                                      <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center font-bold text-[8px] text-zinc-400 shrink-0" title={`Assigned to ${memberMap[task.assigneeIds[0]]?.name || 'Member'}`}>
                                        {getInitials(task.assigneeIds[0])}
                                      </div>
                                    )}
                                  </div>

                                  {/* Status Transition Control Buttons */}
                                  <div className="flex gap-1.5 pt-1 justify-end">
                                    {status !== 'todo' && (
                                      <button
                                        onClick={() => {
                                          const prevIdx = STATUSES.indexOf(status) - 1;
                                          handleMoveTaskStatus(task, STATUSES[prevIdx]);
                                        }}
                                        className="text-[8px] bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-400 font-semibold active:scale-95"
                                      >
                                        Prev
                                      </button>
                                    )}
                                    {status !== 'done' && (
                                      <button
                                        onClick={() => {
                                          const nextIdx = STATUSES.indexOf(status) + 1;
                                          handleMoveTaskStatus(task, STATUSES[nextIdx]);
                                        }}
                                        className="text-[8px] bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 px-1.5 py-0.5 rounded text-sky-400 font-semibold active:scale-95 animate-pulse"
                                      >
                                        Next
                                      </button>
                                    )}
                                  </div>

                                </div>
                              );
                            })
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-zinc-900/60 rounded-xl">
                              <p className="text-[10px] text-zinc-650 italic">No tasks active</p>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </>
        )}

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
