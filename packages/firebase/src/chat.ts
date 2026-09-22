import {
  collection, doc, setDoc, addDoc, updateDoc,
  getDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp, writeBatch, deleteDoc,
  limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';
import { deleteCollectionByQuery } from './firestore-helpers';
import type {
  Channel, ChannelMember, Message, DirectMessageThread, MessageAttachment, ChannelWebhookPayload,
} from '@guild/types';

// ─── Default Channels ─────────────────────────────────────────────────────────

const DEFAULT_CHANNELS = [
  { name: 'general',       description: 'Company-wide updates and announcements' },
  { name: 'operations',    description: 'Day-to-day operations and logistics' },
  { name: 'product',       description: 'Product discussions and roadmap' },
  { name: 'marketing',     description: 'Marketing campaigns and analytics' },
  { name: 'announcements', description: 'Important org-wide announcements' },
];

const INDUSTRY_TEMPLATES: Record<string, {
  channels: { name: string; description: string }[];
  tasks: { title: string; description: string; priority: 'none' | 'low' | 'medium' | 'high' | 'urgent'; status: 'todo' | 'in_progress' | 'review' | 'done' }[];
}> = {
  'Technology': {
    channels: [
      { name: 'general', description: 'Company-wide updates and announcements' },
      { name: 'engineering', description: 'Code reviews, deployments, and architecture discussions' },
      { name: 'product-roadmap', description: 'Product specs, features, and prioritization' },
      { name: 'design-feedback', description: 'UI mockups, asset sharing, and UX discussions' },
      { name: 'operations', description: 'Administrative and operational coordination' }
    ],
    tasks: [
      { title: 'Deploy production v1.0 release bundle', description: 'Prepare CI/CD pipeline and release logs for version 1.0', priority: 'high', status: 'todo' },
      { title: 'Optimize database indexing and replication', description: 'Verify read replica latencies and slow-query indexes', priority: 'medium', status: 'todo' },
      { title: 'Design premium onboarding step-wizard UI', description: 'Sketch high-fidelity Aether glass panel user journeys', priority: 'urgent', status: 'in_progress' }
    ]
  },
  'Marketing & Creative Agency': {
    channels: [
      { name: 'general', description: 'Company-wide updates and announcements' },
      { name: 'creative-briefs', description: 'Client campaigns, assets, and brainstorming' },
      { name: 'social-media', description: 'Content calendar, copy review, and trends' },
      { name: 'client-feedback', description: 'Account management, approvals, and reviews' },
      { name: 'operations', description: 'Billing, schedules, and resource planning' }
    ],
    tasks: [
      { title: 'Draft social media campaign briefing', description: 'Outline design guidelines and voice directions for client X', priority: 'medium', status: 'todo' },
      { title: 'Prepare Q2 email marketing calendar', description: 'Finalize template graphics and copy proofs for newsletter', priority: 'high', status: 'in_progress' }
    ]
  },
  'Logistics & Supply Chain': {
    channels: [
      { name: 'general', description: 'Company-wide updates and announcements' },
      { name: 'operations', description: 'Daily dispatch and fleet coordination' },
      { name: 'supply-chain', description: 'Vendors, inventory, and warehouse updates' },
      { name: 'delivery-tracking', description: 'Route optimization and ETA alerts' },
      { name: 'safety', description: 'Compliance, reporting, and equipment audits' }
    ],
    tasks: [
      { title: 'Run weekly preventative fleet checklist', description: 'Audit tire tread depth, oil levels, and electronic logs', priority: 'urgent', status: 'todo' },
      { title: 'Audit warehouse zone B stock levels', description: 'Cross-reference manual inventory counts with ERP records', priority: 'medium', status: 'in_progress' }
    ]
  },
  'Manufacturing': {
    channels: [
      { name: 'general', description: 'Company-wide updates and announcements' },
      { name: 'assembly-line', description: 'Production planning, schedules, and equipment status' },
      { name: 'quality-assurance', description: 'QC checklists, audits, and defect reports' },
      { name: 'inventory-logistics', description: 'Raw materials, vendor shipping, and warehousing' },
      { name: 'safety-training', description: 'Daily safety briefings and compliance logs' }
    ],
    tasks: [
      { title: 'Calibrate assembly line thermal sensors', description: 'Verify tolerance deviations on machine 4 heater rails', priority: 'urgent', status: 'todo' },
      { title: 'Record daily scrap weight and shift reports', description: 'Log material yield efficiencies for team shifts', priority: 'high', status: 'in_progress' }
    ]
  }
};

/** Called ONLY when an org is created — not on join */
export async function seedDefaultChannels(orgId: string, creatorUid: string, industry = 'Other'): Promise<void> {
  const batch = writeBatch(db);
  const template = INDUSTRY_TEMPLATES[industry] || {
    channels: DEFAULT_CHANNELS,
    tasks: [
      { title: 'Welcome to your Guild workspace!', description: 'Create your first channel, send a chat message, or assign a task to get started.', priority: 'none', status: 'todo' }
    ]
  };

  // 1. Seed channels
  for (const ch of template.channels) {
    const channelRef = doc(collection(db, 'channels'));
    const channelId = channelRef.id;

    batch.set(channelRef, {
      id: channelId, orgId, name: ch.name, description: ch.description,
      createdBy: creatorUid, createdAt: serverTimestamp(), memberCount: 1,
      isPrivate: false, isRestricted: false,
    });

    batch.set(doc(db, 'channelMembers', `${channelId}_${creatorUid}`), {
      channelId, userId: creatorUid, orgId,
      joinedAt: serverTimestamp(), lastRead: serverTimestamp(),
    });
  }

  // 2. Seed starter tasks
  let orderIndex = 1000;
  for (const t of template.tasks) {
    const taskRef = doc(collection(db, 'tasks'));
    batch.set(taskRef, {
      id: taskRef.id, orgId, title: t.title, description: t.description,
      status: t.status, priority: t.priority,
      assigneeIds: [creatorUid], creatorId: creatorUid,
      labelIds: [], dueDate: null, orderIndex,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      projectId: null, goalId: null, parentTaskId: null,
    });
    orderIndex += 1000;
  }

  await batch.commit();
}

// ─── Channel Operations ───────────────────────────────────────────────────────

export async function createChannel(
  orgId: string, name: string, description: string, creatorUid: string,
  options?: { isPrivate?: boolean; isRestricted?: boolean },
): Promise<string> {
  const channelRef = doc(collection(db, 'channels'));
  const channelId = channelRef.id;
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  await setDoc(channelRef, {
    id: channelId, orgId, name: slug, description,
    createdBy: creatorUid, createdAt: serverTimestamp(), memberCount: 1,
    isPrivate: options?.isPrivate ?? false,
    isRestricted: options?.isRestricted ?? false,
  });

  await joinChannel(channelId, creatorUid, orgId);
  return channelId;
}

export async function joinChannel(channelId: string, userId: string, orgId: string): Promise<void> {
  const memberRef = doc(db, 'channelMembers', `${channelId}_${userId}`);
  const memberSnap = await getDoc(memberRef);
  const isAlreadyMember = memberSnap.exists();

  await setDoc(
    memberRef,
    { channelId, userId, orgId, joinedAt: serverTimestamp(), lastRead: serverTimestamp() },
    { merge: true },
  );

  if (!isAlreadyMember) {
    const snap = await getDoc(doc(db, 'channels', channelId));
    if (snap.exists()) {
      await updateDoc(doc(db, 'channels', channelId), {
        memberCount: (snap.data().memberCount || 0) + 1,
      });
    }
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

function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

export async function sendChannelMessage(params: {
  channelId: string; orgId: string;
  senderId: string; senderName: string; senderUsername: string;
  body: string; mentions: string[];
  files?: MessageAttachment[];
  parentMessageId?: string;
  parentMessage?: {
    id: string;
    senderName: string;
    body: string;
  };
}): Promise<string> {
  const msgRef = doc(collection(db, 'messages'));
  const id = msgRef.id;
  const cleanedParams = removeUndefined(params);
  await setDoc(msgRef, {
    id,
    ...cleanedParams,
    files: params.files || [],
    createdAt: serverTimestamp(),
    deleted: false,
  });

  let preview = params.body ? params.body.slice(0, 100) : '';
  if (!preview && params.files && params.files.length > 0) {
    const count = params.files.length;
    const isImage = params.files[0].type.startsWith('image/');
    if (count === 1) {
      preview = isImage ? 'Sent an image' : `Sent a file: ${params.files[0].name}`;
    } else {
      preview = `Shared ${count} files`;
    }
  }

  await updateDoc(doc(db, 'channels', params.channelId), {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: preview,
  });
  for (const uid of params.mentions) {
    createNotification({
      orgId: params.orgId,
      recipientId: uid,
      category: 'mentions',
      type: 'mention',
      urgency: 'high',
      actor: { id: params.senderId, name: params.senderName },
      title: `${params.senderName} mentioned you`,
      body: preview,
      link: `/chat/c/${params.channelId}`,
    }).catch(() => console.error('Failed to send mention notification'));
  }
  return id;
}

export async function sendDMMessage(params: {
  dmId: string; orgId: string;
  senderId: string; senderName: string; senderUsername: string;
  body: string; mentions: string[];
  files?: MessageAttachment[];
  parentMessageId?: string;
  parentMessage?: {
    id: string;
    senderName: string;
    body: string;
  };
}): Promise<string> {
  const msgRef = doc(collection(db, 'messages'));
  const id = msgRef.id;
  const cleanedParams = removeUndefined(params);
  await setDoc(msgRef, {
    id,
    ...cleanedParams,
    files: params.files || [],
    createdAt: serverTimestamp(),
    deleted: false,
  });

  let preview = params.body ? params.body.slice(0, 100) : '';
  if (!preview && params.files && params.files.length > 0) {
    const count = params.files.length;
    const isImage = params.files[0].type.startsWith('image/');
    if (count === 1) {
      preview = isImage ? 'Sent an image' : `Sent a file: ${params.files[0].name}`;
    } else {
      preview = `Shared ${count} files`;
    }
  }

  await updateDoc(doc(db, 'directMessages', params.dmId), {
    lastMessage: preview,
    lastMessageAt: serverTimestamp(),
    lastSenderId: params.senderId,
  });
  let recipientId: string | undefined;
  try {
    const dmSnap = await getDoc(doc(db, 'directMessages', params.dmId));
    const participants: string[] = dmSnap.data()?.participants ?? [];
    recipientId = participants.find((id) => id !== params.senderId);
  } catch (err) {
    console.error('Failed to resolve DM recipient for notification', err);
  }
  if (recipientId) {
    createNotification({
      orgId: params.orgId,
      recipientId,
      category: 'inbox',
      type: 'dm',
      urgency: 'medium',
      actor: { id: params.senderId, name: params.senderName },
      title: `New message from ${params.senderName}`,
      body: preview,
      link: `/chat/dm/${params.dmId}`,
    }).catch(() => console.error('Failed to send dm notification'));
  }
  for (const uid of params.mentions) {
    createNotification({
      orgId: params.orgId,
      recipientId: uid,
      category: 'mentions',
      type: 'mention',
      urgency: 'high',
      actor: { id: params.senderId, name: params.senderName },
      title: `${params.senderName} mentioned you in a DM`,
      body: preview,
      link: `/chat/dm/${params.dmId}`,
    }).catch(() => console.error('Failed to send mention notification for dm'));
  }
  return id;
}

export async function editMessage(messageId: string, newBody: string): Promise<void> {
  const msgRef = doc(db, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) {
    throw new Error('Message does not exist.');
  }
  const msgData = snap.data();
  const createdAt = msgData.createdAt;
  if (createdAt && typeof createdAt.toDate === 'function') {
    const createdTime = createdAt.toDate().getTime();
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - createdTime >= oneHour) {
      throw new Error('Messages cannot be edited after 1 hour.');
    }
  }
  await updateDoc(msgRef, { body: newBody, editedAt: serverTimestamp() });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), {
    deleted: true, body: 'This message was deleted.',
  });
}

