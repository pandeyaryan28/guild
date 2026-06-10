import * as React from 'react';
import {
  Hash, Plus, MessageSquare, ChevronDown, ChevronRight,
  Loader2, Users, Lock, Megaphone, HelpCircle,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useNavigate, useParams, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useChannels, useDMs, useOrgMembers } from '../../hooks/useChat';
import { useTeams } from '../../hooks/useTeams';
import { getOrCreateDM, markChannelRead, markDMRead } from '../../lib/chat';
import { CreateChannelModal } from '../../components/chat/CreateChannelModal';
import { NewDMModal } from '../../components/chat/NewDMModal';
import { ChannelSettingsModal } from '../../components/chat/ChannelSettingsModal';
import { MessageArea } from './MessageArea';
import { type UserProfile, getOrgById, type Organization } from '../../lib/firestore';
import { type Message } from '../../lib/chat';
import { RedesignLayout } from '../../components/redesign/Layout';
import { useSearchParams } from 'react-router-dom';
import { TaskDetailDrawer } from '../../components/tasks/TaskDetailDrawer';
import { GoalDetailDrawer } from '../../components/tasks/GoalDetailDrawer';
import { RequestDetailDrawer } from '../../components/tasks/RequestDetailDrawer';
import { useSingleTask, useTasks } from '../../hooks/useTasks';
import { useGoal, useGoals } from '../../hooks/useGoals';
import { useRequest } from '../../hooks/useRequests';
import { useProjects } from '../../hooks/useProjects';

interface RedesignChatSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onOpenChannelModal: () => void;
  onOpenDMModal: () => void;
}

