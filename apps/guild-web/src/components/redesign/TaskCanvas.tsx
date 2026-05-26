import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  FolderKanban,
  Target,
  Calendar,
  Users,
  Loader2,
  Circle,
  Search,
  Flag,
  Sparkles,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  ListTodo,
  RotateCcw,
  Clock,
  Check,
  X,
  Kanban,
  ChevronDown,
  Activity,
  UserCheck,
  ArrowRight,
  Send,
  HelpCircle,
  AlertCircle,
  Menu,
  ChevronLeft,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';
import { useTeams } from '../../hooks/useTeams';

import { CreateProjectModal } from '../../pages/projects/CreateProjectModal';
import { CreateGoalModal } from '../../pages/goals/CreateGoalModal';
import { CreateTaskModal } from '../tasks/CreateTaskModal';
import { TaskDetailPanel } from '../../pages/tasks/TaskDetailPanel';

import {
  createTask,
  moveTask,
  deleteTask,
  STATUS_CONFIG,
  STATUSES,
  addComment,
} from '../../lib/tasks';
import type { Task, TaskStatus, TaskPriority, ActorInfo } from '../../lib/tasks';
import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';

// Smart Tag Parsing Logic for Text Inputs
function parseQuickInput(text: string, projects: Project[], members: any[]) {
  let cleanedText = text;
  let projectId: string | null = null;
  let assigneeId: string | null = null;
  let priority: TaskPriority = 'none';
  let dueDate: Date | null = null;

  const priorityMatch = cleanedText.match(/!(\w+)/);
  if (priorityMatch) {
    const val = priorityMatch[1].toLowerCase();
    if (['low', 'medium', 'high', 'urgent'].includes(val)) {
      priority = val as TaskPriority;
    }
    cleanedText = cleanedText.replace(/!(\w+)/g, '');
  }

  const dateMatch = cleanedText.match(/\/(\w+)/);
  if (dateMatch) {
    const val = dateMatch[1].toLowerCase();
    const today = new Date();
    if (val === 'today') {
      dueDate = today;
    } else if (val === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      dueDate = tomorrow;
    } else if (val === 'monday') {
      const monday = new Date();
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1) + 7;
      monday.setDate(diff);
      dueDate = monday;
    } else if (val === 'week') {
      const week = new Date();
      week.setDate(today.getDate() + 7);
      dueDate = week;
    }
    cleanedText = cleanedText.replace(/\/(\w+)/g, '');
  }

  const projectMatch = cleanedText.match(/#([\w\-]+)/);
  if (projectMatch) {
    const queryName = projectMatch[1].toLowerCase().replace(/[\-_]/g, '');
    const matchedProj = projects.find((p) =>
      p.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(queryName)
    );
    if (matchedProj) {
      projectId = matchedProj.id;
    }
    cleanedText = cleanedText.replace(/#([\w\-]+)/g, '');
  }

  const assigneeMatch = cleanedText.match(/@([\w\-]+)/);
  if (assigneeMatch) {
    const queryName = assigneeMatch[1].toLowerCase();
    const matchedMem = members.find((m) =>
      (m.fullName || m.username || '').toLowerCase().includes(queryName)
    );
    if (matchedMem) {
      assigneeId = matchedMem.uid;
    }
    cleanedText = cleanedText.replace(/@([\w\-]+)/g, '');
  }

  const title = cleanedText.replace(/\s+/g, ' ').trim();
  return { title, projectId, assigneeIds: assigneeId ? [assigneeId] : [], priority, dueDate };
}

// Deterministic gradients for member avatars
function getAvatarColor(id: string) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20',
    'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
    'bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20',
    'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20',
    'bg-violet-500/10 text-violet-500 dark:text-violet-400 border-violet-500/20',
    'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20',
  ];
  return colors[hash % colors.length];
}

