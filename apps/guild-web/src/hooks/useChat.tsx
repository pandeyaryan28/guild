import * as React from 'react';
import { useAuth } from './useAuth';
import {
  listenToChannels,
  listenToLatestMessages,
  fetchOlderMessages,
  listenToUserDMs,
  type Channel,
  type Message,
  type DirectMessageThread,
} from '../lib/chat';
import { type UserProfile } from '../lib/firestore';
import { collection, query, where, onSnapshot, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
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

export interface UseMessagesResult {
  messages: Message[] | null;
  loadingInitial: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  loadOlderMessages: () => Promise<void>;
}

export function useMessages(channelId: string | null, dmId: string | null): UseMessagesResult {
  const [messages, setMessages] = React.useState<Message[] | null>(null);
  const [loadingInitial, setLoadingInitial] = React.useState(true);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  // Cursor for the oldest document we have; used to page backwards
  const oldestDocRef = React.useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  // Whether the real-time listener has fired at least once
  const initialFiredRef = React.useRef(false);

  React.useEffect(() => {
    setMessages(null);
    setLoadingInitial(true);
    setHasMore(true);
    oldestDocRef.current = null;
    initialFiredRef.current = false;

    const id = channelId || dmId;
    const type: 'channel' | 'dm' = channelId ? 'channel' : 'dm';
    if (!id) return;

    const unsub = listenToLatestMessages(id, type, (msgs, oldestDoc) => {
      if (!initialFiredRef.current) {
        // First fire: assume there may be more history unless < PAGE_SIZE came back
        setHasMore(msgs.length >= 50);
        setLoadingInitial(false);
        initialFiredRef.current = true;
      }
      // Keep the real-time window's oldest cursor up to date only when we have
      // no older pages loaded (i.e. no user has scrolled back yet)
      if (oldestDoc && !oldestDocRef.current) {
        oldestDocRef.current = oldestDoc;
      }
      // Merge: new real-time messages may contain updates/deletes; replace tail
      setMessages((prev) => {
        if (!prev) return msgs;
        // Find the oldest id in the real-time batch so we can replace from there
        const oldestId = msgs[0]?.id;
        if (!oldestId) return msgs;
        const prependedOlder = prev.filter(
          (m) => {
            // keep messages that are older than the window (came from fetchOlderMessages)
            const prevTs = (m.createdAt as any)?.toMillis?.() ?? 0;
            const windowOldestTs = (msgs[0]?.createdAt as any)?.toMillis?.() ?? 0;
            return prevTs < windowOldestTs;
          }
        );
        return [...prependedOlder, ...msgs];
      });
    });

    return () => {
      unsub();
      oldestDocRef.current = null;
      initialFiredRef.current = false;
    };
  }, [channelId, dmId]);

  const loadOlderMessages = React.useCallback(async () => {
    const id = channelId || dmId;
    const type: 'channel' | 'dm' = channelId ? 'channel' : 'dm';
    if (!id || !oldestDocRef.current || loadingOlder || !hasMore) return;

    setLoadingOlder(true);
    try {
      const [olderMsgs, newOldest, more] = await fetchOlderMessages(id, type, oldestDocRef.current);
      oldestDocRef.current = newOldest;
      setHasMore(more);
      if (olderMsgs.length > 0) {
        setMessages((prev) => [...olderMsgs, ...(prev ?? [])]);
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [channelId, dmId, loadingOlder, hasMore]);

  return { messages, loadingInitial, loadingOlder, hasMore, loadOlderMessages };
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