// Beautiful Glassmorphic Left Chat Directory Pane
function RedesignChatSidebar({ isCollapsed, onToggle, onOpenChannelModal, onOpenDMModal }: RedesignChatSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { channels, memberships, hasUnread, loading } = useChannels(orgId);
  const { threads: dmThreads, hasUnreadDM } = useDMs(orgId);
  const members = useOrgMembers(orgId);

  const [localOrg, setLocalOrg] = React.useState<Organization | null>(null);
  const [channelsOpen, setChannelsOpen] = React.useState(true);
  const [dmsOpen, setDmsOpen] = React.useState(true);

  // Fetch organization
  React.useEffect(() => {
    if (!orgId) return;
    getOrgById(orgId).then((org) => { if (org) setLocalOrg(org); });
  }, [orgId]);

  const currentPath = location.pathname;

  const getDMMember = (participants: string[]) => {
    const otherId = participants.find((p) => p !== user?.uid) ?? '';
    return members.find((m) => m.uid === otherId);
  };

  return (
    <aside className={cn(
      "flex h-full flex-col aether-glass bg-surface/95 dark:bg-surface/90 backdrop-blur-xl border-r border-white/5 overflow-hidden transition-all duration-300 ease-in-out shrink-0 z-30",
      "fixed inset-y-0 left-0 lg:relative lg:inset-auto",
      isCollapsed ? "-translate-x-full opacity-0 pointer-events-none w-0 lg:w-0" : "translate-x-0 opacity-100 w-[240px]"
    )}>
      {/* Workspace Branding Header */}
      <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4 select-none">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30 relative overflow-hidden border border-white/10 shrink-0">
          {localOrg?.photoURL ? (
            <img src={localOrg.photoURL} alt={localOrg.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-black text-white">
              {localOrg?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'G'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-foreground block truncate">{localOrg?.name || 'Guild'}</span>
          <span className="text-[9px] text-muted-foreground font-semibold block mt-0.5">Workspace</span>
        </div>
        <button
          onClick={onToggle}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all cursor-pointer shrink-0"
          title="Collapse Sidebar"
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
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex-1">
              Channels
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenChannelModal(); }}
              className="flex h-5 w-5 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {!loading && channels.map((ch) => {
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
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all',
                    isActive
                      ? 'bg-primary text-white font-bold shadow-md shadow-primary/10'
                      : unread
                      ? 'text-foreground font-semibold hover:bg-white/5'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                  )}
                >
                  <IconComponent className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-muted-foreground/60')} />
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
                <span className="text-[9px] text-muted-foreground">Loading...</span>
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
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex-1">
              Direct Messages
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDMModal(); }}
              className="flex h-5 w-5 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {dmThreads.map((thread) => {
              const isActive = currentPath === `/chat/dm/${thread.id}`;
              const unread = hasUnreadDM(thread);
              const otherMember = getDMMember(thread.participants);
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
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all',
                    isActive 
                      ? 'bg-primary text-white font-bold shadow-md shadow-primary/10' 
                      : unread
                      ? 'text-foreground font-semibold hover:bg-white/5'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                  )}
                >
                  <div className="relative h-5 w-5 shrink-0">
                    {dmPhotoURL ? (
                      <img src={dmPhotoURL} alt={dmName} className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black border", isActive ? "bg-white/20 border-white/20 text-white" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")}>
                        {dmInitials}
                      </div>
                    )}
                  </div>
                  <span className="flex-1 truncate">{dmName}</span>
                  {unread && !isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </NavLink>
              );
            })}

            {dmThreads.length === 0 && (
              <span className="px-3 py-2 text-[10px] text-muted-foreground/45 italic block">No active threads</span>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}

// Re-wired ChatLayout component inside spatial workspace RedesignLayout
export function ChatLayout() {
  const { channelId, dmId } = useParams<{ channelId: string; dmId: string }>();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { channels } = useChannels(orgId);
  const members = useOrgMembers(orgId);
  const { teams } = useTeams(orgId);
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => window.innerWidth < 1024);
  const [isMemberPanelCollapsed, setIsMemberPanelCollapsed] = React.useState(false);
  const [showChannelModal, setShowChannelModal] = React.useState(false);
  const [showDMModal, setShowDMModal] = React.useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const openTaskId = searchParams.get('task');
  const openGoalId = searchParams.get('goal');
  const openRequestId = searchParams.get('request');
  const openSettings = searchParams.get('settings') === 'true';

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

  const handleDMCreated = (dId: string) => {
    setShowDMModal(false);
    navigate(`/chat/dm/${dId}`);
  };

  const handleStartDM = async (member: UserProfile) => {
    if (!user || !orgId) return;
    const dmId = await getOrCreateDM(user.uid, member.uid, orgId);
    navigate(`/chat/dm/${dmId}`);
  };

  const hasContent = !!channelId || !!dmId;

  // Automatically manage sidebar expansion on mobile screens:
  // Open directory when on the home lane (/chat), collapse when reading messages
  React.useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarCollapsed(hasContent);
    }
  }, [channelId, dmId, hasContent]);

  return (
    <RedesignLayout>
      <div className={cn(
        "flex h-full w-full overflow-hidden animate-fluid-pop transition-all duration-300 ease-in-out relative",
        isSidebarCollapsed ? "gap-0" : "gap-6"
      )}>
        {/* Mobile sidebar backdrop overlay */}
        {!isSidebarCollapsed && (
          <div 
            onClick={() => setIsSidebarCollapsed(true)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-25 lg:hidden transition-opacity duration-300"
          />
        )}

        {/* Spatial left sidebar nested within Chat */}
        <RedesignChatSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenChannelModal={() => setShowChannelModal(true)}
          onOpenDMModal={() => setShowDMModal(true)}
        />

        {/* Message Thread Workspace */}
        <div className="flex-1 flex min-w-0 aether-glass bg-white/2 border border-white/5 overflow-hidden relative">
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
                  inline={true}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20 relative">
              {isSidebarCollapsed && (
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="absolute left-6 top-6 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                  title="Expand Sidebar"
                >
                  <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
                </button>
              )}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 shadow-inner text-primary">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-bold text-foreground block">Select conversation</span>
                <span className="text-[10px] text-muted-foreground block max-w-xs px-6">
                  Choose a channel or private thread from the directory sidebar to start chatting.
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
