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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';
import { useTeams } from '../../hooks/useTeams';

import { CreateProjectModal } from '../projects/CreateProjectModal';
import { CreateGoalModal } from '../goals/CreateGoalModal';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';

import {
  createTask,
  moveTask,
  updatePriority,
  deleteTask,
  STATUS_CONFIG,
  STATUSES,
  PRIORITY_CONFIG,
  addComment,
} from '../../lib/tasks';
import type { Task, TaskStatus, TaskPriority, ActorInfo } from '../../lib/tasks';
import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';

// ─── Regex Smart Tag Parser ──────────────────────────────────────────────────
function parseQuickInput(text: string, projects: Project[], members: any[]) {
  let cleanedText = text;
  let projectId: string | null = null;
  let assigneeId: string | null = null;
  let priority: TaskPriority = 'none';
  let dueDate: Date | null = null;

  // 1. Priority tag: !high, !urgent, !medium, !low
  const priorityMatch = cleanedText.match(/!(\w+)/);
  if (priorityMatch) {
    const val = priorityMatch[1].toLowerCase();
    if (['low', 'medium', 'high', 'urgent'].includes(val)) {
      priority = val as TaskPriority;
    }
    cleanedText = cleanedText.replace(/!(\w+)/g, '');
  }

  // 2. Date tag: /today, /tomorrow, /monday, /week
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

  // 3. Project tag: #project-name
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

  // 4. Assignee tag: @member-name
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

// ─── Main Component ──────────────────────────────────────────────────────────
export function WorkspacePage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // ─── States ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<'list' | 'board'>('list');
  const [activeScope, setActiveScope] = React.useState<'my' | 'assigned' | 'review' | 'team' | 'all'>('my');
  const [quickInput, setQuickInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filters for both views
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterProject, setFilterProject] = React.useState('all');
  const [filterGoal, setFilterGoal] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all');

  // Modal open triggers
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);
  const [createGoalOpen, setCreateGoalOpen] = React.useState(false);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);

  // Data fetching hooks
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams } = useTeams(orgId);
  const members = useOrgMembers(orgId);

  // Sidebar detail panel
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
    const directReportIds = members
      .filter((m) => m.managerId === user.uid)
      .map((m) => m.uid);

    const managedTeamMemberIds = teams
      .filter((t) => t.managerId === user.uid)
      .flatMap((t) => t.memberIds);

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

  // Global Scoped Tasks
  const scopedTasks = React.useMemo(() => {
    const myUid = user?.uid ?? '';
    switch (activeScope) {
      case 'my':
        return tasks.filter((t) => t.assigneeIds.includes(myUid));
      case 'assigned':
        return tasks.filter((t) => t.creatorId === myUid && t.assigneeIds.some(id => id !== myUid));
      case 'review':
        return tasks.filter((t) => t.creatorId === myUid && t.status === 'review');
      case 'team':
        return tasks.filter((t) => t.assigneeIds.some((id) => teamMemberIds.includes(id)));
      case 'all':
      default:
        return tasks;
    }
  }, [tasks, activeScope, user, teamMemberIds]);

  // Live filter results
  const filteredTasks = React.useMemo(() => {
    return scopedTasks.filter((t) => {
      if (t.parentTaskId) return false; // Only show root tasks in main views
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterProject !== 'all' && t.projectId !== filterProject) return false;
      if (filterGoal !== 'all' && t.goalId !== filterGoal) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      return true;
    });
  }, [scopedTasks, searchQuery, filterProject, filterGoal, filterPriority, filterStatus]);

  // Tag parsing preview as the user types
  const parsedPreview = React.useMemo(() => {
    if (!quickInput.trim()) return null;
    return parseQuickInput(quickInput, projects, members);
  }, [quickInput, projects, members]);

  // Handle Quick Capture input submit
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
      console.error('Failed to create quick task', err);
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

  // Move task to a new status
  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (!orgId) return;
    try {
      await moveTask(task.id, orgId, newStatus, task.orderIndex || 0, task.status, actor);
    } catch (err) {
      console.error('Failed to move task', err);
    }
  };

  // Toggle complete (todo <-> done/review)
  const handleToggleComplete = async (task: Task) => {
    let targetStatus: TaskStatus;
    if (task.status === 'done' || task.status === 'review') {
      targetStatus = 'todo';
    } else {
      targetStatus = task.creatorId !== actor.uid ? 'review' : 'done';
    }
    await handleStatusChange(task, targetStatus);
  };

  // Inline approval flow
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
      console.error('Failed to approve task', err);
    }
  };

  // Inline revision request flow
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
      console.error('Failed to request changes', err);
    }
  };

  // Status cycling for easy Kanban clicks
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

  // Inline delete task
  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error('Failed to delete task', err);
      }
    }
  };

  // Overall statistics for metrics
  const stats = React.useMemo(() => {
    const active = scopedTasks.filter((t) => !t.parentTaskId);
    const completed = active.filter((t) => t.status === 'done').length;
    const rate = active.length > 0 ? Math.round((completed / active.length) * 100) : 0;
    return { total: active.length, completed, rate };
  }, [scopedTasks]);

  const hasActiveFilters = searchQuery || filterProject !== 'all' || filterGoal !== 'all' || filterPriority !== 'all' || filterStatus !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterProject('all');
    setFilterGoal('all');
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
    <div className="flex h-full overflow-hidden bg-background text-foreground">
      {/* ─── Main Viewport ─── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        
        {/* ─── Ultra-Minimalist Top Header ─── */}
        <div className="flex-shrink-0 border-b border-border dark:border-border-strong/80 bg-background/75 dark:bg-background/50 backdrop-blur px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Elegant Back to Dashboard CTA */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all group font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Dashboard</span>
            </button>
            <span className="text-border/60">|</span>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight">Workspace</h1>
              <span className="px-1.5 py-0.5 rounded bg-accent/20 border border-border/10 text-[9px] font-bold text-muted-foreground uppercase">
                Cockpit
              </span>
            </div>
          </div>

          {/* Simple Mode Toggle */}
          <div className="flex bg-accent/20 p-0.5 rounded-lg border border-border/10 shadow-inner">
            {[
              { id: 'list', label: 'List', icon: ListTodo },
              { id: 'board', label: 'Board', icon: Kanban },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-tight transition-all relative',
                    activeTab === tab.id
                      ? 'bg-surface text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Clean Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateProjectOpen(true)}
              className="h-7 text-[10px] font-semibold border-primary/20 hover:bg-primary/5 text-primary rounded-md"
            >
              <FolderKanban className="h-3 w-3 mr-1" />
              Project
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateGoalOpen(true)}
              className="h-7 text-[10px] font-semibold border-violet-500/20 hover:bg-violet-500/5 text-violet-400 rounded-md"
            >
              <Target className="h-3 w-3 mr-1" />
              Goal
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateTaskOpen(true)}
              className="h-7 text-[10px] font-semibold bg-primary hover:bg-primary/95 text-primary-foreground rounded-md shadow-sm"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Task
            </Button>
          </div>
        </div>

        {/* ─── Main Content Area with Split Sidebar ─── */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* Main Workspace Frame */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 flex flex-col">
            
            {/* Minimalist Command capture bar */}
            <div className="rounded-xl border border-border dark:border-border-strong/80 bg-surface/80 dark:bg-surface/50 backdrop-blur p-3.5 shadow-sm relative group">
              <form onSubmit={handleQuickCaptureSubmit} className="relative flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/40 border border-border/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    placeholder="Capture new task... (Use #project @assignee !priority /due)"
                    disabled={isSubmitting}
                    className="w-full bg-transparent border-none outline-none focus:ring-0 text-xs text-foreground placeholder:text-muted-foreground/60 font-medium py-1"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !quickInput.trim()}
                  className="h-7 px-3 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-all"
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Capture'}
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
                    <div className="pt-2.5 mt-2.5 border-t border-border/60 dark:border-border-strong/50 flex flex-wrap gap-1.5 items-center text-[10px]">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Parsed:</span>
                      {parsedPreview.title && (
                        <span className="px-1.5 py-0.5 rounded bg-accent/30 text-foreground font-semibold">
                          "{parsedPreview.title}"
                        </span>
                      )}
                      {parsedPreview.projectId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold border border-primary/15">
                          <FolderKanban className="h-2.5 w-2.5" />
                          {projects.find((p) => p.id === parsedPreview.projectId)?.name}
                        </span>
                      )}
                      {parsedPreview.assigneeIds.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/15">
                          <Users className="h-2.5 w-2.5" />
                          {memberMap[parsedPreview.assigneeIds[0]]}
                        </span>
                      )}
                      {parsedPreview.priority !== 'none' && (
                        <span className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold border',
                          parsedPreview.priority === 'urgent' && 'bg-red-500/10 text-red-400 border-red-500/15',
                          parsedPreview.priority === 'high' && 'bg-orange-500/10 text-orange-400 border-orange-500/15',
                          parsedPreview.priority === 'medium' && 'bg-amber-500/10 text-amber-400 border-amber-500/15',
                          parsedPreview.priority === 'low' && 'bg-sky-500/10 text-sky-400 border-sky-500/15'
                        )}>
                          <Flag className="h-2.5 w-2.5" />
                          {parsedPreview.priority}
                        </span>
                      )}
                      {parsedPreview.dueDate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-semibold border border-violet-500/15">
                          <Calendar className="h-2.5 w-2.5" />
                          {parsedPreview.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Inline Filter Command Center Panel */}
            <div className="rounded-xl border border-border dark:border-border-strong/80 bg-surface/70 dark:bg-surface/40 p-2.5 flex flex-wrap items-center gap-2">
              
              {/* Search box */}
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks..."
                  className="w-full bg-accent/15 border border-border/10 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              {/* Scope Dropdown */}
              <div className="relative">
                <select
                  value={activeScope}
                  onChange={(e) => setActiveScope(e.target.value as any)}
                  className="appearance-none bg-accent/15 border border-border/10 rounded-lg pl-2.5 pr-7 py-1.5 text-[11px] text-foreground font-semibold outline-none cursor-pointer hover:bg-accent/25 transition-colors"
                >
                  <option value="my">My Tasks</option>
                  <option value="assigned">Assigned Tasks</option>
                  <option value="review">Awaiting Review</option>
                  {isManager && <option value="team">Team Tasks</option>}
                  <option value="all">All Workspace</option>
                </select>
                <ChevronDown className="h-3 w-3 absolute right-2 top-2.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* Project Filter */}
              <div className="relative">
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="appearance-none bg-accent/15 border border-border/10 rounded-lg pl-2.5 pr-7 py-1.5 text-[11px] text-foreground font-semibold outline-none cursor-pointer hover:bg-accent/25 transition-colors"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="h-3 w-3 absolute right-2 top-2.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* Goal Filter */}
              <div className="relative">
                <select
                  value={filterGoal}
                  onChange={(e) => setFilterGoal(e.target.value)}
                  className="appearance-none bg-accent/15 border border-border/10 rounded-lg pl-2.5 pr-7 py-1.5 text-[11px] text-foreground font-semibold outline-none cursor-pointer hover:bg-accent/25 transition-colors"
                >
                  <option value="all">All Goals</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
                <ChevronDown className="h-3 w-3 absolute right-2 top-2.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* Priority Filter */}
              <div className="relative">
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="appearance-none bg-accent/15 border border-border/10 rounded-lg pl-2.5 pr-7 py-1.5 text-[11px] text-foreground font-semibold outline-none cursor-pointer hover:bg-accent/25 transition-colors"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="none">None</option>
                </select>
                <ChevronDown className="h-3 w-3 absolute right-2 top-2.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* Reset filters */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors bg-accent/15 border border-border/10"
                  title="Reset Filters"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Dynamic Content Views */}
            <div className="flex-1 min-h-[400px]">
              {tasksLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground font-semibold">Aligning workspace variables…</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  
                  {/* View 1: List View */}
                  {activeTab === 'list' && (
                    <motion.div
                      key="list-layout"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      {filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/80 dark:border-border-strong/60 rounded-xl bg-surface/15 dark:bg-surface/10">
                          <CheckCircle2 className="h-7 w-7 text-muted-foreground/30" />
                          <p className="text-xs font-semibold text-muted-foreground mt-2">No tasks match your filters</p>
                          {hasActiveFilters && (
                            <button
                              onClick={resetFilters}
                              className="text-[10px] text-primary font-bold mt-1.5 hover:underline"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      ) : (
                        (['in_progress', 'todo', 'review', 'done'] as TaskStatus[]).map((status) => {
                          const statusTasks = filteredTasks.filter((t) => t.status === status);
                          if (statusTasks.length === 0) return null;

                          return (
                            <div key={status} className="space-y-1.5">
                              {/* Section Title */}
                              <div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                                <span
                                  className="h-1.5 w-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: STATUS_CONFIG[status].dot }}
                                />
                                <span>{STATUS_CONFIG[status].label}</span>
                                <span className="text-[9px] px-1 py-0.5 rounded bg-accent/25 leading-none">
                                  {statusTasks.length}
                                </span>
                              </div>

                              {/* Task List Section Body */}
                              <div className="border border-border dark:border-border-strong/75 rounded-xl bg-surface/75 dark:bg-surface/50 divide-y divide-border/40 dark:divide-border-strong/55 overflow-hidden shadow-sm">
                                {status === 'done' ? (
                                  <DoneTasksLane
                                    tasks={statusTasks}
                                    onSelect={(taskId) => setSearchParams({ task: taskId })}
                                    onDelete={(taskId) => handleDeleteTask(taskId)}
                                    onToggle={(task) => handleToggleComplete(task)}
                                  />
                                ) : (
                                  statusTasks.map((task) => (
                                    <TaskRow
                                      key={task.id}
                                      task={task}
                                      projects={projects}
                                      goals={goals}
                                      memberMap={memberMap}
                                      actor={actor}
                                      onToggle={() => handleToggleComplete(task)}
                                      onSelect={() => setSearchParams({ task: task.id })}
                                      onDelete={() => handleDeleteTask(task.id)}
                                      subStats={getSubtaskStats(task.id)}
                                      onApprove={() => handleApproveTask(task)}
                                      onReject={(cmt) => handleRequestChanges(task, cmt)}
                                    />
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}

                  {/* View 2: Board View */}
                  {activeTab === 'board' && (
                    <motion.div
                      key="board-layout"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start"
                    >
                      {STATUSES.map((status) => {
                        const colTasks = filteredTasks.filter((t) => t.status === status);
                        const cfg = STATUS_CONFIG[status];

                        return (
                          <div key={status} className="rounded-xl border border-border dark:border-border-strong/75 bg-surface/75 dark:bg-surface/45 flex flex-col max-h-[700px] shadow-sm">
                            {/* Column Header */}
                            <div className="px-3.5 py-2.5 border-b border-border/60 dark:border-b-border-strong/70 flex items-center justify-between select-none">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-1.5 w-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: cfg.dot }}
                                />
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">{cfg.label}</h3>
                              </div>
                              <span className="text-[9px] font-bold text-muted-foreground bg-accent/20 rounded px-1.5 py-0.5 leading-none">
                                {colTasks.length}
                              </span>
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[300px]">
                              {colTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center select-none">
                                  <span className="text-[10px] text-muted-foreground/40 italic">Empty lane</span>
                                </div>
                              ) : status === 'done' ? (
                                <DoneTasksLane
                                  tasks={colTasks}
                                  onSelect={(taskId) => setSearchParams({ task: taskId })}
                                  onDelete={(taskId) => handleDeleteTask(taskId)}
                                  onToggle={(task) => handleToggleComplete(task)}
                                />
                              ) : (
                                colTasks.map((task) => (
                                  <KanbanCard
                                    key={task.id}
                                    task={task}
                                    projects={projects}
                                    goals={goals}
                                    memberMap={memberMap}
                                    actor={actor}
                                    onCycleForward={() => cycleStatus(task, 'forward')}
                                    onCycleBackward={() => cycleStatus(task, 'backward')}
                                    onToggle={() => handleToggleComplete(task)}
                                    onSelect={() => setSearchParams({ task: task.id })}
                                    onDelete={() => handleDeleteTask(task.id)}
                                    subStats={getSubtaskStats(task.id)}
                                    onApprove={() => handleApproveTask(task)}
                                    onReject={(cmt) => handleRequestChanges(task, cmt)}
                                  />
                                ))
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

          {/* ─── Elegant Right Split Sidebar (Desktop only) ─── */}
          <div className="hidden xl:flex flex-col w-[260px] shrink-0 border-l border-border dark:border-border-strong bg-surface/35 dark:bg-surface/15 p-5 gap-6 overflow-y-auto">
            
            {/* Core Metrics */}
            <div className="space-y-2.5 bg-accent/15 border border-border/40 dark:border-border-strong/60 rounded-xl p-3.5 shadow-sm">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Execution Status</span>
                <span className="text-foreground">{stats.rate}%</span>
              </div>
              <div className="w-full bg-accent/25 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${stats.rate}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                <span>{stats.completed} Done</span>
                <span>{stats.total} Active</span>
              </div>
            </div>

            {/* Awaiting Review */}
            {tasks.filter(t => t.creatorId === user?.uid && t.status === 'review').length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1">
                  <Clock className="h-3 w-3 animate-pulse" />
                  <span>Awaiting Review</span>
                </h3>
                <div className="space-y-2">
                  {tasks.filter(t => t.creatorId === user?.uid && t.status === 'review').slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSearchParams({ task: task.id })}
                      className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all cursor-pointer space-y-1 group"
                    >
                      <p className="text-[11px] font-semibold text-foreground truncate group-hover:text-amber-500 transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>{memberMap[task.assigneeIds[0]] || 'Unassigned'}</span>
                        <span className="font-bold text-amber-500">Review</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Goals list */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3 text-violet-400" />
                <span>Active Goals</span>
              </h3>
              <div className="space-y-2">
                {goalsLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : goals.filter(g => g.status === 'active').length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 italic">No active goals</p>
                ) : (
                  goals.filter(g => g.status === 'active').slice(0, 3).map(goal => (
                    <div
                      key={goal.id}
                      onClick={() => navigate(`/goals/${goal.id}`)}
                      className="p-2 rounded-lg bg-surface/40 dark:bg-surface/20 border border-border/40 dark:border-border-strong/50 hover:border-violet-500/20 hover:bg-violet-500/5 transition-all cursor-pointer group"
                    >
                      <p className="text-[11px] font-semibold text-foreground group-hover:text-violet-400 transition-colors truncate">
                        {goal.title}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">
                        {goal.description || 'Primary objective'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Projects list */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <FolderKanban className="h-3 w-3 text-primary" />
                <span>Active Projects</span>
              </h3>
              <div className="space-y-2">
                {projectsLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : projects.filter(p => p.status === 'active').length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 italic">No active projects</p>
                ) : (
                  projects.filter(p => p.status === 'active').slice(0, 3).map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => navigate(`/projects/${proj.id}`)}
                      className="p-2 rounded-lg bg-surface/40 dark:bg-surface/20 border border-border/40 dark:border-border-strong/50 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer group"
                    >
                      <p className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {proj.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground truncate">
                        {proj.description || 'Sprint track'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ─── Drawer: Slide out details ─── */}
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

// ─── TaskRow (High-Density List Row) ─────────────────────────────────────────
interface TaskRowProps {
  task: Task;
  projects: Project[];
  goals: Goal[];
  memberMap: Record<string, string>;
  actor: ActorInfo;
  onToggle: () => void;
  onSelect: () => void;
  onDelete: () => void;
  subStats: { completed: number; total: number } | null;
  onApprove: () => void;
  onReject: (comment: string) => void;
}

function TaskRow({
  task,
  projects,
  goals,
  memberMap,
  actor,
  onToggle,
  onSelect,
  onDelete,
  subStats,
  onApprove,
  onReject,
}: TaskRowProps) {
  const matchedProj = projects.find((p) => p.id === task.projectId);
  const matchedGoal = goals.find((g) => g.id === task.goalId);
  const due = task.dueDate?.toDate?.();

  const isReviewer = task.status === 'review' && task.creatorId === actor.uid;
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [rejectComment, setRejectComment] = React.useState('');

  const assigneeInitials = React.useMemo(() => {
    if (task.assigneeIds.length === 0) return null;
    const name = memberMap[task.assigneeIds[0]] || 'M';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [task.assigneeIds, memberMap]);

  return (
    <div className="flex flex-col bg-surface/30 dark:bg-surface/10 hover:bg-accent/5 transition-all">
      <div 
        onClick={onSelect}
        className={cn(
          "flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-xs group"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Status Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="shrink-0 text-muted-foreground hover:text-primary transition-transform active:scale-95 mt-0.5"
          >
            {task.status === 'done' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : task.status === 'review' ? (
              <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
            )}
          </button>

          {/* Priority flag */}
          {task.priority !== 'none' && (
            <span
              className={cn(
                "shrink-0",
                task.priority === 'urgent' && 'text-red-400',
                task.priority === 'high' && 'text-orange-400',
                task.priority === 'medium' && 'text-amber-400',
                task.priority === 'low' && 'text-sky-400'
              )}
            >
              <Flag className="h-3.5 w-3.5 fill-current" />
            </span>
          )}

          {/* Title and tags */}
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn(
              "font-medium text-foreground text-xs leading-normal",
              task.status === 'done' && 'line-through text-muted-foreground/60'
            )}>
              {task.title}
            </span>

            {/* Checklist count */}
            {subStats && (
              <span className="text-[9px] text-muted-foreground bg-accent/25 rounded px-1 py-0.5">
                {subStats.completed}/{subStats.total} subtasks
              </span>
            )}

            {/* Project Tag */}
            {matchedProj && (
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15 text-[9px] font-bold leading-none">
                #{matchedProj.name}
              </span>
            )}

            {/* Goal Tag */}
            {matchedGoal && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/15 text-[9px] font-bold leading-none">
                <Target className="h-2 w-2" />
                <span>{matchedGoal.title}</span>
              </span>
            )}
          </div>
        </div>

        {/* Due Date & Assignee metadata */}
        <div className="flex items-center gap-3 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
          {/* Due date */}
          {due && (
            <span className={cn(
              "text-[10px] font-semibold flex items-center gap-1 select-none",
              due < new Date() && task.status !== 'done' ? 'text-red-400 font-bold' : 'text-muted-foreground/60'
            )}>
              <Calendar className="h-3 w-3" />
              <span>{due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </span>
          )}

          {/* Assignee initials Avatar bubble */}
          {assigneeInitials ? (
            <div 
              title={memberMap[task.assigneeIds[0]]}
              className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black flex items-center justify-center select-none"
            >
              {assigneeInitials}
            </div>
          ) : (
            <div className="h-5 w-5 rounded-full border border-dashed border-border text-muted-foreground/30 flex items-center justify-center" title="Unassigned">
              <Users className="h-2.5 w-2.5" />
            </div>
          )}

          {/* Hover delete button */}
          <button
            onClick={() => onDelete()}
            className="p-1 rounded text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete Task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Row Review Expanded Drawer */}
      {isReviewer && (
        <div className="px-8 pb-3.5 pt-0.5 border-t border-border/10 bg-amber-500/[0.02]">
          <div className="max-w-md border border-amber-500/20 bg-amber-500/5 rounded-xl p-2.5 flex flex-col gap-2 mt-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase tracking-wider text-[9px]">
              <Clock className="h-3 w-3 animate-pulse" />
              <span>Awaiting Review</span>
            </div>
            
            {!isRejecting ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove()}
                  className="flex-1 py-1 px-2 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1 active:scale-[0.98]"
                >
                  <Check className="h-3 w-3" />
                  <span>Approve Task</span>
                </button>
                <button
                  onClick={() => setIsRejecting(true)}
                  className="flex-1 py-1 px-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                >
                  <X className="h-3 w-3" />
                  <span>Request Revision</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="What should be modified?..."
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="w-full bg-accent/20 border border-border/10 rounded-lg px-2.5 py-1 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-amber-500/40"
                />
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => setIsRejecting(false)}
                    className="py-1 px-2 rounded bg-accent/30 text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onReject(rejectComment || 'Changes requested.');
                      setIsRejecting(false);
                      setRejectComment('');
                    }}
                    className="py-1 px-2.5 rounded bg-amber-500 text-black font-bold hover:bg-amber-600 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KanbanCard (Compact Index Card) ─────────────────────────────────────────
interface KanbanCardProps {
  task: Task;
  projects: Project[];
  goals: Goal[];
  memberMap: Record<string, string>;
  actor: ActorInfo;
  onCycleForward: () => void;
  onCycleBackward: () => void;
  onToggle: () => void;
  onSelect: () => void;
  onDelete: () => void;
  subStats: { completed: number; total: number } | null;
  onApprove: () => void;
  onReject: (comment: string) => void;
}

function KanbanCard({
  task,
  projects,
  goals,
  memberMap,
  actor,
  onCycleForward,
  onCycleBackward,
  onToggle,
  onSelect,
  onDelete,
  subStats,
  onApprove,
  onReject,
}: KanbanCardProps) {
  const matchedProj = projects.find((p) => p.id === task.projectId);
  const matchedGoal = goals.find((g) => g.id === task.goalId);
  const due = task.dueDate?.toDate?.();

  const isReviewer = task.status === 'review' && task.creatorId === actor.uid;
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [rejectComment, setRejectComment] = React.useState('');

  const assigneeInitials = React.useMemo(() => {
    if (task.assigneeIds.length === 0) return null;
    const name = memberMap[task.assigneeIds[0]] || 'M';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [task.assigneeIds, memberMap]);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-xl border border-border dark:border-border-strong/70 bg-surface/90 dark:bg-surface/65 p-3 flex flex-col gap-2.5",
        "hover:border-primary/20 hover:shadow transition-all duration-200 cursor-pointer relative group"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Toggle Status Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-transform active:scale-95"
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : task.status === 'review' ? (
            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/35" />
          )}
        </button>

        <p className={cn(
          "font-semibold text-[11px] text-foreground group-hover:text-primary transition-colors leading-snug flex-1",
          task.status === 'done' && 'line-through text-muted-foreground/60'
        )}>
          {task.title}
        </p>
      </div>

      {/* Badges container */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {task.priority !== 'none' && (
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[8px] font-bold border leading-none flex items-center gap-0.5",
            task.priority === 'urgent' && 'bg-red-500/10 text-red-400 border-red-500/15',
            task.priority === 'high' && 'bg-orange-500/10 text-orange-400 border-orange-500/15',
            task.priority === 'medium' && 'bg-amber-500/10 text-amber-400 border-amber-500/15',
            task.priority === 'low' && 'bg-sky-500/10 text-sky-400 border-sky-500/15'
          )}>
            <Flag className="h-2.5 w-2.5 fill-current" />
            <span>{task.priority}</span>
          </span>
        )}

        {due && (
          <span className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border leading-none",
            due < new Date() && task.status !== 'done' ? "bg-red-500/10 text-red-400 border-red-500/15" : "bg-violet-500/10 text-violet-400 border-violet-500/15"
          )}>
            <Calendar className="h-2.5 w-2.5" />
            <span>{due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </span>
        )}

        {matchedProj && (
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15 text-[8px] font-bold leading-none truncate max-w-[80px]">
            #{matchedProj.name}
          </span>
        )}

        {matchedGoal && (
          <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/15 text-[8px] font-bold leading-none flex items-center gap-0.5 truncate max-w-[80px]">
            <Target className="h-2.5 w-2.5 text-violet-400 shrink-0" />
            <span>{matchedGoal.title}</span>
          </span>
        )}

        {subStats && (
          <span className="px-1.5 py-0.5 rounded bg-accent/30 text-muted-foreground border border-border/10 text-[8px] font-bold leading-none">
            {subStats.completed}/{subStats.total} sub
          </span>
        )}
      </div>

      {/* Review Section */}
      {isReviewer && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-2 flex flex-col gap-2 mt-1 text-[11px]"
        >
          <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase tracking-wider text-[8px]">
            <Clock className="h-2.5 w-2.5 animate-pulse" />
            <span>Awaiting Review</span>
          </div>
          
          {!isRejecting ? (
            <div className="flex gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                className="flex-1 py-1 px-1.5 rounded bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-0.5 active:scale-[0.98]"
              >
                <Check className="h-2.5 w-2.5" />
                <span>Approve</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRejecting(true);
                }}
                className="flex-1 py-1 px-1.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-0.5 active:scale-[0.98]"
              >
                <X className="h-2.5 w-2.5" />
                <span>Reject</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                placeholder="Reason?..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="w-full bg-accent/20 border border-border/10 rounded-lg px-2 py-0.5 text-[10px] text-foreground outline-none"
              />
              <div className="flex gap-1 justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRejecting(false);
                  }}
                  className="py-0.5 px-1.5 rounded bg-accent/30 text-muted-foreground text-[10px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(rejectComment || 'Changes requested.');
                    setIsRejecting(false);
                    setRejectComment('');
                  }}
                  className="py-0.5 px-2 rounded bg-amber-500 text-black text-[10px] font-bold hover:bg-amber-600"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kanban bottom panel */}
      <div className="flex items-center justify-between border-t border-border/40 dark:border-border-strong/50 pt-2 mt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCycleBackward();
            }}
            className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent/30 transition-colors"
            title="Move back"
          >
            <ArrowLeft className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCycleForward();
            }}
            className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent/30 transition-colors"
            title="Move forward"
          >
            <Check className="h-2.5 w-2.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {assigneeInitials ? (
            <div 
              title={memberMap[task.assigneeIds[0]]}
              className="h-4.5 w-4.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black flex items-center justify-center select-none"
            >
              {assigneeInitials}
            </div>
          ) : (
            <div className="h-4.5 w-4.5 rounded-full border border-dashed border-border text-muted-foreground/20 flex items-center justify-center">
              <Users className="h-2 w-2" />
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DoneTasksLane (Compact collapsible done items) ───────────────────────────
interface DoneTasksLaneProps {
  tasks: Task[];
  onSelect: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onToggle: (task: Task) => void;
}

function DoneTasksLane({ tasks, onSelect, onDelete, onToggle }: DoneTasksLaneProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="w-full divide-y divide-border/40 dark:divide-border-strong/50">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="w-full py-2 px-3.5 hover:bg-accent/5 transition-all text-xs font-bold text-muted-foreground flex items-center justify-between shadow-none outline-none"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{isExpanded ? 'Hide Completed Tasks' : 'Show Completed Tasks'}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-black leading-none border border-emerald-500/15">
          {tasks.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-accent/[0.02]"
          >
            <div className="divide-y divide-border/10">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onSelect(task.id)}
                  className="group flex items-center justify-between py-2.5 px-3.5 hover:bg-accent/5 transition-all cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(task);
                      }}
                      className="shrink-0 text-emerald-400 hover:text-muted-foreground/60 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <span className="font-medium text-muted-foreground/50 line-through truncate flex-1">
                      {task.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="p-1 rounded text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
