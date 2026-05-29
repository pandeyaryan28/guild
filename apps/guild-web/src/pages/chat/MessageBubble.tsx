import * as React from 'react';
import { motion } from 'motion/react';
import { Pencil, Trash2, Check, X, CheckSquare, User, Users, File, FileText, FileAudio, FileVideo, Download, ExternalLink, Play, Maximize2, Target, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Message } from '../../lib/chat';
import { editMessage, deleteMessage } from '../../lib/chat';
import { MediaLightbox } from './MediaLightbox';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGrouped: boolean; // true = hide avatar + name (consecutive from same sender)
  members: Array<{ uid: string; fullName: string; username: string; photoURL?: string }>;
}

function parseMentions(body: string) {
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-primary font-semibold bg-primary/10 rounded px-0.5">
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

export function MessageBubble({ message, isOwn, isGrouped, members }: MessageBubbleProps) {
  const sender = members.find((m) => m.uid === message.senderId);
  const photoURL = sender?.photoURL;

  const [hovered, setHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(message.body);
  const [saving, setSaving] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

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

  const isTaskCommand = message.body.trim().startsWith('/task') && !message.deleted;
  const isGoalCommand = message.body.trim().startsWith('/goal') && !message.deleted;
  const isRequestCommand = message.body.trim().startsWith('/request') && !message.deleted;

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

      return (
        <div className="mt-1.5 max-w-lg rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 shadow-md shadow-primary/5 backdrop-blur-sm transition-all hover:bg-primary/12 group-hover:border-primary/30 text-left">
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex items-center gap-2 text-primary">
              <CheckSquare className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/95">Task</span>
            </div>
            <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
              Todo
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

      return (
        <div className="mt-1.5 max-w-lg rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 shadow-md shadow-emerald-500/5 backdrop-blur-sm transition-all hover:bg-emerald-500/12 group-hover:border-emerald-500/30 text-left">
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex items-center gap-2 text-emerald-500">
              <Target className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/95">Goal</span>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              Active
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
      if (rawMentions.length > 0) {
        const username = rawMentions[0].slice(1);
        const approverUser = members.find(m => m.username === username);
        approverName = approverUser ? approverUser.fullName : rawMentions[0];
      }

      return (
        <div className="mt-1.5 max-w-lg rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 shadow-md shadow-amber-500/5 backdrop-blur-sm transition-all hover:bg-amber-500/12 group-hover:border-amber-500/30 text-left">
          <div className="flex items-center justify-between gap-4 mb-2.5">
            <div className="flex items-center gap-2 text-amber-500">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/95">Request</span>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
              Pending
            </span>
          </div>

          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 text-sm font-semibold text-foreground leading-relaxed shadow-inner">
            {requestTitle}
          </div>
          
          <div className="mt-2 text-[10px] text-text-muted flex items-center gap-1.5">
            <span>Approver:</span>
            <span className="font-semibold text-foreground bg-white/5 rounded px-1.5 py-0.5">{approverName}</span>
          </div>
        </div>
      );
    }

    return (
      <p className={cn('text-sm leading-relaxed', message.deleted && 'italic text-text-muted')}>
        {parseMentions(message.body)}
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
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-1 px-1">
            {!isOwn ? (
              <>
                <span className={cn('text-xs', getSenderColor(message.senderUsername))}>
                  {message.senderName}
                </span>
                <span className="text-[9px] text-text-muted">
                  @{message.senderUsername}
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold text-primary/80">You</span>
            )}
            <span className="text-[9px] text-text-muted">{formatTime(message.createdAt as any)}</span>
          </div>
        )}

        {/* Message bubble styling */}
        <div className={cn(
          'relative rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed border transition-all text-left',
          isOwn 
            ? 'bg-primary/10 border-primary/20 dark:bg-primary/20 dark:border-primary/25 rounded-tr-none text-foreground'
            : 'bg-surface border-border-default/60 rounded-tl-none text-foreground',
          isGrouped && isOwn && 'rounded-tr-2xl',
          isGrouped && !isOwn && 'rounded-tl-2xl'
        )}>
          {renderMessageContent()}
          {renderAttachments()}
        </div>
      </div>

      {/* Action Bar (Edit/Delete options) */}
      {isOwn && !message.deleted && !editing && hovered && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-xl border border-border-default bg-surface backdrop-blur-md px-1.5 py-1 shadow-lg z-10"
        >
          <button
            onClick={() => setEditing(true)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors"
            title="Edit message"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={handleDelete}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete message"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </motion.div>
      )}

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
