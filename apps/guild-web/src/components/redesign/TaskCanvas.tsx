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
  Send
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

// Smart Tag Parsing Logic
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

export function TaskCanvas() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // View States
  const [activeTab, setActiveTab] = React.useState<'cockpit' | 'board'>('cockpit');
  const [activeScope, setActiveScope] = React.useState<'my' | 'assigned' | 'review' | 'team' | 'all'>('my');
  const [quickInput, setQuickInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterProject, setFilterProject] = React.useState('all');
  const [filterGoal, setFilterGoal] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');

  // Modals
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [createGoalOpen, setCreateGoalOpen] = React.useState(false);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);

  // Hooks
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams } = useTeams(orgId);
  const members = useOrgMembers(orgId);

  // Drawer
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');
  const openTask = React.useMemo(() => tasks.find((t) => t.id === openTaskId) ?? null, [tasks, openTaskId]);

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Unknown',
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

  // Dynamic Filtering Logic
  const filterTask = React.useCallback((t: Task) => {
    if (t.parentTaskId) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    if (filterGoal !== 'all' && t.goalId !== filterGoal) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  }, [searchQuery, filterProject, filterGoal, filterPriority, filterStatus]);

  const myFilteredTasks = React.useMemo(() => {
    const myUid = user?.uid ?? '';
    return tasks.filter((t) => t.assigneeIds.includes(myUid)).filter(filterTask);
  }, [tasks, user, filterTask]);

  const assignedFilteredTasks = React.useMemo(() => {
    const myUid = user?.uid ?? '';
    return tasks.filter((t) => t.creatorId === myUid && t.assigneeIds.some(id => id !== myUid)).filter(filterTask);
  }, [tasks, user, filterTask]);

  const reviewFilteredTasks = React.useMemo(() => {
    const myUid = user?.uid ?? '';
    return tasks.filter((t) => t.creatorId === myUid && t.status === 'review').filter(filterTask);
  }, [tasks, user, filterTask]);

  const teamFilteredTasks = React.useMemo(() => {
    return tasks.filter((t) => t.assigneeIds.some((id) => teamMemberIds.includes(id))).filter(filterTask);
  }, [tasks, teamMemberIds, filterTask]);

  const allFilteredTasks = React.useMemo(() => {
    return tasks.filter(filterTask);
  }, [tasks, filterTask]);

  const activeScopePool = React.useMemo(() => {
    switch (activeScope) {
      case 'my':
        return myFilteredTasks;
      case 'assigned':
        return assignedFilteredTasks;
      case 'review':
        return reviewFilteredTasks;
      case 'team':
        return teamFilteredTasks;
      case 'all':
      default:
        return allFilteredTasks;
    }
  }, [activeScope, myFilteredTasks, assignedFilteredTasks, reviewFilteredTasks, teamFilteredTasks, allFilteredTasks]);

  const filteredTasks = activeScopePool;

  const spotlightTask = React.useMemo(() => {
    return activeScopePool.find((t) => t.status !== 'done');
  }, [activeScopePool]);

  const reviewTasks = reviewFilteredTasks;

  const teammatesTasks = React.useMemo(() => {
    return teamFilteredTasks.filter(t => t.status !== 'done');
  }, [teamFilteredTasks]);

  const parsedPreview = React.useMemo(() => {
    if (!quickInput.trim()) return null;
    return parseQuickInput(quickInput, projects, members);
  }, [quickInput, projects, members]);

  const handleQuickCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || !orgId) return;
    setIsSubmitting(true);
    try {
      const parsed = parseQuickInput(quickInput, projects, members);
      if (!parsed.title) return;
      await createTask({
        orgId,
        title: parsed.title,
        priority: parsed.priority,
        projectId: parsed.projectId,
        assigneeIds: parsed.assigneeIds,
        dueDate: parsed.dueDate,
        actor,
      });
      setQuickInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubtaskStats = React.useCallback((taskId: string) => {
    const childs = tasks.filter((t) => t.parentTaskId === taskId);
    if (childs.length === 0) return null;
    const done = childs.filter((t) => t.status === 'done').length;
    return { completed: done, total: childs.length };
  }, [tasks]);

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 0, task.status, actor);
    } catch (err) {
      console.error(err);
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
        body: 'Approved! Task is marked as Done.',
        mentions: [],
        notifyIds: task.assigneeIds.filter((id) => id !== actor.uid),
        taskTitle: task.title,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestChanges = async (task: Task, commentText: string = 'Changes requested.') => {
    if (!orgId) return;
    try {
      await addComment({
        taskId: task.id,
        orgId,
        authorId: actor.uid,
        authorName: actor.name,
        authorUsername: userProfile?.username || actor.name,
        body: `Re-opened: ${commentText}`,
        mentions: [],
        notifyIds: task.assigneeIds.filter((id) => id !== actor.uid),
        taskTitle: task.title,
      });
      await moveTask(task.id, orgId, 'todo', task.orderIndex || 0, task.status, actor);
    } catch (err) {
      console.error(err);
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
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stats = React.useMemo(() => {
    const active = tasks.filter((t) => !t.parentTaskId);
    const completed = active.filter((t) => t.status === 'done').length;
    const rate = active.length > 0 ? Math.round((completed / active.length) * 100) : 0;
    return { total: active.length, completed, rate };
  }, [tasks]);

  const counts = React.useMemo(() => {
    const myUid = user?.uid ?? '';
    const my = tasks.filter((t) => !t.parentTaskId && t.assigneeIds.includes(myUid)).length;
    const assigned = tasks.filter((t) => !t.parentTaskId && t.creatorId === myUid && t.assigneeIds.some(id => id !== myUid)).length;
    const review = tasks.filter((t) => !t.parentTaskId && t.creatorId === myUid && t.status === 'review').length;
    const team = tasks.filter((t) => !t.parentTaskId && t.assigneeIds.some((id) => teamMemberIds.includes(id))).length;
    const all = tasks.filter((t) => !t.parentTaskId).length;
    return { my, assigned, review, team, all };
  }, [tasks, user, teamMemberIds]);

  const hasActiveFilters = searchQuery || filterProject !== 'all' || filterGoal !== 'all' || filterPriority !== 'all' || filterStatus !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterProject('all');
    setFilterGoal('all');
    setFilterPriority('all');
    setFilterStatus('all');
  };

  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference - (stats.rate / 100) * circumference;

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto aether-scroll select-none pr-4 md:pr-6 pb-12">
      
      {/* 1. Scrolling Header Console */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-foreground/15 dark:border-white/10 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-all group font-black uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <h1 className="text-3xl font-black text-foreground">
            Workspace
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher Deck */}
          <div className="aether-glass p-0.5 flex gap-1 border border-foreground/[0.14] dark:border-white/12 shadow-inner" style={{ borderRadius: '12px' }}>
            {[
              { id: 'cockpit', label: 'Dashboard', icon: Activity },
              { id: 'board', label: 'Task Board', icon: Kanban },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all relative cursor-pointer',
                    activeTab === tab.id
                      ? 'text-white shadow-md'
                      : 'text-foreground/75 hover:text-foreground'
                  )}
                  style={activeTab === tab.id ? { background: 'var(--accent)' } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Add Triggers */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="aether-glass px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer bg-foreground/[0.01]"
              style={{ borderRadius: '12px', color: 'var(--accent)', borderColor: 'oklch(from var(--accent) l c h / 30%)' }}
            >
              Project
            </button>
            <button
              onClick={() => setCreateGoalOpen(true)}
              className="aether-glass px-4 py-2 text-[10px] font-black uppercase tracking-widest text-violet-400 border border-violet-500/20 hover:bg-violet-500/5 cursor-pointer bg-foreground/[0.01]"
              style={{ borderRadius: '12px' }}
            >
              Goal
            </button>
            <button
              onClick={() => setCreateTaskOpen(true)}
              className="px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 14px oklch(from var(--accent) l c h / 30%)' }}
            >
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* 2. Progress HUD Console */}
      <div className="aether-glass p-4 border border-foreground/[0.14] dark:border-white/12 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-5 shadow-sm mb-6">
        
        {/* Progress gauge */}
        <div className="flex items-center gap-3.5 shrink-0 w-full lg:w-auto border-b lg:border-b-0 lg:border-r border-foreground/[0.14] dark:border-white/12 pb-3 lg:pb-0 lg:pr-5">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                className="stroke-foreground/5"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="var(--accent)"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="125.6"
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 4px var(--accent))'
                }}
              />
            </svg>
            <span className="absolute text-[10px] font-black text-foreground">{stats.rate}%</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block">Workspace Progress</span>
            <h2 className="text-base font-black text-foreground leading-none">{stats.completed} Done</h2>
            <span className="text-[8px] font-black text-muted-foreground/75 block uppercase tracking-wider">
              {stats.total} Active Tasks
            </span>
          </div>
        </div>

        {/* NLP input */}
        <div className="flex-1 w-full relative">
          <form onSubmit={handleQuickCaptureSubmit} className="flex items-center gap-3">
            <div className="p-2 rounded-xl text-primary shrink-0" style={{ color: 'var(--accent)', borderColor: 'oklch(from var(--accent) l c h / 20%)', background: 'oklch(from var(--accent) l c h / 8%)' }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Add a task instantly... (Use #project @assignee !priority /due)"
              disabled={isSubmitting}
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-xs font-bold text-foreground placeholder:text-muted-foreground/60 py-1"
            />
            <button
              type="submit"
              disabled={isSubmitting || !quickInput.trim()}
              className="px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
              style={{ background: 'var(--accent)' }}
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
            </button>
          </form>

          {/* Tag preview */}
          <AnimatePresence>
            {parsedPreview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 mt-2 border-t border-foreground/[0.14] dark:border-white/12 flex flex-wrap gap-2 items-center text-[9px] font-black">
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest mr-1">Preview:</span>
                  {parsedPreview.title && (
                    <span className="px-2 py-0.5 rounded-lg bg-foreground/5 text-foreground border border-foreground/[0.14] dark:border-white/12">
                      "{parsedPreview.title}"
                    </span>
                  )}
                  {parsedPreview.projectId && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-primary border border-primary/20" style={{ color: 'var(--accent)', borderColor: 'oklch(from var(--accent) l c h / 20%)', background: 'oklch(from var(--accent) l c h / 8%)' }}>
                      <FolderKanban className="w-3 h-3" />
                      #{projects.find((p) => p.id === parsedPreview.projectId)?.name}
                    </span>
                  )}
                  {parsedPreview.assigneeIds.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                      <Users className="w-3 h-3" />
                      @{memberMap[parsedPreview.assigneeIds[0]]}
                    </span>
                  )}
                  {parsedPreview.priority !== 'none' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">
                      <Flag className="w-3 h-3" />
                      {parsedPreview.priority}
                    </span>
                  )}
                  {parsedPreview.dueDate && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/15">
                      <Calendar className="w-3 h-3" />
                      {parsedPreview.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Switcher Deck */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-row lg:flex-wrap [&>*]:lg:flex-1 gap-3 mb-6 select-none">
        {[
          { id: 'my', label: 'My Tasks', icon: UserCheck, count: counts.my },
          { id: 'assigned', label: 'Assigned By Me', icon: Send, count: counts.assigned },
          { id: 'review', label: 'Needs Review', icon: Clock, count: counts.review },
          ...(isManager ? [{ id: 'team', label: 'Teammates', icon: Users, count: counts.team }] : []),
          { id: 'all', label: 'Workspace Pool', icon: FolderKanban, count: counts.all },
        ].map((scope) => {
          const Icon = scope.icon;
          const isActive = activeScope === scope.id;
          return (
            <button
              key={scope.id}
              onClick={() => setActiveScope(scope.id as any)}
              className={cn(
                "aether-glass p-3 border rounded-xl flex items-center justify-between gap-3 text-left transition-all hover:bg-foreground/[0.03] cursor-pointer",
                isActive ? "bg-foreground/[0.01]" : "border-foreground/[0.14] dark:border-white/12"
              )}
              style={
                isActive
                  ? {
                      borderColor: 'var(--accent)',
                      boxShadow: '0 0 12px oklch(from var(--accent) l c h / 10%)',
                    }
                  : {}
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 animate-fade-in"
                  style={{
                    background: isActive
                      ? 'oklch(from var(--accent) l c h / 15%)'
                      : 'var(--bg-primary)',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted-foreground)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-black truncate transition-colors",
                    isActive ? "font-extrabold" : "text-foreground/80"
                  )}
                  style={isActive ? { color: 'var(--accent)' } : {}}
                >
                  {scope.label}
                </span>
              </div>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md font-mono text-[10px] font-black tracking-wider shrink-0 transition-colors",
                  isActive ? "text-white" : "bg-foreground/5 text-foreground/60"
                )}
                style={isActive ? { background: 'var(--accent)' } : {}}
              >
                {scope.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Filters Deck */}
      <div className="aether-glass p-3 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground/60 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search checklist..."
            className="w-full bg-white/5 border border-foreground/[0.14] dark:border-white/12 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 transition-all"
          />
        </div>

        <div className="relative">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="appearance-none bg-white/5 border border-foreground/[0.14] dark:border-white/12 rounded-xl pl-3 pr-8 py-2 text-xs font-black text-foreground outline-none cursor-pointer hover:bg-white/10 transition-colors"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-3 top-3.5 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="appearance-none bg-white/5 border border-foreground/[0.14] dark:border-white/12 rounded-xl pl-3 pr-8 py-2 text-xs font-black text-foreground outline-none cursor-pointer hover:bg-white/10 transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="none">None</option>
          </select>
          <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-3 top-3.5 pointer-events-none" />
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors bg-white/5 border border-foreground/[0.14] dark:border-white/12 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 5. Master Workspace Viewport */}
      {tasksLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary" style={{ color: 'var(--accent)' }} />
          <span className="text-xs text-muted-foreground font-black uppercase tracking-wider">Loading tasks...</span>
        </div>
      ) : (
        <div className="w-full">
          
          {/* A. Command Dashboard Spatial 3-Deck Grid */}
          {activeTab === 'cockpit' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* DECK 1: My Tasks (Left Column) */}
              <div className="lg:col-span-5 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                  <UserCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>My Tasks</span>
                </div>

                {/* Focus spotlight card */}
                {spotlightTask ? (
                  <div 
                    onClick={() => setSearchParams({ task: spotlightTask.id })}
                    className="relative p-4 border-2 rounded-2xl bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-all flex flex-col justify-between min-h-[130px] shadow-sm cursor-pointer group"
                    style={{ 
                      borderColor: 'var(--accent)', 
                      boxShadow: '0 0 15px oklch(from var(--accent) l c h / 12%)'
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          Current Focus
                        </span>
                        {spotlightTask.priority !== 'none' && (
                          <span className="text-[9px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                            <Flag className="w-3 h-3 fill-current" />
                            {spotlightTask.priority}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black transition-colors" style={{ color: 'var(--accent)' }}>
                        {spotlightTask.title}
                      </h3>
                    </div>

                    <div className="flex justify-between items-center gap-3 pt-3 border-t border-foreground/[0.14] dark:border-white/12 mt-4" onClick={e => e.stopPropagation()}>
                      {projects.find(p => p.id === spotlightTask.projectId) ? (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider" style={{ color: 'var(--accent)', borderColor: 'oklch(from var(--accent) l c h / 20%)' }}>
                          #{projects.find(p => p.id === spotlightTask.projectId)?.name.slice(0, 15)}
                        </span>
                      ) : <span />}

                      <button
                        onClick={() => handleToggleComplete(spotlightTask)}
                        className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                        style={{ background: 'var(--accent)', boxShadow: '0 2px 6px oklch(from var(--accent) l c h / 20%)' }}
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-foreground/[0.14] dark:border-white/12 rounded-2xl bg-foreground/[0.01]">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                    <span className="text-xs font-black uppercase tracking-widest text-foreground block">Vector Clear</span>
                    <span className="text-[9px] text-muted-foreground/60 block mt-1 uppercase">All personal assignments checked</span>
                  </div>
                )}

                {/* Spaced lists of filtered personal workload */}
                <div className="space-y-2.5">
                  {filteredTasks.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground/35 italic block py-4 text-center">No other matching tasks</span>
                  ) : (
                    filteredTasks.slice(0, 8).map((task) => {
                      const proj = projects.find(p => p.id === task.projectId);
                      
                      const priorityColors: Record<string, string> = {
                        urgent: 'border-l-[4px] border-l-red-500/90 shadow-sm shadow-red-500/5',
                        high: 'border-l-[4px] border-l-orange-500/90 shadow-sm shadow-orange-500/5',
                        medium: 'border-l-[4px] border-l-amber-500/90 shadow-sm shadow-amber-500/5',
                        low: 'border-l-[4px] border-l-indigo-500/90 shadow-sm shadow-indigo-500/5',
                      };
                      const priorityClass = priorityColors[task.priority] || 'border-l-[4px] border-l-foreground/[0.14] dark:border-l-white/12';

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSearchParams({ task: task.id })}
                          className={cn(
                            "group px-4 py-3.5 flex items-center justify-between gap-4 rounded-xl border border-foreground/[0.14] dark:border-white/12 hover:border-[oklch(from_var(--accent)_l_c_h_/_30%)] bg-foreground/[0.01] hover:bg-foreground/[0.03] transition-all cursor-pointer shadow-sm relative overflow-hidden",
                            priorityClass
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplete(task);
                              }}
                              className="w-4 h-4 rounded-full border border-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all shrink-0 cursor-pointer"
                            >
                              {task.status === 'done' ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Circle className="w-3 h-3 text-transparent hover:text-muted-foreground" />
                              )}
                            </button>
                            <span className={cn("text-xs font-bold text-foreground truncate", task.status === 'done' && 'line-through text-muted-foreground/60')}>
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                            {proj && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider" style={{ color: 'var(--accent)', borderColor: 'oklch(from var(--accent) l c h / 20%)', background: 'oklch(from var(--accent) l c h / 5%)' }}>
                                #{proj.name.slice(0, 8)}
                              </span>
                            )}
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-muted-foreground/30 hover:text-red-400 p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* DECK 2: Team Tasks & Approvals (Center Column) */}
              <div className="lg:col-span-4 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Team Tasks</span>
                </div>

                {/* Manager approvals queue */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black tracking-wider text-muted-foreground/60 uppercase block px-1">Approvals Queue</span>
                  {reviewTasks.length === 0 ? (
                    <div className="p-5 text-center border border-dashed border-foreground/[0.14] dark:border-white/12 rounded-2xl bg-foreground/[0.01]">
                      <span className="text-[10px] font-bold text-muted-foreground/60 block uppercase tracking-wider">Approvals</span>
                      <span className="text-[8px] text-muted-foreground/45 block uppercase">No pending tasks to approve</span>
                    </div>
                  ) : (
                    reviewTasks.map((task) => {
                      const proj = projects.find(p => p.id === task.projectId);
                      return (
                        <div 
                          key={task.id}
                          onClick={() => setSearchParams({ task: task.id })}
                          className="p-4 border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/[0.02] hover:bg-amber-500/[0.05] rounded-xl flex flex-col gap-3 transition-all cursor-pointer shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-extrabold text-foreground leading-normal line-clamp-2">
                              {task.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-400 uppercase tracking-widest">
                              Review
                            </span>
                          </div>

                          <div className="flex justify-between items-center gap-3 border-t border-foreground/10 pt-2" onClick={e => e.stopPropagation()}>
                            {proj ? (
                              <span className="text-[8px] font-bold text-amber-450 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-500/10">
                                #{proj.name.slice(0, 10)}
                              </span>
                            ) : <span />}

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleApproveTask(task)}
                                className="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white rounded hover:scale-105 active:scale-95 transition-all cursor-pointer shadow"
                                style={{ background: 'var(--accent)' }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  const reason = window.prompt('Enter reason for requesting changes (optional):');
                                  if (reason !== null) {
                                    await handleRequestChanges(task, reason || undefined);
                                  }
                                }}
                                className="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest border border-red-500/30 hover:border-red-500 bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-white rounded transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Squad active list */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black tracking-wider text-muted-foreground/60 uppercase block px-1">Teammates' Tasks</span>
                  {teammatesTasks.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground/35 italic block py-4 text-center">No active team tasks</span>
                  ) : (
                    teammatesTasks.slice(0, 6).map((task) => {
                      const proj = projects.find(p => p.id === task.projectId);
                      const initials = task.assigneeIds.length > 0 ? memberMap[task.assigneeIds[0]]?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : null;

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSearchParams({ task: task.id })}
                          className="px-4 py-3.5 flex items-center justify-between gap-4 rounded-xl border border-foreground/[0.14] dark:border-white/12 hover:border-foreground/30 bg-foreground/[0.01] hover:bg-foreground/[0.03] transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {initials && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 flex items-center justify-center shrink-0">
                                {initials}
                              </div>
                            )}
                            <span className="text-xs font-bold text-foreground truncate">
                              {task.title}
                            </span>
                          </div>
                          
                          {proj && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0" style={{ color: 'var(--accent)', borderColor: 'oklch(from var(--accent) l c h / 20%)', background: 'oklch(from var(--accent) l c h / 5%)' }}>
                              #{proj.name.slice(0, 6)}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* DECK 3: Goals & Projects (Right Column) */}
              <div className="lg:col-span-3 space-y-5 flex flex-col">
                <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                  <Target className="w-3.5 h-3.5 text-violet-400" />
                  <span>Strategic Goals</span>
                </div>

                {/* Goals */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black tracking-wider text-muted-foreground/60 uppercase block px-1">Active Goals</span>
                  {goalsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground mx-auto" />
                  ) : goals.filter(g => g.status === 'active').length === 0 ? (
                    <span className="text-[10px] text-muted-foreground/35 italic block py-4 text-center">No active goals</span>
                  ) : (
                    goals.filter(g => g.status === 'active').slice(0, 3).map(goal => (
                      <div
                        key={goal.id}
                        onClick={() => navigate(`/goals/${goal.id}`)}
                        className="p-3.5 bg-foreground/[0.01] hover:bg-foreground/[0.03] cursor-pointer hover:scale-[1.02] transition-all border border-foreground/[0.14] dark:border-white/12 hover:border-violet-500/40 rounded-xl group"
                      >
                        <span className="text-xs font-black text-foreground group-hover:text-violet-400 transition-colors block truncate">{goal.title}</span>
                        <span className="text-[9px] text-muted-foreground/70 block truncate mt-1 uppercase tracking-wide">
                          {goal.description || 'Sprint target'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Projects */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black tracking-wider text-muted-foreground/60 uppercase block px-1">Active Projects</span>
                  {projectsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/50 mx-auto" />
                  ) : projects.filter(p => p.status === 'active').length === 0 ? (
                    <span className="text-[10px] text-muted-foreground/35 italic block py-4 text-center">No active projects</span>
                  ) : (
                    projects.filter(p => p.status === 'active').slice(0, 3).map(proj => (
                      <div
                        key={proj.id}
                        onClick={() => navigate(`/projects/${proj.id}`)}
                        className="p-3.5 bg-foreground/[0.01] hover:bg-foreground/[0.03] cursor-pointer hover:scale-[1.02] transition-all border border-foreground/[0.14] dark:border-white/12 hover:border-[oklch(from_var(--accent)_l_c_h_/_30%)] rounded-xl group"
                      >
                        <span className="text-xs font-black text-foreground group-hover:text-[var(--accent)] transition-colors block truncate">{proj.name}</span>
                        <span className="text-[9px] text-muted-foreground/70 block truncate mt-1 uppercase tracking-wide">
                          {proj.description || 'Active project'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* B. Frosted Kanban Board View */}
          {activeTab === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pb-10">
              {STATUSES.map((status) => {
                const colTasks = filteredTasks.filter((t) => t.status === status);
                const cfg = STATUS_CONFIG[status];

                return (
                  <div key={status} className="backdrop-blur-md bg-white/[0.01] dark:bg-black/[0.05] flex flex-col max-h-[600px] border border-foreground/[0.14] dark:border-white/12 rounded-2xl shadow-sm">
                    <div className="px-4 py-3 border-b border-foreground/[0.14] dark:border-white/12 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{cfg.label}</span>
                      </div>
                      <span className="px-2 py-0.2 rounded bg-white/5 font-mono text-[9px] text-muted-foreground">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 p-3 space-y-3 overflow-y-auto aether-scroll min-h-[250px]">
                      {colTasks.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground/30 italic text-center block py-8">No tasks here</span>
                      ) : (
                        colTasks.map((task) => {
                          const proj = projects.find(p => p.id === task.projectId);
                          const initials = task.assigneeIds.length > 0 ? memberMap[task.assigneeIds[0]]?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : null;
                          const canApprove = task.status === 'review' && task.creatorId === actor.uid;
                          const subtaskStats = getSubtaskStats(task.id);
                          
                          const priorityColors: Record<string, string> = {
                            urgent: 'border-l-4 border-l-red-500/75',
                            high: 'border-l-4 border-l-orange-500/75',
                            medium: 'border-l-4 border-l-amber-500/75',
                            low: 'border-l-4 border-l-indigo-500/75',
                          };
                          const priorityClass = priorityColors[task.priority] || 'border border-foreground/[0.14] dark:border-white/12';
                          
                          return (
                            <div
                              key={task.id}
                              onClick={() => setSearchParams({ task: task.id })}
                              className={cn(
                                "task-glass-card aether-glass bg-foreground/[0.01] dark:bg-black/10 border border-foreground/[0.14] dark:border-white/12 hover:border-[oklch(from_var(--accent)_l_c_h_/_30%)] p-4 space-y-3 cursor-pointer hover:scale-[1.02] transition-all rounded-xl shadow-sm hover:shadow-md hover:shadow-primary/2", 
                                priorityClass
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-xs font-bold text-foreground leading-normal line-clamp-2">
                                  {task.title}
                                </span>
                                
                                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                  <button 
                                    onClick={() => cycleStatus(task, 'forward')}
                                    className="text-muted-foreground/45 hover:text-foreground text-[10px] p-0.5 cursor-pointer hover:bg-white/5 rounded transition-all"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {subtaskStats && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] text-muted-foreground font-bold">
                                    <span>Subtasks</span>
                                    <span>{subtaskStats.completed}/{subtaskStats.total}</span>
                                  </div>
                                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all duration-300" 
                                      style={{ 
                                        width: `${(subtaskStats.completed / subtaskStats.total) * 100}%`,
                                        background: 'var(--accent)'
                                      }} 
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-between items-center gap-2 pt-1 border-t border-foreground/10 shrink-0">
                                {proj ? (
                                  <span 
                                    className="text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider"
                                    style={{
                                      color: 'var(--accent)',
                                      borderColor: 'oklch(from var(--accent) l c h / 20%)',
                                      background: 'oklch(from var(--accent) l c h / 8%)'
                                    }}
                                  >
                                    #{proj.name.slice(0, 10)}
                                  </span>
                                ) : (
                                  <span />
                                )}

                                {initials && (
                                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 flex items-center justify-center">
                                    {initials}
                                  </div>
                                )}
                              </div>

                              {canApprove && (
                                <div className="pt-2 border-t border-foreground/10 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleApproveTask(task)}
                                    className="px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white rounded border transition-all cursor-pointer"
                                    style={{
                                      background: 'var(--accent)',
                                      borderColor: 'oklch(from var(--accent) l c h / 45%)',
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const reason = window.prompt('Enter reason for requesting changes (optional):');
                                      if (reason !== null) {
                                        await handleRequestChanges(task, reason || undefined);
                                      }
                                    }}
                                    className="px-2 py-1 text-[8px] font-black uppercase tracking-widest border border-red-500/30 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white rounded transition-all cursor-pointer"
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
            </div>
          )}

        </div>
      )}

      {/* Task Details Side drawer slider */}
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

      {/* Modals */}
      <CreateProjectModal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} orgId={orgId} />
      <CreateGoalModal open={createGoalOpen} onClose={() => setCreateGoalOpen(false)} orgId={orgId} />
      {createTaskOpen && (
        <CreateTaskModal open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} orgId={orgId} actor={actor} defaultStatus="todo" />
      )}
    </div>
  );
}
