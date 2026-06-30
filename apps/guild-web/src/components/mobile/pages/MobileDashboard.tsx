import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Loader2, 
  Check, 
  Target, 
  CheckCircle2, 
  MessageSquare, 
  Hash, 
  ChevronRight,
  TrendingUp,
  FileCheck,
  UserCheck,
  Download,
  X,
  Share2,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from '../../../hooks/useAuth';
import { usePwaInstall } from '../../../hooks/usePwaInstall';
import { useTasks } from '../../../hooks/useTasks';
import { useOrgMembers, useChannels, useDMs } from '../../../hooks/useChat';
import { useRequests } from '../../../hooks/useRequests';
import { useTeams } from '../../../hooks/useTeams';
import { updateRequestStatus } from '../../../lib/requests';
import { type Task, moveTask, createTask, deleteTask, updateTask } from '../../../lib/tasks';
import { updateUserProfile, type UserProfile } from '../../../lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { avatarInitials, avatarHue } from '../../MemberProfileDrawer';
import { cn } from '@/lib/utils';

export function MobileDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { isInstallable, isStandalone, isDismissed, isIOS, install, dismiss } = usePwaInstall();

  const { tasks, loading: tasksLoading } = useTasks(orgId, undefined, true);
  const { teams } = useTeams(orgId);
  const members = useOrgMembers(orgId);
  const { received: receivedRequests } = useRequests(orgId);
  const pendingRequests = receivedRequests.filter((r) => r.status === 'pending');

  const { channels, hasUnread: channelHasUnread } = useChannels(orgId);
  const { threads, hasUnreadDM } = useDMs(orgId);

  const unreadChannels = React.useMemo(() => {
    return channels.filter(c => channelHasUnread(c));
  }, [channels, channelHasUnread]);

  const unreadDMs = React.useMemo(() => {
    return threads.filter(t => hasUnreadDM(t));
  }, [threads, hasUnreadDM]);

  const [focusInput, setFocusInput] = React.useState(userProfile?.focusStatus?.text || '');
  const [savingFocus, setSavingFocus] = React.useState(false);
  const [focusSavedNotif, setFocusSavedNotif] = React.useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = React.useState(false);
  
  const currentStatus = userProfile?.availabilityStatus || 'active';
  const myInitials = avatarInitials(userProfile?.fullName || userProfile?.username || '?');

  const handleUpdateStatus = async (status: 'active' | 'focus' | 'away') => {
    if (!userProfile?.uid) return;
    try {
      await updateUserProfile(userProfile.uid, { availabilityStatus: status });
      setStatusDropdownOpen(false);
    } catch (err) {
      console.error(err);
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

  const myTasks = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    return tasks.filter((t) => t.approved !== false && t.assigneeIds.includes(userProfile.uid) && t.status !== 'done' && t.status !== 'review');
  }, [tasks, userProfile?.uid]);

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
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const displayName = userProfile?.fullName?.split(' ')[0] ?? 'Teammate';

  return (
    <div className="flex flex-col space-y-5 animate-fluid-pop pb-6">
      
      {/* Mobile PWA Install Prompter CTA */}
      <AnimatePresence>
        {isInstallable && !isStandalone && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="aether-glass p-4 flex flex-col gap-3 border border-primary/20 bg-primary/5 shadow-md relative overflow-hidden"
            style={{ borderRadius: '16px' }}
          >
            <div className="absolute -right-10 -top-10 w-24 h-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <Download className="w-4.5 h-4.5 text-white animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Install Guild</h3>
                  <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">Add to home screen for immersive, native full-screen flow and persistent offline sync.</p>
                </div>
              </div>
              
              <button
                onClick={dismiss}
                title="Dismiss"
                className="h-6 w-6 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all cursor-pointer shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {isIOS ? (
              <div className="text-[9px] font-bold text-muted-foreground flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-2 rounded-xl justify-center">
                <Share2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Tap Safari Share &rarr; <b>"Add to Home Screen"</b></span>
              </div>
            ) : (
              <button
                onClick={install}
                className="w-full py-2 rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] font-black tracking-widest transition-all active:scale-95 cursor-pointer shadow-md"
              >
                INSTALL APP
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Mobile Friendly Greeting and Active Profile Status Panel */}
      <div className="aether-glass p-5 flex flex-col gap-4 bg-white/2 border border-white/5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                type="button"
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="w-11 h-11 flex items-center justify-center rounded-full border-2 border-white/20 relative shadow-inner cursor-pointer"
                style={{ background: `hsl(${avatarHue(userProfile?.uid || '')} 55% 45%)` }}
              >
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.fullName || 'User'} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <span className="text-xs font-black text-white">{myInitials}</span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-surface flex items-center justify-center shadow-sm">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    currentStatus === 'focus' ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" :
                    currentStatus === 'away' ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" :
                    "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                  )} />
                </span>
              </button>

              <AnimatePresence>
                {statusDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setStatusDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute left-0 mt-2.5 w-44 aether-glass bg-surface/98 p-1 shadow-2xl z-50 rounded-xl"
                    >
                      <div className="px-2.5 py-1 text-[8px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5 mb-1">
                        Status Dashboard
                      </div>
                      {['active', 'focus', 'away'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleUpdateStatus(st as any)}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-all capitalize",
                            currentStatus === st ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            st === 'active' ? "bg-emerald-500" : st === 'focus' ? "bg-red-500" : "bg-amber-500"
                          )} />
                          <span>{st}</span>
                          {currentStatus === st && <Check className="w-3.5 h-3.5 ml-auto text-muted-foreground" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block leading-none">
                {greeting}
              </span>
              <h2 className="text-base font-black text-foreground mt-1 tracking-tight">
                {displayName}
              </h2>
            </div>
          </div>

          {(userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
            <a
              href="https://admin.guildorbit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-500 hover:to-violet-550 text-white font-extrabold text-[10px] shadow-[0_3px_12px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.03] active:scale-[0.97] shrink-0 cursor-pointer border border-white/10 tracking-wide uppercase animate-fluid-pop"
            >
              <Shield className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Admin</span>
            </a>
          )}
        </div>

        {/* 2. Sleek Custom Mobile Status Target */}
        <div className="pt-3.5 border-t border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-white/5 text-primary shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <input 
                type="text" 
                placeholder="What are you doing right now?"
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                onBlur={handleSaveFocus}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFocus(); }}
                className="bg-transparent border-none w-full p-0 text-xs font-extrabold placeholder:text-muted-foreground/50 text-foreground focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
          {focusSavedNotif && (
            <span className="text-[9px] text-emerald-500 font-bold block ml-8 animate-pulse">
              Status synced to cloud
            </span>
          )}
        </div>
      </div>

      {/* 3. Task Overview Card Stream */}
      <div className="aether-glass p-5 space-y-4 bg-white/2 border border-white/5">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My Today's Work</span>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">
            {myTasks.length} left
          </span>
        </div>

        {tasksLoading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-bold">Retrieving tickets...</span>
          </div>
        ) : myTasks.length === 0 ? (
          <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
            <Check className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <span className="text-xs font-bold text-foreground block">Workspace is pristine!</span>
            <span className="text-[9px] text-muted-foreground mt-0.5 block">Enjoy a fully cleared agenda.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.slice(0, 3).map((task) => (
              <div 
                key={task.id}
                onClick={() => navigate('/workspace')}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                    className="w-5 h-5 rounded-lg border border-white/10 flex items-center justify-center bg-white/5"
                  >
                    <Check className="w-3 h-3 text-emerald-400 opacity-80" />
                  </button>
                  <span className="text-xs font-bold text-foreground truncate">{task.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </div>
            ))}

            {myTasks.length > 3 && (
              <button 
                onClick={() => navigate('/workspace')}
                className="w-full py-2.5 text-center text-xs font-black text-primary border border-white/5 bg-white/2 rounded-xl active:scale-95 transition-all"
              >
                VIEW ALL {myTasks.length} TASKS
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Approvals Drawer widget */}
      {(pendingRequests.length > 0 || reviewTasksForTeam.length > 0 || tasksAwaitingApproval.length > 0) && (
        <div className="aether-glass p-5 space-y-4 bg-white/2 border border-white/5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action Needed</span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
              {pendingRequests.length + reviewTasksForTeam.length + tasksAwaitingApproval.length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {pendingRequests.slice(0, 2).map((req) => (
              <div key={req.id} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground block truncate">{req.title}</span>
                    <span className="text-[9px] text-muted-foreground block mt-1 font-semibold">From {req.creatorName}</span>
                  </div>
                  <FileCheck className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await updateRequestStatus(req.id, orgId!, 'approved', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                    }}
                    className="flex-1 py-2 rounded-lg bg-primary text-white text-[10px] font-black hover:bg-primary/95 transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      await updateRequestStatus(req.id, orgId!, 'rejected', userProfile!.uid, userProfile!.fullName, req.creatorId, req.title);
                    }}
                    className="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}

            {reviewTasksForTeam.slice(0, 2).map((task) => {
              const assigneeName = task.assigneeIds.map(id => memberMap.get(id)?.fullName).filter(Boolean).join(', ');
              return (
                <div key={task.id} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">{task.title}</span>
                      <span className="text-[9px] text-muted-foreground block mt-1 font-semibold">Review for {assigneeName}</span>
                    </div>
                    <UserCheck className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const actionActor = { uid: userProfile!.uid, name: userProfile!.fullName || 'Manager' };
                        await moveTask(task.id, orgId!, 'done', task.orderIndex, task.status, actionActor);
                      }}
                      className="flex-1 py-2 rounded-lg bg-primary text-white text-[10px] font-black hover:bg-primary/95 transition-all active:scale-95 cursor-pointer shadow-md"
                    >
                      Complete
                    </button>
                    <button
                      onClick={async () => {
                        const actionActor = { uid: userProfile!.uid, name: userProfile!.fullName || 'Manager' };
                        await moveTask(task.id, orgId!, 'in_progress', task.orderIndex, task.status, actionActor);
                      }}
                      className="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
                    >
                      Needs Changes
                    </button>
                  </div>
                </div>
              );
            })}

            {tasksAwaitingApproval.slice(0, 2).map((task) => {
              const creatorName = members.find(m => m.uid === task.creatorId)?.fullName || 'Teammate';
              return (
                <div key={task.id} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">{task.title}</span>
                      <span className="text-[9px] text-muted-foreground block mt-1 font-semibold">Creation for {creatorName}</span>
                    </div>
                    <Shield className="w-4.5 h-4.5 text-rose-400 shrink-0" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const actionActor = { uid: userProfile!.uid, name: userProfile!.fullName || 'Manager' };
                        await updateTask(task.id, orgId!, { approved: true } as any, actionActor);
                      }}
                      className="flex-1 py-2 rounded-lg bg-primary text-white text-[10px] font-black hover:bg-primary/95 transition-all active:scale-95 cursor-pointer shadow-md"
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        await deleteTask(task.id);
                      }}
                      className="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer"
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

      {/* 5. Mobile Dynamic Unread Inbox stream */}
      <div className="aether-glass p-5 space-y-4 bg-white/2 border border-white/5">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mobile Inbox</span>
          {unreadChannels.length + unreadDMs.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-semibold animate-pulse">
              {unreadChannels.length + unreadDMs.length} new
            </span>
          )}
        </div>

        {unreadChannels.length === 0 && unreadDMs.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-muted-foreground italic font-semibold">Your conversations are fully read.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unreadDMs.slice(0, 2).map((thread) => {
              const otherUid = thread.participants.find(id => id !== userProfile?.uid);
              const otherMember = otherUid ? memberMap.get(otherUid) : null;
              const name = otherMember?.fullName || 'Teammate';
              
              return (
                <div 
                  key={thread.id}
                  onClick={() => navigate(`/chat/dm/${thread.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 active:scale-98 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 shrink-0"
                      style={{ background: `hsl(${avatarHue(otherUid || '')} 55% 45%)` }}
                    >
                      {otherMember?.photoURL ? (
                        <img src={otherMember.photoURL} alt={name} className="h-full w-full object-cover rounded-full" />
                      ) : (
                        <span className="font-extrabold text-[9px] text-white">{avatarInitials(name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-foreground block truncate">{name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate italic mt-0.5 font-semibold">
                        "{thread.lastMessage || 'Sent a direct message'}"
                      </span>
                    </div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)] shrink-0 ml-2" />
                </div>
              );
            })}

            {unreadChannels.slice(0, 2).map((channel) => (
              <div 
                key={channel.id}
                onClick={() => navigate(`/chat/c/${channel.id}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 text-muted-foreground shrink-0 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-foreground block truncate">#{channel.name}</span>
                    <span className="text-[10px] text-muted-foreground block truncate italic mt-0.5 font-semibold">
                      {channel.lastMessagePreview ? `"${channel.lastMessagePreview}"` : 'New messages in channel'}
                    </span>
                  </div>
                </div>
                <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)] shrink-0 ml-2" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Active Team Focus overview */}
      <div className="aether-glass p-5 space-y-4 bg-white/2 border border-white/5">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Team availability</span>
          <span className="text-[9px] font-semibold text-muted-foreground/60">
            {teammates.filter(t => t.availabilityStatus === 'active').length} active now
          </span>
        </div>

        {teammates.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 italic">You are not part of any team.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2 px-1">
            {teammates.slice(0, 5).map((member) => (
              <div 
                key={member.uid} 
                className="flex flex-col items-center gap-1.5 relative cursor-pointer"
                title={member.fullName}
              >
                <div 
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 relative"
                  style={{ background: `hsl(${avatarHue(member.uid)} 55% 45%)` }}
                >
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.fullName} className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <span className="text-xs font-bold text-white">{avatarInitials(member.fullName || '')}</span>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-surface flex items-center justify-center shadow-sm">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      member.availabilityStatus === 'focus' ? "bg-red-500" :
                      member.availabilityStatus === 'away' ? "bg-amber-500" :
                      "bg-emerald-500"
                    )} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
