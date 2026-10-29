import {
  collection, doc, setDoc, updateDoc, deleteDoc, getDoc,
  query, where, orderBy, onSnapshot, getDocs, writeBatch,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';
import { syncGoalProgress } from './tasks';
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
  if (!reqSnap.exists()) {
    throw new Error('Request not found or already deleted.');
  }
  const reqData = reqSnap.data() as OrgRequest & { taskId?: string };

  // Prevent duplicate decisions and duplicate notifications
  if (reqData.status !== 'pending') {
    return;
  }

  // Prevent self-approval unless the user is the organization owner
  if (reqData.creatorId === approverId) {
    const orgSnap = await getDoc(doc(db, 'organizations', orgId));
    const ownerId = orgSnap.exists() ? orgSnap.data()?.ownerId : null;
    if (ownerId !== approverId) {
      throw new Error('You cannot approve or reject your own request.');
    }
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.update(reqRef, {
    status,
    approverId,
    approverName,
    approverUsername,
    approverNote: approverNote ?? null,
    updatedAt: now,
  });

  let linkedGoalId: string | null = null;
  if (reqData.taskId) {
    const taskRef = doc(db, 'tasks', reqData.taskId);
    const taskSnap = await getDoc(taskRef);
    const taskData = taskSnap.exists() ? taskSnap.data() : null;
    linkedGoalId = (taskData?.goalId as string) || null;

    if (taskSnap.exists()) {
      if (status === 'approved') {
        batch.update(taskRef, {
          approved: true,
          updatedAt: now,
        });
      } else {
        batch.delete(taskRef);
      }
    }
  }

  await batch.commit();

  if (linkedGoalId) {
    await syncGoalProgress(linkedGoalId, orgId);
  }

  // Dispatch the status update notification to the creator
  if (creatorId !== approverId) {
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
}

export async function deleteRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'requests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (reqSnap.exists()) {
    const reqData = reqSnap.data() as OrgRequest & { taskId?: string };
    if (reqData.taskId && reqData.status === 'pending') {
      try {
        const taskRef = doc(db, 'tasks', reqData.taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists() && taskSnap.data()?.approved === false) {
          await deleteDoc(taskRef);
        }
      } catch (e) {
        console.warn('Could not clean up linked pending task on request deletion:', e);
      }
    }
  }
  await deleteDoc(reqRef);
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