// ─── Read State ───────────────────────────────────────────────────────────────

export async function markChannelRead(channelId: string, userId: string, orgId?: string): Promise<void> {
  const data: Record<string, any> = {
    channelId,
    userId,
    lastRead: serverTimestamp(),
  };

  if (orgId) {
    data.orgId = orgId;
  } else {
    try {
      const chSnap = await getDoc(doc(db, 'channels', channelId));
      if (chSnap.exists()) {
        data.orgId = chSnap.data().orgId;
      }
    } catch (e) {
      console.error('Failed to fetch channel orgId in markChannelRead.');
    }
  }

  await setDoc(
    doc(db, 'channelMembers', `${channelId}_${userId}`),
    data,
    { merge: true },
  );
}

export async function markDMRead(dmId: string, userId: string, orgId?: string): Promise<void> {
  let finalOrgId = orgId;
  if (!finalOrgId) {
    try {
      const snap = await getDoc(doc(db, 'directMessages', dmId));
      if (snap.exists()) {
        finalOrgId = snap.data().orgId;
      }
    } catch (e) {
      console.error('Failed to fetch DM orgId in markDMRead:', e);
    }
  }

  await setDoc(
    doc(db, 'dmReadState', `${dmId}_${userId}`),
    { dmId, userId, orgId: finalOrgId || '', lastRead: serverTimestamp() },
    { merge: true },
  );
}

