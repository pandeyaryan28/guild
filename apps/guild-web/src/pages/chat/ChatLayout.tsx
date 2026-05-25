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
import { getOrCreateDM, markChannelRead, markDMRead } from '../../lib/chat';
import { CreateChannelModal } from '../../components/chat/CreateChannelModal';
import { NewDMModal } from '../../components/chat/NewDMModal';
import { MemberPanel } from './MemberPanel';
import { MessageArea } from './MessageArea';
import { type UserProfile, getOrgById } from '../../lib/firestore';
import { RedesignLayout } from '../../components/redesign/Layout';

interface RedesignChatSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

// Beautiful Glassmorphic Left Chat Directory Pane
function RedesignChatSidebar({ isCollapsed, onToggle }: RedesignChatSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { channels, memberships, hasUnread, loading } = useChannels(orgId);
  const { threads: dmThreads, hasUnreadDM } = useDMs(orgId);
  const members = useOrgMembers(orgId);

  const [orgName, setOrgName] = React.useState('');
  const [showChannelModal, setShowChannelModal] = React.useState(false);
  const [showDMModal, setShowDMModal] = React.useState(false);
  const [channelsOpen, setChannelsOpen] = React.useState(true);
  const [dmsOpen, setDmsOpen] = React.useState(true);

  // Fetch org name
  React.useEffect(() => {
    if (!orgId) return;
    getOrgById(orgId).then((org) => { if (org) setOrgName(org.name); });
  }, [orgId]);

  const currentPath = location.pathname;

  const handleChannelCreated = (channelId: string) => {
    setShowChannelModal(false);
    navigate(`/chat/c/${channelId}`);
  };

  const handleDMCreated = (dmId: string) => {
    setShowDMModal(false);
    navigate(`/chat/dm/${dmId}`);
  };

  const getDMName = (participants: string[]) => {
    const otherId = participants.find((p) => p !== user?.uid) ?? '';
    const m = members.find((m) => m.uid === otherId);
    return m?.fullName ?? 'Unknown';
  };
  const getDMInitials = (participants: string[]) => {
    const name = getDMName(participants);
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <aside className={cn(
      "flex h-full flex-col aether-glass bg-white/2 border border-white/5 overflow-hidden transition-all duration-300 ease-in-out shrink-0",
      isCollapsed ? "w-0 opacity-0 border-0 p-0 pointer-events-none" : "w-[240px] opacity-100"
    )}>
      {/* Workspace Branding Header */}
      <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4 select-none">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30">
          <span className="text-[10px] font-black text-white">G</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-foreground block truncate">{orgName || 'Guild'}</span>
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
              onClick={(e) => { e.stopPropagation(); setShowChannelModal(true); }}
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
              onClick={(e) => { e.stopPropagation(); setShowDMModal(true); }}
              className="flex h-5 w-5 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {dmThreads.map((thread) => {
              const isActive = currentPath === `/chat/dm/${thread.id}`;
              const unread = hasUnreadDM(thread);
              const dmInitials = getDMInitials(thread.participants);
              const dmName = getDMName(thread.participants);
              
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
                    <div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black border", isActive ? "bg-white/20 border-white/20 text-white" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")}>
                      {dmInitials}
                    </div>
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

      {showChannelModal && orgId && (
        <CreateChannelModal orgId={orgId} onClose={() => setShowChannelModal(false)} onCreated={handleChannelCreated} />
      )}
      {showDMModal && orgId && (
        <NewDMModal orgId={orgId} members={members} onClose={() => setShowDMModal(false)} onDMCreated={handleDMCreated} />
      )}
    </aside>
  );
}

// Re-wired ChatLayout component inside spatial workspace RedesignLayout
export function ChatLayout() {
  const { channelId, dmId } = useParams<{ channelId: string; dmId: string }>();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const members = useOrgMembers(orgId);
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMemberPanelCollapsed, setIsMemberPanelCollapsed] = React.useState(false);

  const handleStartDM = async (member: UserProfile) => {
    if (!user || !orgId) return;
    const dmId = await getOrCreateDM(user.uid, member.uid, orgId);
    navigate(`/chat/dm/${dmId}`);
  };

  const hasContent = !!channelId || !!dmId;

  return (
    <RedesignLayout>
      <div className={cn(
        "flex h-full w-full overflow-hidden animate-fluid-pop transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "gap-0" : "gap-6"
      )}>
        {/* Spatial left sidebar nested within Chat */}
        <RedesignChatSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Message Thread Workspace */}
        <div className="flex-1 flex min-w-0 aether-glass bg-white/2 border border-white/5 overflow-hidden">
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
                isMemberPanelCollapsed={isMemberPanelCollapsed}
                onToggleMemberPanel={() => setIsMemberPanelCollapsed(!isMemberPanelCollapsed)}
              />
              <div className={cn(
                "hidden xl:block transition-all duration-300 ease-in-out h-full overflow-hidden",
                isMemberPanelCollapsed ? "w-0 border-l-0" : "border-l border-white/5 w-[260px]"
              )}>
                <MemberPanel
                  members={members}
                  currentUserId={user?.uid ?? ''}
                  onStartDM={handleStartDM}
                  isCollapsed={isMemberPanelCollapsed}
                  onToggle={() => setIsMemberPanelCollapsed(!isMemberPanelCollapsed)}
                />
              </div>
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
    </RedesignLayout>
  );
}
export default ChatLayout;
