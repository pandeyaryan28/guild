import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pencil, Trash2, Check, X, File, FileText,
  FileAudio, Download, Play, Maximize2, Smile,
  MessageSquare, Loader2, CornerUpLeft, MoreHorizontal,
  Copy, CheckCheck, Sparkles, CheckSquare, Target, ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Message, editMessage, deleteMessage } from '../../lib/chat';
import { MediaLightbox } from './MediaLightbox';
import { toggleReaction, addMessageReply, listenToReplies, type MessageReply } from '../../lib/replies';
import { TaskMessageCard, GoalMessageCard, RequestMessageCard } from '../../components/chat/cards';
import { avatarInitials, avatarHue } from '../../components/MemberProfileDrawer';
import { createWorkspaceIssue } from '../../lib/workspaceIssues';
import type { IssuePriority } from '@guild/types';

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
  return parts.find((p) => p !== currentUid) ?? '';
}

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGrouped: boolean;
  members: Array<{ uid: string; fullName: string; username: string; photoURL?: string; role?: string; managerId?: string }>;
  orgId?: string;
  currentUser?: { uid: string; displayName: string } | null;
  onOpenDiscussion?: (msg: Message) => void;
  onQuoteMessage?: (msg: Message) => void;
  onCanvasNote?: (msg: Message) => void;
  onConvertToIssue?: (msg: Message) => void;
}

