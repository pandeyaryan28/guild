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
  Share2
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
import { updateUserProfile, type UserProfile, type Organization } from '../../lib/firestore';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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

  const [org, setOrg] = React.useState<Organization | null>(null);
  const [loadingOrg, setLoadingOrg] = React.useState(true);

  React.useEffect(() => {
    if (!orgId) {
      setOrg(null);
      setLoadingOrg(false);
      return;
    }
    setLoadingOrg(true);
    const unsub = onSnapshot(
      doc(db, 'organizations', orgId),
      (snap) => {
        if (snap.exists()) {
          setOrg({ ...snap.data(), id: snap.id } as Organization);
        } else {
          setOrg(null);
        }
        setLoadingOrg(false);
      },
      (err) => {
        console.error('Failed to load organization in DashboardControl:', err);
        setOrg(null);
        setLoadingOrg(false);
      }
    );
    return unsub;
  }, [orgId]);

  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { teams } = useTeams(orgId);
  const { projects } = useProjects(orgId);
  const members = useOrgMembers(orgId);
  const { received: receivedRequests } = useRequests(orgId);
  const pendingRequests = receivedRequests.filter((r) => r.status === 'pending');

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

  const activeProject = projects[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userProfile?.fullName?.split(' ')[0] ?? 'Teammate';

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 animate-fluid-pop">
      
      {/* Dynamic PWA Install Prompter CTA */}
      <AnimatePresence>
        {isInstallable && !isStandalone && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="aether-glass p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/5 dark:border-white/5 bg-white/[0.03] dark:bg-black/[0.15] shadow-lg relative overflow-hidden"
            style={{ borderRadius: '16px' }}
          >
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3.5 z-10 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <Download className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Install Guild</h3>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">Run in a borderless window for instant access, real-time operations, and flawless offline work.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 z-10 shrink-0 self-end sm:self-auto">
              {isIOS ? (
                <div className="text-[9px] font-bold text-muted-foreground flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                  <Share2 className="w-3 h-3 text-primary shrink-0" />
                  <span>Tap Safari Share &rarr; <b>"Add to Home Screen"</b></span>
                </div>
              ) : (
                <button
                  onClick={install}
                  className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-[10px] font-black tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  INSTALL APP
                </button>
              )}

              <button
                onClick={dismiss}
                title="Dismiss"
                className="h-7 w-7 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner: Greeting & Avatars Redesigned (Aurora Horizon Style) */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-cyan-500/15 p-6 md:p-8 backdrop-blur-xl shadow-2xl animate-aurora-mesh animate-fluid-pop">
        {/* Absolute glowing blur spots behind content for rich visuals */}
        <div className="absolute -left-16 -top-16 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            {/* Dual Profile Stack with Liquid Morphs */}
            <div className="flex items-center shrink-0">
              <div className="relative z-10 shrink-0">
                <button 
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-16 h-16 flex items-center justify-center relative cursor-pointer shadow-xl ring-4 ring-primary/20 bg-background animate-morph-user overflow-hidden border-2 border-white/20 z-10"
                  style={{ background: `hsl(${avatarHue(userProfile?.uid || '')} 55% 45%)` }}
                  title="Click to change your availability status"
                >
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.fullName || 'User'} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-black text-white">{myInitials}</span>
                  )}
                  {/* Availability status dot indicator */}
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background flex items-center justify-center shadow-lg border border-white/10 z-20">
                    <span className={cn(
                      "h-3 w-3 rounded-full",
                      currentStatus === 'focus' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" :
                      currentStatus === 'away' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" :
                      "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    )} />
                  </span>
                </button>

                {/* Custom Premium Availability dropdown */}
                <AnimatePresence>
                  {statusDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setStatusDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute left-0 mt-3.5 w-48 aether-glass-elevated p-1.5 shadow-2xl z-50 border border-white/10 bg-background/95 rounded-2xl backdrop-blur-xl"
                      >
                        <div className="px-3 py-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5 mb-1.5">
                          Set availability
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('active')}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-white/5 transition-all",
                            currentStatus === 'active' ? "text-foreground bg-white/5" : "text-muted-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                          <span>Active / Online</span>
                          {currentStatus === 'active' && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('focus')}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-white/5 transition-all",
                            currentStatus === 'focus' ? "text-foreground bg-white/5" : "text-muted-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                          <span>Focus / Muted</span>
                          {currentStatus === 'focus' && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('away')}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-white/5 transition-all",
                            currentStatus === 'away' ? "text-foreground bg-white/5" : "text-muted-foreground"
                          )}
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                          <span>Away / Idle</span>
                          {currentStatus === 'away' && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Organization Logo */}
              {loadingOrg ? (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/[0.02] border border-white/10 -ml-3 animate-pulse shadow-xl shrink-0" />
              ) : org && (
                <div 
                  className="w-16 h-16 flex items-center justify-center font-black text-white text-base border-2 border-white/20 relative overflow-hidden -ml-3 shadow-xl z-0 animate-morph-org bg-accent/25"
                  style={!org.photoURL ? {
                    background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                  } : undefined}
                  title={`Workspace: ${org.name}`}
                >
                  {org.photoURL ? (
                    <img src={org.photoURL} alt={org.name} className="h-full w-full object-cover" />
                  ) : (
                    org.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'O'
                  )}
                </div>
              )}
            </div>

            {/* Text Info - Clearly Separated Layout */}
            <div className="space-y-2.5 min-w-0 flex-1 ml-2">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full inline-block">
                  User Profile
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight tracking-tight truncate">
                  {userProfile?.fullName || displayName}
                </h1>
              </div>
              
              {org && (
                <div className="pt-2 border-t border-white/5 flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    Active Workspace
                  </span>
                  <p className="text-xs md:text-sm font-bold text-foreground truncate">
                    {org.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Daily Focus Goal Widget Redesigned */}
      <section className="aether-glass p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/5 bg-white/[0.02] dark:bg-black/[0.15] shadow-lg rounded-2xl relative overflow-hidden">
        {/* Subtle blur background spot */}
        <div className="absolute -left-10 -top-10 w-24 h-24 rounded-full bg-primary/10 blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-3.5 flex-1 min-w-0 z-10">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Target className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-[9px] font-black text-primary uppercase tracking-widest block leading-none">
              Today's Main Goal
            </label>
            <input 
              type="text" 
              placeholder="What is your focus for today? Declare it here..."
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFocus();
              }}
              className="bg-transparent border-none w-full p-0 text-sm font-semibold placeholder:text-muted-foreground/50 text-foreground focus:ring-0 focus:outline-none mt-1.5"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto z-10">
          <AnimatePresence>
            {focusInput.trim() !== (userProfile?.focusStatus?.text || '') && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={handleSaveFocus}
                disabled={savingFocus}
                className="px-4.5 py-2 rounded-xl bg-foreground text-background text-xs font-black tracking-wider hover:bg-foreground/90 transition-all cursor-pointer shadow-md active:scale-98"
              >
                {savingFocus ? 'SAVING...' : 'SYNC OBJECTIVE'}
              </motion.button>
            )}
          </AnimatePresence>
          
          {focusSavedNotif && (
            <span className="text-xs text-emerald-500 font-extrabold px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fluid-pop">
              Goal Updated!
            </span>
          )}
        </div>
      </section>

      {/* Main Content Grid: 2 Clean Balanced Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Personal Actions & Operations */}
        <div className="space-y-8">
          
          {/* Tasks Container */}
          <section className="aether-glass aether-glass-interactive p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h2 className="text-sm font-bold text-foreground">My Tasks</h2>
              <span className="px-2 py-0.5 rounded-md border border-white/10 dark:border-white/5 bg-white/5 text-[10px] font-bold text-muted-foreground">
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
              <div className="py-8 text-center border border-dashed border-white/10 dark:border-white/5 rounded-2xl bg-white/[0.01] dark:bg-black/[0.1] backdrop-blur-sm">
                <Check className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-bold text-foreground block">All tasks completed</span>
                <span className="text-[10px] text-muted-foreground/80 mt-0.5 block">You are fully cleared for today.</span>
              </div>
            ) : (
              <div className="space-y-1">
                {myTasks.map((task) => {
                  const badgeClass = PRIORITY_BADGES[task.priority] || '';
                  const isCompleting = completingTaskId === task.id;

                  return (
                    <div 
                      key={task.id}
                      className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          disabled={isCompleting}
                          className="w-4 h-4 rounded-md border border-white/20 dark:border-white/15 flex items-center justify-center hover:border-foreground hover:bg-white/10 dark:hover:bg-white/10 transition-all shrink-0 cursor-pointer"
                        >
                          {isCompleting ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
                          ) : (
                            <Check className="w-2.5 h-2.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                        <span className="text-xs font-medium text-foreground truncate">{task.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority !== 'none' && (
                          <span className={cn("text-[9px] px-1.5 py-0.2 rounded border font-semibold uppercase tracking-wider", badgeClass)}>
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
                placeholder="Add a task due today..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="flex-1 aether-glass-input px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none font-medium"
              />
              <button
                type="submit"
                disabled={!quickTaskTitle.trim() || creatingQuickTask}
                className="px-3 rounded-lg bg-foreground text-background text-xs font-bold hover:bg-foreground/90 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {creatingQuickTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </form>
          </section>

          {/* Approvals & Reviews Section */}
          <section className="aether-glass aether-glass-interactive p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h2 className="text-sm font-bold text-foreground">Approvals</h2>
              {pendingRequests.length + (isManager ? reviewTasksForTeam.length : 0) > 0 && (
                <span className="px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  {pendingRequests.length + (isManager ? reviewTasksForTeam.length : 0)} pending
                </span>
              )}
            </div>

            {(pendingRequests.length === 0 && (!isManager || reviewTasksForTeam.length === 0)) ? (
              <div className="py-8 text-center bg-white/[0.01] dark:bg-black/[0.1] border border-dashed border-white/10 dark:border-white/5 rounded-2xl backdrop-blur-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-bold text-foreground block">Approvals Cleared</span>
                <span className="text-[10px] text-muted-foreground/80 mt-0.5 block">No pending requests require your sign-off.</span>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Approval Requests */}
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 backdrop-blur-sm space-y-3">
                    <div>
                      <span className="text-xs font-bold text-foreground block truncate">{req.title}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Submitted by {req.creatorName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'approved', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-gradient-to-b from-indigo-500/90 to-indigo-600/90 hover:brightness-105 text-white text-[10px] font-bold border-t border-white/20 shadow-md active:scale-98 transition-all cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'rejected', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 bg-white/5 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
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
                    <div key={task.id} className="p-4 rounded-2xl border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 backdrop-blur-sm space-y-3">
                      <div>
                        <span className="text-xs font-bold text-foreground block truncate">{task.title}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">Task review for {assigneeName}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewAction(task, 'approve')}
                          className="flex-1 py-1.5 rounded-xl bg-gradient-to-b from-indigo-500/90 to-indigo-600/90 hover:brightness-105 text-white text-[10px] font-bold border-t border-white/20 shadow-md active:scale-98 transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewAction(task, 'reject')}
                          className="flex-1 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 bg-white/5 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
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
        <div className="space-y-8">
          
          {/* Team Focus Section */}
          <section className="aether-glass aether-glass-interactive p-6 space-y-4 self-start">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h2 className="text-sm font-bold text-foreground">Team Focus</h2>
              <span className="px-2 py-0.5 rounded-md border border-white/10 dark:border-white/5 bg-white/5 text-[10px] font-bold text-muted-foreground">
                {teammates.length} members
              </span>
            </div>

            {teammates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 italic">You are not part of any team.</p>
            ) : (
              <div className="space-y-4">
                {teammates.map((member) => {
                  const hasFocus = !!member.focusStatus?.text;
                  const initials = avatarInitials(member.fullName || member.username || '?');
                  
                  return (
                    <div key={member.uid} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 transition-colors">
                      
                      {/* Teammate Icon */}
                      <div 
                        className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 border border-white/10 relative"
                        style={{ background: `hsl(${avatarHue(member.uid)} 55% 45%)` }}
                      >
                        {member.photoURL ? (
                          <img src={member.photoURL} alt={member.fullName} className="h-full w-full object-cover rounded-full" />
                        ) : (
                          <span className="text-xs font-bold text-white">{initials}</span>
                        )}
                        {/* Active Indicator dot */}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-surface flex items-center justify-center shadow-sm">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            member.availabilityStatus === 'focus' ? "bg-red-500" :
                            member.availabilityStatus === 'away' ? "bg-amber-500" :
                            member.availabilityStatus === 'active' ? "bg-emerald-500" :
                            hasFocus ? "bg-emerald-500" : "bg-zinc-300"
                          )} />
                        </span>
                      </div>

                      {/* Teammate Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground block truncate">{member.fullName}</span>
                          <span className="text-[9px] text-muted-foreground shrink-0">{member.role || 'Member'}</span>
                        </div>
                        
                        {hasFocus ? (
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 italic line-clamp-2">
                            "{member.focusStatus!.text}"
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">
                            No daily goal declared
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
          <section className="aether-glass aether-glass-interactive p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-3">
              <h2 className="text-sm font-bold text-foreground">New Messages</h2>
              {unreadChannels.length + unreadDMs.length > 0 && (
                <span className="px-2 py-0.5 rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                  {unreadChannels.length + unreadDMs.length} unread
                </span>
              )}
            </div>

            {unreadChannels.length === 0 && unreadDMs.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground italic">All caught up! No unread messages.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto aether-scroll pr-1">
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
                      className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* DM Initial Avatar */}
                        <div 
                          className="w-7 h-7 flex items-center justify-center rounded-full shrink-0 border border-white/5"
                          style={{ background: `hsl(${avatarHue(otherUid || '')} 55% 45%)` }}
                        >
                          {otherMember?.photoURL ? (
                            <img src={otherMember.photoURL} alt={name} className="h-full w-full object-cover rounded-full" />
                          ) : (
                            <span className="text-[10px] font-black text-white">{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">{name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate italic mt-0.5">
                            "{thread.lastMessage || 'Sent a message'}"
                          </span>
                        </div>
                      </div>

                      <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)] shrink-0 ml-2" />
                    </div>
                  );
                })}

                {/* Unread Channels */}
                {unreadChannels.map((channel) => {
                  return (
                    <div 
                      key={channel.id}
                      onClick={() => navigate(`/chat/c/${channel.id}`)}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 text-muted-foreground shrink-0">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-foreground block truncate">#{channel.name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate italic mt-0.5">
                            {channel.lastMessagePreview ? `"${channel.lastMessagePreview}"` : 'New activity'}
                          </span>
                        </div>
                      </div>

                      <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)] shrink-0 ml-2" />
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
