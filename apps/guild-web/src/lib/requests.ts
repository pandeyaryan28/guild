import {
  collection, doc, setDoc, updateDoc,
  query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequestType =
  | 'sick_leave'
  | 'work_from_home'
  | 'time_off'
  | 'equipment'
  | 'expense'
  | 'other';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface OrgRequest {
  id: string;
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
  status: RequestStatus;
  startDate?: string;   // ISO date string e.g. "2024-06-01"
  endDate?: string;
  approverNote?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  sick_leave:     'Sick Leave',
  work_from_home: 'Work From Home',
  time_off:       'Time Off',
  equipment:      'Equipment Request',
  expense:        'Expense Claim',
  other:          'Other',
};

export const REQUEST_TYPE_ICONS: Record<RequestType, string> = {
  sick_leave:     'Stethoscope',
  work_from_home: 'Home',
  time_off:       'Calendar',
  equipment:      'Laptop',
  expense:        'Receipt',
  other:          'ClipboardList',
};

// ─── Write ────────────────────────────────────────────────────────────────────

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
    type: 'request_received' as any,
    actorId: params.creatorId,
    actorName: params.creatorName,
    data: { requestId: ref.id, requestTitle: params.title } as any,
  });

  return ref.id;
}

export async function updateRequestStatus(
  requestId: string,
  orgId: string,
  status: 'approved' | 'rejected',
  approverId: string,
  approverName: string,
  creatorId: string,
  requestTitle: string,
  approverNote?: string,
): Promise<void> {
  await updateDoc(doc(db, 'requests', requestId), {
    status,
    approverNote: approverNote ?? null,
    updatedAt: serverTimestamp(),
  });

  // Notify the creator
  await createNotification({
    orgId,
    recipientId: creatorId,
    type: 'request_updated' as any,
    actorId: approverId,
    actorName: approverName,
    data: { requestId, requestTitle, requestStatus: status } as any,
  });
}

// ─── Listeners ────────────────────────────────────────────────────────────────

/** Requests I sent */
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

/** Requests waiting for my approval */
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
