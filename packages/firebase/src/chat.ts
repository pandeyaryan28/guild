import {
  collection, doc, setDoc, addDoc, updateDoc,
  getDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp, writeBatch, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';
import type {
  Channel, ChannelMember, Message, DirectMessageThread, MessageAttachment,
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
  files?: MessageAttachment[];
}): Promise<string> {
  const msgRef = doc(collection(db, 'messages'));
  const id = msgRef.id;
  await setDoc(msgRef, {
    id,
    ...params,
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
      orgId: params.orgId, recipientId: uid, type: 'mention',
      actorId: params.senderId, actorName: params.senderName,
      data: { channelId: params.channelId, messagePreview: preview },
    }).catch(() => console.error('Failed to send mention notification'));
  }
  return id;
}

export async function sendDMMessage(params: {
  dmId: string; orgId: string;
  senderId: string; senderName: string; senderUsername: string;
  body: string; mentions: string[];
  files?: MessageAttachment[];
}): Promise<string> {
  const msgRef = doc(collection(db, 'messages'));
  const id = msgRef.id;
  await setDoc(msgRef, {
    id,
    ...params,
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
  const [uid1, uid2] = params.dmId.split('_');
  const recipientId = uid1 === params.senderId ? uid2 : uid1;
  if (recipientId) {
    createNotification({
      orgId: params.orgId, recipientId, type: 'dm_received',
      actorId: params.senderId, actorName: params.senderName,
      data: { dmId: params.dmId, messagePreview: preview },
    }).catch(() => console.error('Failed to send dm_received notification'));
  }
  for (const uid of params.mentions) {
    createNotification({
      orgId: params.orgId, recipientId: uid, type: 'mention',
      actorId: params.senderId, actorName: params.senderName,
      data: { dmId: params.dmId, messagePreview: preview },
    }).catch(() => console.error('Failed to send mention notification for dm'));
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

  for (const uid of memberIds) {
    const memberRef = doc(db, 'channelMembers', `${channelId}_${uid}`);
    batch.set(
      memberRef,
      { channelId, userId: uid, orgId, joinedAt: serverTimestamp(), lastRead: serverTimestamp() },
      { merge: true }
    );

    // Send a notification
    createNotification({
      orgId,
      recipientId: uid,
      type: 'channel_invite',
      actorId: inviterId,
      actorName: inviterName,
      data: { channelId },
    }).catch((e) => console.error('Failed to create channel_invite notification:', e));
  }

  const snap = await getDoc(doc(db, 'channels', channelId));
  if (snap.exists()) {
    batch.update(doc(db, 'channels', channelId), {
      memberCount: (snap.data().memberCount || 0) + memberIds.length,
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
  await deleteDoc(doc(db, 'channels', channelId));
}

export type { Channel, ChannelMember, Message, DirectMessageThread };
