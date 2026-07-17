import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc,
  query, where, orderBy, onSnapshot, getDocs,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';
import type { RequestStatus, RequestType, OrgRequest } from '@guild/types';

export async function createRequest(params: {
  orgId: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  approverId: string;
  approverName: string;
  approverUsername: string;
  type: RequestType;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
}): Promise<string> {
  const ref = doc(collection(db, 'requests'));
  const now = serverTimestamp();
  await setDoc(ref, {
    id: ref.id,
    orgId: params.orgId,
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    creatorUsername: params.creatorUsername,
    approverId: params.approverId,
    approverName: params.approverName,
    approverUsername: params.approverUsername,
    type: params.type,
    title: params.title,
    description: params.description,
    status: 'pending',
    startDate: params.startDate ?? null,
    endDate: params.endDate ?? null,
    approverNote: null,
    createdAt: now,
    updatedAt: now,
  });

  // Notify the approver
  await createNotification({
    orgId: params.orgId,
    recipientId: params.approverId,
    category: 'requests',
    type: 'request_pending',
    urgency: 'medium',
    actor: { id: params.creatorId, name: params.creatorName },
    title: 'New Approval Request',
    body: `${params.creatorName} submitted: "${params.title}"`,
    link: '/requests',
  });

  return ref.id;
}

export async function updateRequestStatus(
  requestId: string,
  orgId: string,
  status: 'approved' | 'rejected',
  approverId: string,
  approverName: string,
  approverUsername: string,
  creatorId: string,
  requestTitle: string,
  approverNote?: string | null,
): Promise<void> {
  const reqRef = doc(db, 'requests', requestId);
  const reqSnap = await getDoc(reqRef);
  const reqData = reqSnap.exists() ? reqSnap.data() : null;

  // Update the request document in Firestore
  await updateDoc(reqRef, {
    status,
    approverId,
    approverName,
    approverUsername,
    approverNote: approverNote ?? null,
    updatedAt: serverTimestamp(),
  });

  // If there is an associated taskId, approve or delete the task
  if (reqData && reqData.taskId) {
    const taskRef = doc(db, 'tasks', reqData.taskId);
    if (status === 'approved') {
      await updateDoc(taskRef, {
        approved: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(taskRef);
    }
  }

  // Dispatch the status update notification to the creator
  await createNotification({
    orgId,
    recipientId: creatorId,
    category: 'requests',
    type: status === 'approved' ? 'request_approved' : 'request_rejected',
    urgency: 'medium',
    actor: { id: approverId, name: approverName },
    title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    body: `Your request "${requestTitle}" was ${status} by ${approverName}`,
    link: '/requests',
  });
}

export async function deleteRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'requests', requestId));
}

export async function sendRequestReminder(params: {
  orgId: string;
  creatorId: string;
  creatorName: string;
  approverId: string;
  title: string;
}): Promise<void> {
  await createNotification({
    orgId: params.orgId,
    recipientId: params.approverId,
    category: 'requests',
    type: 'request_pending',
    urgency: 'high',
    actor: { id: params.creatorId, name: params.creatorName },
    title: 'Reminder: Approval Request',
    body: `${params.creatorName} is waiting for review on: "${params.title}"`,
    link: '/requests',
  });
}

export function listenToSentRequests(
  orgId: string,
  creatorId: string,
  cb: (requests: OrgRequest[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'requests'),
      where('orgId', '==', orgId),
      where('creatorId', '==', creatorId),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as OrgRequest)),
  );
}

export function listenToReceivedRequests(
  orgId: string,
  approverId: string,
  cb: (requests: OrgRequest[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'requests'),
      where('orgId', '==', orgId),
      where('approverId', '==', approverId),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => cb(snap.docs.map((d) => d.data() as OrgRequest)),
  );
}

export function listenToRequest(
  requestId: string,
  cb: (req: OrgRequest | null) => void,
): () => void {
  return onSnapshot(
    doc(db, 'requests', requestId),
    (snap) => {
      if (snap.exists()) {
        cb(snap.data() as OrgRequest);
      } else {
        cb(null);
      }
    }
  );
}
