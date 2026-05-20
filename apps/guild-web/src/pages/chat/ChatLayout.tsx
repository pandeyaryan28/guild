import * as React from 'react';
import {
  Hash, Plus, MessageSquare, ChevronDown, ChevronRight,
  LayoutDashboard, Palette, LogOut, Loader2, Users, Moon, Sun
} from 'lucide-react';
import { useNavigate, useParams, NavLink, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useChannels, useDMs, useOrgMembers } from '../../hooks/useChat';
import { getOrCreateDM, markChannelRead, markDMRead, type Channel } from '../../lib/chat';
import { CreateChannelModal } from '../../components/chat/CreateChannelModal';
import { NewDMModal } from '../../components/chat/NewDMModal';
import { MemberPanel } from './MemberPanel';
import { MessageArea } from './MessageArea';
import { type UserProfile, getOrgById } from '../../lib/firestore';
import { useTheme } from '../../hooks/useTheme';

// ─── Chat Sidebar ──────────────────────────────────────────────────────────────

function ChatSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, logout } = useAuth();
  const orgId = userProfile?.organizationId;

  const { channels, memberships, hasUnread, loading } = useChannels(orgId);
  const { threads: dmThreads, hasUnreadDM } = useDMs(orgId);
  const members = useOrgMembers(orgId);

  const [orgName, setOrgName] = React.useState('');
  const [showChannelModal, setShowChannelModal] = React.useState(false);
  const [showDMModal, setShowDMModal] = React.useState(false);
  const [channelsOpen, setChannelsOpen] = React.useState(false);
  const [dmsOpen, setDmsOpen] = React.useState(false);
  const { themeId, setTheme } = useTheme();
  const isLight = themeId === 'light';
  const toggleTheme = () => setTheme(isLight ? 'midnight' : 'light');

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

  const initials = userProfile?.fullName
    ? userProfile.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  // Find DM partner name
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
    <>
      <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border-default bg-sidebar">
        {/* Org Header */}
        <div className="flex items-center gap-2.5 border-b border-border-default px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30">
            <span className="text-[10px] font-black text-primary-foreground">G</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate">{orgName || 'Guild'}</p>
            <p className="text-[10px] text-text-muted">Workspace</p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {/* Back to Dashboard */}
            <button
              onClick={() => navigate('/')}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-colors group"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </button>

            <div className="my-2 h-px bg-border/20" />

            {/* Channels Section */}
            <div className="space-y-0.5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setChannelsOpen((o) => !o)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChannelsOpen((o) => !o); } }}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left cursor-pointer select-none outline-none"
              >
                {channelsOpen ? (
                  <ChevronDown className="h-3 w-3 text-text-muted" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-text-muted" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex-1">
                  Channels
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowChannelModal(true); }}
                  className="flex h-5 w-5 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {!loading && channels.map((ch) => {
                const isActive = currentPath === `/chat/c/${ch.id}`;
                const unread = hasUnread(ch);
                
                if (!channelsOpen && !isActive && !unread) return null;

                return (
                  <NavLink
                    key={ch.id}
                    to={`/chat/c/${ch.id}`}
                    onClick={() => markChannelRead(ch.id, user!.uid, orgId)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all',
                      isActive
                        ? 'bg-primary/10 text-foreground font-semibold'
                        : unread
                        ? 'text-foreground font-semibold hover:bg-bg-tertiary'
                        : 'text-muted-foreground hover:bg-bg-tertiary hover:text-foreground',
                    )}
                  >
                    <Hash className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-primary' : 'text-text-muted')} />
                    <span className="flex-1 truncate">{ch.name}</span>
                    {unread && !isActive && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </NavLink>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
                  <span className="text-[10px] text-text-muted">Loading…</span>
                </div>
              )}
            </div>

            <div className="my-2 h-px bg-border/20" />

            {/* Direct Messages Section */}
            <div className="space-y-0.5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setDmsOpen((o) => !o)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDmsOpen((o) => !o); } }}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left cursor-pointer select-none outline-none"
              >
                {dmsOpen ? (
                  <ChevronDown className="h-3 w-3 text-text-muted" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-text-muted" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex-1">
                  Direct Messages
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDMModal(true); }}
                  className="flex h-5 w-5 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

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
                        ? 'bg-primary/10 text-foreground font-semibold' 
                        : unread
                        ? 'text-foreground font-semibold hover:bg-bg-tertiary'
                        : 'text-muted-foreground hover:bg-bg-tertiary hover:text-foreground',
                    )}
                  >
                    <div className="relative h-6 w-6 shrink-0">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[9px] font-bold text-primary">
                        {dmInitials}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-sidebar" />
                    </div>
                    <span className="flex-1 truncate">{dmName}</span>
                    {unread && !isActive && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </NavLink>
                );
              })}

              {dmThreads.length === 0 && (
                <p className="px-3 py-2 text-[10px] text-text-muted">No conversations yet</p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* User Footer */}
        <div className="flex items-center gap-2.5 border-t border-border-default px-4 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[10px] font-bold text-primary border border-primary/15 shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{userProfile?.fullName}</p>
            <p className="text-[10px] text-text-muted truncate">@{userProfile?.username}</p>
          </div>
          <button
            onClick={toggleTheme}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-primary transition-colors"
          >
            {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={logout}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-bg-tertiary hover:text-destructive transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      {showChannelModal && orgId && (
        <CreateChannelModal orgId={orgId} onClose={() => setShowChannelModal(false)} onCreated={handleChannelCreated} />
      )}
      {showDMModal && orgId && (
        <NewDMModal orgId={orgId} members={members} onClose={() => setShowDMModal(false)} onDMCreated={handleDMCreated} />
      )}
    </>
  );
}

// ─── ChatLayout ────────────────────────────────────────────────────────────────

export function ChatLayout() {
  const { channelId, dmId } = useParams<{ channelId: string; dmId: string }>();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const members = useOrgMembers(orgId);
  const navigate = useNavigate();

  const handleStartDM = async (member: UserProfile) => {
    if (!user || !orgId) return;
    const dmId = await getOrCreateDM(user.uid, member.uid, orgId);
    navigate(`/chat/dm/${dmId}`);
  };

  const hasContent = !!channelId || !!dmId;

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      <ChatSidebar />

      <div className="flex flex-1 min-w-0">
        {hasContent ? (
          <>
            <MessageArea
              channelId={channelId ?? null}
              dmId={dmId ?? null}
              orgId={orgId}
              currentUser={user ? { uid: user.uid, displayName: user.displayName ?? '' } : null}
              profile={userProfile}
              members={members}
            />
            <MemberPanel
              members={members}
              currentUserId={user?.uid ?? ''}
              onStartDM={handleStartDM}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare className="h-7 w-7 text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Select a channel or message</p>
              <p className="mt-1 text-xs text-text-muted">Choose from the left sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
