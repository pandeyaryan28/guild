import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Loader2, 
  Check, 
  Target, 
  Workflow, 
  ThumbsUp, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Users,
  Clock
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
import { type Task, moveTask, createTask, deleteTask, updateTask } from '../lib/tasks';
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
  urgent: 'text-red-400 border-red-500/30 bg-red-500/5',
  high:   'text-orange-400 border-orange-500/30 bg-orange-500/5',
  medium: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
  low:    'text-blue-400 border-blue-500/30 bg-blue-500/5',
  none:   'text-muted-foreground border-border-default bg-bg-tertiary',
};

export function DashboardHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { tasks, loading: tasksLoading } = useTasks(orgId, undefined, true);
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
    return tasks.filter((t) => t.approved !== false && t.assigneeIds.includes(userProfile.uid) && t.status !== 'done' && t.status !== 'review');
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
      if (t.approved === false) return false;
      const isAssignee = t.assigneeIds.includes(userProfile.uid);
      if (!isAssignee) return false;
      if (!t.dueDate) return false;
      const due = t.dueDate.toDate();
      return due >= startOfWeek && due <= endOfWeek;
    });

    if (weekTasks.length === 0) {
      return tasks.filter(t => t.approved !== false && t.assigneeIds.includes(userProfile.uid));
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
    return tasks.filter(t => t.approved !== false)
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
    if (!userProfile) return [];
    return tasks.filter(t => 
      t.status === 'review' && (
        (isManager && t.assigneeIds.some(id => managedTeammateUids.has(id))) ||
        (t.creatorId === userProfile.uid && !t.assigneeIds.includes(userProfile.uid))
      )
    );
  }, [isManager, managedTeammateUids, tasks, userProfile]);

  const tasksAwaitingApproval = React.useMemo(() => {
    if (!userProfile) return [];
    return tasks.filter(t => {
      if (t.approved === false) {
        const creatorProfile = members.find(m => m.uid === t.creatorId);
        if (!creatorProfile) return false;

        if (creatorProfile.managerId) {
          return creatorProfile.managerId === userProfile.uid;
        }

        return userProfile.role === 'owner';
      }
      return false;
    });
  }, [tasks, members, userProfile]);

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

  // Sprint Velocity radial setup
  const sprintRingRadius = 20;
  const sprintRingCircumference = 2 * Math.PI * sprintRingRadius;
  const sprintRingStrokeDashoffset = sprintRingCircumference - (sprintPercentage / 100) * sprintRingCircumference;

  return (
    <div className="relative max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-12 overflow-visible">
      {/* Visual Ambient Glows */}
      <div className="absolute top-[5%] left-[-15%] w-[450px] h-[450px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[380px] h-[380px] bg-violet-600/5 rounded-full blur-[130px] pointer-events-none" />

      {/* Visually Stunning Header */}
      <header className="relative space-y-8 z-10">
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border-default/20 pb-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-primary/20 bg-primary/5 text-primary">
                Workspace Hub
              </div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground"
              >
                {greeting}, {displayName}
              </motion.h1>
            </div>

            {/* Premium User Portrait welcome indicator */}
            <div className="flex items-center gap-3 bg-surface/50 border border-border-default/45 p-3 rounded-2xl shadow-lg backdrop-blur-md shrink-0">
              <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-inner">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.fullName || 'User'} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {(userProfile?.fullName || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0 pr-2 leading-tight">
                <span className="text-sm font-extrabold text-foreground">{userProfile?.fullName}</span>
                <span className="text-[10px] text-text-muted mt-1">@{userProfile?.username || 'user'}</span>
                <span className="text-[9px] font-black uppercase text-primary mt-1.5 tracking-wider">{userProfile?.role}</span>
              </div>
            </div>
          </div>
          
          {/* Custom Metric Pills */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-border-default bg-surface/70 dark:bg-surface/50 backdrop-blur-md text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              {myTasks.length} Active Tasks
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-border-default bg-surface/70 dark:bg-surface/50 backdrop-blur-md text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {unreadCount} Action Items
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-border-default bg-surface/70 dark:bg-surface/50 backdrop-blur-md text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {sprintPercentage}% Sprint Progress
            </div>
          </div>
        </div>

        {/* Breathtaking Glass Focus Container */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-2xl bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl border border-border-default dark:border-border-strong rounded-2xl p-5 shadow-2xl overflow-hidden group"
        >
          {/* Inner glass accent shine */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-inner group-focus-within:bg-primary/25 transition-all">
              <Target className="h-4.5 w-4.5 shrink-0" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Focus Intent</p>
              <input
                type="text"
                placeholder="Declare your focus for today..."
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFocus();
                }}
                className="w-full bg-transparent border-none text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 p-0 font-medium mt-0.5"
              />
            </div>
            <AnimatePresence>
              {focusInput !== (userProfile?.focusStatus?.text || '') && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleSaveFocus}
                  disabled={savingFocus}
                  className="px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-bold hover:bg-foreground/90 transition-all shadow-md shrink-0 active:scale-95"
                >
                  {savingFocus ? 'Saving' : 'Sync Focus'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          {focusSavedNotif && (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-emerald-400 font-semibold mt-3"
            >
              Your active focus has been synced to the squad timeline.
            </motion.p>
          )}
        </motion.div>
      </header>

      {/* Two-Column Premium Glass Layout */}
      <div className="relative grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12 z-10">
        
        {/* Left Column: My Day (Execution Hub - 3/5) */}
        <section className="md:col-span-3 space-y-8">
          
          {/* Glassmorphic Core Focus Card */}
          <div className="backdrop-blur-2xl bg-surface/80 dark:bg-surface/50 border border-border-default dark:border-border-strong/75 rounded-3xl p-6 shadow-xl space-y-6 hover:shadow-2xl hover:border-primary/20 dark:hover:border-primary/45 transition-all duration-300">
            
            <div className="flex items-center justify-between border-b border-border-default/20 pb-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground">Core Execution Focus</h2>
                <p className="text-[11px] text-muted-foreground">Your high-priority tasks and sprint velocity progress</p>
              </div>
              
              {/* Glowing Radial Sprint Progress Gauge */}
              <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                <svg className="h-full w-full transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r={sprintRingRadius}
                    className="stroke-border-default/30"
                    strokeWidth="3.5"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="24"
                    cy="24"
                    r={sprintRingRadius}
                    className="stroke-emerald-400"
                    strokeWidth="3.5"
                    fill="transparent"
                    strokeDasharray={sprintRingCircumference}
                    initial={{ strokeDashoffset: sprintRingCircumference }}
                    animate={{ strokeDashoffset: sprintRingStrokeDashoffset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-[9px] font-bold text-foreground">{sprintPercentage}%</div>
              </div>
            </div>

            {tasksLoading ? (
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Assembling checklist...</span>
              </div>
            ) : coreTasks.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-border-default/30 rounded-2xl bg-bg-tertiary/10">
                <Check className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">Zero Friction Day</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">All high-priority tasks are completely cleared.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {coreTasks.map((task) => {
                  const priorityClass = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;
                  const isCompleting = completingTaskId === task.id;
                  
                  return (
                    <div 
                      key={task.id}
                      className="group flex items-center justify-between py-3.5 border-b border-border-default/15 last:border-0 hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          disabled={isCompleting}
                          className="h-4.5 w-4.5 rounded-full border border-border-default flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-all shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                          {isCompleting ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                          ) : (
                            <Check className="h-2.5 w-2.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                        <span className="text-sm font-semibold text-foreground/90 truncate group-hover:text-foreground transition-colors">
                          {task.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        {task.priority !== 'none' && (
                          <span className={cn("text-[8px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider", priorityClass)}>
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

            {/* Quick Task Creator Nested in Dashboard Card */}
            <form onSubmit={handleCreateQuickTask} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Insert new task due today..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="flex-1 bg-surface/30 border border-border-default rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-medium shadow-inner"
              />
              <button
                type="submit"
                disabled={!quickTaskTitle.trim() || creatingQuickTask}
                className="px-4 rounded-xl bg-foreground text-background text-xs font-bold hover:bg-foreground/95 transition-all flex items-center justify-center disabled:opacity-55 active:scale-95 shadow-md"
              >
                {creatingQuickTask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </form>
          </div>

          {/* Strategic Milestone Project Tracker Card */}
          {activeProject && (
            <div className="backdrop-blur-2xl bg-surface/80 dark:bg-surface/50 border border-border-default dark:border-border-strong/75 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:border-primary/20 dark:hover:border-primary/45 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-border-default/20 pb-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-foreground">Active Milestone Track</h2>
                  <p className="text-[11px] text-muted-foreground">High-level strategic updates from your assigned roadmap</p>
                </div>
                <span 
                  onClick={() => navigate('/projects')}
                  className="text-[10px] text-primary font-bold uppercase tracking-wider cursor-pointer hover:underline"
                >
                  Roadmaps
                </span>
              </div>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Workflow className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-foreground text-[13px]">{activeProject.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-bg-tertiary px-2 py-0.5 rounded border border-border-default">Active Roadmap</span>
                </div>
                
                {(() => {
                  const projTasks = tasks.filter(t => t.projectId === activeProject.id);
                  const completedProjTasks = projTasks.filter(t => t.status === 'done');
                  const percentage = projTasks.length > 0 ? Math.round((completedProjTasks.length / projTasks.length) * 100) : 0;
                  
                  return (
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-bg-tertiary/40 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-700 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 font-mono">
                        <span>{completedProjTasks.length} of {projTasks.length} milestones complete</span>
                        <span className="font-bold text-foreground">{percentage}% complete</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </section>

        {/* Right Column: The Pulse (Ambient connection - 2/5) */}
        <section className="md:col-span-2 space-y-8">
          
          {/* Ambient Team Presence Card */}
          <div className="backdrop-blur-2xl bg-surface/80 dark:bg-surface/50 border border-border-default dark:border-border-strong/75 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:border-primary/20 dark:hover:border-primary/45 transition-all duration-300">
            <div className="flex items-center justify-between border-b border-border-default/20 pb-4 mb-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground">Squad Co-Presence</h2>
                <p className="text-[11px] text-muted-foreground">Teammate live status indicators</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {displayedTeammates.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 italic text-center">Solo mode. Invite teammates to connect.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
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
                        "relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-md border-2 border-surface hover:scale-105 active:scale-95 transition-all cursor-pointer",
                        targetProfileAccess ? "cursor-pointer" : "cursor-default"
                      )}
                      style={{ background: `hsl(${avatarHue(member.uid)} 65% 45%)` }}
                      title={`${member.fullName} ${hasFocus ? `· Focus: ${member.focusStatus!.text}` : ''}`}
                    >
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.fullName} className="h-full w-full object-cover rounded-full" />
                      ) : (
                        initials
                      )}
                      {/* Premium breathing green status light */}
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-surface border-2 border-surface flex items-center justify-center shadow-md">
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isOnline ? "bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse" : "bg-zinc-500"
                        )} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Approvals / Reviews Stream (Managers & Approvers) */}
          {(pendingRequests.length > 0 || reviewTasksForTeam.length > 0 || tasksAwaitingApproval.length > 0) && (
            <div className="backdrop-blur-2xl bg-surface/80 dark:bg-surface/50 border border-border-default dark:border-border-strong/75 rounded-3xl p-6 shadow-xl space-y-4 hover:shadow-2xl hover:border-primary/20 dark:hover:border-primary/45 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-border-default/20 pb-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-foreground">Inbox Approvals</h2>
                  <p className="text-[11px] text-muted-foreground">Items requiring your active sign-off</p>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold">
                  {pendingRequests.length + reviewTasksForTeam.length + tasksAwaitingApproval.length} Pending
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Requests */}
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 border border-border-default rounded-2xl bg-bg-tertiary/10 space-y-3 hover:border-primary/20 transition-all shadow-sm">
                    <div>
                      <p className="text-xs font-bold text-foreground truncate">{req.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Submitted by {req.creatorName}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'approved', userProfile!.uid, userProfile!.fullName, userProfile!.username, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-bold hover:bg-foreground/90 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'rejected', userProfile!.uid, userProfile!.fullName, userProfile!.username, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1.5 rounded-lg border border-border-default hover:bg-bg-tertiary/10 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}

                {/* Manager reviews */}
                {reviewTasksForTeam.map((task) => {
                  const assigneeName = task.assigneeIds.map(id => memberMap.get(id)?.fullName).filter(Boolean).join(', ');
                  return (
                    <div key={task.id} className="p-4 border border-border-default rounded-2xl bg-bg-tertiary/10 space-y-3 hover:border-primary/20 transition-all shadow-sm">
                      <div>
                        <p className="text-xs font-bold text-foreground line-clamp-1">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Task review for {assigneeName}</p>
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
                          className="flex-1 py-1.5 rounded-lg border border-border-default hover:bg-bg-tertiary/10 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
                        >
                          Needs Changes
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Task Creation Approvals */}
                {tasksAwaitingApproval.map((task) => {
                  const creatorName = members.find(m => m.uid === task.creatorId)?.fullName || 'Teammate';
                  return (
                    <div key={task.id} className="p-4 border border-border-default rounded-2xl bg-bg-tertiary/10 space-y-3 hover:border-primary/20 transition-all shadow-sm">
                      <div>
                        <p className="text-xs font-bold text-foreground line-clamp-1">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Task creation approval for {creatorName}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const actionActor = { uid: userProfile!.uid, name: userProfile!.fullName };
                            await updateTask(task.id, orgId!, { approved: true } as any, actionActor);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-bold hover:bg-foreground/90 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            await deleteTask(task.id);
                          }}
                          className="flex-1 py-1.5 rounded-lg border border-border-default hover:bg-bg-tertiary/10 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ambient Timeline Card */}
          <div className="backdrop-blur-2xl bg-surface/80 dark:bg-surface/50 border border-border-default dark:border-border-strong/75 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:border-primary/20 dark:hover:border-primary/45 transition-all duration-300">
            <div className="flex items-center justify-between border-b border-border-default/20 pb-4 mb-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-foreground">Ambient Activity</h2>
                <p className="text-[11px] text-muted-foreground">Chronological updates from the team</p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">No recent activity.</p>
            ) : (
              <div className="relative pl-3 space-y-6">
                {/* Custom timeline bar */}
                <div className="absolute left-1.5 top-2 bottom-2 w-[1px] bg-border-default/30" />
                
                {recentActivity.map(({ task, actor }) => (
                  <div 
                    key={task.id}
                    onClick={() => navigate(`/tasks?task=${task.id}`)}
                    className="relative flex gap-3 text-xs leading-relaxed group cursor-pointer"
                  >
                    {/* Glowing timeline dot */}
                    <div className="absolute -left-[14.5px] top-1.5 h-2 w-2 rounded-full border border-surface bg-border-default/80 group-hover:bg-primary group-hover:shadow-[0_0_4px_#3b82f6] transition-all" />
                    
                    <div className="h-6 w-6 rounded bg-gradient-to-br from-bg-tertiary to-surface border border-border-default flex items-center justify-center font-bold text-[8px] text-muted-foreground group-hover:border-primary/20 transition-all shrink-0 overflow-hidden">
                      {memberMap.get(actor)?.photoURL ? (
                        <img src={memberMap.get(actor)!.photoURL} alt={getMemberName(actor)} className="h-full w-full object-cover" />
                      ) : (
                        getMemberInitials(actor)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-muted-foreground/95 font-medium">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {getMemberName(actor)}
                        </span>{' '}
                        {STATUS_LABEL_MUTED[task.status] || 'updated'}{' '}
                        <span className="text-foreground font-semibold truncate max-w-[120px] inline-block align-bottom">
                          "{task.title}"
                        </span>
                      </p>
                      <span className="text-[10px] text-muted-foreground/50 font-mono block mt-0.5">
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
