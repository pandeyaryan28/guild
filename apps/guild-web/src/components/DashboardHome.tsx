import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Loader2, 
  Check, 
  Target, 
  Workflow, 
  ThumbsUp, 
  RotateCcw 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useChannels, useOrgMembers } from '../hooks/useChat';
import { useNotifications } from '../hooks/useNotifications';
import { useRequests } from '../hooks/useRequests';
import { useTeams } from '../hooks/useTeams';
import { useProjects } from '../hooks/useProjects';
import { useGoals } from '../hooks/useGoals';
import { updateRequestStatus, type OrgRequest } from '../lib/requests';
import { type Task, moveTask, createTask } from '../lib/tasks';
import { updateGoal } from '../lib/goals';
import { updateUserProfile, type UserProfile } from '../lib/firestore';
import { Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MemberProfileDrawer, avatarInitials, avatarHue } from './MemberProfileDrawer';
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

// Background auto-reset helpers
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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 border-red-400/20 bg-red-400/5',
  high:   'text-orange-400 border-orange-400/20 bg-orange-400/5',
  medium: 'text-amber-400 border-amber-400/20 bg-amber-400/5',
  low:    'text-blue-400 border-blue-400/20 bg-blue-400/5',
  none:   'text-muted-foreground border-border-default bg-bg-tertiary',
};

