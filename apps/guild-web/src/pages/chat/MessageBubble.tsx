import * as React from 'react';
import { motion } from 'motion/react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
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
            <span className="text-[10px] text-muted-foreground/50">
              @{message.senderUsername}
            </span>
            <span className="text-[10px] text-muted-foreground/40">{formatTime(message.createdAt as any)}</span>
          </div>
        )}

        {editing ? (
          <div className="mt-1">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              autoFocus
              rows={2}
              className="w-full resize-none rounded-lg border border-primary/30 bg-card/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                if (e.key === 'Escape') { setEditing(false); setEditBody(message.body); }
              }}
            />
            <div className="flex gap-2 mt-1.5">
              <button onClick={handleEdit} disabled={saving} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-xs text-primary font-medium hover:bg-primary/20 transition-colors">
                <Check className="h-3 w-3" /> Save
              </button>
              <button onClick={() => { setEditing(false); setEditBody(message.body); }} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/20 text-xs text-muted-foreground font-medium hover:bg-muted/30 transition-colors">
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className={cn('text-sm leading-relaxed', message.deleted && 'italic text-muted-foreground/50')}>
            {parseMentions(message.body)}
            {message.editedAt && !message.deleted && (
              <span className="ml-1.5 text-[10px] text-muted-foreground/40">(edited)</span>
            )}
          </p>
        )}
      </div>

      {/* Action bar */}
      {isOwn && !message.deleted && !editing && hovered && (
        <motion.div
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-xl border border-border/40 bg-card/90 backdrop-blur-md px-1.5 py-1 shadow-lg"
        >
          <button
            onClick={() => setEditing(true)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
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
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/30">
          {formatTime(message.createdAt as any)}
        </span>
      )}
    </div>
  );
}
