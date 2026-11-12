import * as React from 'react';
import {
  Hash, MessageSquare, Users, ChevronLeft, Lock, Settings, UserPlus,
  PanelLeftClose, PanelLeftOpen, FileText, Webhook, Copy, Check, Send,
  Download, Bot, Sparkles, ExternalLink, Info, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useChannels, useMessages } from '../../hooks/useChat';
import {
  sendChannelMessage, sendDMMessage, markChannelRead, markDMRead,
  generateChannelWebhook
} from '../../lib/chat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { type UserProfile } from '../../lib/firestore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { enqueueOfflineMessage, syncOfflineMessages } from '../../lib/offlineSync';
import { AnimatePresence, motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { type Channel, type Message } from '../../lib/chat';
import { createTask } from '../../lib/tasks';
import { createGoal } from '../../lib/goals';
import { createRequest } from '../../lib/requests';
import { InviteChannelMembersModal } from '../../components/chat/InviteChannelMembersModal';
import { avatarInitials, avatarHue } from '../../components/MemberProfileDrawer';
import { type MessageAttachment } from '@guild/types';
import { getOrCreateCanvas, updateCanvasContent } from '../../lib/canvases';
import { generateWebhookDocsPdf } from '../../utils/generateWebhookPdf';

function resolveDmOtherUserId(dmId: string, currentUid: string, membersList?: Array<{ uid: string }>): string {
  if (!dmId || !currentUid) return '';
  if (dmId.startsWith(currentUid + '_')) {
    return dmId.slice(currentUid.length + 1);
  }
  if (dmId.endsWith('_' + currentUid)) {
    return dmId.slice(0, -(currentUid.length + 1));
  }
  if (membersList && membersList.length > 0) {
    const matched = membersList.find((m) => m.uid !== currentUid && dmId.includes(m.uid));
    if (matched) return matched.uid;
  }
  const parts = dmId.split('_');
  if (parts.length === 2) {
    return parts.find((p) => p !== currentUid) ?? '';
  }
  return '';
}

interface MessageAreaProps {
  channelId: string | null;
  dmId: string | null;
  orgId: string | undefined;
  currentUser: { uid: string; displayName: string } | null;
  profile: any;
  members: UserProfile[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenDiscussion?: (msg: Message) => void;
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
  onOpenDiscussion
}: MessageAreaProps) {
  const navigate = useNavigate();
  const { messages, loadingOlder, hasMore, loadOlderMessages } = useMessages(channelId, dmId, orgId);
  const { channels } = useChannels(orgId);
  const [dmPartnerName, setDmPartnerName] = React.useState('');
  const [channel, setChannel] = React.useState<Channel | null>(null);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotedMessage, setQuotedMessage] = React.useState<Message | null>(null);

  // Webhooks & Plugins Integration state
  const [showIntegrationsFlyout, setShowIntegrationsFlyout] = React.useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = React.useState(false);
  const [generatingWebhook, setGeneratingWebhook] = React.useState(false);
  const [testingWebhook, setTestingWebhook] = React.useState(false);
  const [testWebhookStatus, setTestWebhookStatus] = React.useState<{ success: boolean; message: string } | null>(null);
  const [downloadingDoc, setDownloadingDoc] = React.useState(false);

  // Reset quote & integrations flyout when switching channel or DM
  React.useEffect(() => {
    setQuotedMessage(null);
    setShowIntegrationsFlyout(false);
    setTestWebhookStatus(null);
  }, [channelId, dmId]);

  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://guildorbit.com';

  const webhookUrl = React.useMemo(() => {
    if (!channel?.webhookToken || !channelId) return '';
    return `${origin}/api/webhooks/channel?channelId=${channelId}&token=${channel.webhookToken}`;
  }, [channelId, channel?.webhookToken, origin]);

  const handleCopyWebhookUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy webhook URL:', err);
    }
  };

  const handleGenerateWebhookQuick = async () => {
    if (!channelId || generatingWebhook) return;
    setGeneratingWebhook(true);
    try {
      const botName = channel?.webhookBotName || 'Inbound Bot';
      const res = await generateChannelWebhook(channelId, botName, currentUser?.uid);
      setChannel((prev) => prev ? { ...prev, webhookToken: res.token } : prev);
    } catch (err) {
      console.error('Failed to generate webhook token:', err);
    } finally {
      setGeneratingWebhook(false);
    }
  };

  const handleTestWebhookQuick = async () => {
    if (!webhookUrl || testingWebhook) return;
    setTestingWebhook(true);
    setTestWebhookStatus(null);
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Header Integration Test',
          message: `Inbound webhook test triggered from #${channel?.name || 'channel'} header quick action.`,
          customerName: currentUser?.displayName || 'Integration Test Bot',
          customerEmail: 'integration-test@guildorbit.com',
          source: 'channel-header',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTestWebhookStatus({ success: true, message: 'Test message delivered to chat feed!' });
      } else {
        setTestWebhookStatus({
          success: false,
          message: data.error || 'Failed to deliver test payload.',
        });
      }
    } catch (err: any) {
      setTestWebhookStatus({
        success: false,
        message: err.message || 'Network error delivering test message.',
      });
    } finally {
      setTestingWebhook(false);
      setTimeout(() => setTestWebhookStatus(null), 5000);
    }
  };

  const handleDownloadDocQuick = () => {
    if (!channel) return;
    setDownloadingDoc(true);
    try {
      generateWebhookDocsPdf({
        channelName: channel.name,
        channelId: channel.id,
        webhookUrl: webhookUrl || `${origin}/api/webhooks/channel?channelId=${channel.id}&token=${channel.webhookToken || 'YOUR_TOKEN'}`,
        webhookToken: channel.webhookToken || '',
        botName: channel.webhookBotName || 'Inbound Bot',
        autoCreateTask: channel.webhookAutoCreateTask || false,
        origin,
      });
    } catch (err) {
      console.error('Failed to generate webhook documentation PDF:', err);
    } finally {
      setTimeout(() => setDownloadingDoc(false), 600);
    }
  };

  const handleOpenFullSettings = () => {
    const params = new URLSearchParams(searchParams);
    params.set('settings', 'true');
    params.set('tab', 'integrations');
    setSearchParams(params);
    setShowIntegrationsFlyout(false);
  };

  // PWA Offline Message Sync Hooks
  const isOnline = useOnlineStatus();
  const [offlineToast, setOfflineToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOnline && currentUser && orgId) {
      syncOfflineMessages((msg) => {
        setOfflineToast(`Synced offline message: "${msg.body.slice(0, 15)}..."`);
        setTimeout(() => setOfflineToast(null), 3500);
      }).catch((err) => console.error('Failed to sync offline messages', err));
    }
  }, [isOnline, currentUser, orgId]);

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

  const [dmPartner, setDmPartner] = React.useState<UserProfile | null>(null);

  // Find DM partner profile and name
  React.useEffect(() => {
    let isCurrent = true;

    if (!dmId || !currentUser) {
      setDmPartner(null);
      setDmPartnerName('');
      return;
    }

    const resolvePartner = async () => {
      let otherId = resolveDmOtherUserId(dmId, currentUser.uid, members);

      // If otherId could not be resolved from dmId string, inspect directMessages doc participants
      if (!otherId) {
        try {
          const dmSnap = await getDoc(doc(db, 'directMessages', dmId));
          if (!isCurrent) return;
          if (dmSnap.exists()) {
            const data = dmSnap.data();
            const participants: string[] = data?.participants || [];
            otherId = participants.find((p) => p !== currentUser.uid) || participants[0] || '';
          }
        } catch (err) {
          console.error('Failed to fetch direct message thread doc:', err);
        }
      }

      if (!otherId) {
        if (isCurrent) {
          setDmPartner(null);
          setDmPartnerName('Direct Message');
        }
        return;
      }

      // Check if partner is already in members list
      const matchedMember = members.find((m) => m.uid === otherId);
      if (matchedMember) {
        if (isCurrent) {
          setDmPartner(matchedMember);
          setDmPartnerName(matchedMember.fullName || (matchedMember as any).displayName || matchedMember.username || 'Team Member');
        }
        return;
      }

      // If not in members list, fetch user document from Firestore
      try {
        const userSnap = await getDoc(doc(db, 'users', otherId));
        if (!isCurrent) return;
        if (userSnap.exists()) {
          const profileData = userSnap.data() as UserProfile;
          setDmPartner(profileData);
          setDmPartnerName(
            profileData.fullName || (profileData as any).displayName || profileData.username || 'Team Member'
          );
        } else {
          setDmPartner(null);
          setDmPartnerName('Team Member');
        }
      } catch (err) {
        console.error('Failed to load DM partner profile:', err);
        if (isCurrent) {
          setDmPartner(null);
          setDmPartnerName('Team Member');
        }
      }
    };

    resolvePartner();

    return () => {
      isCurrent = false;
    };
  }, [dmId, currentUser?.uid, members]);

  // Mark as read when opened or when new messages arrive
  React.useEffect(() => {
    if (!currentUser || !orgId) return;
    if (channelId) markChannelRead(channelId, currentUser.uid, orgId);
    if (dmId) markDMRead(dmId, currentUser.uid, orgId);
  }, [channelId, dmId, currentUser?.uid, messages?.length, orgId]);

  const handleSend = async (
    body: string,
    mentions: string[],
    files?: MessageAttachment[],
    parentMessageId?: string,
    parentMessage?: { id: string; senderName: string; body: string }
  ) => {
    if (!currentUser || !orgId) return;
    const base = {
      orgId,
      senderId: currentUser.uid,
      senderName: profile?.fullName ?? currentUser.displayName ?? 'User',
      senderUsername: profile?.username ?? 'user',
      body,
      mentions,
      files,
      parentMessageId,
      parentMessage,
    };

    if (!isOnline) {
      enqueueOfflineMessage({
        channelId: channelId || undefined,
        dmId: dmId || undefined,
        orgId,
        senderId: currentUser.uid,
        senderName: base.senderName,
        senderUsername: base.senderUsername,
        body,
        mentions,
        files,
        parentMessageId,
        parentMessage,
      });
      setOfflineToast('Operating offline. Message queued for automatic sync.');
      setTimeout(() => setOfflineToast(null), 4000);
      return;
    }

    const trimmed = body.trim();
    const isGoal = /^\/goal(\s|$)/.test(trimmed);
    const isRequest = /^\/request(\s|$)/.test(trimmed);
    const isTask = /^\/task(\s|$)/.test(trimmed);

    if (isGoal) {
      const commandArgs = trimmed.slice(5).trim();
      let goalTitle = commandArgs.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();

      const textMentions = (trimmed.match(/@\w+/g) || [])
        .map((m) => m.slice(1))
        .map((uname) => members.find((m) => m.username.toLowerCase() === uname.toLowerCase())?.uid)
        .filter((id): id is string => !!id);

      const combinedMentions = Array.from(new Set([...mentions, ...textMentions]));

      let ownerId = currentUser.uid;
      if (dmId) {
        const otherId = resolveDmOtherUserId(dmId, currentUser.uid, members) || currentUser.uid;
        ownerId = combinedMentions[0] || otherId;
      } else if (channelId) {
        ownerId = combinedMentions[0] || currentUser.uid;
      }

      if (!goalTitle) {
        const usageText = channelId
          ? `**Usage**: \`/goal <goal title> [@username]\``
          : `**Usage**: \`/goal <goal title>\``;
        if (channelId) {
          await sendChannelMessage({ ...base, body: usageText, channelId });
        } else if (dmId) {
          await sendDMMessage({ ...base, body: usageText, dmId });
        }
        return;
      }

      try {
        const goalId = await createGoal({
          orgId,
          title: goalTitle,
          description: channelId 
            ? `Goal created via channel discussion by ${base.senderName}.`
            : `Goal created via Direct Message chat by ${base.senderName}.`,
          actor: {
            uid: currentUser.uid,
            name: base.senderName,
          },
          ownerId,
          horizon: 'short_term',
          recurrence: 'none',
        });

        if (channelId) {
          await sendChannelMessage({ ...base, body, channelId, goalId, goalStatus: 'active' } as any);
        } else if (dmId) {
          await sendDMMessage({ ...base, body, dmId, goalId, goalStatus: 'active' } as any);
        }
      } catch (err) {
        console.error('Failed to create goal via /goal command:', err);
        const errorBody = `**Error**: Failed to create goal: "${goalTitle}". Please try again.`;
        if (channelId) {
          await sendChannelMessage({ ...base, body: errorBody, channelId });
        } else if (dmId) {
          await sendDMMessage({ ...base, body: errorBody, dmId });
        }
      }
      return;
    }

    if (isRequest) {
      const commandArgs = trimmed.slice(8).trim();
      let requestTitle = commandArgs.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();

      const rawMentions = (trimmed.match(/@\w+/g) || [])
        .map((m) => m.slice(1))
        .map((uname) => members.find((m) => m.username.toLowerCase() === uname.toLowerCase())?.uid)
        .filter((id): id is string => !!id);

      let approverId = rawMentions[0] || mentions[0];

      if (!approverId && dmId && currentUser) {
        approverId = resolveDmOtherUserId(dmId, currentUser.uid, members);
      }

      const approver = approverId ? members.find((m) => m.uid === approverId) : null;

      if (!requestTitle || !approver) {
        const usageText = `**Usage**: \`/request <request title> @approver\``;
        if (channelId) {
          await sendChannelMessage({ ...base, body: usageText, channelId });
        } else if (dmId) {
          await sendDMMessage({ ...base, body: usageText, dmId });
        }
        return;
      }

      try {
        const requestId = await createRequest({
          orgId,
          creatorId: currentUser.uid,
          creatorName: base.senderName,
          creatorUsername: base.senderUsername,
          approverId: approver.uid,
          approverName: approver.fullName,
          approverUsername: approver.username,
          type: 'other',
          title: requestTitle,
          description: channelId 
            ? `Request submitted via channel discussion by ${base.senderName}.`
            : `Request submitted via Direct Message chat by ${base.senderName}.`,
        });

        if (channelId) {
          await sendChannelMessage({ ...base, body, channelId, requestId, requestStatus: 'pending' } as any);
        } else if (dmId) {
          await sendDMMessage({ ...base, body, dmId, requestId, requestStatus: 'pending' } as any);
        }
      } catch (err) {
        console.error('Failed to create request via /request command:', err);
        const errorBody = `**Error**: Failed to create request: "${requestTitle}". Please try again.`;
        if (channelId) {
          await sendChannelMessage({ ...base, body: errorBody, channelId });
        } else if (dmId) {
          await sendDMMessage({ ...base, body: errorBody, dmId });
        }
      }
      return;
    }

    if (isTask) {
      const commandArgs = trimmed.slice(5).trim();
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

        const textMentions = (trimmed.match(/@\w+/g) || [])
          .map((m) => m.slice(1))
          .map((uname) => members.find((m) => m.username.toLowerCase() === uname.toLowerCase())?.uid)
          .filter((id): id is string => !!id);

        const combinedMentions = Array.from(new Set([...mentions, ...textMentions]));

        if (combinedMentions.length > 0) {
          assigneeIds = combinedMentions;
        } else {
          if (dmId) {
            const otherId = resolveDmOtherUserId(dmId, currentUser.uid, members) || currentUser.uid;
            assigneeIds = [otherId];
          } else if (channelId) {
            assigneeIds = [currentUser.uid];
          }
        }

        const taskId = await createTask({
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

        if (channelId) {
          await sendChannelMessage({ ...base, body, channelId, taskId } as any);
        } else if (dmId) {
          await sendDMMessage({ ...base, body, dmId, taskId } as any);
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
    setQuotedMessage(null);
  };

  const handleCanvasNote = React.useCallback(async (msg: Message) => {
    // Open canvas drawer
    const newParams = new URLSearchParams(searchParams);
    newParams.set('canvas', 'true');
    setSearchParams(newParams);

    // Save note to Firestore canvas if chatId & orgId exist
    const chatId = channelId || dmId;
    if (chatId && orgId && currentUser) {
      try {
        const canvasId = await getOrCreateCanvas(orgId, chatId, currentUser.uid, profile?.fullName || currentUser.displayName || 'User');
        const snap = await getDoc(doc(db, 'canvases', canvasId));
        const existingContent = snap.exists() ? (snap.data().content || '') : '';
        const noteHtml = `<p><strong>${msg.senderName}:</strong> ${msg.body}</p>`;
        const updatedContent = existingContent ? `${existingContent}${noteHtml}` : `<h2>Notes</h2>${noteHtml}`;
        await updateCanvasContent(canvasId, updatedContent, snap.exists() ? (snap.data().title || 'Channel Notes') : 'Channel Notes', currentUser.uid, profile?.fullName || currentUser.displayName || 'User');
      } catch (err) {
        console.error('Failed to append message to canvas note:', err);
      }
    }
  }, [channelId, dmId, orgId, currentUser, profile, searchParams, setSearchParams]);

  const headerTitle = channelId
    ? `${channel?.isPrivate ? '' : '#'}\u200B${channel?.name ?? '…'}`
    : dmPartnerName || dmPartner?.fullName || 'Direct Message';
  const headerSub = channelId
    ? channel?.description ?? ''
    : dmPartner?.focusStatus?.text 
      ? `Status: "${dmPartner.focusStatus.text}"`
      : `Direct Message`;
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
    <div className="flex flex-1 min-w-0 flex-col bg-background relative h-full overflow-hidden">
      {/* Conversation Header */}
      <div className="flex items-center gap-3 border-b border-border bg-surface/90 backdrop-blur-2xl px-4 py-2.5 shrink-0 z-10 select-none shadow-xs">
        <button
          type="button"
          onClick={() => {
            if (onToggleSidebar && isSidebarCollapsed) {
              onToggleSidebar();
            } else {
              navigate('/chat');
            }
          }}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0 transition-colors cursor-pointer active:scale-95"
          title="Back to Directory"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Sidebar Collapse Toggle */}
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0 transition-colors cursor-pointer"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5 text-primary" />
            ) : (
              <PanelLeftClose className="h-4.5 w-4.5" />
            )}
          </button>
        )}

        {/* Channel or DM Avatar */}
        {dmId ? (
          (() => {
            const otherId = resolveDmOtherUserId(dmId, currentUser?.uid || '', members) || dmPartner?.uid || '';
            const displayName = dmPartnerName || dmPartner?.fullName || dmPartner?.username || 'DM';
            const initials = avatarInitials(displayName);
            return (
              <div 
                className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 border border-border relative shadow-xs"
                style={{ background: `hsl(${avatarHue(otherId || displayName)} 55% 45%)` }}
              >
                {dmPartner?.photoURL ? (
                  <img src={dmPartner.photoURL} alt={displayName} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <span className="text-xs font-bold text-white">{initials}</span>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-surface flex items-center justify-center shadow-xs">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    dmPartner?.availabilityStatus === 'focus' ? "bg-red-500" :
                    dmPartner?.availabilityStatus === 'away' ? "bg-amber-500" :
                    dmPartner?.availabilityStatus === 'active' ? "bg-emerald-500" : "bg-zinc-400"
                  )} />
                </span>
              </div>
            );
          })()
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}

        {/* Title and Subtitle / Status */}
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
              {headerTitle}
            </h1>
            {headerSub && (
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {headerSub}
              </p>
            )}
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Canvas Drawer Toggle */}
          {(channelId || dmId) && (
            <button
              type="button"
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                const isCanvasOpen = newParams.get('canvas') === 'true';
                if (isCanvasOpen) {
                  newParams.delete('canvas');
                } else {
                  newParams.set('canvas', 'true');
                }
                setSearchParams(newParams);
              }}
              title="Toggle Canvas"
              className={cn(
                "flex h-8.5 w-8.5 items-center justify-center rounded-xl transition-all shrink-0 cursor-pointer border",
                searchParams.get('canvas') === 'true'
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <FileText className="h-4 w-4" />
            </button>
          )}

          {channelId && channel && (
            <>
              {/* Webhooks & Plugins Integration Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIntegrationsFlyout(!showIntegrationsFlyout)}
                  title="Webhooks & Plugins"
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-2xs active:scale-[0.98]",
                    channel.webhookToken
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15"
                      : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    {channel.webhookToken ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/40" />
                    )}
                  </span>
                  <Webhook className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Webhooks & Plugins</span>
                  <span className="sm:hidden">Plugins</span>
                </button>

                {/* Quick Access Popover Flyout */}
                <AnimatePresence>
                  {showIntegrationsFlyout && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowIntegrationsFlyout(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-3xl border border-border dark:border-border-strong bg-surface/95 dark:bg-surface/85 backdrop-blur-2xl shadow-2xl shadow-black/25 dark:shadow-black/70 p-4 space-y-3.5 select-none"
                      >
                        {/* Flyout Header */}
                        <div className="flex items-center justify-between border-b border-border/80 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                              <Webhook className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-foreground">Webhooks & Plugins</h3>
                              <p className="text-[10px] text-muted-foreground">#{channel.name} Integrations</p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                              channel.webhookToken
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-secondary text-muted-foreground border-border"
                            )}
                          >
                            {channel.webhookToken ? 'Active' : 'Unconfigured'}
                          </span>
                        </div>

                        {/* Body */}
                        {channel.webhookToken ? (
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-border/80 bg-secondary/40 p-3 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                  <Bot className="h-3.5 w-3.5 text-primary" />
                                  {channel.webhookBotName || 'Inbound Bot'}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">POST Endpoint</span>
                              </div>
                              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground overflow-hidden">
                                <span className="truncate flex-1 select-all">{webhookUrl}</span>
                              </div>
                            </div>

                            {/* Quick Actions Grid */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={handleCopyWebhookUrl}
                                className={cn(
                                  "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-[0.98] cursor-pointer",
                                  copiedWebhookUrl
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : "bg-surface hover:bg-secondary border-border text-foreground"
                                )}
                              >
                                {copiedWebhookUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                <span>{copiedWebhookUrl ? 'Copied URL' : 'Copy URL'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleTestWebhookQuick}
                                disabled={testingWebhook}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-secondary border border-border text-foreground transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                              >
                                {testingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                <span>Test Webhook</span>
                              </button>
                            </div>

                            {/* Test Status feedback */}
                            {testWebhookStatus && (
                              <div
                                className={cn(
                                  "rounded-xl p-2.5 text-[11px] flex items-center gap-2 border",
                                  testWebhookStatus.success
                                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                                    : "bg-destructive/10 border-destructive/25 text-destructive"
                                )}
                              >
                                {testWebhookStatus.success ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                ) : (
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                                )}
                                <span className="truncate">{testWebhookStatus.message}</span>
                              </div>
                            )}

                            {/* PDF Guide Download button */}
                            <button
                              type="button"
                              onClick={handleDownloadDocQuick}
                              disabled={downloadingDoc}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary/80 hover:bg-secondary border border-border text-foreground transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                            >
                              {downloadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              <span>Download Integration Guide (PDF)</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 py-1">
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Connect external contact forms, website inquiry widgets, and automated alert systems directly to this channel.
                            </p>

                            {isChannelAdmin ? (
                              <button
                                type="button"
                                onClick={handleGenerateWebhookQuick}
                                disabled={generatingWebhook}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {generatingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                <span>Generate Webhook Token</span>
                              </button>
                            ) : (
                              <div className="rounded-xl border border-border bg-secondary/40 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
                                <Info className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                                <span>Channel creators or workspace administrators can generate webhook tokens for this channel.</span>
                              </div>
                            )}

                            {/* View/download guide even when unconfigured */}
                            <button
                              type="button"
                              onClick={handleDownloadDocQuick}
                              disabled={downloadingDoc}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-secondary border border-border text-foreground transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                            >
                              {downloadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                              <span>View Integration Guide (PDF)</span>
                            </button>
                          </div>
                        )}

                        {/* Footer Link to Full Settings */}
                        <div className="border-t border-border/80 pt-2.5 flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={handleOpenFullSettings}
                            className="font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Channel Settings & API Specs</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowIntegrationsFlyout(false)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary/50 border border-border text-muted-foreground text-xs font-mono">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold">{channel.memberCount}</span>
              </div>

              {/* Invite Teammates */}
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                title="Add members"
                className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
              </button>

              {/* Channel Settings Gear - accessible to all, with member/admin mode */}
              <button
                type="button"
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('settings', 'true');
                  setSearchParams(newParams);
                }}
                title={isChannelAdmin ? "Channel settings" : "Channel details & members"}
                className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Message List Feed */}
      <MessageList
        messages={messages}
        currentUserId={currentUser?.uid ?? ''}
        members={members.map((m) => ({ uid: m.uid, fullName: m.fullName, username: m.username, photoURL: m.photoURL }))}
        orgId={orgId}
        currentUser={currentUser}
        onOpenDiscussion={onOpenDiscussion}
        loadOlderMessages={loadOlderMessages}
        loadingOlder={loadingOlder}
        hasMore={hasMore}
        onQuoteMessage={(msg) => setQuotedMessage(msg)}
        onCanvasNote={handleCanvasNote}
      />

      {/* Floating Island Composer */}
      <MessageInput
        onSend={handleSend}
        placeholder={
          !canPost
            ? 'Only administrators can send messages in this channel'
            : channelId
            ? `Message #${channel?.name ?? '…'}`
            : `Message ${dmPartnerName || dmPartner?.fullName || 'Direct Message'}`
        }
        members={members}
        disabled={!currentUser || !orgId || !canPost}
        chatId={channelId || dmId || ''}
        quotedMessage={quotedMessage}
        onClearQuote={() => setQuotedMessage(null)}
      />

      {/* Invite Modal */}
      {showInviteModal && channelId && orgId && (
        <InviteChannelMembersModal
          channelId={channelId}
          orgId={orgId}
          currentUser={currentUser}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Offline Messaging Indicator Toast */}
      <AnimatePresence>
        {offlineToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[9995] pointer-events-none px-4"
          >
            <div className="px-4 py-2 rounded-full border border-amber-500/30 bg-amber-950/80 backdrop-blur-xl text-amber-300 font-extrabold text-[10px] tracking-widest shadow-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>{offlineToast.toUpperCase()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
