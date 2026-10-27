import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkspaceIssue, IssueStatus, IssuePriority } from '@guild/types';

const COLLECTION = 'workspaceIssues';

export async function createWorkspaceIssue(params: {
  orgId: string;
  title: string;
  descriptionHtml?: string;
  descriptionJson?: string;
  teamPrefix?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  estimatePoints?: number | null;
  cycleId?: string | null;
  projectId?: string | null;
  parentIssueId?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  labelIds?: string[];
  dueDate?: Date | null;
  userId: string;
  userName: string;
}): Promise<string> {
  const teamPrefix = (params.teamPrefix || 'ORB').toUpperCase();
  
  // Find highest existing issue number for this org + prefix to generate sequential number
  const numQuery = query(
    collection(db, COLLECTION),
    where('orgId', '==', params.orgId),
    where('teamPrefix', '==', teamPrefix),
    orderBy('number', 'desc'),
    limit(1)
  );

  let nextNumber = 1;
  try {
    const snap = await getDocs(numQuery);
    if (!snap.empty) {
      const highest = snap.docs[0].data() as WorkspaceIssue;
      nextNumber = (highest.number || 0) + 1;
    }
  } catch (err) {
    console.warn('[createWorkspaceIssue] Could not query latest number, defaulting to timestamp offset:', err);
    nextNumber = Math.floor(Date.now() % 100000);
  }

  const identifier = `${teamPrefix}-${nextNumber}`;
  const ref = doc(collection(db, COLLECTION));

  const newIssue: Omit<WorkspaceIssue, 'createdAt' | 'updatedAt'> = {
    id: ref.id,
    orgId: params.orgId,
    identifier,
    teamPrefix,
    number: nextNumber,
    title: params.title.trim(),
    descriptionHtml: params.descriptionHtml || '',
    descriptionJson: params.descriptionJson || '',
    status: params.status || 'todo',
    priority: params.priority || 'none',
    estimatePoints: params.estimatePoints ?? null,
    cycleId: params.cycleId || null,
    projectId: params.projectId || null,
    parentIssueId: params.parentIssueId || null,
    assigneeId: params.assigneeId || null,
    assigneeName: params.assigneeName || null,
    assigneeAvatar: params.assigneeAvatar || null,
    creatorId: params.userId,
    creatorName: params.userName,
    labelIds: params.labelIds || [],
    dueDate: params.dueDate ? Timestamp.fromDate(params.dueDate) : null,
    completedAt: (params.status === 'done') ? (serverTimestamp() as unknown as Timestamp) : null,
    orderIndex: Date.now()
  };

  await setDoc(ref, {
    ...newIssue,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateWorkspaceIssue(
  issueId: string,
  patch: Partial<Omit<WorkspaceIssue, 'id' | 'orgId' | 'identifier' | 'teamPrefix' | 'number' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, issueId);
  const updates: Record<string, any> = {
    ...patch,
    updatedAt: serverTimestamp()
  };

  if (patch.status === 'done' && !patch.completedAt) {
    updates.completedAt = serverTimestamp();
  } else if (patch.status && patch.status !== 'done') {
    updates.completedAt = null;
  }

  await updateDoc(ref, updates);
}

export async function deleteWorkspaceIssue(issueId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, issueId));
}

export function listenToWorkspaceIssues(
  orgId: string,
  cb: (issues: WorkspaceIssue[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('orgId', '==', orgId),
    orderBy('orderIndex', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const issues = snap.docs.map((d) => d.data() as WorkspaceIssue);
      cb(issues);
    },
    (err) => {
      console.error('[listenToWorkspaceIssues] Error:', err);
      cb([]);
    }
  );
}

export function listenToIssuesByCycle(
  orgId: string,
  cycleId: string,
  cb: (issues: WorkspaceIssue[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('orgId', '==', orgId),
    where('cycleId', '==', cycleId),
    orderBy('orderIndex', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const issues = snap.docs.map((d) => d.data() as WorkspaceIssue);
      cb(issues);
    },
    (err) => {
      console.error('[listenToIssuesByCycle] Error:', err);
      cb([]);
    }
  );
}
