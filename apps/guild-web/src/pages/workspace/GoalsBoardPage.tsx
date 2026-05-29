import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Check, Loader2, Trash2, X,
  ChevronDown, Target, Zap, LayoutGrid,
  Kanban, Eye, EyeOff, Calendar, Sparkles,
  Users, Building, AlertCircle, Filter, CheckCircle2,
  Trash, ArrowRight, RefreshCw, Star, BarChart3, HelpCircle
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';
import { useTeams } from '../../hooks/useTeams';

import {
  createTask,
  moveTask,
  deleteTask,
  STATUSES,
  PRIORITY_CONFIG
} from '../../lib/tasks';
import { createGoal, updateGoal, deleteGoal } from '../../lib/goals';
import type { Task, TaskStatus, TaskPriority, ActorInfo } from '../../lib/tasks';
import type { Goal } from '../../lib/goals';

import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../components/tasks/GoalDetailDrawer';
import { cn } from '@/lib/utils';

export function GoalsBoardPage() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // 1. Perspective Navigation State
  // 'my-space': User's own goals & tasks, 'team-space': Team coordination, 'org-board': Global organization board
  const [activePerspective, setActivePerspective] = React.useState<'my-space' | 'team-space' | 'org-board'>('my-space');
  const [activeViewLayout, setActiveViewLayout] = React.useState<'list' | 'kanban'>('list');

  // 2. Active filters
  const [horizonFilter, setHorizonFilter] = React.useState<'all' | 'short_term' | 'long_term'>('all');
  const [projectFilter, setProjectFilter] = React.useState<'all' | string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<'all' | TaskPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = React.useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // 3. Team Space State
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>('all');

  // 4. Drawer & Creation Popover triggers
  const [showAddGoalForm, setShowAddGoalForm] = React.useState(false);
  const [showAddSuccessToast, setShowAddSuccessToast] = React.useState(false);
  const [successToastMessage, setSuccessToastMessage] = React.useState('');

  // 5. Collapsible completed sections
  const [completedGoalsExpanded, setCompletedGoalsExpanded] = React.useState<Record<string, boolean>>({});
  const [showCompletedTasks, setShowCompletedTasks] = React.useState(false);
  const [showArchivedGoals, setShowArchivedGoals] = React.useState(false);

  // 6. Inspect side sheet states
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);

  // 7. Inline inputs for quick task adds mapped by goal.id or 'standalone'
  const [inlineTaskTitles, setInlineTaskTitles] = React.useState<Record<string, string>>({});

  // 8. New Goal form state
  const [newGoalTitle, setNewGoalTitle] = React.useState('');
  const [newGoalHorizon, setNewGoalHorizon] = React.useState<'short_term' | 'long_term'>('short_term');
  const [newGoalProjectId, setNewGoalProjectId] = React.useState('');
  const [newGoalDesc, setNewGoalDesc] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Data Subscriptions
  const { projects, loading: projectsLoading } = useProjects(orgId);
  const { goals, loading: goalsLoading } = useGoals(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams, loading: teamsLoading } = useTeams(orgId);
  const members = useOrgMembers(orgId);

  const isLoading = tasksLoading || goalsLoading || projectsLoading || teamsLoading;

  const actor: ActorInfo = React.useMemo(() => ({
    uid: user?.uid || '',
    name: userProfile?.fullName || user?.displayName || 'Anonymous',
  }), [user, userProfile]);

  const activeTask = React.useMemo(() => {
    if (!selectedTask) return null;
    return tasks.find(t => t.id === selectedTask.id) ?? selectedTask;
  }, [tasks, selectedTask]);

  const activeGoal = React.useMemo(() => {
    if (!selectedGoal) return null;
    return goals.find(g => g.id === selectedGoal.id) ?? selectedGoal;
  }, [goals, selectedGoal]);

  // Teammates map for efficient access
  const memberMap = React.useMemo(() => {
    const map = new Map<string, any>();
    members.forEach(m => map.set(m.uid, m));
    return map;
  }, [members]);

  // Find all teams that the logged-in user belongs to (member or manager)
  const myTeams = React.useMemo(() => {
    return teams.filter(t => t.managerId === user?.uid || t.memberIds.includes(user?.uid || ''));
  }, [teams, user?.uid]);

  // Auto-select the first team the user is part of when navigating to Team Space
  React.useEffect(() => {
    if (activePerspective === 'team-space' && selectedTeamId === 'all') {
      if (myTeams.length > 0) {
        setSelectedTeamId(myTeams[0].id);
      } else if (teams.length > 0) {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [activePerspective, myTeams, teams, selectedTeamId]);

  // Trigger temporary success notification toast
  const triggerToast = (msg: string) => {
    setSuccessToastMessage(msg);
    setShowAddSuccessToast(true);
    setTimeout(() => {
      setShowAddSuccessToast(false);
    }, 3500);
  };

  // ─── 1. CORE SCOPING AND FILTERING LOGIC ───
  // Filter all goals according to the active perspective and UI filters
  const filteredGoals = React.useMemo(() => {
    return goals.filter((g) => {
      // 1. Perspective Scoping
      if (activePerspective === 'my-space') {
        if (g.ownerId !== user?.uid) return false;
      } else if (activePerspective === 'team-space') {
        const team = teams.find(t => t.id === selectedTeamId);
        if (!team) return false;
        // Goal owned by any member of the selected team (including manager)
        const teamMemberIds = [...team.memberIds, team.managerId];
        if (!teamMemberIds.includes(g.ownerId)) return false;
      }
      // 'org-board' allows viewing all goals globally

      // 2. Global UI Filters
      if (horizonFilter !== 'all' && g.horizon !== horizonFilter) return false;
      if (projectFilter !== 'all' && g.projectId !== projectFilter) return false;
      if (assigneeFilter !== 'all' && g.ownerId !== assigneeFilter) return false;
      if (searchQuery.trim() && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    });
  }, [goals, activePerspective, horizonFilter, projectFilter, assigneeFilter, searchQuery, selectedTeamId, teams, user?.uid]);

  // Filter all tasks according to the active perspective and UI filters
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      // 1. Perspective Scoping
      if (activePerspective === 'my-space') {
        // My Space strictly shows tasks assigned to me or created by me (if unassigned)
        const isAssignedToMe = t.assigneeIds.includes(user?.uid || '');
        const isCreatedByMeAndUnassigned = t.creatorId === user?.uid && t.assigneeIds.length === 0;
        if (!isAssignedToMe && !isCreatedByMeAndUnassigned) return false;
      } else if (activePerspective === 'team-space') {
        const team = teams.find(t => t.id === selectedTeamId);
        if (!team) return false;
        const teamMemberIds = [...team.memberIds, team.managerId];
        // Task assigned to any member of the team
        const hasTeamAssignee = t.assigneeIds.some(uid => teamMemberIds.includes(uid));
        if (!hasTeamAssignee) return false;
      }
      // 'org-board' shows all tasks globally

      // 2. Global UI Filters
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && !t.assigneeIds.includes(assigneeFilter)) return false;
      if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    });
  }, [tasks, activePerspective, projectFilter, priorityFilter, assigneeFilter, searchQuery, selectedTeamId, teams, user?.uid]);

  // Goal & Task Segments
  const activeGoalsList = React.useMemo(() => {
    return filteredGoals.filter(g => g.status !== 'completed' && g.status !== 'cancelled');
  }, [filteredGoals]);

  const completedGoalsList = React.useMemo(() => {
    return filteredGoals.filter(g => g.status === 'completed');
  }, [filteredGoals]);

  const activeTasksList = React.useMemo(() => {
    return filteredTasks.filter(t => t.status !== 'done');
  }, [filteredTasks]);

  const completedTasksList = React.useMemo(() => {
    return filteredTasks.filter(t => t.status === 'done');
  }, [filteredTasks]);

  // ─── 2. STATE TRANSITIONS & CRUD TRIGGERS ───
  // Inline task submission from within standard checklists
  const handleInlineTaskSubmit = async (e: React.FormEvent, goalId: string | null) => {
    e.preventDefault();
    const key = goalId || 'standalone';
    const titleText = inlineTaskTitles[key]?.trim();
    if (!titleText || !orgId) return;

    // Reset input
    setInlineTaskTitles(prev => ({ ...prev, [key]: '' }));

    try {
      const parentGoalObj = goalId ? goals.find(g => g.id === goalId) : null;
      await createTask({
        orgId,
        title: titleText,
        description: '',
        priority: 'none',
        projectId: parentGoalObj ? parentGoalObj.projectId : null,
        goalId: goalId,
        assigneeIds: [actor.uid],
        dueDate: null,
        actor
      });
      triggerToast(`Task "${titleText.slice(0, 20)}..." created successfully!`);
    } catch (err) {
      console.error('Failed to create inline task:', err);
    }
  };

  const handleCreateGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !orgId) return;
    setIsSubmitting(true);
    try {
      await createGoal({
        orgId,
        title: newGoalTitle.trim(),
        description: newGoalDesc.trim(),
        targetDate: null,
        horizon: newGoalHorizon,
        projectId: newGoalProjectId || null,
        ownerId: actor.uid,
        actor
      });
      setNewGoalTitle('');
      setNewGoalDesc('');
      setNewGoalProjectId('');
      setShowAddGoalForm(false);
      triggerToast(`Strategic Goal "${newGoalTitle.slice(0, 22)}..." assigned successfully.`);
    } catch (err) {
      console.error('Failed to create goal:', err);
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
      triggerToast(newStatus === 'done' ? `Checked off task: "${task.title.slice(0, 18)}..."` : `Reopened task: "${task.title.slice(0, 18)}..."`);
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
    if (confirm('Delete this task forever?')) {
      try {
        await deleteTask(taskId);
        triggerToast("Task deleted.");
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const handleDeleteGoalItem = async (e: React.MouseEvent, goalId: string) => {
    e.stopPropagation();
    if (confirm('Delete this goal? Connected tasks will be unlinked.')) {
      try {
        await deleteGoal(goalId);
        triggerToast("Strategic Goal removed.");
      } catch (err) {
        console.error('Failed to delete goal:', err);
      }
    }
  };

  const handleToggleGoalStatus = async (e: React.MouseEvent, goal: Goal) => {
    e.stopPropagation();
    const nextStatus = goal.status === 'completed' ? 'active' : 'completed';
    try {
      await updateGoal(goal.id, { status: nextStatus });
      triggerToast(nextStatus === 'completed' ? `Objective "${goal.title.slice(0, 18)}..." achieved!` : `Objective "${goal.title.slice(0, 18)}..." reactivated.`);
    } catch (err) {
      console.error('Failed to toggle goal status:', err);
    }
  };

  const toggleGoalCompletedTasks = (goalId: string) => {
    setCompletedGoalsExpanded(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  // Avatar bubble builder with breathing teammate status halo
  const renderTeammateAvatar = (userId: string, sizeClass = 'h-7 w-7', showStatusGlow = true) => {
    const member = memberMap.get(userId);
    const initials = member 
      ? member.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      : 'U';
    
    // Choose status based on user presence or basic hashing
    let status: 'active' | 'away' | 'busy' | 'offline' = 'offline';
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    if (hash % 4 === 0) status = 'active';
    else if (hash % 4 === 1) status = 'away';
    else if (hash % 4 === 2) status = 'busy';

    const getHaloColor = () => {
      if (status === 'active') return 'active';
      if (status === 'away') return 'away';
      if (status === 'busy') return 'busy';
      return 'offline';
    };

    return (
      <div 
        className={cn(
          "teammate-halo shrink-0 select-none", 
          showStatusGlow ? getHaloColor() : ''
        )}
        style={{ color: status === 'active' ? 'var(--aether-halo-active)' : status === 'away' ? 'var(--aether-halo-away)' : status === 'busy' ? 'var(--aether-halo-busy)' : 'transparent' }}
      >
        <div 
          className={cn(
            "rounded-full flex items-center justify-center font-bold text-[9px] text-white border border-white/10 overflow-hidden relative shadow-sm",
            sizeClass
          )}
          style={{
            background: !member?.photoURL ? `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.12) c h) 100%)` : 'transparent'
          }}
          title={member?.fullName || 'Teammate'}
        >
          {member?.photoURL ? (
            <img src={member.photoURL} alt={member.fullName} className="h-full w-full object-cover rounded-full" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </div>
    );
  };

  // Custom SVG progress speedometer arc for Goal milestone tracking
  const renderGoalProgressArc = (progress: number) => {
    const radius = 22;
    const stroke = 3.5;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative h-12 w-12 shrink-0 flex items-center justify-center shadow-inner rounded-full border border-neutral-100/5 dark:border-neutral-850/10 bg-neutral-100/10 dark:bg-neutral-850/5 select-none">
        <svg height={radius * 2} width={radius * 2} className="progression-arc-svg absolute">
          <circle
            stroke="rgba(255,255,255,0.06)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="var(--accent)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <span className="text-[9px] font-black text-neutral-800 dark:text-neutral-100 tracking-tighter">
          {progress}%
        </span>
      </div>
    );
  };

  // Quick stats summary generator
  const getVelocitySummary = () => {
    const activeTasksCount = activeTasksList.length;
    const activeGoalsCount = activeGoalsList.length;
    
    if (activePerspective === 'my-space') {
      return `You have ${activeGoalsCount} outstanding goal${activeGoalsCount === 1 ? '' : 's'} and ${activeTasksCount} task${activeTasksCount === 1 ? '' : 's'} remaining this week.`;
    } else if (activePerspective === 'team-space') {
      const selectedTeamName = teams.find(t => t.id === selectedTeamId)?.name || 'Team';
      return `Your team "${selectedTeamName}" has ${activeGoalsCount} goal${activeGoalsCount === 1 ? '' : 's'} and ${activeTasksCount} task${activeTasksCount === 1 ? '' : 's'} in progress.`;
    }
    return `The organization is coordinating across ${activeGoalsCount} major goals and ${activeTasksCount} active tasks.`;
  };

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-semibold p-12">
        No organization context found. Please ensure you are logged in.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent select-none animate-fluid-pop relative">
      
      {/* ─── Aurora Floating Accent glows locally ─── */}
      <div className="absolute top-10 left-1/4 w-[350px] h-[350px] rounded-full bg-cyan-500/5 dark:bg-cyan-500/[0.02] filter blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/[0.02] filter blur-[100px] pointer-events-none z-0" />

      {/* ─── Glassmorphic Spatial Header ─── */}
      <div className="border-b border-white/5 shrink-0 bg-white/20 dark:bg-neutral-900/[0.02] backdrop-blur-xl z-10 p-5 rounded-2xl border border-white/10 dark:border-neutral-800/10 mb-4 shadow-sm relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-neutral-850 dark:text-neutral-100 tracking-tight flex items-center gap-2">
              <Building className="w-5 h-5 text-accent" />
              <span>Goals & Tasks Board</span>
            </h1>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">
              {getVelocitySummary()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 3-Perspective Navigation Toggle */}
            <div className="flex items-center gap-0.5 bg-neutral-100/50 dark:bg-neutral-850/30 border border-neutral-200 dark:border-neutral-800/80 p-0.5 rounded-xl shadow-inner">
              <button
                onClick={() => { setActivePerspective('my-space'); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  activePerspective === 'my-space'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-350"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span>My Space</span>
              </button>
              
              <button
                onClick={() => { setActivePerspective('team-space'); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  activePerspective === 'team-space'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-350"
                )}
              >
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Team Space</span>
              </button>

              <button
                onClick={() => { setActivePerspective('org-board'); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                  activePerspective === 'org-board'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-350"
                )}
              >
                <Building className="w-3.5 h-3.5 text-sky-500" />
                <span>Org Board</span>
              </button>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center gap-0.5 bg-neutral-100/50 dark:bg-neutral-850/30 border border-neutral-200 dark:border-neutral-800/80 p-0.5 rounded-xl shadow-inner">
              <button
                onClick={() => setActiveViewLayout('list')}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer",
                  activeViewLayout === 'list'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-650"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveViewLayout('kanban')}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer",
                  activeViewLayout === 'kanban'
                    ? "bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-750 text-neutral-800 dark:text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-650"
                )}
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Achieve CTA */}
            <button
              onClick={() => setShowAddGoalForm(!showAddGoalForm)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-md bg-accent"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Goal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Teammate Success Alert Toast ─── */}
      <AnimatePresence>
        {showAddSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-4.5 py-3 aether-glass rounded-xl shadow-xl flex items-center gap-3 border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 animate-bounce" />
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100">{successToastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Premium Glassmorphic Filters bar ─── */}
      <div className="border-b border-white/5 shrink-0 bg-white/20 dark:bg-neutral-900/[0.01] backdrop-blur-xl z-10 p-4.5 rounded-2xl border border-white/10 dark:border-neutral-800/10 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        
        {/* Dynamic Context Selector for Team Space */}
        {activePerspective === 'team-space' ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-450 dark:text-neutral-500 font-bold uppercase tracking-wider">Coordinate Team:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-transparent text-xs text-neutral-800 dark:text-neutral-100 font-bold border-none outline-none cursor-pointer focus:text-neutral-900 dark:focus:text-white"
            >
              {myTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name} (My Team)</option>
              ))}
              {teams.filter(t => !myTeams.some(mt => mt.id === t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              {teams.length === 0 && <option value="all">No teams found</option>}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-grow max-w-xs relative">
            <input
              type="text"
              placeholder="Search goals & tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-100/50 dark:bg-neutral-850/20 border border-neutral-200/50 dark:border-neutral-800/80 rounded-xl px-3.5 py-1.5 text-xs text-foreground placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:border-accent/40 shadow-inner font-semibold"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-250 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-5">
          {/* Horizon select */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Horizon:</span>
            <select
              value={horizonFilter}
              onChange={(e: any) => setHorizonFilter(e.target.value)}
              className="bg-transparent text-neutral-700 dark:text-neutral-200 font-bold border-none outline-none cursor-pointer focus:text-neutral-900 dark:focus:text-white"
            >
              <option value="all">All Horizons</option>
              <option value="short_term">Short Term</option>
              <option value="long_term">Long Term</option>
            </select>
          </div>

          {/* Project select */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Project:</span>
            <select
              value={projectFilter}
              onChange={(e: any) => setProjectFilter(e.target.value)}
              className="bg-transparent text-neutral-700 dark:text-neutral-200 font-bold border-none outline-none cursor-pointer focus:text-neutral-900 dark:focus:text-white max-w-[130px] truncate"
            >
              <option value="all">All Projects</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>

          {/* Assignee select (shown globally on org or team boards) */}
          {activePerspective !== 'my-space' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Assignee:</span>
              <select
                value={assigneeFilter}
                onChange={(e: any) => setAssigneeFilter(e.target.value)}
                className="bg-transparent text-neutral-700 dark:text-neutral-200 font-bold border-none outline-none cursor-pointer focus:text-neutral-900 dark:focus:text-white max-w-[130px] truncate"
              >
                <option value="all">All Employees</option>
                {members.map(m => (
                  <option key={m.uid} value={m.uid}>{m.fullName || m.username}</option>
                ))}
              </select>
            </div>
          )}

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e: any) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-neutral-700 dark:text-neutral-200 font-bold border-none outline-none cursor-pointer focus:text-neutral-900 dark:focus:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Premium Creation Slide-Over Drawer ─── */}
      <AnimatePresence>
        {showAddGoalForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddGoalForm(false)}
              className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/40 backdrop-blur-xs z-[60]"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 33 }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col h-full overflow-hidden p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-550 flex items-center gap-1">
                  <Target className="w-4 h-4 text-accent" /> New Strategic Goal
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddGoalForm(false)}
                  className="p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGoalSubmit} className="space-y-4 flex-grow flex flex-col justify-between overflow-y-auto pr-1">
                <div className="space-y-4.5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Goal Focus Title</label>
                    <input
                      type="text"
                      required
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 text-xs text-foreground outline-none placeholder:text-neutral-400 focus:border-accent/40 font-semibold"
                      placeholder="High-level objective focus (e.g. Redesign Chat Interface)..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Responsibility Definition</label>
                    <textarea
                      value={newGoalDesc}
                      onChange={(e) => setNewGoalDesc(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 text-xs text-foreground outline-none placeholder:text-neutral-400 focus:border-accent/40 font-semibold h-24 resize-none leading-relaxed"
                      placeholder="What does success look like for this goal? Add deliverables..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Chronology Horizon</label>
                    <select
                      value={newGoalHorizon}
                      onChange={(e: any) => setNewGoalHorizon(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-bold"
                    >
                      <option value="short_term">Short Term (Weekly/Monthly)</option>
                      <option value="long_term">Long Term (Quarterly/Annual)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Project Initiative</label>
                    <select
                      value={newGoalProjectId}
                      onChange={(e) => setNewGoalProjectId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-foreground outline-none cursor-pointer focus:border-accent/40 font-bold"
                    >
                      <option value="">None (Standalone Goal)</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.id}>{proj.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-850 mt-6 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddGoalForm(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-550 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-850 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newGoalTitle.trim()}
                    className="flex-1 px-4 py-3 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition-all hover:brightness-105 active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Target className="w-3.5 h-3.5" />
                        <span>Create Goal</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Content Canvas ─── */}
      <div className="flex-grow overflow-y-auto aether-scroll pr-1 z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-accent" />
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest animate-pulse">Synchronizing workspace metadata...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ================================================================= */}
            {/* LIST LAYOUT                                                       */}
            {/* ================================================================= */}
            {activeViewLayout === 'list' && (
              <motion.div
                key="list-view-layout"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 pb-10"
              >
                
                {/* 1. Milestone Objectives Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                      <Target className="w-4 h-4 text-cyan-500 drop-shadow-[0_0_2px_rgba(6,182,212,0.2)] animate-pulse" />
                      <span>Milestone Objectives ({activeGoalsList.length})</span>
                    </h3>
                  </div>

                  {activeGoalsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {activeGoalsList.map(goal => {
                        const goalTasks = tasks.filter(t => t.goalId === goal.id);
                        const activeGoalTasks = goalTasks.filter(t => t.status !== 'done');
                        const completedGoalTasks = goalTasks.filter(t => t.status === 'done');
                        const progress = goal.progressRollup ?? 0;
                        const linkedProj = projects.find(p => p.id === goal.projectId);
                        const isCompletedExpanded = !!completedGoalsExpanded[goal.id];

                        return (
                          <div
                            key={goal.id}
                            onClick={() => setSelectedGoal(goal)}
                            className="bg-white/40 dark:bg-neutral-900/[0.04] border border-neutral-200/50 dark:border-neutral-850/50 hover:border-cyan-500/35 hover:bg-white/80 dark:hover:bg-neutral-850/30 rounded-2xl p-5 space-y-4 shadow-sm transition-all duration-300 flex flex-col justify-between cursor-pointer aether-glass-interactive relative group"
                          >
                            <div className="space-y-3.5">
                              {/* Horizon & project badges */}
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-200/30 dark:border-neutral-800 text-cyan-600 dark:text-cyan-400 bg-cyan-500/[0.04]">
                                    {goal.horizon === 'short_term' ? 'Short Term' : 'Long Term'}
                                  </span>
                                  {linkedProj && (
                                    <span 
                                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${linkedProj.id}`); }}
                                      className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-neutral-200/30 dark:border-neutral-800 text-indigo-500 dark:text-indigo-400 bg-indigo-550/[0.04] hover:bg-indigo-500/10 cursor-pointer"
                                    >
                                      {linkedProj.name}
                                    </span>
                                  )}
                                </div>

                                {/* Goal Owner display */}
                                {renderTeammateAvatar(goal.ownerId, 'h-6 w-6')}
                              </div>

                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleGoalStatus(e, goal)}
                                    className="h-4.5 w-4.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-cyan-500 flex items-center justify-center shrink-0 cursor-pointer bg-white dark:bg-neutral-900 transition-colors"
                                    title="Achieve Objective"
                                  >
                                    <div className="h-2 w-2 rounded-full bg-transparent hover:bg-cyan-500" />
                                  </button>
                                  <h4 className="text-xs font-bold text-neutral-850 dark:text-neutral-100 truncate flex-grow">
                                    {goal.title}
                                  </h4>
                                </div>
                                
                                <button
                                  onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                  className="text-neutral-400 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {goal.description && (
                                <p className="text-[10px] text-neutral-450 dark:text-neutral-400 leading-relaxed font-medium line-clamp-2">
                                  {goal.description}
                                </p>
                              )}

                              {/* Progress Speedometer Radial */}
                              <div className="flex items-center gap-3.5 pt-1.5">
                                {renderGoalProgressArc(progress)}
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider block">milestone rollup status</span>
                                  <span className="text-xs font-extrabold text-neutral-700 dark:text-neutral-200">
                                    {completedGoalTasks.length} / {goalTasks.length} tasks achieved
                                  </span>
                                </div>
                              </div>

                              {/* Active checklist under the Goal */}
                              <div className="space-y-1.5 pt-3.5 border-t border-neutral-100/60 dark:border-neutral-850/40">
                                {activeGoalTasks.slice(0, 3).map(task => (
                                  <div
                                    key={task.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-100/30 dark:bg-neutral-850/10 border border-neutral-100/40 dark:border-neutral-850/20 hover:border-accent/30 transition-all group/task"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleTaskStatus(e, task)}
                                        className="h-4 w-4 rounded-full border border-neutral-350 dark:border-neutral-750 bg-white dark:bg-neutral-900 flex items-center justify-center shrink-0 cursor-pointer hover:border-accent"
                                      >
                                        <div className="h-1.5 w-1.5 rounded-full bg-transparent" />
                                      </button>
                                      <span className="text-[11px] font-semibold text-neutral-850 dark:text-neutral-250 truncate">
                                        {task.title}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {task.assigneeIds.map(uid => renderTeammateAvatar(uid, 'h-4.5 w-4.5', false))}
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                        className="text-neutral-400 hover:text-red-400 transition-colors p-0.5 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover/task:opacity-100"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {goalTasks.length > 3 && (
                                  <div className="text-[9px] text-neutral-400 font-extrabold pl-1.5 uppercase tracking-wide">
                                    + {goalTasks.length - 3} more checklist items
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Inline quick task adder inside goal card */}
                            <form
                              onSubmit={(e) => handleInlineTaskSubmit(e, goal.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-4 pt-3.5 border-t border-neutral-100/60 dark:border-neutral-850/40 flex gap-2 flex-shrink-0"
                            >
                              <input
                                type="text"
                                placeholder="Add task checklist item..."
                                value={inlineTaskTitles[goal.id] || ''}
                                onChange={(e) => setInlineTaskTitles(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                className="flex-grow bg-neutral-100/40 dark:bg-neutral-850/15 border border-neutral-200/50 dark:border-neutral-800/80 rounded-xl px-3 py-2 text-[11px] text-foreground placeholder:text-neutral-400 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:border-accent/40 shadow-inner font-semibold"
                              />
                              <button
                                type="submit"
                                className="px-2.5 py-2 bg-neutral-150/40 hover:bg-neutral-200/50 border border-neutral-200/50 dark:border-neutral-800/85 rounded-xl hover:text-foreground text-neutral-500 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 border border-dashed border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl flex flex-col items-center justify-center text-center bg-neutral-50/10 dark:bg-neutral-900/5 shadow-inner">
                      <Target className="w-8 h-8 text-neutral-350 dark:text-neutral-600 mb-2 stroke-1" />
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 italic font-semibold">No active objectives match selected parameters.</p>
                    </div>
                  )}
                </div>

                {/* 2. Standalone & Initiative Tasks Checklist */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.2)] animate-pulse" />
                    <span>Workspace Tasks Checklist ({activeTasksList.length})</span>
                  </h3>

                  <div className="bg-white/40 dark:bg-neutral-900/[0.04] border border-neutral-200/50 dark:border-neutral-850/50 rounded-2xl p-5 space-y-4.5 shadow-sm">
                    {/* Standalone creation zone */}
                    <form
                      onSubmit={(e) => handleInlineTaskSubmit(e, null)}
                      className="flex gap-2 max-w-md pb-4.5 border-b border-neutral-100 dark:border-neutral-850/65"
                    >
                      <input
                        type="text"
                        placeholder="Assign a new task to yourself..."
                        value={inlineTaskTitles['standalone'] || ''}
                        onChange={(e) => setInlineTaskTitles(prev => ({ ...prev, standalone: e.target.value }))}
                        className="flex-1 bg-neutral-100/40 dark:bg-neutral-850/15 border border-neutral-200/50 dark:border-neutral-800/80 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-neutral-400 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:border-accent/40 shadow-inner font-semibold"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-neutral-150/40 hover:bg-neutral-200/50 border border-neutral-200/50 dark:border-neutral-800/85 rounded-xl text-neutral-550 hover:text-foreground transition-all flex items-center gap-1 cursor-pointer text-[10px] font-black uppercase tracking-wide shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Task</span>
                      </button>
                    </form>

                    {activeTasksList.length > 0 ? (
                      <div className="space-y-2.5">
                        {activeTasksList.map(task => {
                          const linkedProj = projects.find(p => p.id === task.projectId);
                          const linkedGoal = goals.find(g => g.id === task.goalId);

                          const getPriorityColorClass = (p: TaskPriority) => {
                            if (p === 'urgent') return 'text-red-500 border-red-500/15 bg-red-500/5';
                            if (p === 'high') return 'text-amber-500 border-amber-500/15 bg-amber-500/5';
                            if (p === 'medium') return 'text-indigo-500 border-indigo-500/15 bg-indigo-500/5';
                            if (p === 'low') return 'text-cyan-500 border-cyan-500/15 bg-cyan-500/5';
                            return 'text-neutral-400 border-neutral-200/50 dark:border-neutral-800/40 bg-neutral-50/5';
                          };

                          return (
                            <div
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-neutral-50/40 dark:bg-neutral-900/10 border border-neutral-150/50 dark:border-neutral-850/40 hover:border-accent/30 hover:bg-white/80 dark:hover:bg-neutral-850/20 transition-all duration-300 group shadow-sm cursor-pointer gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleTaskStatus(e, task)}
                                  className="h-4.5 w-4.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                                >
                                  <div className="h-1.5 w-1.5 rounded-full bg-transparent hover:bg-accent/40" />
                                </button>
                                <span className="text-xs font-bold text-neutral-850 dark:text-neutral-100 truncate">
                                  {task.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap shrink-0">
                                {/* Project indicator */}
                                {linkedProj && (
                                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-500/10 text-indigo-500 bg-indigo-500/5">
                                    {linkedProj.name}
                                  </span>
                                )}

                                {/* Goal indicator */}
                                {linkedGoal && (
                                  <span 
                                    onClick={(e) => { e.stopPropagation(); setSelectedGoal(linkedGoal); }}
                                    className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-cyan-500/10 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 cursor-pointer hover:bg-cyan-500/10"
                                  >
                                    Goal: {linkedGoal.title}
                                  </span>
                                )}

                                {/* Priority badge */}
                                {task.priority !== 'none' && (
                                  <span className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border", getPriorityColorClass(task.priority))}>
                                    {task.priority}
                                  </span>
                                )}

                                {/* Assignee bubbles */}
                                <div className="flex items-center pl-1">
                                  {task.assigneeIds.map(uid => renderTeammateAvatar(uid, 'h-5 w-5', false))}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                  className="text-neutral-400 hover:text-red-400 transition-colors p-1 cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-405 dark:text-neutral-500 italic py-4.5 font-semibold text-center">No active tasks match current filters.</p>
                    )}
                  </div>
                </div>

                {/* 3. Achieving Strategic Milestones Accordion */}
                <div className="pt-6 border-t border-neutral-100 dark:border-neutral-850/80 space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowArchivedGoals(!showArchivedGoals)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-800 hover:border-accent/20 transition-all font-black text-[10px] text-neutral-450 uppercase tracking-widest cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-500 shrink-0" />
                      <span>Achieved Strategic Goals ({completedGoalsList.length})</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showArchivedGoals ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showArchivedGoals && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-3 pt-1"
                      >
                        {completedGoalsList.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {completedGoalsList.map(goal => (
                              <div 
                                key={goal.id} 
                                onClick={() => setSelectedGoal(goal)}
                                className="bg-neutral-50/20 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-4.5 opacity-65 hover:opacity-95 hover:border-cyan-500/20 transition-all shadow-sm cursor-pointer flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleGoalStatus(e, goal)}
                                    className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                                  >
                                    <Check className="w-2.5 h-2.5 text-cyan-500" />
                                  </button>
                                  <h5 className="text-[11px] font-bold text-neutral-500 dark:text-neutral-500 line-through decoration-cyan-500/40 truncate select-text">
                                    {goal.title}
                                  </h5>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteGoalItem(e, goal.id)}
                                  className="text-neutral-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400 italic text-center py-6">No completed goals found.</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </motion.div>
            )}

            {/* ================================================================= */}
            {/* KANBAN LAYOUT                                                     */}
            {/* ================================================================= */}
            {activeViewLayout === 'kanban' && (
              <motion.div
                key="kanban-view-layout"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 pb-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                  {['todo', 'in_progress', 'review'].map(colStatus => {
                    const colTasks = filteredTasks.filter(t => {
                      if (t.status !== colStatus) return false;
                      if (t.goalId) {
                        const parentGoal = goals.find(g => g.id === t.goalId);
                        if (parentGoal && parentGoal.status === 'completed') return false;
                      }
                      return true;
                    });

                    let colTitle = 'Todo';
                    let colHeaderColor = '';
                    if (colStatus === 'todo') {
                      colTitle = 'To Do';
                      colHeaderColor = 'text-neutral-500 border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-850 dark:text-neutral-400';
                    } else if (colStatus === 'in_progress') {
                      colTitle = 'In Progress';
                      colHeaderColor = 'text-cyan-500 border-cyan-500/20 bg-cyan-500/5 dark:text-cyan-400';
                    } else if (colStatus === 'review') {
                      colTitle = 'In Review';
                      colHeaderColor = 'text-indigo-500 border-indigo-500/20 bg-indigo-500/5 dark:text-indigo-400';
                    }

                    return (
                      <div
                        key={colStatus}
                        className="bg-white/40 dark:bg-neutral-900/[0.03] border border-neutral-200/60 dark:border-neutral-850 rounded-2xl p-4 flex flex-col min-h-[500px] gap-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 dark:border-neutral-850 shrink-0">
                          <span className={cn("text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border", colHeaderColor)}>
                            {colTitle}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-850/50 rounded-lg px-2 py-0.5 border border-neutral-200/40 dark:border-neutral-800/40">
                            {colTasks.length}
                          </span>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] scrollbar-thin pr-1">
                          {colTasks.map(task => {
                            const parentGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
                            const parentProject = task.projectId ? projects.find(p => p.id === task.projectId) : null;

                            return (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="bg-white dark:bg-neutral-900/70 border border-neutral-150 dark:border-neutral-850/50 hover:border-accent/40 rounded-2xl p-4.5 space-y-3 transition-all duration-300 shadow-sm relative group cursor-pointer"
                              >
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {parentProject && (
                                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded border border-indigo-500/10 text-indigo-500 bg-indigo-500/5 truncate max-w-[120px]">
                                        {parentProject.name}
                                      </span>
                                    )}
                                    {parentGoal && (
                                      <span 
                                        onClick={(e) => { e.stopPropagation(); setSelectedGoal(parentGoal); }}
                                        className="text-[8px] font-black px-1.5 py-0.5 rounded border border-cyan-500/10 text-cyan-500 dark:text-cyan-455 bg-cyan-500/5 truncate max-w-[120px] cursor-pointer hover:bg-cyan-500/10"
                                      >
                                        Goal: {parentGoal.title}
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-xs font-bold text-neutral-850 dark:text-neutral-200 leading-snug break-words">
                                    {task.title}
                                  </h5>
                                </div>

                                <div className="flex items-center justify-between pt-2.5 border-t border-neutral-100 dark:border-neutral-850/50 text-[9px] text-neutral-400 font-bold uppercase tracking-wide">
                                  <div className="flex items-center gap-1">
                                    {task.priority !== 'none' && (
                                      <span className="text-[8px] font-black border border-neutral-200/50 dark:border-neutral-800 rounded px-1.5 py-0.2">
                                        {task.priority}
                                      </span>
                                    )}
                                    {task.assigneeIds.map(uid => renderTeammateAvatar(uid, 'h-4.5 w-4.5', false))}
                                  </div>

                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleUpdateTaskStatus(task, e.target.value as TaskStatus)}
                                      className="h-5.5 px-2 bg-neutral-50 dark:bg-neutral-850 border border-neutral-250 dark:border-neutral-800 rounded-lg text-[8px] font-bold text-neutral-600 dark:text-neutral-300 outline-none cursor-pointer"
                                    >
                                      <option value="todo">Todo</option>
                                      <option value="in_progress">Working</option>
                                      <option value="review">Review</option>
                                      <option value="done">Completed</option>
                                    </select>
                                    
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, 'done'); }}
                                      className="h-5.5 px-1.5 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-500 bg-emerald-500/5 rounded-lg text-[8px] font-bold cursor-pointer"
                                    >
                                      DONE
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {colTasks.length === 0 && (
                            <div className="h-24 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center text-center bg-neutral-50/10 dark:bg-neutral-900/5 shadow-inner">
                              <p className="text-[10px] text-neutral-400 italic">Empty</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 4. Complete Kanban archive accordion */}
                <div className="pt-6 border-t border-neutral-100 dark:border-neutral-850/80 space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-800 hover:border-accent/20 transition-all font-black text-[10px] text-neutral-450 uppercase tracking-widest cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Completed Kanban Tasks ({completedTasksList.length})</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCompletedTasks ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showCompletedTasks && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 pt-1"
                      >
                        {completedTasksList.length > 0 ? (
                          <div className="bg-neutral-50/20 dark:bg-neutral-900/5 border border-neutral-200 dark:border-neutral-850 rounded-2xl p-4.5 space-y-2 shadow-inner">
                            {completedTasksList.map(task => (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-neutral-900/10 border border-neutral-150/40 dark:border-neutral-850/30 opacity-60 hover:opacity-90 hover:border-cyan-500/20 transition-all shadow-sm cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleTaskStatus(e, task)}
                                    className="h-4.5 w-4.5 rounded-full border border-cyan-500 bg-cyan-500/10 flex items-center justify-center shrink-0 cursor-pointer"
                                  >
                                    <Check className="w-2.5 h-2.5 text-cyan-500" />
                                  </button>
                                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-550 line-through decoration-cyan-500/40 truncate">
                                    {task.title}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteTaskItem(e, task.id)}
                                  className="text-neutral-400 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400 italic text-center py-6">No completed tasks found.</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>

      {/* ─── Task Inspect & Goal Inspect Drawers ─── */}
      <TaskDetailDrawer
        task={activeTask}
        onClose={() => setSelectedTask(null)}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={projects}
        goals={goals}
      />

      <GoalDetailDrawer
        goal={activeGoal}
        onClose={() => setSelectedGoal(null)}
        orgId={orgId}
        actor={actor}
        members={members}
        projects={projects}
        tasks={tasks}
        onSelectTask={(task) => {
          setSelectedGoal(null);
          setSelectedTask(task);
        }}
      />

    </div>
  );
}
