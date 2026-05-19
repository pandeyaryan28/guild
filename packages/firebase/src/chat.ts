import {
  collection, doc, setDoc, addDoc, updateDoc,
  getDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';
import type {
  Channel, ChannelMember, Message, DirectMessageThread,
} from '@guild/types';

// ─── Default Channels ─────────────────────────────────────────────────────────

const DEFAULT_CHANNELS = [
  { name: 'general',       description: 'Company-wide updates and announcements' },
  { name: 'operations',    description: 'Day-to-day operations and logistics' },
  { name: 'product',       description: 'Product discussions and roadmap' },
  { name: 'marketing',     description: 'Marketing campaigns and analytics' },
  { name: 'announcements', description: 'Important org-wide announcements' },
];

/** Called ONLY when an org is created — not on join */
export async function seedDefaultChannels(orgId: string, creatorUid: string): Promise<void> {
  const batch = writeBatch(db);

  for (const ch of DEFAULT_CHANNELS) {
    const channelRef = doc(collection(db, 'channels'));
    const channelId = channelRef.id;

    batch.set(channelRef, {
      id: channelId, orgId, name: ch.name, description: ch.description,
      createdBy: creatorUid, createdAt: serverTimestamp(), memberCount: 1,
    });

    batch.set(doc(db, 'channelMembers', `${channelId}_${creatorUid}`), {
      channelId, userId: creatorUid, orgId,
      joinedAt: serverTimestamp(), lastRead: serverTimestamp(),
    });
  }

  await batch.commit();
}

// ─── Channel Operations ───────────────────────────────────────────────────────

export async function createChannel(
  orgId: string, name: string, description: string, creatorUid: string,
): Promise<string> {
  const channelRef = doc(collection(db, 'channels'));
  const channelId = channelRef.id;
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  await setDoc(channelRef, {
    id: channelId, orgId, name: slug, description,
    createdBy: creatorUid, createdAt: serverTimestamp(), memberCount: 1,
  });

  await joinChannel(channelId, creatorUid, orgId);
  return channelId;
}

export async function joinChannel(channelId: string, userId: string, orgId: string): Promise<void> {
  await setDoc(
    doc(db, 'channelMembers', `${channelId}_${userId}`),
    { channelId, userId, orgId, joinedAt: serverTimestamp(), lastRead: serverTimestamp() },
    { merge: true },
  );
  const snap = await getDoc(doc(db, 'channels', channelId));
  if (snap.exists()) {
    await updateDoc(doc(db, 'channels', channelId), {
      memberCount: (snap.data().memberCount || 0) + 1,
    });
  }
}

export async function leaveChannel(channelId: string, userId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'channelMembers', `${channelId}_${userId}`));
  const snap = await getDoc(doc(db, 'channels', channelId));
  if (snap.exists()) {
    batch.update(doc(db, 'channels', channelId), {
      memberCount: Math.max(0, (snap.data().memberCount || 1) - 1),
    });
  }
  await batch.commit();
}

// ─── Direct Messages ──────────────────────────────────────────────────────────

export function buildDmId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export async function getOrCreateDM(uid1: string, uid2: string, orgId: string): Promise<string> {
  const dmId = buildDmId(uid1, uid2);
  const ref = doc(db, 'directMessages', dmId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: dmId, orgId, participants: [uid1, uid2],
      lastMessage: '', lastMessageAt: serverTimestamp(), lastSenderId: uid1,
    });
  }
  return dmId;
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export async function sendChannelMessage(params: {
  channelId: string; orgId: string;
  senderId: string; senderName: string; senderUsername: string;
  body: string; mentions: string[];
}): Promise<string> {
  const msgRef = doc(collection(db, 'messages'));
  const id = msgRef.id;
  await setDoc(msgRef, { id, ...params, createdAt: serverTimestamp(), deleted: false });
  await updateDoc(doc(db, 'channels', params.channelId), {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: params.body.slice(0, 100),
  });
  for (const uid of params.mentions) {
    createNotification({
      orgId: params.orgId, recipientId: uid, type: 'mention',
      actorId: params.senderId, actorName: params.senderName,
      data: { channelId: params.channelId, messagePreview: params.body.slice(0, 100) },
    }).catch(console.error);
  }
  return id;
}

