import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  FolderKanban,
  Target,
  CheckSquare,
  Calendar,
  Users,
  ChevronRight,
  Loader2,
  Circle,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Flag,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Activity,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';

import { CreateProjectModal } from '../projects/CreateProjectModal';
import { CreateGoalModal } from '../goals/CreateGoalModal';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';

import {
  createTask,
  moveTask,
  updatePriority,
  updateDueDate,
  deleteTask,
  STATUS_CONFIG,
  STATUSES,
  PRIORITY_CONFIG,
} from '../../lib/tasks';
import type { Task, TaskStatus, TaskPriority, ActorInfo } from '../../lib/tasks';
import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';

// ─── Animations ─────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

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
  const [activeTab, setActiveTab] = React.useState<'focus' | 'kanban' | 'table'>('focus');
  const [quickInput, setQuickInput] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filters for Command Control (Table)
  const [tableSearch, setTableSearch] = React.useState('');
  const [filterProject, setFilterProject] = React.useState('all');
  const [filterGoal, setFilterGoal] = React.useState('all');
  const [filterAssignee, setFilterAssignee] = React.useState('all');
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

  // Toggle complete (todo <-> done)
  const handleToggleComplete = async (task: Task) => {
    const targetStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    await handleStatusChange(task, targetStatus);
  };

  // Status cycling for easy Kanban clicks
  const cycleStatus = async (task: Task, direction: 'forward' | 'backward') => {
    const idx = STATUSES.indexOf(task.status);
    let nextIdx = direction === 'forward' ? idx + 1 : idx - 1;
    if (nextIdx >= STATUSES.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = STATUSES.length - 1;
    await handleStatusChange(task, STATUSES[nextIdx]);
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

  // Total Task Calculations
  const stats = React.useMemo(() => {
    const active = tasks.filter((t) => !t.parentTaskId);
    const completed = active.filter((t) => t.status === 'done').length;
    const rate = active.length > 0 ? Math.round((completed / active.length) * 100) : 0;
    const focusCapacity = active.filter((t) => ['high', 'urgent'].includes(t.priority) && t.status !== 'done').length;
    return { total: active.length, completed, rate, focusCapacity };
  }, [tasks]);

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        No organization context found.
      </div>
    );
  }

  // ─── Filtered Tasks lists ──────────────────────────────────────────────────
  const rootTasks = tasks.filter((t) => !t.parentTaskId);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* ─── Main Viewport ─── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        
        {/* ─── Control Header ─── */}
        <div className="flex-shrink-0 border-b border-border-default bg-surface/50 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 shadow-[0_0_15px_rgba(var(--primary),0.1)] border border-primary/20">
              <LayoutGrid className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight leading-tight">Workspace OS</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Cockpit Execution · Visual Sprint · Data Analytics</p>
            </div>
          </div>

          {/* View Tab Selector */}
          <div className="flex bg-accent/20 p-1 rounded-xl border border-border/10 w-fit self-start md:self-auto shadow-inner">
            {[
              { id: 'focus', label: '⚡ Focus Flow' },
              { id: 'kanban', label: '📋 Omni Kanban' },
              { id: 'table', label: '🔍 Command Control' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200 relative',
                  activeTab === tab.id
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action Hub */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateProjectOpen(true)}
              className="h-8 text-[11px] font-semibold border-primary/20 hover:bg-primary/5 text-primary"
            >
              <FolderKanban className="h-3.5 w-3.5 mr-1" />
              Project
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateGoalOpen(true)}
              className="h-8 text-[11px] font-semibold border-violet-500/20 hover:bg-violet-500/5 text-violet-400"
            >
              <Target className="h-3.5 w-3.5 mr-1" />
              Goal
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateTaskOpen(true)}
              className="h-8 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/10"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Task
            </Button>
          </div>
        </div>

        {/* ─── Scrollable Workspace Contents ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ─── Metric Cockpit Analytics Cards ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* KPI 1: Glowing Task circular status bar */}
            <div className="rounded-2xl border border-border-default bg-surface/50 backdrop-blur-md p-4.5 flex items-center justify-between shadow-sm relative group hover:border-primary/20 transition-all duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-primary animate-pulse" />
                  Sprint completion rate
                </span>
                <p className="text-2xl font-black text-foreground tracking-tight">{stats.completed} <span className="text-sm font-medium text-text-muted">/ {stats.total} tasks</span></p>
                <p className="text-[10px] text-text-muted font-medium">All active root tasks tracked in this cycle</p>
              </div>
              <div className="relative h-18 w-18 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90">
                  <circle cx="36" cy="36" r="30" className="stroke-accent/10" strokeWidth="6" fill="none" />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    className="stroke-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)] transition-all duration-500 ease-out"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - stats.rate / 100)}
                  />
                </svg>
                <span className="absolute text-xs font-bold text-foreground">{stats.rate}%</span>
              </div>
            </div>

            {/* KPI 2: Focus capacity overload gauge */}
            <div className="rounded-2xl border border-border-default bg-surface/50 backdrop-blur-md p-4.5 flex items-center justify-between shadow-sm relative hover:border-orange-500/20 transition-all duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-orange-400" />
                  Focus attention weight
                </span>
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {stats.focusCapacity} <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 ml-2">High Load</span>
                </p>
                <p className="text-[10px] text-text-muted font-medium">Outstanding Critical or Urgent priority tasks</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.05)]">
                <Flag className="h-5 w-5 text-orange-400" />
              </div>
            </div>

            {/* KPI 3: Active Scope breakdown */}
            <div className="rounded-2xl border border-border-default bg-surface/50 backdrop-blur-md p-4.5 flex items-center justify-between shadow-sm hover:border-violet-500/20 transition-all duration-300">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-violet-400" />
                  Scope allocations
                </span>
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {projects.filter(p=>p.status === 'active').length} <span className="text-sm font-medium text-text-muted">Projects</span> · {goals.filter(g=>g.status === 'active').length} <span className="text-sm font-medium text-text-muted">Goals</span>
                </p>
                <p className="text-[10px] text-text-muted font-medium">Multi-lane context tracks active team spaces</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.05)]">
                <ListTodo className="h-5 w-5 text-violet-400" />
              </div>
            </div>
          </div>

          {/* ─── Smart Command-Line Quick Capture ─── */}
          <div className="rounded-2xl border border-border-default bg-surface/50 backdrop-blur-md p-4 shadow-sm relative group">
            <form onSubmit={handleQuickCaptureSubmit} className="relative flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/40 border border-border/10">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Capture task... Type #project @assignee !priority /due (e.g. Build API #Backend @aryan !high /tomorrow)"
                  disabled={isSubmitting}
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground font-medium py-1.5"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !quickInput.trim()}
                className="h-8 px-4 rounded-xl text-xs font-bold bg-primary/20 text-primary border border-primary/25 hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-all shadow-sm"
              >
                {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Capture'}
              </button>
            </form>

            {/* Smart tags live preview widgets */}
            <AnimatePresence>
              {parsedPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3.5 mt-3 border-t border-border/10 flex flex-wrap gap-2 items-center text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted mr-1">Parsed Context:</span>
                    {parsedPreview.title && (
                      <span className="px-2 py-0.5 rounded-md bg-accent/30 text-foreground font-semibold border border-border/10">
                        "{parsedPreview.title}"
                      </span>
                    )}
                    {parsedPreview.projectId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                        <FolderKanban className="h-3 w-3" />
                        {projects.find((p) => p.id === parsedPreview.projectId)?.name}
                      </span>
                    )}
                    {parsedPreview.assigneeIds.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        <Users className="h-3 w-3" />
                        {memberMap[parsedPreview.assigneeIds[0]]}
                      </span>
                    )}
                    {parsedPreview.priority !== 'none' && (
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border',
                        parsedPreview.priority === 'urgent' && 'bg-red-500/10 text-red-400 border-red-500/20',
                        parsedPreview.priority === 'high' && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                        parsedPreview.priority === 'medium' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        parsedPreview.priority === 'low' && 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      )}>
                        <Flag className="h-3 w-3" />
                        {parsedPreview.priority}
                      </span>
                    )}
                    {parsedPreview.dueDate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-bold border border-violet-500/20">
                        <Calendar className="h-3 w-3" />
                        {parsedPreview.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Dynamic Views Panel ─── */}
          <div className="min-h-[500px]">
            {tasksLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-semibold">Aligning workspace variables…</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                
                {/* VIEW 1: Focus Flow (Execution Buckets) */}
                {activeTab === 'focus' && (
                  <motion.div
                    key="focus-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                  >
                    {/* Focus Bucket A: Critical Focus (High/Urgent Priority) */}
                    <div className="rounded-2xl border border-red-500/20 bg-red-950/5 shadow-lg flex flex-col h-fit">
                      <div className="px-5 py-4 border-b border-red-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                          <h2 className="text-xs font-bold uppercase tracking-wider text-red-400">⚡ Critical Focus</h2>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          {rootTasks.filter((t) => ['high', 'urgent'].includes(t.priority) && t.status !== 'done').length}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        {rootTasks.filter((t) => ['high', 'urgent'].includes(t.priority) && t.status !== 'done').length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-8">No critical focus tasks! Keep up the execution.</p>
                        ) : (
                          rootTasks.filter((t) => ['high', 'urgent'].includes(t.priority) && t.status !== 'done').map((task) => (
                            <FocusTaskCard
                              key={task.id}
                              task={task}
                              projects={projects}
                              goals={goals}
                              memberMap={memberMap}
                              onToggle={() => handleToggleComplete(task)}
                              onSelect={() => setSearchParams({ task: task.id })}
                              subStats={getSubtaskStats(task.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Focus Bucket B: Scheduled Actions (Due dates) */}
                    <div className="rounded-2xl border border-violet-500/20 bg-violet-950/5 shadow-lg flex flex-col h-fit">
                      <div className="px-5 py-4 border-b border-violet-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-violet-400" />
                          <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400">📅 Scheduled Actions</h2>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          {rootTasks.filter((t) => t.dueDate && t.status !== 'done' && !['high', 'urgent'].includes(t.priority)).length}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        {rootTasks.filter((t) => t.dueDate && t.status !== 'done' && !['high', 'urgent'].includes(t.priority)).length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-8">No scheduled deadlines. Add dates to track progress.</p>
                        ) : (
                          rootTasks.filter((t) => t.dueDate && t.status !== 'done' && !['high', 'urgent'].includes(t.priority)).map((task) => (
                            <FocusTaskCard
                              key={task.id}
                              task={task}
                              projects={projects}
                              goals={goals}
                              memberMap={memberMap}
                              onToggle={() => handleToggleComplete(task)}
                              onSelect={() => setSearchParams({ task: task.id })}
                              subStats={getSubtaskStats(task.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Focus Bucket C: Quick Capture / Unscheduled Backlog */}
                    <div className="rounded-2xl border border-border-default bg-surface/50 shadow-lg flex flex-col h-fit">
                      <div className="px-5 py-4 border-b border-border-default flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">📥 Unscheduled Backlog</h2>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/20">
                          {rootTasks.filter((t) => !t.dueDate && t.status !== 'done' && !['high', 'urgent'].includes(t.priority)).length}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        {rootTasks.filter((t) => !t.dueDate && t.status !== 'done' && !['high', 'urgent'].includes(t.priority)).length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-8">Backlog is lean. Capture ideas via quick command bar.</p>
                        ) : (
                          rootTasks.filter((t) => !t.dueDate && t.status !== 'done' && !['high', 'urgent'].includes(t.priority)).map((task) => (
                            <FocusTaskCard
                              key={task.id}
                              task={task}
                              projects={projects}
                              goals={goals}
                              memberMap={memberMap}
                              onToggle={() => handleToggleComplete(task)}
                              onSelect={() => setSearchParams({ task: task.id })}
                              subStats={getSubtaskStats(task.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* VIEW 2: Omni Kanban (Visual Sprint columns) */}
                {activeTab === 'kanban' && (
                  <motion.div
                    key="kanban-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4"
                  >
                    {STATUSES.map((status) => {
                      const cfg = STATUS_CONFIG[status];
                      const colsTasks = rootTasks.filter((t) => t.status === status);

                      return (
                        <div key={status} className="rounded-2xl border border-border-default bg-surface/30 shadow-md flex flex-col min-h-[500px]">
                          {/* Column Title */}
                          <div className="px-4.5 py-3 border-b border-border-default flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">{cfg.label}</h2>
                            </div>
                            <span className="text-[10px] font-bold text-text-muted bg-accent/25 rounded px-1.5 py-0.5 leading-none">
                              {colsTasks.length}
                            </span>
                          </div>

                          {/* Task Cards Column Body */}
                          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                            {colsTasks.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-16 text-center">
                                <span className="text-2xl opacity-15">✓</span>
                                <p className="text-[10px] text-text-muted mt-1">Status holds no active tasks</p>
                              </div>
                            ) : (
                              colsTasks.map((task) => (
                                <KanbanCard
                                  key={task.id}
                                  task={task}
                                  projects={projects}
                                  goals={goals}
                                  memberMap={memberMap}
                                  onCycleForward={() => cycleStatus(task, 'forward')}
                                  onCycleBackward={() => cycleStatus(task, 'backward')}
                                  onToggle={() => handleToggleComplete(task)}
                                  onSelect={() => setSearchParams({ task: task.id })}
                                  onDelete={() => handleDeleteTask(task.id)}
                                  subStats={getSubtaskStats(task.id)}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {/* VIEW 3: Command Control (High-Density filter spreadsheet) */}
                {activeTab === 'table' && (
                  <motion.div
                    key="table-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {/* Interactive Filter Command Center Panel */}
                    <div className="rounded-2xl border border-border-default bg-surface/50 p-4.5 flex flex-wrap items-center gap-3">
                      
                      {/* Search box */}
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={tableSearch}
                          onChange={(e) => setTableSearch(e.target.value)}
                          placeholder="Search tasks by title..."
                          className="w-full bg-accent/25 border border-border/10 rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
                        />
                      </div>

                      {/* Project Filter */}
                      <div className="flex flex-col gap-1">
                        <select
                          value={filterProject}
                          onChange={(e) => setFilterProject(e.target.value)}
                          className="bg-accent/25 border border-border/10 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary/40 font-medium"
                        >
                          <option value="all">All Projects</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Goal Filter */}
                      <div className="flex flex-col gap-1">
                        <select
                          value={filterGoal}
                          onChange={(e) => setFilterGoal(e.target.value)}
                          className="bg-accent/25 border border-border/10 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary/40 font-medium"
                        >
                          <option value="all">All Goals</option>
                          {goals.map((g) => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                          ))}
                        </select>
                      </div>

                      {/* Assignee Filter */}
                      <div className="flex flex-col gap-1">
                        <select
                          value={filterAssignee}
                          onChange={(e) => setFilterAssignee(e.target.value)}
                          className="bg-accent/25 border border-border/10 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary/40 font-medium"
                        >
                          <option value="all">All Assignees</option>
                          {members.map((m) => (
                            <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
                          ))}
                        </select>
                      </div>

                      {/* Priority Filter */}
                      <div className="flex flex-col gap-1">
                        <select
                          value={filterPriority}
                          onChange={(e) => setFilterPriority(e.target.value)}
                          className="bg-accent/25 border border-border/10 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary/40 font-medium"
                        >
                          <option value="all">All Priorities</option>
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                          <option value="none">None</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="flex flex-col gap-1">
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="bg-accent/25 border border-border/10 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer focus:ring-1 focus:ring-primary/40 font-medium"
                        >
                          <option value="all">All Statuses</option>
                          <option value="todo">Todo</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      {/* Reset Filters button */}
                      {(tableSearch || filterProject !== 'all' || filterGoal !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all' || filterStatus !== 'all') && (
                        <button
                          onClick={() => {
                            setTableSearch('');
                            setFilterProject('all');
                            setFilterGoal('all');
                            setFilterAssignee('all');
                            setFilterPriority('all');
                            setFilterStatus('all');
                          }}
                          className="p-2.5 rounded-xl text-xs font-semibold text-text-muted hover:text-foreground transition-colors bg-accent/25 border border-border/10"
                          title="Reset Filters"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Table spreadsheets cards */}
                    <div className="rounded-2xl border border-border-default bg-surface/50 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-border-default bg-accent/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                              <th className="px-5 py-3">Task Title</th>
                              <th className="px-5 py-3 w-[130px]">Status</th>
                              <th className="px-5 py-3 w-[120px]">Priority</th>
                              <th className="px-5 py-3 w-[140px]">Assignee</th>
                              <th className="px-5 py-3 w-[180px]">Scope Allocation</th>
                              <th className="px-5 py-3 w-[110px]">Due Date</th>
                              <th className="px-5 py-3 w-[80px] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-default text-xs font-medium text-foreground">
                            {tasks
                              .filter((t) => {
                                // Real-time searching
                                if (tableSearch && !t.title.toLowerCase().includes(tableSearch.toLowerCase())) return false;
                                // Dropdown filtering
                                if (filterProject !== 'all' && t.projectId !== filterProject) return false;
                                if (filterGoal !== 'all' && t.goalId !== filterGoal) return false;
                                if (filterAssignee !== 'all' && !t.assigneeIds.includes(filterAssignee)) return false;
                                if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
                                if (filterStatus !== 'all' && t.status !== filterStatus) return false;
                                return true;
                              })
                              .map((task) => {
                                const matchedProj = projects.find((p) => p.id === task.projectId);
                                const matchedGoal = goals.find((g) => g.id === task.goalId);
                                const due = task.dueDate?.toDate?.();

                                return (
                                  <tr
                                    key={task.id}
                                    className="hover:bg-accent/15 transition-colors cursor-pointer group"
                                  >
                                    <td className="px-5 py-3.5" onClick={() => setSearchParams({ task: task.id })}>
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleComplete(task);
                                          }}
                                          className="text-text-muted hover:text-primary transition-transform active:scale-95"
                                        >
                                          {task.status === 'done' ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                          ) : (
                                            <Circle className="h-4 w-4 text-zinc-400" />
                                          )}
                                        </button>
                                        <div className="min-w-0">
                                          <p className={cn(
                                            'font-semibold text-foreground truncate max-w-[280px]',
                                            task.status === 'done' && 'line-through text-muted-foreground font-medium'
                                          )}>
                                            {task.title}
                                          </p>
                                          {getSubtaskStats(task.id) && (
                                            <p className="text-[10px] text-text-muted mt-0.5">
                                              Checklist: {getSubtaskStats(task.id)!.completed} / {getSubtaskStats(task.id)!.total}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    
                                    {/* Inline Status selector */}
                                    <td className="px-5 py-3.5">
                                      <select
                                        value={task.status}
                                        onChange={(e) => {
                                          handleStatusChange(task, e.target.value as TaskStatus);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-transparent border-none font-bold text-xs p-0 outline-none cursor-pointer hover:underline"
                                        style={{ color: STATUS_CONFIG[task.status].dot }}
                                      >
                                        <option value="todo">Todo</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="review">Review</option>
                                        <option value="done">Done</option>
                                      </select>
                                    </td>

                                    {/* Inline Priority selector */}
                                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                                      <select
                                        value={task.priority}
                                        onChange={async (e) => {
                                          await updatePriority(task.id, orgId, e.target.value as TaskPriority, task.priority, actor);
                                        }}
                                        className="bg-transparent border-none font-bold text-xs p-0 outline-none cursor-pointer hover:underline"
                                        style={{ color: PRIORITY_CONFIG[task.priority].color }}
                                      >
                                        <option value="none">None</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                      </select>
                                    </td>

                                    {/* Assignee Badge */}
                                    <td className="px-5 py-3.5" onClick={() => setSearchParams({ task: task.id })}>
                                      {task.assigneeIds.length > 0 ? (
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                          {memberMap[task.assigneeIds[0]]}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-text-muted">Unassigned</span>
                                      )}
                                    </td>

                                    {/* Scopes badge */}
                                    <td className="px-5 py-3.5" onClick={() => setSearchParams({ task: task.id })}>
                                      <div className="flex flex-col gap-0.5">
                                        {matchedProj && (
                                          <span className="text-[10px] font-bold text-primary truncate max-w-[150px]">
                                            #{matchedProj.name}
                                          </span>
                                        )}
                                        {matchedGoal && (
                                          <span className="text-[9px] font-bold text-violet-400 truncate max-w-[150px]">
                                            🎯 {matchedGoal.title}
                                          </span>
                                        )}
                                        {!matchedProj && !matchedGoal && (
                                          <span className="text-[10px] text-text-muted">Standalone Scope</span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Due Date row */}
                                    <td className="px-5 py-3.5" onClick={() => setSearchParams({ task: task.id })}>
                                      {due ? (
                                        <span className={cn(
                                          'text-[10px] font-semibold flex items-center gap-1',
                                          due < new Date() && task.status !== 'done' ? 'text-red-400 font-bold' : 'text-text-muted'
                                        )}>
                                          <Calendar className="h-3 w-3 shrink-0" />
                                          {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-text-muted">--</span>
                                      )}
                                    </td>

                                    {/* Inline actions row */}
                                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Delete Task"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
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

      {/* ─── Creators Modals ─── */}
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

// ─── Subcomponents ───────────────────────────────────────────────────────────

interface FocusTaskCardProps {
  task: Task;
  projects: Project[];
  goals: Goal[];
  memberMap: Record<string, string>;
  onToggle: () => void;
  onSelect: () => void;
  subStats: { completed: number; total: number } | null;
}

function FocusTaskCard({
  task,
  projects,
  goals,
  memberMap,
  onToggle,
  onSelect,
  subStats,
}: FocusTaskCardProps) {
  const matchedProj = projects.find((p) => p.id === task.projectId);
  const matchedGoal = goals.find((g) => g.id === task.goalId);
  const due = task.dueDate?.toDate?.();

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-xl border border-border-default bg-surface px-4 py-3.5',
        'hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-2.5 relative group'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-0.5 shrink-0 text-text-muted hover:text-primary transition-transform active:scale-95"
        >
          <Circle className="h-4.5 w-4.5 text-zinc-400" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors leading-normal">
            {task.title}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center mt-1">
        {/* Priority Badge */}
        {task.priority !== 'none' && (
          <span className={cn(
            'px-2 py-0.5 rounded text-[9px] font-bold border leading-none',
            task.priority === 'urgent' && 'bg-red-500/10 text-red-400 border-red-500/20',
            task.priority === 'high' && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            task.priority === 'medium' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            task.priority === 'low' && 'bg-sky-500/10 text-sky-400 border-sky-500/20'
          )}>
            {task.priority}
          </span>
        )}

        {/* Due date Badge */}
        {due && (
          <span className={cn(
            'inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold border leading-none',
            due < new Date() ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
          )}>
            <Calendar className="h-2.5 w-2.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Project Scope Badge */}
        {matchedProj && (
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold leading-none truncate max-w-[110px]">
            #{matchedProj.name}
          </span>
        )}

        {/* Goal Scope Badge */}
        {matchedGoal && (
          <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[9px] font-bold leading-none truncate max-w-[110px]">
            🎯 {matchedGoal.title}
          </span>
        )}

        {/* Subtask Status */}
        {subStats && (
          <span className="px-2 py-0.5 rounded bg-accent/30 text-text-muted border border-border/10 text-[9px] font-bold leading-none">
            {subStats.completed} / {subStats.total} subtasks
          </span>
        )}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  task: Task;
  projects: Project[];
  goals: Goal[];
  memberMap: Record<string, string>;
  onCycleForward: () => void;
  onCycleBackward: () => void;
  onToggle: () => void;
  onSelect: () => void;
  onDelete: () => void;
  subStats: { completed: number; total: number } | null;
}

function KanbanCard({
  task,
  projects,
  goals,
  memberMap,
  onCycleForward,
  onCycleBackward,
  onToggle,
  onSelect,
  onDelete,
  subStats,
}: KanbanCardProps) {
  const matchedProj = projects.find((p) => p.id === task.projectId);
  const matchedGoal = goals.find((g) => g.id === task.goalId);
  const due = task.dueDate?.toDate?.();

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-xl border border-border-default bg-surface p-3.5 flex flex-col gap-3.5',
        'hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer relative group'
      )}
    >
      {/* Title */}
      <div className="flex items-start gap-2.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-0.5 shrink-0 text-text-muted hover:text-primary transition-transform active:scale-95"
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
          ) : (
            <Circle className="h-4.5 w-4.5 text-zinc-400" />
          )}
        </button>
        <p className={cn(
          'font-semibold text-xs text-foreground group-hover:text-primary transition-colors leading-normal flex-1',
          task.status === 'done' && 'line-through text-muted-foreground font-medium'
        )}>
          {task.title}
        </p>
      </div>

      {/* Badges container */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {task.priority !== 'none' && (
          <span className={cn(
            'px-2 py-0.5 rounded text-[8px] font-bold border leading-none',
            task.priority === 'urgent' && 'bg-red-500/10 text-red-400 border-red-500/20',
            task.priority === 'high' && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            task.priority === 'medium' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            task.priority === 'low' && 'bg-sky-500/10 text-sky-400 border-sky-500/20'
          )}>
            {task.priority}
          </span>
        )}

        {due && (
          <span className={cn(
            'inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[8px] font-bold border leading-none',
            due < new Date() && task.status !== 'done' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
          )}>
            <Calendar className="h-2.5 w-2.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {matchedProj && (
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[8px] font-bold leading-none truncate max-w-[90px]">
            #{matchedProj.name}
          </span>
        )}

        {matchedGoal && (
          <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[8px] font-bold leading-none truncate max-w-[90px]">
            🎯 {matchedGoal.title}
          </span>
        )}

        {subStats && (
          <span className="px-2 py-0.5 rounded bg-accent/30 text-text-muted border border-border/10 text-[8px] font-bold leading-none">
            {subStats.completed}/{subStats.total} sub
          </span>
        )}
      </div>

      {/* Kanban action toolbar */}
      <div className="flex items-center justify-between border-t border-border/10 pt-2.5 mt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCycleBackward();
            }}
            className="p-1 rounded text-text-muted hover:text-foreground hover:bg-accent/40 transition-colors"
            title="Move back"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCycleForward();
            }}
            className="p-1 rounded text-text-muted hover:text-foreground hover:bg-accent/40 transition-colors"
            title="Move forward"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {task.assigneeIds.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold">
              {memberMap[task.assigneeIds[0]]}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
