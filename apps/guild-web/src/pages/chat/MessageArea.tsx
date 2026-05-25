import * as React from 'react';
import { Hash, MessageSquare, Users, ChevronLeft, Lock, Settings, UserPlus, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useChannels } from '../../hooks/useChat';
import { useMessages } from '../../hooks/useChat';
import { sendChannelMessage, sendDMMessage, markChannelRead, markDMRead } from '../../lib/chat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { type UserProfile } from '../../lib/firestore';
import { db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { type Channel } from '../../lib/chat';
import { createTask } from '../../lib/tasks';
import { InviteChannelMembersModal } from '../../components/chat/InviteChannelMembersModal';
import { ChannelSettingsModal } from '../../components/chat/ChannelSettingsModal';

interface MessageAreaProps {
  channelId: string | null;
  dmId: string | null;
  orgId: string | undefined;
  currentUser: { uid: string; displayName: string } | null;
  profile: any;
  members: UserProfile[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  isMemberPanelCollapsed?: boolean;
  onToggleMemberPanel?: () => void;
}

export function MessageArea({ 
  channelId, 
  dmId, 
  orgId, 
  currentUser, 
  profile, 
  members,
  isSidebarCollapsed = false,
  onToggleSidebar,
  isMemberPanelCollapsed = false,
  onToggleMemberPanel
}: MessageAreaProps) {
  const navigate = useNavigate();
  const messages = useMessages(channelId, dmId);
  const { channels } = useChannels(orgId);
  const [dmPartnerName, setDmPartnerName] = React.useState('');
  const [channel, setChannel] = React.useState<Channel | null>(null);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);

  // Find channel info
  React.useEffect(() => {
    if (channelId) {
      const ch = channels.find((c) => c.id === channelId) ?? null;
      setChannel(ch);
    } else {
      setChannel(null);
    }
  }, [channelId, channels]);

  const canPost = React.useMemo(() => {
    if (!channelId || !channel) return true;
    if (!channel.isRestricted) return true;
    if (!currentUser) return false;
    return (
      channel.createdBy === currentUser.uid ||
      profile?.role === 'owner' ||
      profile?.role === 'admin'
    );
  }, [channelId, channel, currentUser, profile]);

  // Find DM partner name
  React.useEffect(() => {
    if (!dmId || !currentUser) return;
    const parts = dmId.split('_');
    const otherId = parts.find((p) => p !== currentUser.uid) ?? '';
    const m = members.find((m) => m.uid === otherId);
    if (m) {
      setDmPartnerName(m.fullName);
    } else if (otherId) {
      getDoc(doc(db, 'users', otherId)).then((snap) => {
        if (snap.exists()) setDmPartnerName(snap.data().fullName ?? 'Unknown');
      });
    }
  }, [dmId, currentUser?.uid, members]);

  // Mark as read when opened or when new messages arrive
  React.useEffect(() => {
    if (!currentUser || !orgId) return;
    if (channelId) markChannelRead(channelId, currentUser.uid, orgId);
    if (dmId) markDMRead(dmId, currentUser.uid);
  }, [channelId, dmId, currentUser?.uid, messages?.length, orgId]);

  const handleSend = async (body: string, mentions: string[]) => {
    if (!currentUser || !orgId) return;
    const base = {
      orgId,
      senderId: currentUser.uid,
      senderName: profile?.fullName ?? currentUser.displayName ?? 'User',
      senderUsername: profile?.username ?? 'user',
      body,
      mentions,
    };

    const trimmed = body.trim();
    if (trimmed.startsWith('/task')) {
      const commandArgs = trimmed.slice(5).trim();
      
      // Clean task title by removing @username patterns
      let taskTitle = commandArgs.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();

      if (!taskTitle) {
        const usageText = channelId
          ? `**Usage**: \`/task <task title> [@user1 @user2...]\``
          : `**Usage**: \`/task <task title> [@user1 @user2...]\` (omitting mentions assigns to ${dmPartnerName || 'your partner'})`;
        
        if (channelId) {
          await sendChannelMessage({ ...base, body: usageText, channelId });
        } else if (dmId) {
          await sendDMMessage({ ...base, body: usageText, dmId });
        }
        return;
      }

      try {
        let assigneeIds: string[] = [];

        if (mentions.length > 0) {
          assigneeIds = mentions;
        } else {
          if (dmId) {
            const parts = dmId.split('_');
            const otherId = parts.find((p) => p !== currentUser.uid) ?? '';
            assigneeIds = [otherId];
          } else if (channelId) {
            // Fetch all members of the channel
            const snap = await getDocs(
              query(collection(db, 'channelMembers'), where('channelId', '==', channelId))
            );
            assigneeIds = snap.docs.map((d) => d.data().userId as string);
          }
        }

        // Create the task
        await createTask({
          orgId,
          title: taskTitle,
          description: channelId 
            ? `Assigned via channel discussion by ${base.senderName}.`
            : `Assigned via Direct Message chat by ${base.senderName}.`,
          status: 'todo',
          priority: 'none',
          assigneeIds,
          actor: {
            uid: currentUser.uid,
            name: base.senderName,
          },
        });

        // Send the original message body as typed
        if (channelId) {
          await sendChannelMessage({ ...base, body, channelId });
        } else if (dmId) {
          await sendDMMessage({ ...base, body, dmId });
        }
      } catch (err) {
        console.error('Failed to create task via /task command:', err);
        const errorBody = `**Error**: Failed to create task: "${taskTitle}". Please try again.`;
        if (channelId) {
          await sendChannelMessage({ ...base, body: errorBody, channelId });
        } else if (dmId) {
          await sendDMMessage({ ...base, body: errorBody, dmId });
        }
      }
      return;
    }

    if (channelId) {
      await sendChannelMessage({ ...base, channelId });
    } else if (dmId) {
      await sendDMMessage({ ...base, dmId });
    }
  };

  const headerTitle = channelId ? `${channel?.isPrivate ? '' : '#'}\u200B${channel?.name ?? '…'}` : dmPartnerName || '…';
  const headerSub = channelId
    ? channel?.description ?? ''
    : `Direct message`;
  const Icon = channelId ? (channel?.isPrivate ? Lock : Hash) : MessageSquare;

  const isChannelAdmin = React.useMemo(() => {
    if (!channel || !currentUser) return false;
    return (
      channel.createdBy === currentUser.uid ||
      profile?.role === 'owner' ||
      profile?.role === 'admin'
    );
  }, [channel, currentUser, profile]);

  return (
    <div className="flex flex-1 min-w-0 flex-col bg-background relative">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-default bg-surface backdrop-blur-sm px-5 py-3.5 shrink-0">
        <button
          onClick={() => navigate('/chat')}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent/40 hover:text-foreground shrink-0 transition-colors"
          title="Back to Channels"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Toggle Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent/40 hover:text-foreground shrink-0 transition-colors"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
            ) : (
              <PanelLeftClose className="h-4.5 w-4.5" />
            )}
          </button>
        )}

        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary/70" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-foreground flex items-center gap-1">{headerTitle}</h1>
          {headerSub && <p className="text-[11px] text-text-muted truncate">{headerSub}</p>}
        </div>
        {channelId && channel && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[11px]">{channel.memberCount}</span>
            </div>

            {/* Invite Button */}
            <button
              onClick={() => setShowInviteModal(true)}
              title="Add members"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-colors shrink-0"
            >
              <UserPlus className="h-4 w-4" />
            </button>

            {/* Settings Gear Button */}
            {isChannelAdmin && (
              <button
                onClick={() => setShowSettingsModal(true)}
                title="Channel settings"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-colors shrink-0"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Right Sidebar Toggle Button */}
        {onToggleMemberPanel && (
          <button
            onClick={onToggleMemberPanel}
            className={cn(
              "hidden xl:flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-bg-tertiary hover:text-foreground shrink-0 transition-colors ml-1",
              !channelId && "ml-auto"
            )}
            title={isMemberPanelCollapsed ? "Expand Members List" : "Collapse Members List"}
          >
            {isMemberPanelCollapsed ? (
              <PanelRightOpen className="h-4.5 w-4.5 text-primary" />
            ) : (
              <PanelRightClose className="h-4.5 w-4.5" />
            )}
          </button>
        )}
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={currentUser?.uid ?? ''}
        members={members.map((m) => ({ uid: m.uid, fullName: m.fullName, username: m.username }))}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        placeholder={
          !canPost
            ? 'Only administrators can send messages in this channel'
            : channelId
            ? `Message #${channel?.name ?? '…'}`
            : `Message ${dmPartnerName || '…'}`
        }
        members={members}
        disabled={!currentUser || !orgId || !canPost}
      />

      {/* Modals */}
      {showInviteModal && channelId && orgId && (
        <InviteChannelMembersModal
          channelId={channelId}
          orgId={orgId}
          currentUser={currentUser}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showSettingsModal && channel && orgId && (
        <ChannelSettingsModal
          channel={channel}
          orgId={orgId}
          currentUserProfile={profile}
          onClose={() => setShowSettingsModal(false)}
          onUpdated={() => {
            // Merged listener will handle updating channels in real-time, but this triggers a quick state redraw
          }}
        />
      )}
    </div>
  );
}
