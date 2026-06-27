import * as React from 'react';
import { motion } from 'motion/react';
import { Pencil, Trash2, Check, X, CheckSquare, User, Users, File, FileText, FileAudio, FileVideo, Download, ExternalLink, Play, Maximize2, Target, ClipboardList, Smile, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Message } from '../../lib/chat';
import { editMessage, deleteMessage } from '../../lib/chat';
import { MediaLightbox } from './MediaLightbox';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { updateRequestStatus } from '../../lib/requests';
import { toggleReaction, addMessageReply, listenToReplies, type MessageReply } from '../../lib/replies';
import { useSearchParams } from 'react-router-dom';

const TASK_STATUS_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  todo: { label: 'To Do', border: 'border-zinc-500/20', bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
  in_progress: { label: 'In Progress', border: 'border-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  review: { label: 'Review', border: 'border-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  done: { label: 'Done', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
};

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGrouped: boolean; // true = hide avatar + name (consecutive from same sender)
  members: Array<{ uid: string; fullName: string; username: string; photoURL?: string }>;
  orgId?: string;
  currentUser?: { uid: string; displayName: string } | null;
  onOpenDiscussion?: (msg: Message) => void;
}

function parseMentions(body: string, isOwn: boolean) {
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className={cn(
        "font-semibold rounded px-0.5",
        isOwn ? "text-white bg-white/25" : "text-primary bg-primary/10"
      )}>
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

function formatTime(ts: { toDate: () => Date } | undefined) {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getSenderColor(username: string) {
  const colors = [
    'text-red-400 dark:text-red-300 font-bold',
    'text-amber-500 dark:text-amber-400 font-bold',
    'text-emerald-500 dark:text-emerald-400 font-bold',
    'text-cyan-500 dark:text-cyan-400 font-bold',
    'text-blue-500 dark:text-blue-400 font-bold',
    'text-indigo-500 dark:text-indigo-400 font-bold',
    'text-violet-500 dark:text-violet-400 font-bold',
    'text-pink-500 dark:text-pink-400 font-bold',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function MessageBubble({ message, isOwn, isGrouped, members, orgId, currentUser, onOpenDiscussion }: MessageBubbleProps) {
  const sender = members.find((m) => m.uid === message.senderId);
  const photoURL = sender?.photoURL;
  const [, setSearchParams] = useSearchParams();

  const [hovered, setHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(message.body);
  const [saving, setSaving] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

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
    });
    return () => unsub();
  }, [isRepliesExpanded, message.id]);

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

  const [realtimeRequestStatus, setRealtimeRequestStatus] = React.useState<string | null>(null);
  const [realtimeGoalStatus, setRealtimeGoalStatus] = React.useState<string | null>(null);
  const [realtimeTaskStatus, setRealtimeTaskStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const rId = (message as any).requestId;
    if (!rId) return;

    const unsub = onSnapshot(doc(db, 'requests', rId), (snap) => {
      if (snap.exists()) {
        setRealtimeRequestStatus(snap.data().status);
      }
    });
    return () => unsub();
  }, [message]);

  React.useEffect(() => {
    const gId = (message as any).goalId;
    if (!gId) return;

    const unsub = onSnapshot(doc(db, 'goals', gId), (snap) => {
      if (snap.exists()) {
        setRealtimeGoalStatus(snap.data().status);
      }
    });
    return () => unsub();
  }, [message]);

  React.useEffect(() => {
    const tId = (message as any).taskId;
    if (!tId) return;

    const unsub = onSnapshot(doc(db, 'tasks', tId), (snap) => {
      if (snap.exists()) {
        setRealtimeTaskStatus(snap.data().status);
      }
    });
    return () => unsub();
  }, [message]);

  const handleEdit = async () => {
    if (!editBody.trim() || editBody === message.body) { setEditing(false); return; }
    setSaving(true);
    await editMessage(message.id, editBody.trim());
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return;
    await deleteMessage(message.id);
  };

  const initials = message.senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isTaskCommand = /^\/task(\s|$)/.test(message.body.trim()) && !message.deleted;
  const isGoalCommand = /^\/goal(\s|$)/.test(message.body.trim()) && !message.deleted;
  const isRequestCommand = /^\/request(\s|$)/.test(message.body.trim()) && !message.deleted;

  const renderMessageContent = () => {
    if (editing) {
      return (
        <div className="mt-1">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            autoFocus
            rows={2}
            className="w-full resize-none rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
              if (e.key === 'Escape') { setEditing(false); setEditBody(message.body); }
            }}
          />
          <div className="flex gap-2 mt-1.5">
            <button onClick={handleEdit} disabled={saving} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-xs text-primary font-medium hover:bg-primary/20 transition-colors">
              <Check className="h-3 w-3" /> Save
            </button>
            <button onClick={() => { setEditing(false); setEditBody(message.body); }} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-bg-tertiary text-xs text-muted-foreground font-medium hover:bg-bg-tertiary transition-colors">
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      );
    }

    if (isTaskCommand) {
      const args = message.body.trim().slice(5).trim();
      const taskTitle = args.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();
      const taskId = (message as any).taskId;
      const statusKey = realtimeTaskStatus || 'todo';
      const statusConfig = TASK_STATUS_CONFIG[statusKey] || TASK_STATUS_CONFIG.todo;

      return (
        <div
          onClick={() => taskId && setSearchParams({ task: taskId })}
          className={cn(
            "mt-1.5 max-w-lg rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 shadow-md shadow-primary/5 backdrop-blur-sm transition-all text-left",
            taskId ? "cursor-pointer hover:bg-primary/12 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01]" : ""
          )}
        >
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex items-center gap-2 text-primary">
              <CheckSquare className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/95">Task</span>
            </div>
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              statusConfig.border,
              statusConfig.bg,
              statusConfig.text
            )}>
              {statusConfig.label}
            </span>
          </div>

          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-sm font-semibold text-foreground leading-relaxed shadow-inner">
            {taskTitle}
          </div>
        </div>
      );
    }

    if (isGoalCommand) {
      const args = message.body.trim().slice(5).trim();
      const goalTitle = args.replace(/@\w+/g, '').replace(/\s+/g, ' ').trim();
      const displayStatus = realtimeGoalStatus || (message as any).goalStatus || 'active';
      const goalId = (message as any).goalId;

      return (
        <div
          onClick={() => goalId && setSearchParams({ goal: goalId })}
          className={cn(
            "mt-1.5 max-w-lg rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 shadow-md shadow-emerald-500/5 backdrop-blur-sm transition-all text-left",
            goalId ? "cursor-pointer hover:bg-emerald-500/12 hover:border-emerald-500/45 hover:shadow-lg hover:shadow-emerald-500/5 hover:scale-[1.01]" : ""
          )}
        >
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex items-center gap-2 text-emerald-500">
              <Target className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/95">Goal</span>
            </div>
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              displayStatus === 'completed'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : displayStatus === 'cancelled'
                ? 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400'
                : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400'
            )}>
              {displayStatus}
            </span>
          </div>

          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-sm font-semibold text-foreground leading-relaxed shadow-inner">
            {goalTitle}
          </div>
        </div>
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
        const approverUser = members.find(m => m.username === username);
        if (approverUser) {
          approverName = approverUser.fullName;
          approverId = approverUser.uid;
        } else {
          approverName = rawMentions[0];
        }
      } else if (message.dmId) {
        const parts = message.dmId.split('_');
        approverId = parts.find((p) => p !== message.senderId) ?? '';
        const approverUser = members.find(m => m.uid === approverId);
        if (approverUser) {
          approverName = approverUser.fullName;
        }
      }

      const rId = (message as any).requestId;
      const displayStatus = realtimeRequestStatus || (message as any).requestStatus || 'pending';
      const isApprover = currentUser && approverId === currentUser.uid;

      const handleApprove = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!rId || !orgId || !currentUser) return;
        setSaving(true);
        try {
          await updateRequestStatus(
            rId,
            orgId,
            'approved',
            currentUser.uid,
            currentUser.displayName || 'Approver',
            message.senderId,
            requestTitle,
            'Approved via chat discussion.'
          );
        } catch (err) {
          console.error('Failed to approve request:', err);
        } finally {
          setSaving(false);
        }
      };

      const handleReject = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!rId || !orgId || !currentUser) return;
        setSaving(true);
        try {
          await updateRequestStatus(
            rId,
            orgId,
            'rejected',
            currentUser.uid,
            currentUser.displayName || 'Approver',
            message.senderId,
            requestTitle,
            'Rejected via chat discussion.'
          );
        } catch (err) {
          console.error('Failed to reject request:', err);
        } finally {
          setSaving(false);
        }
      };

      return (
        <div
          onClick={() => rId && setSearchParams({ request: rId })}
          className={cn(
            "mt-1.5 max-w-lg rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 shadow-md shadow-amber-500/5 backdrop-blur-sm transition-all text-left",
            rId ? "cursor-pointer hover:bg-amber-500/12 hover:border-amber-500/45 hover:shadow-lg hover:shadow-amber-500/5 hover:scale-[1.01]" : ""
          )}
        >
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex items-center gap-2 text-amber-500">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/95">Request</span>
            </div>
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              displayStatus === 'approved' 
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : displayStatus === 'rejected'
                ? 'border-red-500/20 bg-red-500/10 text-red-400'
                : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
            )}>
              {displayStatus}
            </span>
          </div>

          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-sm font-semibold text-foreground leading-relaxed shadow-inner">
            {requestTitle}
          </div>
          
          <div className="mt-2.5 text-[10px] text-text-muted flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span>Approver:</span>
              <span className="font-semibold text-foreground bg-white/5 rounded px-1.5 py-0.5">{approverName}</span>
            </div>
            {isApprover && displayStatus === 'pending' && (
              <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold transition-all text-[9px] flex items-center gap-0.5 cursor-pointer border border-emerald-500/10"
                >
                  <Check className="h-2.5 w-2.5" /> Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={saving}
                  className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold transition-all text-[9px] flex items-center gap-0.5 cursor-pointer border border-red-500/10"
                >
                  <X className="h-2.5 w-2.5" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <p className={cn('text-sm leading-relaxed', message.deleted && 'italic text-text-muted')}>
        {parseMentions(message.body, isOwn)}
        {message.editedAt && !message.deleted && (
          <span className="ml-1.5 text-[10px] text-text-muted">(edited)</span>
        )}
      </p>
    );
  };

  const renderAttachments = () => {
    if (!message.files || message.files.length === 0 || message.deleted) return null;

    const media = message.files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const nonMedia = message.files.filter((f) => !f.type.startsWith('image/') && !f.type.startsWith('video/'));

    return (
      <div className="mt-2 flex flex-col gap-2">
        {/* Media Grid (Images and Videos) */}
        {media.length > 0 && (
          <div className={cn(
            "grid gap-2 max-w-2xl",
            media.length === 1 ? "grid-cols-1 max-w-md" : "grid-cols-2 sm:grid-cols-3"
          )}>
            {media.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              const isVideo = file.type.startsWith('video/');

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className="group/img relative rounded-xl overflow-hidden border border-border-default bg-bg-tertiary shadow-sm aspect-video max-h-60 transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
                >
                  {isImage ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-102"
                      loading="lazy"
                    />
                  ) : (
                    // Video Preview Card with Play Overlay
                    <div className="h-full w-full relative flex items-center justify-center bg-zinc-950 dark:bg-black overflow-hidden">
                      <video
                        src={file.url}
                        className="h-full w-full object-cover opacity-75 blur-[0.5px]"
                        muted
                        playsInline
                      />
                      {/* Translucent glass play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/img:bg-black/35 transition-colors">
                        <div className="h-11 w-11 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 hover:scale-105 transition-all shadow-lg shadow-black/20">
                          <Play className="h-5.5 w-5.5 fill-white ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide bg-black/60 text-white border border-white/5 font-mono uppercase">
                        Video
                      </span>
                    </div>
                  )}

                  {/* Actions overlay on Hover */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setLightboxIndex(idx)}
                      className="p-1.5 rounded-lg bg-surface/90 hover:bg-surface text-foreground shadow transition-colors cursor-pointer"
                      title="View Fullscreen"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={file.url}
                      download={file.name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-surface/90 hover:bg-surface text-foreground shadow transition-colors cursor-pointer"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Non-Media List */}
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
                  className="group/file flex items-center gap-3 rounded-xl border border-border-default bg-surface/40 hover:bg-surface/80 backdrop-blur-sm px-3 py-2 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary border border-primary/10">
                    <FileIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground truncate group-hover/file:text-primary transition-colors">
                      {file.name}
                    </p>
                    <p className="text-[9px] text-text-muted font-medium">
                      {(file.size / 1024).toFixed(1)} KB · {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </p>
                  </div>
                  <a
                    href={file.url}
                    download={file.name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-foreground hover:bg-bg-tertiary border border-transparent hover:border-border-default transition-all"
                    title="Download File"
                  >
                    <Download className="h-3.5 w-3.5" />
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
      <div className="flex flex-wrap gap-1 mt-1.5">
        {reactionEntries.map(([emoji, userIds]) => {
          if (!userIds || (userIds as string[]).length === 0) return null;
          const hasReacted = currentUser && (userIds as string[]).includes(currentUser.uid);
          const reactorNames = (userIds as string[])
            .map(uid => members.find(m => m.uid === uid)?.fullName || 'Someone')
            .join(', ');

          return (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                if (currentUser) toggleReaction(message.id, emoji, currentUser.uid);
              }}
              title={`Reacted by: ${reactorNames}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer select-none",
                hasReacted
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-surface hover:bg-bg-tertiary border-border-default text-text-muted"
              )}
            >
              <span>{emoji}</span>
              <span className="text-[10px] font-bold">{(userIds as string[]).length}</span>
            </button>
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsRepliesExpanded(!isRepliesExpanded);
        }}
        className={cn(
          "mt-1.5 flex items-center gap-1.5 text-[10px] font-bold cursor-pointer select-none border rounded-lg px-2.5 py-1.5 w-fit shadow-sm transition-all",
          isRepliesExpanded
            ? "bg-primary/10 border-primary/25 text-primary"
            : "bg-primary/5 border-primary/10 text-primary hover:bg-primary/10"
        )}
      >
        <MessageSquare className="h-3 w-3 shrink-0" />
        <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
        {isRepliesExpanded ? (
          <span className="text-[8px] text-text-muted font-normal ml-0.5">(click to collapse)</span>
        ) : lastReplyTime ? (
          <span className="text-[8px] text-text-muted font-normal">Last reply {lastReplyTime}</span>
        ) : null}
      </button>
    );
  };

  const renderInlineReplies = () => {
    if (!isRepliesExpanded) return null;

    return (
      <div className="mt-3.5 w-full flex flex-col gap-3.5 border-l-2 border-primary/25 dark:border-primary/40 pl-4.5 ml-1.5 mb-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Replies List */}
        {replies === null ? (
          <div className="flex items-center gap-2 py-2 pl-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
            <p className="text-[10px] text-text-muted font-medium">Loading replies...</p>
          </div>
        ) : replies.length > 0 ? (
          <div className="flex flex-col gap-3 w-full max-w-xl">
            {replies.map((reply) => {
              const replySender = members.find((m) => m.uid === reply.senderId);
              const replyPhotoURL = replySender?.photoURL;
              const replyInitials = reply.senderName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const isOwnReply = reply.senderId === (currentUser?.uid ?? '');

              return (
                <div key={reply.id} className="flex gap-2.5 items-start group/reply">
                  {/* Reply Sender Avatar */}
                  <div className="h-6.5 w-6.5 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-[8px] font-bold text-primary border border-primary/15 shrink-0 overflow-hidden shadow-sm mt-0.5">
                    {replyPhotoURL ? (
                      <img src={replyPhotoURL} alt={reply.senderName} className="h-full w-full object-cover" />
                    ) : (
                      replyInitials
                    )}
                  </div>
                  
                  {/* Reply Bubble content */}
                  <div className="flex-1 min-w-0 flex flex-col items-start">
                    <div className="flex items-baseline gap-1.5 flex-wrap px-0.5">
                      <span className={cn('text-[10px] font-bold', isOwnReply ? 'text-primary/90' : getSenderColor(reply.senderUsername))}>
                        {isOwnReply ? 'You' : reply.senderName}
                      </span>
                      <span className="text-[8.5px] text-text-muted font-medium">@{reply.senderUsername}</span>
                      <span className="text-[8px] text-text-muted font-mono ml-1">{formatTime(reply.createdAt as any)}</span>
                    </div>
                    <div className="mt-0.5 rounded-xl px-3 py-1.5 text-xs bg-surface/50 border border-border-default/50 leading-relaxed text-foreground select-text break-words w-fit max-w-full shadow-inner hover:border-primary/15 hover:bg-surface/85 transition-all">
                      {reply.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-text-muted italic pl-1.5 py-1">No replies yet. Be the first to add a comment!</p>
        )}

        {/* Reply Input Box */}
        {currentUser && orgId && (
          <div className="w-full max-w-xl mt-1 flex gap-2.5 items-start">
            {/* Current user mini-initials avatar */}
            <div className="h-6.5 w-6.5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary border border-primary/15 shrink-0 overflow-hidden mt-1 shadow-sm">
              {currentUser.displayName ? (
                currentUser.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              ) : (
                'U'
              )}
            </div>

            {/* Input textarea and send button */}
            <div className="flex-1 flex items-end gap-1.5 rounded-xl border border-border-default bg-surface/80 dark:bg-surface/65 backdrop-blur-xs px-2.5 py-1.5 shadow-inner focus-within:border-primary/45 transition-colors">
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
                placeholder="Write a comment..."
                disabled={replySending}
                maxLength={1000}
                rows={1}
                className="flex-1 resize-none bg-transparent text-xs text-foreground placeholder:text-text-muted focus:outline-none disabled:opacity-50 leading-relaxed scrollbar-hide py-0.5 min-h-[18px]"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyBody.trim() || replySending}
                className={cn(
                  'flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg transition-all border cursor-pointer',
                  replyBody.trim() && !replySending
                    ? 'bg-primary text-primary-foreground border-transparent shadow shadow-primary/20 hover:bg-primary/95'
                    : 'bg-bg-tertiary text-text-muted border-border-default cursor-not-allowed'
                )}
              >
                {replySending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'group relative flex w-full gap-3 px-4 py-0.5 transition-colors hover:bg-white/[0.01] rounded-lg',
        isOwn ? 'justify-end' : 'justify-start',
        isGrouped ? 'mt-0.5' : 'mt-3.5'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Received Message Avatar (Left side) */}
      {!isOwn && (
        <div className="w-9 shrink-0 flex items-start justify-center">
          {!isGrouped ? (
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-bold text-primary border border-primary/20 overflow-hidden shadow-sm shrink-0">
              {photoURL ? (
                <img src={photoURL} alt={message.senderName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          ) : (
            <div className="w-9" />
          )}
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={cn(
        'flex flex-col min-w-0 max-w-[70%]',
        isOwn ? 'items-end' : 'items-start'
      )}>
        {/* Name and metadata */}
        {!isGrouped && !isOwn && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className={cn('text-xs', getSenderColor(message.senderUsername))}>
              {message.senderName}
            </span>
            <span className="text-[9px] text-text-muted">
              @{message.senderUsername}
            </span>
            <span className="text-[9px] text-text-muted">{formatTime(message.createdAt as any)}</span>
          </div>
        )}

        {/* Relative wrapper for bubble + action bar */}
        <div className="relative w-fit max-w-full group/bubble">
          {/* Message bubble styling */}
          <div className={cn(
            !(isTaskCommand || isGoalCommand || isRequestCommand)
              ? cn(
                  'relative rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed border transition-all text-left',
                  isOwn 
                    ? 'bg-gradient-to-br from-primary via-primary to-primary/95 border-transparent rounded-tr-none text-primary-foreground shadow-md shadow-primary/10'
                    : 'bg-surface border-border-default/60 rounded-tl-none text-foreground'
                )
              : 'relative text-left',
            isGrouped && isOwn && 'rounded-tr-2xl',
            isGrouped && !isOwn && 'rounded-tl-2xl'
          )}>
            {renderMessageContent()}
            {renderAttachments()}
          </div>

          {/* Action Bar (Reactions, Reply, Edit, Delete) */}
          {!message.deleted && !editing && hovered && (
            <motion.div
              initial={{ opacity: 0, x: isOwn ? -4 : 4 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-xl border border-border-default bg-surface backdrop-blur-md px-1.5 py-1 shadow-lg z-30",
                isOwn ? "right-full mr-2" : "left-full ml-2"
              )}
            >
              {/* Reaction Trigger Button */}
              <div className="relative flex">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors cursor-pointer",
                    showEmojiPicker && "bg-bg-tertiary text-foreground"
                  )}
                  title="Add reaction"
                >
                  <Smile className="h-3.5 w-3.5" />
                </button>
                
                {/* Reaction Popover Dropdeck */}
                {showEmojiPicker && (
                  <div className={cn(
                    "absolute bottom-full mb-2 bg-surface border border-border-default rounded-xl shadow-2xl p-1.5 flex gap-1 z-50 animate-in zoom-in-95 duration-100",
                    isOwn ? "right-0" : "left-0"
                  )}>
                    {['👍', '❤️', '🔥', '😂', '🎉', '🚀'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentUser) toggleReaction(message.id, emoji, currentUser.uid);
                          setShowEmojiPicker(false);
                        }}
                        className="text-base p-1.5 hover:bg-bg-tertiary rounded transition-colors cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Trigger Button */}
              <button
                onClick={() => {
                  setIsRepliesExpanded(true);
                  setTimeout(() => replyTextareaRef.current?.focus(), 100);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors cursor-pointer"
                title="Reply to message"
              >
                <MessageSquare className="h-3 w-3" />
              </button>

              {/* Edit/Delete options for own messages */}
              {isOwn && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors cursor-pointer"
                    title="Edit message"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Delete message"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Emojis reactions and replies list */}
        {renderReactions()}
        {renderReplySummary()}
        {renderInlineReplies()}

        {/* Small own timestamp below bubble if not consecutive */}
        {!isGrouped && isOwn && !(isTaskCommand || isGoalCommand || isRequestCommand) && (
          <div className="mt-1 px-1.5 flex items-center justify-end text-[9px] text-text-muted/75 font-mono">
            {formatTime(message.createdAt as any)}
          </div>
        )}
      </div>

      {/* Grouped timestamp on hover */}
      {isGrouped && hovered && (
        <span className={cn(
          "absolute top-1/2 -translate-y-1/2 text-[9px] text-text-muted font-mono opacity-80",
          isOwn ? "right-full mr-3" : "left-full ml-3"
        )}>
          {formatTime(message.createdAt as any)}
        </span>
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
