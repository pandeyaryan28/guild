import * as React from 'react';
import { type Message } from '../../lib/chat';
import { MessageBubble } from './MessageBubble';
import { Loader2, MessageSquare, ArrowDown } from 'lucide-react';

interface MessageListProps {
  messages: Message[] | null;
  currentUserId: string;
  members: Array<{ uid: string; fullName: string; username: string; photoURL?: string }>;
  orgId?: string;
  currentUser?: { uid: string; displayName: string } | null;
  onOpenDiscussion?: (msg: Message) => void;
  loadOlderMessages?: () => void;
  loadingOlder?: boolean;
  hasMore?: boolean;
}

const GROUP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function formatDateLabel(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86_400_000 && now.getDay() === date.getDay()) return 'Today';
  if (diff < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function MessageList({
  messages,
  currentUserId,
  members,
  orgId,
  currentUser,
  onOpenDiscussion,
  loadOlderMessages,
  loadingOlder = false,
  hasMore = false,
}: MessageListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const topSentinelRef = React.useRef<HTMLDivElement>(null);

  // Track whether user is near the bottom for auto-scroll on new messages
  const [atBottom, setAtBottom] = React.useState(true);
  const [showScrollBtn, setShowScrollBtn] = React.useState(false);

  // Save scroll position before prepending older messages
  const prevScrollHeightRef = React.useRef<number>(0);
  const prevScrollTopRef = React.useRef<number>(0);
  const isPrependingRef = React.useRef(false);

  // On initial load: jump to bottom immediately (no animation)
  // isInitialRef must be reset to true whenever messages goes null (channel switch)
  const isInitialRef = React.useRef(true);
  React.useEffect(() => {
    if (messages === null) {
      // Channel/DM changed — prepare to scroll on next load
      isInitialRef.current = true;
      return;
    }
    if (isInitialRef.current) {
      isInitialRef.current = false;
      // rAF ensures the browser has finished laying out the new messages
      // before we try to read scrollHeight / call scrollIntoView
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      });
    }
  }, [messages]);

  // After older messages are prepended, restore scroll position
  React.useEffect(() => {
    if (!isPrependingRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const newScrollHeight = el.scrollHeight;
    el.scrollTop = prevScrollTopRef.current + (newScrollHeight - prevScrollHeightRef.current);
    isPrependingRef.current = false;
  });

  // Auto-scroll when new messages arrive and user is at bottom
  const prevMsgCountRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (messages === null) {
      prevMsgCountRef.current = 0;
      return;
    }
    const count = messages.length;
    const grew = count > prevMsgCountRef.current && !isInitialRef.current;
    prevMsgCountRef.current = count;

    if (grew && atBottom && !isPrependingRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages, atBottom]);

  const handleScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nowAtBottom = distFromBottom < 80;
    setAtBottom(nowAtBottom);
    setShowScrollBtn(!nowAtBottom && distFromBottom > 300);

    // Load older messages when near the top
    if (el.scrollTop < 120 && hasMore && !loadingOlder && !isPrependingRef.current) {
      prevScrollHeightRef.current = el.scrollHeight;
      prevScrollTopRef.current = el.scrollTop;
      isPrependingRef.current = true;
      loadOlderMessages?.();
    }
  }, [hasMore, loadingOlder, loadOlderMessages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 text-primary shadow-sm">
          <MessageSquare className="h-6 w-6" />
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
    <div className="relative flex flex-1 min-h-0 flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto aether-scroll scrollbar-hide py-4"
      >
        {/* Load-older sentinel / indicator */}
        <div ref={topSentinelRef} className="px-4 pb-2 flex flex-col items-center gap-1.5">
          {loadingOlder && (
            <div className="flex items-center gap-2 text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/50" />
              <span className="text-[10px] font-semibold tracking-wider uppercase">Loading older messages…</span>
            </div>
          )}
          {!hasMore && !loadingOlder && (
            <div className="flex items-center gap-3 w-full py-2">
              <div className="flex-1 h-px bg-border/20" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 whitespace-nowrap">
                Beginning of conversation
              </span>
              <div className="flex-1 h-px bg-border/20" />
            </div>
          )}
        </div>

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
              orgId={orgId}
              currentUser={currentUser}
              onOpenDiscussion={onOpenDiscussion}
            />
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom FAB */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
          title="Scroll to latest"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