function parseMentions(body: string, isOwn: boolean) {
  const parts = body.split(/(@\w+|\/(?:task|goal|request)\b)/gi);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className={cn(
            'font-medium rounded-md px-1.5 py-0.5 mx-0.5 text-xs inline-block transition-colors select-none',
            isOwn
              ? 'text-white bg-white/20 border border-white/25'
              : 'text-primary bg-primary/10 border border-primary/20',
          )}
        >
          {part}
        </span>
      );
    }

    const lower = part.toLowerCase();
    if (lower === '/task') {
      return (
        <span
          key={i}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold mx-0.5 align-middle select-none border',
            isOwn
              ? 'bg-white/25 text-white border-white/30'
              : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25',
          )}
        >
          <CheckSquare className="h-3 w-3" />
          <span>Task</span>
        </span>
      );
    }

    if (lower === '/goal') {
      return (
        <span
          key={i}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold mx-0.5 align-middle select-none border',
            isOwn
              ? 'bg-white/25 text-white border-white/30'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
          )}
        >
          <Target className="h-3 w-3" />
          <span>Goal</span>
        </span>
      );
    }

    if (lower === '/request') {
      return (
        <span
          key={i}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold mx-0.5 align-middle select-none border',
            isOwn
              ? 'bg-white/25 text-white border-white/30'
              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25',
          )}
        >
          <ClipboardList className="h-3 w-3" />
          <span>Request</span>
        </span>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function formatTime(ts: { toDate: () => Date } | undefined) {
  if (!ts) return '';
  const d = typeof (ts as any).toDate === 'function' ? ts.toDate() : new Date((ts as any).seconds ? (ts as any).seconds * 1000 : (ts as any));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getSenderColor(username: string) {
  const colors = [
    'text-red-600 dark:text-red-400 font-semibold',
    'text-amber-600 dark:text-amber-400 font-semibold',
    'text-emerald-600 dark:text-emerald-400 font-semibold',
    'text-cyan-600 dark:text-cyan-400 font-semibold',
    'text-blue-600 dark:text-blue-400 font-semibold',
    'text-indigo-600 dark:text-indigo-400 font-semibold',
    'text-purple-600 dark:text-purple-400 font-semibold',
    'text-pink-600 dark:text-pink-400 font-semibold',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '🚀', '✅', '👀'];

export function MessageBubble({
  message,
  isOwn,
  isGrouped,
  members,
  orgId,
  currentUser,
  onOpenDiscussion,
  onQuoteMessage,
  onCanvasNote,
  onConvertToIssue,
}: MessageBubbleProps) {
  const sender = members.find((m) => m.uid === message.senderId);
  const photoURL = sender?.photoURL;

  const [hovered, setHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(message.body);
  const [saving, setSaving] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Quick Issue Conversion Modal State (fallback if onConvertToIssue not provided)
  const [showIssueModal, setShowIssueModal] = React.useState(false);
  const [issueTitle, setIssueTitle] = React.useState('');
  const [issueAssigneeId, setIssueAssigneeId] = React.useState('');
  const [issuePriority, setIssuePriority] = React.useState<IssuePriority>('medium');
  const [isCreatingIssue, setIsCreatingIssue] = React.useState(false);

  const isEditable = React.useMemo(() => {
    if (!message.createdAt) return false;
    let createdTime: number;
    if (typeof message.createdAt.toDate === 'function') {
      createdTime = message.createdAt.toDate().getTime();
    } else if (message.createdAt instanceof Date) {
      createdTime = (message.createdAt as Date).getTime();
    } else if (typeof message.createdAt === 'object' && 'seconds' in message.createdAt) {
      createdTime = (message.createdAt as any).seconds * 1000;
    } else {
      createdTime = new Date(message.createdAt as any).getTime();
    }
    const oneHour = 60 * 60 * 1000;
    return Date.now() - createdTime < oneHour;
  }, [message.createdAt]);

  const [isRepliesExpanded, setIsRepliesExpanded] = React.useState(false);
  const [replies, setReplies] = React.useState<MessageReply[] | null>(null);
  const [replyBody, setReplyBody] = React.useState('');
  const [replySending, setReplySending] = React.useState(false);
  const replyTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!hovered) {
      setShowEmojiPicker(false);
    }
  }, [hovered]);

  React.useEffect(() => {
    if (!isRepliesExpanded) {
      setReplies(null);
      return;
    }
    const unsub = listenToReplies(message.id, (data) => {
      setReplies(data);
    }, orgId);
    return () => unsub();
  }, [isRepliesExpanded, message.id, orgId]);

  const handleSendReply = async () => {
    const trimmed = replyBody.trim();
    if (!trimmed || replySending || !currentUser || !orgId) return;
    setReplySending(true);

    try {
      await addMessageReply({
        messageId: message.id,
        orgId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        senderUsername: members.find((m) => m.uid === currentUser.uid)?.username || 'user',
        body: trimmed,
      });
      setReplyBody('');
      setTimeout(() => replyTextareaRef.current?.focus(), 50);
    } catch (err) {
      console.error('Failed to add inline reply:', err);
    } finally {
      setReplySending(false);
    }
  };

  const handleEdit = async () => {
    if (!editBody.trim() || editBody === message.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await editMessage(message.id, editBody.trim());
      setEditing(false);
    } catch (err: any) {
      console.error('Failed to edit message:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return;
    await deleteMessage(message.id);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert Message directly to Workspace Issue
  const handleTriggerConvertIssue = () => {
    if (onConvertToIssue) {
      onConvertToIssue(message);
    } else {
      setIssueTitle(message.body.slice(0, 100).replace(/\n/g, ' '));
      if (members.length > 0 && !issueAssigneeId) {
        setIssueAssigneeId(members[0].uid);
      }
      setShowIssueModal(true);
    }
  };

  const handleCreateIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim() || !orgId || !currentUser || isCreatingIssue) return;
    setIsCreatingIssue(true);
    try {
      const assignee = members.find((m) => m.uid === issueAssigneeId);
      await createWorkspaceIssue({
        orgId,
        title: issueTitle.trim(),
        descriptionHtml: `<p>Created from chat message by ${message.senderName}:</p><blockquote><p>${message.body}</p></blockquote>`,
        priority: issuePriority,
        assigneeId: assignee?.uid || null,
        assigneeName: assignee?.fullName || null,
        assigneeAvatar: assignee?.photoURL || null,
        teamPrefix: 'ENG',
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Teammate',
      });
      setShowIssueModal(false);
    } catch (err) {
      console.error('Failed to convert message to issue:', err);
    } finally {
      setIsCreatingIssue(false);
    }
  };

  const initials = avatarInitials(message.senderName || '?');

  const isTaskCommand = /^\/task(\s|$)/.test(message.body.trim()) && !message.deleted;
  const isGoalCommand = /^\/goal(\s|$)/.test(message.body.trim()) && !message.deleted;
  const isRequestCommand = /^\/request(\s|$)/.test(message.body.trim()) && !message.deleted;
  const isCard = isTaskCommand || isGoalCommand || isRequestCommand;

  const renderMessageContent = () => {
    if (editing) {
      return (
        <div className="mt-1 w-full min-w-[280px]">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            autoFocus
            rows={2}
            className="w-full resize-none rounded-xl border border-primary/40 bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEdit();
              }
              if (e.key === 'Escape') {
                setEditing(false);
                setEditBody(message.body);
              }
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleEdit}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              <span>Save</span>
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditBody(message.body);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-muted-foreground font-semibold transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      );
    }

    if (isTaskCommand) {
      const args = message.body.trim().slice(5).trim();
      const taskTitle = args.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();
      const taskId = (message as any).taskId;

      return (
        <TaskMessageCard
          taskId={taskId}
          fallbackTitle={taskTitle}
          creatorName={message.senderName}
          members={members}
          currentUser={currentUser}
          orgId={orgId}
        />
      );
    }

    if (isGoalCommand) {
      const args = message.body.trim().slice(5).trim();
      const goalTitle = args.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();
      const goalId = (message as any).goalId;

      return (
        <GoalMessageCard
          goalId={goalId}
          fallbackTitle={goalTitle}
          members={members}
        />
      );
    }

    if (isRequestCommand) {
      const args = message.body.trim().slice(8).trim();
      const requestTitle = args.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();
      const rawMentions = message.body.match(/@\w+/g) || [];

      let approverName = 'Approver';
      let approverId = '';
      if (rawMentions.length > 0) {
        const username = rawMentions[0].slice(1);
        const approverUser = members.find((m) => m.username === username);
        if (approverUser) {
          approverName = approverUser.fullName;
          approverId = approverUser.uid;
        } else {
          approverName = rawMentions[0];
        }
      } else if (message.dmId) {
        approverId = resolveDmOtherUserId(message.dmId, message.senderId, members);
        const approverUser = members.find((m) => m.uid === approverId);
        if (approverUser) {
          approverName = approverUser.fullName;
        }
      }

      const rId = (message as any).requestId;

      return (
        <RequestMessageCard
          requestId={rId}
          fallbackTitle={requestTitle}
          fallbackApproverName={approverName}
          fallbackApproverId={approverId}
          senderId={message.senderId}
          currentUser={currentUser}
          orgId={orgId}
          members={members}
        />
      );
    }

    const taskReactions = (message as any).taskReactions || {};
    const taskReactionEntries = Object.entries(taskReactions);

    return (
      <div className="flex flex-col gap-1.5">
        <p className={cn(
          'text-[14px] leading-relaxed select-text break-words whitespace-pre-wrap',
          message.deleted && 'italic text-muted-foreground'
        )}>
          {parseMentions(message.body, isOwn)}
          {message.editedAt && !message.deleted && (
            <span className="ml-1.5 text-[10px] opacity-70 font-mono">(edited)</span>
          )}
        </p>
        {!message.deleted &&
          taskReactionEntries.map(([reactorId, taskId]) => {
            const reactor = members.find((m) => m.uid === reactorId);
            const reactorName = reactor?.fullName || 'Someone';

            const otherId = (message as any).dmId
              ? resolveDmOtherUserId((message as any).dmId, reactorId, members)
              : '';
            const assignee = members.find((m) => m.uid === otherId);
            const assigneeName = assignee?.fullName || 'Someone';

            return (
              <TaskMessageCard
                key={taskId as string}
                taskId={taskId as string}
                creatorName={reactorName}
                assigneeName={assigneeName}
                members={members}
                currentUser={currentUser}
                orgId={orgId}
              />
            );
          })}
      </div>
    );
  };

  const renderAttachments = () => {
    if (!message.files || message.files.length === 0 || message.deleted) return null;

    const media = message.files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const nonMedia = message.files.filter((f) => !f.type.startsWith('image/') && !f.type.startsWith('video/'));

    return (
      <div className="mt-2.5 flex flex-col gap-2">
        {/* Media Grid */}
        {media.length > 0 && (
          <div
            className={cn(
              'grid gap-2 max-w-xl',
              media.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-2 sm:grid-cols-3',
            )}
          >
            {media.map((file, idx) => {
              const isImage = file.type.startsWith('image/');

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className="group/img relative rounded-2xl overflow-hidden border border-border bg-surface shadow-xs aspect-video max-h-56 transition-all hover:shadow-md hover:border-primary/40 cursor-pointer"
                >
                  {isImage ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-102"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full relative flex items-center justify-center bg-zinc-950 dark:bg-black overflow-hidden">
                      <video src={file.url} className="h-full w-full object-cover opacity-80" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/img:bg-black/40 transition-colors">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-white/25 hover:bg-white/40 text-white backdrop-blur-md border border-white/20 hover:scale-105 transition-all shadow-lg">
                          <Play className="h-5 w-5 fill-white ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase bg-black/70 text-white font-bold backdrop-blur-xs">
                        Video
                      </span>
                    </div>
                  )}

                  {/* Overlay Actions */}
                  <div
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setLightboxIndex(idx)}
                      className="p-2 rounded-xl bg-surface/90 hover:bg-surface text-foreground shadow transition-colors cursor-pointer"
                      title="View Fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <a
                      href={file.url}
                      download={file.name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-surface/90 hover:bg-surface text-foreground shadow transition-colors cursor-pointer"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Non-Media File Attachments */}
        {nonMedia.length > 0 && (
          <div className="flex flex-col gap-1.5 max-w-md">
            {nonMedia.map((file, idx) => {
              let FileIcon = File;
              if (file.type.startsWith('text/') || file.type.includes('pdf')) {
                FileIcon = FileText;
              } else if (file.type.startsWith('audio/')) {
                FileIcon = FileAudio;
              }

              return (
                <div
                  key={idx}
                  className={cn(
                    'group/file flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 shadow-xs transition-all',
                    isOwn
                      ? 'border-white/20 bg-white/10 hover:bg-white/15 text-white'
                      : 'border-border bg-surface hover:bg-secondary text-foreground'
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                    isOwn 
                      ? 'bg-white/20 border-white/20 text-white' 
                      : 'bg-primary/10 border-primary/20 text-primary'
                  )}>
                    <FileIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">
                      {file.name}
                    </p>
                    <p className={cn(
                      'text-[10px] font-mono mt-0.5',
                      isOwn ? 'text-white/80' : 'text-muted-foreground'
                    )}>
                      {(file.size / 1024).toFixed(1)} KB · {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </p>
                  </div>
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all cursor-pointer',
                      isOwn ? 'hover:bg-white/20 text-white' : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                    )}
                    title="Download File"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderReactions = () => {
    const reactions = (message as any).reactions || {};
    const reactionEntries = Object.entries(reactions);
    if (reactionEntries.length === 0) return null;

    return (
      <div className={cn('flex flex-wrap gap-1 mt-1 z-10', isOwn ? 'justify-end' : 'justify-start')}>
        {reactionEntries.map(([emoji, userIds]) => {
          if (!userIds || (userIds as string[]).length === 0) return null;
          const hasReacted = currentUser && (userIds as string[]).includes(currentUser.uid);
          const reactorNames = (userIds as string[])
            .map((uid) => members.find((m) => m.uid === uid)?.fullName || 'Someone')
            .join(', ');

          return (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              key={emoji}
              onClick={async (e) => {
                e.stopPropagation();
                if (currentUser) {
                  try {
                    await toggleReaction(message.id, emoji, currentUser.uid);
                  } catch (err: any) {
                    console.error('Failed to toggle reaction:', err);
                  }
                }
              }}
              title={`Reacted by: ${reactorNames}`}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border transition-all duration-150 cursor-pointer select-none font-medium shadow-xs backdrop-blur-md',
                hasReacted
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'bg-surface/90 border-border text-foreground hover:bg-secondary',
              )}
            >
              <span className="text-xs leading-none">{emoji}</span>
              {(userIds as string[]).length > 1 && (
                <span className="text-[10px] font-bold text-muted-foreground">{(userIds as string[]).length}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  const renderReplySummary = () => {
    const replyCount = (message as any).replyCount || 0;
    const lastReplyTime = (message as any).lastReplyAt ? formatTime((message as any).lastReplyAt) : '';

    if (replyCount === 0) return null;

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={(e) => {
          e.stopPropagation();
          setIsRepliesExpanded(!isRepliesExpanded);
        }}
        className={cn(
          'mt-1.5 flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none border rounded-full px-3 py-1 w-fit shadow-xs transition-all duration-150',
          isRepliesExpanded
            ? 'bg-primary/15 border-primary/30 text-primary'
            : 'bg-surface/80 border-border text-muted-foreground hover:text-foreground hover:bg-secondary',
        )}
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </span>
        {isRepliesExpanded ? (
          <span className="text-[10px] text-muted-foreground font-normal ml-0.5">(collapse)</span>
        ) : lastReplyTime ? (
          <span className="text-[10px] text-muted-foreground font-normal ml-0.5">· Last {lastReplyTime}</span>
        ) : null}
      </motion.button>
    );
  };

  const renderInlineReplies = () => {
    if (!isRepliesExpanded) return null;

    return (
      <div className="mt-3.5 w-full flex flex-col gap-3 border-l-2 border-primary/30 dark:border-primary/20 pl-4 ml-1 mb-2">
        {replies === null ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading thread...</p>
          </div>
        ) : replies.length > 0 ? (
          <div className="flex flex-col gap-2.5 w-full max-w-xl">
            {replies.map((reply) => {
              const replySender = members.find((m) => m.uid === reply.senderId);
              const replyPhotoURL = replySender?.photoURL;
              const replyInitials = avatarInitials(reply.senderName || '?');
              const isOwnReply = reply.senderId === (currentUser?.uid ?? '');

              return (
                <div key={reply.id} className="flex gap-2.5 items-start group/reply">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary border border-primary/20 shrink-0 overflow-hidden mt-0.5">
                    {replyPhotoURL ? (
                      <img src={replyPhotoURL} alt={reply.senderName} className="h-full w-full object-cover" />
                    ) : (
                      replyInitials
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col items-start">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className={cn('text-xs font-semibold', isOwnReply ? 'text-primary' : getSenderColor(reply.senderUsername))}>
                        {isOwnReply ? 'You' : reply.senderName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">@{reply.senderUsername}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">{formatTime(reply.createdAt as any)}</span>
                    </div>
                    <div className="mt-1 rounded-2xl rounded-tl-none px-3 py-1.5 text-xs bg-surface/90 border border-border leading-relaxed text-foreground select-text break-words w-fit max-w-full shadow-xs">
                      {reply.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic py-1">No replies yet.</p>
        )}

        {currentUser && orgId && (
          <div className="w-full max-w-xl mt-1 flex gap-2 items-center">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
              <textarea
                ref={replyTextareaRef}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Reply in thread..."
                disabled={replySending}
                maxLength={1000}
                rows={1}
                className="flex-1 resize-none bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 scrollbar-hide py-0.5"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyBody.trim() || replySending}
                className={cn(
                  'h-6 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer',
                  replyBody.trim() && !replySending
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50',
                )}
              >
                {replySending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'group relative flex w-full gap-2 sm:gap-3 px-2 sm:px-4 py-0.5 transition-colors rounded-2xl',
        isOwn ? 'justify-end' : 'justify-start',
        isGrouped ? 'mt-0.5' : 'mt-3.5',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Received Message Avatar Gutter */}
      {!isOwn && (
        <div className="w-8 shrink-0 flex items-start justify-center">
          {!isGrouped ? (
            <div
              className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white border border-white/20 overflow-hidden shadow-xs shrink-0"
              style={{ background: `hsl(${avatarHue(message.senderId)} 55% 45%)` }}
            >
              {photoURL ? (
                <img src={photoURL} alt={message.senderName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={cn('flex flex-col min-w-0 max-w-[85%] sm:max-w-[72%] md:max-w-[65%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Author Name & Timestamp Header */}
        {!isGrouped && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className={cn('text-xs font-semibold', getSenderColor(message.senderUsername))}>
              {message.senderName}
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-mono">
              @{message.senderUsername}
            </span>
            <span className="text-[9.5px] text-muted-foreground/70 font-mono">{formatTime(message.createdAt as any)}</span>
          </div>
        )}

        {/* Floating Bubble Surface */}
        <div className="relative w-fit max-w-full group/bubble">
          <div
            className={cn(
              !isCard
                ? cn(
                    'relative px-3.5 sm:px-4 py-2 sm:py-2.5 text-[14px] leading-relaxed transition-all duration-150 text-left',
                    isOwn
                      ? cn(
                          'bg-primary text-primary-foreground shadow-xs border border-primary/20',
                          isGrouped ? 'rounded-2xl rounded-r-md' : 'rounded-2xl rounded-tr-sm',
                        )
                      : cn(
                          'bg-secondary text-foreground shadow-xs border border-border/40 dark:border-border/60',
                          isGrouped ? 'rounded-2xl rounded-l-md' : 'rounded-2xl rounded-tl-sm',
                        ),
                  )
                : 'relative text-left w-full',
            )}
          >
            {/* Quoted Parent Message Reference */}
            {message.parentMessage && (
              <div
                className={cn(
                  'mb-2 flex flex-col border-l-2 pl-2.5 py-1 text-xs rounded-r-xl max-w-md cursor-pointer hover:opacity-90 select-none text-left transition-all',
                  isOwn
                    ? 'border-white/80 bg-white/15 text-white shadow-xs'
                    : 'border-primary bg-secondary/80 text-foreground shadow-xs',
                )}
                onClick={() => {
                  const el = document.getElementById(`msg-${message.parentMessage?.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('bg-primary/20', 'transition-all');
                    setTimeout(() => el.classList.remove('bg-primary/20'), 2000);
                  }
                }}
              >
                <span className={cn('font-bold text-[10px] uppercase tracking-wider mb-0.5', isOwn ? 'text-white' : 'text-primary')}>
                  {message.parentMessage.senderName}
                </span>
                <span className="truncate block max-w-full text-xs opacity-90">{message.parentMessage.body}</span>
              </div>
            )}

            {renderMessageContent()}
            {renderAttachments()}
          </div>

          {/* Clean Floating Apple Micro-Interaction Ribbon (react, thread reply, canvas note, convert to issue) */}
          {!message.deleted && !editing && hovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%' }}
              exit={{ opacity: 0, scale: 0.92, y: '-50%' }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-1/2 flex items-center gap-0.5 p-1 rounded-full border border-border bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl shadow-xl z-30',
                isOwn ? 'right-full mr-2' : 'left-full ml-2',
              )}
            >
              {/* 1. Emoji Reaction Popover */}
              <div className="relative flex">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Add reaction"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>

                {showEmojiPicker && (
                  <div
                    className={cn(
                      'absolute bottom-full mb-2 bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border rounded-full shadow-2xl p-1.5 flex gap-1 z-50 animate-in zoom-in-95 duration-100',
                      isOwn ? 'right-0' : 'left-0',
                    )}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (currentUser) {
                            try {
                              await toggleReaction(message.id, emoji, currentUser.uid);
                            } catch (err: any) {
                              console.error('Failed to toggle reaction:', err);
                            }
                          }
                          setShowEmojiPicker(false);
                        }}
                        className="text-base p-1.5 hover:bg-secondary rounded-full transition-transform hover:scale-125 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Thread Reply */}
              <button
                type="button"
                onClick={() => {
                  setIsRepliesExpanded(true);
                  setTimeout(() => replyTextareaRef.current?.focus(), 100);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                title="Reply in thread"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>

              {/* 3. Canvas Note */}
              <button
                type="button"
                onClick={() => {
                  if (onCanvasNote) {
                    onCanvasNote(message);
                  } else {
                    // Open canvas panel with note
                    const searchParams = new URLSearchParams(window.location.search);
                    searchParams.set('canvas', 'true');
                    window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
                    window.dispatchEvent(new Event('popstate'));
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                title="Save to Canvas Notes"
              >
                <FileText className="h-3.5 w-3.5" />
              </button>

              {/* 4. Convert to Issue */}
              <button
                type="button"
                onClick={handleTriggerConvertIssue}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                title="Convert message to Issue"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>

              {/* Quote Reply */}
              {onQuoteMessage && (
                <button
                  type="button"
                  onClick={() => onQuoteMessage(message)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Quote message"
                >
                  <CornerUpLeft className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Copy message text */}
              <button
                type="button"
                onClick={handleCopyText}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                title="Copy text"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>

              {/* Edit / Delete for author */}
              {isOwn && (
                <>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                      title="Edit message"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Reactions & Reply Thread Accordion */}
        {renderReactions()}
        {renderReplySummary()}
        {renderInlineReplies()}

        {/* Own timestamp below non-grouped non-card message */}
        {!isGrouped && isOwn && !isCard && (
          <div className="mt-1 px-1 flex items-center justify-end text-[9.5px] text-muted-foreground font-mono">
            {formatTime(message.createdAt as any)}
          </div>
        )}
      </div>

      {/* Hover timestamp for grouped messages */}
      {isGrouped && hovered && (
        <span
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-[9.5px] text-muted-foreground font-mono opacity-80 select-none',
            isOwn ? 'right-full mr-3' : 'left-full ml-3',
          )}
        >
          {formatTime(message.createdAt as any)}
        </span>
      )}

      {/* Quick Convert to Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Convert to Issue</h3>
                  <p className="text-[11px] text-muted-foreground">Creates a tracked Linear-style issue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssueSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="Issue title"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Assignee
                  </label>
                  <select
                    value={issueAssigneeId}
                    onChange={(e) => setIssueAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.fullName} (@{m.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value as IssuePriority)}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!issueTitle.trim() || isCreatingIssue}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isCreatingIssue ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3" />}
                  <span>Create Issue</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {lightboxIndex !== null && message.files && (
        <MediaLightbox
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          mediaList={message.files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))}
          initialIndex={lightboxIndex}
        />
      )}
    </div>
  );
}
