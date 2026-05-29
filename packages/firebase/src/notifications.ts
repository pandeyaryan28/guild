import {
  collection, doc, setDoc, updateDoc, writeBatch,
  query, where, orderBy, onSnapshot, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Notification, NotificationCategory } from '@guild/types';

// Helper to get actor initials
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createNotification(params: {
  orgId: string;
  recipientId: string;
  category: NotificationCategory;
  type: string;
  urgency?: 'low' | 'medium' | 'high';
  actor: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  title: string;
  body?: string;
  link: string;
}): Promise<void> {
  // Never send a notification to oneself
  if (!params.recipientId || params.recipientId === params.actor.id) return;

  const ref = doc(collection(db, 'notifications'));
  await setDoc(ref, {
    id: ref.id,
    orgId: params.orgId,
    recipientId: params.recipientId,
    category: params.category,
    type: params.type,
    urgency: params.urgency ?? 'medium',
    actor: {
      id: params.actor.id,
      name: params.actor.name,
      avatarUrl: params.actor.avatarUrl ?? '',
      initials: getInitials(params.actor.name),
    },
    title: params.title,
    body: params.body ?? '',
    link: params.link,
    read: false,
    archived: false,
    createdAt: serverTimestamp(),
  });
}

// ─── Update Statuses ─────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string, read = true): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read });
}

export async function archiveNotification(notificationId: string, archived = true): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { archived });
}

export async function markAllRead(orgId: string, recipientId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('orgId', '==', orgId),
      where('recipientId', '==', recipientId),
      where('read', '==', false),
      where('archived', '==', false),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function archiveAllRead(orgId: string, recipientId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('orgId', '==', orgId),
      where('recipientId', '==', recipientId),
      where('read', '==', true),
      where('archived', '==', false),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { archived: true }));
  await batch.commit();
}

export async function archiveAll(orgId: string, recipientId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('orgId', '==', orgId),
      where('recipientId', '==', recipientId),
      where('archived', '==', false),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { archived: true }));
  await batch.commit();
}

// ─── Listeners ─────────────────────────────────────────────────────────────────

export function listenToNotifications(
  orgId: string,
  recipientId: string,
  cb: (notifications: Notification[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'notifications'),
      where('orgId', '==', orgId),
      where('recipientId', '==', recipientId),
      where('archived', '==', false),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Notification)),
  );
}

export function listenToArchivedNotifications(
  orgId: string,
  recipientId: string,
  cb: (notifications: Notification[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'notifications'),
      where('orgId', '==', orgId),
      where('recipientId', '==', recipientId),
      where('archived', '==', true),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Notification)),
  );
}
