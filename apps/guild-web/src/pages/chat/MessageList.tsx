import * as React from 'react';
import { type Message } from '../../lib/chat';
import { MessageBubble } from './MessageBubble';
import { Loader2, MessageSquare, ArrowDown, Sparkles, CheckSquare, Target, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

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
  onQuoteMessage?: (msg: Message) => void;
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
  onQuoteMessage,
}: MessageListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Track whether user is near the bottom for auto-scroll on new messages
  const [atBottom, setAtBottom] = React.useState(true);
  const [showScrollBtn, setShowScrollBtn] = React.useState(false);

  // Save scroll position before prepending older messages
  const prevScrollHeightRef = React.useRef<number>(0);
  const prevScrollTopRef = React.useRef<number>(0);
  const isPrependingRef = React.useRef(false);

  // On initial load: jump to bottom immediately
  const isInitialRef = React.useRef(true);
  React.useEffect(() => {
    if (messages === null) {
      isInitialRef.current = true;
      return;
    }
    if (isInitialRef.current) {
      isInitialRef.current = false;
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
    setShowScrollBtn(!nowAtBottom && distFromBottom > 240);

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
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-surface/60 dark:bg-white/5 backdrop-blur-xl border border-border-default/80 dark:border-white/10 shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Loading conversations…</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/5">
          <MessageSquare className="h-7 w-7" />
        </div>
        <div className="max-w-sm space-y-1.5">
          <h3 className="text-base font-bold text-foreground">No messages yet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Start the conversation or run operational commands to coordinate work with your team.
          </p>
        </div>
      </div>
    );
  }

  // Build grouped list with date dividers
  const items: Array<{ type: 'divider'; label: string } | { type: 'msg'; msg: Message; isGrouped: boolean }> = [];
  let lastDate = '';
  let lastSenderId = '';
  let lastTime = 0;

  for (const msg of messages) {
    if (!msg.createdAt) {
      items.push({ type: 'msg', msg, isGrouped: false });
      continue;
    }

    const msgDate =
      typeof (msg.createdAt as any).toDate === 'function'
        ? (msg.createdAt as any).toDate()
        : new Date((msg.createdAt as any).seconds ? (msg.createdAt as any).seconds * 1000 : (msg.createdAt as any));

    const dateLabel = formatDateLabel(msgDate);
    if (dateLabel !== lastDate) {
      items.push({ type: 'divider', label: dateLabel });
      lastDate = dateLabel;
      lastSenderId = '';
      lastTime = 0;
    }

    const msgTime = msgDate.getTime();
    const isConsecutive =
      msg.senderId === lastSenderId &&
      msgTime - lastTime < GROUP_THRESHOLD_MS &&
      !msg.parentMessage;

    items.push({ type: 'msg', msg, isGrouped: isConsecutive });
    lastSenderId = msg.senderId;
    lastTime = msgTime;
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1 scrollbar-thin"
      >
        {/* Loading older historical messages indicator */}
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/90 dark:bg-white/5 border border-border-default/80 dark:border-white/10 shadow-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground">Loading earlier messages...</span>
            </div>
          </div>
        )}

        {/* Message Items and Floating Date Dividers */}
        {items.map((item, idx) => {
          if (item.type === 'divider') {
            return (
              <div key={`divider-${item.label}-${idx}`} className="flex items-center justify-center my-4 select-none">
                <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface/90 dark:bg-surface-elevated/80 border border-border-default/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
                  <span className="text-[11px] font-bold text-muted-foreground tracking-wide">
                    {item.label}
                  </span>
                </div>
              </div>
            );
          }

          const isOwn = item.msg.senderId === currentUserId;

          return (
            <MessageBubble
              key={item.msg.id}
              message={item.msg}
              isOwn={isOwn}
              isGrouped={item.isGrouped}
              members={members}
              orgId={orgId}
              currentUser={currentUser}
              onOpenDiscussion={onOpenDiscussion}
              onQuoteMessage={onQuoteMessage}
            />
          );
        })}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Floating Jump to Latest Button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-4 right-6 z-20"
          >
            <button
              type="button"
              onClick={scrollToBottom}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface/95 dark:bg-surface-elevated/95 border border-border-default/80 dark:border-white/15 text-primary text-xs font-bold shadow-xl backdrop-blur-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              <span>Jump to latest</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
