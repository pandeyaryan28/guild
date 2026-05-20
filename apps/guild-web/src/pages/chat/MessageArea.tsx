import * as React from 'react';
import { Hash, MessageSquare, Users } from 'lucide-react';
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

interface MessageAreaProps {
  channelId: string | null;
  dmId: string | null;
  orgId: string | undefined;
  currentUser: { uid: string; displayName: string } | null;
  profile: any;
  members: UserProfile[];
}

export function MessageArea({ channelId, dmId, orgId, currentUser, profile, members }: MessageAreaProps) {
  const messages = useMessages(channelId, dmId);
  const { channels } = useChannels(orgId);
  const [dmPartnerName, setDmPartnerName] = React.useState('');
  const [channel, setChannel] = React.useState<Channel | null>(null);

  // Find channel info
  React.useEffect(() => {
    if (channelId) {
      const ch = channels.find((c) => c.id === channelId) ?? null;
      setChannel(ch);
    } else {
      setChannel(null);
    }
  }, [channelId, channels]);

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

  // Mark as read when opened
  React.useEffect(() => {
    if (!currentUser) return;
    if (channelId) markChannelRead(channelId, currentUser.uid);
    if (dmId) markDMRead(dmId, currentUser.uid);
  }, [channelId, dmId, currentUser?.uid]);

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
          ? `💡 **Usage**: \`/task <task title> [@user1 @user2...]\``
          : `💡 **Usage**: \`/task <task title> [@user1 @user2...]\` (omitting mentions assigns to ${dmPartnerName || 'your partner'})`;
        
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
        const errorBody = `❌ Failed to create task: "${taskTitle}". Please try again.`;
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

  const headerTitle = channelId ? `#\u200B${channel?.name ?? '…'}` : dmPartnerName || '…';
  const headerSub = channelId
    ? channel?.description ?? ''
    : `Direct message`;
  const Icon = channelId ? Hash : MessageSquare;

  return (
    <div className="flex flex-1 min-w-0 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-default bg-surface backdrop-blur-sm px-5 py-3.5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary/70" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-foreground">{headerTitle}</h1>
          {headerSub && <p className="text-[11px] text-text-muted truncate">{headerSub}</p>}
        </div>
        {channelId && channel && (
          <div className="ml-auto flex items-center gap-1.5 text-text-muted">
            <Users className="h-3.5 w-3.5" />
            <span className="text-[11px]">{channel.memberCount}</span>
          </div>
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
        placeholder={channelId ? `Message #${channel?.name ?? '…'}` : `Message ${dmPartnerName || '…'}`}
        members={members}
        disabled={!currentUser || !orgId}
      />
    </div>
  );
}
