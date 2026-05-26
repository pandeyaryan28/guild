import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Layers,
  Check,
  Loader2,
  Search,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  Trash2,
  SlidersHorizontal,
  Folder,
  Circle,
  Settings,
  // Premium Icons
  Sparkles,
  Workflow,
  Target,
  Zap,
  FolderGit,
  Hourglass,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle,
  AlertOctagon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
import { createProject, deleteProject, updateProject } from '../../lib/projects';
import type { Task, TaskStatus, TaskPriority, ActorInfo } from '../../lib/tasks';
import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';

export function TaskCanvas() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Sidebar Controls: 'my-space' (Personal workspace), 'my-team' (Team coordination & projects), 'projects' (Initiative mapping)
  const [activeSection, setActiveSection] = React.useState<'my-space' | 'my-team' | 'projects'>('my-space');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  
  // Collapsed states for completed tasks sections
  const [showCompletedMySpace, setShowCompletedMySpace] = React.useState(false);
  const [showCompletedMyTeam, setShowCompletedMyTeam] = React.useState(false);
  const [showCompletedInitiatives, setShowCompletedInitiatives] = React.useState(false);
  const [completedGoalsExpanded, setCompletedGoalsExpanded] = React.useState<Record<string, boolean>>({});
  const [showCompletedMySpaceGoals, setShowCompletedMySpaceGoals] = React.useState(false);
  const [showCompletedProjects, setShowCompletedProjects] = React.useState(false);

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
      'bg-indigo-500/10 border-indigo-500/25 text-indigo-650 dark:text-indigo-400',
      'bg-cyan-500/10 border-cyan-500/25 text-cyan-600 dark:text-cyan-400',
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

  const handleToggleGoalStatus = async (e: React.MouseEvent, goal: Goal) => {
    e.stopPropagation();
    const nextStatus = goal.status === 'completed' ? 'active' : 'completed';
    try {
      await updateGoal(goal.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to toggle goal status:', err);
    }
  };

  const handleToggleProjectStatus = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const nextStatus = project.status === 'completed' ? 'active' : 'completed';
    try {
      await updateProject(project.id, { status: nextStatus });
    } catch (err) {
      console.error('Failed to toggle project status:', err);
    }
  };

  const toggleGoalCompletedTasks = (goalId: string) => {
    setCompletedGoalsExpanded(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  // Segmenting Tasks & Goals (My Space vs. My Team)
  const myTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.assigneeIds.includes(actor.uid));
  }, [filteredTasks, actor.uid]);

  const myGoals = React.useMemo(() => {
    return filteredGoals.filter(g => g.ownerId === actor.uid);
  }, [filteredGoals, actor.uid]);

  const activeGoals = React.useMemo(() => myGoals.filter(g => g.status !== 'completed'), [myGoals]);
  const completedGoals = React.useMemo(() => myGoals.filter(g => g.status === 'completed'), [myGoals]);

  const activeProjects = React.useMemo(() => projects.filter(p => p.status !== 'completed' && p.status !== 'archived'), [projects]);
  const completedProjects = React.useMemo(() => projects.filter(p => p.status === 'completed'), [projects]);

  const assignedTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.creatorId === actor.uid && !t.assigneeIds.includes(actor.uid));
  }, [filteredTasks, actor.uid]);

  const reviewTasks = React.useMemo(() => {
    return filteredTasks.filter(t => t.creatorId === actor.uid && t.status === 'review');
  }, [filteredTasks, actor.uid]);

  const standaloneTasks = React.useMemo(() => {
    return filteredTasks.filter(t => !t.projectId && !t.goalId);
  }, [filteredTasks]);

  // Project tasks list for My Team Project Tasks view
  const projectTasksList = React.useMemo(() => {
    return filteredTasks.filter(t => !!t.projectId);
  }, [filteredTasks]);

  const isLoading = tasksLoading || goalsLoading || projectsLoading;

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-semibold">
        No organization context found. Please log in and check your workspace parameters.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden gap-5 pr-2">
      
      {/* ─── 1. Left Collapsible Workspace Sidebar ─── */}
      <div className={cn(
        "hidden lg:flex shrink-0 border border-border-default/80 bg-surface/50 dark:bg-surface/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg backdrop-blur-xl transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "w-16" : "w-60"
      )}>
        
        <div className="space-y-6">
          {/* Header & Toggle */}
          <div className="flex items-center justify-between pb-3 border-b border-border-default/45">
            {!isSidebarCollapsed && (
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground select-none">
                Workspace Panel
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn(
                "p-1.5 rounded-lg border border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer",
                isSidebarCollapsed ? "mx-auto" : ""
              )}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveSection('my-space')}
              className={cn(
                "w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer border py-2.5",
                isSidebarCollapsed ? "justify-center px-1" : "px-3.5 gap-2.5",
                activeSection === 'my-space'
                  ? "bg-accent/[0.08] border-accent/25 text-foreground dark:text-white"
                  : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/30"
              )}
              title="My Space"
            >
              <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
              {!isSidebarCollapsed && <span>My Space</span>}
            </button>
            
            <button
              onClick={() => setActiveSection('my-team')}
              className={cn(
                "w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer border py-2.5",
                isSidebarCollapsed ? "justify-center px-1" : "px-3.5 gap-2.5",
                activeSection === 'my-team'
                  ? "bg-accent/[0.08] border-accent/25 text-foreground dark:text-white"
                  : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/30"
              )}
              title="My Team"
            >
              <Workflow className="w-4 h-4 text-indigo-500 shrink-0" />
              {!isSidebarCollapsed && <span>My Team</span>}
            </button>

            <button
              onClick={() => setActiveSection('projects')}
              className={cn(
                "w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer border py-2.5",
                isSidebarCollapsed ? "justify-center px-1" : "px-3.5 gap-2.5",
                activeSection === 'projects'
                  ? "bg-accent/[0.08] border-accent/25 text-foreground dark:text-white"
                  : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/30"
              )}
              title="Projects Map"
            >
              <FolderGit className="w-4 h-4 text-sky-500 shrink-0" />
              {!isSidebarCollapsed && <span>Projects</span>}
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
            className={cn(
              "w-full flex items-center justify-center border border-cyan-500/20 bg-cyan-500/[0.05] hover:bg-cyan-500/[0.08] text-cyan-600 dark:text-cyan-400 py-2.5 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm",
              isSidebarCollapsed ? "rounded-full p-2 h-10 w-10 mx-auto" : "rounded-xl gap-1.5"
            )}
            title="Assign Goal"
          >
            <Target className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Assign Goal</span>}
          </button>

          <button
            onClick={() => {
              setTaskForm({ title: '', description: '', priority: 'none', projectId: '', goalId: '', assigneeId: actor.uid, dueDate: '' });
              setCreateType('task');
              setShowCreateDrawer(true);
            }}
            className={cn(
              "w-full flex items-center justify-center border border-sky-500/20 bg-sky-500/[0.05] hover:bg-sky-500/[0.08] text-sky-600 dark:text-sky-455 py-2.5 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm",
              isSidebarCollapsed ? "rounded-full p-2 h-10 w-10 mx-auto" : "rounded-xl gap-1.5"
            )}
            title="Assign Task"
          >
            <Zap className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Assign Task</span>}
          </button>

          <button
            onClick={() => {
              setProjectForm({ name: '', description: '', startDate: '', dueDate: '' });
              setCreateType('project');
              setShowCreateDrawer(true);
            }}
            className={cn(
              "w-full flex items-center justify-center border border-indigo-500/20 bg-indigo-500/[0.05] hover:bg-indigo-500/[0.08] text-indigo-600 dark:text-indigo-405 py-2.5 text-xs font-bold tracking-wide transition-all active:scale-95 cursor-pointer shadow-sm",
              isSidebarCollapsed ? "rounded-full p-2 h-10 w-10 mx-auto" : "rounded-xl gap-1.5"
            )}
            title="Create Project"
          >
            <FolderGit className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Create Project</span>}
          </button>
        </div>

      </div>

      {/* ─── 2. Expanded Vertical Viewport Main Canvas ─── */}
      <div className="flex-grow flex flex-col min-h-0 border border-border-default/80 bg-surface/50 dark:bg-surface/30 rounded-2xl overflow-hidden shadow-2xl z-10 relative">
        
        {/* Mobile Navigation Segmented Control */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-border-default/45 bg-white/[0.02] dark:bg-white/[0.003] backdrop-blur-md shrink-0 gap-2 select-none">
          <div className="flex items-center gap-1 bg-white/[0.03] dark:bg-white/[0.01] border border-white/10 p-1 rounded-xl shadow-inner flex-1 max-w-md">
            <button
              onClick={() => setActiveSection('my-space')}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer relative",
                activeSection === 'my-space' ? "bg-white/5 border border-white/10 text-foreground" : "text-muted-foreground"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>My Space</span>
            </button>
            <button
              onClick={() => setActiveSection('my-team')}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer relative",
                activeSection === 'my-team' ? "bg-white/5 border border-white/10 text-foreground" : "text-muted-foreground"
              )}
            >
              <Workflow className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>My Team</span>
            </button>
            <button
              onClick={() => setActiveSection('projects')}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer relative",
                activeSection === 'projects' ? "bg-white/5 border border-white/10 text-foreground" : "text-muted-foreground"
              )}
            >
              <FolderGit className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Projects</span>
            </button>
          </div>

          {/* Quick action triggers dropdown for mobile/tablet */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-primary text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer outline-none border-none"
            >
              <Plus className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border-default/40 bg-surface/90 backdrop-blur-xl p-1 min-w-[150px]">
              <DropdownMenuItem 
                onClick={() => triggerAddGoal('')} 
                className="gap-2 font-semibold text-xs text-cyan-500 focus:text-cyan-600 focus:bg-cyan-500/10 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-cyan-500" /> Assign Goal
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => triggerAddTask('', '')} 
                className="gap-2 font-semibold text-xs text-sky-500 focus:text-sky-600 focus:bg-sky-500/10 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-sky-500" /> Assign Task
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setProjectForm({ name: '', description: '', startDate: '', dueDate: '' });
                  setCreateType('project');
                  setShowCreateDrawer(true);
                }} 
                className="gap-2 font-semibold text-xs text-indigo-500 focus:text-indigo-600 focus:bg-indigo-500/10 cursor-pointer"
              >
                <FolderGit className="w-3.5 h-3.5 text-indigo-500" /> Create Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-[11px] text-muted-foreground font-semibold tracking-wide animate-pulse">Loading active view...</p>
            </div>
          </div>
        ) : (
          <div className="h-full w-full overflow-y-auto aether-scroll p-4 lg:p-6 space-y-6">
            
            {/* ━━━━━━ Section A: My Space ━━━━━━ */}
            {activeSection === 'my-space' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-500 shrink-0 drop-shadow-[0_0_4px_rgba(6,182,212,0.2)]" />
                    <span>My Goals</span>
                  </h3>
                  <div className="space-y-4">
                    {activeGoals.length > 0 ? (
                      activeGoals.map(goal => {
                        const goalTasks = tasks.filter(t => t.goalId === goal.id);
                        
                        // Separate active and completed tasks
                        const activeGoalTasks = goalTasks.filter(t => t.status !== 'done');
                        const completedGoalTasks = goalTasks.filter(t => t.status === 'done');
                        
                        const progress = goal.progressRollup ?? 0;
                        const linkedProj = projects.find(p => p.id === goal.projectId);
                        const isCompletedExpanded = !!completedGoalsExpanded[goal.id];

                        return (
                          <div
                            key={goal.id}
                            className="bg-surface/50 border border-border-default rounded-2xl p-4.5 space-y-4 hover:border-cyan-500/30 hover:bg-surface transition-all shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default text-cyan-600 dark:text-cyan-400 bg-cyan-500/[0.04]">
                                    {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                  </span>
                                  {linkedProj && (
                                    <span 
                                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${linkedProj.id}`); }}
                                      className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default text-accent bg-accent/[0.04] cursor-pointer hover:bg-accent/[0.08] transition-colors" 
                                      style={{ color: 'var(--accent)' }}
                                    >
                                      {linkedProj.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-2.5">
                                  <button
                                    onClick={(e) => handleToggleGoalStatus(e, goal)}
                                    className={cn(
                                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                      goal.status === 'completed'
                                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                                        : "border-border-default bg-bg-primary/50 hover:border-cyan-500"
                                    )}
                                    title={goal.status === 'completed' ? "Mark Goal Active" : "Mark Goal Completed"}
                                  >
                                    {goal.status === 'completed' ? (
                                      <Check className="w-2 h-2" />
                                    ) : (
                                      <div className="h-1 w-1 rounded-full bg-transparent hover:bg-cyan-500/50" />
                                    )}
                                  </button>
                                  <h4 
                                    onClick={() => navigate(`/goals/${goal.id}`)}
                                    className={cn(
                                      "text-xs font-bold hover:text-cyan-500 cursor-pointer transition-colors truncate min-w-0 flex-1",
                                      goal.status === 'completed' ? "text-muted-foreground line-through decoration-cyan-500/50" : "text-foreground"
                                    )}
                                  >
                                    {goal.title}
                                  </h4>
                                </div>
                                {goal.description && <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{goal.description}</p>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {goal.targetDate && (
                                  <span className="text-[8px] text-muted-foreground font-mono bg-bg-secondary border border-border-default rounded px-2 py-0.5">
                                    {new Date((goal.targetDate as any).seconds * 1000).toLocaleDateString()}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/goals/${goal.id}`);
                                  }}
                                  className="text-muted-foreground hover:text-accent p-1 transition-colors"
                                  title="Goal Settings"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
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
                                <span>{progress}% ({completedGoalTasks.length}/{goalTasks.length} tasks)</span>
                              </div>
                              <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                              </div>
                            </div>

                            {/* Nested Tasks list */}
                            <div className="space-y-1.5 pt-3.5 border-t border-border-default/45">
                              {/* Render Active tasks */}
                              {activeGoalTasks.map(task => (
                                <div
                                  key={task.id}
                                  onClick={() => setSearchParams({ task: task.id })}
                                  className="flex items-center justify-between p-2 rounded-xl bg-bg-primary/30 hover:bg-bg-secondary/60 border border-border-subtle hover:border-border-default transition-all cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      onClick={(e) => handleToggleTaskStatus(e, task)}
                                      className="h-3.5 w-3.5 rounded-full border border-border-default bg-bg-primary/50 flex items-center justify-center shrink-0 transition-all cursor-pointer hover:border-accent/60"
                                    >
                                      <div className="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-accent/40" />
                                    </div>
                                    <span className="text-[11px] truncate font-semibold text-foreground">
                                      {task.title}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                    className="text-muted-foreground hover:text-red-400 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              {/* Collapsible Completed Tasks */}
                              {completedGoalTasks.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleGoalCompletedTasks(goal.id)}
                                    className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2 cursor-pointer flex items-center justify-between text-[9px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide"
                                  >
                                    <span>Completed Tasks ({completedGoalTasks.length})</span>
                                    <ChevronDown className={cn("w-3 h-3 transition-transform", isCompletedExpanded ? "rotate-180" : "")} />
                                  </button>
                                  <AnimatePresence>
                                    {isCompletedExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-1.5"
                                      >
                                        {completedGoalTasks.map(task => (
                                          <div
                                            key={task.id}
                                            onClick={() => setSearchParams({ task: task.id })}
                                            className="flex items-center justify-between p-2 rounded-xl bg-bg-primary/10 border border-border-subtle/40 transition-all cursor-pointer opacity-50 hover:opacity-80"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div
                                                onClick={(e) => handleToggleTaskStatus(e, task)}
                                                className="h-3.5 w-3.5 rounded-full border border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                                              >
                                                <Check className="w-2.5 h-2.5" />
                                              </div>
                                              <span className="text-[11px] truncate font-normal text-muted-foreground line-through">
                                                {task.title}
                                              </span>
                                            </div>
                                            <button
                                              onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                              className="text-muted-foreground hover:text-red-400 transition-colors"
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
                        <p className="text-[10px] text-muted-foreground italic">No active goals assigned to you.</p>
                      </div>
                    )}

                    {/* Collapsible Completed Goals Archive */}
                    {completedGoals.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCompletedMySpaceGoals(!showCompletedMySpaceGoals)}
                          className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide"
                        >
                          <span>Completed Goals ({completedGoals.length})</span>
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCompletedMySpaceGoals ? "rotate-180" : "")} />
                        </button>
                        <AnimatePresence>
                          {showCompletedMySpaceGoals && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-4"
                            >
                              {completedGoals.map(goal => {
                                const goalTasks = tasks.filter(t => t.goalId === goal.id);
                                const progress = goal.progressRollup ?? 0;
                                const linkedProj = projects.find(p => p.id === goal.projectId);

                                return (
                                  <div
                                    key={goal.id}
                                    className="bg-surface/50 border border-border-default rounded-2xl p-4.5 space-y-4 hover:border-cyan-500/30 hover:bg-surface transition-all shadow-sm opacity-70 hover:opacity-100"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default text-cyan-600 dark:text-cyan-400 bg-cyan-500/[0.04]">
                                            {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                          </span>
                                          {linkedProj && (
                                            <span 
                                              onClick={(e) => { e.stopPropagation(); navigate(`/projects/${linkedProj.id}`); }}
                                              className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default text-accent bg-accent/[0.04] cursor-pointer hover:bg-accent/[0.08] transition-colors" 
                                              style={{ color: 'var(--accent)' }}
                                            >
                                              {linkedProj.name}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2.5">
                                          <button
                                            onClick={(e) => handleToggleGoalStatus(e, goal)}
                                            className={cn(
                                              "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                              goal.status === 'completed'
                                                ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                                                : "border-border-default bg-bg-primary/50 hover:border-cyan-500"
                                            )}
                                            title={goal.status === 'completed' ? "Mark Goal Active" : "Mark Goal Completed"}
                                          >
                                            {goal.status === 'completed' ? (
                                              <Check className="w-2 h-2" />
                                            ) : (
                                              <div className="h-1 w-1 rounded-full bg-transparent hover:bg-cyan-500/50" />
                                            )}
                                          </button>
                                          <h4 
                                            onClick={() => navigate(`/goals/${goal.id}`)}
                                            className={cn(
                                              "text-xs font-bold hover:text-cyan-500 cursor-pointer transition-colors truncate min-w-0 flex-1",
                                              goal.status === 'completed' ? "text-muted-foreground line-through decoration-cyan-500/50" : "text-foreground"
                                            )}
                                          >
                                            {goal.title}
                                          </h4>
                                        </div>
                                        {goal.description && <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{goal.description}</p>}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {goal.targetDate && (
                                          <span className="text-[8px] text-muted-foreground font-mono bg-bg-secondary border border-border-default rounded px-2 py-0.5">
                                            {new Date((goal.targetDate as any).seconds * 1000).toLocaleDateString()}
                                          </span>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/goals/${goal.id}`);
                                          }}
                                          className="text-muted-foreground hover:text-accent p-1 transition-colors"
                                          title="Goal Settings"
                                        >
                                          <Settings className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                          className="text-muted-foreground hover:text-red-400 p-1 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Tasks */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-sky-500 shrink-0 drop-shadow-[0_0_4px_rgba(14,165,233,0.2)]" />
                    <span>Tasks</span>
                  </h3>
                  <div className="space-y-2">
                    {/* Filter active action tasks */}
                    {myTasks.filter(t => t.status !== 'done').length > 0 ? (
                      myTasks.filter(t => t.status !== 'done').map(task => (
                        <div
                          key={task.id}
                          onClick={() => setSearchParams({ task: task.id })}
                          className="flex items-center justify-between p-3 rounded-xl bg-surface/50 hover:bg-surface border border-border-default transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              onClick={(e) => handleToggleTaskStatus(e, task)}
                              className="h-3.5 w-3.5 rounded-full border border-border-default bg-bg-primary/50 flex items-center justify-center shrink-0 transition-all cursor-pointer hover:border-accent/60"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-accent/40" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] truncate font-semibold block text-foreground">
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
                              className="text-muted-foreground hover:text-red-400 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic text-center py-6">No active tasks assigned to you.</p>
                    )}

                    {/* Collapsible Completed Action Tasks */}
                    {myTasks.filter(t => t.status === 'done').length > 0 && (
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCompletedMySpace(!showCompletedMySpace)}
                          className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide"
                        >
                          <span>Completed Tasks ({myTasks.filter(t => t.status === 'done').length})</span>
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCompletedMySpace ? "rotate-180" : "")} />
                        </button>
                        <AnimatePresence>
                          {showCompletedMySpace && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-2"
                            >
                              {myTasks.filter(t => t.status === 'done').map(task => (
                                <div
                                  key={task.id}
                                  onClick={() => setSearchParams({ task: task.id })}
                                  className="flex items-center justify-between p-3 rounded-xl bg-bg-primary/20 border border-border-subtle/50 transition-all cursor-pointer opacity-50 hover:opacity-85 shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      onClick={(e) => handleToggleTaskStatus(e, task)}
                                      className="h-3.5 w-3.5 rounded-full border border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="text-[11px] truncate font-normal text-muted-foreground line-through">
                                      {task.title}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                    className="text-muted-foreground hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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

              </div>
            )}

            {/* ━━━━━━ Section B: My Team ━━━━━━ */}
            {activeSection === 'my-team' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                
                {/* Column 1: Pending Reviews */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Hourglass className="w-3.5 h-3.5 text-amber-500 shrink-0 drop-shadow-[0_0_4px_rgba(245,158,11,0.2)] animate-pulse" />
                    <span>Pending Reviews</span>
                  </h3>
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

                {/* Column 2: Delegated Tasks */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-650 dark:text-purple-400 flex items-center gap-1.5">
                    <Workflow className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0 drop-shadow-[0_0_4px_rgba(168,85,247,0.2)]" />
                    <span>Delegated Tasks</span>
                  </h3>
                  <div className="space-y-2">
                    {/* Active assigned tasks */}
                    {assignedTasks.filter(t => t.status !== 'done').length > 0 ? (
                      assignedTasks.filter(t => t.status !== 'done').map(task => (
                        <div
                          key={task.id}
                          onClick={() => setSearchParams({ task: task.id })}
                          className="flex items-center justify-between p-3 rounded-xl bg-surface/50 hover:bg-surface border border-border-default transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="min-w-0">
                            <span className="text-[11px] truncate font-semibold block text-foreground">
                              {task.title}
                            </span>
                            <span className="text-[7px] uppercase font-bold tracking-wider font-mono text-purple-650 dark:text-purple-450 mt-0.5 block">
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
                      <p className="text-[10px] text-muted-foreground italic text-center py-6">No active delegated tasks.</p>
                    )}

                    {/* Collapsible Completed Delegated Tasks */}
                    {assignedTasks.filter(t => t.status === 'done').length > 0 && (
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCompletedMyTeam(!showCompletedMyTeam)}
                          className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide"
                        >
                          <span>Completed Delegated ({assignedTasks.filter(t => t.status === 'done').length})</span>
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCompletedMyTeam ? "rotate-180" : "")} />
                        </button>
                        <AnimatePresence>
                          {showCompletedMyTeam && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-2"
                            >
                              {assignedTasks.filter(t => t.status === 'done').map(task => (
                                <div
                                  key={task.id}
                                  onClick={() => setSearchParams({ task: task.id })}
                                  className="flex items-center justify-between p-3 rounded-xl bg-bg-primary/20 border border-border-subtle/50 transition-all cursor-pointer opacity-50 hover:opacity-85 shadow-sm"
                                >
                                  <div className="min-w-0">
                                    <span className="text-[11px] truncate font-normal block text-muted-foreground line-through">
                                      {task.title}
                                    </span>
                                    <span className="text-[7px] uppercase font-bold tracking-wider font-mono text-muted-foreground mt-0.5 block">
                                      Delegate: {task.assigneeIds.map(uid => memberMap.get(uid)?.fullName || 'Member').join(', ')}
                                    </span>
                                  </div>
                                  <span className="px-1.5 py-0.5 bg-bg-secondary border border-border-default rounded text-[8px] font-bold text-text-secondary capitalize">
                                    Done
                                  </span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ━━━━━━ Section C: Projects ━━━━━━ */}
            {activeSection === 'projects' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-border-default/45">
                  <div className="flex items-center gap-2">
                    <FolderGit className="w-5 h-5 text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.3)] shrink-0" />
                    <h3 className="text-xs font-bold text-foreground">Project Initiatives Map</h3>
                    <span className="text-[10px] text-muted-foreground bg-bg-secondary border border-border-default px-2.5 py-0.5 rounded-full font-mono font-bold">
                      {activeProjects.length} Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                  {activeProjects.length > 0 ? (
                    activeProjects.map(project => {
                      const projectTasks = tasks.filter(t => t.projectId === project.id);
                      const doneTasks = projectTasks.filter(t => t.status === 'done');
                      const progress = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;
                      const projectGoals = goals.filter(g => g.projectId === project.id);

                      return (
                        <div
                          key={project.id}
                          className="bg-surface/50 border border-border-default rounded-2xl p-5 space-y-4 hover:border-indigo-500/20 hover:bg-surface transition-all shadow-sm flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3 pb-2 border-b border-border-default/45">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => handleToggleProjectStatus(e, project)}
                                    className={cn(
                                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                      project.status === 'completed'
                                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                        : "border-border-default bg-bg-primary/50 hover:border-indigo-500"
                                    )}
                                    title={project.status === 'completed' ? "Mark Project Active" : "Mark Project Completed"}
                                  >
                                    {project.status === 'completed' ? (
                                      <Check className="w-2 h-2" />
                                    ) : (
                                      <div className="h-1 w-1 rounded-full bg-transparent hover:bg-indigo-500/50" />
                                    )}
                                  </button>
                                  <h4 
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className={cn(
                                      "text-xs font-bold hover:text-indigo-500 cursor-pointer transition-colors truncate min-w-0 flex-1",
                                      project.status === 'completed' ? "text-muted-foreground line-through decoration-indigo-500/50" : "text-foreground"
                                    )}
                                  >
                                    {project.name}
                                  </h4>
                                </div>
                                {project.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                                    {project.description}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/projects/${project.id}`);
                                }}
                                className="text-muted-foreground hover:text-accent p-1 transition-colors shrink-0"
                                title="Project Settings"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteProjectItem(e, project.id)}
                                className="text-muted-foreground hover:text-red-400 p-1 transition-colors shrink-0"
                                title="Delete Project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Timeline Dates */}
                            <div className="flex justify-between items-center text-[8px] text-muted-foreground font-mono font-semibold">
                              <span>
                                {project.startDate ? new Date(project.startDate instanceof Date ? project.startDate : (project.startDate as any).seconds * 1000).toLocaleDateString() : 'No Start'}
                              </span>
                              <span>➜</span>
                              <span>
                                {project.dueDate ? new Date(project.dueDate instanceof Date ? project.dueDate : (project.dueDate as any).seconds * 1000).toLocaleDateString() : 'No Due'}
                              </span>
                            </div>

                            {/* Progress rollup */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                                <span>Task Completion</span>
                                <span>{progress}% ({doneTasks.length}/{projectTasks.length})</span>
                              </div>
                              <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                                <div className="bg-indigo-550 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
                              </div>
                            </div>

                            {/* Aligned employee goals list */}
                            {projectGoals.length > 0 && (
                              <div className="pt-2 space-y-1.5">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block">
                                  Aligned Goals Focus
                                </span>
                                <div className="space-y-1">
                                  {projectGoals.slice(0, 3).map(goal => (
                                    <div 
                                      key={goal.id} 
                                      onClick={() => navigate(`/goals/${goal.id}`)}
                                      className="flex items-center justify-between p-1.5 rounded-lg bg-bg-primary/20 border border-border-subtle hover:border-cyan-500/20 hover:bg-bg-primary/40 cursor-pointer transition-all"
                                    >
                                      <span className="text-[10px] font-semibold text-foreground truncate max-w-44 leading-none">
                                        {goal.title}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[7.5px] font-mono text-muted-foreground">{goal.progressRollup ?? 0}%</span>
                                        {goal.ownerId && (
                                          <div className="w-4 h-4 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center font-bold text-[7px] text-muted-foreground">
                                            {getInitials(goal.ownerId)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {projectGoals.length > 3 && (
                                    <span className="text-[8px] text-muted-foreground font-semibold block text-center pt-0.5">
                                      + {projectGoals.length - 3} more aligned goals
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-border-default/45 mt-3">
                            <button
                              onClick={() => triggerAddGoal(project.id)}
                              className="text-[9px] text-cyan-600 dark:text-cyan-400 hover:underline font-black tracking-wide flex items-center gap-0.5 cursor-pointer"
                            >
                              + Goal focus
                            </button>
                            <button
                              onClick={() => triggerAddTask('', project.id)}
                              className="text-[9px] text-sky-600 dark:text-sky-455 hover:underline font-black tracking-wide flex items-center gap-0.5 cursor-pointer"
                            >
                              + Task item
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="md:col-span-2 xl:col-span-3 py-16 border border-dashed border-border-default bg-bg-secondary/20 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                      <p className="text-[10px] text-muted-foreground italic">No projects created yet.</p>
                      <button
                        onClick={() => {
                          setProjectForm({ name: '', description: '', startDate: '', dueDate: '' });
                          setCreateType('project');
                          setShowCreateDrawer(true);
                        }}
                        className="text-[9px] text-indigo-500 font-bold hover:underline"
                      >
                        Create your first Project Initiative
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapsible Completed Projects Archive */}
                {completedProjects.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-border-default/45 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowCompletedProjects(!showCompletedProjects)}
                      className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide"
                    >
                      <span>Completed Projects ({completedProjects.length})</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showCompletedProjects ? "rotate-180" : "")} />
                    </button>
                    <AnimatePresence>
                      {showCompletedProjects && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start mt-4">
                            {completedProjects.map(project => {
                              const projectTasks = tasks.filter(t => t.projectId === project.id);
                              const doneTasks = projectTasks.filter(t => t.status === 'done');
                              const progress = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;

                              return (
                                <div
                                  key={project.id}
                                  className="bg-surface/50 border border-border-default rounded-2xl p-5 space-y-4 hover:border-indigo-500/20 hover:bg-surface transition-all shadow-sm flex flex-col justify-between opacity-70 hover:opacity-100"
                                >
                                  <div className="space-y-3">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-3 pb-2 border-b border-border-default/45">
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => handleToggleProjectStatus(e, project)}
                                            className={cn(
                                              "h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                              project.status === 'completed'
                                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                                : "border-border-default bg-bg-primary/50 hover:border-indigo-500"
                                            )}
                                            title={project.status === 'completed' ? "Mark Project Active" : "Mark Project Completed"}
                                          >
                                            {project.status === 'completed' ? (
                                              <Check className="w-2 h-2" />
                                            ) : (
                                              <div className="h-1 w-1 rounded-full bg-transparent hover:bg-indigo-500/50" />
                                            )}
                                          </button>
                                          <h4 
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                            className={cn(
                                              "text-xs font-bold hover:text-indigo-500 cursor-pointer transition-colors truncate min-w-0 flex-1",
                                              project.status === 'completed' ? "text-muted-foreground line-through decoration-indigo-500/50" : "text-foreground"
                                            )}
                                          >
                                            {project.name}
                                          </h4>
                                        </div>
                                        {project.description && (
                                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                                            {project.description}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/projects/${project.id}`);
                                        }}
                                        className="text-muted-foreground hover:text-accent p-1 transition-colors shrink-0"
                                        title="Project Settings"
                                      >
                                        <Settings className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => handleDeleteProjectItem(e, project.id)}
                                        className="text-muted-foreground hover:text-red-400 p-1 transition-colors shrink-0"
                                        title="Delete Project"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* Timeline Dates */}
                                    <div className="flex justify-between items-center text-[8px] text-muted-foreground font-mono font-semibold">
                                      <span>
                                        {project.startDate ? new Date(project.startDate instanceof Date ? project.startDate : (project.startDate as any).seconds * 1000).toLocaleDateString() : 'No Start'}
                                      </span>
                                      <span>➜</span>
                                      <span>
                                        {project.dueDate ? new Date(project.dueDate instanceof Date ? project.dueDate : (project.dueDate as any).seconds * 1000).toLocaleDateString() : 'No Due'}
                                      </span>
                                    </div>

                                    {/* Progress rollup */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                                        <span>Task Completion</span>
                                        <span>{progress}% ({doneTasks.length}/{projectTasks.length})</span>
                                      </div>
                                      <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-indigo-550 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

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