export async function sendDMMessage(params: {
  dmId: string; orgId: string;
  senderId: string; senderName: string; senderUsername: string;
  body: string; mentions: string[];
}): Promise<string> {
  const msgRef = doc(collection(db, 'messages'));
  const id = msgRef.id;
  await setDoc(msgRef, { id, ...params, createdAt: serverTimestamp(), deleted: false });
  await updateDoc(doc(db, 'directMessages', params.dmId), {
    lastMessage: params.body.slice(0, 100),
    lastMessageAt: serverTimestamp(),
    lastSenderId: params.senderId,
  });
  const [uid1, uid2] = params.dmId.split('_');
  const recipientId = uid1 === params.senderId ? uid2 : uid1;
  if (recipientId) {
    createNotification({
      orgId: params.orgId, recipientId, type: 'dm_received',
      actorId: params.senderId, actorName: params.senderName,
      data: { dmId: params.dmId, messagePreview: params.body.slice(0, 100) },
    }).catch(console.error);
  }
  for (const uid of params.mentions) {
    createNotification({
      orgId: params.orgId, recipientId: uid, type: 'mention',
      actorId: params.senderId, actorName: params.senderName,
      data: { dmId: params.dmId, messagePreview: params.body.slice(0, 100) },
    }).catch(console.error);
  }
  return id;
}

export async function editMessage(messageId: string, newBody: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), { body: newBody, editedAt: serverTimestamp() });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), {
    deleted: true, body: 'This message was deleted.',
  });
}

// ─── Read State ───────────────────────────────────────────────────────────────

export async function markChannelRead(channelId: string, userId: string): Promise<void> {
  await setDoc(
    doc(db, 'channelMembers', `${channelId}_${userId}`),
    { lastRead: serverTimestamp() },
    { merge: true },
  );
}

export async function markDMRead(dmId: string, userId: string): Promise<void> {
  await setDoc(
    doc(db, 'dmReadState', `${dmId}_${userId}`),
    { dmId, userId, lastRead: serverTimestamp() },
    { merge: true },
  );
}

// ─── Real-time Listeners ──────────────────────────────────────────────────────

export function listenToChannels(
  orgId: string,
  userId: string,
  cb: (channels: Channel[], memberships: Set<string>, lastReads: Map<string, Timestamp>) => void,
): () => void {
  let channels: Channel[] = [];
  let memberships = new Set<string>();
  let lastReads = new Map<string, Timestamp>();

  const unsubCh = onSnapshot(
    query(collection(db, 'channels'), where('orgId', '==', orgId), orderBy('createdAt', 'asc')),
    (snap) => {
      channels = snap.docs.map((d) => d.data() as Channel);
      cb(channels, memberships, lastReads);
    },
  );

  const unsubMem = onSnapshot(
    query(
      collection(db, 'channelMembers'),
      where('orgId', '==', orgId),
      where('userId', '==', userId),
    ),
    (snap) => {
      memberships = new Set<string>();
      lastReads = new Map<string, Timestamp>();
      snap.docs.forEach((d) => {
        const m = d.data() as ChannelMember;
        memberships.add(m.channelId);
        if (m.lastRead) lastReads.set(m.channelId, m.lastRead);
      });
      cb(channels, memberships, lastReads);
    },
  );

  return () => { unsubCh(); unsubMem(); };
}

export function listenToMessages(
  channelId: string,
  cb: (msgs: Message[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'messages'),
      where('channelId', '==', channelId),
      orderBy('createdAt', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Message)),
  );
}

export function listenToDMMessages(
  dmId: string,
  cb: (msgs: Message[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'messages'),
      where('dmId', '==', dmId),
      orderBy('createdAt', 'asc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Message)),
  );
}

export function listenToUserDMs(
  userId: string,
  orgId: string,
  cb: (threads: DirectMessageThread[], dmReads: Map<string, Timestamp>) => void,
): () => void {
  let threads: DirectMessageThread[] = [];
  let dmReads = new Map<string, Timestamp>();

  const unsubThreads = onSnapshot(
    query(
      collection(db, 'directMessages'),
      where('orgId', '==', orgId),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc'),
    ),
    (snap) => {
      threads = snap.docs.map((d) => d.data() as DirectMessageThread);
      cb(threads, dmReads);
    },
  );

  const unsubReads = onSnapshot(
    query(
      collection(db, 'dmReadState'),
      where('userId', '==', userId),
    ),
    (snap) => {
      dmReads = new Map<string, Timestamp>();
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.lastRead && data.dmId) {
          dmReads.set(data.dmId, data.lastRead);
        }
      });
      cb(threads, dmReads);
    },
  );

  return () => { unsubThreads(); unsubReads(); };
}

export type { Channel, ChannelMember, Message, DirectMessageThread };