// ─── Real-time Listeners ──────────────────────────────────────────────────────

export function listenToChannels(
  orgId: string,
  userId: string,
  cb: (channels: Channel[], memberships: Set<string>, lastReads: Map<string, Timestamp>) => void,
): () => void {
  let publicChannels: Channel[] = [];
  let privateChannelsMap = new Map<string, Channel>();
  let memberships = new Set<string>();
  let lastReads = new Map<string, Timestamp>();

  const privateListeners = new Map<string, () => void>();

  const triggerCallback = () => {
    const allChannelsMap = new Map<string, Channel>();
    publicChannels.forEach(c => allChannelsMap.set(c.id, c));
    privateChannelsMap.forEach((c, id) => {
      if (memberships.has(id)) {
        allChannelsMap.set(id, c);
      }
    });

    const merged = Array.from(allChannelsMap.values()).sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return aTime - bTime;
    });

    cb(merged, memberships, lastReads);
  };

  const unsubCh = onSnapshot(
    query(
      collection(db, 'channels'),
      where('orgId', '==', orgId),
      where('isPrivate', '==', false),
    ),
    (snap) => {
      publicChannels = snap.docs.map((d) => d.data() as Channel);
      publicChannels.forEach(c => {
        if (privateListeners.has(c.id)) {
          privateListeners.get(c.id)?.();
          privateListeners.delete(c.id);
          privateChannelsMap.delete(c.id);
        }
      });
      triggerCallback();
    },
    (err) => {
      console.error('Error listening to public channels:', err);
    }
  );

  const unsubMem = onSnapshot(
    query(
      collection(db, 'channelMembers'),
      where('orgId', '==', orgId),
      where('userId', '==', userId),
    ),
    (snap) => {
      const newMemberships = new Set<string>();
      const newLastReads = new Map<string, Timestamp>();
      
      snap.docs.forEach((d) => {
        const m = d.data() as ChannelMember;
        newMemberships.add(m.channelId);
        if (m.lastRead) newLastReads.set(m.channelId, m.lastRead);
      });

      memberships = newMemberships;
      lastReads = newLastReads;

      const publicIds = new Set(publicChannels.map(c => c.id));
      
      memberships.forEach((id) => {
        if (!publicIds.has(id) && !privateListeners.has(id)) {
          const unsubPrivate = onSnapshot(
            doc(db, 'channels', id),
            (docSnap) => {
              if (docSnap.exists()) {
                privateChannelsMap.set(id, docSnap.data() as Channel);
                triggerCallback();
              }
            },
            (err) => {
              console.error(`Error listening to private channel ${id}:`, err);
            }
          );
          privateListeners.set(id, unsubPrivate);
        }
      });

      privateListeners.forEach((unsubPrivate, id) => {
        if (!memberships.has(id) || publicIds.has(id)) {
          unsubPrivate();
          privateListeners.delete(id);
          privateChannelsMap.delete(id);
        }
      });

      triggerCallback();
    },
    (err) => {
      console.error('Error listening to memberships:', err);
    }
  );

  return () => {
    unsubCh();
    unsubMem();
    privateListeners.forEach(unsub => unsub());
  };
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

