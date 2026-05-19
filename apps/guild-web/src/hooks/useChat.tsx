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

export function useMessages(channelId: string | null, dmId: string | null) {
  const [messages, setMessages] = React.useState<Message[] | null>(null);

  React.useEffect(() => {
    setMessages(null);
    if (!channelId && !dmId) return;

    if (channelId) {
      return listenToMessages(channelId, setMessages);
    }
    if (dmId) {
      return listenToDMMessages(dmId, setMessages);
    }
  }, [channelId, dmId]);

  return messages;
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