export function DashboardHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { goals } = useGoals(orgId);
  const { channels } = useChannels(orgId);
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

  // Selected teammate profile drawer state
  const [selectedMember, setSelectedMember] = React.useState<UserProfile | null>(null);

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

  // Check access to profiles in slide-over drawer
  const hasAccessToProfile = React.useCallback((memberUid: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    if (userProfile.uid === memberUid) return true;
    const isManagerForThisUser = teams.some(t => 
      t.managerId === userProfile.uid && t.memberIds?.includes(memberUid)
    );
    return isManagerForThisUser;
  }, [userProfile, teams]);

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

  // Background Auto-Reset Engine
  React.useEffect(() => {
    const checkAndResetCycles = async () => {
      if (!goals || goals.length === 0 || !orgId || tasksLoading) return;
      
      for (const goal of goals) {
        if (goal.recurrence === 'none' || goal.status !== 'active') continue;
        
        if (isCycleExpired(goal.recurrence, goal.currentCycleStart)) {
          try {
            const supportingTasks = tasks.filter(t => t.goalId === goal.id);
            const completedTasksCount = supportingTasks.filter(t => t.status === 'done').length;
            const totalTasksCount = supportingTasks.length;
            const cycleStatus = (goal.progressRollup ?? 0) >= 100 ? 'completed' : 'incomplete';
            
            const record: GoalCycleRecord = {
              cycleStart: goal.currentCycleStart || Timestamp.now(),
              cycleEnd: Timestamp.now(),
              status: cycleStatus,
              completedTasksCount,
              totalTasksCount,
            };
            
            const newHistory = [...(goal.cycleHistory || []), record];
            const completedIncrement = cycleStatus === 'completed' ? 1 : 0;
            
            await updateGoal(goal.id, {
              currentCycleStart: Timestamp.now(),
              completedCyclesCount: (goal.completedCyclesCount || 0) + completedIncrement,
              progressRollup: 0,
              cycleHistory: newHistory,
            });
            
            for (const task of supportingTasks) {
              await updateDoc(doc(db, 'tasks', task.id), {
                status: 'todo',
                completedAt: null,
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            console.error('Error resetting goal cycle:', err);
          }
        }
      }
    };
    checkAndResetCycles();
  }, [goals, tasks, orgId, actor, tasksLoading]);

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
    // De-duplicate
    const seen = new Set<string>();
    const unique = combined.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    // Fallback: if no today/in-progress tasks, show other active tasks assigned to you
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

  // Recent task activity: tasks sorted by updatedAt desc
  const recentActivity = React.useMemo((): { task: Task; actor: string }[] => {
    return [...tasks]
      .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
      .slice(0, 4)
      .map((task) => ({
        task,
        actor: task.assigneeIds[0] ?? task.creatorId ?? '',
      }));
  }, [tasks]);

  const getMemberName = (uid: string) => {
    if (!uid) return 'Teammate';
    const m = members.find((mem) => mem.uid === uid);
    return m?.fullName ?? 'Teammate';
  };

  const getMemberInitials = (uid: string) => {
    const name = getMemberName(uid);
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Direct Report Reviews feed for Managers
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

  // Handle in-line review actions
  const handleReviewAction = async (task: Task, action: 'approve' | 'reject') => {
    if (!orgId) return;
    try {
      const newStatus = action === 'approve' ? 'done' : 'in_progress';
      await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error(err);
    }
  };

  // Create simple quick task
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

  // Handle marking task complete from list
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

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userProfile?.fullName?.split(' ')[0] ?? 'Teammate';

  // Active Project (first project as current focus)
  const activeProject = projects[0];

  const STATUS_LABEL_MUTED: Record<string, string> = {
    todo: 'created',
    in_progress: 'started',
    review: 'submitted',
    done: 'completed',
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-12">
      {/* Sleek Typography Header */}
      <header className="space-y-6">
        <div className="space-y-1.5">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-semibold tracking-tight text-foreground"
          >
            {greeting}, {displayName}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-xs text-muted-foreground font-medium"
          >
            Workspace metrics: {myTasks.length} active tasks &bull; {unreadCount} pending items &bull; {sprintPercentage}% sprint progress
          </motion.p>
        </div>

        {/* Typographic Daily Focus Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-lg focus-within:ring-0 group transition-all"
        >
          <div className="flex items-center gap-3 py-1.5 border-b border-border-default/45 focus-within:border-primary/60 transition-all">
            <Target className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0" />
            <input
              type="text"
              placeholder="Set your focus for today..."
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFocus();
              }}
              className="flex-1 bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 p-0 font-medium"
            />
            <AnimatePresence>
              {focusInput !== (userProfile?.focusStatus?.text || '') && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleSaveFocus}
                  disabled={savingFocus}
                  className="px-2.5 py-1 rounded bg-foreground text-background text-[10px] font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50 shrink-0"
                >
                  {savingFocus ? 'Saving' : 'Set Focus'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          {focusSavedNotif && (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-emerald-400 font-semibold absolute mt-1.5 left-0"
            >
              Focus synced with your squad
            </motion.p>
          )}
        </motion.div>
      </header>

      {/* Two-Column Clean Layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16">
        
        {/* Left Column: My Day (Execution Focus) */}
        <section className="md:col-span-3 space-y-10">
          
          {/* Today's Tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border-default/30 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Core Focus</h2>
              <span className="text-[10px] text-muted-foreground font-mono">{coreTasks.length} tasks</span>
            </div>

            {tasksLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading tasks...</span>
              </div>
            ) : coreTasks.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border-default/40 rounded-xl">
                <p className="text-xs text-muted-foreground">Clear canvas. No high-priority tasks left.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {coreTasks.map((task) => {
                  const priorityClass = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;
                  const isCompleting = completingTaskId === task.id;
                  
                  return (
                    <div 
                      key={task.id}
                      className="group flex items-center justify-between py-3 border-b border-border-default/20 last:border-0 hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          disabled={isCompleting}
                          className="h-4 w-4 rounded-full border border-border-default flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all shrink-0 disabled:opacity-50"
                        >
                          {isCompleting ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                          ) : (
                            <Check className="h-2.5 w-2.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                        <span className="text-sm font-medium text-foreground/95 truncate">
                          {task.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority !== 'none' && (
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider", priorityClass)}>
                            {task.priority}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60 font-mono">
                          {task.dueDate ? task.dueDate.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'No Date'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Task Creator */}
          <form onSubmit={handleCreateQuickTask} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Quick add task..."
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              className="flex-1 bg-bg-tertiary/30 border border-border-default/50 rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-medium"
            />
            <button
              type="submit"
              disabled={!quickTaskTitle.trim() || creatingQuickTask}
              className="px-3 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-foreground/95 transition-all flex items-center justify-center disabled:opacity-55"
            >
              {creatingQuickTask ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
          </form>

          {/* Strategic Projects Summary */}
          {activeProject && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-border-default/30 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Strategic Horizon</h2>
                <span 
                  onClick={() => navigate('/projects')}
                  className="text-[10px] text-primary font-semibold cursor-pointer hover:underline"
                >
                  All Projects
                </span>
              </div>
              
              <div className="space-y-3 p-4 rounded-xl border border-border-default/45 bg-bg-tertiary/10">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{activeProject.name}</span>
                  </div>
                  <span className="text-muted-foreground text-[10px]">Active Project</span>
                </div>
                
                {(() => {
                  const projTasks = tasks.filter(t => t.projectId === activeProject.id);
                  const completedProjTasks = projTasks.filter(t => t.status === 'done');
                  const percentage = projTasks.length > 0 ? Math.round((completedProjTasks.length / projTasks.length) * 100) : 0;
                  
                  return (
                    <div className="space-y-2">
                      <div className="h-1 w-full bg-bg-tertiary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-foreground rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 font-mono">
                        <span>{completedProjTasks.length} of {projTasks.length} tasks completed</span>
                        <span>{percentage}% Done</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </section>

        {/* Right Column: The Pulse (Ambient connection) */}
        <section className="md:col-span-2 space-y-10">
          
          {/* Ambient Team Presence */}
          <div className="space-y-4">
            <div className="border-b border-border-default/30 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Squad Co-Presence</h2>
            </div>
            
            {displayedTeammates.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 italic">Solo mode. No other teammates in this space.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {displayedTeammates.map((member) => {
                  const hasFocus = !!member.focusStatus?.text;
                  const isOnline = hasFocus;
                  const initials = avatarInitials(member.fullName || member.username || '?');
                  const targetProfileAccess = hasAccessToProfile(member.uid);
                  
                  return (
                    <div 
                      key={member.uid}
                      onClick={() => {
                        if (targetProfileAccess) setSelectedMember(member);
                      }}
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm border border-border-default/60 hover:border-primary/50 transition-all",
                        targetProfileAccess ? "cursor-pointer" : "cursor-default"
                      )}
                      style={{ background: `hsl(${avatarHue(member.uid)} 60% 45%)` }}
                      title={`${member.fullName} ${hasFocus ? `· Focus: ${member.focusStatus!.text}` : ''}`}
                    >
                      {initials}
                      {/* Ambient Indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-surface border border-surface flex items-center justify-center">
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isOnline ? "bg-emerald-500" : "bg-zinc-500"
                        )} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Approvals / Reviews Stream */}
          {(pendingRequests.length > 0 || (isManager && reviewTasksForTeam.length > 0)) && (
            <div className="space-y-4">
              <div className="border-b border-border-default/30 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Action</h2>
              </div>
              
              <div className="space-y-3">
                {/* Requests */}
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-3 border border-border-default/45 rounded-lg bg-bg-tertiary/10 space-y-2">
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-foreground truncate">{req.title}</p>
                      <p className="text-[10px] text-muted-foreground/80 font-medium">Request from {req.creatorName}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'approved', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1 rounded bg-bg-tertiary hover:bg-bg-tertiary/80 text-[10px] font-bold text-foreground transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'rejected', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1 rounded border border-border-default/45 hover:bg-bg-tertiary/10 text-[10px] font-bold text-muted-foreground transition-all"
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
                    <div key={task.id} className="p-3 border border-border-default/45 rounded-lg bg-bg-tertiary/10 space-y-2">
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-foreground line-clamp-1">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground/80 font-medium">Review task for {assigneeName}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewAction(task, 'approve')}
                          className="flex-1 py-1 rounded bg-bg-tertiary hover:bg-bg-tertiary/80 text-[10px] font-bold text-foreground transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewAction(task, 'reject')}
                          className="flex-1 py-1 rounded border border-border-default/45 hover:bg-bg-tertiary/10 text-[10px] font-bold text-muted-foreground transition-all"
                        >
                          Needs Changes
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ambient Recent Activity Log */}
          <div className="space-y-4">
            <div className="border-b border-border-default/30 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ambient Activity</h2>
            </div>
            
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No recent updates.</p>
            ) : (
              <div className="space-y-3.5">
                {recentActivity.map(({ task, actor }) => (
                  <div 
                    key={task.id}
                    onClick={() => navigate(`/tasks?task=${task.id}`)}
                    className="flex gap-3 text-xs leading-relaxed group cursor-pointer"
                  >
                    <div className="h-5 w-5 rounded bg-bg-tertiary border border-border-default flex items-center justify-center font-bold text-[8px] text-muted-foreground group-hover:border-primary/30 transition-colors shrink-0">
                      {getMemberInitials(actor)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-muted-foreground/90 font-medium">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {getMemberName(actor)}
                        </span>{' '}
                        {STATUS_LABEL_MUTED[task.status] || 'updated'}{' '}
                        <span className="text-foreground font-semibold truncate max-w-[130px] inline-block align-bottom">
                          "{task.title}"
                        </span>
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 font-mono block mt-0.5">
                        {relTime(task.updatedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

      </div>

      {/* Shared slide-over drawer for member profiles */}
      <AnimatePresence>
        {selectedMember && (
          <MemberProfileDrawer
            isOpen={!!selectedMember}
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            tasks={tasks}
            teams={teams}
            members={members}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
