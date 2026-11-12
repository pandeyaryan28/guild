import * as React from 'react';
import {
  Hash, Plus, MessageSquare, ChevronDown, ChevronRight,
  Loader2, Users, Lock, Megaphone, HelpCircle,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useNavigate, useParams, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useChannels, useDMs, useOrgMembers } from '../../hooks/useChat';
import { useTeams } from '../../hooks/useTeams';
import { getOrCreateDM, markChannelRead, markDMRead, createChannel, type DirectMessageThread } from '../../lib/chat';
import { Timestamp } from 'firebase/firestore';
import { CreateChannelModal } from '../../components/chat/CreateChannelModal';
import { NewDMModal } from '../../components/chat/NewDMModal';
import { ChannelSettingsModal } from '../../components/chat/ChannelSettingsModal';
import { MessageArea } from './MessageArea';
import { type UserProfile, getOrgById, type Organization } from '../../lib/firestore';
import { RedesignLayout } from '../../components/redesign/Layout';
import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../components/tasks/GoalDetailDrawer';
import { RequestDetailDrawer } from '../../components/tasks/RequestDetailDrawer';
import { BidirectionalCanvasDrawer } from '../../components/chat/BidirectionalCanvasDrawer';
import { useSingleTask, useTasks } from '../../hooks/useTasks';
import { useGoal, useGoals } from '../../hooks/useGoals';
import { useRequest } from '../../hooks/useRequests';
import { useProjects } from '../../hooks/useProjects';

interface RedesignChatSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenChannelModal: () => void;
  onOpenDMModal: () => void;
  optimisticDMs?: Map<string, { thread: DirectMessageThread; otherMember?: UserProfile }>;
  activeDmId?: string;
}

