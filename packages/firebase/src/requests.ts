import {
  collection, doc, updateDoc, serverTimestamp
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
  // Update the request document in Firestore
  await updateDoc(doc(db, 'requests', requestId), {
    status,
    approverId,
    approverName,
    approverUsername,
    approverNote: approverNote ?? null,
    updatedAt: serverTimestamp(),
  });

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
