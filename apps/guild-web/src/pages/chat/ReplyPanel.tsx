import * as React from 'react';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { type Message } from '../../lib/chat';
import { type MessageReply, listenToReplies, addMessageReply } from '../../lib/replies';
import { cn } from '@/lib/utils';

interface ReplyPanelProps {
  parentMessage: Message;
  currentUserId: string;
  members: Array<{ uid: string; fullName: string; username: string; photoURL?: string }>;
  orgId: string;
  currentUser: { uid: string; displayName: string } | null;
  onClose: () => void;
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

export function ReplyPanel({
  parentMessage,
  currentUserId,
  members,
  orgId,
  currentUser,
  onClose,
}: ReplyPanelProps) {
  const [replies, setReplies] = React.useState<MessageReply[] | null>(null);
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Subscribe to replies
  React.useEffect(() => {
    setReplies(null);
    const unsub = listenToReplies(parentMessage.id, (data) => {
      setReplies(data);
    });
    return () => unsub();
  }, [parentMessage.id]);

  // Auto scroll to bottom when new replies arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending || !currentUser) return;
    setSending(true);

    try {
      await addMessageReply({
        messageId: parentMessage.id,
        orgId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        senderUsername: members.find(m => m.uid === currentUser.uid)?.username || 'user',
        body: trimmed,
      });
      setBody('');
      setTimeout(() => textareaRef.current?.focus(), 0);
    } catch (err) {
      console.error('Failed to add reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const parentSender = members.find((m) => m.uid === parentMessage.senderId);
  const parentPhotoURL = parentSender?.photoURL;
  const parentInitials = parentMessage.senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-80 md:w-96 border-l border-border-default bg-surface backdrop-blur-md flex flex-col shrink-0 z-40 relative animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4.5 w-4.5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Discussion</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-text-muted hover:text-foreground hover:bg-bg-tertiary transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Discussion Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide p-4 flex flex-col gap-4">
        {/* Parent Message Card */}
        <div className="flex gap-3 bg-white/[0.01] hover:bg-white/[0.02] p-2.5 rounded-xl border border-border-default/40">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 shrink-0 overflow-hidden shadow-sm">
            {parentPhotoURL ? (
              <img src={parentPhotoURL} alt={parentMessage.senderName} className="h-full w-full object-cover" />
            ) : (
              parentInitials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className={cn('text-xs font-bold', parentMessage.senderId === currentUserId ? 'text-primary/95' : getSenderColor(parentMessage.senderUsername))}>
                {parentMessage.senderId === currentUserId ? 'You' : parentMessage.senderName}
              </span>
              <span className="text-[9px] text-text-muted">@{parentMessage.senderUsername}</span>
              <span className="text-[9px] text-text-muted font-mono ml-auto">{formatTime(parentMessage.createdAt as any)}</span>
            </div>
            <p className="text-xs text-foreground mt-1 leading-relaxed whitespace-pre-wrap select-text break-words">
              {parentMessage.body}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px bg-border/20" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Replies</span>
          <div className="flex-1 h-px bg-border/20" />
        </div>

        {/* Replies List */}
        {replies === null ? (
          <div className="flex flex-1 flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="h-4.5 w-4.5 animate-spin text-primary/60" />
            <p className="text-[10px] text-text-muted">Loading replies...</p>
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center py-10 px-4 gap-2">
            <div className="h-10 w-10 bg-primary/5 border border-primary/10 text-primary/70 rounded-xl flex items-center justify-center shadow-inner">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-foreground">No replies yet</p>
            <p className="text-[10px] text-text-muted">Be the first to reply to this message!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {replies.map((reply) => {
              const replySender = members.find((m) => m.uid === reply.senderId);
              const replyPhotoURL = replySender?.photoURL;
              const replyInitials = reply.senderName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const isOwnReply = reply.senderId === currentUserId;

              return (
                <div
                  key={reply.id}
                  className={cn(
                    'flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150',
                    isOwnReply ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {!isOwnReply && (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-[9px] font-bold text-primary border border-primary/15 shrink-0 overflow-hidden shadow-sm mt-0.5">
                      {replyPhotoURL ? (
                        <img src={replyPhotoURL} alt={reply.senderName} className="h-full w-full object-cover" />
                      ) : (
                        replyInitials
                      )}
                    </div>
                  )}
                  <div className={cn(
                    'flex flex-col min-w-0 max-w-[80%]',
                    isOwnReply ? 'items-end' : 'items-start'
                  )}>
                    <div className="flex items-baseline gap-1.5 mb-0.5 px-1 flex-wrap">
                      <span className={cn('text-[10px]', isOwnReply ? 'text-primary/80 font-bold' : getSenderColor(reply.senderUsername))}>
                        {isOwnReply ? 'You' : reply.senderName}
                      </span>
                      <span className="text-[8px] text-text-muted font-mono">{formatTime(reply.createdAt as any)}</span>
                    </div>
                    <div className={cn(
                      'rounded-xl px-3 py-1.5 text-xs border leading-relaxed break-words select-text text-left shadow-sm',
                      isOwnReply
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-transparent rounded-tr-none'
                        : 'bg-surface border-border-default/60 rounded-tl-none text-foreground'
                    )}>
                      {reply.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Input Box */}
      <div className="p-3 border-t border-border-default bg-surface/50">
        <div className="flex items-end gap-2 rounded-xl border border-border-default bg-surface px-3 py-2 shadow-inner focus-within:border-primary/45 transition-colors">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply to message..."
            disabled={sending}
            maxLength={1000}
            rows={1}
            className="flex-1 resize-none bg-transparent text-xs text-foreground placeholder:text-text-muted focus:outline-none disabled:opacity-50 leading-relaxed scrollbar-hide py-0.5"
            style={{ maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all border cursor-pointer',
              body.trim() && !sending
                ? 'bg-primary text-primary-foreground border-transparent shadow shadow-primary/20 hover:bg-primary/95'
                : 'bg-bg-tertiary text-text-muted border-border-default cursor-not-allowed'
            )}
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
