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
  Circle
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

  // Sidebar Controls: 'my-space' (Personal workspace), 'my-team' (Team coordination & projects)
  const [activeSection, setActiveSection] = React.useState<'my-space' | 'my-team'>('my-space');
  
  // Filters State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState('all');
  const [selectedPriority, setSelectedPriority] = React.useState('all');
  const [showFilters, setShowFilters] = React.useState(false);

  // Scrollable Slide-Over Drawer States
  const [showCreateDrawer, setShowCreateDrawer] = React.useState(false);
  const [createType, setCreateType] = React.useState<'goal' | 'project' | 'task'>('goal');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form States
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
      'bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-400',
      'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
      'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
      'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
      'bg-pink-500/10 border-pink-500/25 text-pink-600 dark:text-pink-400',
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

  // Pre-fill action triggers for scrollable slide-over drawer
  const triggerAddGoal = (projectId: string) => {
    setGoalForm({ title: '', description: '', projectId, ownerId: '', horizon: 'short_term', targetDate: '' });
    setCreateType('goal');
    setShowCreateDrawer(true);
  };

  const triggerAddTask = (goalId: string, projectId?: string | null) => {
    setTaskForm({ title: '', description: '', priority: 'none', projectId: projectId || '', goalId, assigneeId: '', dueDate: '' });
    setCreateType('task');
    setShowCreateDrawer(true);
  };

  // Creation submissions
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
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

  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
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

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
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

  // Segmenting Tasks & Goals (My Space vs. My Team)
  const myTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.assigneeIds.includes(actor.uid));
  }, [filteredTasks, actor.uid]);

  const myGoals = React.useMemo(() => {
    return filteredGoals.filter(g => g.ownerId === actor.uid);
  }, [filteredGoals, actor.uid]);

  const assignedTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.creatorId === actor.uid && !t.assigneeIds.includes(actor.uid));
  }, [filteredTasks, actor.uid]);

  const reviewTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.creatorId === actor.uid && t.status === 'review');
  }, [filteredTasks, actor.uid]);

  const standaloneTasks = React.useMemo(() => {
    return filteredTasks.filter(t => !t.projectId && !t.goalId);
  }, [filteredTasks]);

  const briefTasksList = React.useMemo(() => {
    return tasks.filter(t => !t.parentTaskId && t.status !== 'done').slice(0, 5);
  }, [tasks]);

  const briefGoalsList = React.useMemo(() => {
    return goals.filter(g => g.status === 'active').slice(0, 3);
  }, [goals]);

  const isLoading = tasksLoading || goalsLoading || projectsLoading;

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-semibold">
        No organization context found. Please log in and check your workspace parameters.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
      
      {/* ─── Top Workspace Brief Banner (Active Summary Section) ─── */}
      <div className="mb-4 shrink-0 rounded-2xl border border-border-default/80 bg-surface/50 dark:bg-surface/30 p-4 backdrop-blur-xl shadow-md">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Workspace Brief</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Active Goals brief */}
          <div className="space-y-2">
            <h3 className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Active Goals Briefing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {briefGoalsList.length > 0 ? (
                briefGoalsList.map(g => (
                  <div key={g.id} className="p-2 rounded-xl bg-bg-secondary/40 border border-border-default text-[10px] space-y-1">
                    <span className="font-semibold text-foreground truncate block">{g.title}</span>
                    <span className="text-[8px] text-muted-foreground block">Rollup: {g.progressRollup ?? 0}%</span>
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground italic col-span-3">No active goals.</span>
              )}
            </div>
          </div>

          {/* Pending Tasks brief */}
          <div className="space-y-2">
            <h3 className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <CheckSquare className="w-3 h-3" /> Urgent Execution Briefing
            </h3>
            <div className="flex flex-wrap gap-2">
              {briefTasksList.length > 0 ? (
                briefTasksList.map(t => (
                  <div key={t.id} className="px-2.5 py-1 rounded-xl bg-bg-secondary/40 border border-border-default text-[9px] font-semibold text-foreground flex items-center gap-1.5">
                    <Circle className="w-1.5 h-1.5 fill-current text-sky-400" />
                    <span>{t.title}</span>
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground italic">No pending tasks.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Split Screen (Left Sidebar + Vertical Canvas) ─── */}
      <div className="flex-1 flex gap-5 overflow-hidden min-h-0 relative">
        
        {/* ─── 1. Left Workspace Sidebar ─── */}
        <div className="w-60 shrink-0 border border-border-default/80 bg-surface/50 dark:bg-surface/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-xl">
          
          {/* Navigation Controls */}
          <div className="space-y-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block select-none">
              Space Controls
            </span>

            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveSection('my-space')}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                  activeSection === 'my-space'
                    ? "bg-accent/[0.08] border-accent/25 text-foreground dark:text-white"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/30"
                )}
              >
                <Trophy className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>My Space</span>
              </button>
              
              <button
                onClick={() => setActiveSection('my-team')}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                  activeSection === 'my-team'
                    ? "bg-accent/[0.08] border-accent/25 text-foreground dark:text-white"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/30"
                )}
              >
                <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>My Team</span>
              </button>
            </div>
          </div>

          {/* Action CTAs (Drawer triggers) */}
          <div className="space-y-2 pt-4 border-t border-border-default/45">
            <button
              onClick={() => {
                setGoalForm({ title: '', description: '', projectId: '', ownerId: actor.uid, horizon: 'short_term', targetDate: '' });
                setCreateType('goal');
                setShowCreateDrawer(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] hover:bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-450 py-2.5 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Goal</span>
            </button>

            <button
              onClick={() => {
                setTaskForm({ title: '', description: '', priority: 'none', projectId: '', goalId: '', assigneeId: actor.uid, dueDate: '' });
                setCreateType('task');
                setShowCreateDrawer(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/[0.05] hover:bg-sky-500/[0.08] text-sky-600 dark:text-sky-450 py-2.5 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Task</span>
            </button>

            <button
              onClick={() => {
                setProjectForm({ name: '', description: '', startDate: '', dueDate: '' });
                setCreateType('project');
                setShowCreateDrawer(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] hover:bg-indigo-500/[0.08] text-indigo-600 dark:text-indigo-405 py-2.5 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>

        </div>

        {/* ─── 2. Expanded Vertical Viewport Main Canvas ─── */}
        <div className="flex-1 min-h-0 border border-border-default/80 bg-surface/50 dark:bg-surface/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10">
          
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 h-8 animate-spin text-accent" />
                <p className="text-[11px] text-muted-foreground font-semibold tracking-wide animate-pulse">Loading active view...</p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full overflow-y-auto aether-scroll p-6 space-y-6">
              
              {/* ━━━━━━ Section A: My Space ━━━━━━ */}
              {activeSection === 'my-space' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                  
                  {/* Column 1: My Operational Goals */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">My Operational Goals</h3>
                    <div className="space-y-4">
                      {myGoals.length > 0 ? (
                        myGoals.map(goal => {
                          const goalTasks = tasks.filter(t => t.goalId === goal.id);
                          const doneTasks = goalTasks.filter(t => t.status === 'done').length;
                          const progress = goal.progressRollup ?? 0;
                          const linkedProj = projects.find(p => p.id === goal.projectId);

                          return (
                            <div
                              key={goal.id}
                              className="bg-surface/50 border border-border-default rounded-2xl p-4.5 space-y-4 hover:border-emerald-500/30 hover:bg-surface transition-all shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default text-emerald-600 dark:text-emerald-450 bg-emerald-500/[0.04]">
                                      {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                    </span>
                                    {linkedProj && (
                                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default text-accent bg-accent/[0.04]" style={{ color: 'var(--accent)' }}>
                                        {linkedProj.name}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-foreground mt-2.5">{goal.title}</h4>
                                  {goal.description && <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{goal.description}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {goal.targetDate && (
                                    <span className="text-[8px] text-muted-foreground font-mono bg-bg-secondary border border-border-default rounded px-2 py-0.5">
                                      {new Date((goal.targetDate as any).seconds * 1000).toLocaleDateString()}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                    className="text-muted-foreground hover:text-red-400 p-1 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Progress rollup */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                                  <span>Goal Rollup Progress</span>
                                  <span>{progress}% ({doneTasks}/{goalTasks.length} tasks)</span>
                                </div>
                                <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                                </div>
                              </div>

                              {/* Nested Tasks checklist */}
                              <div className="space-y-1.5 pt-3.5 border-t border-border-default/45">
                                {goalTasks.map(task => (
                                  <div
                                    key={task.id}
                                    onClick={() => setSearchParams({ task: task.id })}
                                    className="flex items-center justify-between p-2 rounded-xl bg-bg-primary/30 hover:bg-bg-secondary/60 border border-border-subtle hover:border-border-default transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div
                                        onClick={(e) => handleToggleTaskStatus(e, task)}
                                        className={cn(
                                          "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                          task.status === 'done' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-450" : "border-border-default bg-bg-primary/50"
                                        )}
                                      >
                                        {task.status === 'done' && <Check className="w-2.5 h-2.5" />}
                                      </div>
                                      <span className={cn("text-[11px] truncate font-semibold", task.status === 'done' ? "text-muted-foreground line-through font-normal" : "text-foreground")}>
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
                                  className="text-[9px] text-muted-foreground hover:text-foreground font-bold flex items-center gap-1 pt-1.5"
                                >
                                  <Plus className="w-3 h-3" /> Add Task
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 rounded-2xl border border-dashed border-border-default bg-bg-secondary/20 flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] text-muted-foreground italic">No goals assigned to you.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: My Execution Tasks */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-650 dark:text-sky-400">My Action Items</h3>
                    <div className="space-y-2">
                      {myTasks.length > 0 ? (
                        myTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSearchParams({ task: task.id })}
                            className="flex items-center justify-between p-3 rounded-xl bg-surface/50 hover:bg-surface border border-border-default transition-all cursor-pointer group shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                onClick={(e) => handleToggleTaskStatus(e, task)}
                                className={cn(
                                  "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                  task.status === 'done' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-border-default bg-bg-primary/50"
                                )}
                              >
                                {task.status === 'done' && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <div className="min-w-0">
                                <span className={cn("text-[11px] truncate font-semibold block", task.status === 'done' ? "text-muted-foreground line-through font-normal" : "text-foreground")}>
                                  {task.title}
                                </span>
                                {task.priority !== 'none' && (
                                  <span className="text-[7px] uppercase font-bold tracking-wider font-mono text-muted-foreground mt-0.5 block">
                                    Priority: {task.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {task.dueDate && (
                                <span className="text-[8px] font-mono text-muted-foreground bg-bg-secondary rounded px-1.5 py-0.5 border border-border-default">
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
                        <p className="text-[10px] text-muted-foreground italic text-center py-6">No tasks assigned to you.</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* ━━━━━━ Section B: My Team ━━━━━━ */}
              {activeSection === 'my-team' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  
                  {/* Sub-section 1: Approvals & Reviews */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Pending Reviews</h3>
                    <div className="space-y-2">
                      {reviewTasks.length > 0 ? (
                        reviewTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSearchParams({ task: task.id })}
                            className="flex flex-col gap-3 p-3.5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 hover:bg-amber-500/[0.05] transition-all cursor-pointer shadow-sm"
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] truncate font-bold text-foreground block">
                                {task.title}
                              </span>
                              <p className="text-[8px] text-muted-foreground mt-0.5 font-semibold">
                                Submitted by: {task.assigneeIds.map(uid => memberMap.get(uid)?.fullName || 'Member').join(', ')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleUpdateTaskStatus(task, 'done');
                                }}
                                className="flex-1 py-1 bg-foreground hover:bg-foreground/90 text-background font-bold rounded-lg text-[9px] transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleUpdateTaskStatus(task, 'todo');
                                }}
                                className="flex-1 py-1 border border-border-default hover:bg-bg-secondary text-foreground font-bold rounded-lg text-[9px] transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic text-center py-6">No reviews pending.</p>
                      )}
                    </div>
                  </div>

                  {/* Sub-section 2: Tasks I Assigned */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-650 dark:text-purple-400">Delegated Tasks</h3>
                    <div className="space-y-2">
                      {assignedTasks.length > 0 ? (
                        assignedTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSearchParams({ task: task.id })}
                            className="flex items-center justify-between p-3 rounded-xl bg-surface/50 hover:bg-surface border border-border-default transition-all cursor-pointer group shadow-sm"
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] truncate font-semibold block text-foreground">
                                {task.title}
                              </span>
                              <span className="text-[7px] uppercase font-bold tracking-wider font-mono text-purple-600 dark:text-purple-450 mt-0.5 block">
                                Delegate: {task.assigneeIds.map(uid => memberMap.get(uid)?.fullName || 'Member').join(', ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="px-1.5 py-0.5 bg-bg-secondary border border-border-default rounded text-[8px] font-bold text-text-secondary capitalize">
                                {task.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic text-center py-6">No assigned tasks.</p>
                      )}
                    </div>
                  </div>

                  {/* Sub-section 3: Projects & Initiatives */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-650 dark:text-indigo-400">Team Initiatives</h3>
                    <div className="space-y-4">
                      {projects.map(project => {
                        const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
                        const done = projectTasks.filter(t => t.status === 'done').length;
                        const progress = projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0;

                        return (
                          <div
                            key={project.id}
                            className="bg-surface/50 border border-border-default rounded-2xl p-4 space-y-4 hover:border-indigo-500/20 transition-all shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border-default/45">
                              <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                                <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                {project.name}
                              </h4>
                              <button
                                onClick={(e) => handleDeleteProjectItem(e, project.id)}
                                className="text-muted-foreground hover:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold">
                              <span>Tasks: {done}/{projectTasks.length}</span>
                              <span>{progress}%</span>
                            </div>

                            <div className="flex justify-between pt-1 border-t border-border-default/45">
                              <button
                                onClick={() => triggerAddGoal(project.id)}
                                className="text-[9px] text-emerald-600 dark:text-emerald-450 hover:underline font-bold flex items-center gap-0.5"
                              >
                                <Plus className="w-2.5 h-2.5" /> Goal
                              </button>
                              <button
                                onClick={() => triggerAddTask('', project.id)}
                                className="text-[9px] text-sky-600 dark:text-sky-450 hover:underline font-bold flex items-center gap-0.5"
                              >
                                <Plus className="w-2.5 h-2.5" /> Task
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* ─── 3. Scrollable Right-Side Slide-Over Creation Drawer ─── */}
      <AnimatePresence>
        {showCreateDrawer && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateDrawer(false)}
              className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-40"
            />

            {/* Scrollable Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border-l border-border-default shadow-2xl flex flex-col h-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-border-default/45 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {(['goal', 'task', 'project'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCreateType(type)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-black tracking-wide cursor-pointer capitalize border transition-all",
                        createType === type
                          ? "bg-accent/[0.08] border-accent/40 text-foreground dark:text-white"
                          : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowCreateDrawer(false)}
                  className="w-8 h-8 rounded-full border border-border-default flex items-center justify-center hover:bg-bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Infinite Scrollable Form */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 aether-scroll">
                
                {createType === 'project' && (
                  <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Initiative Name</label>
                      <input
                        type="text"
                        placeholder="Project Name..."
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        required
                        className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent/40 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Scope Description</label>
                      <textarea
                        placeholder="Initiative parameters and deliverables..."
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        rows={4}
                        className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent/40 font-semibold resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={projectForm.startDate}
                          onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                          className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={projectForm.dueDate}
                          onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                          className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !projectForm.name.trim()}
                      className="w-full py-3 bg-accent text-white font-bold rounded-xl text-xs active:scale-98 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-6"
                      style={{ background: 'var(--accent)' }}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Initiative Project'}
                    </button>
                  </form>
                )}

                {createType === 'goal' && (
                  <form onSubmit={handleCreateGoalSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Goal Focus</label>
                      <input
                        type="text"
                        placeholder="Goal Title..."
                        value={goalForm.title}
                        onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                        required
                        className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent/40 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Job Outcome Definition</label>
                      <textarea
                        placeholder="What responsibility is mapped to this goal?"
                        value={goalForm.description}
                        onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                        rows={4}
                        className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent/40 font-semibold resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Project Initiative</label>
                        <select
                          value={goalForm.projectId}
                          onChange={(e) => setGoalForm({ ...goalForm, projectId: e.target.value })}
                          className="w-full bg-surface border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        >
                          <option value="" className="bg-surface text-foreground font-semibold">Standalone Goal</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id} className="bg-surface text-foreground font-semibold">{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Assignee Employee</label>
                        <select
                          value={goalForm.ownerId}
                          onChange={(e) => setGoalForm({ ...goalForm, ownerId: e.target.value })}
                          className="w-full bg-surface border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        >
                          <option value="" className="bg-surface text-foreground font-semibold">Select Employee...</option>
                          {members.map(m => (
                            <option key={m.uid} value={m.uid} className="bg-surface text-foreground font-semibold">{m.fullName || m.username}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Chronology Horizon</label>
                        <select
                          value={goalForm.horizon}
                          onChange={(e) => setGoalForm({ ...goalForm, horizon: e.target.value as any })}
                          className="w-full bg-surface border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        >
                          <option value="short_term" className="bg-surface text-foreground font-semibold">Short Term</option>
                          <option value="long_term" className="bg-surface text-foreground font-semibold">Long Term</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Target Date</label>
                        <input
                          type="date"
                          value={goalForm.targetDate}
                          onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                          className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !goalForm.title.trim()}
                      className="w-full py-3 bg-accent text-white font-bold rounded-xl text-xs active:scale-98 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-6"
                      style={{ background: 'var(--accent)' }}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Goal focus'}
                    </button>
                  </form>
                )}

                {createType === 'task' && (
                  <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Task Action</label>
                      <input
                        type="text"
                        placeholder="Task Title..."
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        required
                        className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent/40 font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Execution Steps</label>
                      <textarea
                        placeholder="Parameters to fulfill..."
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        rows={4}
                        className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-accent/40 font-semibold resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Link to Project</label>
                        <select
                          value={taskForm.projectId}
                          onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                          className="w-full bg-surface border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        >
                          <option value="" className="bg-surface text-foreground font-semibold">No Project</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id} className="bg-surface text-foreground font-semibold">{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Link to Goal</label>
                        <select
                          value={taskForm.goalId}
                          onChange={(e) => setTaskForm({ ...taskForm, goalId: e.target.value })}
                          className="w-full bg-surface border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        >
                          <option value="" className="bg-surface text-foreground font-semibold">No Goal</option>
                          {goals.map(g => (
                            <option key={g.id} value={g.id} className="bg-surface text-foreground font-semibold">{g.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Assignee</label>
                        <select
                          value={taskForm.assigneeId}
                          onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                          className="w-full bg-surface border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        >
                          <option value="" className="bg-surface text-foreground font-semibold">Select Member...</option>
                          {members.map(m => (
                            <option key={m.uid} value={m.uid} className="bg-surface text-foreground font-semibold">{m.fullName || m.username}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Priority</label>
                        <select
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                          className="w-full bg-surface border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        >
                          <option value="none" className="bg-surface text-foreground font-semibold">None</option>
                          <option value="low" className="bg-surface text-foreground font-semibold">Low</option>
                          <option value="medium" className="bg-surface text-foreground font-semibold">Medium</option>
                          <option value="high" className="bg-surface text-foreground font-semibold">High</option>
                          <option value="urgent" className="bg-surface text-foreground font-semibold">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold block mb-1">Due Date</label>
                        <input
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                          className="w-full bg-bg-primary/50 border border-border-default rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-semibold"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !taskForm.title.trim()}
                      className="w-full py-3 bg-accent text-white font-bold rounded-xl text-xs active:scale-98 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-6"
                      style={{ background: 'var(--accent)' }}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Task'}
                    </button>
                  </form>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
