/**
 * WorkspacePage — unified Execution OS view.
 * Projects · Goals · Tasks in one page with a single "+ New" CTA.
 */
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useTasks, useTaskLabels } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';

import { CreateProjectModal } from '../projects/CreateProjectModal';
import { CreateGoalModal } from '../goals/CreateGoalModal';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import { TaskDetailPanel } from '../tasks/TaskDetailPanel';
import { ScopedTaskRow } from '../../components/tasks/ScopedTaskRow';

import type { Project } from '../../lib/projects';
import type { Goal } from '../../lib/goals';
import type { Task, TaskStatus, ActorInfo } from '../../lib/tasks';
import { STATUSES, STATUS_CONFIG } from '../../lib/tasks';

// ─── Stagger animation helper ──────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ─── Section wrapper ───────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  count: number;
  loading: boolean;
  onNew: () => void;
  newLabel: string;
  newColor?: string;
  children: React.ReactNode;
  emptyIcon: React.ElementType;
  emptyTitle: string;
  emptySubtitle: string;
}

function Section({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  count,
  loading,
  onNew,
  newLabel,
  newColor,
  children,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptySubtitle,
}: SectionProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="rounded-2xl border border-border-default bg-surface overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default bg-surface">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2.5 group"
        >
          <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', iconBg)}>
            <Icon className={cn('h-3.5 w-3.5', iconColor)} />
          </div>
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
          <span className="text-[11px] font-medium text-text-muted bg-bg-tertiary rounded-full px-1.5 py-0.5 leading-none">
            {loading ? '…' : count}
          </span>
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-text-muted transition-transform duration-200',
              !collapsed && 'rotate-90',
            )}
          />
        </button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onNew}
          className={cn(
            'h-7 gap-1 text-[11px] font-medium px-2.5',
            newColor ?? 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Plus className="h-3 w-3" />
          {newLabel}
        </Button>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                </div>
              ) : count === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconBg, 'ring-1 ring-border/20')}>
                    <EmptyIcon className={cn('h-5 w-5 opacity-50', iconColor)} />
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-medium text-foreground/70">{emptyTitle}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{emptySubtitle}</p>
                  </div>
                  <button
                    onClick={onNew}
                    className={cn(
                      'text-[11px] font-medium underline underline-offset-4',
                      iconColor, 'opacity-70 hover:opacity-100 transition-opacity',
                    )}
                  >
                    {newLabel}
                  </button>
                </div>
              ) : (
                children
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Project card ──────────────────────────────────────────────────────────

const PROJECT_STATUS: Record<Project['status'], { dot: string; label: string; color: string }> = {
  active:    { dot: '#34d399', label: 'Active',    color: 'text-emerald-400' },
  paused:    { dot: '#fbbf24', label: 'Paused',    color: 'text-amber-400'   },
  completed: { dot: '#60a5fa', label: 'Completed', color: 'text-blue-400'    },
  archived:  { dot: '#52525b', label: 'Archived',  color: 'text-zinc-500'    },
};

function ProjectRow({ project }: { project: Project }) {
  const navigate = useNavigate();
  const cfg = PROJECT_STATUS[project.status];
  const due = project.dueDate?.toDate();
  const isOverdue = due && due < new Date() && project.status === 'active';

  return (
    <motion.div
      variants={itemVariants}
      onClick={() => navigate(`/projects/${project.id}`)}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-border-default bg-surface px-4 py-3',
        'hover:border-primary/30 hover:bg-surface transition-all duration-150 cursor-pointer',
      )}
    >
      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      <span className="flex-1 text-[13px] font-medium text-foreground leading-tight truncate group-hover:text-primary transition-colors">
        {project.name}
      </span>
      {project.description && (
        <span className="hidden sm:block text-[11px] text-text-muted truncate max-w-[200px]">
          {project.description}
        </span>
      )}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Members */}
        <div className="flex -space-x-1.5">
          {project.memberIds.slice(0, 3).map((_, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-full bg-primary/20 ring-1 ring-background flex items-center justify-center text-[7px] font-bold text-primary"
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
          {project.memberIds.length > 3 && (
            <div className="h-4 w-4 rounded-full bg-muted ring-1 ring-background flex items-center justify-center text-[7px] text-muted-foreground">
              +{project.memberIds.length - 3}
            </div>
          )}
        </div>
        {due && (
          <span className={cn('text-[10px] font-medium flex items-center gap-0.5', isOverdue ? 'text-red-400' : 'text-text-muted')}>
            <Calendar className="h-2.5 w-2.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-primary/50 transition-colors" />
      </div>
    </motion.div>
  );
}

// ─── Goal card ─────────────────────────────────────────────────────────────

const GOAL_STATUS: Record<Goal['status'], { dot: string; label: string; color: string }> = {
  active:    { dot: '#a78bfa', label: 'Active',    color: 'text-violet-400' },
  completed: { dot: '#34d399', label: 'Completed', color: 'text-emerald-400' },
  cancelled: { dot: '#52525b', label: 'Cancelled', color: 'text-zinc-500' },
};

function GoalRow({ goal }: { goal: Goal }) {
  const navigate = useNavigate();
  const cfg = GOAL_STATUS[goal.status];
  const due = goal.targetDate?.toDate?.();
  const isOverdue = due && due < new Date() && goal.status === 'active';

  return (
    <motion.div
      variants={itemVariants}
      onClick={() => navigate(`/goals/${goal.id}`)}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-border-default bg-surface px-4 py-3',
        'hover:border-violet-500/30 hover:bg-surface transition-all duration-150 cursor-pointer',
      )}
    >
      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      <span className="flex-1 text-[13px] font-medium text-foreground leading-tight truncate group-hover:text-violet-400 transition-colors">
        {goal.title}
      </span>
      {goal.description && (
        <span className="hidden sm:block text-[11px] text-text-muted truncate max-w-[200px]">
          {goal.description}
        </span>
      )}
      <div className="flex items-center gap-3 flex-shrink-0">
        {due && (
          <span className={cn('text-[10px] font-medium flex items-center gap-0.5', isOverdue ? 'text-red-400' : 'text-text-muted')}>
            <Calendar className="h-2.5 w-2.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-violet-400/50 transition-colors" />
      </div>
    </motion.div>
  );
}

// ─── Tasks vertical list (status grouped, compact) ─────────────────────────

function TasksSection({
  tasks,
  loading,
  onTaskClick,
}: {
  tasks: Task[];
  loading: boolean;
  onTaskClick: (task: Task) => void;
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const toggleStatus = (status: string) =>
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));

  return (
    <div className="space-y-2">
      {STATUSES.map((status) => {
        const group = tasks.filter((t) => t.status === status);
        if (group.length === 0) return null;
        const cfg = STATUS_CONFIG[status];
        const isCollapsed = collapsed[status];

        return (
          <div key={status}>
            {/* Group header */}
            <button
              onClick={() => toggleStatus(status)}
              className="flex items-center gap-2 w-full text-left py-1.5 px-1 group"
            >
              <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-text-muted font-medium">({group.length})</span>
              <ChevronRight
                className={cn(
                  'h-3 w-3 text-text-muted ml-auto transition-transform duration-150',
                  !isCollapsed && 'rotate-90',
                )}
              />
            </button>

            {/* Task rows */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden space-y-1.5 pl-3.5 mt-1.5"
                >
                  {group.map((task) => (
                    <div key={task.id} onClick={() => onTaskClick(task)}>
                      <ScopedTaskRow task={task} />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Create FAB ────────────────────────────────────────────────────────────

interface CreateFabProps {
  onProject: () => void;
  onGoal: () => void;
  onTask: () => void;
}

function CreateFab({ onProject, onGoal, onTask }: CreateFabProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold',
          'bg-primary/90 hover:bg-primary text-primary-foreground',
          'shadow-lg shadow-primary/20 transition-colors duration-150',
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        New
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1.5">
        <DropdownMenuItem
          onClick={onProject}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">New Project</p>
            <p className="text-[10px] text-muted-foreground">Scope tasks into a project</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onGoal}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
            <Target className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">New Goal</p>
            <p className="text-[10px] text-muted-foreground">Track an outcome or milestone</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          onClick={onTask}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10">
            <CheckSquare className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-foreground">New Task</p>
            <p className="text-[10px] text-muted-foreground">Add a standalone task</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export function WorkspacePage() {
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Data
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);

  // Task panel
  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');
  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  // Create modal states
  const [createProject, setCreateProject] = React.useState(false);
  const [createGoal, setCreateGoal]       = React.useState(false);
  const [createTask, setCreateTask]       = React.useState(false);

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName || user?.displayName || 'Unknown',
  }), [user, userProfile]);

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        No organization found.
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status !== 'archived');
  const activeGoals    = goals.filter((g) => g.status === 'active');
  const allGoals       = goals;
  const standaloneTasksAll = tasks; // all org tasks (scoped tasks visible on project/goal detail)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className={cn('flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-200')}>

        {/* ── Page header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20">
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">Workspace</h1>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Projects · Goals · Tasks
              </p>
            </div>
          </div>
          <CreateFab
            onProject={() => setCreateProject(true)}
            onGoal={() => setCreateGoal(true)}
            onTask={() => setCreateTask(true)}
          />
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: FolderKanban, label: 'Projects', count: activeProjects.length, loading: projectsLoading, color: 'text-primary', bg: 'bg-primary/10' },
              { icon: Target,       label: 'Goals',    count: activeGoals.length,    loading: goalsLoading,    color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { icon: CheckSquare,  label: 'Tasks',    count: standaloneTasksAll.length, loading: tasksLoading, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            ].map(({ icon: Icon, label, count, loading, color, bg }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border-default bg-surface px-4 py-3"
              >
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0', bg)}>
                  <Icon className={cn('h-3.5 w-3.5', color)} />
                </div>
                <div>
                  <p className="text-[18px] font-bold text-foreground leading-none">
                    {loading ? '–' : count}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Projects section ── */}
          <Section
            icon={FolderKanban}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            title="Projects"
            count={activeProjects.length}
            loading={projectsLoading}
            onNew={() => setCreateProject(true)}
            newLabel="New Project"
            emptyIcon={FolderKanban}
            emptyTitle="No projects yet"
            emptySubtitle="Group tasks into a focused execution flow"
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {activeProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
              {projects.filter((p) => p.status === 'archived').map((p) => (
                <div key={p.id} className="opacity-40">
                  <ProjectRow project={p} />
                </div>
              ))}
            </motion.div>
          </Section>

          {/* ── Goals section ── */}
          <Section
            icon={Target}
            iconColor="text-violet-400"
            iconBg="bg-violet-500/10"
            title="Goals"
            count={allGoals.length}
            loading={goalsLoading}
            onNew={() => setCreateGoal(true)}
            newLabel="New Goal"
            newColor="text-violet-400 hover:text-violet-300"
            emptyIcon={Target}
            emptyTitle="No goals yet"
            emptySubtitle="Track outcomes independent of any project"
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {allGoals.map((g) => (
                <div key={g.id} className={g.status !== 'active' ? 'opacity-50' : ''}>
                  <GoalRow goal={g} />
                </div>
              ))}
            </motion.div>
          </Section>

          {/* ── Tasks section ── */}
          <Section
            icon={CheckSquare}
            iconColor="text-sky-400"
            iconBg="bg-sky-500/10"
            title="Tasks"
            count={standaloneTasksAll.length}
            loading={tasksLoading}
            onNew={() => setCreateTask(true)}
            newLabel="New Task"
            newColor="text-sky-400 hover:text-sky-300"
            emptyIcon={CheckSquare}
            emptyTitle="No tasks yet"
            emptySubtitle="Add standalone tasks or create them from a project"
          >
            <TasksSection
              tasks={standaloneTasksAll}
              loading={tasksLoading}
              onTaskClick={(task) => setSearchParams({ task: task.id })}
            />
          </Section>

        </div>
      </div>

      {/* ── Task detail side panel ── */}
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

      {/* ── Modals ── */}
      <CreateProjectModal
        open={createProject}
        onClose={() => setCreateProject(false)}
        orgId={orgId}
      />
      <CreateGoalModal
        open={createGoal}
        onClose={() => setCreateGoal(false)}
        orgId={orgId}
      />
      {createTask && (
        <CreateTaskModal
          open={createTask}
          onClose={() => setCreateTask(false)}
          orgId={orgId}
          actor={actor}
          defaultStatus="todo"
        />
      )}
    </div>
  );
}