export function TaskCanvas() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // View States (Checklist, Kanban Board, Projects & Goals Tracker)
  const [activeTab, setActiveTab] = React.useState<'list' | 'board' | 'projects_goals'>('list');
  const [activeScope, setActiveScope] = React.useState<'my' | 'assigned' | 'review' | 'team' | 'all'>('my');
  const [quickInput, setQuickInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = React.useState(false);

  // Dropdown states for interactive smart pills
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = React.useState<TaskPriority>('none');
  const [selectedDueDate, setSelectedDueDate] = React.useState<Date | null>(null);
  const [activeDropdown, setActiveDropdown] = React.useState<'project' | 'assignee' | 'priority' | 'date' | null>(null);
  const [showShortcutHelp, setShowShortcutHelp] = React.useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterProject, setFilterProject] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');

  // Modals
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [createGoalOpen, setCreateGoalOpen] = React.useState(false);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);

  // Data hooks
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams } = useTeams(orgId);
  const members = useOrgMembers(orgId);

  // Task Drawer
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');
  const openTask = React.useMemo(() => tasks.find((t) => t.id === openTaskId) ?? null, [tasks, openTaskId]);

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Member',
  }), [user, userProfile]);

  const memberMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.uid] = m.fullName || m.username || 'Member';
    });
    return map;
  }, [members]);

  const teamMemberIds = React.useMemo(() => {
    if (!user) return [];
    const directReportIds = members.filter((m) => m.managerId === user.uid).map((m) => m.uid);
    const managedTeamMemberIds = teams.filter((t) => t.managerId === user.uid).flatMap((t) => t.memberIds ?? []);
    const allIds = new Set([...directReportIds, ...managedTeamMemberIds]);
    allIds.delete(user.uid);
    return Array.from(allIds);
  }, [members, teams, user]);

  const isManager = React.useMemo(() => {
    return (
      userProfile?.isManager ||
      userProfile?.role === 'owner' ||
      (user?.uid ? teams.some((t) => t.managerId === user.uid) : false)
    );
  }, [userProfile, teams, user]);

  // Tasks Filter Logic
  const filterTask = React.useCallback((t: Task) => {
    if (t.parentTaskId) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  }, [searchQuery, filterProject, filterPriority, filterStatus]);

  const myTasks = React.useMemo(() => {
    const myUid = user?.uid ?? '';
    return tasks.filter((t) => t.assigneeIds.includes(myUid));
  }, [tasks, user]);

  const assignedTasks = React.useMemo(() => {
    const myUid = user?.uid ?? '';
    return tasks.filter((t) => t.creatorId === myUid && t.assigneeIds.some(id => id !== myUid));
  }, [tasks, user]);

  const reviewTasks = React.useMemo(() => {
    const myUid = user?.uid ?? '';
    return tasks.filter((t) => t.creatorId === myUid && t.status === 'review');
  }, [tasks, user]);

  const teamTasks = React.useMemo(() => {
    return tasks.filter((t) => t.assigneeIds.some((id) => teamMemberIds.includes(id)));
  }, [tasks, teamMemberIds]);

  const activeScopePool = React.useMemo(() => {
    switch (activeScope) {
      case 'my':
        return myTasks;
      case 'assigned':
        return assignedTasks;
      case 'review':
        return reviewTasks;
      case 'team':
        return teamTasks;
      case 'all':
      default:
        return tasks;
    }
  }, [activeScope, myTasks, assignedTasks, reviewTasks, teamTasks, tasks]);

  const filteredTasks = React.useMemo(() => {
    return activeScopePool.filter(filterTask);
  }, [activeScopePool, filterTask]);

  const counts = React.useMemo(() => {
    return {
      my: myTasks.filter(t => !t.parentTaskId).length,
      assigned: assignedTasks.filter(t => !t.parentTaskId).length,
      review: reviewTasks.filter(t => !t.parentTaskId).length,
      team: teamTasks.filter(t => !t.parentTaskId).length,
      all: tasks.filter(t => !t.parentTaskId).length,
    };
  }, [myTasks, assignedTasks, reviewTasks, teamTasks, tasks]);

  const stats = React.useMemo(() => {
    const active = tasks.filter((t) => !t.parentTaskId);
    const completed = active.filter((t) => t.status === 'done').length;
    const rate = active.length > 0 ? Math.round((completed / active.length) * 100) : 0;
    return { total: active.length, completed, rate };
  }, [tasks]);

  const spotlightTask = React.useMemo(() => {
    return myTasks.find((t) => t.status !== 'done' && !t.parentTaskId) ?? null;
  }, [myTasks]);

  const parsedPreview = React.useMemo(() => {
    if (!quickInput.trim()) return null;
    return parseQuickInput(quickInput, projects, members);
  }, [quickInput, projects, members]);

  // Project task counts for progress trackers
  const projectStats = React.useMemo(() => {
    const statsMap: Record<string, { total: number; completed: number; rate: number }> = {};
    projects.forEach(p => {
      const projTasks = tasks.filter(t => t.projectId === p.id && !t.parentTaskId);
      const completedTasks = projTasks.filter(t => t.status === 'done').length;
      const rate = projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : 0;
      statsMap[p.id] = { total: projTasks.length, completed: completedTasks, rate };
    });
    return statsMap;
  }, [projects, tasks]);

  // Goal task counts for progress trackers
  const goalStats = React.useMemo(() => {
    const statsMap: Record<string, { total: number; completed: number; rate: number }> = {};
    goals.forEach(g => {
      const goalTasks = tasks.filter(t => t.goalId === g.id && !t.parentTaskId);
      const completedTasks = goalTasks.filter(t => t.status === 'done').length;
      const rate = goalTasks.length > 0 ? Math.round((completedTasks / goalTasks.length) * 100) : 0;
      statsMap[g.id] = { total: goalTasks.length, completed: completedTasks, rate };
    });
    return statsMap;
  }, [goals, tasks]);

  // Subtask completed tracker
  const getSubtaskStats = React.useCallback((taskId: string) => {
    const childs = tasks.filter((t) => t.parentTaskId === taskId);
    if (childs.length === 0) return null;
    const done = childs.filter((t) => t.status === 'done').length;
    return { completed: done, total: childs.length };
  }, [tasks]);

  // Task Handlers
  const handleQuickCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = quickInput.trim();
    if (!cleanTitle || !orgId) return;

    setIsSubmitting(true);
    try {
      const parsed = parseQuickInput(cleanTitle, projects, members);
      const title = parsed.title || cleanTitle;
      const projectId = parsed.projectId || selectedProjectId;
      const assigneeIds = parsed.assigneeIds.length > 0
        ? parsed.assigneeIds
        : (selectedAssigneeId ? [selectedAssigneeId] : []);
      const priority = parsed.priority !== 'none' ? parsed.priority : selectedPriority;
      const dueDate = parsed.dueDate || selectedDueDate;

      await createTask({
        orgId,
        title,
        priority,
        projectId,
        assigneeIds,
        dueDate,
        actor,
      });

      // Reset Inputs
      setQuickInput('');
      setSelectedProjectId(null);
      setSelectedAssigneeId(null);
      setSelectedPriority('none');
      setSelectedDueDate(null);
      setActiveDropdown(null);
    } catch (err) {
      console.error('Failed to create quick task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 0, task.status, actor);
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    let targetStatus: TaskStatus;
    if (task.status === 'done' || task.status === 'review') {
      targetStatus = 'todo';
    } else {
      targetStatus = task.creatorId !== actor.uid ? 'review' : 'done';
    }
    await handleStatusChange(task, targetStatus);
  };

  const handleApproveTask = async (task: Task) => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, 'done', task.orderIndex || 0, task.status, actor);
      await addComment({
        taskId: task.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername: userProfile?.username || actor.name,
        body: 'Approved! Task is marked as Completed.',
        mentions: [],
        notifyIds: task.assigneeIds.filter((id) => id !== actor.uid),
        taskTitle: task.title,
      });
    } catch (err) {
      console.error('Failed to approve task:', err);
    }
  };

  const handleRequestChanges = async (task: Task, reason: string = 'Changes requested.') => {
    if (!orgId) return;
    try {
      await addComment({
        taskId: task.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername: userProfile?.username || actor.name,
        body: `Re-opened: ${reason}`,
        mentions: [],
        notifyIds: task.assigneeIds.filter((id) => id !== actor.uid),
        taskTitle: task.title,
      });
      await handleStatusChange(task, 'todo');
    } catch (err) {
      console.error('Failed to request changes:', err);
    }
  };

  const cycleStatus = async (task: Task, direction: 'forward' | 'backward') => {
    const idx = STATUSES.indexOf(task.status);
    let nextIdx = direction === 'forward' ? idx + 1 : idx - 1;
    if (nextIdx >= STATUSES.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = STATUSES.length - 1;

    let targetStatus = STATUSES[nextIdx];
    if (targetStatus === 'done' && task.creatorId !== actor.uid) {
      targetStatus = 'review';
    }
    await handleStatusChange(task, targetStatus);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const hasActiveFilters = searchQuery || filterProject !== 'all' || filterPriority !== 'all' || filterStatus !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterProject('all');
    setFilterPriority('all');
    setFilterStatus('all');
  };

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        No organization context found.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full select-none pr-1 md:pr-2 pb-12 overflow-y-auto">
      {/* Invisible overlay for absolute dropdowns */}
      {activeDropdown && (
        <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveDropdown(null)} />
      )}

      <div className="flex-1 flex flex-col md:flex-row gap-6 items-start min-w-0">
        
        {/* =========================================================================
            PANEL 1: Left Quick-Filter Sidebar (Collapsible, w-64 or w-16)
            ========================================================================= */}
        <div
          className={cn(
            'flex flex-col gap-6 shrink-0 transition-all duration-300 ease-in-out border-r border-border/40 dark:border-white/5 pr-4 self-stretch',
            isLeftSidebarCollapsed ? 'w-16' : 'w-64'
          )}
        >
          {/* Sidebar Top Header & Collapsing Trigger */}
          <div className="flex items-center justify-between gap-2 border-b border-border/40 dark:border-white/5 pb-4 shrink-0">
            {!isLeftSidebarCollapsed && (
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Workspace Controls
              </span>
            )}
            <button
              onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center hover:bg-foreground/5 text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-90 border border-border/50 dark:border-white/5',
                isLeftSidebarCollapsed ? 'mx-auto' : ''
              )}
              title={isLeftSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isLeftSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* View Toggles Stack */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {!isLeftSidebarCollapsed && (
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2.5 mb-1">
                Layout View
              </span>
            )}
            {[
              { id: 'list', label: 'Checklist', icon: ListTodo },
              { id: 'board', label: 'Kanban Board', icon: Kanban },
              { id: 'projects_goals', label: 'Projects & Goals', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative cursor-pointer',
                    isSelected
                      ? 'bg-primary text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.02]',
                    isLeftSidebarCollapsed ? 'justify-center' : 'justify-start'
                  )}
                  title={tab.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isLeftSidebarCollapsed && <span>{tab.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Scope Filters Group */}
          <div className="flex flex-col gap-1.5">
            {!isLeftSidebarCollapsed && (
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2.5 mb-1">
                Workload Scope
              </span>
            )}
            {[
              { id: 'my', label: 'Personal Tasks', icon: UserCheck, count: counts.my, color: 'text-primary' },
              { id: 'assigned', label: 'Assigned Tasks', icon: Send, count: counts.assigned, color: 'text-sky-500' },
              { id: 'review', label: 'Pending Approvals', icon: Clock, count: counts.review, color: 'text-amber-500' },
              ...(isManager ? [{ id: 'team', label: 'Team Workload', icon: Users, count: counts.team, color: 'text-emerald-500' }] : []),
              { id: 'all', label: 'All Workload', icon: FolderKanban, count: counts.all, color: 'text-muted-foreground' },
            ].map((scope) => {
              const Icon = scope.icon;
              const isActive = activeScope === scope.id;
              return (
                <button
                  key={scope.id}
                  onClick={() => setActiveScope(scope.id as any)}
                  className={cn(
                    'w-full flex items-center rounded-xl text-xs transition-all cursor-pointer border border-transparent py-2.5 relative',
                    isActive
                      ? 'bg-primary/5 border-primary/20 text-foreground font-extrabold'
                      : 'hover:bg-foreground/[0.02] text-muted-foreground hover:text-foreground',
                    isLeftSidebarCollapsed ? 'justify-center px-1' : 'justify-between px-3'
                  )}
                  title={scope.label}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', scope.color, isActive ? 'opacity-100' : 'opacity-70')} />
                    {!isLeftSidebarCollapsed && <span className="truncate">{scope.label}</span>}
                  </div>
                  
                  {/* Dynamic counts badge */}
                  {isLeftSidebarCollapsed ? (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-surface shadow-sm">
                      {scope.count}
                    </span>
                  ) : (
                    <span className={cn(
                      'px-2 py-0.5 rounded-md font-mono text-[9px] font-medium shrink-0',
                      isActive ? 'bg-primary/10 text-primary border border-primary/10' : 'bg-foreground/5 text-muted-foreground'
                    )}>
                      {scope.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Active Filters list (Only when expanded) */}
          {!isLeftSidebarCollapsed && hasActiveFilters && (
            <div className="p-3.5 bg-foreground/[0.01] border border-border/80 dark:border-white/5 rounded-2xl flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Filters
                </span>
                <button
                  onClick={resetFilters}
                  className="text-[10px] text-rose-500 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {searchQuery && (
                  <span className="px-2 py-0.5 rounded-md bg-foreground/5 border border-border/40 text-[9px] text-foreground font-medium flex items-center gap-1">
                    "{searchQuery.slice(0, 10)}"
                    <X className="w-2 h-2 cursor-pointer hover:text-rose-500" onClick={() => setSearchQuery('')} />
                  </span>
                )}
                {filterProject !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/10 text-[9px] text-primary font-medium flex items-center gap-1">
                    Project
                    <X className="w-2 h-2 cursor-pointer hover:text-rose-500" onClick={() => setFilterProject('all')} />
                  </span>
                )}
                {filterPriority !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/10 text-[9px] text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                    {filterPriority}
                    <X className="w-2 h-2 cursor-pointer hover:text-rose-500" onClick={() => setFilterPriority('all')} />
                  </span>
                )}
                {filterStatus !== 'all' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/10 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    Status
                    <X className="w-2 h-2 cursor-pointer hover:text-rose-500" onClick={() => setFilterStatus('all')} />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            PANEL 2: Center Interactive checklist / board / projects grid (Colspan 9)
            ========================================================================= */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 self-stretch">

          {/* Top Workspace Summary Board (Anchored Banner) */}
          <div className="bg-primary/5 dark:bg-primary/[0.02] border border-primary/10 dark:border-white/5 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm shrink-0">
            
            {/* Left side overall progress metrics */}
            <div className="space-y-2 w-full md:w-auto flex-1 max-w-sm">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block select-none">
                Workspace Progress
              </span>
              <div className="flex justify-between items-center text-xs font-bold text-foreground">
                <span>Overall Completion</span>
                <span>{stats.rate}%</span>
              </div>
              <div className="w-full bg-foreground/5 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${stats.rate}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">
                {stats.completed} Completed Out Of {stats.total} Active Tasks
              </span>
            </div>

            {/* Middle vertical divider */}
            <div className="hidden md:block w-[1px] h-12 bg-border/60 dark:bg-white/5 shrink-0" />

            {/* Right side Spotlight task focus widget */}
            <div className="w-full md:w-auto flex-1 max-w-md">
              {spotlightTask ? (
                <div className="flex items-center justify-between gap-4 p-3 bg-surface dark:bg-white/[0.01] border border-border/80 dark:border-white/5 rounded-xl shadow-inner group">
                  <div className="min-w-0 space-y-1">
                    <span className="px-1.5 py-0.2 rounded bg-primary/10 border border-primary/15 text-[8px] font-bold uppercase tracking-wider text-primary">
                      Active Priority
                    </span>
                    <h4 
                      onClick={() => setSearchParams({ task: spotlightTask.id })}
                      className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate cursor-pointer"
                    >
                      {spotlightTask.title}
                    </h4>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(spotlightTask)}
                    className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Complete</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 text-center border border-dashed border-border/80 dark:border-white/10 rounded-xl bg-surface/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-foreground block">Vector Clear</span>
                    <span className="text-[9px] text-muted-foreground/60 uppercase block">All personal items completed</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Task Capture Console */}
          <div className="bg-surface dark:bg-surface/30 border border-border/80 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4 relative shrink-0">
            <form onSubmit={handleQuickCaptureSubmit} className="flex gap-3">
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Create a task instantly..."
                  disabled={isSubmitting}
                  className="w-full bg-foreground/[0.02] dark:bg-white/5 border border-border/80 dark:border-white/5 rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-all font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !quickInput.trim()}
                className="px-5 py-3 bg-primary hover:bg-primary/95 disabled:opacity-40 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4.5 h-4.5" />
                    <span>Add Task</span>
                  </>
                )}
              </button>
            </form>

            {/* Smart Pills Selector Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 dark:border-white/5 text-[10px]">
              
              {/* Project Smart Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'project' ? null : 'project')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer',
                    selectedProjectId 
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-foreground/[0.02] dark:bg-white/5 border-border/80 dark:border-white/5 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>
                    {selectedProjectId
                      ? projects.find(p => p.id === selectedProjectId)?.name.slice(0, 15)
                      : 'Project'}
                  </span>
                  {selectedProjectId ? (
                    <X className="w-3 h-3 hover:text-rose-500 cursor-pointer ml-0.5" onClick={(e) => { e.stopPropagation(); setSelectedProjectId(null); }} />
                  ) : (
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  )}
                </button>
                {activeDropdown === 'project' && (
                  <div className="absolute top-full mt-1.5 left-0 z-50 bg-surface dark:bg-surface-elevated border border-border/80 dark:border-white/10 rounded-xl shadow-lg p-1.5 max-h-60 overflow-y-auto w-56 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1 select-none">Select Project</div>
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-foreground/5 text-xs text-foreground font-semibold truncate cursor-pointer"
                      >
                        #{p.name}
                      </button>
                    ))}
                    {projects.length === 0 && (
                      <div className="px-2 py-3 text-center text-muted-foreground italic text-[10px]">No active projects</div>
                    )}
                  </div>
                )}
              </div>

              {/* Assignee Smart Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'assignee' ? null : 'assignee')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer',
                    selectedAssigneeId 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-foreground/[0.02] dark:bg-white/5 border-border/80 dark:border-white/5 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {selectedAssigneeId
                      ? memberMap[selectedAssigneeId]?.slice(0, 15)
                      : 'Assignee'}
                  </span>
                  {selectedAssigneeId ? (
                    <X className="w-3 h-3 hover:text-rose-500 cursor-pointer ml-0.5" onClick={(e) => { e.stopPropagation(); setSelectedAssigneeId(null); }} />
                  ) : (
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  )}
                </button>
                {activeDropdown === 'assignee' && (
                  <div className="absolute top-full mt-1.5 left-0 z-50 bg-surface dark:bg-surface-elevated border border-border/80 dark:border-white/10 rounded-xl shadow-lg p-1.5 max-h-60 overflow-y-auto w-56 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1 select-none">Assign Task To</div>
                    {members.map((m) => (
                      <button
                        key={m.uid}
                        type="button"
                        onClick={() => {
                          setSelectedAssigneeId(m.uid);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-foreground/5 text-xs text-foreground font-semibold truncate cursor-pointer flex items-center gap-2"
                      >
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0", getAvatarColor(m.uid))}>
                          {(m.fullName || m.username || 'M').slice(0, 1).toUpperCase()}
                        </div>
                        <span>{m.fullName || m.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority Smart Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer',
                    selectedPriority !== 'none'
                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400'
                      : 'bg-foreground/[0.02] dark:bg-white/5 border-border/80 dark:border-white/5 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="capitalize">
                    {selectedPriority !== 'none' ? selectedPriority : 'Priority'}
                  </span>
                  {selectedPriority !== 'none' ? (
                    <X className="w-3 h-3 hover:text-rose-500 cursor-pointer ml-0.5" onClick={(e) => { e.stopPropagation(); setSelectedPriority('none'); }} />
                  ) : (
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  )}
                </button>
                {activeDropdown === 'priority' && (
                  <div className="absolute top-full mt-1.5 left-0 z-50 bg-surface dark:bg-surface-elevated border border-border/80 dark:border-white/10 rounded-xl shadow-lg p-1.5 w-44 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1 select-none">Set Priority</div>
                    {(['none', 'low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setSelectedPriority(p);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-foreground/5 text-xs text-foreground font-semibold capitalize cursor-pointer flex items-center gap-2"
                      >
                        <span className={cn('h-2 w-2 rounded-full shrink-0', 
                          p === 'urgent' && 'bg-rose-500',
                          p === 'high' && 'bg-orange-500',
                          p === 'medium' && 'bg-amber-500',
                          p === 'low' && 'bg-sky-500',
                          p === 'none' && 'bg-foreground/20'
                        )} />
                        <span>{p}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Date Smart Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer',
                    selectedDueDate 
                      ? 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400'
                      : 'bg-foreground/[0.02] dark:bg-white/5 border-border/80 dark:border-white/5 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {selectedDueDate
                      ? selectedDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'Due Date'}
                  </span>
                  {selectedDueDate ? (
                    <X className="w-3 h-3 hover:text-rose-500 cursor-pointer ml-0.5" onClick={(e) => { e.stopPropagation(); setSelectedDueDate(null); }} />
                  ) : (
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  )}
                </button>
                {activeDropdown === 'date' && (
                  <div className="absolute top-full mt-1.5 left-0 z-50 bg-surface dark:bg-surface-elevated border border-border/80 dark:border-white/10 rounded-xl shadow-lg p-2 w-52 animate-in fade-in slide-in-from-top-1 duration-150 space-y-1.5">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-0.5 select-none">Set Due Date</div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDueDate(new Date());
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-foreground/5 text-xs text-foreground font-semibold cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDueDate(new Date(Date.now() + 86400000));
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-foreground/5 text-xs text-foreground font-semibold cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        setSelectedDueDate(nextWeek);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-foreground/5 text-xs text-foreground font-semibold cursor-pointer"
                    >
                      Next Week
                    </button>
                    
                    <div className="pt-1.5 border-t border-border/40 dark:border-white/5">
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedDueDate(new Date(e.target.value));
                            setActiveDropdown(null);
                          }
                        }}
                        className="w-full bg-foreground/[0.02] dark:bg-white/5 border border-border/80 dark:border-white/5 rounded-lg px-2.5 py-1 text-[11px] text-foreground outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Help Toggle */}
              <button
                type="button"
                onClick={() => setShowShortcutHelp(!showShortcutHelp)}
                className="ml-auto text-muted-foreground/60 hover:text-foreground cursor-pointer p-0.5 rounded transition-all"
                title="Help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Syntax reference Panel */}
            <AnimatePresence>
              {showShortcutHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3.5 border-t border-border/40 dark:border-white/5 text-[10px] text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-2 font-semibold">
                    <div><code className="text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded mr-2">#project</code>Project name filter</div>
                    <div><code className="text-orange-500 bg-orange-500/5 border border-orange-500/10 px-1.5 py-0.5 rounded mr-2">!high</code>Priority (urgent, high, medium, low)</div>
                    <div><code className="text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded mr-2">@member</code>Assignee name</div>
                    <div><code className="text-violet-500 bg-violet-500/5 border border-violet-500/10 px-1.5 py-0.5 rounded mr-2">/due</code>relative due (today, tomorrow, monday, week)</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Live NLP Preview Bar */}
            <AnimatePresence>
              {parsedPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2.5 border-t border-border/40 dark:border-white/5 flex flex-wrap gap-1.5 items-center text-[9px] font-bold text-muted-foreground uppercase">
                    <span className="mr-1">Parsed:</span>
                    {parsedPreview.title && (
                      <span className="px-2 py-0.5 rounded bg-foreground/5 text-foreground font-black">
                        "{parsedPreview.title}"
                      </span>
                    )}
                    {parsedPreview.projectId && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/10">
                        <FolderKanban className="w-3 h-3" />
                        #{projects.find(p => p.id === parsedPreview.projectId)?.name}
                      </span>
                    )}
                    {parsedPreview.assigneeIds.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-550 dark:text-emerald-400 border border-emerald-500/10">
                        <Users className="w-3 h-3" />
                        {memberMap[parsedPreview.assigneeIds[0]]}
                      </span>
                    )}
                    {parsedPreview.priority !== 'none' && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-500/10 text-orange-650 dark:text-orange-400 border border-orange-500/10">
                        <Flag className="w-3 h-3 fill-current" />
                        {parsedPreview.priority}
                      </span>
                    )}
                    {parsedPreview.dueDate && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-500/10 text-violet-650 dark:text-violet-400 border border-violet-500/10">
                        <Calendar className="w-3 h-3" />
                        {parsedPreview.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dynamic Content Views Panel */}
          <div className="flex-1 min-h-[500px]">
            {tasksLoading ? (
              <div className="flex flex-col items-center justify-center py-28 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-semibold">Updating workspace...</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                
                {/* ─── 1. Checklist List View ─── */}
                {activeTab === 'list' && (
                  <motion.div
                    key="checklist-workspace"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="space-y-6"
                  >
                    
                    {/* Live Search and Filters bar */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-muted-foreground/50 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search tasks..."
                          className="w-full bg-surface border border-border/80 dark:border-white/5 rounded-xl pl-10 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 font-semibold"
                        />
                      </div>
                      
                      <div className="relative">
                        <select
                          value={filterProject}
                          onChange={(e) => setFilterProject(e.target.value)}
                          className="appearance-none bg-surface border border-border/80 dark:border-white/5 rounded-xl pl-3 pr-9 py-2.5 text-xs text-foreground font-semibold outline-none cursor-pointer hover:bg-foreground/[0.01]"
                        >
                          <option value="all">All Projects</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>#{p.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-3.5 pointer-events-none" />
                      </div>

                      <div className="relative">
                        <select
                          value={filterPriority}
                          onChange={(e) => setFilterPriority(e.target.value)}
                          className="appearance-none bg-surface border border-border/80 dark:border-white/5 rounded-xl pl-3 pr-9 py-2.5 text-xs text-foreground font-semibold outline-none cursor-pointer hover:bg-foreground/[0.01]"
                        >
                          <option value="all">All Priorities</option>
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                          <option value="none">None</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-3.5 pointer-events-none" />
                      </div>
                    </div>

                    {filteredTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-28 text-center border border-dashed border-border/80 dark:border-white/10 rounded-2xl bg-surface/20">
                        <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 animate-pulse" />
                        <span className="text-xs font-bold text-muted-foreground mt-3.5 block">No tasks match your filters</span>
                        {hasActiveFilters && (
                          <button
                            onClick={resetFilters}
                            className="text-xs text-primary font-bold mt-1.5 hover:underline cursor-pointer"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    ) : (
                      (['todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map((status) => {
                        const statusTasks = filteredTasks.filter(t => t.status === status);
                        if (statusTasks.length === 0) return null;

                        const cfg = STATUS_CONFIG[status];
                        
                        return (
                          <div key={status} className="space-y-3">
                            {/* Status Group Header */}
                            <div className="flex items-center gap-2 px-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                              <span>{cfg.label === 'Done' ? 'Completed' : cfg.label === 'In Progress' ? 'In Progress' : cfg.label === 'To Do' ? 'To Do' : 'Under Review'}</span>
                              <span className="px-2 py-0.5 rounded-full bg-foreground/5 leading-none text-[10px] text-muted-foreground/80 font-mono">
                                {statusTasks.length}
                              </span>
                            </div>

                            {/* Task Cards Deck - Vertically bigger sizing, no max-height constraints */}
                            <div className="border border-border/80 dark:border-white/10 rounded-2xl bg-surface divide-y divide-border/40 dark:divide-white/5 overflow-hidden shadow-md">
                              {statusTasks.map((task) => {
                                const matchedProj = projects.find(p => p.id === task.projectId);
                                const matchedGoal = goals.find(g => g.id === task.goalId);
                                const subStats = getSubtaskStats(task.id);
                                const due = task.dueDate?.toDate?.();

                                const isReviewer = task.status === 'review' && task.creatorId === actor.uid;
                                const initials = task.assigneeIds.length > 0 ? memberMap[task.assigneeIds[0]]?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : null;

                                return (
                                  <div
                                    key={task.id}
                                    className="group hover:bg-foreground/[0.01] transition-all flex flex-col"
                                  >
                                    <div 
                                      onClick={() => setSearchParams({ task: task.id })}
                                      className="flex items-center justify-between gap-5 px-5 py-4.5 cursor-pointer text-xs"
                                    >
                                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                        
                                        {/* Checkbox Trigger */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleComplete(task);
                                          }}
                                          className="shrink-0 transition-all hover:scale-110 active:scale-90 cursor-pointer mt-0.5"
                                        >
                                          {task.status === 'done' ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                          ) : task.status === 'review' ? (
                                            <Clock className="w-5 h-5 text-amber-500" />
                                          ) : (
                                            <Circle className="w-5 h-5 text-muted-foreground/35 hover:text-muted-foreground" />
                                          )}
                                        </button>

                                        {/* Priority Indicator */}
                                        {task.priority !== 'none' && (
                                          <span className="shrink-0 flex items-center justify-center">
                                            <span className={cn('h-2 w-2 rounded-full', 
                                              task.priority === 'urgent' && 'bg-rose-500',
                                              task.priority === 'high' && 'bg-orange-500',
                                              task.priority === 'medium' && 'bg-amber-500',
                                              task.priority === 'low' && 'bg-sky-500'
                                            )} />
                                          </span>
                                        )}

                                        {/* Task Title & Badges */}
                                        <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                                          <span className={cn(
                                            'font-bold text-foreground text-xs leading-normal',
                                            task.status === 'done' && 'line-through text-muted-foreground/50 font-normal'
                                          )}>
                                            {task.title}
                                          </span>

                                          {/* Subtask Stats */}
                                          {subStats && (
                                            <span className="text-[9px] font-bold text-muted-foreground bg-foreground/5 border border-border/40 rounded-md px-2 py-0.5">
                                              {subStats.completed}/{subStats.total} subtasks
                                            </span>
                                          )}

                                          {/* Project Tag */}
                                          {matchedProj && (
                                            <span className="text-[9px] font-bold text-primary bg-primary/5 border border-primary/10 rounded-md px-2 py-0.5">
                                              #{matchedProj.name}
                                            </span>
                                          )}

                                          {/* Goal Tag */}
                                          {matchedGoal && (
                                            <span className="text-[9px] font-bold text-violet-505 dark:text-violet-400 bg-violet-500/5 border border-violet-500/10 rounded-md px-2 py-0.5 inline-flex items-center gap-0.5">
                                              <Target className="w-3 h-3" />
                                              {matchedGoal.title}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Due Date & Assignee */}
                                      <div className="flex items-center gap-4 shrink-0 ml-4" onClick={e => e.stopPropagation()}>
                                        
                                        {/* Calendar Banner */}
                                        {due && (
                                          <span className={cn(
                                            'text-[10px] font-semibold flex items-center gap-1 select-none',
                                            due < new Date() && task.status !== 'done' ? 'text-rose-500 font-bold' : 'text-muted-foreground/60'
                                          )}>
                                            <Calendar className="w-4 h-4 shrink-0" />
                                            <span>{due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                          </span>
                                        )}

                                        {/* Assignee Avatar */}
                                        {initials ? (
                                          <div
                                            title={memberMap[task.assigneeIds[0]]}
                                            className={cn(
                                              'w-6.5 h-6.5 rounded-full border text-[10px] font-black flex items-center justify-center select-none shadow-sm shrink-0',
                                              getAvatarColor(task.assigneeIds[0])
                                            )}
                                          >
                                            {initials}
                                          </div>
                                        ) : (
                                          <div className="w-6.5 h-6.5 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground/20" title="Unassigned">
                                            <Users className="w-3.5 h-3.5" />
                                          </div>
                                        )}

                                        {/* Delete */}
                                        <button
                                          onClick={() => handleDeleteTask(task.id)}
                                          className="p-1 rounded text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                          title="Delete Task"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Inline Reviewer Controls */}
                                    {isReviewer && (
                                      <div className="px-12 pb-4 pt-0.5" onClick={e => e.stopPropagation()}>
                                        <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex flex-col gap-3 max-w-md">
                                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[9px]">
                                            <AlertCircle className="w-4 h-4 animate-pulse" />
                                            <span>Review Required</span>
                                          </div>
                                          
                                          <div className="flex gap-2.5">
                                            <button
                                              onClick={() => handleApproveTask(task)}
                                              className="flex-1 py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                                            >
                                              <Check className="w-4 h-4" />
                                              <span>Approve</span>
                                            </button>
                                            <button
                                              onClick={async () => {
                                                const comment = window.prompt('Enter modification notes (optional):');
                                                if (comment !== null) {
                                                  await handleRequestChanges(task, comment || undefined);
                                                }
                                              }}
                                              className="flex-1 py-2 px-4 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                            >
                                              <X className="w-4 h-4" />
                                              <span>Reject</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}

                {/* ─── 2. Kanban Board View (No max-height scroll caps) ─── */}
                {activeTab === 'board' && (
                  <motion.div
                    key="board-workspace"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start pb-12 overflow-x-auto"
                  >
                    {STATUSES.map((status) => {
                      const colTasks = filteredTasks.filter(t => t.status === status);
                      const cfg = STATUS_CONFIG[status];

                      return (
                        <div
                          key={status}
                          className="bg-surface/60 dark:bg-surface/20 border border-border/80 dark:border-white/5 rounded-2xl flex flex-col shadow-md shrink-0"
                        >
                          {/* Lane Header */}
                          <div className="px-4 py-3.5 border-b border-border/40 dark:border-white/5 flex items-center justify-between select-none">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                                {cfg.label === 'Done' ? 'Completed' : cfg.label === 'In Progress' ? 'In Progress' : cfg.label === 'To Do' ? 'To Do' : 'Under Review'}
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-md bg-foreground/5 font-mono text-[10px] font-bold text-muted-foreground">
                              {colTasks.length}
                            </span>
                          </div>

                          {/* Lane Cards Scrollable Deck - No max-height block, displays naturally */}
                          <div className="flex-1 p-3.5 space-y-3.5 min-h-[300px]">
                            {colTasks.length === 0 ? (
                              <div className="py-16 text-center select-none">
                                <span className="text-[10px] text-muted-foreground/30 italic block uppercase tracking-wider font-semibold">Empty Lane</span>
                              </div>
                            ) : (
                              colTasks.map((task) => {
                                const matchedProj = projects.find(p => p.id === task.projectId);
                                const matchedGoal = goals.find(g => g.id === task.goalId);
                                const subStats = getSubtaskStats(task.id);
                                const due = task.dueDate?.toDate?.();
                                const initials = task.assigneeIds.length > 0 ? memberMap[task.assigneeIds[0]]?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : null;
                                const isReviewer = task.status === 'review' && task.creatorId === actor.uid;

                                return (
                                  <div
                                    key={task.id}
                                    onClick={() => setSearchParams({ task: task.id })}
                                    className="bg-surface dark:bg-white/[0.02] border border-border/80 dark:border-white/5 hover:border-primary/40 p-4 space-y-3.5 cursor-pointer hover:scale-[1.01] active:scale-99 transition-all rounded-xl shadow-sm hover:shadow-md relative group flex flex-col"
                                  >
                                    {/* Task Title & Shift arrows */}
                                    <div className="flex items-start justify-between gap-3">
                                      <span className={cn(
                                        'text-xs font-bold text-foreground leading-normal line-clamp-2',
                                        task.status === 'done' && 'line-through text-muted-foreground/50 font-normal'
                                      )}>
                                        {task.title}
                                      </span>

                                      {/* Hover Shift status buttons */}
                                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <button
                                          onClick={() => cycleStatus(task, 'backward')}
                                          className="p-0.5 hover:bg-foreground/5 rounded text-muted-foreground/50 hover:text-foreground cursor-pointer"
                                          title="Move Back"
                                        >
                                          <ArrowLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => cycleStatus(task, 'forward')}
                                          className="p-0.5 hover:bg-foreground/5 rounded text-muted-foreground/50 hover:text-foreground cursor-pointer"
                                          title="Move Forward"
                                        >
                                          <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Subtask micro progress tracks */}
                                    {subStats && (
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-muted-foreground font-bold">
                                          <span>Subtasks</span>
                                          <span>{subStats.completed}/{subStats.total}</span>
                                        </div>
                                        <div className="w-full bg-foreground/5 rounded-full h-1 overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-primary transition-all duration-300"
                                            style={{
                                              width: `${(subStats.completed / subStats.total) * 100}%`
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Metadata badges row */}
                                    <div className="flex flex-wrap gap-1.5 items-center pt-2.5 border-t border-border/40 dark:border-white/5">
                                      {task.priority !== 'none' && (
                                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', 
                                          task.priority === 'urgent' && 'bg-rose-500',
                                          task.priority === 'high' && 'bg-orange-500',
                                          task.priority === 'medium' && 'bg-amber-500',
                                          task.priority === 'low' && 'bg-sky-500'
                                        )} />
                                      )}

                                      {due && (
                                        <span className="px-2 py-0.5 rounded bg-foreground/5 border border-border/30 text-[8px] font-bold text-muted-foreground shrink-0 inline-flex items-center gap-0.5">
                                          <Calendar className="w-2.5 h-2.5 shrink-0" />
                                          {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                      )}

                                      {matchedProj && (
                                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold shrink-0 truncate max-w-[80px]">
                                          #{matchedProj.name}
                                        </span>
                                      )}

                                      {matchedGoal && (
                                        <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[8px] font-bold shrink-0 truncate max-w-[80px] inline-flex items-center gap-0.5">
                                          <Target className="w-2 h-2 shrink-0" />
                                          {matchedGoal.title}
                                        </span>
                                      )}

                                      {/* User avatar bubble */}
                                      {initials && (
                                        <div className={cn(
                                          'w-5 h-5 rounded-full border text-[8px] font-black flex items-center justify-center select-none shadow-sm ml-auto shrink-0',
                                          getAvatarColor(task.assigneeIds[0])
                                        )}>
                                          {initials}
                                        </div>
                                      )}
                                    </div>

                                    {/* Inline approvals inside Kanban Card */}
                                    {isReviewer && (
                                      <div className="pt-2.5 border-t border-border/40 dark:border-white/5 flex gap-2" onClick={e => e.stopPropagation()}>
                                        <button
                                          onClick={() => handleApproveTask(task)}
                                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-sm text-center"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={async () => {
                                            const comment = window.prompt('Enter modification notes (optional):');
                                            if (comment !== null) {
                                              await handleRequestChanges(task, comment || undefined);
                                            }
                                          }}
                                          className="flex-1 py-1 px-2 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-500 font-bold text-[9px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer text-center"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* ─── 3. Projects & Goals Tracker View (New Full-Page Dashboard Tab) ─── */}
                {activeTab === 'projects_goals' && (
                  <motion.div
                    key="projects-goals-workspace"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12"
                  >
                    
                    {/* Left Column: Projects Overview Cards */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1 shrink-0 select-none">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Active Projects Tracker
                        </span>
                        <button
                          onClick={() => setCreateProjectOpen(true)}
                          className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Project
                        </button>
                      </div>

                      {projectsLoading ? (
                        <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>
                      ) : projects.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-border/80 dark:border-white/10 rounded-2xl bg-surface">
                          <span className="text-xs text-muted-foreground/50 italic font-semibold">No active projects</span>
                        </div>
                      ) : (
                        projects.map(proj => {
                          const pStat = projectStats[proj.id] || { rate: 0, completed: 0, total: 0 };
                          
                          // Nested task lists inside the Project Tracker card!
                          const projectTasks = tasks.filter(t => t.projectId === proj.id && t.status !== 'done' && !t.parentTaskId).slice(0, 3);
                          
                          return (
                            <div
                              key={proj.id}
                              className="bg-surface dark:bg-white/[0.01] border border-border/80 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm hover:border-primary/30 transition-all hover:shadow-md"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-0.5 min-w-0">
                                  <h4 
                                    onClick={() => navigate(`/projects/${proj.id}`)}
                                    className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                                  >
                                    #{proj.name}
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {proj.description || 'Sprint track'}
                                  </p>
                                </div>

                                <span className={cn(
                                  'px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider',
                                  proj.status === 'active' ? 'bg-primary/10 text-primary border border-primary/10' : 'bg-foreground/5 text-muted-foreground'
                                )}>
                                  {proj.status}
                                </span>
                              </div>

                              {/* Progress bar info */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                                  <span>Task Completion</span>
                                  <span>{pStat.rate}% ({pStat.completed}/{pStat.total})</span>
                                </div>
                                <div className="w-full bg-foreground/5 rounded-full h-1.5 overflow-hidden shadow-inner">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${pStat.rate}%` }}
                                  />
                                </div>
                              </div>

                              {/* Nested task item checklists with toggle checkbox support */}
                              {projectTasks.length > 0 && (
                                <div className="pt-2 border-t border-border/40 dark:border-white/5 space-y-2">
                                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest block">
                                    Pending Tasks Checklist
                                  </span>
                                  <div className="space-y-1.5">
                                    {projectTasks.map(task => (
                                      <div 
                                        key={task.id}
                                        onClick={() => setSearchParams({ task: task.id })}
                                        className="flex items-center justify-between gap-3 p-2 bg-foreground/[0.01] hover:bg-foreground/[0.02] border border-border/40 dark:border-white/5 rounded-lg text-[11px] font-semibold cursor-pointer group"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleComplete(task);
                                            }}
                                            className="shrink-0 transition-transform hover:scale-110 active:scale-90 cursor-pointer"
                                          >
                                            <Circle className="w-4 h-4 text-muted-foreground/35 hover:text-muted-foreground" />
                                          </button>
                                          <span className="text-foreground truncate">{task.title}</span>
                                        </div>
                                        {task.priority !== 'none' && (
                                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', 
                                            task.priority === 'urgent' && 'bg-rose-500',
                                            task.priority === 'high' && 'bg-orange-500',
                                            task.priority === 'medium' && 'bg-amber-500',
                                            task.priority === 'low' && 'bg-sky-500'
                                          )} />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Right Column: Strategic Goals Overview Cards */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1 shrink-0 select-none">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Active Goals Tracker
                        </span>
                        <button
                          onClick={() => setCreateGoalOpen(true)}
                          className="text-xs text-violet-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Goal
                        </button>
                      </div>

                      {goalsLoading ? (
                        <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>
                      ) : goals.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-border/80 dark:border-white/10 rounded-2xl bg-surface">
                          <span className="text-xs text-muted-foreground/50 italic font-semibold">No active goals</span>
                        </div>
                      ) : (
                        goals.map(goal => {
                          const gStat = goalStats[goal.id] || { rate: 0, completed: 0, total: 0 };
                          
                          // Nested task lists inside the Goal Tracker card!
                          const goalTasks = tasks.filter(t => t.goalId === goal.id && t.status !== 'done' && !t.parentTaskId).slice(0, 3);

                          return (
                            <div
                              key={goal.id}
                              className="bg-surface dark:bg-white/[0.01] border border-border/80 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm hover:border-violet-500/30 transition-all hover:shadow-md"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-0.5 min-w-0">
                                  <h4 
                                    onClick={() => navigate(`/goals/${goal.id}`)}
                                    className="text-sm font-bold text-foreground hover:text-violet-500 transition-colors cursor-pointer truncate"
                                  >
                                    {goal.title}
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                                    {goal.description || 'Primary objective'}
                                  </p>
                                </div>

                                <span className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-violet-500/10 text-violet-500 border border-violet-500/10 shrink-0">
                                  {goal.status}
                                </span>
                              </div>

                              {/* Progress bar info */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                                  <span>Task Completion</span>
                                  <span>{gStat.rate}% ({gStat.completed}/{gStat.total})</span>
                                </div>
                                <div className="w-full bg-foreground/5 rounded-full h-1.5 overflow-hidden shadow-inner">
                                  <div
                                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                                    style={{ width: `${gStat.rate}%` }}
                                  />
                                </div>
                              </div>

                              {/* Nested task checklists inside strategic goal */}
                              {goalTasks.length > 0 && (
                                <div className="pt-2 border-t border-border/40 dark:border-white/5 space-y-2">
                                  <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest block">
                                    Strategic Task Items
                                  </span>
                                  <div className="space-y-1.5">
                                    {goalTasks.map(task => (
                                      <div 
                                        key={task.id}
                                        onClick={() => setSearchParams({ task: task.id })}
                                        className="flex items-center justify-between gap-3 p-2 bg-foreground/[0.01] hover:bg-foreground/[0.02] border border-border/40 dark:border-white/5 rounded-lg text-[11px] font-semibold cursor-pointer group"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleComplete(task);
                                            }}
                                            className="shrink-0 transition-transform hover:scale-110 active:scale-90 cursor-pointer"
                                          >
                                            <Circle className="w-4 h-4 text-muted-foreground/35 hover:text-muted-foreground" />
                                          </button>
                                          <span className="text-foreground truncate">{task.title}</span>
                                        </div>
                                        {task.priority !== 'none' && (
                                          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', 
                                            task.priority === 'urgent' && 'bg-rose-500',
                                            task.priority === 'high' && 'bg-orange-500',
                                            task.priority === 'medium' && 'bg-amber-500',
                                            task.priority === 'low' && 'bg-sky-500'
                                          )} />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                  </motion.div>
                )}

              </AnimatePresence>
            )}
          </div>

        </div>

      </div>

      {/* ─── Drawer: Side-Slide Details ─── */}
      <AnimatePresence>
        {openTask && (
          <TaskDetailPanel
            task={openTask}
            actor={actor}
            orgId={orgId}
            authorUsername={userProfile?.username ?? ''}
            onClose={() => setSearchParams({})}
          />
        )}
      </AnimatePresence>

      {/* ─── Modals ─── */}
      <CreateProjectModal
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        orgId={orgId}
      />
      <CreateGoalModal
        open={createGoalOpen}
        onClose={() => setCreateGoalOpen(false)}
        orgId={orgId}
      />
      {createTaskOpen && (
        <CreateTaskModal
          open={createTaskOpen}
          onClose={() => setCreateTaskOpen(false)}
          orgId={orgId}
          actor={actor}
          defaultStatus="todo"
        />
      )}
    </div>
  );
}
