import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Loader2, 
  Check, 
  Target, 
  Briefcase,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Hash,
  Download,
  X,
  Share2,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../../hooks/useAuth';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useTasks } from '../../hooks/useTasks';
import { useOrgMembers, useChannels, useDMs } from '../../hooks/useChat';
import { useNotifications } from '../../hooks/useNotifications';
import { useRequests } from '../../hooks/useRequests';
import { useTeams } from '../../hooks/useTeams';
import { useProjects } from '../../hooks/useProjects';
import { updateRequestStatus } from '../../lib/requests';
import { type Task, moveTask, createTask } from '../../lib/tasks';
import { updateUserProfile, type UserProfile } from '../../lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';
import { avatarInitials, avatarHue } from '../MemberProfileDrawer';
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

const PRIORITY_BADGES: Record<string, string> = {
  urgent: 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900/30 dark:bg-red-950/20',
  high:   'text-orange-600 border-orange-200 bg-orange-50 dark:text-orange-400 dark:border-orange-900/30 dark:bg-orange-950/20',
  medium: 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-900/30 dark:bg-blue-950/20',
  low:    'text-zinc-600 border-zinc-200 bg-zinc-50 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50',
};

export function DashboardControl() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { isInstallable, isStandalone, isDismissed, isIOS, install, dismiss } = usePwaInstall();

  const workspaceData = useWorkspaceData();
  const org = workspaceData?.org ?? null;
  const loadingOrg = workspaceData ? workspaceData.orgLoading : false;

  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams } = useTeams(orgId);
  const { projects } = useProjects(orgId);
  const members = useOrgMembers(orgId);
  const { received: receivedRequests } = useRequests(orgId);
  const pendingRequests = React.useMemo(
    () =>
      receivedRequests.filter(
        (r) =>
          r.status === 'pending' &&
          (userProfile?.role === 'owner' || org?.ownerId === userProfile?.uid || r.creatorId !== userProfile?.uid)
      ),
    [receivedRequests, userProfile?.role, userProfile?.uid, org?.ownerId]
  );

  // Chat notification hooks & states
  const { channels, hasUnread: channelHasUnread } = useChannels(orgId);
  const { threads, hasUnreadDM } = useDMs(orgId);

  const unreadChannels = React.useMemo(() => {
    return channels.filter(c => channelHasUnread(c));
  }, [channels, channelHasUnread]);

  const unreadDMs = React.useMemo(() => {
    return threads.filter(t => hasUnreadDM(t));
  }, [threads, hasUnreadDM]);

  // Focus goal states
  const [focusInput, setFocusInput] = React.useState(userProfile?.focusStatus?.text || '');
  const [savingFocus, setSavingFocus] = React.useState(false);
  const [focusSavedNotif, setFocusSavedNotif] = React.useState(false);

  // Status picker states
  const [statusDropdownOpen, setStatusDropdownOpen] = React.useState(false);
  const currentStatus = userProfile?.availabilityStatus || 'active';
  const myInitials = avatarInitials(userProfile?.fullName || userProfile?.username || '?');

  const handleUpdateStatus = async (status: 'active' | 'focus' | 'away') => {
    if (!userProfile?.uid) return;
    try {
      await updateUserProfile(userProfile.uid, {
        availabilityStatus: status
      });
      setStatusDropdownOpen(false);
    } catch (err) {
      console.error('Failed to update availability status:', err);
    }
  };

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
          text: focusInput.trim(),
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

  // Teammates online list (excluding self, strictly showing own team members only)
  const teammates = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    
    // Find all teams where the current user is a member OR the manager
    const myTeamsList = teams.filter(t => 
      t.memberIds?.includes(userProfile.uid) || t.managerId === userProfile.uid
    );
    
    // Get all unique member UIDs from these teams, plus their managers, excluding the current user
    const ids = new Set<string>();
    myTeamsList.forEach(t => {
      t.memberIds?.forEach(id => {
        if (id !== userProfile.uid) ids.add(id);
      });
      if (t.managerId && t.managerId !== userProfile.uid) {
        ids.add(t.managerId);
      }
    });
    
    return members.filter(m => ids.has(m.uid));
  }, [members, teams, userProfile?.uid]);

  // Personal tasks
  const myTasks = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    return tasks.filter((t) => t.assigneeIds.includes(userProfile.uid) && t.status !== 'done' && t.status !== 'review');
  }, [tasks, userProfile?.uid]);

  // Manager settings
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

  // Handle task review action
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
    if (!quickTaskTitle.trim() || !orgId || !actor.uid || creatingQuickTask) return;
    setCreatingQuickTask(true);
    try {
      await createTask({
        orgId,
        title: quickTaskTitle.trim(),
        status: 'todo',
        assigneeIds: [actor.uid],
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

  const activeProject = projects[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userProfile?.fullName?.split(' ')[0] ?? 'Teammate';

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2 animate-fluid-pop">
      
      {/* Dynamic PWA Install Prompter CTA */}
      <AnimatePresence>
        {isInstallable && !isStandalone && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border rounded-2xl shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-foreground leading-none">Install Guild</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">Run in a dedicated window for instant access and real-time operations.</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
              {isIOS ? (
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 bg-secondary border border-border px-3 py-1.5 rounded-xl">
                  <Share2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Tap Share &rarr; <b>Add to Home Screen</b></span>
                </div>
              ) : (
                <button
                  onClick={install}
                  className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                >
                  Install App
                </button>
              )}

              <button
                onClick={dismiss}
                title="Dismiss"
                className="h-7 w-7 rounded-lg border border-border bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-20 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 md:gap-6 flex-1 min-w-0">
            {/* 1. Organization Block */}
            {loadingOrg ? (
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-secondary border border-border animate-pulse shrink-0" />
                <div className="h-5 w-28 bg-secondary rounded-md animate-pulse shrink-0" />
              </div>
            ) : org && (
              <div className="flex items-center gap-3.5 min-w-0">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-primary-foreground text-sm border border-border relative overflow-hidden shrink-0 bg-primary"
                  title={`Workspace: ${org.name}`}
                >
                  {org.photoURL ? (
                    <img src={org.photoURL} alt={org.name} className="h-full w-full object-cover" />
                  ) : (
                    org.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'O'
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-muted-foreground block">Workspace</span>
                  <span className="text-lg font-bold text-foreground block truncate select-none leading-tight">
                    {org.name}
                  </span>
                </div>
              </div>
            )}

            {/* Separator Line (desktop only) */}
            {org && (
              <div className="hidden sm:block h-9 w-px bg-border shrink-0" />
            )}

            {/* 2. User Block */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <button 
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-11 h-11 rounded-full flex items-center justify-center relative cursor-pointer overflow-hidden border border-border z-10 active:scale-[0.98] transition-transform"
                  style={{ background: `hsl(${avatarHue(userProfile?.uid || '')} 55% 45%)` }}
                  title="Click to change your availability status"
                >
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.fullName || 'User'} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white">{myInitials}</span>
                  )}
                </button>
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-surface flex items-center justify-center border border-border z-20 pointer-events-none">
                  <span className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    currentStatus === 'focus' ? "bg-red-500" :
                    currentStatus === 'away' ? "bg-amber-500" :
                    "bg-emerald-500"
                  )} />
                </span>

                {/* Availability dropdown */}
                <AnimatePresence>
                  {statusDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setStatusDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        className="absolute left-0 mt-2 w-48 p-1.5 shadow-xl z-50 border border-border bg-surface rounded-2xl"
                      >
                        <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border mb-1">
                          Availability
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('active')}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-secondary transition-colors",
                            currentStatus === 'active' ? "text-foreground bg-secondary" : "text-muted-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span>Active / Online</span>
                          {currentStatus === 'active' && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('focus')}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-secondary transition-colors",
                            currentStatus === 'focus' ? "text-foreground bg-secondary" : "text-muted-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span>Focus / Muted</span>
                          {currentStatus === 'focus' && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('away')}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs font-medium rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-secondary transition-colors",
                            currentStatus === 'away' ? "text-foreground bg-secondary" : "text-muted-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          <span>Away / Idle</span>
                          {currentStatus === 'away' && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium text-muted-foreground block">{greeting}</span>
                <h1 className="text-lg font-bold text-foreground block truncate leading-tight select-none">
                  {userProfile?.fullName || displayName}
                </h1>
              </div>
            </div>
          </div>

          {/* Right side CTA: Admin panel button (for owners/admins) */}
          {(userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
            <a
              href="https://admin.guildorbit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all active:scale-[0.98] shrink-0 border border-border cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Admin Console</span>
            </a>
          )}
        </div>
      </header>

      {/* Daily Focus Goal Widget */}
      <section className="bg-surface p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border shadow-sm rounded-2xl">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[11px] font-medium text-muted-foreground block leading-none">
              Current Focus
            </label>
            <input 
              type="text" 
              placeholder="What are you working on right now?"
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFocus();
              }}
              className="bg-transparent border-none w-full p-0 text-sm font-medium placeholder:text-muted-foreground/60 text-foreground focus:ring-0 focus:outline-none mt-1"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <AnimatePresence>
            {focusInput.trim() !== (userProfile?.focusStatus?.text || '') && (
              <motion.button
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onClick={handleSaveFocus}
                disabled={savingFocus}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer active:scale-[0.98]"
              >
                {savingFocus ? 'Saving...' : 'Update Focus'}
              </motion.button>
            )}
          </AnimatePresence>
          
          {focusSavedNotif && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Saved
            </span>
          )}
        </div>
      </section>

      {/* Main Content Grid: 2 Clean Balanced Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Personal Actions & Operations */}
        <div className="space-y-6">
          
          {/* Tasks Container */}
          <section className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold text-foreground">My Tasks</h2>
              <span className="text-xs font-medium text-muted-foreground">
                {myTasks.length} active
              </span>
            </div>

            {/* Tasks list */}
            {tasksLoading ? (
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Loading tasks...</span>
              </div>
            ) : myTasks.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border rounded-xl bg-secondary/30">
                <Check className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-foreground block">All tasks completed</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">You are cleared for today.</span>
              </div>
            ) : (
              <div className="space-y-1">
                {myTasks.map((task) => {
                  const badgeClass = PRIORITY_BADGES[task.priority] || '';
                  const isCompleting = completingTaskId === task.id;

                  return (
                    <div 
                      key={task.id}
                      onClick={() => navigate(`/workspace?task=${task.id}`)}
                      className="group flex items-center justify-between py-2 px-3 rounded-xl hover:bg-secondary/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleComplete(task);
                          }}
                          disabled={isCompleting}
                          title="Mark complete"
                          className="w-4 h-4 rounded-md border border-border-strong flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-colors shrink-0 cursor-pointer"
                        >
                          {isCompleting ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
                          ) : (
                            <Check className="w-2.5 h-2.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                        <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority && task.priority !== 'none' && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md border font-medium capitalize", badgeClass)}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Task input fields */}
            <form onSubmit={handleCreateQuickTask} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add a task for yourself..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="flex-1 h-9 rounded-xl border border-border bg-secondary/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              />
              <button
                type="submit"
                disabled={!quickTaskTitle.trim() || creatingQuickTask}
                aria-label="Add quick task"
                className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer active:scale-[0.98]"
              >
                {creatingQuickTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </form>
          </section>

          {/* Approvals & Reviews Section */}
          <section className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold text-foreground">Approvals</h2>
              <span className="text-xs font-medium text-muted-foreground">
                {pendingRequests.length + (isManager ? reviewTasksForTeam.length : 0)} pending
              </span>
            </div>

            {(pendingRequests.length === 0 && (!isManager || reviewTasksForTeam.length === 0)) ? (
              <div className="py-8 text-center bg-secondary/30 border border-dashed border-border rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-foreground block">Approvals Cleared</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">No pending requests require your sign-off.</span>
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* Approval Requests */}
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
                    <div
                      onClick={() => navigate('/requests')}
                      className="cursor-pointer group"
                    >
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block truncate">
                        {req.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Submitted by {req.creatorName}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'approved', userProfile!.uid, userProfile!.fullName, userProfile!.username, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'rejected', userProfile!.uid, userProfile!.fullName, userProfile!.username, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1.5 rounded-lg border border-border hover:bg-secondary bg-surface text-xs font-semibold text-foreground transition-all cursor-pointer active:scale-[0.98]"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}

                {/* Task Reviews for Managers */}
                {isManager && reviewTasksForTeam.map((task) => {
                  const assigneeName = task.assigneeIds.map(id => memberMap.get(id)?.fullName).filter(Boolean).join(', ');
                  return (
                    <div key={task.id} className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-3">
                      <div
                        onClick={() => navigate(`/workspace?task=${task.id}`)}
                        className="cursor-pointer group"
                      >
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block truncate">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          Task review for {assigneeName || 'teammate'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewAction(task, 'approve')}
                          className="flex-1 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewAction(task, 'reject')}
                          className="flex-1 py-1.5 rounded-lg border border-border hover:bg-secondary bg-surface text-xs font-semibold text-foreground transition-all cursor-pointer active:scale-[0.98]"
                        >
                          Needs Changes
                        </button>
                      </div>
                    </div>
                  );
                })}

              </div>
            )}
          </section>

        </div>

        {/* Right Column: Teammate Focus & Direct Conversations */}
        <div className="space-y-6">
          
          {/* Team Focus Section */}
          <section className="bg-surface border border-border rounded-2xl p-5 space-y-4 self-start shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold text-foreground">Team Focus</h2>
              <span className="text-xs font-medium text-muted-foreground">
                {teammates.length} members
              </span>
            </div>

            {teammates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No team members assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {teammates.map((member) => {
                  const hasFocus = !!member.focusStatus?.text;
                  const initials = avatarInitials(member.fullName || member.username || '?');
                  
                  return (
                    <div key={member.uid} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors">
                      
                      {/* Teammate Icon */}
                      <div 
                        className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 border border-border relative"
                        style={{ background: `hsl(${avatarHue(member.uid)} 55% 45%)` }}
                      >
                        {member.photoURL ? (
                          <img src={member.photoURL} alt={member.fullName} className="h-full w-full object-cover rounded-full" />
                        ) : (
                          <span className="text-[11px] font-bold text-white">{initials}</span>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-surface flex items-center justify-center">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            member.availabilityStatus === 'focus' ? "bg-red-500" :
                            member.availabilityStatus === 'away' ? "bg-amber-500" :
                            member.availabilityStatus === 'active' ? "bg-emerald-500" :
                            hasFocus ? "bg-emerald-500" : "bg-muted-foreground/40"
                          )} />
                        </span>
                      </div>

                      {/* Teammate Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground block truncate">{member.fullName}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0 capitalize">{member.role || 'member'}</span>
                        </div>
                        
                        {hasFocus ? (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {member.focusStatus!.text}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                            No focus status set
                          </p>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* New Messages Section */}
          <section className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold text-foreground">New Messages</h2>
              <span className="text-xs font-medium text-muted-foreground">
                {unreadChannels.length + unreadDMs.length} unread
              </span>
            </div>

            {unreadChannels.length === 0 && unreadDMs.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground">All caught up. No unread messages.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto aether-scroll pr-1">
                {/* Unread DMs */}
                {unreadDMs.map((thread) => {
                  const otherUid = thread.participants.find(id => id !== userProfile?.uid);
                  const otherMember = otherUid ? memberMap.get(otherUid) : null;
                  const name = otherMember?.fullName || 'Teammate';
                  const initials = avatarInitials(name);

                  return (
                    <div 
                      key={thread.id}
                      onClick={() => navigate(`/chat/dm/${thread.id}`)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* DM Initial Avatar */}
                        <div 
                          className="w-7 h-7 flex items-center justify-center rounded-full shrink-0 border border-border"
                          style={{ background: `hsl(${avatarHue(otherUid || '')} 55% 45%)` }}
                        >
                          {otherMember?.photoURL ? (
                            <img src={otherMember.photoURL} alt={name} className="h-full w-full object-cover rounded-full" />
                          ) : (
                            <span className="text-[10px] font-bold text-white">{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">{name}</span>
                          <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                            {thread.lastMessage || 'Sent a message'}
                          </span>
                        </div>
                      </div>

                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 ml-2" />
                    </div>
                  );
                })}

                {/* Unread Channels */}
                {unreadChannels.map((channel) => {
                  return (
                    <div 
                      key={channel.id}
                      onClick={() => navigate(`/chat/c/${channel.id}`)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary border border-border text-muted-foreground shrink-0">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">#{channel.name}</span>
                          <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                            {channel.lastMessagePreview || 'New activity'}
                          </span>
                        </div>
                      </div>

                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 ml-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  );
}
