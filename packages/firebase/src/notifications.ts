import {
  collection, doc, setDoc, updateDoc, writeBatch,
  query, where, orderBy, onSnapshot, serverTimestamp, getDocs, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Notification, NotificationType } from '@guild/types';

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createNotification(params: {
  orgId: string;
  recipientId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  data?: Notification['data'];
}): Promise<void> {
  // Never send a notification to yourself
  if (!params.recipientId || params.recipientId === params.actorId) return;
  const ref = doc(collection(db, 'notifications'));
  await setDoc(ref, {
    id: ref.id,
    orgId: params.orgId,
    recipientId: params.recipientId,
    type: params.type,
    actorId: params.actorId,
    actorName: params.actorName,
    read: false,
    data: params.data ?? {},
    createdAt: serverTimestamp(),
  });
}

// ─── Read/Mark ────────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllRead(orgId: string, recipientId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('orgId', '==', orgId),
      where('recipientId', '==', recipientId),
      where('read', '==', false),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

// ─── Listener ─────────────────────────────────────────────────────────────────

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
      orderBy('createdAt', 'desc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as Notification)),
  );
}

export type { Notification, NotificationType };