// ─── Paginated Message Listeners ──────────────────────────────────────────────

const PAGE_SIZE = 50;

/**
 * Streams the latest PAGE_SIZE messages in real-time.
 * Uses orderBy DESC + limit then reverses in JS — works with existing ASC indexes.
 * Calls cb with (messages asc-ordered, oldestDoc cursor).
 */
export function listenToLatestMessages(
  id: string,
  type: 'channel' | 'dm',
  cb: (msgs: Message[], oldestDoc: QueryDocumentSnapshot<DocumentData> | null) => void,
): () => void {
  const field = type === 'channel' ? 'channelId' : 'dmId';
  return onSnapshot(
    query(
      collection(db, 'messages'),
      where(field, '==', id),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    ),
    (snap) => {
      // docs arrive newest-first; reverse to get chronological order for display
      const reversed = [...snap.docs].reverse();
      const msgs = reversed.map((d) => d.data() as Message);
      // The oldest doc in the window is the last in the DESC result (first reversed)
      const oldest = reversed[0] ?? null;
      cb(msgs, oldest);
    },
  );
}

/**
 * One-shot fetch of PAGE_SIZE messages older than `cursorDoc`.
 * Uses orderBy DESC + startAfter (cursor is the oldest doc from previous window).
 * Returns [messages asc-ordered, newOldestDoc, hasMore].
 */
