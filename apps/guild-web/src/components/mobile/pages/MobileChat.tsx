import * as React from 'react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import { 
  Hash, 
  Lock, 
  MessageSquare, 
  Plus, 
  Loader2, 
  ChevronRight,
  Search,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useChannels, useDMs, useOrgMembers } from '../../../hooks/useChat';
import { getOrCreateDM, markChannelRead, markDMRead } from '../../../lib/chat';
import { CreateChannelModal } from '../../chat/CreateChannelModal';
import { NewDMModal } from '../../chat/NewDMModal';
import { MessageArea } from '../../../pages/chat/MessageArea';
import { type UserProfile } from '../../../lib/firestore';
import { cn } from '@/lib/utils';

export function MobileChat() {
  const { channelId, dmId } = useParams<{ channelId: string; dmId: string }>();
  const navigate = useNavigate();
  
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { channels, hasUnread, loading } = useChannels(orgId);
  const { threads: dmThreads, hasUnreadDM } = useDMs(orgId);
  const members = useOrgMembers(orgId);

  const [showChannelModal, setShowChannelModal] = React.useState(false);
  const [showDMModal, setShowDMModal] = React.useState(false);

  const hasThreadActive = !!channelId || !!dmId;

  const handleChannelCreated = (chId: string) => {
    setShowChannelModal(false);
    navigate(`/chat/c/${chId}`);
  };

  const handleDMCreated = (dId: string) => {
    setShowDMModal(false);
    navigate(`/chat/dm/${dId}`);
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

  const handleStartDM = async (member: UserProfile) => {
    if (!user || !orgId) return;
    const activeDmId = await getOrCreateDM(user.uid, member.uid, orgId);
    navigate(`/chat/dm/${activeDmId}`);
  };

  // If a specific conversation thread is open, render MessageArea fullscreen
  if (hasThreadActive) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col h-[100dvh] w-full overflow-hidden">
        <MessageArea
          channelId={channelId ?? null}
          dmId={dmId ?? null}
          orgId={orgId}
          currentUser={user ? { uid: user.uid, displayName: user.displayName ?? '' } : null}
          profile={userProfile}
          members={members}
          isSidebarCollapsed={true}
        />
      </div>
    );
  }

  // Else, render the beautiful mobile channels/DMs directory list
  return (
    <div className="flex flex-col space-y-5 animate-fluid-pop pb-6">
      
      {/* Channels section */}
      <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CHANNELS</span>
          <button 
            onClick={() => setShowChannelModal(true)}
            className="w-8 h-8 rounded-xl bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            title="Create Channel"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-bold">Syncing channels...</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {channels.map((ch) => {
              const unread = hasUnread(ch);
              const IconComponent = ch.isPrivate ? Lock : Hash;
              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    markChannelRead(ch.id, user!.uid, orgId);
                    navigate(`/chat/c/${ch.id}`);
                  }}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-surface/90 dark:bg-surface/50 border border-border hover:border-primary/30 hover:bg-secondary/40 active:scale-98 transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className={cn("text-xs block truncate", unread ? "font-black text-foreground" : "font-bold text-foreground/80")}>
                        #{ch.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unread && <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Direct messages section */}
      <div className="aether-glass p-4 bg-surface/85 dark:bg-surface/50 border border-border dark:border-border-strong space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">DIRECT MESSAGES</span>
          <button 
            onClick={() => setShowDMModal(true)}
            className="w-8 h-8 rounded-xl bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            title="New Direct Message"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>

        <div className="space-y-1.5">
          {dmThreads.map((thread) => {
            const unread = hasUnreadDM(thread);
            const dmInitials = getDMInitials(thread.participants);
            const dmName = getDMName(thread.participants);

            return (
              <div
                key={thread.id}
                onClick={() => {
                  markDMRead(thread.id, user!.uid);
                  navigate(`/chat/dm/${thread.id}`);
                }}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface/90 dark:bg-surface/50 border border-border hover:border-primary/30 hover:bg-secondary/40 active:scale-98 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                    {dmInitials}
                  </div>
                  <div className="min-w-0">
                    <span className={cn("text-xs block truncate", unread ? "font-black text-foreground" : "font-bold text-foreground/80")}>
                      {dmName}
                    </span>
                    <span className="text-[9px] text-muted-foreground block truncate mt-0.5 font-semibold">
                      {thread.lastMessage || 'Direct message'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unread && <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </div>
              </div>
            );
          })}

          {dmThreads.length === 0 && (
            <div className="py-8 text-center bg-secondary/25 border border-dashed border-border rounded-xl">
              <MessageCircle className="w-7 h-7 text-muted-foreground/50 mx-auto mb-2" />
              <span className="text-xs font-bold text-foreground block">No active threads</span>
              <span className="text-[9px] text-muted-foreground mt-0.5 block">Tap '+' above to start direct discussions.</span>
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

    </div>
  );
}
