import * as React from 'react';
import { motion } from 'motion/react';
import { Pencil, Trash2, Check, X, CheckSquare, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Message } from '../../lib/chat';
import { editMessage, deleteMessage } from '../../lib/chat';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGrouped: boolean; // true = hide avatar + name (consecutive from same sender)
  members: Array<{ uid: string; fullName: string; username: string }>;
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

export function MessageBubble({ message, isOwn, isGrouped, members }: MessageBubbleProps) {
  const [hovered, setHovered] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(message.body);
  const [saving, setSaving] = React.useState(false);

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
      const rawMentions = message.body.match(/@\w+/g) || [];
      const isDM = window.location.pathname.includes('/chat/dm/');

      let assigneeNames = '';
      let isMultiAssignee = false;

      if (rawMentions.length > 0) {
        const usernames = rawMentions.map(m => m.slice(1)); // strip '@'
        const assignedMembers = members.filter(m => usernames.includes(m.username));
        assigneeNames = assignedMembers.map(m => m.fullName).join(', ') || rawMentions.join(', ');
        isMultiAssignee = rawMentions.length > 1;
      } else {
        if (isDM) {
          const otherMember = members.find(m => m.uid !== message.senderId);
          assigneeNames = otherMember ? otherMember.fullName : 'Partner';
        } else {
          assigneeNames = 'All channel members';
          isMultiAssignee = true;
        }
      }

      return (
        <div className="mt-1.5 max-w-lg rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 shadow-md shadow-primary/5 backdrop-blur-sm transition-all hover:bg-primary/12 group-hover:border-primary/30">
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

    return (
      <p className={cn('text-sm leading-relaxed', message.deleted && 'italic text-text-muted')}>
        {parseMentions(message.body)}
        {message.editedAt && !message.deleted && (
          <span className="ml-1.5 text-[10px] text-text-muted">(edited)</span>
        )}
      </p>
    );
  };

  return (
    <div
      className={cn('group relative flex gap-3 px-4 py-0.5 hover:bg-white/[0.02] transition-colors rounded-lg', isGrouped ? 'mt-0' : 'mt-3')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar column */}
      <div className="w-9 shrink-0">
        {!isGrouped && (
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-xs font-bold text-primary border border-primary/20">
            {initials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground">{message.senderName}</span>
            <span className="text-[10px] text-text-muted">
              @{message.senderUsername}
            </span>
            <span className="text-[10px] text-text-muted">{formatTime(message.createdAt as any)}</span>
          </div>
        )}

        {renderMessageContent()}
      </div>

      {/* Action bar */}
      {isOwn && !message.deleted && !editing && hovered && (
        <motion.div
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-xl border border-border-default bg-surface backdrop-blur-md px-1.5 py-1 shadow-lg"
        >
          <button
            onClick={() => setEditing(true)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={handleDelete}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </motion.div>
      )}

      {/* Grouped timestamp on hover */}
      {isGrouped && hovered && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
          {formatTime(message.createdAt as any)}
        </span>
      )}
    </div>
  );
}
