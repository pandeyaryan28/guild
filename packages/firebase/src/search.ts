import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import type {
  Task, Channel, UserProfile,
  SearchResultType, SearchResultItem, SearchResults,
} from '@guild/types';

export const EMPTY_RESULTS: SearchResults = {
  tasks: [], channels: [], people: [], messages: [],
};

// ─── Client-side filters ──────────────────────────────────────────────────────

export function searchTasks(tasks: Task[], q: string): SearchResultItem[] {
  const lower = q.toLowerCase();
  return tasks
    .filter((t) =>
      t.title.toLowerCase().includes(lower) ||
      (t.description || '').toLowerCase().includes(lower),
    )
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      subtitle: t.description?.slice(0, 90) || undefined,
      meta: t.status,
      href: `/workspace?task=${t.id}`,
      matchedField: t.title.toLowerCase().includes(lower) ? 'title' as const : 'subtitle' as const,
    }));
}

export function searchChannels(channels: Channel[], q: string): SearchResultItem[] {
  const lower = q.toLowerCase();
  return channels
    .filter((c) => c.name.toLowerCase().includes(lower))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      type: 'channel' as const,
      title: `#${c.name}`,
      subtitle: c.description || undefined,
      href: `/chat/c/${c.id}`,
      matchedField: 'title' as const,
    }));
}

export function searchPeople(members: UserProfile[], q: string): SearchResultItem[] {
  const lower = q.toLowerCase();
  return members
    .filter(
      (m) =>
        (m.fullName || '').toLowerCase().includes(lower) ||
        (m.username || '').toLowerCase().includes(lower),
    )
    .slice(0, 5)
    .map((m) => ({
      id: m.uid,
      type: 'person' as const,
      title: m.fullName || m.username,
      subtitle: `@${m.username}`,
      meta: m.role,
      href: `/chat/dm/new?uid=${m.uid}`,
      matchedField: 'title' as const,
    }));
}

// ─── Firestore message search ─────────────────────────────────────────────────

export async function searchMessages(
  orgId: string,
  queryStr: string,
  options?: {
    userId?: string;
    allowedChannelIds?: Set<string> | string[];
    allowedDmIds?: Set<string> | string[];
  },
): Promise<SearchResultItem[]> {
  if (!queryStr.trim() || queryStr.length < 2) return [];
  const lower = queryStr.toLowerCase();
  const currentUid = options?.userId ?? auth.currentUser?.uid;

  const allowedChannels = options?.allowedChannelIds
    ? (options.allowedChannelIds instanceof Set
        ? options.allowedChannelIds
        : new Set(options.allowedChannelIds))
    : null;

  const allowedDms = options?.allowedDmIds
    ? (options.allowedDmIds instanceof Set
        ? options.allowedDmIds
        : new Set(options.allowedDmIds))
    : null;

  const snap = await getDocs(
    query(
      collection(db, 'messages'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
      limit(100),
    ),
  );

  return snap.docs
    .map((d) => d.data() as {
      id: string; body: string; senderName: string;
      channelId?: string; dmId?: string; deleted?: boolean;
    })
    .filter((m) => {
      if (m.deleted) return false;
      if (!(m.body || '').toLowerCase().includes(lower)) return false;

      // Privacy filter for DMs: only return DMs where the current user is a participant
      if (m.dmId) {
        if (allowedDms) {
          return allowedDms.has(m.dmId);
        }
        if (currentUid) {
          return m.dmId.split('_').includes(currentUid);
        }
        return false;
      }

      // Privacy filter for channels: if allowedChannels set is provided, enforce membership/visibility
      if (m.channelId && allowedChannels) {
        return allowedChannels.has(m.channelId);
      }

      return true;
    })
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      type: 'message' as const,
      title: m.senderName || 'Unknown',
      subtitle: m.body?.slice(0, 100),
      href: m.channelId ? `/chat/c/${m.channelId}` : m.dmId ? `/chat/dm/${m.dmId}` : '/chat',
      matchedField: 'subtitle' as const,
    }));
}

// ─── Highlight helper ─────────────────────────────────────────────────────────

/** Splits `text` into segments: [text, isMatch] */
export function highlightSegments(text?: string | null, query?: string | null): Array<[string, boolean]> {
  if (!text) return [];
  if (!query || !query.trim()) return [[text, false]];

  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return [[text, false]];

  const segments: Array<[string, boolean]> = [];
  let lastIndex = 0;
  let idx = lower.indexOf(q, lastIndex);

  while (idx !== -1) {
    if (idx > lastIndex) {
      segments.push([text.slice(lastIndex, idx), false]);
    }
    segments.push([text.slice(idx, idx + q.length), true]);
    lastIndex = idx + q.length;
    idx = lower.indexOf(q, lastIndex);
  }

  if (lastIndex < text.length) {
    segments.push([text.slice(lastIndex), false]);
  }

  return segments.length > 0 ? segments : [[text, false]];
}

export type { SearchResultType, SearchResultItem, SearchResults };
