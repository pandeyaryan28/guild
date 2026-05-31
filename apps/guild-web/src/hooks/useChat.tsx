import * as React from 'react';
import { useAuth } from './useAuth';
import {
  listenToChannels,
  listenToMessages,
  listenToDMMessages,
  listenToUserDMs,
  type Channel,
  type Message,
  type DirectMessageThread,
} from '../lib/chat';
import { type UserProfile } from '../lib/firestore';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';

// ─── useChannels ──────────────────────────────────────────────────────────────

export function useChannels(orgId: string | undefined) {
  const { user } = useAuth();
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [memberships, setMemberships] = React.useState<Set<string>>(new Set());
  const [lastReads, setLastReads] = React.useState<Map<string, Timestamp>>(new Map());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId || !user) return;
    setLoading(true);
    const unsub = listenToChannels(orgId, user.uid, (chs, mems, reads) => {
      setChannels(chs);
      setMemberships(mems);
      setLastReads(reads);
      setLoading(false);
    });
    return unsub;
  }, [orgId, user?.uid]);

  const hasUnread = React.useCallback(
    (channel: Channel) => {
      if (!channel.lastMessageAt) return false;
      const lastRead = lastReads.get(channel.id);
      if (!lastRead) return true;
      return channel.lastMessageAt.toMillis() > lastRead.toMillis();
    },
    [lastReads],
  );

  return { channels, memberships, lastReads, hasUnread, loading };
}

// ─── useMessages ──────────────────────────────────────────────────────────────
//
// Strategy: use the original orderBy('createdAt','asc') queries (existing indexes,
// no new Firestore indexes needed). All messages stream in as before. We then apply
// a client-side display window: start by showing only the last WINDOW_SIZE messages,
// and expand the window by WINDOW_SIZE each time the user scrolls to the top.
// This gives instant "jump to latest" UX with zero infrastructure changes.

const WINDOW_SIZE = 50;

export interface UseMessagesResult {
  messages: Message[] | null;   // the windowed slice to render
  loadingOlder: boolean;
  hasMore: boolean;
  loadOlderMessages: () => void;
}

export function useMessages(channelId: string | null, dmId: string | null): UseMessagesResult {
  // allMessages holds the full real-time stream
  const [allMessages, setAllMessages] = React.useState<Message[] | null>(null);
  // displayLimit controls how many of the latest messages we actually render
  const [displayLimit, setDisplayLimit] = React.useState(WINDOW_SIZE);

  // Reset window when switching channels/DMs
  React.useEffect(() => {
    setAllMessages(null);
    setDisplayLimit(WINDOW_SIZE);

    if (!channelId && !dmId) return;

    if (channelId) {
      return listenToMessages(channelId, setAllMessages);
    }
    if (dmId) {
      return listenToDMMessages(dmId, setAllMessages);
    }
  }, [channelId, dmId]);

  // The slice we hand to the UI: last `displayLimit` messages
  const messages = React.useMemo(() => {
    if (allMessages === null) return null;
    if (allMessages.length <= displayLimit) return allMessages;
    return allMessages.slice(allMessages.length - displayLimit);
  }, [allMessages, displayLimit]);

  const hasMore = allMessages !== null && allMessages.length > displayLimit;

  const loadOlderMessages = React.useCallback(() => {
    setDisplayLimit((prev) => prev + WINDOW_SIZE);
  }, []);

  return { messages, loadingOlder: false, hasMore, loadOlderMessages };
}

// ─── useDMs ───────────────────────────────────────────────────────────────────

export function useDMs(orgId: string | undefined) {
  const { user } = useAuth();
  const [threads, setThreads] = React.useState<DirectMessageThread[]>([]);
  const [dmReads, setDmReads] = React.useState<Map<string, Timestamp>>(new Map());

  React.useEffect(() => {
    if (!orgId || !user) return;
    return listenToUserDMs(user.uid, orgId, (newThreads, newReads) => {
      setThreads(newThreads);
      setDmReads(newReads);
    });
  }, [orgId, user?.uid]);

  const hasUnreadDM = React.useCallback(
    (thread: DirectMessageThread) => {
      if (!thread.lastMessageAt) return false;
      const lastRead = dmReads.get(thread.id);
      if (!lastRead) return thread.lastSenderId !== user?.uid;
      return thread.lastMessageAt.toMillis() > lastRead.toMillis() && thread.lastSenderId !== user?.uid;
    },
    [dmReads, user?.uid],
  );

  return { threads, hasUnreadDM };
}

// ─── useOrgMembers ────────────────────────────────────────────────────────────

export function useOrgMembers(orgId: string | undefined) {
  const [members, setMembers] = React.useState<UserProfile[]>([]);

  React.useEffect(() => {
    if (!orgId) return;
    const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
    const unsub = onSnapshot(q, async (snap) => {
      setMembers(snap.docs.map((d) => d.data() as UserProfile));
    });
    return unsub;
  }, [orgId]);

  return members;
}

export function useUnreadChatCount(orgId: string | undefined): number {
  const { channels, hasUnread } = useChannels(orgId);
  const { threads, hasUnreadDM } = useDMs(orgId);

  const unreadCount = React.useMemo(() => {
    const unreadChCount = channels.filter(c => hasUnread(c)).length;
    const unreadDmCount = threads.filter(t => hasUnreadDM(t)).length;
    return unreadChCount + unreadDmCount;
  }, [channels, hasUnread, threads, hasUnreadDM]);

  return unreadCount;
}