export async function fetchOlderMessages(
  id: string,
  type: 'channel' | 'dm',
  cursorDoc: QueryDocumentSnapshot<DocumentData>,
): Promise<[Message[], QueryDocumentSnapshot<DocumentData> | null, boolean]> {
  const field = type === 'channel' ? 'channelId' : 'dmId';
  const snap = await getDocs(
    query(
      collection(db, 'messages'),
      where(field, '==', id),
      orderBy('createdAt', 'desc'),
      startAfter(cursorDoc),
      limit(PAGE_SIZE),
    ),
  );
  // snap.docs is newest-first within this older batch; reverse for display
  const reversed = [...snap.docs].reverse();
  const msgs = reversed.map((d) => d.data() as Message);
  const newOldest = reversed[0] ?? null;
  const hasMore = snap.docs.length === PAGE_SIZE;
  return [msgs, newOldest, hasMore];
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

export async function updateChannelSettings(
  channelId: string,
  data: { name?: string; description?: string; isRestricted?: boolean; isPrivate?: boolean }
): Promise<void> {
  const channelRef = doc(db, 'channels', channelId);
  const updates: Record<string, any> = {};
  if (data.name !== undefined) {
    updates.name = data.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  if (data.description !== undefined) updates.description = data.description;
  if (data.isRestricted !== undefined) updates.isRestricted = data.isRestricted;
  if (data.isPrivate !== undefined) updates.isPrivate = data.isPrivate;

  await updateDoc(channelRef, updates);
}

export async function addChannelMembers(
  channelId: string,
  orgId: string,
  memberIds: string[],
  inviterId: string,
  inviterName: string
): Promise<void> {
  const batch = writeBatch(db);
  const snap = await getDoc(doc(db, 'channels', channelId));
  const channelName = snap.exists() ? snap.data().name : '';

  // Fetch all existing membership docs in parallel
  const checkPromises = memberIds.map(uid => getDoc(doc(db, 'channelMembers', `${channelId}_${uid}`)));
  const memberSnaps = await Promise.all(checkPromises);
  
  let newMembersCount = 0;

  for (let i = 0; i < memberIds.length; i++) {
    const uid = memberIds[i];
    const memberSnap = memberSnaps[i];
    const memberRef = doc(db, 'channelMembers', `${channelId}_${uid}`);
    
    batch.set(
      memberRef,
      { channelId, userId: uid, orgId, joinedAt: serverTimestamp(), lastRead: serverTimestamp() },
      { merge: true }
    );

    if (!memberSnap.exists()) {
      newMembersCount++;
      // Send a notification
      createNotification({
        orgId,
        recipientId: uid,
        category: 'inbox',
        type: 'channel_invite',
        urgency: 'medium',
        actor: { id: inviterId, name: inviterName },
        title: `Added to #${channelName || 'channel'}`,
        body: `${inviterName} invited you to join #${channelName || 'channel'}`,
        link: `/chat/c/${channelId}`,
      }).catch((e) => console.error('Failed to create channel_invite notification:', e));
    }
  }

  if (snap.exists() && newMembersCount > 0) {
    batch.update(doc(db, 'channels', channelId), {
      memberCount: (snap.data().memberCount || 0) + newMembersCount,
    });
  }

  await batch.commit();
}

export async function removeChannelMember(channelId: string, userId: string): Promise<void> {
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

export async function deleteChannel(channelId: string): Promise<void> {
  // Fetch messages in the channel to delete their replies
  const msgsSnap = await getDocs(query(collection(db, 'messages'), where('channelId', '==', channelId)));
  for (const msgDoc of msgsSnap.docs) {
    await deleteCollectionByQuery(query(collection(db, 'messageReplies'), where('messageId', '==', msgDoc.id)));
  }

  await deleteCollectionByQuery(query(collection(db, 'messages'), where('channelId', '==', channelId)));
  await deleteCollectionByQuery(query(collection(db, 'channelMembers'), where('channelId', '==', channelId)));
  await deleteDoc(doc(db, 'channels', channelId));
}

// ─── Channel Inbound Webhooks ──────────────────────────────────────────────────

function generateSecureToken(): string {
  const cryptoObj = typeof crypto !== 'undefined'
    ? crypto
    : (typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined);
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(32);
    cryptoObj.getRandomValues(bytes);
    return `gh_live_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  const chars = '0123456789abcdef';
  let rand = '';
  for (let i = 0; i < 64; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `gh_live_${rand}`;
}

export async function generateChannelWebhook(
  channelId: string,
  botName: string = 'Inbound Bot',
  createdBy?: string,
): Promise<{ token: string; webhookUrl: string }> {
  const token = generateSecureToken();
  const channelRef = doc(db, 'channels', channelId);
  const updatePayload: Record<string, any> = {
    webhookToken: token,
    webhookBotName: botName.trim() || 'Inbound Bot',
    webhookCreatedAt: serverTimestamp(),
  };
  if (createdBy) {
    updatePayload.webhookCreatedBy = createdBy;
  }
  await updateDoc(channelRef, updatePayload);

  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://guildorbit.com';
  const webhookUrl = `${origin}/api/webhooks/channel?channelId=${channelId}&token=${token}`;

  return { token, webhookUrl };
}

export async function revokeChannelWebhook(channelId: string): Promise<void> {
  const channelRef = doc(db, 'channels', channelId);
  await updateDoc(channelRef, {
    webhookToken: null,
    webhookBotName: null,
    webhookCreatedAt: null,
    webhookCreatedBy: null,
    webhookAutoCreateTask: null,
  });
}

export async function updateChannelWebhookSettings(
  channelId: string,
  settings: {
    webhookBotName?: string;
    webhookAutoCreateTask?: boolean;
  },
): Promise<void> {
  const channelRef = doc(db, 'channels', channelId);
  const updates: Record<string, any> = {};
  if (settings.webhookBotName !== undefined) {
    updates.webhookBotName = settings.webhookBotName.trim() || 'Inbound Bot';
  }
  if (settings.webhookAutoCreateTask !== undefined) {
    updates.webhookAutoCreateTask = settings.webhookAutoCreateTask;
  }
  await updateDoc(channelRef, updates);
}

export type { Channel, ChannelMember, Message, DirectMessageThread, ChannelWebhookPayload };

