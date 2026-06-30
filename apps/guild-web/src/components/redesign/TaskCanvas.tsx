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
  AlertOctagon,
  Lock,
  Users
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
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../tasks/GoalDetailDrawer';
import { SearchableSelect } from '../SearchableSelect';


import {
  createTask,
  moveTask,
  deleteTask,
  addComment,
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
  
  // Workspace tabs and views redesign state
  const [activeTab, setActiveTab] = React.useState<'tasks' | 'goals'>('tasks');
  const [viewMode, setViewMode] = React.useState<'list' | 'kanban'>('list');
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>('');
  const [showDoneTasks, setShowDoneTasks] = React.useState<boolean>(false);

  // Collapsed states for completed tasks sections
  const [showCompletedMySpace, setShowCompletedMySpace] = React.useState(false);
  const [showCompletedMyTeam, setShowCompletedMyTeam] = React.useState(false);
  const [showCompletedInitiatives, setShowCompletedInitiatives] = React.useState(false);
  const [completedGoalsExpanded, setCompletedGoalsExpanded] = React.useState<Record<string, boolean>>({});
  const [showCompletedMySpaceGoals, setShowCompletedMySpaceGoals] = React.useState(false);
  const [showCompletedProjects, setShowCompletedProjects] = React.useState(false);

  // Toast and Send Back Workflow States
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [sendBackTaskId, setSendBackTaskId] = React.useState<string | null>(null);
  const [sendBackComment, setSendBackComment] = React.useState<string>('');
  const [isSendingBack, setIsSendingBack] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
  const [projectForm, setProjectForm] = React.useState({ name: '', description: '', startDate: '', dueDate: '', memberIds: [] as string[] });
  const [goalForm, setGoalForm] = React.useState({ title: '', description: '', projectId: '', ownerId: '', horizon: 'short_term' as 'short_term' | 'long_term', targetDate: '' });
  const [taskForm, setTaskForm] = React.useState({ title: '', description: '', priority: 'none' as TaskPriority, projectId: '', goalId: '', assigneeId: '', dueDate: '' });

  // Data subscriptions
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams, loading: teamsLoading } = useTeams(orgId);
  const members = useOrgMembers(orgId);

  // Teams Selector and Permissions Logic
  const visibleTeams = React.useMemo(() => {
    const isOrgAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';
    if (isOrgAdmin) return teams;
    return teams.filter(t => t.managerId === user?.uid || t.memberIds.includes(user?.uid || ''));
  }, [teams, user?.uid, userProfile?.role]);

  const selectedTeam = React.useMemo(() => {
    return visibleTeams.find(t => t.id === selectedTeamId) || visibleTeams[0] || null;
  }, [visibleTeams, selectedTeamId]);

  const isTeamManager = React.useMemo(() => {
    if (!selectedTeam) return false;
    const isOrgAdmin = userProfile?.role === 'owner' || userProfile?.role === 'admin';
    return isOrgAdmin || selectedTeam.managerId === user?.uid;
  }, [selectedTeam, user?.uid, userProfile?.role]);

  React.useEffect(() => {
    if (visibleTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(visibleTeams[0].id);
    }
  }, [visibleTeams, selectedTeamId]);

  // Task Drawer context
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');
  const openTask = React.useMemo(() => tasks.find((t) => t.id === openTaskId) ?? null, [tasks, openTaskId]);

  const openGoalId = searchParams.get('goal');
  const openGoal = React.useMemo(() => goals.find((g) => g.id === openGoalId) ?? null, [goals, openGoalId]);

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

  const getMemberPhotoURL = (userId: string) => {
    const m = memberMap.get(userId);
    return m?.photoURL || '';
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

  // ─── Scoped Tasks & Goals Filtering ───

  // 1. My Space Workspace Memos
  const mySpaceTasks = React.useMemo(() => {
    return tasks.filter(t => {
      // Must be assigned to me
      if (!t.assigneeIds.includes(user?.uid || '')) return false;
      // Don't show subtasks directly in list/kanban
      if (t.parentTaskId) return false;
      // Filters
      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
      return true;
    });
  }, [tasks, user?.uid, searchQuery, selectedProjectId, selectedPriority]);

  const mySpaceGoals = React.useMemo(() => {
    return goals.filter(g => {
      // Must be owned by me
      if (g.ownerId !== user?.uid) return false;
      // Filters
      if (searchQuery.trim() && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedProjectId !== 'all' && g.projectId !== selectedProjectId) return false;
      if (selectedAssigneeId !== 'all' && g.ownerId !== selectedAssigneeId) return false;
      return true;
    });
  }, [goals, user?.uid, searchQuery, selectedProjectId, selectedAssigneeId]);

  // 2. My Team Workspace Memos
  const teamTasks = React.useMemo(() => {
    if (!selectedTeam) return [];
    
    // Team member UIDs (including manager)
    const teamUids = Array.from(new Set([selectedTeam.managerId, ...selectedTeam.memberIds]));

    return tasks.filter(t => {
      if (t.parentTaskId) return false;

      // Filters
      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;

      const isAssignedByMe = t.creatorId === user?.uid;
      const isAssignedToTeam = t.assigneeIds.some(uid => teamUids.includes(uid));
      return isAssignedByMe || isAssignedToTeam;
    });
  }, [tasks, selectedTeam, user?.uid, searchQuery, selectedProjectId, selectedPriority]);

  const teamGoals = React.useMemo(() => {
    if (!selectedTeam) return [];
    
    const teamUids = Array.from(new Set([selectedTeam.managerId, ...selectedTeam.memberIds]));

    return goals.filter(g => {
      if (searchQuery.trim() && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedProjectId !== 'all' && g.projectId !== selectedProjectId) return false;

      if (isTeamManager) {
        // Manager views all goals owned by team members
        return teamUids.includes(g.ownerId);
      } else {
        // Non-manager views goals owned by others in the team that are either:
        // - Associated with a project owned by the user
        // - Or have tasks under them created by the current user
        const isTeammateOwner = g.ownerId !== user?.uid && teamUids.includes(g.ownerId);
        if (!isTeammateOwner) return false;
        
        const linkedProj = projects.find(p => p.id === g.projectId);
        const isProjectOwner = linkedProj && linkedProj.ownerId === user?.uid;
        if (isProjectOwner) return true;

        const hasMyCreatedTasks = tasks.some(t => t.goalId === g.id && t.creatorId === user?.uid);
        return hasMyCreatedTasks;
      }
    });
  }, [goals, selectedTeam, isTeamManager, user?.uid, projects, tasks, searchQuery, selectedProjectId]);

  // General project mappings
  const activeProjects = React.useMemo(() => projects.filter(p => p.status !== 'completed' && p.status !== 'archived'), [projects]);
  const completedProjects = React.useMemo(() => projects.filter(p => p.status === 'completed'), [projects]);

  const toggleGoalCompletedTasks = (goalId: string) => {
    setCompletedGoalsExpanded(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

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
      const finalMemberIds = Array.from(new Set([actor.uid, ...projectForm.memberIds]));
      await createProject({
        orgId,
        name: projectForm.name.trim(),
        description: projectForm.description,
        startDate: projectForm.startDate ? new Date(projectForm.startDate) : null,
        dueDate: projectForm.dueDate ? new Date(projectForm.dueDate) : null,
        memberIds: finalMemberIds,
        actor
      });
      setProjectForm({ name: '', description: '', startDate: '', dueDate: '', memberIds: [] });
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
        assigneeIds: taskForm.assigneeId ? [taskForm.assigneeId] : [],
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
    let newStatus: TaskStatus = 'todo';
    
    if (oldStatus === 'todo') {
      newStatus = 'in_progress';
    } else if (oldStatus === 'in_progress') {
      newStatus = 'review';
    } else if (oldStatus === 'review') {
      if (task.creatorId !== user?.uid) {
        setToastMessage("Only the creator of this task can approve it from In Review.");
        return;
      }
      newStatus = 'done';
    } else if (oldStatus === 'done') {
      setToastMessage("Status is permanent and cannot be changed back.");
      return;
    }

    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, oldStatus, actor);
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const handleUpdateTaskStatus = async (task: Task, newStatus: TaskStatus) => {
    if (!orgId) return;
    const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };
    const oldStatusVal = STATUS_ORDER[task.status] ?? 0;
    const newStatusVal = STATUS_ORDER[newStatus] ?? 0;

    if (newStatusVal < oldStatusVal) {
      // Backward status transition
      const isRejection = task.status === 'review' && newStatus === 'in_progress' && task.creatorId === user?.uid;
      if (!isRejection) {
        setToastMessage("Status cannot go backward once moved.");
        return;
      }
    }

    if (newStatus === 'done' && task.status === 'review' && task.creatorId !== user?.uid) {
      setToastMessage("Only the creator of this task can approve it from In Review.");
      return;
    }
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 1000, task.status, actor);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleSendBackTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendBackTaskId || !orgId || !sendBackComment.trim() || isSendingBack) return;
    setIsSendingBack(true);
    
    const taskObj = tasks.find(t => t.id === sendBackTaskId);
    if (!taskObj) {
      setIsSendingBack(false);
      return;
    }

    try {
      // 1. Move status back to 'in_progress'
      await moveTask(taskObj.id, orgId, 'in_progress', taskObj.orderIndex || 1000, taskObj.status, actor);
      
      // 2. Add review comment
      await addComment({
        taskId: taskObj.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername: actor.name.toLowerCase().replace(/\s+/g, ''),
        body: `[Review Feedback] ${sendBackComment.trim()}`,
        mentions: taskObj.assigneeIds || [],
        taskTitle: taskObj.title,
      });

      // 3. Clear state and show toast
      setSendBackTaskId(null);
      setSendBackComment('');
      setToastMessage("Task sent back to assignee with feedback.");
    } catch (err) {
      console.error('Failed to send task back with review:', err);
    } finally {
      setIsSendingBack(false);
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
    const isAuthorized = 
      goal.ownerId === user?.uid || 
      userProfile?.role === 'owner' || 
      userProfile?.role === 'admin';

    if (!isAuthorized) {
      setToastMessage("Only the goal owner or an administrator can toggle this goal's status.");
      return;
    }

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

  // ─── Render Helpers ───

  const renderTaskListRow = (task: Task) => {
    const isCompleted = task.status === 'done';
    const linkedProj = projects.find(p => p.id === task.projectId);
    const linkedGoal = goals.find(g => g.id === task.goalId);
    const assigneeId = task.assigneeIds[0];

    return (
      <div
        key={task.id}
        onClick={() => setSearchParams({ task: task.id })}
        className={cn(
          "flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer group shadow-sm",
          isCompleted 
            ? "bg-bg-primary/20 border border-border-subtle/40 opacity-55 hover:opacity-85" 
            : "bg-surface/50 hover:bg-surface border border-border-default"
        )}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Checkbox toggle status */}
          {task.status === 'review' ? (
            task.creatorId === user?.uid ? (
              <button
                onClick={(e) => handleToggleTaskStatus(e, task)}
                className="h-4 w-4 rounded-full border border-amber-500 bg-amber-500/[0.04] text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 transition-all cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/10 group/btn"
                title="Approve Task (Mark Done)"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 group-hover/btn:bg-emerald-500 transition-colors" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToastMessage("Only the creator of this task can approve it from In Review.");
                }}
                className="h-4 w-4 rounded-full border border-amber-500/30 bg-amber-500/[0.02] text-amber-500/50 dark:text-amber-500/30 flex items-center justify-center shrink-0 cursor-pointer hover:border-amber-500/60 transition-colors"
                title="Creator approval required"
              >
                <Lock className="w-2 h-2 text-amber-500/70" />
              </button>
            )
          ) : (
            <button
              onClick={(e) => handleToggleTaskStatus(e, task)}
              className={cn(
                "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                isCompleted
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border-default bg-bg-primary/50 hover:border-accent/60"
              )}
            >
              {isCompleted ? (
                <Check className="w-2.5 h-2.5" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-transparent group-hover:bg-accent/40" />
              )}
            </button>
          )}
          
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className={cn(
              "text-xs truncate font-bold text-foreground block",
              isCompleted && "line-through decoration-muted-foreground/40 font-semibold"
            )}>
              {task.title}
            </span>
            
            {/* Tag metadata row */}
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {task.priority !== 'none' && (
                <span 
                  className="text-[7.5px] uppercase font-bold tracking-wider font-mono"
                  style={{ color: PRIORITY_CONFIG[task.priority].color }}
                >
                  {task.priority}
                </span>
              )}
              {linkedProj && (
                <span className="text-[7.5px] font-black uppercase tracking-wider text-accent">
                  • {linkedProj.name}
                </span>
              )}
              {linkedGoal && (
                <span className="text-[7.5px] font-black uppercase tracking-wider text-cyan-500">
                  • {linkedGoal.title}
                </span>
              )}
              {activeSection === 'my-team' && assigneeId && (
                <span className="text-[7.5px] font-bold text-muted-foreground">
                  • Assigned to: {memberMap.get(assigneeId)?.fullName || 'Teammate'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side options */}
        <div className="flex items-center gap-2.5 shrink-0">
          {task.dueDate && (
            <span className="text-[8px] font-mono text-muted-foreground bg-bg-secondary rounded px-2 py-0.5 border border-border-default/60">
              {new Date((task.dueDate as any).seconds * 1000).toLocaleDateString()}
            </span>
          )}

          {/* Send Back with review feedback */}
          {task.status === 'review' && task.creatorId === user?.uid && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSendBackTaskId(task.id);
              }}
              className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
              title="Send back with review feedback"
            >
              Send Back
            </button>
          )}

          {/* Quick status change inside list view */}
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg border border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer outline-none shrink-0"
              title="Move Task"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border-default/40 bg-surface/90 backdrop-blur-xl p-1 min-w-[120px]">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'todo'); }} className="gap-2 font-semibold text-xs text-zinc-400 focus:text-zinc-500 focus:bg-zinc-500/10 cursor-pointer">
                To Do
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'in_progress'); }} className="gap-2 font-semibold text-xs text-blue-400 focus:text-blue-500 focus:bg-blue-500/10 cursor-pointer">
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'review'); }} className="gap-2 font-semibold text-xs text-amber-400 focus:text-amber-500 focus:bg-amber-500/10 cursor-pointer">
                Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'done'); }} className="gap-2 font-semibold text-xs text-emerald-400 focus:text-emerald-500 focus:bg-emerald-500/10 cursor-pointer">
                Done
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderKanbanCard = (task: Task) => {
    const isCompleted = task.status === 'done';
    const linkedProj = projects.find(p => p.id === task.projectId);
    const linkedGoal = goals.find(g => g.id === task.goalId);
    const assigneeId = task.assigneeIds[0];

    return (
      <div
        key={task.id}
        onClick={() => setSearchParams({ task: task.id })}
        className={cn(
          "aether-glass aether-glass-interactive p-4 space-y-3 relative group/card cursor-pointer flex flex-col justify-between select-none shadow-sm",
          isCompleted && "opacity-60 hover:opacity-90"
        )}
      >
        <div className="space-y-2">
          {/* Project & Goal Tags */}
          <div className="flex flex-wrap gap-1">
            {linkedProj && (
              <span className="text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default/45 text-accent bg-accent/[0.04]">
                {linkedProj.name}
              </span>
            )}
            {linkedGoal && (
              <span className="text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default/45 text-cyan-600 dark:text-cyan-400 bg-cyan-500/[0.04]">
                {linkedGoal.title}
              </span>
            )}
          </div>

          {/* Task Title */}
          <h4 className={cn(
            "text-xs font-bold text-foreground leading-snug group-hover/card:text-accent transition-colors break-words",
            isCompleted && "line-through decoration-muted-foreground/30 font-semibold"
          )}>
            {task.title}
          </h4>

          {/* Task Description snippet */}
          {task.description && (
            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        <div className="pt-2.5 border-t border-border-default/45 flex items-center justify-between gap-2 shrink-0">
          {/* Assignee Avatar & Due Date */}
          <div className="flex items-center gap-2 min-w-0">
            {assigneeId ? (
              getMemberPhotoURL(assigneeId) ? (
                <img
                  src={getMemberPhotoURL(assigneeId)}
                  alt={memberMap.get(assigneeId)?.fullName || 'Teammate'}
                  className="w-4.5 h-4.5 rounded-full object-cover border border-white/10 dark:border-black/20 shrink-0"
                  title={memberMap.get(assigneeId)?.fullName || 'Teammate'}
                />
              ) : (
                <div className={cn("w-4.5 h-4.5 rounded-full border flex items-center justify-center font-bold text-[7px] shrink-0", getAvatarColor(assigneeId))} title={memberMap.get(assigneeId)?.fullName || 'Teammate'}>
                  {getInitials(assigneeId)}
                </div>
              )
            ) : (
              <div className="w-4.5 h-4.5 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center font-bold text-[7px] text-muted-foreground shrink-0">
                U
              </div>
            )}

            {task.dueDate && (
              <span className="text-[8px] font-mono text-muted-foreground flex items-center gap-0.5 truncate">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                {new Date((task.dueDate as any).seconds * 1000).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Actions Dropdown / Priority Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {task.priority !== 'none' && (
              <span
                className="text-[7.5px] uppercase font-bold tracking-wider font-mono px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${PRIORITY_CONFIG[task.priority].color}15`,
                  color: PRIORITY_CONFIG[task.priority].color,
                  border: `1px solid ${PRIORITY_CONFIG[task.priority].color}30`
                }}
              >
                {task.priority}
              </span>
            )}

            {/* Send Back with review feedback */}
            {task.status === 'review' && task.creatorId === user?.uid && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSendBackTaskId(task.id);
                }}
                className="px-2 py-1 text-[8px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-500/20 rounded-md transition-all active:scale-95 cursor-pointer shrink-0"
                title="Send back with review feedback"
              >
                Send Back
              </button>
            )}

            {/* Quick Mover Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-lg border border-border-default/60 hover:bg-bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer outline-none shrink-0"
                title="Move Task"
              >
                <SlidersHorizontal className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-border-default/40 bg-surface/90 backdrop-blur-xl p-1 min-w-[120px]">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'todo'); }} className="gap-2 font-semibold text-xs text-zinc-400 focus:text-zinc-500 focus:bg-zinc-500/10 cursor-pointer">
                  To Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'in_progress'); }} className="gap-2 font-semibold text-xs text-blue-400 focus:text-blue-500 focus:bg-blue-500/10 cursor-pointer">
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'review'); }} className="gap-2 font-semibold text-xs text-amber-400 focus:text-amber-500 focus:bg-amber-500/10 cursor-pointer">
                  Review
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'done'); }} className="gap-2 font-semibold text-xs text-emerald-400 focus:text-emerald-500 focus:bg-emerald-500/10 cursor-pointer">
                  Done
                </DropdownMenuItem>
                {task.status === 'review' && task.creatorId === user?.uid && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSendBackTaskId(task.id); }} className="gap-2 font-semibold text-xs text-amber-500 focus:text-amber-600 focus:bg-amber-500/10 cursor-pointer border-t border-border-default/45 mt-1 pt-1">
                    Send Back Feedback
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

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
        "hidden xl:flex flex-col justify-between shrink-0 aether-glass p-4 shadow-lg transition-all duration-300 ease-in-out",
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
              <Users className="w-4 h-4 text-indigo-500 shrink-0" />
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
              setTaskForm({ title: '', description: '', priority: 'none', projectId: '', goalId: '', assigneeId: '', dueDate: '' });
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
              setProjectForm({ name: '', description: '', startDate: '', dueDate: '', memberIds: [] });
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
      <div className="flex-grow flex flex-col min-h-0 aether-glass overflow-hidden shadow-2xl z-10 relative">
        
        {/* Mobile Navigation Segmented Control */}
        <div className="xl:hidden flex items-center justify-between p-3 border-b border-border-default/45 bg-white/[0.02] dark:bg-white/[0.003] backdrop-blur-md shrink-0 gap-2 select-none">
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
              <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
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
                  setProjectForm({ name: '', description: '', startDate: '', dueDate: '', memberIds: [] });
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
          <div className={cn(
            "h-full w-full p-4 lg:p-6 space-y-6 aether-scroll",
            viewMode === 'kanban' && activeTab === 'tasks' && activeSection !== 'projects'
              ? "overflow-hidden flex flex-col"
              : "overflow-y-auto"
          )}>
            
            {/* ━━━━━━ Redesigned Workspace: Tasks and Goals Tabs ━━━━━━ */}
            {(activeSection === 'my-space' || activeSection === 'my-team') && (() => {
              // Select active dataset based on section
              const currentTasks = activeSection === 'my-space' ? mySpaceTasks : teamTasks;
              const currentGoals = activeSection === 'my-space' ? mySpaceGoals : teamGoals;

              // Group tasks by status
              const todoTasks = currentTasks.filter(t => t.status === 'todo');
              const inProgressTasks = currentTasks.filter(t => t.status === 'in_progress');
              const reviewTasksList = currentTasks.filter(t => t.status === 'review');
              const doneTasksList = currentTasks.filter(t => t.status === 'done');

              const activeGoals = currentGoals.filter(g => g.status !== 'completed');
              const completedGoals = currentGoals.filter(g => g.status === 'completed');

              return (
                <div className="space-y-6">
                  {/* ─── A. Premium Header Controls ─── */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-default/45 select-none">
                    <div className="flex flex-wrap items-center gap-3.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {activeSection === 'my-space' ? (
                          <Sparkles className="w-5 h-5 text-cyan-500 drop-shadow-[0_0_4px_rgba(6,182,212,0.3)] shrink-0" />
                        ) : (
                          <Users className="w-5 h-5 text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.3)] shrink-0" />
                        )}
                        <h2 className="text-xs font-black uppercase tracking-widest text-foreground truncate">
                          {activeSection === 'my-space' ? 'Personal Space' : 'Team Workspace'}
                        </h2>
                      </div>
                      
                      {/* Team Dropdown Selector */}
                      {activeSection === 'my-team' && visibleTeams.length > 0 && (
                        <div className="relative shrink-0">
                          <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="bg-surface/60 border border-border-default rounded-xl px-3 py-1.5 text-xs text-foreground font-semibold outline-none cursor-pointer hover:bg-surface transition-all"
                          >
                            {visibleTeams.map(t => (
                              <option key={t.id} value={t.id} className="bg-surface font-semibold text-xs">{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="h-4 w-px bg-border-default/60 shrink-0" />

                      {/* Tasks vs Goals Segmented Tabs */}
                      <div className="flex bg-bg-secondary/80 dark:bg-bg-secondary/40 border border-border-default/60 p-0.5 rounded-xl shrink-0">
                        <button
                          onClick={() => {
                            setActiveTab('tasks');
                          }}
                          className={cn(
                            "px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                            activeTab === 'tasks'
                              ? "bg-accent border-accent text-white shadow-md font-extrabold"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/65"
                          )}
                        >
                          Tasks
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab('goals');
                          }}
                          className={cn(
                            "px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                            activeTab === 'goals'
                              ? "bg-accent border-accent text-white shadow-md font-extrabold"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/65"
                          )}
                        >
                          Goals
                        </button>
                      </div>
                    </div>

                    {/* List vs Kanban Toggle (only for Tasks) */}
                    {activeTab === 'tasks' && (
                      <div className="flex bg-bg-secondary/80 dark:bg-bg-secondary/40 border border-border-default/60 p-0.5 rounded-xl shrink-0 self-end md:self-auto">
                        <button
                          onClick={() => setViewMode('list')}
                          className={cn(
                            "px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                            viewMode === 'list'
                              ? "bg-accent border-accent text-white shadow-md font-extrabold"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/65"
                          )}
                        >
                          List
                        </button>
                        <button
                          onClick={() => setViewMode('kanban')}
                          className={cn(
                            "px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                            viewMode === 'kanban'
                              ? "bg-accent border-accent text-white shadow-md font-extrabold"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-bg-secondary/65"
                          )}
                        >
                          Kanban
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ─── B. Main Content Areas ─── */}

                  {/* ━━━ Case 1: Goals Tab ━━━ */}
                  {activeTab === 'goals' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        {activeGoals.length > 0 ? (
                          activeGoals.map(goal => {
                            const goalTasks = tasks.filter(t => t.goalId === goal.id);
                            const activeGoalTasks = goalTasks.filter(t => t.status !== 'done');
                            const completedGoalTasks = goalTasks.filter(t => t.status === 'done');
                            const progress = goal.progressRollup ?? 0;
                            const linkedProj = projects.find(p => p.id === goal.projectId);
                            const isCompletedExpanded = !!completedGoalsExpanded[goal.id];
                            const owner = memberMap.get(goal.ownerId);

                            return (
                              <div
                                key={goal.id}
                                className="aether-glass aether-glass-interactive p-4.5 space-y-4"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
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
                                      >
                                        {goal.status === 'completed' ? <Check className="w-2 h-2" /> : <div className="h-1 w-1 rounded-full bg-transparent hover:bg-cyan-500/50" />}
                                      </button>
                                      <h4 
                                        onClick={() => setSearchParams({ goal: goal.id })}
                                        className={cn(
                                          "text-xs font-bold hover:text-cyan-500 cursor-pointer transition-colors truncate min-w-0 flex-1",
                                          goal.status === 'completed' ? "text-muted-foreground line-through decoration-cyan-500/50" : "text-foreground"
                                        )}
                                      >
                                        {goal.title}
                                      </h4>
                                    </div>

                                    {activeSection === 'my-team' && (
                                      <p className="text-[9px] text-muted-foreground mt-1 font-semibold">
                                        Teammate: {owner?.fullName || 'Teammate'}
                                      </p>
                                    )}

                                    {goal.description && <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">{goal.description}</p>}
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 sm:self-start mt-2 sm:mt-0">
                                    {goal.targetDate && (
                                      <span className="text-[8px] text-muted-foreground font-mono bg-bg-secondary border border-border-default rounded px-2 py-0.5">
                                        {new Date((goal.targetDate as any).seconds * 1000).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Progress rollup */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                                    <span>Goal Progress</span>
                                    <span>{progress}% ({completedGoalTasks.length}/{goalTasks.length} tasks)</span>
                                  </div>
                                  <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-cyan-505 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: '#06b6d4' }} />
                                  </div>
                                </div>

                                {/* Nested Tasks list */}
                                <div className="space-y-1.5 pt-3.5 border-t border-border-default/45">
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
                                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isCompletedExpanded ? "rotate-180" : "")} />
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
                                                className="flex items-center justify-between p-2 rounded-xl bg-bg-primary/10 border border-border-subtle/40 transition-all cursor-pointer opacity-50 hover:opacity-85 shadow-sm"
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
                                              </div>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => triggerAddTask(goal.id, goal.projectId)}
                                  className="text-[9px] text-muted-foreground hover:text-foreground font-bold flex items-center gap-1 pt-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Task
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="xl:col-span-2 py-12 rounded-2xl border border-dashed border-border-default bg-bg-secondary/20 flex flex-col items-center justify-center text-center">
                            <p className="text-[10px] text-muted-foreground italic">No active goals found in this view.</p>
                          </div>
                        )}
                      </div>

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
                                className="overflow-hidden grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4"
                              >
                                {completedGoals.map(goal => {
                                  return (
                                    <div
                                      key={goal.id}
                                      className="aether-glass p-3.5 sm:p-4.5 space-y-3 opacity-70 hover:opacity-100"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border-default text-cyan-600 dark:text-cyan-400 bg-cyan-500/[0.04]">
                                              {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-2.5">
                                            <button
                                              onClick={(e) => handleToggleGoalStatus(e, goal)}
                                              className="h-3.5 w-3.5 rounded-full border border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                                            >
                                              <Check className="w-2 h-2" />
                                            </button>
                                            <h4 
                                              onClick={() => setSearchParams({ goal: goal.id })}
                                              className="text-xs font-bold text-muted-foreground line-through decoration-cyan-500/50 hover:text-cyan-500 cursor-pointer transition-colors"
                                            >
                                              {goal.title}
                                            </h4>
                                          </div>
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
                  )}

                  {/* ━━━ Case 2: Tasks Tab ━━━ */}
                  {activeTab === 'tasks' && (
                    <div className="space-y-6">
                      
                      {/* ─── Sub-Case 2.1: Tasks List View ─── */}
                      {viewMode === 'list' && (
                        <div className="space-y-6">
                          
                          {/* Todo list */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2 select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                              <span>To Do ({todoTasks.length})</span>
                            </h4>
                            <div className="space-y-2">
                              {todoTasks.length > 0 ? (
                                todoTasks.map(task => renderTaskListRow(task))
                              ) : (
                                <p className="text-[10px] text-muted-foreground italic py-3 pl-4">No tasks to do.</p>
                              )}
                            </div>
                          </div>

                          {/* In Progress list */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-550 flex items-center gap-2 select-none" style={{ color: 'var(--accent)' }}>
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-550" style={{ backgroundColor: 'var(--accent)' }} />
                              <span>In Progress ({inProgressTasks.length})</span>
                            </h4>
                            <div className="space-y-2">
                              {inProgressTasks.length > 0 ? (
                                inProgressTasks.map(task => renderTaskListRow(task))
                              ) : (
                                <p className="text-[10px] text-muted-foreground italic py-3 pl-4">No tasks in progress.</p>
                              )}
                            </div>
                          </div>

                          {/* Review list */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2 select-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              <span>In Review ({reviewTasksList.length})</span>
                            </h4>
                            <div className="space-y-2">
                              {reviewTasksList.length > 0 ? (
                                reviewTasksList.map(task => renderTaskListRow(task))
                              ) : (
                                <p className="text-[10px] text-muted-foreground italic py-3 pl-4">No tasks in review.</p>
                              )}
                            </div>
                          </div>

                          {/* Collapsible Done list */}
                          {doneTasksList.length > 0 && (
                            <div className="space-y-2 pt-4 border-t border-border-default/45">
                              <button
                                type="button"
                                onClick={() => setShowDoneTasks(!showDoneTasks)}
                                className="w-full border border-border-default/45 bg-bg-secondary/20 rounded-xl p-2.5 cursor-pointer flex items-center justify-between text-[10px] text-muted-foreground hover:bg-bg-secondary/40 transition-colors font-bold tracking-wide"
                              >
                                <span className="flex items-center gap-1.5 text-emerald-500">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Completed Tasks ({doneTasksList.length})
                                </span>
                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showDoneTasks ? "rotate-180" : "")} />
                              </button>
                              <AnimatePresence>
                                {showDoneTasks && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-2 pt-2"
                                  >
                                    {doneTasksList.map(task => renderTaskListRow(task))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ─── Sub-Case 2.2: Tasks Kanban View ─── */}
                      {viewMode === 'kanban' && (
                        <div className="flex h-[calc(100vh-220px)] w-full overflow-x-auto aether-scroll select-none pb-4 gap-4 items-start">
                          
                          {/* Kanban Column: Todo */}
                          <div className="flex flex-col w-72 shrink-0 max-h-full bg-bg-secondary/20 border border-border-default/40 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-3.5 px-1 shrink-0">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                                <span>To Do</span>
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground bg-bg-secondary border border-border-default px-2 py-0.5 rounded-full font-mono">
                                {todoTasks.length}
                              </span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 aether-scroll min-h-[150px]">
                              {todoTasks.map(task => renderKanbanCard(task))}
                              {todoTasks.length === 0 && (
                                <p className="text-[10px] text-muted-foreground italic text-center py-6">No tasks</p>
                              )}
                            </div>
                          </div>

                          {/* Kanban Column: In Progress */}
                          <div className="flex flex-col w-72 shrink-0 max-h-full bg-bg-secondary/20 border border-border-default/40 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-3.5 px-1 shrink-0">
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-550 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-550" style={{ backgroundColor: 'var(--accent)' }} />
                                <span>In Progress</span>
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground bg-bg-secondary border border-border-default px-2 py-0.5 rounded-full font-mono">
                                {inProgressTasks.length}
                              </span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 aether-scroll min-h-[150px]">
                              {inProgressTasks.map(task => renderKanbanCard(task))}
                              {inProgressTasks.length === 0 && (
                                <p className="text-[10px] text-muted-foreground italic text-center py-6">No tasks</p>
                              )}
                            </div>
                          </div>

                          {/* Kanban Column: Review */}
                          <div className="flex flex-col w-72 shrink-0 max-h-full bg-bg-secondary/20 border border-border-default/40 rounded-2xl p-3">
                            <div className="flex items-center justify-between mb-3.5 px-1 shrink-0">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>Review</span>
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground bg-bg-secondary border border-border-default px-2 py-0.5 rounded-full font-mono">
                                {reviewTasksList.length}
                              </span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 aether-scroll min-h-[150px]">
                              {reviewTasksList.map(task => renderKanbanCard(task))}
                              {reviewTasksList.length === 0 && (
                                <p className="text-[10px] text-muted-foreground italic text-center py-6">No tasks</p>
                              )}
                            </div>
                          </div>

                          {/* Collapsible Done Column */}
                          <AnimatePresence mode="wait">
                            {!showDoneTasks ? (
                              /* ─── Compact Vertical Done Strip ─── */
                              <motion.button
                                key="collapsed-done"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 44 }}
                                exit={{ opacity: 0, width: 0 }}
                                type="button"
                                onClick={() => setShowDoneTasks(true)}
                                className="flex flex-col items-center justify-between py-5 bg-emerald-500/[0.02] border border-dashed border-emerald-500/25 rounded-2xl shrink-0 h-[calc(100vh-220px)] cursor-pointer hover:bg-emerald-500/[0.04] hover:border-emerald-500/40 transition-all select-none gap-4"
                                title="Expand Completed Column"
                              >
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 [writing-mode:vertical-lr] rotate-180">
                                  Done Column ({doneTasksList.length})
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              </motion.button>
                            ) : (
                              /* ─── Full-width Done Column ─── */
                              <motion.div
                                key="expanded-done"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 288 }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                className="flex flex-col w-72 shrink-0 max-h-full bg-emerald-500/[0.01] border border-emerald-500/20 rounded-2xl p-3"
                              >
                                <div className="flex items-center justify-between mb-3.5 px-1 shrink-0">
                                  <button
                                    onClick={() => setShowDoneTasks(false)}
                                    className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5 hover:underline cursor-pointer"
                                  >
                                    <X className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span>Completed</span>
                                  </button>
                                  <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                                    {doneTasksList.length}
                                  </span>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 aether-scroll min-h-[150px]">
                                  {doneTasksList.map(task => renderKanbanCard(task))}
                                  {doneTasksList.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground italic text-center py-6">No completed tasks</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })()}

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
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="aether-glass aether-glass-interactive p-5 space-y-4 flex flex-col justify-between cursor-pointer"
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
                                    className={cn(
                                      "text-xs font-bold transition-colors truncate min-w-0 flex-1 flex items-center gap-1.5",
                                      project.status === 'completed' ? "text-muted-foreground line-through decoration-indigo-500/50" : "text-foreground"
                                    )}
                                  >
                                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span>{project.name}</span>
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
                                      onClick={(e) => { e.stopPropagation(); setSearchParams({ goal: goal.id }); }}
                                      className="flex items-center justify-between p-1.5 rounded-lg bg-bg-primary/20 border border-border-subtle hover:border-cyan-500/20 hover:bg-bg-primary/40 cursor-pointer transition-all"
                                    >
                                      <span className="text-[10px] font-semibold text-foreground truncate max-w-44 leading-none">
                                        {goal.title}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[7.5px] font-mono text-muted-foreground">{goal.progressRollup ?? 0}%</span>
                                        {goal.ownerId && (
                                          getMemberPhotoURL(goal.ownerId) ? (
                                            <img
                                              src={getMemberPhotoURL(goal.ownerId)}
                                              alt={memberMap.get(goal.ownerId)?.fullName || 'Owner'}
                                              className="w-4 h-4 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                                              title={memberMap.get(goal.ownerId)?.fullName || 'Owner'}
                                            />
                                          ) : (
                                            <div className="w-4 h-4 rounded-full bg-bg-secondary border border-border-default flex items-center justify-center font-bold text-[7px] text-muted-foreground" title={memberMap.get(goal.ownerId)?.fullName || 'Owner'}>
                                              {getInitials(goal.ownerId)}
                                            </div>
                                          )
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
                              onClick={(e) => { e.stopPropagation(); triggerAddGoal(project.id); }}
                              className="text-[9px] text-cyan-600 dark:text-cyan-400 hover:underline font-black tracking-wide flex items-center gap-0.5 cursor-pointer"
                            >
                              + Goal focus
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); triggerAddTask('', project.id); }}
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
                          setProjectForm({ name: '', description: '', startDate: '', dueDate: '', memberIds: [] });
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
                                  onClick={() => navigate(`/projects/${project.id}`)}
                                  className="aether-glass aether-glass-interactive p-5 space-y-4 flex flex-col justify-between opacity-70 hover:opacity-100 cursor-pointer"
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
                                            className={cn(
                                              "text-xs font-bold transition-colors truncate min-w-0 flex-1 flex items-center gap-1.5",
                                              project.status === 'completed' ? "text-muted-foreground line-through decoration-indigo-500/50" : "text-foreground"
                                            )}
                                          >
                                            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                                            <span>{project.name}</span>
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
                    
                    {/* Select Team Members */}
                    <div className="space-y-2.5">
                      <label className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Select Project Team Members</span>
                      </label>
                      <div className="max-h-40 overflow-y-auto aether-glass-input p-2.5 space-y-1.5 aether-scroll">
                        {members.filter(m => m.uid !== actor.uid).map(m => {
                          const isChecked = projectForm.memberIds.includes(m.uid);
                          return (
                            <div key={m.uid} className="flex items-center justify-between hover:bg-bg-secondary/40 p-1.5 rounded-lg transition-colors">
                              <div className="flex items-center gap-2">
                                {m.photoURL ? (
                                  <img
                                    src={m.photoURL}
                                    alt={m.fullName || m.username}
                                    className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                                  />
                                ) : (
                                  <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[7px] shrink-0", getAvatarColor(m.uid))}>
                                    {getInitials(m.uid)}
                                  </div>
                                )}
                                <span className="text-xs text-foreground font-semibold">
                                  {m.fullName || m.username}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const updatedMemberIds = isChecked
                                    ? projectForm.memberIds.filter(id => id !== m.uid)
                                    : [...projectForm.memberIds, m.uid];
                                  setProjectForm({ ...projectForm, memberIds: updatedMemberIds });
                                }}
                                className="rounded border-border-default text-accent focus:ring-accent accent-accent w-4 h-4 cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                        Note: You will be automatically added as a member and owner of this project.
                      </p>
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
                        <SearchableSelect
                          value={goalForm.ownerId}
                          onChange={(val) => setGoalForm({ ...goalForm, ownerId: val })}
                          options={members.map(m => ({
                            value: m.uid,
                            label: m.fullName || m.username,
                            detail: m.designation || 'Member',
                            photoURL: m.photoURL
                          }))}
                          placeholder="Select Employee..."
                        />
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
                        <SearchableSelect
                          value={taskForm.assigneeId}
                          onChange={(val) => setTaskForm({ ...taskForm, assigneeId: val })}
                          options={members.filter(m => m.uid !== actor.uid).map(m => ({
                            value: m.uid,
                            label: m.fullName || m.username,
                            detail: m.designation || 'Member',
                            photoURL: m.photoURL
                          }))}
                          placeholder="Select Member..."
                        />
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

      <TaskDetailDrawer
        task={openTask}
        onClose={() => setSearchParams({})}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={projects}
        goals={goals}
      />

      <GoalDetailDrawer
        goal={openGoal}
        onClose={() => setSearchParams({})}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={projects}
        tasks={tasks}
        onSelectTask={(task) => {
          setSearchParams({ task: task.id });
        }}
      />

      {/* ─── Custom Floating Warning Toast ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 border border-white/10 dark:border-neutral-200/50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur max-w-sm select-none"
          >
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-bold leading-tight">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Custom Send Back Review Modal ─── */}
      <AnimatePresence>
        {sendBackTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSendBackTaskId(null)}
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 overflow-hidden z-10"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-black uppercase tracking-wider text-amber-500">
                  Request Task Revision
                </span>
                <button
                  type="button"
                  onClick={() => setSendBackTaskId(null)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-850 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-foreground truncate">
                  Task: {tasks.find(t => t.id === sendBackTaskId)?.title}
                </h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Provide feedback to the assignee detailing what revisions or corrections are needed before approval.
                </p>
              </div>

              <form onSubmit={handleSendBackTask} className="space-y-4">
                <textarea
                  value={sendBackComment}
                  onChange={(e) => setSendBackComment(e.target.value)}
                  placeholder="Describe necessary changes..."
                  rows={4}
                  required
                  autoFocus
                  className="w-full bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3.5 py-3 text-xs text-foreground placeholder:text-neutral-400 focus:border-accent/60 outline-none resize-none font-semibold transition-all"
                />
                
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setSendBackTaskId(null)}
                    className="px-4 py-2 border border-border-default/60 hover:bg-bg-secondary text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!sendBackComment.trim() || isSendingBack}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-98"
                  >
                    {isSendingBack ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Send Feedback"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
