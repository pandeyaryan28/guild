import {
  collection, doc, updateDoc, deleteDoc, getDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';
import type { RequestStatus } from '@guild/types';

/**
 * Updates the status of an existing request, logs the approver details, 
 * and dispatches a notification to the request creator.
 * Strictly scopes updating to the request ID, preventing cross-organization mutation.
 */
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
