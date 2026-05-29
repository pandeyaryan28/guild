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
  Hash
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../../hooks/useAuth';
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

  // Teammates online list (excluding self)
  const teammates = React.useMemo(() => {
    return members.filter(m => m.uid !== userProfile?.uid);
  }, [members, userProfile?.uid]);

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
      
      {/* Top Banner: Greeting & Daily Focus Goal */}
      <header className="aether-glass p-6 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <button 
              type="button"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-full shrink-0 border border-white/10 relative cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm"
              style={{ background: `hsl(${avatarHue(userProfile?.uid || '')} 55% 45%)` }}
              title="Click to change your availability status"
            >
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.fullName || 'User'} className="h-full w-full object-cover rounded-full" />
              ) : (
                <span className="text-xs font-black text-white">{myInitials}</span>
              )}
              {/* Availability status dot indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-surface dark:bg-zinc-950 flex items-center justify-center shadow-sm">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  currentStatus === 'focus' ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" :
                  currentStatus === 'away' ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" :
                  "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                )} />
              </span>
            </button>

            {/* Custom Premium Availability dropdown */}
            <AnimatePresence>
              {statusDropdownOpen && (
                <>
                  {/* Backdrop to close click-outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setStatusDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute left-0 mt-2.5 w-44 aether-glass bg-surface/95 dark:bg-zinc-900/95 p-1 shadow-2xl z-50 rounded-xl"
                  >
                    <div className="px-2.5 py-1 text-[8px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 mb-1">
                      Availability Status
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('active')}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-all",
                        currentStatus === 'active' ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Active</span>
                      {currentStatus === 'active' && <Check className="w-3.5 h-3.5 ml-auto text-muted-foreground" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('focus')}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-all",
                        currentStatus === 'focus' ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <span>Focus / Muted</span>
                      {currentStatus === 'focus' && <Check className="w-3.5 h-3.5 ml-auto text-muted-foreground" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('away')}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-all",
                        currentStatus === 'away' ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span>Away / Idle</span>
                      {currentStatus === 'away' && <Check className="w-3.5 h-3.5 ml-auto text-muted-foreground" />}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Dashboard
            </span>
            <h1 className="text-xl font-bold text-foreground leading-tight">
              {greeting}, {displayName}
            </h1>
          </div>
        </div>        {/* Daily Goal Input Section */}
        <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block leading-none">
                What is your main goal for today?
              </label>
              <input 
                type="text" 
                placeholder="Write your daily goal..."
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFocus();
                }}
                className="bg-transparent border-none w-full p-0 text-sm font-medium placeholder:text-muted-foreground/60 text-foreground focus:ring-0 focus:outline-none mt-1"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {focusInput.trim() !== (userProfile?.focusStatus?.text || '') && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleSaveFocus}
                  disabled={savingFocus}
                  className="px-4 py-1.5 rounded-lg bg-foreground text-background text-xs font-bold hover:bg-foreground/90 transition-all cursor-pointer shadow-sm"
                >
                  {savingFocus ? 'Saving...' : 'Sync Goal'}
                </motion.button>
              )}
            </AnimatePresence>
            
            {focusSavedNotif && (
              <span className="text-xs text-emerald-600 font-semibold px-2">
                Goal Updated!
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Grid: 2 Clean Balanced Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Personal Actions & Operations */}
        <div className="space-y-8">
          
          {/* Tasks Container */}
          <section className="aether-glass p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-sm font-bold text-foreground">My Tasks</h2>
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-muted-foreground">
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
              <div className="py-8 text-center border border-dashed border-border-default rounded-lg bg-zinc-50/50 dark:bg-zinc-900/30">
                <Check className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-foreground block">All tasks completed</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">You are fully cleared for today.</span>
              </div>
            ) : (
              <div className="space-y-1">
                {myTasks.map((task) => {
                  const badgeClass = PRIORITY_BADGES[task.priority] || '';
                  const isCompleting = completingTaskId === task.id;

                  return (
                    <div 
                      key={task.id}
                      className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all border border-transparent hover:border-border-subtle"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          disabled={isCompleting}
                          className="w-4 h-4 rounded-md border border-border-strong flex items-center justify-center hover:border-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
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
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 transition-all font-medium"
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
          <section className="aether-glass p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-sm font-bold text-foreground">Approvals</h2>
              {pendingRequests.length + (isManager ? reviewTasksForTeam.length : 0) > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] font-semibold">
                  {pendingRequests.length + (isManager ? reviewTasksForTeam.length : 0)} pending
                </span>
              )}
            </div>

            {(pendingRequests.length === 0 && (!isManager || reviewTasksForTeam.length === 0)) ? (
              <div className="py-8 text-center bg-zinc-50/50 dark:bg-zinc-900/30 border border-dashed border-border-default rounded-lg bg-white/1">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-foreground block">Approvals Cleared</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">No pending requests require your sign-off.</span>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Approval Requests */}
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-xl border border-white/5 bg-white/3 dark:bg-black/10 space-y-3">
                    <div>
                      <span className="text-xs font-bold text-foreground block truncate">{req.title}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Submitted by {req.creatorName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'approved', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1 rounded-md bg-foreground text-background text-[10px] font-bold hover:bg-foreground/90 transition-all cursor-pointer shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          await updateRequestStatus(req.id, orgId!, 'rejected', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                        }}
                        className="flex-1 py-1 rounded-md border border-white/10 hover:bg-white/5 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
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
                    <div key={task.id} className="p-4 rounded-xl border border-white/5 bg-white/3 dark:bg-black/10 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-foreground block truncate">{task.title}</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">Task review for {assigneeName}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewAction(task, 'approve')}
                          className="flex-1 py-1 rounded-md bg-foreground text-background text-[10px] font-bold hover:bg-foreground/90 transition-all cursor-pointer shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewAction(task, 'reject')}
                          className="flex-1 py-1 rounded-md border border-white/10 hover:bg-white/5 text-[10px] font-bold text-muted-foreground transition-all cursor-pointer"
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
          <section className="aether-glass p-6 space-y-4 self-start">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-sm font-bold text-foreground">Team Focus</h2>
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-muted-foreground">
                {teammates.length} members
              </span>
            </div>

            {teammates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 italic">No teammates connected yet.</p>
            ) : (
              <div className="space-y-4">
                {teammates.map((member) => {
                  const hasFocus = !!member.focusStatus?.text;
                  const initials = avatarInitials(member.fullName || member.username || '?');
                  
                  return (
                    <div key={member.uid} className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                      
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
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-surface dark:bg-zinc-950 flex items-center justify-center shadow-sm">
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
          <section className="aether-glass p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="text-sm font-bold text-foreground">New Messages</h2>
              {unreadChannels.length + unreadDMs.length > 0 && (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 text-[10px] font-semibold">
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
