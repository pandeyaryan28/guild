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
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useWorkspaceData } from '../context/WorkspaceDataContext';

// ─── useChannels ──────────────────────────────────────────────────────────────

export function useChannels(orgId: string | undefined) {
  const { user } = useAuth();
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackChannels, setFallbackChannels] = React.useState<Channel[]>([]);
  const [fallbackMemberships, setFallbackMemberships] = React.useState<Set<string>>(new Set());
  const [fallbackLastReads, setFallbackLastReads] = React.useState<Map<string, Timestamp>>(new Map());
  const [fallbackLoading, setFallbackLoading] = React.useState(true);

  React.useEffect(() => {
    if (canUseContext || !orgId || !user) {
      if (!orgId || !user) setFallbackLoading(false);
      return;
    }
    setFallbackLoading(true);
    return listenToChannels(orgId, user.uid, (chs, mems, reads) => {
      setFallbackChannels(chs);
      setFallbackMemberships(mems);
      setFallbackLastReads(reads);
      setFallbackLoading(false);
    });
  }, [canUseContext, orgId, user?.uid]);

  const channels = canUseContext && workspace ? workspace.channels : fallbackChannels;
  const memberships = canUseContext && workspace ? workspace.memberships : fallbackMemberships;
  const lastReads = canUseContext && workspace ? workspace.lastReads : fallbackLastReads;
  const loading = canUseContext && workspace ? workspace.channelsLoading : fallbackLoading;

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

const WINDOW_SIZE = 50;

export interface UseMessagesResult {
  messages: Message[] | null;
  loadingOlder: boolean;
  hasMore: boolean;
  loadOlderMessages: () => void;
}

export function useMessages(channelId: string | null, dmId: string | null): UseMessagesResult {
  const [allMessages, setAllMessages] = React.useState<Message[] | null>(null);
  const [displayLimit, setDisplayLimit] = React.useState(WINDOW_SIZE);

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
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);

  const [fallbackThreads, setFallbackThreads] = React.useState<DirectMessageThread[]>([]);
  const [fallbackDmReads, setFallbackDmReads] = React.useState<Map<string, Timestamp>>(new Map());

  React.useEffect(() => {
    if (canUseContext || !orgId || !user) return;
    return listenToUserDMs(user.uid, orgId, (newThreads, newReads) => {
      setFallbackThreads(newThreads);
      setFallbackDmReads(newReads);
    });
  }, [canUseContext, orgId, user?.uid]);

  const threads = canUseContext && workspace ? workspace.threads : fallbackThreads;
  const dmReads = canUseContext && workspace ? workspace.dmReads : fallbackDmReads;

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
  const workspace = useWorkspaceData();
  const canUseContext = Boolean(workspace && orgId && workspace.orgId === orgId);
  const [fallbackMembers, setFallbackMembers] = React.useState<UserProfile[]>([]);

  React.useEffect(() => {
    if (canUseContext || !orgId) return;
    const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
    return onSnapshot(q, (snap) => {
      setFallbackMembers(snap.docs.map((d) => d.data() as UserProfile));
    });
  }, [canUseContext, orgId]);

  return canUseContext && workspace ? workspace.members : fallbackMembers;
}

export function useUnreadChatCount(orgId: string | undefined): number {
  const { channels, hasUnread } = useChannels(orgId);
  const { threads, hasUnreadDM } = useDMs(orgId);

  return React.useMemo(() => {
    const unreadChCount = channels.filter((c) => hasUnread(c)).length;
    const unreadDmCount = threads.filter((t) => hasUnreadDM(t)).length;
    return unreadChCount + unreadDmCount;
  }, [channels, hasUnread, threads, hasUnreadDM]);
}
