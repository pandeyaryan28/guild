import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Loader2, 
  Check, 
  Target, 
  Workflow, 
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Users,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';
import { useChannels, useOrgMembers } from '../../hooks/useChat';
import { useNotifications } from '../../hooks/useNotifications';
import { useRequests } from '../../hooks/useRequests';
import { useTeams } from '../../hooks/useTeams';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { updateRequestStatus, type OrgRequest } from '../../lib/requests';
import { type Task, moveTask, createTask } from '../../lib/tasks';
import { updateGoal } from '../../lib/goals';
import { updateUserProfile, type UserProfile } from '../../lib/firestore';
import { Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { avatarInitials, avatarHue } from '../MemberProfileDrawer';
import type { GoalRecurrence, GoalCycleRecord } from '@guild/types';
import { cn } from '@/lib/utils';

// Helper function for relative time
function relTime(ts: any): string {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Background auto-reset helpers for goal tracking cycles
function isCycleExpired(recurrence: GoalRecurrence, currentCycleStart: Timestamp | null | undefined): boolean {
  if (!currentCycleStart || recurrence === 'none') return false;
  const startDate = currentCycleStart.toDate();
  const now = new Date();
  
  if (recurrence === 'daily') {
    return startDate.getDate() !== now.getDate() ||
           startDate.getMonth() !== now.getMonth() ||
           startDate.getFullYear() !== now.getFullYear();
  }
  if (recurrence === 'weekly') {
    const currentMonday = new Date(now);
    const day = currentMonday.getDay();
    const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
    currentMonday.setDate(diff);
    currentMonday.setHours(0, 0, 0, 0);
    return startDate < currentMonday;
  }
  if (recurrence === 'monthly') {
    return startDate.getMonth() !== now.getMonth() ||
           startDate.getFullYear() !== now.getFullYear();
  }
  return false;
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'text-red-400 border-red-500/20 bg-red-500/5',
  high:   'text-orange-400 border-orange-500/20 bg-orange-500/5',
  medium: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
  low:    'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
  none:   'text-muted-foreground border-white/5 bg-white/5',
};

export function DashboardControl() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { goals } = useGoals(orgId);
  const { teams } = useTeams(orgId);
  const { projects } = useProjects(orgId);
  const members = useOrgMembers(orgId);
  const { unreadCount } = useNotifications(orgId);
  const { received: receivedRequests } = useRequests(orgId);
  const pendingRequests = receivedRequests.filter((r) => r.status === 'pending').slice(0, 3);

  // Focus status state
  const [focusInput, setFocusInput] = React.useState(userProfile?.focusStatus?.text || '');
  const [savingFocus, setSavingFocus] = React.useState(false);
  const [focusSavedNotif, setFocusSavedNotif] = React.useState(false);
  
  // Hovered teammate presence status expansion card
  const [hoveredTeammate, setHoveredTeammate] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    if (userProfile?.focusStatus?.text) {
      setFocusInput(userProfile.focusStatus.text);
    }
  }, [userProfile?.focusStatus?.text]);

  const memberMap = React.useMemo(() => {
    const m = new Map<string, UserProfile>();
    members.forEach((mem) => m.set(mem.uid, mem));
    return m;
  }, [members]);

  const actor = React.useMemo(() => ({
    uid: userProfile?.uid ?? '',
    name: userProfile?.fullName || 'Unknown',
  }), [userProfile]);

  // Handle focus status update
  const handleSaveFocus = async () => {
    if (!userProfile?.uid) return;
    setSavingFocus(true);
    try {
      await updateUserProfile(userProfile.uid, {
        focusStatus: {
          text: focusInput,
          updatedAt: Timestamp.now()
        }
      });
      setFocusSavedNotif(true);
      setTimeout(() => setFocusSavedNotif(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFocus(false);
    }
  };

  // Determine user's squad teammates
  const mySquads = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    return teams.filter(t => t.memberIds?.includes(userProfile.uid) || t.managerId === userProfile.uid);
  }, [teams, userProfile?.uid]);

  const squadMemberIds = React.useMemo(() => {
    const ids = new Set<string>();
    mySquads.forEach(t => {
      t.memberIds?.forEach(id => ids.add(id));
      ids.add(t.managerId);
    });
    return Array.from(ids);
  }, [mySquads]);

  const squadTeammates = React.useMemo(() => {
    return members.filter(m => squadMemberIds.includes(m.uid) && m.uid !== userProfile?.uid);
  }, [members, squadMemberIds, userProfile?.uid]);

  const displayedTeammates = squadTeammates.length > 0 ? squadTeammates : members.filter(m => m.uid !== userProfile?.uid);

  // Task metrics
  const myTasks = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    return tasks.filter((t) => t.assigneeIds.includes(userProfile.uid) && t.status !== 'done' && t.status !== 'review');
  }, [tasks, userProfile?.uid]);

  const todayTasks = React.useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return myTasks.filter((t) => t.dueDate && t.dueDate.toDate() <= today);
  }, [myTasks]);

  const inProgressTasks = React.useMemo(() => myTasks.filter((t) => t.status === 'in_progress'), [myTasks]);

  // Priority tasks for "Today's Actions" (Today's tasks + in progress, max 4)
  const coreTasks = React.useMemo(() => {
    const combined = [...inProgressTasks, ...todayTasks];
    const seen = new Set<string>();
    const unique = combined.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    if (unique.length === 0) {
      return myTasks.slice(0, 4);
    }
    return unique.slice(0, 4);
  }, [inProgressTasks, todayTasks, myTasks]);

  // Sprint Velocity
  const sprintTasks = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTasks = tasks.filter(t => {
      const isAssignee = t.assigneeIds.includes(userProfile.uid);
      if (!isAssignee) return false;
      if (!t.dueDate) return false;
      const due = t.dueDate.toDate();
      return due >= startOfWeek && due <= endOfWeek;
    });

    if (weekTasks.length === 0) {
      return tasks.filter(t => t.assigneeIds.includes(userProfile.uid));
    }
    return weekTasks;
  }, [tasks, userProfile?.uid]);

  const sprintCompletedCount = React.useMemo(() => {
    return sprintTasks.filter(t => t.status === 'done').length;
  }, [sprintTasks]);

  const sprintPercentage = React.useMemo(() => {
    if (sprintTasks.length === 0) return 0;
    return Math.round((sprintCompletedCount / sprintTasks.length) * 100);
  }, [sprintTasks, sprintCompletedCount]);

  const isManager = React.useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin' || userProfile.isManager) return true;
    return teams.some(t => t.managerId === userProfile.uid);
  }, [userProfile, teams]);

  const managedTeammateUids = React.useMemo(() => {
    if (!userProfile || !isManager) return new Set<string>();
    const ids = new Set<string>();
    teams.forEach(t => {
      if (t.managerId === userProfile.uid) {
        t.memberIds?.forEach(id => ids.add(id));
      }
    });
    members.forEach(m => {
      if (m.managerId === userProfile.uid) {
        ids.add(m.uid);
      }
    });
    return ids;
  }, [userProfile, isManager, teams, members]);

  const reviewTasksForTeam = React.useMemo(() => {
    if (!isManager || managedTeammateUids.size === 0) return [];
    return tasks.filter(t => 
      t.status === 'review' && 
      t.assigneeIds.some(id => managedTeammateUids.has(id))
    );
  }, [isManager, managedTeammateUids, tasks]);

  // Handle review actions
  const handleReviewAction = async (task: Task, action: 'approve' | 'reject') => {
    if (!orgId) return;
    try {
      const newStatus = action === 'approve' ? 'done' : 'in_progress';
      await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error(err);
    }
  };

  // Create quick task
  const [quickTaskTitle, setQuickTaskTitle] = React.useState('');
  const [creatingQuickTask, setCreatingQuickTask] = React.useState(false);

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !orgId || creatingQuickTask) return;
    setCreatingQuickTask(true);
    try {
      await createTask({
        orgId,
        title: quickTaskTitle.trim(),
        status: 'todo',
        actor,
      });
      setQuickTaskTitle('');
    } catch (err) {
      console.error('Failed to create quick task:', err);
    } finally {
      setCreatingQuickTask(false);
    }
  };

  const [completingTaskId, setCompletingTaskId] = React.useState<string | null>(null);
  const handleToggleComplete = async (task: Task) => {
    if (!orgId || completingTaskId) return;
    setCompletingTaskId(task.id);
    try {
      const newStatus = task.creatorId !== actor.uid ? 'review' : 'done';
      await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error(err);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userProfile?.fullName?.split(' ')[0] ?? 'Teammate';

  const activeProject = projects[0];

  // Circle Gauge Variables
  const arcRadius = 50;
  const arcCircumference = 2 * Math.PI * arcRadius;
  const arcOffset = arcCircumference - (sprintPercentage / 100) * arcCircumference;

  return (
    <div className="space-y-4 animate-fluid-pop">
      {/* 1. Header Focus Intention Banner */}
      <header className="aether-glass py-3 px-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
        {/* Glow effect on hover */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
        
        <div className="space-y-0.5 z-10">
          <span className="text-[9px] font-black tracking-widest text-primary uppercase">
            Workspace Control
          </span>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-gradient bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground">
            {greeting}, {displayName}
          </h1>
        </div>

        {/* Dynamic Focus Syncer */}
        <div className="flex-1 max-w-sm aether-glass bg-white/3 dark:bg-black/5 px-3.5 py-1.5 flex items-center gap-2.5 border border-white/5 z-10" style={{ borderRadius: '14px' }}>
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block leading-none">Declare Focus Intent</span>
            <input 
              type="text" 
              placeholder="What are you working on today?"
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFocus();
              }}
              className="bg-transparent border-none w-full p-0 text-[11px] font-semibold placeholder:text-muted-foreground/60 text-foreground focus:ring-0 focus:outline-none mt-0.5"
            />
          </div>
          
          <AnimatePresence>
            {focusInput !== (userProfile?.focusStatus?.text || '') && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleSaveFocus}
                disabled={savingFocus}
                className="px-2.5 py-1 rounded-lg bg-primary text-white text-[9px] font-bold shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                {savingFocus ? '...' : 'Sync'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* 2. Teammate Presence Halo Orbit */}
      <section className="aether-glass py-2 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
        <div className="flex items-center gap-2 select-none shrink-0">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground">Orbit Presence</span>
          <span className="px-1.5 py-0.2 rounded bg-white/5 font-mono text-[9px] text-muted-foreground leading-none">
            {displayedTeammates.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full overflow-x-auto scrollbar-hide pr-1">
          {displayedTeammates.map((member) => {
            const hasFocus = !!member.focusStatus?.text;
            const isOnline = hasFocus; // simple heuristic
            const initials = avatarInitials(member.fullName || member.username || '?');
            const haloClass = isOnline ? 'active' : 'offline';
            
            return (
              <div
                key={member.uid}
                onMouseEnter={() => setHoveredTeammate(member)}
                onMouseLeave={() => setHoveredTeammate(null)}
                className="relative cursor-pointer shrink-0"
              >
                <div 
                  className={cn("teammate-halo w-8 h-8 flex items-center justify-center text-[9px] font-black text-white hover:scale-105 transition-all", haloClass)}
                  style={{ 
                    background: `hsl(${avatarHue(member.uid)} 60% 45%)`,
                    color: '#ffffff',
                    border: '2px solid var(--aether-glass-bg)'
                  }}
                >
                  {initials}
                </div>

                {/* Floating focus hover popup card */}
                {hoveredTeammate?.uid === member.uid && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 aether-glass p-2.5 min-w-[180px] z-50 text-left pointer-events-none animate-fluid-pop shadow-2xl">
                    <span className="text-[10px] font-bold text-foreground block leading-tight">{member.fullName}</span>
                    <span className="text-[8px] text-muted-foreground capitalize block mt-0.5">{member.role || 'Member'}</span>
                    <div className="w-full h-[1px] bg-white/5 my-1" />
                    {hasFocus ? (
                      <div className="flex items-start gap-1">
                        <span className="h-1 w-1 rounded-full bg-cyan-400 shrink-0 mt-1 animate-pulse" />
                        <span className="text-[9px] font-medium text-foreground italic leading-tight">
                          "{member.focusStatus!.text}"
                        </span>
                      </div>
                    ) : (
                      <span className="text-[8px] text-muted-foreground italic">No active focus</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Execution Column (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Tasks & Quick Add */}
          <div className="aether-glass p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <span className="text-xs font-bold text-foreground block">Active Action Items</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">High priority checkpoints assigned to you</span>
              </div>

              {/* Mini Arc Dashboard Gauge */}
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="progression-arc-svg w-full h-full" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={arcRadius} className="progression-arc-bg" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r={arcRadius}
                    className="progression-arc-value"
                    strokeDasharray={arcCircumference}
                    initial={{ strokeDashoffset: arcCircumference }}
                    animate={{ strokeDashoffset: arcOffset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                  {/* Arc gradient fill */}
                  <defs>
                    <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent)" />
                      <stop offset="100%" stopColor="var(--aether-secondary)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute text-[9px] font-black text-foreground">{sprintPercentage}%</div>
              </div>
            </div>

            {/* Tasks list */}
            {tasksLoading ? (
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Syncing workspace checklist...</span>
              </div>
            ) : coreTasks.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/2">
                <Check className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-foreground block">Clear Day</span>
                <span className="text-[9px] text-muted-foreground mt-0.5 block">No active checklist assigned to you today.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {coreTasks.map((task) => {
                  const labelClass = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.none;
                  const isCompleting = completingTaskId === task.id;

                  return (
                    <div 
                      key={task.id}
                      className="task-glass-card aether-glass bg-white/2 dark:bg-black/5 hover:bg-white/5 hover:border-white/10 px-4 py-3 flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          disabled={isCompleting}
                          className="w-4 h-4 rounded-full border border-white/25 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all shrink-0 cursor-pointer"
                        >
                          {isCompleting ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                          ) : (
                            <Check className="w-2.5 h-2.5 text-primary opacity-0 hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                        <span className="text-xs font-semibold text-foreground truncate">{task.title}</span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {task.priority !== 'none' && (
                          <span className={cn("text-[8px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider", labelClass)}>
                            {task.priority}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          {task.dueDate ? task.dueDate.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Inbox'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Task Injector */}
            <form onSubmit={handleCreateQuickTask} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Insert new task due today..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!quickTaskTitle.trim() || creatingQuickTask}
                className="px-4 rounded-xl bg-foreground text-background text-xs font-bold hover:bg-foreground/95 transition-all flex items-center justify-center disabled:opacity-55 active:scale-95 shadow-md cursor-pointer"
              >
                {creatingQuickTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Strategic Milestone progressions */}
          {activeProject && (
            <div className="aether-glass p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-xs font-bold text-foreground block">Active Roadmap Milestone</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">High-level team progress updates</span>
                </div>
                <button 
                  onClick={() => navigate('/workspace')}
                  className="text-[9px] text-primary font-bold uppercase tracking-wider hover:underline"
                >
                  Manage Roadmaps
                </button>
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Workflow className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-foreground text-xs">{activeProject.name}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">Active</span>
                </div>

                {(() => {
                  const projTasks = tasks.filter(t => t.projectId === activeProject.id);
                  const completedProjTasks = projTasks.filter(t => t.status === 'done');
                  const percentage = projTasks.length > 0 ? Math.round((completedProjTasks.length / projTasks.length) * 100) : 0;
                  
                  return (
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-muted-foreground/80 font-mono">
                        <span>{completedProjTasks.length} of {projTasks.length} milestones complete</span>
                        <span className="font-bold text-foreground">{percentage}% complete</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right Operations Timeline Column (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inbox Approvals */}
          {(pendingRequests.length > 0 || (isManager && reviewTasksForTeam.length > 0)) ? (
            <div className="aether-glass p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">Inbox Approvals</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Items requiring your active sign-off</span>
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold">
                  {pendingRequests.length + (isManager ? reviewTasksForTeam.length : 0)} Pending
                </div>
              </div>

              <div className="space-y-3">
                {/* Requests */}
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 aether-glass bg-white/2 dark:bg-black/10 border border-white/5 rounded-2xl space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-foreground block truncate">{req.title}</span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">Submitted by {req.creatorName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'approved', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-bold hover:bg-foreground/90 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'rejected', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}

                {/* Manager reviews */}
                {isManager && reviewTasksForTeam.map((task) => {
                  const assigneeName = task.assigneeIds.map(id => memberMap.get(id)?.fullName).filter(Boolean).join(', ');
                  return (
                    <div key={task.id} className="p-4 aether-glass bg-white/2 dark:bg-black/10 border border-white/5 rounded-2xl space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-foreground block truncate">{task.title}</span>
                        <span className="text-[9px] text-muted-foreground block mt-0.5">Task review for {assigneeName}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewAction(task, 'approve')}
                          className="flex-1 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-bold hover:bg-foreground/90 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewAction(task, 'reject')}
                          className="flex-1 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
                        >
                          Needs Changes
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="aether-glass p-5 text-center py-6">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <span className="text-xs font-bold text-foreground block">Approvals Cleared</span>
              <span className="text-[9px] text-muted-foreground mt-0.5 block">No requests currently require your signature.</span>
            </div>
          )}

          {/* Operations Activity Stream */}
          <div className="aether-glass p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-foreground">Execution Timeline</span>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="space-y-4 relative pl-3 border-l border-white/5 pt-1">
              {[...tasks]
                .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
                .slice(0, 3)
                .map((task) => {
                  const assigneeName = task.assigneeIds.map(id => memberMap.get(id)?.fullName).filter(Boolean).slice(0, 2).join(', ') || 'Unassigned';
                  return (
                    <div key={task.id} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-primary border-2 border-background shadow-[0_0_8px_var(--accent)]" />
                      
                      <span className="text-[10px] font-bold text-foreground block truncate">{task.title}</span>
                      <div className="flex justify-between items-center text-[8px] text-muted-foreground font-mono mt-0.5">
                        <span>Assigned to {assigneeName}</span>
                        <span>{relTime(task.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
