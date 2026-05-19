import * as React from 'react';
import { type Message } from '../../lib/chat';
import { MessageBubble } from './MessageBubble';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[] | null;
  currentUserId: string;
  members: Array<{ uid: string; fullName: string; username: string }>;
}

const GROUP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function formatDateLabel(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86_400_000 && now.getDay() === date.getDay()) return 'Today';
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function MessageList({ messages, currentUserId, members }: MessageListProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(atBottom);
  };

  if (messages === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
          <p className="text-xs text-text-muted">Loading messages…</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
          💬
        </div>
        <p className="text-sm font-semibold text-foreground">No messages yet</p>
        <p className="text-xs text-text-muted">Be the first to say something!</p>
      </div>
    );
  }

  // Build grouped list with date dividers
  const items: Array<{ type: 'divider'; label: string } | { type: 'msg'; msg: Message; isGrouped: boolean }> = [];
  let lastDate = '';
  let lastSenderId = '';
  let lastTs = 0;

  for (const msg of messages) {
    const ts = (msg.createdAt as any)?.toDate?.() ?? new Date();
    const dateLabel = formatDateLabel(ts);

    if (dateLabel !== lastDate) {
      items.push({ type: 'divider', label: dateLabel });
      lastDate = dateLabel;
      lastSenderId = '';
      lastTs = 0;
    }

    const isGrouped =
      msg.senderId === lastSenderId && ts.getTime() - lastTs < GROUP_THRESHOLD_MS;

    items.push({ type: 'msg', msg, isGrouped });
    lastSenderId = msg.senderId;
    lastTs = ts.getTime();
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto scrollbar-hide py-4"
    >
      {items.map((item, i) =>
        item.type === 'divider' ? (
          <div key={`divider-${i}`} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 h-px bg-border/20" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              {item.label}
            </span>
            <div className="flex-1 h-px bg-border/20" />
          </div>
        ) : (
          <MessageBubble
            key={item.msg.id}
            message={item.msg}
            isOwn={item.msg.senderId === currentUserId}
            isGrouped={item.isGrouped}
            members={members}
          />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}