// ─── Apple macOS / SwiftUI Minimalist Chat Directory Sidebar ──────────────────
function RedesignChatSidebar({
  isCollapsed,
  onToggle,
  onOpenChannelModal,
  onOpenDMModal,
  optimisticDMs,
  activeDmId,
}: RedesignChatSidebarProps) {
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { channels, hasUnread, loading } = useChannels(orgId);
  const { threads: rawDmThreads, hasUnreadDM } = useDMs(orgId);
  const members = useOrgMembers(orgId);

  // Merge Firestore threads with optimistic threads and active dmId
  const dmThreads = React.useMemo(() => {
    const threadMap = new Map<string, DirectMessageThread>();

    // 1. Add optimistic threads
    if (optimisticDMs) {
      optimisticDMs.forEach((opt) => {
        threadMap.set(opt.thread.id, opt.thread);
      });
    }

    // 2. Synthesize active DM thread if in route and not present
    if (activeDmId && user && !threadMap.has(activeDmId)) {
      const parts = activeDmId.split('_');
      if (parts.includes(user.uid)) {
        threadMap.set(activeDmId, {
          id: activeDmId,
          orgId: orgId || '',
          participants: parts,
          lastMessage: '',
          lastMessageAt: Timestamp.now(),
          lastSenderId: user.uid,
        });
      }
    }

    // 3. Overlay real threads from Firestore
    rawDmThreads.forEach((t) => {
      threadMap.set(t.id, t);
    });

    return Array.from(threadMap.values()).sort((a, b) => {
      const getTime = (val: any) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (typeof val.seconds === 'number') return val.seconds * 1000;
        if (val instanceof Date) return val.getTime();
        const p = new Date(val).getTime();
        return isNaN(p) ? 0 : p;
      };
      const aTime = getTime(a.lastMessageAt) || getTime((a as any).createdAt);
      const bTime = getTime(b.lastMessageAt) || getTime((b as any).createdAt);
      return bTime - aTime;
    });
  }, [rawDmThreads, optimisticDMs, activeDmId, user, orgId]);

  const [localOrg, setLocalOrg] = React.useState<Organization | null>(null);
  const [channelsOpen, setChannelsOpen] = React.useState(true);
  const [dmsOpen, setDmsOpen] = React.useState(true);

  // Fetch organization
  React.useEffect(() => {
    if (!orgId) return;
    getOrgById(orgId).then((org) => {
      if (org) setLocalOrg(org);
    });
  }, [orgId]);

  const currentPath = location.pathname;

  const getDMMember = (participants: string[], threadId?: string) => {
    const otherId = participants.find((p) => p !== user?.uid) ?? '';
    const found = members.find((m) => m.uid === otherId);
    if (found) return found;
    if (threadId && optimisticDMs?.has(threadId)) {
      return optimisticDMs.get(threadId)?.otherMember;
    }
    return undefined;
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-surface/90 dark:bg-surface/75 backdrop-blur-2xl border-r border-border overflow-hidden transition-all duration-300 ease-in-out shrink-0 z-30 select-none",
        "fixed inset-y-0 left-0 lg:relative lg:inset-auto",
        isCollapsed ? "-translate-x-full opacity-0 pointer-events-none w-0 lg:w-0" : "translate-x-0 opacity-100 w-[240px]"
      )}
    >
      {/* Workspace Branding Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3 select-none">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-xs relative overflow-hidden shrink-0">
          {localOrg?.photoURL ? (
            <img src={localOrg.photoURL} alt={localOrg.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-black">
              {localOrg?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'G'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-foreground block truncate">{localOrg?.name || 'Guild'}</span>
          <span className="text-[10px] text-muted-foreground font-medium block">Workspace</span>
        </div>
        <button
          onClick={onToggle}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer shrink-0"
          title="Collapse Directory (Cmd+\)"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Directory Scroll area */}
      <div className="flex-1 overflow-y-auto aether-scroll p-2.5 space-y-4">
        {/* Channels Lane */}
        <div className="space-y-1">
          <div
            onClick={() => setChannelsOpen(!channelsOpen)}
            className="flex w-full items-center gap-1.5 px-2 py-1 cursor-pointer select-none outline-none group"
          >
            {channelsOpen ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">
              Channels
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenChannelModal();
              }}
              className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
              title="Create Channel"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-0.5">
            {!loading &&
              channels.map((ch) => {
                const isActive = currentPath === `/chat/c/${ch.id}`;
                const unread = hasUnread(ch);

                if (!channelsOpen && !isActive && !unread) return null;
                const IconComponent = ch.isPrivate ? Lock : Hash;

                return (
                  <NavLink
                    key={ch.id}
                    to={`/chat/c/${ch.id}`}
                    onClick={() => markChannelRead(ch.id, user!.uid, orgId)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : unread
                        ? 'text-foreground font-semibold bg-secondary/60'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                    )}
                  >
                    <IconComponent
                      className={cn(
                        'w-3.5 h-3.5 shrink-0',
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground/70'
                      )}
                    />
                    <span className="flex-1 truncate">{ch.name}</span>
                    {ch.isRestricted && (
                      <span title="Announcements Only" className="shrink-0 flex items-center">
                        <Megaphone className="w-3 h-3 text-muted-foreground opacity-60" />
                      </span>
                    )}
                    {unread && !isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </NavLink>
                );
              })}

            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Loading…</span>
              </div>
            )}

            {!loading && channels.length === 0 && (
              <div className="px-3 py-3 text-center space-y-2 select-none">
                <span className="text-[10px] text-muted-foreground/60 italic block">No channels yet</span>
                <button
                  type="button"
                  onClick={onOpenChannelModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Channel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Direct Messages Lane */}
        <div className="space-y-1">
          <div
            onClick={() => setDmsOpen(!dmsOpen)}
            className="flex w-full items-center gap-1.5 px-2 py-1 cursor-pointer select-none outline-none"
          >
            {dmsOpen ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1">
              Direct Messages
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDMModal();
              }}
              className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
              title="New Direct Message"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-0.5">
            {dmThreads.map((thread) => {
              const isActive = currentPath === `/chat/dm/${thread.id}`;
              const unread = hasUnreadDM(thread);
              const otherMember = getDMMember(thread.participants, thread.id);
              const dmName = otherMember?.fullName ?? 'Unknown';
              const dmPhotoURL = otherMember?.photoURL;
              const dmInitials = dmName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

              if (!dmsOpen && !isActive && !unread) return null;

              return (
                <NavLink
                  key={thread.id}
                  to={`/chat/dm/${thread.id}`}
                  onClick={() => markDMRead(thread.id, user!.uid)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : unread
                      ? 'text-foreground font-semibold bg-secondary/60'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  <div className="relative h-5 w-5 shrink-0">
                    {dmPhotoURL ? (
                      <img src={dmPhotoURL} alt={dmName} className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold border',
                          isActive
                            ? 'bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground'
                            : 'bg-secondary border-border text-foreground'
                        )}
                      >
                        {dmInitials}
                      </div>
                    )}
                    {/* Status dot in Sidebar */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-surface flex items-center justify-center shadow-xs">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          otherMember?.availabilityStatus === 'focus'
                            ? 'bg-red-500'
                            : otherMember?.availabilityStatus === 'away'
                            ? 'bg-amber-500'
                            : otherMember?.availabilityStatus === 'active'
                            ? 'bg-emerald-500'
                            : 'bg-zinc-400'
                        )}
                      />
                    </span>
                  </div>
                  <span className="flex-1 truncate">{dmName}</span>
                  {unread && !isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </NavLink>
              );
            })}

            {dmThreads.length === 0 && (
              <span className="px-3 py-2 text-[10px] text-muted-foreground/60 italic block">No active threads</span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── ChatLayout Component ─────────────────────────────────────────────────────
export function ChatLayout() {
  const { channelId, dmId } = useParams<{ channelId: string; dmId: string }>();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { channels, loading: channelsLoading } = useChannels(orgId);
  const members = useOrgMembers(orgId);
  const { teams } = useTeams(orgId);
  const navigate = useNavigate();
  // Sidebar open by default on desktop (isSidebarCollapsed: false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [showChannelModal, setShowChannelModal] = React.useState(false);
  const [showDMModal, setShowDMModal] = React.useState(false);
  const [isCreatingGeneral, setIsCreatingGeneral] = React.useState(false);
  const [optimisticDMs, setOptimisticDMs] = React.useState<Map<string, { thread: DirectMessageThread; otherMember?: UserProfile }>>(new Map());

  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');
  const openGoalId = searchParams.get('goal');
  const openRequestId = searchParams.get('request');
  const openTab = (searchParams.get('tab') as any) || (searchParams.get('settings') === 'integrations' ? 'integrations' : 'general');
  const openSettings = searchParams.get('settings') === 'true' || searchParams.get('settings') === 'integrations' || !!searchParams.get('tab');
  const openCanvas = searchParams.get('canvas') === 'true';

  const openTask = useSingleTask(openTaskId);
  const { goal: openGoal } = useGoal(openGoalId ?? undefined);
  const { request: openRequest } = useRequest(openRequestId ?? undefined);

  const activeChannel = React.useMemo(() => {
    if (!channelId) return null;
    return channels.find((c) => c.id === channelId) ?? null;
  }, [channelId, channels]);

  const handleClosePanel = React.useCallback((key: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    if (key === 'settings') {
      params.delete('tab');
    }
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const { projects } = useProjects(orgId);
  const { goals } = useGoals(orgId);
  const { tasks } = useTasks(orgId);

  const actor = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName ?? 'User',
  }), [user, userProfile]);

  const handleChannelCreated = (chId: string) => {
    setShowChannelModal(false);
    navigate(`/chat/c/${chId}`);
  };

  const handleDMCreated = (dId: string, otherMember?: UserProfile) => {
    setShowDMModal(false);
    if (user) {
      const parts = dId.split('_');
      const otherUid = otherMember?.uid || parts.find((p) => p !== user.uid) || '';
      const optimisticThread: DirectMessageThread = {
        id: dId,
        orgId: orgId || '',
        participants: [user.uid, otherUid],
        lastMessage: '',
        lastMessageAt: Timestamp.now(),
        lastSenderId: user.uid,
      };
      setOptimisticDMs((prev) => {
        const next = new Map(prev);
        next.set(dId, { thread: optimisticThread, otherMember });
        return next;
      });
    }
    navigate(`/chat/dm/${dId}`);
  };

  const hasContent = !!channelId || !!dmId;

  // ─── Automatic Channel Redirection ──────────────────────────────────────────
  // When user navigates to /chat with no channelId or dmId:
  // On desktop screens only (>= 1024px), redirect to #general (or first channel).
  // On mobile (< 1024px), keep on /chat so the user sees the channel directory without being bounced.
  React.useEffect(() => {
    if (!channelId && !dmId && !channelsLoading && channels.length > 0) {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        const generalChannel = channels.find((c) => c.name.toLowerCase() === 'general');
        const targetChannel = generalChannel || channels[0];
        navigate(`/chat/c/${targetChannel.id}`, { replace: true });
      }
    }
  }, [channelId, dmId, channelsLoading, channels, navigate]);

  // ─── 1-Click First Channel Creation ────────────────────────────────────────
  const handleCreateFirstChannel = async () => {
    if (!orgId || !user || isCreatingGeneral) return;
    setIsCreatingGeneral(true);
    try {
      const id = await createChannel(orgId, 'general', 'General team discussions', user.uid);
      navigate(`/chat/c/${id}`, { replace: true });
    } catch (err) {
      console.error('Failed to create general channel:', err);
    } finally {
      setIsCreatingGeneral(false);
    }
  };

  // Automatically manage sidebar expansion on mobile screens:
  // Open directory when on the home lane (/chat), collapse when reading messages
  React.useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarCollapsed(hasContent);
    }
  }, [channelId, dmId, hasContent]);

  // On narrower screens (< 1280px), collapse left sidebar when Canvas opens to preserve chat view;
  // On desktop (>= 1280px), keep left sidebar open alongside Canvas for effortless multitasking
  React.useEffect(() => {
    if (openCanvas && window.innerWidth < 1280) {
      setIsSidebarCollapsed(true);
    }
  }, [openCanvas]);

  // Global Keyboard shortcut: Cmd+\ (or Ctrl+\) toggles channel directory drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <RedesignLayout hideHeader={false} fullBleed={true}>
      <div className="flex h-full w-full overflow-hidden transition-all duration-300 ease-in-out relative bg-background">
        {/* Mobile sidebar backdrop overlay */}
        {!isSidebarCollapsed && (
          <div
            onClick={() => setIsSidebarCollapsed(true)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-25 lg:hidden transition-opacity duration-300"
          />
        )}

        {/* Spatial left sidebar nested within Chat */}
        <RedesignChatSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenChannelModal={() => setShowChannelModal(true)}
          onOpenDMModal={() => setShowDMModal(true)}
          optimisticDMs={optimisticDMs}
          activeDmId={dmId}
        />

        {/* Message Thread Workspace */}
        <div className="flex-1 flex min-w-0 bg-background overflow-hidden relative">
          {hasContent ? (
            <>
              <MessageArea
                channelId={channelId ?? null}
                dmId={dmId ?? null}
                orgId={orgId}
                currentUser={user ? { uid: user.uid, displayName: user.displayName ?? '' } : null}
                profile={userProfile}
                members={members}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />

              {openTask && (
                <TaskDetailDrawer
                  task={openTask}
                  onClose={() => handleClosePanel('task')}
                  orgId={orgId ?? ''}
                  actor={actor}
                  members={members}
                  projects={projects}
                  goals={goals}
                  inline={true}
                />
              )}

              {openGoal && (
                <GoalDetailDrawer
                  goal={openGoal}
                  onClose={() => handleClosePanel('goal')}
                  orgId={orgId ?? ''}
                  actor={actor}
                  members={members}
                  projects={projects}
                  tasks={tasks}
                  onSelectTask={(t) => {
                    const params = new URLSearchParams(searchParams);
                    params.set('task', t.id);
                    params.delete('goal');
                    setSearchParams(params);
                  }}
                  inline={true}
                />
              )}

              {openRequest && userProfile && (
                <RequestDetailDrawer
                  request={openRequest}
                  onClose={() => handleClosePanel('request')}
                  orgId={orgId ?? ''}
                  currentUser={userProfile}
                  inline={true}
                />
              )}

              {openSettings && activeChannel && orgId && (
                <ChannelSettingsModal
                  channel={activeChannel}
                  orgId={orgId}
                  currentUserProfile={userProfile}
                  onClose={() => handleClosePanel('settings')}
                  onUpdated={() => {}}
                  initialTab={openTab}
                  inline={true}
                />
              )}

              <AnimatePresence>
                {openCanvas && (channelId || dmId) && (
                  <React.Fragment key={`canvas-drawer-wrap-${channelId || dmId}`}>
                    {/* Tablet/mobile backdrop overlay */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleClosePanel('canvas')}
                      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-25 lg:hidden"
                    />
                    <BidirectionalCanvasDrawer
                      key={`canvas-drawer-${channelId || dmId}`}
                      chatId={channelId || dmId || ''}
                      chatName={activeChannel?.name || (dmId ? 'Direct Message' : 'Notes')}
                      isDM={!!dmId}
                      members={members}
                      onClose={() => handleClosePanel('canvas')}
                    />
                  </React.Fragment>
                )}
              </AnimatePresence>
            </>
          ) : channelsLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-20 relative select-none">
              {isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="absolute left-6 top-6 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/80 border border-border text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-xs cursor-pointer"
                  title="Expand Sidebar (Cmd+\)"
                >
                  <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
                </button>
              )}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/80 border border-border text-primary shadow-xs">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Loading channels…</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center py-20 px-6 max-w-md mx-auto relative select-none">
              {isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="absolute left-6 top-6 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/80 border border-border text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-xs cursor-pointer"
                  title="Expand Sidebar (Cmd+\)"
                >
                  <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
                </button>
              )}
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
                <Hash className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">Welcome to Team Chat</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No channels exist in your workspace yet. Create your first channel to start communicating with your team.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCreateFirstChannel}
                  disabled={isCreatingGeneral}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreatingGeneral ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>+ Create First Channel (#general)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowChannelModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-surface hover:bg-secondary text-foreground text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Custom channel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20 relative select-none">
              {isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="absolute left-6 top-6 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/80 border border-border text-muted-foreground hover:text-foreground active:scale-95 transition-all shadow-xs cursor-pointer"
                  title="Expand Sidebar (Cmd+\)"
                >
                  <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
                </button>
              )}
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary/80 border border-border text-primary shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-base font-bold text-foreground block">Select conversation</span>
                <span className="text-xs text-muted-foreground block max-w-xs px-6">
                  Choose a channel or direct message from the directory sidebar to start chatting.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showChannelModal && orgId && (
        <CreateChannelModal orgId={orgId} onClose={() => setShowChannelModal(false)} onCreated={handleChannelCreated} />
      )}
      {showDMModal && orgId && (
        <NewDMModal orgId={orgId} members={members} onClose={() => setShowDMModal(false)} onDMCreated={handleDMCreated} />
      )}
    </RedesignLayout>
  );
}

export default ChatLayout;
